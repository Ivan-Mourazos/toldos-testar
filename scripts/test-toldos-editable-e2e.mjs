import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { chromium } from 'playwright';
import { pedidoVariasTelas } from '../src/domain/corteLona/fixtures/variasTelas.js';
import { generarCorteLona } from '../src/domain/corteLona/index.js';
import { crearEstadoCorteLona } from '../src/corteLonaEstado.js';
import { createReviewPackage, createWorkflowStore } from '../src/workflow.js';
import { calculateOrder } from '../src/domain/rules.js';
import { buildOrderReviewPdf } from '../src/domain/reviewPdf.js';

// Instancia propia: CHROME_LOG_FILE="$PWD/tmp/flujo-editable-instancia/chromium.log"
// PORT=4316 FAKE_COORDINA_PORT=4326 ISOLATED_DIR="$PWD/tmp/flujo-editable-instancia"
// bash .claude/skills/running-toldos-testar/start-isolated.sh
const base = process.env.TOLDOS_ISOLATED_URL || 'http://127.0.0.1:4316';
const dir = path.resolve(process.env.TOLDOS_ISOLATED_DIR || 'tmp/flujo-editable-instancia');
const shots = path.resolve(process.env.TOLDOS_SCREENSHOTS_DIR || 'tmp/ui-audit/flujo-editable-fix');
const request = async (url, body, method = 'POST') => {
  const r = await fetch(base + url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  return { status: r.status, data: await r.json() };
};
const health = await fetch(base + '/api/health').then(r => r.json());
assert.equal(health.simulationMode, true); assert.equal(health.fileWritesEnabled, false);
const actual = await fetch(base + '/api/workflow/settings').then(r => r.json());
const settings = actual.settings || actual;
for (const [key, value] of Object.entries(settings)) {
  if (key.endsWith('Directory') && value) assert.ok(path.resolve(value).startsWith(dir + path.sep), `Carpeta fuera de la aislada: ${key}`);
}
Object.assign(settings, { productionEnabled: false, corteBorradoresDirectory: path.join(dir, 'cad-borradores'),
  corteBorradoresRed: '\\\\toldosgomez.local\\DFS_POL\\oftecnica\\BORRADORES CORTE', corteLonaPlanoDirectory: path.join(dir, 'cad-planos') });
const configured = await request('/api/workflow/settings', settings, 'PUT');
assert.equal(configured.status, 200, JSON.stringify(configured));
const store = createWorkflowStore({ settingsFile: path.join(dir, 'settings.json'), defaults: settings });
const order = { ...pedidoVariasTelas(), orderCode: 'AR2600096', technician: 'ANA', customer: 'Prueba flujo editable', notes: 'Datos originales' };
const resultado = generarCorteLona(order, { ofStockSacos: '0230811' });
const corteLona = crearEstadoCorteLona(order, { ajustes: {}, resultado, ofStockSacos: '0230811' });
await fs.mkdir(settings.corteLonaPlanoDirectory, { recursive: true });
const planos = [];
for (const [i, p] of resultado.plano.filter(p => !p.incluidoEn).entries()) {
  const filename = `${order.orderCode} (${i + 1}).dxf`;
  const plano = path.join(settings.corteLonaPlanoDirectory, filename);
  await fs.writeFile(plano, p.dxf);
  planos.push({ filename, plano });
}
const original = createReviewPackage({ order, calculation: calculateOrder(order), corteLona, savedBy: 'ANA' });
original.corteConfirmado = { huella: 'huella-anterior', por: 'ANA', fecha: '2026-11-05T10:00:00Z', ...planos[0], planos };
async function seed(review = original) {
  if (review === original) {
    for (const [i, p] of resultado.plano.filter(p => !p.incluidoEn).entries()) await fs.writeFile(planos[i].plano, p.dxf);
  }
  await store.saveReview(review, await buildOrderReviewPdf({ order: review.order, calculation: calculateOrder(review.order), review }));
}
async function huellaArchivos(carpetas = [settings.corteBorradoresDirectory, settings.corteLonaPlanoDirectory]) {
  const archivos = [];
  for (const carpeta of carpetas) for (const p of await fs.readdir(carpeta, { recursive: true, withFileTypes: true }).catch(() => [])) if (p.isFile()) {
    const ruta = path.join(p.parentPath, p.name);
    archivos.push([ruta, createHash('sha256').update(await fs.readFile(ruta)).digest('hex')]);
  }
  return JSON.stringify(archivos.sort());
}
await seed();
await fs.mkdir(shots, { recursive: true });

// API real aislada: guardar como compañero, mantener el corte y persistir la marca.
const changed = { order: { ...order, notes: 'Cambio de otro compañero', awnings: order.awnings.map((a, i) => i ? a : { ...a, width: a.width + 10 }) },
  corteLona, savedBy: 'IVÁN', confirmOverwrite: true };
let r = await request('/api/reviews', changed);
assert.equal(r.data.needsRegenerateConfirmation, true, JSON.stringify(r));
r = await request('/api/reviews', { ...changed, decisionCorte: 'mantener' });
assert.equal(r.status, 200, JSON.stringify(r)); assert.equal(r.data.review.corteNoRegenerado, true);
assert.equal(r.data.review.updatedBy, 'IVÁN'); assert.equal(r.data.review.createdBy, 'ANA');
assert.equal(r.data.review.order.reviewer, 'JAIME');
assert.equal((await fetch(base + '/api/reviews/AR2600096').then(r => r.json())).corteNoRegenerado, true);
console.log('API: edición por compañero, pregunta de regenerar, mantener y persistencia correctos');
const antesSimular = await huellaArchivos();
const simulado = await request('/api/reviews', { ...changed, decisionCorte: 'regenerar' });
assert.equal(simulado.status, 200, JSON.stringify(simulado));
assert.equal(simulado.data.review.corteSimulado, true);
assert.equal(simulado.data.review.corteNoRegenerado, false);
assert.equal(simulado.data.review.corteConfirmado, undefined);
assert.equal(await huellaArchivos(), antesSimular, 'Simular regeneración no debe cambiar ningún archivo de corte');
console.log('API: regenerar en simulación guarda la decisión sin escribir ni mover planos');

// Las salidas se habilitan solo durante esta comprobación, todas bajo tmp de esta instancia.
// No se conecta a RPS para escribir: los XLS quedan en la carpeta rps de prueba.
try {
  assert.equal((await request('/api/workflow/settings', { ...settings, productionEnabled: true }, 'PUT')).status, 200);
  await seed();
  const regenerado = await request('/api/reviews', { ...changed, decisionCorte: 'regenerar' });
  assert.equal(regenerado.status, 200, JSON.stringify(regenerado));
  assert.equal(regenerado.data.cambioCorte, undefined, 'Regenerar no debe preguntar por cambios ajenos de ZWCAD');
  assert.equal(regenerado.data.review.corteNoRegenerado, false);
  assert.ok(regenerado.data.review.corteConfirmado.huella);
  const sinCambios = await request('/api/reviews', { order: regenerado.data.review.order, corteLona: regenerado.data.review.corteLona, savedBy: 'IVÁN', confirmOverwrite: true });
  assert.equal(sinCambios.status, 200, 'El corte recién generado debe quedar aceptado');
  await seed();
  const generar = { savedBy: 'IVÁN', includeNonAcrylicFabrics: false, confirmOverwrite: true };
  const fake = `http://127.0.0.1:${process.env.FAKE_COORDINA_PORT || '4326'}`;
  const cambiarOf = estado => fetch(fake + '/__estado', { method: 'POST', body: JSON.stringify({ ofs: { [order.awnings[0].of]: { estado } } }) });
  await cambiarOf('en_revision');
  const bloqueado = await request('/api/reviews/AR2600096/generate-files', generar);
  assert.equal(bloqueado.status, 409); assert.match(bloqueado.data.error, /Sin aprobar en CoordinaOT/);
  await fetch(fake + '/__estado', { method: 'POST', body: JSON.stringify({ ofs: { [order.awnings[0].of]: { estado: 'pasada', revisor: 'jaime' } } }) });
  const pregunta = await request('/api/reviews/AR2600096/generate-files', generar);
  assert.equal(pregunta.data.cambioCorte, true, JSON.stringify(pregunta));
  const generado = await request('/api/reviews/AR2600096/generate-files', { ...generar, aceptarHuellaCorte: pregunta.data.huella });
  assert.equal(generado.status, 200, JSON.stringify(generado));
  assert.equal(generado.data.review.production.createdBy, 'IVÁN');
  assert.equal(generado.data.review.order.reviewer, 'JAIME');
  assert.equal(generado.data.review.corteConfirmado.huella, pregunta.data.huella);
  await fetch(fake + '/__reset', { method: 'POST' });
  console.log('API: regenerar, aceptar huella y generar por compañero correctos (salidas solo en tmp)');
} finally {
  await request('/api/workflow/settings', { ...settings, productionEnabled: false }, 'PUT');
}
const salud = await fetch(base + '/api/health').then(r => r.json());
assert.equal(salud.simulationMode, true); assert.equal(salud.fileWritesEnabled, false);

// Chromium puede dejar debug.log en su carpeta de trabajo: también debe quedar bajo tmp.
process.chdir(dir);
const browser = await chromium.launch({ headless: true });
try {
  for (const theme of ['light', 'dark']) for (const viewport of [{ width: 1280, height: 720 }, { width: 1600, height: 1000 }]) {
    await seed();
    const context = await browser.newContext({ viewport, reducedMotion: 'reduce' });
    await context.addInitScript(({ theme }) => { localStorage.setItem('toldos-testar-usuario', 'IVÁN'); localStorage.setItem('toldos-tema', theme); }, { theme });
    const page = await context.newPage();
    page.setDefaultTimeout(20000);
    const errors = []; page.on('pageerror', e => errors.push(e.message));
    page.on('response', async r => { if (r.request().method() === 'POST' && r.url().endsWith('/api/reviews')) console.log('Guardar UI', r.status(), (await r.text()).slice(0, 280)); });
    await page.goto(base);
    const shot = async name => {
      await page.waitForTimeout(400);
      if (!await page.getByRole('alertdialog').isVisible()) {
        const cerrar = page.getByRole('button', { name: 'Cerrar notificación', exact: true });
        while (await cerrar.count()) await cerrar.first().click();
      }
      await page.screenshot({ path: path.join(shots, `${theme}-${viewport.width}x${viewport.height}-${name}.png`), animations: 'disabled' });
    };
    const abrirPedido = async () => {
      await page.getByRole('button', { name: /^Pedidos/ }).first().click();
      const row = page.locator('.orders-row', { hasText: order.orderCode });
      await row.getByRole('button', { name: order.orderCode, exact: true }).click();
      await page.getByRole('button', { name: 'Generar archivos', exact: true }).waitFor();
    };
    await abrirPedido();
    assert.equal(await page.getByRole('button', { name: 'Corregir', exact: true }).isVisible(), true);
    assert.equal(await page.getByRole('button', { name: /Confirmar corte|Corte confirmado/ }).count(), 0);
    await shot('pedido-botones');
    await page.getByRole('button', { name: 'Corregir', exact: true }).click();
    await page.getByRole('button', { name: 'Editar pedido', exact: true }).click();
    const abrir = page.getByRole('button', { name: 'Abrir para corregir', exact: true });
    if (await abrir.isVisible()) await abrir.click();
    await page.getByText(/Ya está aprobado en CoordinaOT; estos cambios no los ha revisado nadie/).waitFor();
    await page.waitForTimeout(1500);
    await shot('aviso-aprobado');
    await page.getByRole('textbox', { name: 'Observaciones de tela para todo el pedido, línea 1', exact: true }).fill('Datos nuevos para comprobar el diálogo');
    await page.waitForTimeout(1200);
    await page.getByRole('button', { name: 'Guardar para revisión', exact: true }).click();
    await page.getByRole('button', { name: 'No, mantener mi corte', exact: true }).waitFor();
    await shot('dialogo-regenerar');
    const antesCancelar = await huellaArchivos([settings.corteBorradoresDirectory, settings.corteLonaPlanoDirectory, settings.reviewDirectory]);
    await page.getByRole('button', { name: 'Cancelar', exact: true }).click();
    assert.equal(await huellaArchivos([settings.corteBorradoresDirectory, settings.corteLonaPlanoDirectory, settings.reviewDirectory]), antesCancelar);
    await page.getByRole('button', { name: 'Guardar para revisión', exact: true }).click();
    await page.getByRole('button', { name: 'No, mantener mi corte', exact: true }).waitFor();
    await page.getByRole('button', { name: 'No, mantener mi corte', exact: true }).click();
    await page.getByText(/Guardado en Pedidos para revisión: AR2600096/).waitFor();
    await page.waitForTimeout(400);
    await page.getByRole('button', { name: /^Pedidos/ }).first().click();
    await page.locator('.orders-row').getByText('El corte no está regenerado con los últimos datos', { exact: true }).waitFor();
    await shot('marca-lista');
    await abrirPedido();
    await page.locator('.review-reader').getByText('El corte no está regenerado con los últimos datos', { exact: true }).first().waitFor();
    await shot('marca-pedido');
    await page.locator('.corte-lona > header').evaluate(el => el.scrollIntoView({ block: 'center' }));
    await page.locator('.corte-estado.is-viejo').waitFor();
    assert.equal(await page.locator('.corte-lona').getByText('Corte guardado en ZWCAD', { exact: true }).count(), 0);
    await shot('marca-bloque-corte');
    // Cambios reales en la huella: pasar el mismo pedido a revisión pregunta; cancelar no lo guarda.
    const saved = await fetch(base + '/api/reviews/AR2600096').then(r => r.json());
    await seed(saved);
    await page.reload(); await abrirPedido();
    await page.getByRole('button', { name: 'Corregir', exact: true }).click();
    await page.getByRole('button', { name: 'Editar pedido', exact: true }).click();
    if (await abrir.isVisible()) await abrir.click();
    await page.waitForTimeout(1500);
    await page.getByRole('button', { name: 'Guardar para revisión', exact: true }).click();
    await page.getByRole('button', { name: 'Aceptar', exact: true }).waitFor();
    await shot('dialogo-huella');
    await page.getByRole('button', { name: 'Aceptar', exact: true }).click();
    await page.getByText(/Guardado en Pedidos para revisión: AR2600096/).waitFor();
    assert.equal((await fetch(base + '/api/reviews/AR2600096').then(r => r.json())).corteNoRegenerado, false);
    // Regenerar desde el detalle: cancelar no cambia disco; confirmar guarda en una petición.
    await abrirPedido();
    await page.getByRole('button', { name: 'Regenerar corte', exact: true }).click();
    const antesCancelarDetalle = await huellaArchivos([settings.corteBorradoresDirectory, settings.corteLonaPlanoDirectory, settings.reviewDirectory]);
    await page.getByRole('button', { name: 'Cancelar', exact: true }).click();
    assert.equal(await huellaArchivos([settings.corteBorradoresDirectory, settings.corteLonaPlanoDirectory, settings.reviewDirectory]), antesCancelarDetalle);
    const produccion = viewport.width === 1600;
    await request('/api/workflow/settings', { ...settings, productionEnabled: produccion }, 'PUT');
    await page.getByRole('button', { name: 'Regenerar corte', exact: true }).click();
    await shot('regenerar-detalle-confirmacion');
    const respuestaRegenerar = page.waitForResponse(r => r.request().method() === 'POST' && r.url().endsWith('/api/reviews'));
    await page.getByRole('button', { name: 'Sí, regenerar', exact: true }).click();
    const respuesta = await respuestaRegenerar;
    assert.equal(respuesta.status(), 200, await respuesta.text());
    await page.getByText('Corte guardado en AR2600096.', { exact: true }).waitFor();
    assert.equal(await page.getByRole('button', { name: 'Guardar corte', exact: true }).count(), 0);
    assert.equal(await page.getByRole('alertdialog').count(), 0);
    if (!produccion) {
      await page.getByText('Corte calculado en simulación; no se ha escrito ningún plano.', { exact: true }).waitFor();
      const abrirSimulado = page.getByRole('button', { name: 'Abrir corte', exact: true });
      await abrirSimulado.waitFor(); assert.equal(await abrirSimulado.isDisabled(), true);
    }
    await shot(produccion ? 'regenerado-directo-produccion' : 'regenerado-directo-simulacion');
    await request('/api/workflow/settings', { ...settings, productionEnabled: false }, 'PUT');

    // Pasada es aprobada en el chip y el desplegable. Una aprobación parcial también avisa.
    const parcial = structuredClone(original);
    const a = `099${viewport.width === 1280 ? '8' : '9'}${theme === 'light' ? '1' : '2'}01`, b = a.slice(0, -1) + '2';
    parcial.order.awnings = [{ ...order.awnings[0], of: a }, { ...order.awnings[0], id: 'prueba-b', of: b }];
    parcial.summary = { ...parcial.summary, ofs: [a, b], awnings: 2 };
    await seed(parcial);
    await fetch(`http://127.0.0.1:${process.env.FAKE_COORDINA_PORT || 4326}/__estado`, { method: 'POST',
      body: JSON.stringify({ ofs: { [a]: { estado: 'aprobada', revisor: 'jaime' }, [b]: { estado: 'pasada', revisor: 'jaime' } } }) });
    await page.reload(); await page.getByRole('button', { name: /^Pedidos/ }).first().click();
    const row = page.locator('.orders-row', { hasText: order.orderCode });
    await row.locator('.orders-chip-coordina.is-approved').nth(1).waitFor();
    await row.locator('.orders-row-toggle').click();
    await row.getByText('Aprobado por Jaime').nth(1).waitFor();
    await shot('of-pasada-aprobada');
    // Una OF nueva evita depender de la caché de 30 segundos para la pantalla siguiente.
    const c = a.slice(0, -1) + '3'; parcial.order.awnings[1].of = c; parcial.summary.ofs = [a, c];
    await seed(parcial);
    await fetch(`http://127.0.0.1:${process.env.FAKE_COORDINA_PORT || 4326}/__estado`, { method: 'POST', body: JSON.stringify({ ofs: { [c]: { estado: 'en_revision' } } }) });
    await page.reload(); await page.getByRole('button', { name: /^Pedidos/ }).first().click();
    await row.getByRole('button', { name: order.orderCode, exact: true }).click();
    await page.getByRole('button', { name: 'Corregir', exact: true }).click();
    await page.getByRole('button', { name: 'Editar pedido', exact: true }).click();
    if (await abrir.isVisible()) await abrir.click();
    const aviso = page.getByText(/Ya está aprobado en CoordinaOT; estos cambios no los ha revisado nadie/);
    await aviso.waitFor(); assert.match(await aviso.innerText(), new RegExp(a)); assert.ok(!(await aviso.innerText()).includes(c));
    await shot('aviso-aprobado-parcial');
    await page.getByRole('textbox', { name: 'Pedido', exact: true }).fill('AR2699981');
    await page.getByLabel('OF', { exact: true }).first().fill('');
    const abrirCorte = page.getByRole('button', { name: 'Abrir corte', exact: true });
    await page.waitForFunction(() => document.querySelector('.app-shell button[title="Falta la OF de algún toldo"]')?.disabled);
    assert.equal(await abrirCorte.isDisabled(), true); assert.match(await abrirCorte.getAttribute('title'), /OF/);
    await shot('abrir-corte-incompleto');
    assert.deepEqual(errors, []);
    await context.close();
    console.log(`UI: ${theme} ${viewport.width}×${viewport.height} verificada`);
  }
} finally {
  await request('/api/workflow/settings', { ...settings, productionEnabled: false }, 'PUT');
  await browser.close();
}
console.log(`Capturas: ${shots}`);
