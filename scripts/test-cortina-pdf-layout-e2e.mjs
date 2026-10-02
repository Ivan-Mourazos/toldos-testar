// Q-C04: la página real de telas de Cortina y Cambio de cortina, con todas las filas.
// PORT=4312 FAKE_COORDINA_PORT=4322 ISOLATED_DIR=tmp/tarea-13-pdf
// TOLDOS_ISOLATED_URL=http://127.0.0.1:4312 node scripts/test-cortina-pdf-layout-e2e.mjs
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs';
import { BASE_URL, openApp } from '../.claude/skills/running-toldos-testar/drive.mjs';
import { normalizeOrder } from '../src/domain/validation.js';

const output = 'tmp/ui-audit/tarea-13/pdf-cortina';
fs.mkdirSync(output, { recursive: true });
const health = await fetch(`${BASE_URL}/api/health`).then(r => r.json());
assert.equal(health.simulationMode, true);
assert.equal(health.fileWritesEnabled, false);
assert.equal(new URL(BASE_URL).port, '4312');
const settings = (await fetch(`${BASE_URL}/api/workflow/settings`).then(r => r.json())).settings;
assert.equal(path.resolve(settings.reviewDirectory), path.resolve('tmp/tarea-13-pdf/review'));

for (const model of ['CORTINA', 'CAMBIO CORTINA']) for (const longNotes of [false, true]) {
  const notes = longNotes ? Array.from({ length: 35 }, (_, i) => `NOTA ${String(i + 1).padStart(2, '0')} COMPROBAR LA MEDIDA Y EL MONTAJE EN OBRA`).join('\n') : '';
  const order = normalizeOrder({
    orderCode: 'AR2604782', customer: 'COMPROBACIÓN Q-C04', technician: 'IVÁN', reviewer: 'JAIME', orderDate: '2026-10-02',
    fabric: 'ACRILI2170P120|||120|||LONA ACRILICA NEGRA|||ACR', sameFabric: true, notes,
    structureColor: 'BLANCO', remate: 'COMO TELA', rotTela: 'NO', rotBamba: 'NO',
    awnings: [{
      id: 'a', of: '0232626', model, units: 1, width: 200, projection: 275,
      valanceHeight: 20, valanceCurve: 'RECTA', remate: 'COMO TELA', structureColor: 'BLANCO', rotFabric: 'NO', rotValance: 'NO',
      device: 'MAQ. INTERIOR', crankHeight: 170, machineSide: 'M.F.DER', placement: 'TECHO', curtainSupport: 'UNIVERSAL 3 AGUJEROS',
      curtainHasWindow: true, curtainFinish: 'VELCRO', curtainBottomFinish: 'ET', curtainWindowCorner: 15,
      curtainWindowHeight: 137, curtainWindowFloorHeight: 70, curtainWindowReference: 'SUELO', curtainFabricAdjustment: 'NINGUNO'
    }]
  });
  const { browser, page, errors } = await openApp();
  try {
    await page.evaluate(value => localStorage.setItem('toldos-testar-draft-v6', JSON.stringify(value)), order);
    await page.reload();
    await page.getByRole('button', { name: 'Toldos', exact: true }).click();
    await page.locator('[data-awning-letter="A"]').waitFor();
    await page.waitForFunction(() => {
      const status = document.querySelector('.planning-summary-status')?.textContent;
      return status === 'Estructura, tela y reserva se actualizan al cambiar el pedido';
    });
    const responsePromise = page.waitForResponse(r => new URL(r.url()).pathname === '/api/planteamiento' && r.request().method() === 'POST');
    await page.getByRole('button', { name: 'Vista previa', exact: true }).click();
    const response = await responsePromise;
    assert.equal(response.status(), 200);
    // Comprobar el contenido del pedido enviado, además de la imagen del visor.
    const pdfResponse = await fetch(`${BASE_URL}/api/planteamiento`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: response.request().postData()
    });
    assert.equal(pdfResponse.status, 200);
    const bytes = Buffer.from(await pdfResponse.arrayBuffer());
    assert.ok(bytes.length > 4, `PDF vacío: ${await page.locator('.awning-column-header').innerText()}`);
    const loading = getDocument({ data: new Uint8Array(bytes) });
    const pdf = await loading.promise;
    let fabricPage;
    let fabricText = '';
    for (let n = 1; n <= pdf.numPages; n++) {
      const p = await pdf.getPage(n);
      const items = (await p.getTextContent()).items;
      if (items.some(item => item.str === 'PLANTEAMIENTO DE TELAS')) {
        fabricText += items.map(item => item.str).join(' ');
        if (!fabricPage) {
          fabricPage = n;
          for (const label of ['SALIDA:', 'ESQ. VENTANA:', 'H. TUBO-VENT.:', 'H. VENTANA:', 'ALTURA VELCRO:']) {
            const item = items.find(item => item.str === label);
            assert.ok(item, label);
            assert.ok(p.view[3] - item.transform[5] < 449, `${label} cabe dentro del dibujo`);
          }
        }
      }
    }
    assert.ok(fabricPage);
    if (longNotes) for (let n = 1; n <= 35; n++) assert.ok(fabricText.includes(`NOTA ${String(n).padStart(2, '0')}`));
    else assert.ok(!fabricText.includes('OBSERVACIONES'));
    await loading.destroy();
    const image = page.locator('.pdf-carousel-page');
    for (let n = 1; n < fabricPage; n++) {
      await page.getByRole('img', { name: new RegExp(`^Página ${n} de `) }).waitFor();
      await page.getByRole('dialog', { name: 'Vista previa del planteamiento' }).getByRole('button', { name: 'Página siguiente', exact: true }).first().click();
    }
    await page.getByRole('img', { name: new RegExp(`^Página ${fabricPage} de `) }).waitFor();
    const name = `${model === 'CORTINA' ? 'cortina' : 'cambio-cortina'}-${longNotes ? 'notas-largas' : 'sin-notas'}`;
    for (const [width, height] of [[1280, 720], [1600, 1000]]) {
      await page.setViewportSize({ width, height });
      for (const theme of ['light', 'dark']) {
        await page.evaluate(value => { document.documentElement.dataset.theme = value; }, theme);
        await page.waitForTimeout(400);
        await image.evaluate(element => element.decode());
        await page.screenshot({ path: `${output}/${name}-${width}-${theme}.png`, animations: 'disabled' });
        await image.screenshot({ path: `${output}/${name}-telas-${width}-${theme}.png` });
      }
    }
    assert.deepEqual(errors, []);
    console.log(`OK: ${model}, ${longNotes ? '35 observaciones completas' : 'sin observaciones'}; cinco filas dentro del dibujo`);
  } finally { await browser.close(); }
}
console.log(`Capturas de página renderizada en ${output}`);
