import assert from 'node:assert/strict';
import { createAwning } from '../src/client/constants.ts';
import { spawn } from 'node:child_process';
import { mkdtemp, mkdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import net from 'node:net';
import { anticaVariants } from '../src/domain/anticaRules.js';
import { chromium } from 'playwright';
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs';
const output = path.resolve('output/modelos/antica/workflow');
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
  for (let i = 0; i < 100; i++) { try { if ((await fetch(base + '/api/health')).ok) break; } catch { /* Arranque local. */ } await new Promise(r => setTimeout(r, 100)); }
  await request('/api/workflow/settings', { productionEnabled: true, reviewDirectory: path.join(directory, 'reviews'), planteamientosDirectory: path.join(directory, 'plans'), rpsUploadDirectory: path.join(directory, 'rps'), rpsPlanteamientosDirectory: path.join(directory, 'archive') }, 'PUT');
  const order = { orderCode: 'AR2699700', orderDate: '2026-09-14', customer: 'PRUEBA ANTICA', technician: 'IVAN', reviewer: 'JAIME', fabric: 'ACRILI2170P120|||120|||LONA ACRILICA NEGRA|||ACR', sameFabric: true, structureColor: 'NEGRO (R-09011)', remate: 'COMO TELA', awnings: [{ ...createAwning(), structureColor: 'NEGRO (R-09011)', rotFabric: 'NO', rotValance: 'NO', hasValance: true, id: 'a', of: '9997000', model: 'ANTICA', units: 1, width: 450, projection: 80, valanceHeight: 20, valanceCurve: 'RECTA', anticaVariant: anticaVariants[0], device: 'MAQUINA', crankHeight: 200, anticaCrankColor: 'BLANCA', structureArmCount: 4, anticaSupportHeight: 60, machineSide: 'M.F.DER', placement: 'FRONTAL', structureNotes: 'FABRICACIÓN TGM · CUATRO BRAZOS', fabricNotes: '' }] };
  browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1500, height: 950 } });
  const errors = []; page.on('pageerror', e => errors.push(e.message));
  await request('/api/reviews', { order });
  await page.goto(base);
  async function reopen() {
    await page.getByRole('button', { name: 'Revisión', exact: true }).click();
    await page.getByLabel('Año', { exact: true }).fill('2026');
    await page.getByRole('button', { name: 'Corregir en Pedido', exact: true }).click();
  }
  await reopen();
  const color = page.getByRole('combobox', { name: 'Color manivela', exact: true });
  assert.ok((await color.innerText()).toLowerCase().includes('blanca'));
  const recalculated = page.waitForResponse(r => r.url().endsWith('/api/calculate') && r.request().postDataJSON()?.awnings?.[0]?.anticaCrankColor === 'NEGRA');
  await color.click(); await page.getByRole('option', { name: 'Negra', exact: true }).click(); await recalculated;
  const savedResponse = page.waitForResponse(r => r.url().endsWith('/api/reviews') && r.request().method() === 'POST');
  await page.getByRole('button', { name: 'Guardar para revisión', exact: true }).click();
  const saved = await savedResponse;
  if (saved.status() === 409) {
    const updated = page.waitForResponse(r => r.url().endsWith('/api/reviews') && r.status() === 200 && r.request().method() === 'POST');
    await page.getByRole('button', {name:'Actualizar pedido', exact:true}).click(); await updated;
  }
  await page.reload(); await reopen();
  assert.ok((await color.innerText()).toLowerCase().includes('negra'));
  const whiteCalc = page.waitForResponse(r => r.url().endsWith('/api/calculate') && r.request().postDataJSON()?.awnings?.[0]?.anticaCrankColor === 'BLANCA');
  await color.click(); await page.getByRole('option', { name: 'Blanca', exact: true }).click(); await whiteCalc;
  await page.getByText('Editar despiece', {exact:true}).waitFor();
  await page.screenshot({ path: path.join(directory, 'formulario-antica.png'), fullPage: true });
  const image = 'data:image/png;base64,' + (await readFile('src/domain/assets/tgm-logo.png')).toString('base64');
  for (const [i, variant] of anticaVariants.entries()) {
    const sample = structuredClone(order); sample.orderCode = 'AR269970' + i;
    Object.assign(sample.awnings[0], { of: '999700' + i, anticaVariant: variant, valanceHeight: variant === 'TUBO 50X30 SIN BAMBA' ? 0 : 20, ...(i === 2 ? {fabricImage: image} : {}) });
    const calc = await request('/api/calculate', sample);
    assert.equal(calc.ofs[0].calculation.valid, true);
    assert.equal(calc.ofs[0].calculation.armCount, 4);
    assert.equal(calc.ofs[0].materials.find(m => m.code === 'MANIVEBL16200C').quantity, 1);
    await request('/api/reviews', { order: sample, confirmOverwrite: true });
    const reopened = await request('/api/reviews/' + sample.orderCode, null, 'GET');
    const restored = (reopened.review || reopened).order;
    assert.equal(restored.awnings[0].anticaCrankColor, 'BLANCA');
    assert.equal(restored.awnings[0].structureArmCount, 4);
    assert.equal(restored.awnings[0].fabricNotes, '');
    assert.equal(restored.awnings[0].fabricImage || '', sample.awnings[0].fabricImage || '');
    await request('/api/reviews/' + sample.orderCode + '/approve', { reviewer: 'JAIME' });
    const generated = await request('/api/reviews/' + sample.orderCode + '/generate-files', {});
    assert.equal(generated.review.status, 'PRODUCED');
    const pdfPath = generated.saved.find(f => f.type === 'pdf').savedPath;
    const task = getDocument({ data: new Uint8Array(await readFile(pdfPath)) }); const doc = await task.promise;
    let text = ''; for (let p = 1; p <= doc.numPages; p++) text += (await (await doc.getPage(p)).getTextContent()).items.map(item => item.str).join(' ');
    assert.ok(text.includes('MANIVEBL16200C')); assert.ok(text.includes('BRAZO ANTICA')); assert.ok(text.includes('FABRICACIÓN TGM'));
    await task.destroy();
    const workbook = await readFile(generated.saved.find(f => f.type === 'rps').savedPath, 'latin1');
    assert.ok(workbook.includes('MANIVEBL16200C')); assert.ok(workbook.includes('CASPUNCEJE78MM'));
  }
  assert.deepEqual(errors, []);
  console.log('OK: seis variantes, cuatro brazos, selector y persistencia de color, guardar/reabrir/aprobar/generar local, imagen, notas vacías, PDF y reserva. ' + directory);
} finally { await browser?.close(); server.kill(); }
