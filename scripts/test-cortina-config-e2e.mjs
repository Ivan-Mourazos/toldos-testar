// Cortina y Cambio de cortina: confecciones, cota de ventana y ajuste independientes.
// Instancia propia: PORT=4312 FAKE_COORDINA_PORT=4322 ISOLATED_DIR=tmp/cortina-cabecera-codex.
// Ejecutar con TOLDOS_ISOLATED_URL=http://127.0.0.1:4312. Todo se escribe en tmp/.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { addAwning, BASE_URL, chooseFabric, openApp, pick } from '../.claude/skills/running-toldos-testar/drive.mjs';

const output = 'tmp/ui-audit/cortina-cabecera';
const storageKey = 'toldos-testar-draft-v6';
const health = await fetch(`${BASE_URL}/api/health`).then((r) => r.json());
assert.equal(new URL(BASE_URL).port, '4312');
assert.equal(health.simulationMode, true);
assert.equal(health.fileWritesEnabled, false);
const settings = (await fetch(`${BASE_URL}/api/workflow/settings`).then((r) => r.json())).settings;
const root = path.resolve('tmp/cortina-cabecera-codex') + path.sep;
for (const [key, value] of Object.entries(settings)) if (key.endsWith('Directory')) assert.ok(path.resolve(value).startsWith(root), key);
fs.mkdirSync(output, { recursive: true });

async function captures(page, name, target) {
  for (const [width, height] of [[1280, 720], [1600, 1000]]) {
    await page.setViewportSize({ width, height });
    for (const theme of ['light', 'dark']) {
      await page.evaluate((value) => { document.documentElement.dataset.theme = value; }, theme);
      if (target) await page.locator(target).first().evaluate((element) => {
        element.style.scrollMarginTop = '110px';
        element.scrollIntoView({ block: 'start', behavior: 'instant' });
      });
      if (await page.locator('.awning-panel-drawing').count()) {
        await page.waitForTimeout(400);
        const image = page.locator('.pdf-carousel-page').first();
        await image.waitFor({ state: 'visible', timeout: 30000 });
        await image.evaluate((element) => element.decode());
      }
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth), false, 'sin desbordamiento horizontal');
      if (name === 'cabecera-simple') {
        assert.equal(await page.locator('.order-fabric-cluster').evaluate((element) => getComputedStyle(element).borderLeftWidth), '0px', 'sin separador junto a Tela');
        const fields = [page.getByLabel('Pedido', { exact: true }), page.getByLabel('Cliente', { exact: true }), page.getByLabel('Fecha', { exact: true }), page.getByRole('combobox', { name: 'Referencia', exact: true })];
        const boxes = await Promise.all(fields.map((field) => field.boundingBox()));
        for (const box of boxes) {
          assert.ok(box && boxes[0]);
          assert.ok(Math.abs(box.y - boxes[0].y) <= 1, 'campos de cabecera alineados');
          assert.ok(Math.abs(box.height - boxes[0].height) <= 1, 'campos de cabecera con la misma altura');
        }
      }
      await page.screenshot({ path: `${output}/${name}-${width}-${theme}.png`, animations: 'disabled' });
    }
  }
  await page.setViewportSize({ width: 1600, height: 1000 });
}

for (const model of ['CORTINA', 'CAMBIO CORTINA']) {
  const { browser, page, errors } = await openApp();
  page.on('response', (response) => { if (response.status() >= 400) console.log(`HTTP ${response.status()} ${new URL(response.url()).pathname}`); });
  try {
    if (model === 'CORTINA') await addAwning(page, 'Cortina');
    else {
      await page.getByRole('button', { name: 'Toldos', exact: true }).click();
      await page.getByRole('button', { name: 'Añadir trabajo de tela', exact: true }).click();
      await page.getByRole('button', { name: /^Cambio de cortina/ }).click();
    }
    const card = page.locator('[data-awning-letter="A"]');
    const segment = (label, choice) => card.getByRole('group', { name: label, exact: true }).getByRole('button', { name: choice, exact: true }).click();
    await page.getByLabel('Pedido', { exact: true }).fill('AR2604782');
    await page.getByLabel('Cliente', { exact: true }).fill('Comprobación de Cortina');
    await chooseFabric(page, 'ACRILI2170P120');
    await card.getByLabel('OF', { exact: true }).fill('0232626');
    await card.getByLabel('Frente', { exact: true }).fill('200');
    await card.getByLabel('Salida', { exact: true }).fill('275');
    await card.getByLabel('Bamba (cm)', { exact: true }).fill('0');
    await segment('Rotulación tela', 'No');
    await segment('Ventana', 'Con ventana');
    await segment('Laterales', 'Velcro');
    if (model === 'CORTINA') {
      await pick(page, 'Lacado', 'Blanco', card);
      await pick(page, 'Dispositivo', 'Máq. interior', card);
      await pick(page, 'Altura manivela', '170', card);
      await pick(page, 'Soporte', 'Maxiscreen', card);
      assert.equal(await page.getByRole('option', { name: 'Diana vertical', exact: true }).count(), 0);
    }
    await card.getByLabel('Esquina', { exact: true }).fill('15');
    await card.getByLabel('Suelo-ventana', { exact: true }).fill('70');
    await card.getByLabel('Altura ventana', { exact: true }).fill('137');
    assert.equal(await card.getByLabel('Salida ventana', { exact: true }).count(), 0);
    assert.ok((await card.innerText()).includes('En el dibujo: 52 cm'));
    const draft = async () => {
      await page.waitForTimeout(100);
      return page.evaluate((key) => JSON.parse(localStorage.getItem(key)), storageKey);
    };
    const drop = async (expected) => {
      const response = await fetch(`${BASE_URL}/api/calculate`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(await draft()) });
      assert.equal(response.status, 200);
      const result = await response.json();
      assert.equal(result.ofs[0].calculation.valid, true, JSON.stringify(result.diagnostics));
      assert.equal(result.ofs[0].calculation.fabricDrop, expected);
    };
    await drop(315);
    await segment('Abajo', 'ET · entrada de tubo');
    await drop(325);
    await pick(page, 'Ajuste de salida de tela', 'Descontar 18 cm · tubo de carga', card);
    await drop(307);
    assert.ok((await card.innerText()).includes('En el dibujo: 52 cm'));
    await pick(page, 'Ajuste de salida de tela', 'Descontar 11 cm · ET', card);
    await drop(314);
    await pick(page, 'Ajuste de salida de tela', 'Personalizado', card);
    await card.getByLabel('Ajuste de salida (cm)', { exact: true }).fill('-23');
    await drop(302);
    await card.getByLabel('Ajuste de salida (cm)', { exact: true }).fill('12.5');
    await drop(337.5);
    await pick(page, 'Ajuste de salida de tela', 'Sin ajuste', card);
    await segment('Medida a ventana desde', 'Tubo de carga');
    assert.equal(await card.getByLabel('Tubo-ventana', { exact: true }).inputValue(), '70');
    assert.ok((await card.innerText()).includes('En el dibujo: 70 cm'));
    await drop(325);
    await card.getByLabel('Bamba (cm)', { exact: true }).fill('20');
    await pick(page, 'Curva bamba', 'Recta', card);
    await segment('Remate', 'Como tela');
    await segment('Rotulación bamba', 'No');
    await drop(350);
    await page.reload();
    if (await page.locator('.order-entry').isVisible()) await page.getByRole('button', { name: 'Toldos', exact: true }).click();
    const saved = (await draft()).awnings[0];
    assert.equal(saved.curtainFinish, 'VELCRO');
    assert.equal(saved.curtainBottomFinish, 'ET');
    assert.equal(saved.curtainWindowReference, 'TUBO DE CARGA');
    await drop(350);
    if (model === 'CORTINA') {
      // Alternativas guardadas con el borrador: la elegida se ve y las demás quedan desplegables.
      await page.evaluate((key) => {
        const value = JSON.parse(localStorage.getItem(key));
        value.fabricProposals = [{ phrase: 'Tejido acrílico negro', awningIds: [value.awnings[0].id], options: [{ selection: value.fabric, label: 'ACRILI2170P120 · Negro' }, { selection: 'ACRILI2018P120|||120|||LONA AZUL|||ACR', label: 'ACRILI2018P120 · Azul' }] }];
        value.confirmedFabricProposals = [0];
        localStorage.setItem(key, JSON.stringify(value));
      }, storageKey);
      await page.reload();
      if (await page.locator('.order-entry').isVisible()) await page.getByRole('button', { name: 'Toldos', exact: true }).click();
      assert.equal(await page.locator('.order-fabric-alternatives').evaluate((element) => element.open), false);
      assert.equal(await page.locator('.order-fabric-notes').evaluate((element) => element.open), false);
      await captures(page, 'cabecera-simple', '.order-header-simple');
      await page.locator('.order-fabric-alternatives > summary').click();
      await page.getByRole('button', { name: /ACRILI2018P120 · Azul/ }).waitFor();
      await captures(page, 'cabecera-alternativas', '.order-header-simple');
      await page.getByRole('button', { name: /ACRILI2018P120 · Azul/ }).click();
      assert.ok((await draft()).fabric.includes('ACRILI2018P120'));
      await chooseFabric(page, 'ACRILI2170P120');
      await page.locator('.order-fabric-alternatives > summary').click();
      await captures(page, 'cortina-velcro-et', '[data-awning-letter="A"]');
      await card.getByRole('button', { name: 'Despiece y dibujo', exact: true }).click();
      const dialog = page.getByRole('dialog', { name: 'Despiece y dibujo del toldo A' });
      await dialog.getByRole('tab', { name: 'Dibujo', exact: true }).click();
      await captures(page, 'pdf-cortina-velcro-et');
    } else await captures(page, 'cambio-cortina-velcro-et', '[data-awning-letter="A"]');
    assert.deepEqual(errors, []);
    console.log(`OK: ${model}: acabados independientes, ajustes, cota y persistencia`);
  } finally { await browser.close(); }
}
console.log(`OK: cabecera y Cortina; capturas en ${output}`);
