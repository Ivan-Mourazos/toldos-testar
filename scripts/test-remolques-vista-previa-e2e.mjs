// Prueba e2e del botón «Vista previa del PDF» de Remolques (fase 4, tarea 7): con un elemento
// incompleto explica qué falta; con una lona y un baquetón de la fixture abre el visor con 2 páginas.
// Con un pedido real de RPS (AR.26.04286, solo lectura) obtenido de una vez —un elemento por línea
// (Iván, 30/09/2026)—, la vista previa sigue desactivada y dice qué le falta al primero.
// Capturas en tmp/ui-audit/remolques-7/. Ejecutar con la aislada en marcha:
//   node scripts/test-remolques-vista-previa-e2e.mjs
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { BASE_URL, openApp } from '../.claude/skills/running-toldos-testar/drive.mjs';
import { teclearCaso } from './lib/remolques-e2e.mjs';

const casos = JSON.parse(fs.readFileSync('src/remolques/__fixtures__/produccion-2026-09.json', 'utf8'));
const lona = casos.find((c) => c.caso === 'lona-24');
const baqueton = casos.find((c) => c.caso === 'baqueton-28');
const DIR = 'tmp/ui-audit/remolques-7';
fs.mkdirSync(DIR, { recursive: true });

for (const tema of ['claro', 'oscuro']) {
  for (const [width, height] of [[1280, 720], [1600, 1000]]) {
    const { browser, page, errors } = await openApp({ width, height });
    page.setDefaultTimeout(15000);
    try {
      if (tema === 'oscuro') {
        await page.evaluate(() => localStorage.setItem('toldos-tema', 'dark'));
        await page.reload();
        await page.getByRole('button', { name: 'Nuevo pedido', exact: true }).waitFor();
      }
      await page.getByRole('button', { name: /^Remolques/ }).click();
      await page.getByLabel('Pedido', { exact: true }).fill('AR.26.99989');
      await page.getByRole('button', { name: '+ Remolque' }).click();
      const boton = page.getByRole('button', { name: 'Vista previa del PDF' });
      assert.ok(await boton.isDisabled(), 'con el elemento vacío el botón está desactivado');
      const aviso = page.locator('.rem-pdf-falta');
      assert.match(await aviso.innerText(), /^Para la vista previa del PDF falta: A · Remolque: /, 'explica qué falta');
      await page.screenshot({ path: `${DIR}/falta-${tema}-${width}.png` });

      await teclearCaso(page, lona);
      await page.getByRole('button', { name: '+ Baquetón' }).click();
      await teclearCaso(page, baqueton);
      await aviso.waitFor({ state: 'detached' });
      assert.ok(await boton.isEnabled(), 'con todo completo el botón se activa');
      await boton.click();
      const preparando = page.getByRole('button', { name: 'Preparando la hoja…' });
      await preparando.waitFor();
      assert.ok(await preparando.isDisabled(), 'mientras prepara no admite otro clic');
      await page.screenshot({ path: `${DIR}/preparando-${tema}-${width}.png` });
      const visor = page.getByRole('dialog', { name: 'Vista previa de la hoja de taller' });
      await visor.waitFor({ timeout: 60000 });
      await visor.getByText(/Página 1 de 2/).waitFor({ timeout: 30000 });
      await page.waitForTimeout(800);
      await page.screenshot({ path: `${DIR}/visor-${tema}-${width}.png` });
      await page.keyboard.press('Escape');
      await visor.waitFor({ state: 'hidden' });
      await page.waitForFunction(() => document.activeElement?.textContent?.includes('Vista previa del PDF'));
      assert.deepEqual(errors, [], 'sin errores de consola');
      console.log(`OK ${tema} ${width}`);
    } finally {
      await browser.close();
    }
  }
}

// Un pedido obtenido de RPS: sus elementos llegan con lo que RPS da y la vista previa espera al resto.
const PEDIDO_RPS = 'AR.26.04286';
const rps = await fetch(`${BASE_URL}/api/remolques/rps-pedido?numero=${PEDIDO_RPS}`).then((r) => (r.ok ? r.json() : null)).catch(() => null);
const lineasRps = rps?.pedido?.lineas ?? [];
if (lineasRps.length !== 3) {
  console.log(`SALTADO: RPS no trae las 3 líneas de ${PEDIDO_RPS} en la aislada (${lineasRps.length})`);
} else {
  const { browser, page, errors } = await openApp({ width: 1280, height: 720 });
  page.setDefaultTimeout(15000);
  try {
    await page.getByRole('button', { name: /^Remolques/ }).click();
    await page.getByLabel('Pedido', { exact: true }).fill(PEDIDO_RPS);
    await page.waitForFunction(() => document.querySelectorAll('.rem-pestana-abrir').length === 3);
    const boton = page.getByRole('button', { name: 'Vista previa del PDF' });
    assert.ok(await boton.isDisabled(), 'con lo que RPS no da, el botón está desactivado');
    assert.match(await page.locator('.rem-pdf-falta').innerText(),
      /^Para la vista previa del PDF falta: A · Remolque 250×143: Elige el tipo de perfil del remolque\.$/, 'dice qué le falta al primero');
    await page.screenshot({ path: `${DIR}/rps-falta-claro-1280.png` });
    assert.deepEqual(errors, [], 'sin errores de consola');
    console.log(`OK ${PEDIDO_RPS}: 3 elementos de RPS y la vista previa dice qué falta`);
  } finally {
    await browser.close();
  }
}
