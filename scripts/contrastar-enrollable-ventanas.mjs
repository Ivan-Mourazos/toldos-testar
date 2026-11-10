// Solo usa la instancia aislada; las fuentes y las capturas quedan en tmp/.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { chromium } from 'playwright';
import { enrollable5470 } from '../src/puertas/__fixtures__/enrollable5470.ts';
import { pedidoDe } from '../src/puertas/__fixtures__/ejemplos.ts';
import { escribirPlanoPuertas } from '../src/puertas/plano.ts';
import { generarCortePuertas } from '../src/puertas/corte.ts';
import { htmlPresentaciones, presentacionesDxf } from '../src/flujoDwg/planoDxf.js';
import { openApp } from '../.claude/skills/running-toldos-testar/drive.mjs';

const destino = 'tmp/ui-audit/portanova-ventanas';
await fs.mkdir(destino, { recursive: true });
const pedido = pedidoDe('AR2605470', enrollable5470());
const cabecera = { cliente: 'PORTANOVA', tecnico: 'IVÁN', revisor: '', fecha: '10/11/2026' };
const plano = escribirPlanoPuertas({ pedido, cabecera });
const vista = generarCortePuertas(pedido);
assert.deepEqual(vista.avisos.filter(a => a.nivel === 'error'), []);
await fs.writeFile(`${destino}/AR2605470-plano.dxf`, plano);
await fs.writeFile(`${destino}/AR2605470-bot.dxf`, vista.archivo.dxf);
await fs.writeFile(`${destino}/AR2605470-despiece.json`, JSON.stringify(vista.resultados, null, 2));
const hojas = presentacionesDxf(plano);
assert.equal(hojas.length, 1, 'Dibujo y corte en un único A4');
const html = htmlPresentaciones(plano, 'AR2605470 · enrollable con ventanas pequeñas');
await fs.writeFile(`${destino}/AR2605470-plano.html`, html);
const browserPlano = await chromium.launch({ headless: true });
try {
  const page = await browserPlano.newPage({ viewport: { width: 1600, height: 1132 }, deviceScaleFactor: 1 });
  await page.setContent(html);
  await page.locator('.hoja svg').screenshot({ path: `${destino}/AR2605470-plano.png`, scale: 'css' });
  await page.pdf({ path: `${destino}/AR2605470-plano.pdf`, format: 'A4', landscape: true, printBackground: true });
} finally { await browserPlano.close(); }

for (const viewport of [{ width: 1280, height: 720 }, { width: 1600, height: 1000 }]) {
  const { browser, page, errors } = await openApp(viewport);
  try {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.getByRole('button', { name: 'Puertas', exact: true }).click();
    await page.getByRole('button', { name: 'Portanova', exact: true }).click();
    await page.getByRole('button', { name: /Enrollable$/ }).click();
    const llenar = async (nombre, valor) => { const c = page.getByLabel(nombre, { exact: true }); await c.fill(String(valor)); await c.blur(); };
    for (const [campo, valor] of [['Número de pedido de Puertas','AR2605470'],['OF de puerta','0233871'],['Frente (cm)',472],['Alto (cm)',530],['Color de puerta','GRIS 7016']]) await llenar(campo, valor);
    await page.getByRole('tab', { name: 'Cristal', exact: true }).click();
    await page.getByRole('group', { name: 'Tipo de ventanas', exact: true }).getByRole('button', { name: 'Ventanas pequeñas', exact: true }).click();
    await llenar('Tramos de las E.T.', '600 710 600 500 600 2290');
    await page.getByRole('tab', { name: 'Saco y empates', exact: true }).click();
    await llenar('Saco útil del pedido (mm)', 80);
    await page.getByRole('tab', { name: 'Ventanas', exact: true }).click();
    for (const y of [81, 141]) {
      for (const [campo, valor] of [['Fila · margen izquierdo',32],['Fila · desde abajo',y],['Fila · ancho',122],['Fila · alto',40],['Fila · columnas',3],['Fila · pilar',21]]) await llenar(campo, valor);
      await page.getByRole('button', { name: 'Añadir fila', exact: true }).click();
    }
    await llenar('Desde abajo fila 1 (cm)',84);
    assert.equal(await page.locator('.puerta-alzado .puerta-cristal[y="406"]').count(),3);
    await llenar('Desde abajo fila 1 (cm)',81);
    // Pulsar la opción ya elegida conserva las ventanas.
    await page.getByRole('tab', { name: 'Cristal', exact: true }).click();
    await page.getByRole('group', { name: 'Tipo de ventanas' }).getByRole('button', { name: 'Ventanas pequeñas', exact: true }).click();
    await page.getByLabel('Confirmado con el dibujo: modelo, medidas y ventanas (o puerta ciega)', { exact: true }).check();
    assert.equal(await page.locator('.puerta-alzado .puerta-cristal').count(), 6);
    assert.equal(await page.locator('.puerta-avisos .es-error').count(), 0);
    for (const tema of ['claro', 'oscuro']) {
      if ((tema === 'oscuro') !== ((await page.locator('html').getAttribute('data-theme')) === 'dark')) await page.getByRole('button', { name: tema === 'oscuro' ? 'Pasar a modo oscuro' : 'Pasar a modo claro', exact: true }).click();
      await page.getByRole('tab', { name: 'Cristal', exact: true }).click();
      const nombre = `${destino}/${tema}-${viewport.width}x${viewport.height}`;
      await page.screenshot({ path: `${nombre}-configuracion.png` });
      await page.locator('.puerta-alzado').screenshot({ path: `${nombre}-alzado.png` });
      await page.getByRole('tab', { name: 'Ventanas', exact: true }).click();
      await page.screenshot({ path: `${nombre}-ventanas.png` });
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
      assert.equal(await page.locator('.puerta-pestanas').evaluate(el => [...el.querySelectorAll('button')].every(b => b.getBoundingClientRect().right <= el.getBoundingClientRect().right + 1)), true, 'Las pestañas caben en su panel');
    }
    assert.deepEqual(errors, []);
  } finally { await browser.close(); }
}
console.log(`Alzado, ventanas y A4 comprobados: ${destino}`);
