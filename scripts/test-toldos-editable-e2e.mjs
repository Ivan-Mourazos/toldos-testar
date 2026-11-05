import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
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
const dir = path.resolve('tmp/flujo-editable-instancia');
const shots = path.resolve('tmp/ui-audit/flujo-editable');
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
async function seed(review = original) { await store.saveReview(review, await buildOrderReviewPdf({ order: review.order, calculation: calculateOrder(review.order), review })); }
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
assert.equal((await fetch(base + '/api/reviews/AR2600096').then(r => r.json())).corteNoRegenerado, true);
console.log('API: edición por compañero, pregunta de regenerar, mantener y persistencia correctos');

// Las salidas se habilitan solo durante esta comprobación, todas bajo tmp de esta instancia.
// No se conecta a RPS para escribir: los XLS quedan en la carpeta rps de prueba.
try {
  assert.equal((await request('/api/workflow/settings', { ...settings, productionEnabled: true }, 'PUT')).status, 200);
  await seed();
  const regenerado = await request('/api/reviews', { ...changed, decisionCorte: 'regenerar' });
  assert.equal(regenerado.data.cambioCorte, true, JSON.stringify(regenerado));
  const aceptado = await request('/api/reviews', { ...changed, decisionCorte: 'regenerar', aceptarHuellaCorte: regenerado.data.huella });
  assert.equal(aceptado.status, 200, JSON.stringify(aceptado));
  assert.equal(aceptado.data.review.corteNoRegenerado, false);
  assert.equal(aceptado.data.review.corteConfirmado.huella, regenerado.data.huella);
  await seed();
  const generar = { savedBy: 'IVÁN', includeNonAcrylicFabrics: false, confirmOverwrite: true };
  const fake = `http://127.0.0.1:${process.env.FAKE_COORDINA_PORT || '4326'}`;
  const cambiarOf = estado => fetch(fake + '/__estado', { method: 'POST', body: JSON.stringify({ ofs: { [order.awnings[0].of]: { estado } } }) });
  await cambiarOf('en_revision');
  const bloqueado = await request('/api/reviews/AR2600096/generate-files', generar);
  assert.equal(bloqueado.status, 409); assert.match(bloqueado.data.error, /Sin aprobar en CoordinaOT/);
  await cambiarOf('pasada');
  const pregunta = await request('/api/reviews/AR2600096/generate-files', generar);
  assert.equal(pregunta.data.cambioCorte, true, JSON.stringify(pregunta));
  const generado = await request('/api/reviews/AR2600096/generate-files', { ...generar, aceptarHuellaCorte: pregunta.data.huella });
  assert.equal(generado.status, 200, JSON.stringify(generado));
  assert.equal(generado.data.review.production.createdBy, 'IVÁN');
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
    const abrir = page.getByRole('button', { name: 'Abrir para corregir', exact: true });
    if (await abrir.isVisible()) await abrir.click();
    await page.getByText('Ya está aprobado en CoordinaOT; estos cambios no los ha revisado nadie.', { exact: true }).waitFor();
    await page.waitForTimeout(1500);
    await shot('aviso-aprobado');
    await page.getByRole('textbox', { name: 'Observaciones de tela para todo el pedido, línea 1', exact: true }).fill('Datos nuevos para comprobar el diálogo');
    await page.waitForTimeout(1200);
    await page.getByRole('button', { name: 'Guardar para revisión', exact: true }).click();
    await page.getByRole('button', { name: 'No, mantener mi corte', exact: true }).waitFor();
    await shot('dialogo-regenerar');
    await page.getByRole('button', { name: 'No, mantener mi corte', exact: true }).click();
    await page.getByText(/Guardado en Pedidos para revisión: AR2600096/).waitFor();
    await page.waitForTimeout(400);
    await page.getByRole('button', { name: /^Pedidos/ }).first().click();
    await page.locator('.orders-row').getByText('El corte no está regenerado con los últimos datos', { exact: true }).waitFor();
    await shot('marca-lista');
    await abrirPedido();
    await page.locator('.review-reader').getByText('El corte no está regenerado con los últimos datos', { exact: true }).waitFor();
    await shot('marca-pedido');
    // Cambios reales en la huella: pasar el mismo pedido a revisión pregunta; cancelar no lo guarda.
    const saved = await fetch(base + '/api/reviews/AR2600096').then(r => r.json());
    await seed(saved);
    await page.reload(); await abrirPedido();
    await page.getByRole('button', { name: 'Corregir', exact: true }).click();
    if (await abrir.isVisible()) await abrir.click();
    await page.waitForTimeout(1500);
    await page.getByRole('button', { name: 'Guardar para revisión', exact: true }).click();
    await page.getByRole('button', { name: 'Aceptar', exact: true }).waitFor();
    await shot('dialogo-huella');
    await page.getByRole('button', { name: 'Aceptar', exact: true }).click();
    await page.getByText(/Guardado en Pedidos para revisión: AR2600096/).waitFor();
    assert.equal((await fetch(base + '/api/reviews/AR2600096').then(r => r.json())).corteNoRegenerado, false);
    assert.deepEqual(errors, []);
    await context.close();
    console.log(`UI: ${theme} ${viewport.width}×${viewport.height} verificada`);
  }
} finally { await browser.close(); }
console.log(`Capturas: ${shots}`);
