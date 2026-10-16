// Prueba e2e de las líneas de observaciones: al escribir deprisa, Intro abre la línea
// siguiente y la primera letra ya cae en ella (antes se quedaba en la anterior:
// «PRIMERAS» / «EGUNDA», revisión del 16/10/2026). Cubre las generales de tela del pedido,
// Obs. estructura y Obs. tela de una tarjeta.
// Ejecutar con TOLDOS_ISOLATED_URL=http://127.0.0.1:4318 node scripts/test-observaciones-intro-e2e.mjs
import assert from 'node:assert/strict';
import { openApp, addAwning } from '../.claude/skills/running-toldos-testar/drive.mjs';

const ESPERADO = ['PRIMERA', 'SEGUNDA', 'TERCERA'];

async function escribirLineas(page, scope, label) {
  await scope.getByLabel(`${label}, línea 1`, { exact: true }).click();
  for (const [index, texto] of ESPERADO.entries()) {
    if (index > 0) await page.keyboard.press('Enter');
    await page.keyboard.type(texto, { delay: 0 });
  }
  const valores = [];
  for (let index = 0; index < ESPERADO.length; index += 1) {
    valores.push(await scope.getByLabel(`${label}, línea ${index + 1}`, { exact: true }).inputValue());
  }
  assert.deepEqual(valores.map((valor) => valor.toUpperCase()), ESPERADO, `${label}: ${JSON.stringify(valores)}`);
}

const { browser, page, errors } = await openApp({ width: 1600, height: 1000 });
try {
  await page.getByRole('button', { name: 'Toldos', exact: true }).click();
  await escribirLineas(page, page.locator('.order-fabric-notes'), 'Observaciones de tela para todo el pedido');
  await addAwning(page, 'Arzúa Pro');
  const tarjeta = page.locator('.awning-column').first();
  await escribirLineas(page, tarjeta, 'Obs. estructura');
  await escribirLineas(page, tarjeta, 'Obs. tela');
  assert.deepEqual(errors, [], `errores en la consola: ${errors.join(' | ')}`);
  console.log('OK: Intro abre la línea siguiente sin perder letras en las tres listas de observaciones.');
} finally {
  await browser.close();
}
