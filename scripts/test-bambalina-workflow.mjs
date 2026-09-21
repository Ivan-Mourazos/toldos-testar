import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdtemp, mkdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import net from 'node:net';
import { chromium } from 'playwright';
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs';
const output = path.resolve('output/bambalina-workflow');
await mkdir(output, { recursive: true });
const directory = await mkdtemp(path.join(output, 'run-'));
const probe = net.createServer(); await new Promise(r => probe.listen(0, '127.0.0.1', r));
const port = probe.address().port; await new Promise(r => probe.close(r));
const base = 'http://127.0.0.1:' + port;
const server = spawn(process.execPath, ['src/server.js'], { windowsHide: true, stdio: 'ignore', env: {
  ...process.env, NODE_ENV: 'production', ENABLE_HERA: 'false', HOST: '127.0.0.1', PORT: String(port), ENABLE_FILE_WRITES: 'false',
  WORKFLOW_SETTINGS_FILE: path.join(directory, 'settings.json'), REVIEW_DIRECTORY: path.join(directory, 'reviews'),
  PLANTEAMIENTOS_DIRECTORY: path.join(directory, 'plans'), RPS_UPLOAD_DIRECTORY: path.join(directory, 'rps'), RPS_PLANTEAMIENTOS_DIRECTORY: path.join(directory, 'archive')
} });
let browser;
async function request(route, body, method = 'POST', expected = 200) {
  const response = await fetch(base + route, { method, headers: { 'Content-Type': 'application/json' }, ...(body ? { body: JSON.stringify(body) } : {}) });
  const data = await response.json(); assert.equal(response.status, expected, JSON.stringify(data)); return data;
}
try {
  for (let i = 0; i < 100; i++) { try { if ((await fetch(base + '/api/health')).ok) break; } catch { /* El servidor todavía puede estar arrancando. */ } await new Promise(r => setTimeout(r, 100)); }
  await request('/api/workflow/settings', { productionEnabled: true, reviewDirectory: path.join(directory, 'reviews'), planteamientosDirectory: path.join(directory, 'plans'), rpsUploadDirectory: path.join(directory, 'rps'), rpsPlanteamientosDirectory: path.join(directory, 'archive') }, 'PUT');
  browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1500, height: 950 } });
  await page.goto(base);
  await page.getByRole('button', { name: 'Parámetros', exact: true }).click();
  await page.locator('.parameter-model-trigger').click();
  await page.locator('.parameter-model-options button').filter({ hasText: 'Bambalina' }).click();
  assert.equal(await page.getByLabel(/Bambalina · La caída/).count(), 0);
  assert.equal(await page.getByLabel(/Margen del cuerpo/).count(), 0);
  await page.getByLabel('Remate de bambalina (cm)', { exact: true }).fill('8');
  await page.getByLabel('Costura entre paños (cm)', { exact: true }).focus();
  await page.reload();
  await page.getByRole('button', { name: 'Parámetros', exact: true }).click();
  await page.locator('.parameter-model-trigger').click();
  await page.locator('.parameter-model-options button').filter({ hasText: 'Bambalina' }).click();
  assert.equal(await page.getByLabel('Remate de bambalina (cm)', { exact: true }).inputValue(), '8');
  const parameters = await page.evaluate(() => JSON.parse(localStorage.getItem('toldos-testar-parameters-v2')));
  await page.screenshot({ path: path.join(directory, 'parametros-bambalina.png'), fullPage: true });
  const image = 'data:image/png;base64,' + (await readFile('src/domain/assets/tgm-logo.png')).toString('base64');
  for (const [i, curve] of ['RECTA', 'NORMAL', 'SUAVE', 'EXTRASUAVE'].entries()) {
    const order = { orderCode: 'AR269980' + i, customer: 'PRUEBA BAMBALINA', technician: 'IVAN', reviewer: 'JAIME', parameters, fabric: 'ACRILI2170P120|||120|||LONA ACRILICA NEGRA|||ACR', sameFabric: true, remate: 'COMO TELA', awnings: [{ id: 'a', of: '999800' + i, model: 'BAMBALINA', width: 300, projection: 0, valanceHeight: 30, valanceCurve: curve, rotValance: 'NO', units: 1, structureNotes: 'COMPROBAR REMATE Y VARILLA', fabricNotes: 'CENTRAR ROTULACION', ...(i === 1 ? { fabricImage: image } : {}) }] };
    const calc = await request('/api/calculate', order);
    assert.equal(calc.ofs[0].calculation.fabricDrop, 38);
    const saved = await request('/api/reviews', { order }); assert.equal(saved.review.status, 'PENDING_REVIEW');
    const reopened = await request('/api/reviews/' + order.orderCode, null, 'GET');
    const restored = (reopened.review || reopened).order;
    assert.equal(restored.awnings[0].fabricImage, order.awnings[0].fabricImage);
    assert.equal(restored.awnings[0].fabricNotes, 'CENTRAR ROTULACION');
    assert.equal(restored.parameters.fabricJobs.valanceExtraCm, 8);
    await request('/api/reviews/' + order.orderCode + '/approve', { reviewer: 'JAIME' });
    const generated = await request('/api/reviews/' + order.orderCode + '/generate-files', {});
    assert.equal(generated.review.status, 'PRODUCED');
    const pdfPath = generated.saved.find(f => f.type === 'pdf').savedPath;
    const task = getDocument({ data: new Uint8Array(await readFile(pdfPath)) });
    const doc = await task.promise;
    assert.equal(doc.numPages, 1);
    const text = (await (await doc.getPage(1)).getTextContent()).items.map(item => item.str).join(' ');
    assert.ok(text.includes('38,0')); assert.ok(text.includes(curve)); assert.ok(text.includes('CENTRAR ROTULACION')); assert.ok(text.includes('COMPROBAR REMATE Y VARILLA'));
    await task.destroy();
    const workbook = await readFile(generated.saved.find(f => f.type === 'rps').savedPath, 'latin1');
    assert.ok(workbook.includes('ACRILI2170P120'));
  }
  console.log('OK: parámetros persistidos, cuatro curvas, corte 38 cm, guardar/reabrir/aprobar/generar, imagen, notas, PDF y reserva. ' + directory);
} finally { await browser?.close(); server.kill(); }
