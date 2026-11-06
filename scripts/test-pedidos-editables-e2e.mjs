import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import { chromium } from 'playwright';
import { nuevaPuerta } from '../src/puertas/calcular.ts';
import { crearAlmacenPedidos, crearAlmacenPedidosRemolques } from '../src/remolques/flujo/almacen.ts';
import { carpetaCorte } from '../src/corteLonaArchivos.js';

// Siempre contra una instancia aislada propia. Las comprobaciones con escritura se limitan a sus carpetas en tmp/.
const base = process.env.TOLDOS_ISOLATED_URL || 'http://127.0.0.1:4314';
const dir = path.resolve(process.env.TOLDOS_ISOLATED_DIR || 'tmp/flujo-editable-fase2-instancia');
const shots = path.resolve(process.env.TOLDOS_SCREENSHOTS_DIR || 'tmp/ui-audit/flujo-editable-fase2');
const health = await fetch(`${base}/api/health`).then(r => r.json());
assert.equal(health.simulationMode, true); assert.equal(health.fileWritesEnabled, false);
const settingsData = await fetch(`${base}/api/workflow/settings`).then(r => r.json());
const settings = settingsData.settings || settingsData;
for (const [key, value] of Object.entries(settings)) if (key.endsWith('Directory') && value) {
  assert.ok(path.resolve(value).startsWith(dir + path.sep), `${key} fuera de la instancia propia`);
}
const request = async (ruta, cuerpo, method = 'POST') => {
  const r = await fetch(base + ruta, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(cuerpo) });
  return { status: r.status, data: await r.json() };
};
Object.assign(settings, { productionEnabled: false, corteBorradoresDirectory: path.join(dir, 'cad-borradores'),
  corteBorradoresRed: String.raw`\\toldosgomez.local\DFS_POL\oftecnica\cad-borradores`, corteLonaPlanoDirectory: path.join(dir, 'cad-planos') });
assert.equal((await request('/api/workflow/settings', settings, 'PUT')).status, 200);
await fs.mkdir(shots, { recursive: true });
if (!process.env.OMITIR_TOLDOS_E2E) await new Promise((resolve, reject) => {
  const child = spawn(process.execPath, ['scripts/test-toldos-editable-e2e.mjs'], { stdio: 'inherit', env: { ...process.env,
    TOLDOS_ISOLATED_DIR: dir, TOLDOS_SCREENSHOTS_DIR: path.join(shots, 'toldos') } });
  child.on('error', reject); child.on('exit', code => code === 0 ? resolve() : reject(new Error(`E2E toldos: ${code}`)));
});
// La prueba de toldos modifica la configuración de su corte: vuelve a fijarse esta instancia propia.
await request('/api/workflow/settings', settings, 'PUT');
const f = JSON.parse(await fs.readFile(new URL('../src/puertas/__fixtures__/AR2605134.json', import.meta.url)));
const remolque = JSON.parse(await fs.readFile(new URL('../src/remolques/corte/__fixtures__/AR2605132.json', import.meta.url)));
const puerta = { schemaVersion: 1, kind: 'puertas', orderCode: 'AR2699101', cabecera: { cliente: 'Prueba puertas editable', fecha: '2026-11-05' },
  elementos: [{ id: 'A', input: { ...nuevaPuerta('PUERTAENR'), frente: f.frente, alto: f.alto, of: f.of, cantidad: f.cantidad, color: f.color,
    rollo: 300, rolloCristal: 140, rolloSaco: 300, confirmada: true, ventanasConfirmadas: true,
    enrollable: { T: f.T, D: f.D, margen: f.margen, empates: [] },
    entradas: f.alturasTubos.map(altura => ({ altura, diametro: 30, largo: f.frente, alto: 8, huecos: [] })) } }] };
for (const e of remolque.elementos) Object.assign(e.input.cabecera, { numeroPedido: 'AR2699102', cliente: 'Prueba remolques editable', realizadoPor: 'ANA', revision: '' });
const entradas = [
  { tipo: 'puertas', codigo: puerta.orderCode, cuerpo: { pedido: puerta }, cambiar: c => { c.pedido.elementos[0].input.frente += 1; } },
  { tipo: 'remolques', codigo: 'AR2699102', cuerpo: { elementos: remolque.elementos, params: remolque.params }, cambiar: c => { c.elementos[0].input.largo += 1; } },
];
const hashes = async () => {
  const archivos = [];
  for (const carpeta of [settings.corteBorradoresDirectory, settings.corteLonaPlanoDirectory, settings.remolquesRevisionDirectory]) {
    for (const p of await fs.readdir(carpeta, { recursive: true, withFileTypes: true }).catch(() => [])) if (p.isFile()) {
      const ruta = path.join(p.parentPath, p.name);
      archivos.push([ruta, createHash('sha256').update(await fs.readFile(ruta)).digest('hex')]);
    }
  }
  return JSON.stringify(archivos.sort());
};
process.chdir(dir);
const browser = await chromium.launch({ headless: true });
try {
  for (const entrada of entradas) {
    const { tipo, codigo, cuerpo } = entrada;
    const ruta = `/api/${tipo}/pedidos`, detalle = `${ruta}/${codigo}`;
    const almacen = tipo === 'puertas'
      ? crearAlmacenPedidos({ carpeta: async () => path.join(settings.remolquesRevisionDirectory, 'puertas'), tipo, nombre: tipo, sinCarpeta: 'Sin carpeta' })
      : crearAlmacenPedidosRemolques({ carpeta: async () => settings.remolquesRevisionDirectory });
    // Permite repetir la prueba sin tocar pedidos ajenos ni depender de restos de una ejecución anterior.
    const anterior = await almacen.obtener(codigo);
    if (anterior) await almacen.guardar({ ...anterior, status: 'PENDING_REVIEW' });
    await request('/api/workflow/settings', { ...settings, productionEnabled: true }, 'PUT');
    let r = await request(ruta, { ...cuerpo, savedBy: 'JAIME', decisionCorte: 'regenerar', confirmPlanoOverwrite: true });
    assert.equal(r.status, 200, JSON.stringify(r));
    const original = await fetch(base + detalle).then(r => r.json());
    assert.ok(original.corteConfirmado?.huella);
    const planoOriginal = await fs.readFile(original.corteConfirmado.plano);
    const seed = async () => { await fs.writeFile(original.corteConfirmado.plano, planoOriginal); await almacen.guardar(structuredClone(original)); };
    const changed = structuredClone(cuerpo); entrada.cambiar(changed);
    r = await request(ruta, { ...changed, savedBy: 'IVÁN' });
    assert.equal(r.data.needsRegenerateConfirmation, true, JSON.stringify(r));
    r = await request(ruta, { ...changed, savedBy: 'IVÁN', decisionCorte: 'mantener' });
    assert.equal(r.data.review.corteNoRegenerado, true);
    await request('/api/workflow/settings', { ...settings, productionEnabled: false }, 'PUT');
    r = await request(ruta, { ...changed, savedBy: 'IVÁN', decisionCorte: 'regenerar' });
    assert.equal(r.status, 200, JSON.stringify(r)); assert.equal(r.data.review.corteSimulado, true);
    assert.equal((await fetch(base + detalle).then(r => r.json())).corteConfirmado, undefined);
    assert.deepEqual(await fs.readFile(original.corteConfirmado.plano), planoOriginal);
    await seed();
    await request('/api/workflow/settings', { ...settings, productionEnabled: true }, 'PUT');
    await request(ruta, { ...changed, savedBy: 'IVÁN', decisionCorte: 'mantener' });
    r = await request(`${detalle}/generar`, { savedBy: 'IVÁN', confirmOverwrite: true });
    assert.equal(r.data.corteNoRegenerado, true, JSON.stringify(r));
    r = await request(`${detalle}/generar`, { savedBy: 'IVÁN', confirmOverwrite: true, aceptarCorteNoRegenerado: r.data.tokenCorte });
    assert.equal(r.status, 200, JSON.stringify(r));
    const generado = await fetch(base + detalle).then(r => r.json());
    assert.equal(generado.status, 'PRODUCED'); assert.equal(generado.corteNoRegenerado, false);
    assert.equal(generado.reviewedBy, 'JAIME'); assert.equal(generado.production.createdBy, 'IVÁN');
    assert.deepEqual(await fs.readFile(original.corteConfirmado.plano), planoOriginal);
    for (const fichero of generado.production.files) assert.ok(path.resolve(fichero.savedPath).startsWith(dir + path.sep));
    console.log(`${tipo}: aceptar la huella y generar por otro técnico verificados; archivos solo en tmp`);
    const bot = carpetaCorte(settings.corteLonaBotDirectory, { orderCode: codigo, technician: original.summary.technician });
    assert.ok(path.resolve(bot).startsWith(dir + path.sep));
    await fs.mkdir(bot, { recursive: true });
    for (let envio = 1; envio <= 2; envio++) {
      r = await request(`${detalle}/corte/enviar`, { usuario: 'IVÁN', destino: 'bot', confirmBot: true, confirmOverwrite: true, sinPdf: true });
      assert.equal(r.status, 200, JSON.stringify(r));
      assert.equal(r.data.enviosCorte.length, (original.enviosCorte?.length || 0) + envio);
      assert.equal(r.data.enviosCorte.at(-1).usuario, 'IVÁN');
      for (const fichero of r.data.enviosCorte.at(-1).archivos) assert.ok(path.resolve(fichero.savedPath).startsWith(dir + path.sep));
    }
    assert.deepEqual(await fs.readFile(original.corteConfirmado.plano), planoOriginal);
    console.log(`${tipo}: envío y reenvío por compañero conservan el DWG y registran ambos envíos`);
    for (const theme of ['light', 'dark']) for (const viewport of [{ width: 1280, height: 720 }, { width: 1600, height: 1000 }]) {
      await seed();
      await request('/api/workflow/settings', { ...settings, productionEnabled: false }, 'PUT');
      const context = await browser.newContext({ viewport, reducedMotion: 'reduce' });
      await context.addInitScript(theme => { localStorage.setItem('toldos-testar-usuario', 'IVÁN'); localStorage.setItem('toldos-tema', theme); }, theme);
      const page = await context.newPage(); page.setDefaultTimeout(20000);
      const errors = []; page.on('pageerror', e => errors.push(e.message));
      const shot = async name => {
        const cerrar = page.getByRole('button', { name: 'Cerrar notificación', exact: true });
        if (!await page.getByRole('alertdialog').isVisible()) while (await cerrar.count()) await cerrar.first().click();
        await page.waitForTimeout(300);
        await page.screenshot({ path: path.join(shots, `${tipo}-${theme}-${viewport.width}x${viewport.height}-${name}.png`), animations: 'disabled' });
      };
      const abrir = async () => {
        await page.getByRole('button', { name: /^Pedidos/ }).first().click();
        await page.locator('.orders-row', { hasText: codigo }).getByRole('button', { name: codigo, exact: true }).click();
        await page.getByRole('button', { name: 'Corregir', exact: true }).waitFor();
        await page.getByRole('button', { name: 'Generar archivos', exact: true }).waitFor();
      };
      await page.goto(base); await abrir();
      assert.equal(await page.getByRole('button', { name: /Confirmar corte|Guardar corte/, exact: true }).count(), 0);
      await shot('acciones');
      await page.getByRole('button', { name: 'Corregir', exact: true }).click();
      await page.getByRole('button', { name: 'Editar pedido', exact: true }).waitFor();
      await shot('aprobado');
      await page.getByRole('button', { name: 'Editar pedido', exact: true }).click();
      const campo = tipo === 'puertas' ? page.getByRole('textbox', { name: 'Frente (cm)', exact: true }) : page.locator('input[data-campo="largo"]').first();
      await campo.waitFor(); await campo.fill(tipo === 'puertas' ? String(f.frente + 1) : String(remolque.elementos[0].input.largo + 1)); await campo.press('Tab');
      await page.getByRole('button', { name: 'Guardar para revisión', exact: true }).click();
      await page.getByRole('button', { name: 'No, mantener mi corte', exact: true }).waitFor();
      await shot('regenerar-al-guardar');
      const antesCancelar = await hashes(); await page.getByRole('button', { name: 'Cancelar', exact: true }).click(); assert.equal(await hashes(), antesCancelar);
      await page.getByRole('button', { name: 'Guardar para revisión', exact: true }).click();
      await page.getByRole('button', { name: 'No, mantener mi corte', exact: true }).click();
      await page.getByText(new RegExp(`Guardado en Pedidos para revisión: ${codigo}`)).waitFor();
      await page.getByRole('button', { name: /^Pedidos/ }).first().click();
      await page.locator('.orders-row', { hasText: codigo }).getByText('El corte no está regenerado con los últimos datos').waitFor(); await shot('marca-lista');
      await abrir(); await shot('marca-pedido');
      // Aceptar el corte mantenido al generar limpia la marca. Cancelar la pregunta no modifica nada.
      // Para comprobar la huella en generación se habilitan solo las carpetas propias en tmp/.
      await request('/api/workflow/settings', { ...settings, productionEnabled: true }, 'PUT');
      await page.getByRole('button', { name: 'Generar archivos', exact: true }).click();
      await page.getByRole('button', { name: 'Sí, generar archivos', exact: true }).click();
      await page.getByRole('button', { name: 'Usar este corte igualmente', exact: true }).waitFor(); await shot('corte-pendiente-generar');
      const antesHuella = await hashes(); await page.getByRole('button', { name: 'Cancelar', exact: true }).click(); assert.equal(await hashes(), antesHuella);
      // Se comprueba el contrato real del enlace sin arrancar ZWCAD en el PC de pruebas.
      await page.route(`**${detalle}/corte-dwg`, async route => {
        const respuesta = await route.fetch(); const datos = await respuesta.json();
        assert.equal(respuesta.status(), 200); assert.ok(datos.ficheros?.length);
        assert.ok(datos.ficheros.every(f => f.url.startsWith('tgm-pedidos:')));
        datos.ficheros = datos.ficheros.map(f => ({ ...f, url: `${base}/#corte-comprobado` }));
        await route.fulfill({ response: respuesta, json: datos });
      });
      const conHuellaAjena = await fetch(base + detalle).then(r => r.json());
      conHuellaAjena.corteNoRegenerado = false;
      conHuellaAjena.corteConfirmado.huella = 'cambio de ZWCAD pendiente';
      await almacen.guardar(conHuellaAjena);
      const antesAbrir = await hashes();
      await page.getByRole('button', { name: 'Generar archivos', exact: true }).click();
      await page.getByRole('button', { name: 'Sí, generar archivos', exact: true }).click();
      await page.getByRole('button', { name: 'Abrir para comprobar', exact: true }).click();
      await page.waitForURL('**/#corte-comprobado');
      assert.equal(await hashes(), antesAbrir);
      await page.unroute(`**${detalle}/corte-dwg`);
      await page.evaluate(() => history.replaceState({}, '', '/'));
      // Regenerar desde el detalle no deja un corte intermedio ni dispara la pregunta de huella.
      await page.getByRole('button', { name: 'Regenerar corte', exact: true }).click(); await shot('regenerar-detalle');
      const antesDetalle = await hashes(); await page.getByRole('button', { name: 'Cancelar', exact: true }).click(); assert.equal(await hashes(), antesDetalle);
      const produccion = viewport.width === 1600;
      await request('/api/workflow/settings', { ...settings, productionEnabled: produccion }, 'PUT');
      await page.getByRole('button', { name: 'Regenerar corte', exact: true }).click();
      const guardado = page.waitForResponse(r => r.url().endsWith(ruta) && r.request().method() === 'POST');
      await page.getByRole('button', { name: 'Sí, regenerar', exact: true }).click();
      const respuesta = await guardado; assert.equal(respuesta.status(), 200, await respuesta.text());
      await page.getByText('Corte guardado con el pedido.', { exact: true }).waitFor();
      assert.equal(await page.getByRole('alertdialog').count(), 0); assert.equal(await page.getByRole('button', { name: 'Guardar corte', exact: true }).count(), 0);
      await shot(produccion ? 'regenerado' : 'simulado');
      const incompleto = structuredClone(original);
      delete incompleto.corteConfirmado; delete incompleto.corteSimulado;
      if (tipo === 'puertas') incompleto.elementos[0].input.of = '';
      else incompleto.elementos[0].input.cabecera.ordenFabricacion = '';
      await almacen.guardar(incompleto); await page.reload(); await abrir();
      const abrirIncompleto = page.getByRole('button', { name: 'Abrir corte', exact: true });
      await abrirIncompleto.waitFor();
      await page.waitForFunction(() => [...document.querySelectorAll('button')].some(b => b.textContent.includes('Abrir corte') && b.disabled && /OF/.test(b.title)));
      assert.equal(await abrirIncompleto.isDisabled(), true); assert.match(await abrirIncompleto.getAttribute('title'), /OF/);
      await shot('abrir-incompleto');
      const parcial = structuredClone(original);
      if (parcial.elementos.length === 1) parcial.elementos.push({ ...structuredClone(parcial.elementos[0]), id: 'B' });
      const a = `096${tipo === 'puertas' ? '1' : '2'}${theme === 'light' ? '1' : '2'}${viewport.width === 1280 ? '1' : '2'}1`, b = a.slice(0, -1) + '2';
      parcial.elementos.forEach((e, i) => { if (tipo === 'puertas') e.input.of = i ? b : a; else e.input.cabecera.ordenFabricacion = i ? b : a; });
      parcial.summary.ofs = [a, b]; parcial.summary.awnings = parcial.elementos.length;
      await almacen.guardar(parcial);
      await fetch(`http://127.0.0.1:${process.env.FAKE_COORDINA_PORT || 4324}/__estado`, { method: 'POST', body: JSON.stringify({ ofs: { [a]: { estado: 'pasada', revisor: 'jaime' }, [b]: { estado: 'en_revision' } } }) });
      await page.reload(); await abrir();
      await page.getByRole('button', { name: 'Corregir', exact: true }).click();
      const aviso = page.getByRole('alertdialog'); await aviso.waitFor();
      assert.match(await aviso.innerText(), new RegExp(a)); assert.ok(!(await aviso.innerText()).includes(b));
      await shot('aprobado-parcial'); await page.getByRole('button', { name: 'Cancelar', exact: true }).click();
      assert.deepEqual(errors, []); await context.close();
      console.log(`${tipo}: ${theme} ${viewport.width}×${viewport.height}, guardar/mantener/cancelar/regenerar/huella verificados`);
    }
  }
} finally { await request('/api/workflow/settings', { ...settings, productionEnabled: false }, 'PUT'); await browser.close(); }
console.log(`Capturas: ${shots}`);
