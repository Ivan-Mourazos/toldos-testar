// Solo la aislada; prueba la casilla en todos los modelos y captura los dos temas de escritorio.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { BASE_URL, openApp, pick } from '../.claude/skills/running-toldos-testar/drive.mjs';

const salida = 'tmp/ui-audit/plano-apilables'; fs.mkdirSync(salida, { recursive: true });
const etiqueta = 'Saco con diagonales amarillas (impresión digital)';
for (const viewport of [{ width: 1280, height: 720 }, { width: 1600, height: 1000 }]) {
  const { browser, page, errors } = await openApp(viewport);
  try {
    await page.getByRole('button', { name: 'Puertas', exact: true }).click();
    const llenar = async (nombre, valor) => { const c = page.getByLabel(nombre, { exact: true }); await c.fill(String(valor)); await c.blur(); };
    assert.equal(await page.getByLabel(etiqueta, { exact: true }).isChecked(), false);
    for (const modelo of ['Enrollable', 'Apilable', 'Autorreparable']) {
      await pick(page, 'Modelo de puerta', modelo, page.locator('.puertas-pantalla'));
      for (const [k, v] of [['Frente (cm)', 426], ['Alto (cm)', 515], ['OF de puerta', '0299699'], ['Color de puerta', 'BLANCO 9016'], ['Rollo de lona (cm)', 300], ['Rollo transparente (cm)', 140]]) await llenar(k, v);
      const casilla = page.getByLabel(etiqueta, { exact: true });
      await casilla.uncheck();
      assert.equal(await page.locator('.puerta-config-alzado svg text').filter({ hasText: 'SACO 900 GR AMARILLO/NEGRO' }).count(), 0);
      await casilla.check();
      await page.locator('.puerta-config-alzado svg text').filter({ hasText: 'SACO 900 GR AMARILLO/NEGRO' }).waitFor();
      for (const tema of ['claro', 'oscuro']) {
        const oscuro = await page.locator('html').getAttribute('data-theme') === 'dark';
        if ((tema === 'oscuro') !== oscuro) await page.getByRole('button', { name: tema === 'oscuro' ? 'Pasar a modo oscuro' : 'Pasar a modo claro', exact: true }).click();
        await page.locator('.puerta-config-alzado').evaluate(e => e.scrollIntoView({ block: 'start' }));
        await page.screenshot({ path: `${salida}/${modelo}-${tema}-${viewport.width}x${viewport.height}.png` });
      }
    }
    // Autorreparable válida: el dato viaja al servidor y vuelve como rótulo de saco, material negro.
    await page.locator('.puerta-detalles > details > summary').filter({ hasText: 'Materiales del transparente' }).click();
    await llenar('Rollo de saco (cm)', 300);
    await page.getByLabel('He confirmado el modelo y las medidas con el dibujo', { exact: true }).check();
    await page.getByLabel('Ventanas confirmadas o puerta ciega', { exact: true }).check();
    const respuesta = page.waitForResponse(r => r.url().includes('/api/puertas/corte/vista'));
    await page.getByRole('button', { name: 'Ver vista previa del corte', exact: true }).click();
    const r = await respuesta, datos = await r.json(); assert.ok(r.ok(), JSON.stringify(datos));
    const cortes = datos.cortes ?? datos.vista?.cortes;
    assert.ok(cortes?.some(c => c.entidades.textos.some(t => t.valor.includes('SACO AMARILLO/NEGRO'))), 'El servidor debe indicar la impresión en el saco.');
    assert.ok(cortes.every(c => !c.material.includes('AMARILLO')), 'La impresión no cambia el material de corte.');
    assert.deepEqual(errors, []);
  } finally { await browser.close(); }
}
console.log(`Casilla de impresión: tres modelos, dos temas y dos resoluciones; API aislada ${BASE_URL}. Capturas en ${salida}.`);
