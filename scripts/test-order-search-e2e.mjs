// Buscador común: detecta el tipo, respeta las confirmaciones y conserva el otro formulario.
import assert from 'node:assert/strict';
import { openApp, addAwning } from '../.claude/skills/running-toldos-testar/drive.mjs';

const { browser, page, errors } = await openApp();
const search = page.getByRole('textbox', { name: 'Buscar pedido', exact: true });
const selected = tipo => page.getByRole('button', { name: tipo, exact: true });
const toldos = () => page.locator('.order-header:not(.rem-cabecera)');
try {
  // Este escenario prueba RPS; la apertura de borradores tiene su propia prueba completa.
  await page.route('**/api/borradores/AR2603332', route => route.fulfill({ status: 404, json: { error: 'Sin borrador para esta prueba' } }));
  let liberarParametros;
  let parametrosRetenidos;
  const lecturaParametros = new Promise(resolve => { parametrosRetenidos = resolve; });
  await page.route('**/api/remolques/parametros', async route => {
    await new Promise(resolve => { liberarParametros = resolve; parametrosRetenidos(); });
    await route.continue();
  });
  await search.fill('AR.26.04414');
  await search.press('Enter');
  await Promise.race([lecturaParametros, new Promise((_, reject) => setTimeout(() => reject(new Error('No se pidió la lectura de parámetros')), 15000))]);
  assert.equal(await page.locator('.rem-pestana-abrir').count(), 0, 'espera los parámetros antes de crear elementos');
  liberarParametros();
  await page.locator('.rem-pestana-abrir').nth(3).waitFor({ timeout: 60000 });
  await page.unroute('**/api/remolques/parametros');
  assert.equal(await selected('Remolques').getAttribute('aria-pressed'), 'true');
  console.log('OK: Enter detecta Remolques y trae las cuatro líneas');
  await search.fill('AR.26.04286');
  await search.press('Enter');
  await page.getByRole('alertdialog').getByRole('button', { name: 'Conservar formulario', exact: true }).click({ timeout: 5000 });
  assert.equal(await page.locator('.rem-cabecera').getByLabel('Pedido', { exact: true }).inputValue(), 'AR.26.04414');
  assert.equal(await page.locator('.rem-pestana-abrir').count(), 4);
  console.log('OK: cancelar otro pedido de Remolques conserva número y elementos');

  await selected('Toldos').click();
  await toldos().getByLabel('Pedido', { exact: true }).fill('AR.26.99811');
  await addAwning(page, 'Arzúa Pro');
  await search.fill('AR2603332');
  await page.getByRole('button', { name: 'Buscar', exact: true }).click();
  const confirmar = page.getByRole('alertdialog');
  await confirmar.getByRole('button', { name: 'Conservar formulario', exact: true }).click();
  assert.equal(await toldos().getByLabel('Pedido', { exact: true }).inputValue(), 'AR.26.99811');
  assert.equal(await page.locator('[data-awning-letter]').count(), 1);
  await selected('Remolques').click();
  await search.fill('AR2603332');
  await page.getByRole('button', { name: 'Buscar', exact: true }).click();
  await confirmar.getByRole('button', { name: 'Obtener y rellenar', exact: true }).click();
  await toldos().locator('.order-autofill-summary').waitFor();
  assert.equal(await selected('Toldos').getAttribute('aria-pressed'), 'true');
  assert.match(await toldos().getByLabel('Pedido', { exact: true }).inputValue(), /03332/);
  console.log('OK: Buscar detecta Toldos y cancelar conserva el pedido manual');

  await selected('Remolques').click();
  assert.equal(await page.locator('.rem-pestana-abrir').count(), 4);
  assert.equal(await page.locator('.rem-cabecera').getByLabel('Pedido', { exact: true }).inputValue(), 'AR.26.04414');
  await search.fill('AR.26.99999');
  const inexistente = page.waitForResponse(response => response.url().includes('/api/orders/AR.26.99999/autofill'));
  await search.press('Enter');
  assert.equal((await inexistente).status(), 404);
  await page.waitForFunction(() => !document.querySelector('.order-search-button').disabled);
  assert.equal(await selected('Remolques').getAttribute('aria-pressed'), 'true');
  assert.equal(await page.locator('.rem-pestana-abrir').count(), 4);
  console.log('OK: cambiar de tipo y buscar un pedido inexistente conserva los datos');
  assert.deepEqual(errors.filter(error => !/404/.test(error)), []);
} finally { await browser.close(); }
console.log('test-order-search-e2e OK');
