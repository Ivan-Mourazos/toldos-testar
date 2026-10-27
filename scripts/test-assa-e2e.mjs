// Auditoría local: la web aislada recibe solo la foto del lote conservada en tmp.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { openApp, BASE_URL } from '../.claude/skills/running-toldos-testar/drive.mjs';
import { prepararLote } from '../src/assa/lote.js';

const carpeta = path.resolve('tmp/ui-audit/combursa');
await fs.mkdir(carpeta, { recursive: true });
const rps = JSON.parse(await fs.readFile(process.env.ASSA_RPS, 'utf8'));
const { browser, page, errors } = await openApp({ width: 1280, height: 720 });
const health = await fetch(`${BASE_URL}/api/health`).then(r => r.json());
assert.equal(health.simulationMode, true);
assert.equal(health.fileWritesEnabled, false);
try {
  await page.route('**/api/assa/lote/vista', async route => {
    const input = route.request().postDataJSON();
    const lote = prepararLote(input.fecha, rps.lineas.filter(l => l.entregaSolicitada === input.fecha), input.sueltas);
    await route.fulfill({ json: { ...lote, destino: 'tmp/combursa · foto local de RPS', dwgDisponible: false } });
  });
  await page.getByRole('button', { name: 'COMBURSA', exact: true }).click();
  await page.getByLabel('Sábado de entrega').fill('2026-10-31');
  await page.getByRole('button', { name: 'Leer lote de RPS', exact: true }).click();
  await page.getByRole('heading', { name: 'LOTE 31-10' }).waitFor();
  assert.equal(await page.locator('.combursa-listado tbody tr').count(), rps.lineas.filter(l => l.entregaSolicitada === '2026-10-31').length);
  for (const [width, height] of [[1280, 720], [1600, 1000]]) for (const tema of ['light', 'dark']) {
    await page.setViewportSize({ width, height });
    await page.evaluate(t => { document.documentElement.dataset.theme = t; localStorage.setItem('toldos-tema', t); }, tema);
    await page.locator('.combursa-dialogo').evaluate(e => { e.scrollTop = 0; });
    const nombre = `${tema}-${width}x${height}`;
    await page.screenshot({ path: path.join(carpeta, nombre + '.png') });
    await page.getByRole('heading', { name: 'Vista del corte', exact: true }).scrollIntoViewIfNeeded();
    await page.screenshot({ path: path.join(carpeta, nombre + '-corte.png') });
  }
  const checkbox = page.locator('.combursa-suelta input:not(:disabled)').first();
  await checkbox.check();
  await page.locator('.combursa-programas header span').filter({ hasText: '1 paño ×' }).first().waitFor();
  assert.equal(await checkbox.isChecked(), true);
  assert.equal(await page.getByRole('button', { name: 'Abrir corte', exact: true }).isDisabled(), true);
  await fs.writeFile(path.join(carpeta, 'resultado.json'), JSON.stringify({ health: { simulationMode: health.simulationMode, fileWritesEnabled: health.fileWritesEnabled }, errores: errors, fuente: process.env.ASSA_RPS, modo: 'foto-local-RPS', capturas: 8 }, null, 2));
  assert.deepEqual(errors, []);
  console.log(JSON.stringify({ carpeta, capturas: 8, errores: errors.length }));
} finally { await browser.close(); }
