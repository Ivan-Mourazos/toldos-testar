import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { nuevaPuerta } from '../src/puertas/calcular.ts';
import { crearAlmacenPedidos, crearAlmacenPedidosRemolques } from '../src/remolques/flujo/almacen.ts';
import { pedidoVariasTelas } from '../src/domain/corteLona/fixtures/variasTelas.js';
import { generarCorteLona } from '../src/domain/corteLona/index.js';
import { crearEstadoCorteLona } from '../src/corteLonaEstado.js';
import { createReviewPackage, createWorkflowStore } from '../src/workflow.js';
import { calculateOrder } from '../src/domain/rules.js';
import { buildOrderReviewPdf } from '../src/domain/reviewPdf.js';
import { carpetaCorte } from '../src/corteLonaArchivos.js';

const base = 'http://127.0.0.1:4314';
const fakeCoordina = 'http://127.0.0.1:4324';
const auditDir = path.resolve('tmp/ui-audit/flujo-editable-fase2-fix');
const dir = path.join(auditDir, 'instancia');
const shots = path.join(auditDir, 'capturas');

await fs.mkdir(shots, { recursive: true });

// 1. Verificación estricta de seguridad (/api/health y rutas de settings dentro de tmp/)
const health = await fetch(`${base}/api/health`).then(r => r.json());
assert.equal(health.simulationMode, true, 'simulationMode debe ser true');
assert.equal(health.fileWritesEnabled, false, 'fileWritesEnabled debe ser false');

const request = async (ruta, cuerpo, method = 'POST') => {
  const r = await fetch(base + ruta, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: cuerpo !== undefined ? JSON.stringify(cuerpo) : undefined,
  });
  return { status: r.status, data: await r.json() };
};

const settingsData = await fetch(`${base}/api/workflow/settings`).then(r => r.json());
const baseSettings = settingsData.settings || settingsData;
for (const [key, value] of Object.entries(baseSettings)) {
  if (key.endsWith('Directory') && value) {
    assert.ok(
      path.resolve(value).startsWith(dir + path.sep),
      `Carpeta ${key} (${value}) fuera de la instancia aislada (${dir})`
    );
  }
}

const fullSettings = {
  ...baseSettings,
  productionEnabled: false,
  corteBorradoresDirectory: path.join(dir, 'cad-borradores'),
  corteBorradoresRed: String.raw`\\toldosgomez.local\DFS_POL\oftecnica\cad-borradores`,
  corteLonaPlanoDirectory: path.join(dir, 'cad-planos'),
};

// Cargar fixtures base
const fPuerta = JSON.parse(
  await fs.readFile(new URL('../src/puertas/__fixtures__/AR2605134.json', import.meta.url))
);
const fRemolque = JSON.parse(
  await fs.readFile(new URL('../src/remolques/corte/__fixtures__/AR2605132.json', import.meta.url))
);

function crearPedidoPuerta(orderCode = 'AR2699101', modelo = 'PUERTAENR') {
  return {
    schemaVersion: 1,
    kind: 'puertas',
    orderCode,
    cabecera: { cliente: 'Prueba puertas editable', fecha: '2026-11-05' },
    elementos: [
      {
        id: 'A',
        input: {
          ...nuevaPuerta(modelo),
          frente: fPuerta.frente,
          alto: fPuerta.alto,
          of: fPuerta.of,
          cantidad: fPuerta.cantidad,
          color: fPuerta.color,
          rollo: 300,
          rolloCristal: 140,
          rolloSaco: 300,
          confirmada: true,
          ventanasConfirmadas: true,
          enrollable: { T: fPuerta.T, D: fPuerta.D, margen: fPuerta.margen, empates: [] },
          entradas: fPuerta.alturasTubos.map(altura => ({
            altura,
            diametro: 30,
            largo: fPuerta.frente,
            alto: 8,
            huecos: [],
          })),
        },
      },
    ],
  };
}

function crearCuerpoRemolque(orderCode = 'AR2699102') {
  const copia = structuredClone(fRemolque);
  for (const e of copia.elementos) {
    Object.assign(e.input.cabecera, {
      numeroPedido: orderCode,
      cliente: 'Prueba remolques editable',
      realizadoPor: 'ANA',
      revision: '',
    });
  }
  return { elementos: copia.elementos, params: copia.params };
}

const almacenPuertas = crearAlmacenPedidos({
  carpeta: async () => path.join(fullSettings.remolquesRevisionDirectory, 'puertas'),
  tipo: 'puertas',
  nombre: 'puertas',
  sinCarpeta: 'Sin carpeta',
});
const almacenRemolques = crearAlmacenPedidosRemolques({
  carpeta: async () => fullSettings.remolquesRevisionDirectory,
});

process.chdir(dir);
const browser = await chromium.launch({ headless: true });

try {
  let r;
  // Ahora activamos fullSettings para sembrar pedidos completos con corteConfirmado
  await request('/api/workflow/settings', { ...fullSettings, productionEnabled: true }, 'PUT');

  // Sembrar Toldos (AR2600096)
  const storeToldos = createWorkflowStore({ settingsFile: path.join(dir, 'settings.json'), defaults: fullSettings });
  const orderToldos = {
    ...pedidoVariasTelas(),
    orderCode: 'AR2600096',
    technician: 'ANA',
    customer: 'Prueba toldos editable',
    notes: 'Datos originales',
  };
  const resultadoToldos = generarCorteLona(orderToldos, { ofStockSacos: '0230811' });
  const corteLonaToldos = crearEstadoCorteLona(orderToldos, { ajustes: {}, resultado: resultadoToldos, ofStockSacos: '0230811' });
  await fs.mkdir(fullSettings.corteLonaPlanoDirectory, { recursive: true });
  const planosToldos = [];
  for (const [i, p] of resultadoToldos.plano.filter(p => !p.incluidoEn).entries()) {
    const filename = `${orderToldos.orderCode} (${i + 1}).dxf`;
    const plano = path.join(fullSettings.corteLonaPlanoDirectory, filename);
    await fs.writeFile(plano, p.dxf);
    planosToldos.push({ filename, plano });
  }
  const originalToldos = createReviewPackage({
    order: orderToldos,
    calculation: calculateOrder(orderToldos),
    corteLona: corteLonaToldos,
    savedBy: 'ANA',
  });
  originalToldos.corteConfirmado = {
    huella: 'huella-anterior',
    por: 'ANA',
    fecha: '2026-11-05T10:00:00Z',
    ...planosToldos[0],
    planos: planosToldos,
  };
  async function seedToldos(review = structuredClone(originalToldos)) {
    for (const [i, p] of resultadoToldos.plano.filter(p => !p.incluidoEn).entries()) {
      await fs.writeFile(planosToldos[i].plano, p.dxf);
    }
    await storeToldos.saveReview(
      review,
      await buildOrderReviewPdf({ order: review.order, calculation: calculateOrder(review.order), review })
    );
  }
  await seedToldos();

  // Sembrar Puertas (AR2699101) y Remolques (AR2699102) limpiando restos previos
  const prevPuerta = await almacenPuertas.obtener('AR2699101');
  if (prevPuerta) await almacenPuertas.guardar({ ...prevPuerta, status: 'PENDING_REVIEW', production: null, enviosCorte: [] });
  const prevRemolque = await almacenRemolques.obtener('AR2699102');
  if (prevRemolque) await almacenRemolques.guardar({ ...prevRemolque, status: 'PENDING_REVIEW', production: null, enviosCorte: [] });

  const puertaBase = crearPedidoPuerta('AR2699101');
  r = await request('/api/puertas/pedidos', {
    pedido: puertaBase,
    savedBy: 'JAIME',
    decisionCorte: 'regenerar',
    confirmPlanoOverwrite: true,
  });
  assert.equal(r.status, 200);
  const originalPuerta = await fetch(`${base}/api/puertas/pedidos/AR2699101`).then(res => res.json());
  originalPuerta.enviosCorte = [];
  originalPuerta.status = 'PENDING_REVIEW';
  originalPuerta.production = null;
  const planoOriginalPuerta = await fs.readFile(originalPuerta.corteConfirmado.plano);

  const remolqueBase = crearCuerpoRemolque('AR2699102');
  r = await request('/api/remolques/pedidos', {
    ...remolqueBase,
    savedBy: 'JAIME',
    decisionCorte: 'regenerar',
    confirmPlanoOverwrite: true,
  });
  assert.equal(r.status, 200);
  const originalRemolque = await fetch(`${base}/api/remolques/pedidos/AR2699102`).then(res => res.json());
  originalRemolque.enviosCorte = [];
  originalRemolque.status = 'PENDING_REVIEW';
  originalRemolque.production = null;
  const planoOriginalRemolque = await fs.readFile(originalRemolque.corteConfirmado.plano);

  const seedPuerta = async (custom = originalPuerta) => {
    await fs.writeFile(originalPuerta.corteConfirmado.plano, planoOriginalPuerta);
    await almacenPuertas.guardar(structuredClone(custom));
  };
  const seedRemolque = async (custom = originalRemolque) => {
    await fs.writeFile(originalRemolque.corteConfirmado.plano, planoOriginalRemolque);
    await almacenRemolques.guardar(structuredClone(custom));
  };

  // Volver a simulationMode (productionEnabled: false) por defecto
  await request('/api/workflow/settings', { ...fullSettings, productionEnabled: false }, 'PUT');

  // Helper de capturas
  async function withPage(theme, viewport, fn) {
    const context = await browser.newContext({ viewport, reducedMotion: 'reduce' });
    await context.addInitScript(t => {
      localStorage.setItem('toldos-testar-usuario', 'IVÁN');
      localStorage.setItem('toldos-tema', t);
    }, theme);
    const page = await context.newPage();
    page.setDefaultTimeout(20000);
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    page.on('response', async r => {
      if (r.status() >= 400 && /\/generar$|\/generate-files$|\/enviar$/.test(r.url())) {
        const datos = await r.json().catch(() => ({}));
        if (!datos.corteNoRegenerado) console.log(r.status(), r.url(), datos);
      }
    });
    const shot = async (name, opts = {}) => {
      if (!opts.keepToast) {
        const cerrar = page.getByRole('button', { name: 'Cerrar notificación', exact: true });
        if (!(await page.getByRole('alertdialog').isVisible())) {
          while (await cerrar.count()) await cerrar.first().click();
        }
      }
      await page.waitForTimeout(250);
      const file = `${name}-${theme}-${viewport.width}x${viewport.height}.png`;
      await page.screenshot({ path: path.join(shots, file), animations: 'disabled', fullPage: Boolean(opts.fullPage) });
      return file;
    };
    const irAListaPedidos = async () => {
      const btnVolver = page.getByRole('button', { name: '← Pedidos', exact: true });
      if (await btnVolver.isVisible().catch(() => false)) {
        await btnVolver.click();
      } else {
        await page.getByRole('button', { name: /^Pedidos/ }).first().click();
        if (await btnVolver.isVisible().catch(() => false)) {
          await btnVolver.click();
        }
      }
    };
    const abrirPedido = async codigo => {
      await irAListaPedidos();
      await page.locator('.orders-row', { hasText: codigo }).getByRole('button', { name: codigo, exact: true }).click();
      await page.getByRole('button', { name: '← Pedidos', exact: true }).waitFor();
      await page.getByRole('heading', { name: new RegExp(codigo) }).waitFor();
    };
    try {
      await fn({ page, shot, abrirPedido, irAListaPedidos, errors });
      assert.deepEqual(errors, [], `Errores de consola en ${theme} ${viewport.width}x${viewport.height}: ${errors.join('; ')}`);
    } catch (error) {
      await page.screenshot({ path: path.join(shots, `fallo-${theme}-${viewport.width}.png`) });
      console.log(await page.locator('button').evaluateAll(bs => bs.filter(b => /corte|revisión/.test(b.textContent)).map(b => [b.textContent, b.disabled, b.title])));
      throw error;
    } finally {
      await context.close();
    }
  }

  const familias = [
    { tipo: 'puertas', original: originalPuerta, seed: seedPuerta, ruta: '/api/puertas/pedidos',
      cuerpo: p => ({ pedido: p }), generar: '/generar', envio: '/corte/enviar',
      campo: page => page.getByRole('textbox', { name: 'OF de puerta', exact: true }) },
    { tipo: 'remolques', original: originalRemolque, seed: seedRemolque, ruta: '/api/remolques/pedidos',
      cuerpo: p => ({ elementos: p.elementos, params: p.params, clienteRps: p.clienteRps }), generar: '/generar', envio: '/corte/enviar',
      campo: page => page.locator('input[data-campo="ordenFabricacion"]').first() },
    { tipo: 'toldos', original: originalToldos, seed: seedToldos, ruta: '/api/reviews',
      cuerpo: p => ({ order: p.order, corteLona: p.corteLona }), generar: '/generate-files', envio: '/corte-lona/enviar',
      campo: page => page.getByRole('textbox', { name: 'OF', exact: true }).first() },
  ];
  const leerPedido = f => fetch(`${base}${f.ruta}/${f.original.orderCode}`).then(r => r.json());
  for (const theme of (process.env.TEMA ? [process.env.TEMA] : ['light', 'dark'])) for (const viewport of
    (process.env.ANCHO ? [{ width: Number(process.env.ANCHO), height: Number(process.env.ANCHO) === 1280 ? 720 : 1000 }]
      : [{ width: 1280, height: 720 }, { width: 1600, height: 1000 }])) {
    for (const f of familias) await f.seed();
    await fetch(`${fakeCoordina}/__reset`, { method: 'POST' });
    await withPage(theme, viewport, async ({ page, shot, abrirPedido }) => {
      for (const f of familias) {
        if (process.env.FAMILIA && process.env.FAMILIA !== f.tipo) continue;
        const codigo = f.original.orderCode, detalle = `${f.ruta}/${codigo}`;
        const foto = nombre => shot(`${f.tipo}-${nombre}`);
        const abrir = async () => { await page.goto(base); await abrirPedido(codigo); };
        const corregir = async () => {
          await page.getByRole('button', { name: 'Corregir', exact: true }).click();
          await page.getByRole('button', { name: 'Editar pedido', exact: true }).click();
          await f.campo(page).waitFor();
          await page.getByRole('button', { name: 'Abrir corte', exact: true }).waitFor();
          assert.equal(await page.getByRole('alertdialog').count(), 0, `${f.tipo}: no debe pedir otra confirmación al corregir`);
        };
        // 2: vacío y mismo pedido, incluso tocado, no repiten la pregunta de sustitución.
        await request('/api/workflow/settings', { ...fullSettings, productionEnabled: false }, 'PUT');
        await abrir(); await foto('acciones'); await corregir();
        const numero = f.tipo === 'puertas' ? page.getByRole('textbox', { name: 'Número de pedido de Puertas', exact: true })
          : f.tipo === 'remolques' ? page.locator('input[data-campo="numeroPedido"]') : page.getByRole('textbox', { name: 'Pedido', exact: true });
        await numero.fill('AR2699998'); await numero.press('Tab');
        await abrirPedido(codigo);
        await page.getByRole('button', { name: 'Corregir', exact: true }).click();
        await page.getByRole('button', { name: 'Editar pedido', exact: true }).click();
        const avisoOtro = page.getByRole('alertdialog'); await avisoOtro.waitFor();
        assert.match(await avisoOtro.innerText(), /sustituir/i); await foto('otro-pedido-con-cambios-protegido');
        await avisoOtro.getByRole('button', { name: /Abrir pedido|Abrir para corregir/ }).click(); await f.campo(page).waitFor();
        // Un pedido distinto que solo se abrió y no se tocó tampoco necesita otro aviso.
        const otro = structuredClone(f.original); otro.orderCode = { puertas: 'AR2699997', remolques: 'AR2699996', toldos: 'AR2699995' }[f.tipo]; otro.numeroPedido = otro.orderCode;
        if (otro.order) otro.order.orderCode = otro.orderCode;
        await f.seed(otro); await page.goto(base); await abrirPedido(otro.orderCode); await corregir();
        await abrirPedido(codigo); await corregir();
        const campo = f.campo(page); const of = await campo.inputValue();
        assert.ok(of, `${f.tipo}: localizar la OF`);
        await campo.fill(''); await campo.press('Tab');
        await page.waitForFunction(() => [...document.querySelectorAll('button')].some(b => b.textContent === 'Abrir corte' && b.disabled && /OF/.test(b.title)));
        assert.equal(await page.getByRole('button', { name: 'Regenerar corte', exact: true }).isDisabled(), true);
        await foto('editor-sin-of');
        await abrirPedido(codigo); await corregir(); await foto('corregir-sin-segundo-dialogo');
        // 5: el corte simulado explica por qué no hay DWG y permite regenerar desde el editor.
        const simulado = structuredClone(f.original); delete simulado.corteConfirmado; simulado.corteSimulado = true;
        await f.seed(simulado); await abrir(); await corregir();
        const botonAbrir = page.getByRole('button', { name: 'Abrir corte', exact: true });
        await page.waitForFunction(() => [...document.querySelectorAll('button')].some(b => b.textContent === 'Abrir corte' && /no hay DWG/.test(b.title)));
        assert.equal(await botonAbrir.isDisabled(), true);
        assert.equal(await page.getByRole('button', { name: 'Regenerar corte', exact: true }).isEnabled(), true);
        await foto('editor-simulacion-con-regenerar');
        await page.getByRole('button', { name: 'Regenerar corte', exact: true }).click();
        const guardadoSimulado = page.waitForResponse(r => r.url().endsWith(f.ruta) && r.request().method() === 'POST');
        await page.getByRole('button', { name: 'Sí, regenerar', exact: true }).click();
        assert.equal((await guardadoSimulado).status(), 200);
        await page.waitForFunction(() => !document.querySelector('[role="alertdialog"]'));
        assert.equal((await leerPedido(f)).corteSimulado, true);
        // 3 y 4: regenerar tras simular sin carpeta de borradores, una sola decisión y el plano sigue accesible.
        await request('/api/workflow/settings', { ...fullSettings, productionEnabled: true, corteBorradoresDirectory: '', corteBorradoresRed: '' }, 'PUT');
        await abrir();
        await page.getByRole('button', { name: 'Regenerar corte', exact: true }).click();
        const guardado = page.waitForResponse(r => r.url().endsWith(f.ruta) && r.request().method() === 'POST');
        await page.getByRole('button', { name: 'Sí, regenerar', exact: true }).click();
        const respuesta = await guardado; assert.equal(respuesta.status(), 200, await respuesta.text());
        await page.waitForFunction(() => !document.querySelector('[role="alertdialog"]'));
        assert.ok((await leerPedido(f)).corteConfirmado?.huella);
        await page.getByRole('button', { name: 'Abrir corte', exact: true }).waitFor();
        assert.equal(await page.getByRole('button', { name: 'Abrir corte', exact: true }).isEnabled(), true);
        await foto('regenerado-sin-borradores-abrir-disponible');
        // 1: producción real limitada a tmp. Cancelar no cambia los bytes ni el pedido; usar queda apuntado.
        await request('/api/workflow/settings', { ...fullSettings, productionEnabled: true }, 'PUT');
        await page.route(`**${detalle}${f.generar}`, async route => {
          const body = route.request().postDataJSON();
          await route.fulfill({ response: await route.fetch({ postData: JSON.stringify({ ...body, includeNonAcrylicFabrics: false, confirmOverwrite: true }) }) });
        });
        await page.route(`**${detalle}${f.envio}`, async route => {
          const body = route.request().postDataJSON();
          await route.fulfill({ response: await route.fetch({ postData: JSON.stringify({ ...body, sinPdf: true, confirmOverwrite: true }) }) });
        });
        for (const accion of ['generar', 'bot']) {
          await f.seed();
          const cambiado = structuredClone(f.original);
          if (f.tipo === 'puertas') cambiado.elementos[0].input.frente += 1;
          else if (f.tipo === 'remolques') cambiado.elementos[0].input.largo += 1;
          else cambiado.order.notes += ' Modificado.';
          const mantenido = await request(f.ruta, { ...f.cuerpo(cambiado), savedBy: 'IVÁN', decisionCorte: 'mantener', confirmOverwrite: true });
          assert.equal(mantenido.status, 200, JSON.stringify(mantenido));
          const antes = await leerPedido(f); assert.equal(antes.corteNoRegenerado, true);
          const bytes = await fs.readFile(antes.corteConfirmado.plano);
          const bot = carpetaCorte(fullSettings.corteLonaBotDirectory, { orderCode: codigo, technician: antes.summary.technician });
          assert.ok(path.resolve(bot).startsWith(dir + path.sep)); await fs.mkdir(bot, { recursive: true });
          const empezar = async () => {
            await abrir();
            await page.getByRole('button', { name: accion === 'bot' ? 'Mandar corte al bot' : 'Generar archivos', exact: true }).click();
            await page.getByRole('alertdialog').getByRole('button', { name: accion === 'bot' ? 'Mandar corte al bot' : 'Sí, generar archivos', exact: true }).click();
            await page.getByRole('button', { name: 'Usar este corte igualmente', exact: true }).waitFor();
          };
          await empezar(); await foto(`${accion}-decision-corte-pendiente`);
          await page.getByRole('button', { name: 'Cancelar', exact: true }).click();
          assert.deepEqual(await leerPedido(f), antes); assert.deepEqual(await fs.readFile(antes.corteConfirmado.plano), bytes);
          await empezar();
          const salida = page.waitForResponse(r => r.url().endsWith(detalle + (accion === 'bot' ? f.envio : f.generar)) && r.status() === 200);
          await page.getByRole('button', { name: 'Usar este corte igualmente', exact: true }).click(); await salida;
          const despues = await leerPedido(f);
          assert.equal(despues.corteNoRegenerado, false); assert.equal(despues.corteConfirmado.aceptadoSinRegenerar.por, 'IVÁN');
          if (accion === 'generar' || f.tipo === 'puertas') assert.equal(despues.status, 'PRODUCED');
          assert.deepEqual(await fs.readFile(antes.corteConfirmado.plano), bytes);
          await page.waitForTimeout(400); await foto(`${accion}-aceptado-sin-marca`);
        }
        // La alternativa Regenerar también continúa la operación sin aceptar el corte viejo.
        await f.seed();
        const marcado = structuredClone(f.original); marcado.corteNoRegenerado = true; await f.seed(marcado);
        await abrir();
        await page.getByRole('button', { name: 'Generar archivos', exact: true }).click();
        await page.getByRole('button', { name: 'Sí, generar archivos', exact: true }).click();
        const regeneradoYGenerado = page.waitForResponse(r => r.url().endsWith(detalle + f.generar) && r.status() === 200);
        await page.getByRole('button', { name: 'Regenerar', exact: true }).click();
        await regeneradoYGenerado;
        assert.equal((await leerPedido(f)).corteNoRegenerado, false);
        await foto('generar-regenerando');
        console.log(`${f.tipo}: hallazgos 1–5, ${theme} ${viewport.width}×${viewport.height}: correcto`);
        await page.unroute(`**${detalle}${f.generar}`); await page.unroute(`**${detalle}${f.envio}`);
      }
      const sd = structuredClone(originalPuerta); sd.elementos[0].input.modelo = 'SYSTEMDOCK'; sd.elementos[0].input.of = '';
      delete sd.corteConfirmado; sd.summary.ofs = [];
      await seedPuerta(sd); await page.goto(base); await abrirPedido(sd.orderCode);
      await page.getByText('Falta la OF en la lona System Dock A.', { exact: true }).waitFor();
      await page.locator('.familia-tag', { hasText: 'Lona System Dock' }).waitFor();
      await shot('systemdock-nombre-y-concordancia');
    });
  }
  console.log(`Capturas de los estados corregidos: ${shots}`);
} finally {
  await request('/api/workflow/settings', { ...baseSettings, productionEnabled: false }, 'PUT');
  await fetch(`${fakeCoordina}/__reset`, { method: 'POST' });
  await browser.close();
}
