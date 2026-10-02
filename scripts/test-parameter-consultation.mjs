import { irAModelo } from './ayudas-modelo.mjs';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { startFakeCoordina } from './fake-coordina.mjs';
import { mkdir, mkdtemp } from 'node:fs/promises';
import path from 'node:path';
import net from 'node:net';
import { chromium } from 'playwright';
import { groupModelsByFamily, models } from '../src/domain/catalog.js';
import { fullAwningModelNames, fabricOnlyModelNames } from '../src/domain/modelBehavior.js';
const output = path.resolve('tmp/ui-audit/codex-parametros');
await mkdir(output, { recursive: true });
const directory = await mkdtemp(path.join(output, 'run-'));
async function capturarParametros(page, options) {
  // Una captura de consulta debe enseñar los dibujos terminados, no «Preparando dibujo».
  await page.waitForFunction(() => !document.querySelector('.drawing-today-thumb.is-loading'));
  if (options.fullPage) await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot(options);
}
async function comprobarDistribucion(page, name, filename) {
  for (const [width, height] of [[1280, 720], [1600, 1000]]) {
    await page.setViewportSize({ width, height });
    for (const theme of ['light', 'dark']) {
      await page.evaluate(theme => { document.documentElement.dataset.theme = theme; window.scrollTo(0, 0); }, theme);
      await page.waitForTimeout(450);
      const grids = await page.locator('.parameter-band-content > .parameter-grid').evaluateAll(elements => elements.map(grid => {
        const fields = Array.from(grid.children).filter(element => element.matches('label, .field'));
        const boxes = fields.map(element => element.querySelector('input:not([type="checkbox"]), .select-control, .segmented-control')?.getBoundingClientRect()).filter(Boolean);
        const aligned = boxes.every(box => boxes.every(other => Math.abs(box.top - other.top) >= 20 || Math.abs(box.top - other.top) < 1));
        const note = grid.querySelector('.parameter-grid-description');
        const noteBox = note?.getBoundingClientRect();
        const overlap = noteBox && fields.some(field => {
          const box = field.getBoundingClientRect();
          return Math.min(box.right, noteBox.right) > Math.max(box.left, noteBox.left) && Math.min(box.bottom, noteBox.bottom) > Math.max(box.top, noteBox.top);
        });
        return { aligned, overlap, columns: getComputedStyle(grid).gridTemplateColumns.split(' ').map(Number.parseFloat), left: grid.getBoundingClientRect().left, note: Boolean(note), duplicated: Boolean(note && grid.closest('.parameter-band').querySelector('.parameter-band-title p')) };
      }));
      assert.ok(grids.every(grid => grid.aligned && !grid.overlap && !grid.duplicated), `${name}: campos alineados y explicación sin solaparse ni repetirse`);
      assert.ok(grids.every(grid => grid.columns.length === grids[0].columns.length && Math.abs(grid.left - grids[0].left) < 1 && grid.columns.every((width, index) => Math.abs(width - grids[0].columns[index]) < 1)), `${name}: mismas columnas en todos los apartados`);
      if (filename === 'agata') assert.ok(grids[0]?.note, 'Ágata aprovecha el hueco de la última fila');
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
      await capturarParametros(page, { path: path.join(directory, `${filename}-${width}-${theme}.png`), animations: 'disabled' });
    }
  }
}
const probe = net.createServer();
await new Promise(r => probe.listen(0, '127.0.0.1', r));
const port = probe.address().port;
await new Promise(r => probe.close(r));
const isolatedUrl = process.env.TOLDOS_ISOLATED_URL;
// CoordinaOT simulado propio (solo si lanzamos servidor nosotros); nunca el real.
const coordina = isolatedUrl ? null : await startFakeCoordina();
const server = isolatedUrl ? null : spawn(process.execPath, ['src/server.js'], { windowsHide: true, stdio: 'ignore', env: {
  ...process.env, NODE_ENV: 'production', HOST: '127.0.0.1', PORT: String(port), ENABLE_FILE_WRITES: 'false', COORDINA_URL: coordina.url, COORDINA_CLAVE: coordina.key,
  WORKFLOW_SETTINGS_FILE: path.join(directory, 'settings.json'), REVIEW_DIRECTORY: path.join(directory, 'reviews'),
  PLANTEAMIENTOS_DIRECTORY: path.join(directory, 'plans'), RPS_UPLOAD_DIRECTORY: path.join(directory, 'rps'), RPS_PLANTEAMIENTOS_DIRECTORY: path.join(directory, 'archive'),
  EXPORT_DIRECTORY: path.join(directory, 'export'), ORDER_ARCHIVE_ROOT: path.join(directory, 'order-archive')
} });
let browser;
try {
  const base = isolatedUrl || 'http://127.0.0.1:' + port;
  let ready = false;
  for (let i = 0; i < 100; i++) { try { if ((await fetch(base + '/api/health')).ok) { ready = true; break; } } catch { /* Esperar al arranque local. */ } await new Promise(r => setTimeout(r, 100)); }
  assert.ok(ready, 'El servidor aislado no arrancó: ' + base);
  browser = await chromium.launch({ headless: true });
  // Usuario ya elegido para que «¿Quién eres?» no tape la página (diseño 24/09/2026).
  const context = await browser.newContext({ viewport: { width: 1600, height: 1000 } });
  await context.addInitScript(() => localStorage.setItem('toldos-testar-usuario', 'IVÁN'));
  const page = await context.newPage();
  const errors = []; page.on('pageerror', e => errors.push(e.message));
  await page.goto(base);
  await page.getByRole('button', { name: 'Parámetros', exact: true }).click();
  const sidebar = page.getByRole('navigation', { name: 'Modelos de parámetros' });
  const expectedGroups = groupModelsByFamily([...fullAwningModelNames, ...fabricOnlyModelNames]);
  // Un botón por grupo (Remolques primero) y, al elegir cada uno, solo sus modelos y en su orden.
  assert.equal(await sidebar.locator('[data-group]').count(), expectedGroups.length + 1);
  const names = [];
  for (const [index, { models: group }] of expectedGroups.entries()) {
    await sidebar.locator('[data-group]').nth(index + 1).click();
    assert.deepEqual(await sidebar.locator('[data-model]').evaluateAll((buttons) => buttons.map((button) => button.dataset.model)), group);
    assert.equal(await sidebar.locator('[data-model][aria-pressed="true"]').count(), 1);
    names.push(...await sidebar.locator('[data-model] strong').allTextContents());
  }
  assert.equal(names.length, models.length);
  assert.equal(await page.locator('.parameter-model-trigger').count(), 0);
  const selectModel = (name) => irAModelo(page, name);
  for (const name of names) {
    await selectModel(name);
    assert.ok(await page.locator('.parameter-band').count(), name + ' sin ficha');
    assert.ok((await page.locator('.parameters-heading h2').innerText()).includes(name));
  }
  await selectModel('Antica');
  assert.ok((await page.locator('output').innerText()).includes('383,8 cm'));
  await page.getByLabel('Salida de ejemplo (cm)', { exact: true }).fill('100');
  assert.ok((await page.locator('output').innerText()).includes('242,4 cm'));
  await page.getByLabel('Bamba en otra tela', { exact: true }).check();
  assert.ok((await page.locator('output').innerText()).includes('140 cm'));
  await page.getByRole('combobox', { name: 'Configuración de ejemplo' }).click();
  await page.getByRole('option').filter({ hasText: '42' }).click();
  assert.ok((await page.locator('output').innerText()).includes('201,4 cm'));
  await capturarParametros(page, { path: path.join(directory, 'antica.png'), fullPage: true });
  await selectModel('HERA');
  assert.equal(await page.getByRole('table', { name: 'Reglas HERA por variante' }).locator('tbody tr').count(), 3);
  await capturarParametros(page, { path: path.join(directory, 'hera.png'), fullPage: true });
  await selectModel('Iris');
  assert.ok(await page.getByRole('table', { name: 'Descuentos Iris seleccionados' }).count());
  await page.getByRole('combobox', { name: 'Guía Iris' }).click();
  await page.getByRole('option', { name: 'Pequeña', exact: true }).click();
  assert.ok((await page.getByRole('status').filter({ hasText: 'no tiene tabla' }).innerText()).includes('no tiene tabla'));
  assert.equal(await page.getByRole('table', { name: 'Descuentos Iris seleccionados' }).count(), 0);
  await page.getByRole('combobox', { name: 'Dispositivo Iris' }).click();
  await page.getByRole('option', { name: 'Motor', exact: true }).click();
  assert.ok((await page.getByRole('table', { name: 'Descuentos Iris seleccionados' }).innerText()).includes('5,2 cm'));
  await capturarParametros(page, { path: path.join(directory, 'iris.png'), fullPage: true });
  await selectModel('Cambio antica');
  // Desde el 25/09/2026 (Q-CA01) la caída es la medida de la tela más lo que se sume.
  assert.ok((await page.getByRole('table', { name: 'Caída Cambio Antica' }).innerText()).includes('M + A'));
  await capturarParametros(page, { path: path.join(directory, 'cambio-antica.png'), fullPage: true });
  // La web es de escritorio: comprobar el ancho mínimo y el tamaño habitual.
  for (const viewport of [{ width: 1280, height: 720 }, { width: 1600, height: 1000 }]) {
    await page.setViewportSize(viewport);
    await selectModel('Antica');
    await capturarParametros(page, { path: path.join(directory, `antica-${viewport.width}.png`), fullPage: true });
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1), false,
      `Parámetros desborda a ${viewport.width}×${viewport.height}`);
  }
  for (const [name, filename] of [['Ágata Box', 'agata'], ['Arzúa Pro', 'arzua'], ['Cortina', 'cortina'], ['Electra', 'electra'], ['Generales', 'remolques']]) {
    if (filename === 'remolques') await sidebar.locator('[data-group="REMOLQUES"]').click();
    await selectModel(name);
    await comprobarDistribucion(page, name, filename);
  }
  assert.deepEqual(errors, []);
  console.log('OK: ' + names.length + ' fichas, ejemplo Antica, HERA, Iris válida/inválida y Cambio Antica. ' + directory);
} finally { await browser?.close(); server?.kill(); await coordina?.close(); }
