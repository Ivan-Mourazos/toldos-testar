import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdtemp, mkdir, readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import net from 'node:net';
import { chromium } from 'playwright';
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs';
const output = path.resolve('output/hera-workflow');
await mkdir(output, { recursive: true });
const directory = await mkdtemp(path.join(output, 'run-'));
const probe = net.createServer(); await new Promise(r => probe.listen(0, '127.0.0.1', r));
const port = probe.address().port; await new Promise(r => probe.close(r));
const base = 'http://127.0.0.1:' + port;
const server = spawn(process.execPath, ['src/server.js'], { windowsHide: true, stdio: 'ignore', env: {
  ...process.env, NODE_ENV: 'production', ENABLE_HERA: 'true', HOST: '127.0.0.1', PORT: String(port), ENABLE_FILE_WRITES: 'false',
  WORKFLOW_SETTINGS_FILE: path.join(directory, 'settings.json'), REVIEW_DIRECTORY: path.join(directory, 'reviews'),
  PLANTEAMIENTOS_DIRECTORY: path.join(directory, 'plans'), RPS_UPLOAD_DIRECTORY: path.join(directory, 'rps'), RPS_PLANTEAMIENTOS_DIRECTORY: path.join(directory, 'archive')
} });
let browser;
async function request(route, body, method = 'POST', expected = 200) {
  const response = await fetch(base + route, { method, headers: { 'Content-Type': 'application/json' }, ...(body ? { body: JSON.stringify(body) } : {}) });
  const data = await response.json(); assert.equal(response.status, expected, JSON.stringify(data)); return data;
}
try {
  for (let i = 0; i < 100; i++) { try { if ((await fetch(base + '/api/health')).ok) break; } catch {} await new Promise(r => setTimeout(r, 100)); }
  await request('/api/workflow/settings', { productionEnabled: true, reviewDirectory: path.join(directory, 'reviews'), planteamientosDirectory: path.join(directory, 'plans'), rpsUploadDirectory: path.join(directory, 'rps'), rpsPlanteamientosDirectory: path.join(directory, 'archive') }, 'PUT');
  const image = 'data:image/png;base64,' + (await readFile('src/domain/assets/tgm-logo.png')).toString('base64');
  for (const [index, variant] of ['HERA 43 MAQUINA', 'HERA 56 MAQUINA', 'HERA 56 MOTOR'].entries()) {
    const order = { orderCode: 'AR269990' + index, customer: 'PRUEBA HERA', technician: 'IVAN', reviewer: 'JAIME', fabric: 'ACRILI2170P120|||120|||LONA ACRILICA NEGRA|||ACR', sameFabric: true, awnings: [{ id: 'a', of: '999900' + index, model: 'HERA', submodel: variant, width: 205, projection: 140, height: 240, units: 1, heraJoin: 'VERTICAL', heraTopFinish: 'VARILLA PLANA', heraBottomFinish: 'PLETINA', heraInteriorFace: 'REVÉS', ...(index === 1 ? { fabricImage: image } : {}) }] };
    const calc = await request('/api/calculate', order); assert.equal(calc.ofs[0].calculation.valid, true);
    const saved = await request('/api/reviews', { order }); assert.equal(saved.review.status, 'PENDING_REVIEW');
    const reopened = await request('/api/reviews/' + order.orderCode, null, 'GET');
    assert.equal((reopened.review || reopened).order.awnings[0].fabricImage, order.awnings[0].fabricImage);
    const approved = await request('/api/reviews/' + order.orderCode + '/approve', { reviewer: 'JAIME' }); assert.equal(approved.review.status, 'APPROVED');
    assert.deepEqual(await readdir(path.join(directory, 'rps')).catch(() => []), index === 0 ? [] : Array.from({ length: index }, (_, i) => '999900' + i + '.xls'));
    const generated = await request('/api/reviews/' + order.orderCode + '/generate-files', {});
    assert.equal(generated.review.status, 'PRODUCED'); assert.equal(generated.saved.length, 2);
    const pdfPath = generated.saved.find(f => f.type === 'pdf').savedPath;
    const doc = await getDocument({ data: new Uint8Array(await readFile(pdfPath)) }).promise;
    assert.equal(doc.numPages, 1);
    const text = (await (await doc.getPage(1)).getTextContent()).items.map(i => i.str).join(' ');
    assert.ok(text.includes('CORTE TELA')); assert.ok(text.includes('REVÉS DENTRO')); assert.ok(text.includes('VERTICAL'));
    const workbook = await readFile(generated.saved.find(f => f.type === 'rps').savedPath, 'latin1');
    assert.ok(workbook.includes('ACRILI2170P120')); assert.ok(!workbook.includes('CADENA'));
    if (index === 0) {
      const invalid = structuredClone(order); invalid.orderCode = 'AR2699999'; invalid.awnings[0].heraInteriorFace = '';
      await request('/api/reviews', { order: invalid }); await request('/api/reviews/' + invalid.orderCode + '/approve', { reviewer: 'JAIME' });
      const response = await fetch(base + '/api/reviews/' + invalid.orderCode + '/generate-files', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
      assert.ok(!response.ok); assert.match((await response.json()).error, /incompletos|bloqueantes/);
    }
  }
  browser = await chromium.launch({ headless: true }); const page = await browser.newPage({ viewport: { width: 1500, height: 950 } });
  await page.goto(base); await page.getByRole('button', { name: 'Parámetros', exact: true }).click();
  for (const model of ['HERA', 'Antica']) {
    await page.locator('.parameter-model-trigger').click();
    await page.locator('.parameter-model-options button').filter({ hasText: model }).first().click();
    await page.locator('.parameter-model-trigger').click();
    const options = page.locator('.parameter-model-options button'); const last = options.last();
    await last.scrollIntoViewIfNeeded();
    assert.equal(await last.evaluate(el => { const r = el.getBoundingClientRect(); return el.contains(document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2)); }), true, 'El menú está recortado');
    await page.screenshot({ path: path.join(directory, model + '-selector.png') });
    await page.locator('.parameter-model-trigger').click();
  }
  console.log('OK: 3 variantes, guardar/reabrir/aprobar/generar, bloqueo incompleto, imagen, PDF y selector HERA/Antica. ' + directory);
} finally { await browser?.close(); server.kill(); }
