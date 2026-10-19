// Solo contra start-isolated.sh. Todas las carpetas se verifican dentro de tmp/ antes de activar salidas.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { chromium } from 'playwright';
import revision from '../src/domain/corteLona/fixtures/revision-AR2604784.json' with { type: 'json' };
import { createWorkflowStore } from '../src/workflow.js';
import { buildOrderReviewPdf } from '../src/domain/reviewPdf.js';
import { calculateOrder } from '../src/domain/rules.js';

const base = process.env.TOLDOS_ISOLATED_URL || 'http://127.0.0.1:4312';
assert.equal(new URL(base).hostname, '127.0.0.1');
const raizTmp = path.resolve('tmp');
const audit = path.join(raizTmp, 'ui-audit/corte-lona');
await fs.mkdir(audit, { recursive: true });
const request = async (ruta, body, method = 'POST') => {
  const r = await fetch(base + ruta, body === undefined ? undefined : { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  const text = await r.text();
  let data;
  try { data = JSON.parse(text); } catch { data = text; }
  return { status: r.status, data };
};
const health = await request('/api/health');
assert.equal(health.data.simulationMode, true);
assert.equal(health.data.fileWritesEnabled, false);
console.log('HEALTH: simulationMode=true, fileWritesEnabled=false');
const { settings } = (await request('/api/workflow/settings')).data;
for (const [key, value] of Object.entries(settings)) {
  if (key.endsWith('Directory') && value) assert.ok(path.resolve(value).startsWith(raizTmp + path.sep), `${key} fuera de tmp`);
}
const one = structuredClone(revision.order);
const abc = structuredClone(one);
abc.orderCode = 'AR2699903';
abc.awnings.push({ ...abc.awnings[0], id: 'toldo-b', of: '0232569', width: 380, projection: 150, armCount: 2 },
  { ...abc.awnings[0], id: 'toldo-c', of: '0232570', width: 600, projection: 250, valanceHeight: 20 });
const sinModelo = structuredClone(one);
sinModelo.orderCode = 'AR2699904';
sinModelo.awnings[0] = { ...sinModelo.awnings[0], model: 'BAMBALINA', workType: 'FABRIC_ONLY' };
const guardar = (order, corteLona) => request('/api/reviews', { order, corteLona, savedBy: order.technician, confirmOverwrite: true });
// Repetible: solo se limpian estos pedidos y salidas de esta aislada, cuyas rutas ya se verificaron.
for (const order of [one, abc, sinModelo]) await fs.rm(path.join(settings.reviewDirectory, `${order.orderCode}.pdf`), { force: true });
for (const directory of [settings.corteLonaBotDirectory, settings.corteLonaPlanoDirectory]) {
  assert.ok(directory && path.resolve(directory).startsWith(raizTmp + path.sep));
  await fs.rm(directory, { recursive: true, force: true });
}

assert.equal((await guardar(one, null)).status, 409);
console.log('GUARDAR SIN CORTE: 409, bloqueo del servidor');
const single = (await request('/api/corte-lona', { order: one })).data;
const triple = (await request('/api/corte-lona', { order: abc })).data;
assert.equal(single.cortes.conSacos[0].largo, 4850);
assert.equal(triple.cortes.conSacos[0].piezas.length, 3);
assert.ok(triple.cortes.trozoSeparado?.length);
const viejo = structuredClone(one);
viejo.awnings[0].width += 10;
const falloViejo = await guardar(viejo, single.corteLona);
assert.equal(falloViejo.status, 409);
assert.match(falloViejo.data.error, /viejo/);
const simulacion = await guardar(one, single.corteLona);
assert.equal(simulacion.status, 200);
assert.deepEqual(simulacion.data.planosCorte.files, []);
assert.match(simulacion.data.planosCorte.avisos.join(), /simulación/);
assert.equal(await fs.stat(settings.corteLonaPlanoDirectory).then(() => true, () => false), false);
assert.equal((await guardar(abc, triple.corteLona)).status, 200);
assert.equal((await guardar(sinModelo, null)).status, 200);
for (const sufijo of ['/dxf', '/plano']) assert.equal((await request('/api/reviews/AR2604784/corte-lona' + sufijo)).status, 404);
console.log('SIMULACIÓN: guarda revisión sin escribir plano; sin modelo admitido; descargas revisor=404');

const browser = await chromium.launch({ headless: true });
const errores = [];
try {
  for (const [nombre, order] of [['AR2604784', one], ['ABC', abc], ['sin-corte', sinModelo]]) {
    const context = await browser.newContext({ viewport: { width: 1600, height: 1000 } });
    await context.addInitScript(({ order }) => {
      localStorage.setItem('toldos-testar-usuario', 'ALBERTO');
      localStorage.setItem('toldos-testar-draft-v6', JSON.stringify(order));
      localStorage.setItem('toldos-tema', 'light');
    }, { order });
    const page = await context.newPage();
    page.on('pageerror', e => errores.push(e.message));
    await page.goto(base);
    await page.getByRole('button', { name: 'Toldos', exact: true }).click();
    await page.locator('.planning-summary-status').filter({ hasText: 'Estructura, tela y reserva se actualizan al cambiar el pedido' }).waitFor();
    const section = page.getByRole('region', { name: 'Corte de lona', exact: true });
    if (nombre !== 'sin-corte') {
      await section.getByText('Falta generar el corte', { exact: true }).waitFor();
      if (nombre === 'AR2604784') {
        await page.getByRole('button', { name: 'Guardar para revisión', exact: true }).click();
        await page.getByRole('button', { name: 'Actualizar pedido', exact: true }).click();
        await page.getByText(/No se puede continuar sin el corte de lona al día/).waitFor();
        await page.getByRole('button', { name: 'Cerrar notificación', exact: true }).last().click();
      }
      await section.getByRole('button', { name: 'Generar corte', exact: true }).click();
      await section.getByText('Corte al día', { exact: true }).waitFor();
      await section.locator('svg.corte-dibujo').first().waitFor();
      await section.locator('.corte-desglose summary').first().click();
    } else assert.equal(await section.count(), 0);
    for (const [width, height] of [[1280, 720], [1600, 1000]]) {
      await page.setViewportSize({ width, height });
      for (const tema of ['light', 'dark']) {
        await page.evaluate(t => { document.documentElement.dataset.theme = t; localStorage.setItem('toldos-tema', t); }, tema);
        if (nombre !== 'sin-corte') await section.evaluate(el => el.scrollIntoView({ block: 'start' }));
        await page.screenshot({ path: path.join(audit, `${nombre}-${width}x${height}-${tema}.png`) });
        assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), 'Desbordamiento horizontal');
      }
    }
    if (nombre === 'AR2604784') {
      await section.locator('.corte-ajustes summary').click();
      await section.getByLabel('Empate', { exact: true }).selectOption('vertical');
      await section.getByText('Corte al día', { exact: true }).waitFor();
      await page.waitForFunction(() => JSON.parse(localStorage.getItem('toldos-testar-draft-v6')).corteLona?.ajustes && Object.values(JSON.parse(localStorage.getItem('toldos-testar-draft-v6')).corteLona.ajustes)[0].empate === 'vertical');
      await page.screenshot({ path: path.join(audit, 'ajustes-vertical-dark.png') });
      const frente = page.getByLabel('Frente', { exact: true }).first();
      await frente.fill('500');
      await section.getByText('El corte está viejo: han cambiado las medidas', { exact: true }).waitFor();
      await section.evaluate(el => el.scrollIntoView({ block: 'start' }));
      await page.screenshot({ path: path.join(audit, 'corte-viejo-dark.png') });
    }
    await context.close();
  }
  const context = await browser.newContext({ viewport: { width: 1600, height: 1000 } });
  await context.addInitScript(() => localStorage.setItem('toldos-testar-usuario', 'IVÁN'));
  const page = await context.newPage();
  page.on('pageerror', e => errores.push(e.message));
  await page.goto(base + '/?revisar=AR2699903');
  const section = page.getByRole('region', { name: 'Corte de lona', exact: true });
  await section.getByText('Corte al día', { exact: true }).waitFor();
  assert.equal(await section.getByRole('button').count(), 0);
  for (const [width, height] of [[1280, 720], [1600, 1000]]) {
    await page.setViewportSize({ width, height });
    for (const tema of ['light', 'dark']) {
      await page.evaluate(t => document.documentElement.dataset.theme = t, tema);
      await section.evaluate(el => el.scrollIntoView({ block: 'start' }));
      await page.screenshot({ path: path.join(audit, `revisor-ABC-${width}x${height}-${tema}.png`) });
    }
  }
  await context.close();
} finally { await browser.close(); }
assert.deepEqual(errores, []);
console.log('PANTALLAS: 3 pedidos en claro/oscuro a 1280×720 y 1600×1000; ajustes, viejo y revisor sin descargas');

// Activación limitada a los destinos de tmp verificados arriba; siempre se restaura al terminar.
try {
  assert.equal((await request('/api/workflow/settings', { ...settings, productionEnabled: true }, 'PUT')).status, 200);
  const plano = await guardar(one, single.corteLona);
  assert.equal(plano.status, 200, JSON.stringify(plano.data));
  assert.equal(plano.data.planosCorte.files.length, 1);
  const file = plano.data.planosCorte.files[0];
  assert.ok(file.writtenAt);
  assert.match(await fs.readFile(file.savedPath, 'utf8'), /AC1032/);
  assert.match(plano.data.planosCorte.avisos.join(), /ODA/);
  assert.equal(await fs.stat(settings.corteLonaBotDirectory).then(() => true, () => false), false);
  await fs.writeFile(file.savedPath, 'prueba de reescritura');
  assert.equal((await guardar(one, single.corteLona)).status, 200);
  assert.match(await fs.readFile(file.savedPath, 'utf8'), /AC1032/);
  console.log('GUARDAR: solo plano, ruta y fecha en el PDF; alternativa DXF sin ODA y reescritura confirmadas');

  const store = createWorkflowStore({ settingsFile: path.join(path.dirname(settings.reviewDirectory), 'settings.json') });
  const original = await store.getReview(one.orderCode);
  for (const corteLona of [null, { ...single.corteLona, version: 0 }]) {
    const review = { ...original, corteLona };
    await store.saveReview(review, await buildOrderReviewPdf({ order: one, calculation: calculateOrder(one), review }));
    const bloqueado = await request(`/api/reviews/${one.orderCode}/generate-files`, { includeNonAcrylicFabrics: false, confirmOverwrite: true });
    assert.equal(bloqueado.status, 409);
    assert.match(bloqueado.data.error, /corte de lona/);
  }
  await guardar(one, single.corteLona);
  await guardar(abc, triple.corteLona);
  for (const [order, vista] of [[one, single], [abc, triple]]) {
    const producido = await request(`/api/reviews/${order.orderCode}/generate-files`, { includeNonAcrylicFabrics: false, confirmOverwrite: true });
    assert.equal(producido.status, 200, JSON.stringify(producido.data));
    const files = producido.data.saved.filter(f => f.type === 'corte-lona');
    const esperados = vista.cortes.conSacos.length + (vista.cortes.trozoSeparado?.length || 0);
    assert.equal(files.length, esperados);
    for (const file of files) {
      assert.ok(path.resolve(file.savedPath).startsWith(raizTmp + path.sep));
      assert.match(await fs.readFile(file.savedPath, 'latin1'), /AC1018/);
    }
    const abierto = (await request(`/api/reviews/${order.orderCode}`)).data;
    assert.equal(abierto.status, 'PRODUCED');
    assert.equal(abierto.production.files.filter(f => f.type === 'corte-lona').length, esperados);
    assert.ok(abierto.production.excludedNonAcrylicFabrics.length > 0);
    console.log(`PRODUCCIÓN ${order.orderCode}: ${files.length} DXF, production.files persistido, PVC sin reservar`);
  }
} finally {
  await request('/api/workflow/settings', settings, 'PUT');
}
console.log(`OK. Evidencias: ${audit}`);
