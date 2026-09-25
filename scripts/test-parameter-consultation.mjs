import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdir, mkdtemp } from 'node:fs/promises';
import path from 'node:path';
import net from 'node:net';
import { chromium } from 'playwright';
import { groupModelsByFamily, models } from '../src/domain/catalog.js';
import { fullAwningModelNames, fabricOnlyModelNames } from '../src/domain/modelBehavior.js';
const output = path.resolve('output/playwright/parameters');
await mkdir(output, { recursive: true });
const directory = await mkdtemp(path.join(output, 'run-'));
const probe = net.createServer();
await new Promise(r => probe.listen(0, '127.0.0.1', r));
const port = probe.address().port;
await new Promise(r => probe.close(r));
const isolatedUrl = process.env.TOLDOS_ISOLATED_URL;
const server = isolatedUrl ? null : spawn(process.execPath, ['src/server.js'], { windowsHide: true, stdio: 'ignore', env: {
  ...process.env, NODE_ENV: 'production', HOST: '127.0.0.1', PORT: String(port), ENABLE_FILE_WRITES: 'false',
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
  const names = await sidebar.locator('button strong').allTextContents();
  assert.equal(names.length, models.length);
  const expectedOrder = groupModelsByFamily([...fullAwningModelNames, ...fabricOnlyModelNames]).flatMap(({ models: group }) => group);
  assert.deepEqual(await sidebar.locator('button').evaluateAll((buttons) => buttons.map((button) => button.dataset.model)), expectedOrder);
  assert.equal(await page.locator('.parameter-model-trigger').count(), 0);
  async function selectModel(name) {
    await sidebar.locator('button').filter({ has: page.getByText(name, { exact: true }) }).click();
  }
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
  await page.screenshot({ path: path.join(directory, 'antica.png'), fullPage: true });
  await selectModel('HERA');
  assert.equal(await page.getByRole('table', { name: 'Reglas HERA por variante' }).locator('tbody tr').count(), 3);
  await page.screenshot({ path: path.join(directory, 'hera.png'), fullPage: true });
  await selectModel('Iris');
  assert.ok(await page.getByRole('table', { name: 'Descuentos Iris seleccionados' }).count());
  await page.getByRole('combobox', { name: 'Guía Iris' }).click();
  await page.getByRole('option', { name: 'Pequeña', exact: true }).click();
  assert.ok((await page.getByRole('status').innerText()).includes('no tiene tabla'));
  assert.equal(await page.getByRole('table', { name: 'Descuentos Iris seleccionados' }).count(), 0);
  await page.getByRole('combobox', { name: 'Dispositivo Iris' }).click();
  await page.getByRole('option', { name: 'Motor', exact: true }).click();
  assert.ok((await page.getByRole('table', { name: 'Descuentos Iris seleccionados' }).innerText()).includes('5,2 cm'));
  await page.screenshot({ path: path.join(directory, 'iris.png'), fullPage: true });
  await selectModel('Cambio antica');
  // Desde el 25/09/2026 (Q-CA01) la caída es la medida de la tela más lo que se sume.
  assert.ok((await page.getByRole('table', { name: 'Caída Cambio Antica' }).innerText()).includes('M + A'));
  await page.screenshot({ path: path.join(directory, 'cambio-antica.png'), fullPage: true });
  await page.setViewportSize({ width: 800, height: 1000 });
  await selectModel('Antica');
  await page.screenshot({ path: path.join(directory, 'antica-800.png'), fullPage: true });
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1), false);
  assert.deepEqual(errors, []);
  console.log('OK: ' + names.length + ' fichas, ejemplo Antica, HERA, Iris válida/inválida y Cambio Antica. ' + directory);
} finally { await browser?.close(); server?.kill(); }
