// Prueba e2e del panel «Despiece y dibujo» de un toldo (rediseño 3, tarea 6): rellena
// Arzúa AR2603332, comprueba la línea resumen de Planteamientos, abre el panel del
// toldo A, edita el despiece (fila 1 a 2 unidades) y comprueba que la Reserva lo
// refleja, cierra con Esc y comprueba el foco, y por último abre el pedido guardado y
// comprueba la ficha de lectura (grupos, «Frente» con su unidad, sin botón del panel).
// Ejecutar con TOLDOS_ISOLATED_URL=http://127.0.0.1:4330 node scripts/test-awning-panel-e2e.mjs
import assert from 'node:assert/strict';
import { addAwning, fillArzuaAR2603332, openApp } from '../.claude/skills/running-toldos-testar/drive.mjs';

const { browser, page } = await openApp({ width: 1280, height: 720 });
page.setDefaultTimeout(10000);

try {
  await addAwning(page, 'Arzúa Pro');
  await fillArzuaAR2603332(page);
  await page.waitForTimeout(500);

  // La línea resumen de Planteamientos: «1 estructura · 1 tela · N líneas RPS · 9 ml».
  await page.waitForFunction(
    () => /1 estructura · 1 tela · \d+ líneas RPS · 9 ml/.test(document.querySelector('.planning-summary-text')?.textContent || ''),
    null,
    { timeout: 10000 }
  );
  const summaryText = await page.locator('.planning-summary-text').innerText();
  assert.match(summaryText, /^1 estructura · 1 tela · \d+ líneas RPS · 9 ml$/, `línea resumen: "${summaryText}"`);
  console.log(`OK: línea resumen "${summaryText}"`);

  // Abre «Despiece y dibujo» del toldo A.
  const cardA = page.locator('[data-awning-letter="A"]');
  const openButton = cardA.getByRole('button', { name: 'Despiece y dibujo', exact: true });
  await openButton.click();
  const dialog = page.getByRole('dialog', { name: 'Despiece y dibujo del toldo A' });
  await dialog.waitFor({ state: 'visible' });
  assert.equal(await dialog.isVisible(), true, 'el diálogo del panel está visible');
  console.log('OK: se abre el diálogo «Despiece y dibujo del toldo A»');

  await dialog.getByRole('tab', { name: 'Despiece', exact: true }).click();
  await dialog.getByRole('button', { name: 'Editar despiece', exact: true }).click();
  const row1 = dialog.getByLabel('Reserva fila 1', { exact: true });
  const row1Code = await dialog.locator('.structure-edit-table tbody tr').first().locator('td').nth(1).locator('small').innerText();
  await row1.fill('2');
  const recalculated = page.waitForResponse((response) => response.url().endsWith('/api/calculate'));
  await dialog.getByRole('button', { name: /^(Aplicar al planteamiento y reserva|Confirmar despiece revisado)$/ }).click();
  await recalculated;
  await page.waitForTimeout(300);
  console.log('OK: fila 1 del despiece cambiada a 2 y aplicada');

  await dialog.getByRole('tab', { name: 'Reserva', exact: true }).click();
  const reservationRow = dialog.locator('.rps-table tbody tr', { has: page.locator('td.code', { hasText: row1Code }) }).first();
  await reservationRow.waitFor();
  const reservationQuantity = await reservationRow.locator('td').last().innerText();
  assert.equal(reservationQuantity, '2', `cantidad del artículo de la fila 1 (${row1Code}) en Reserva: "${reservationQuantity}"`);
  console.log(`OK: la pestaña Reserva enseña 2 para el artículo de la fila 1 (${row1Code})`);

  // Esc cierra el panel y el foco vuelve al botón que lo abrió.
  await page.keyboard.press('Escape');
  await dialog.waitFor({ state: 'hidden' });
  const focusedIsOpenButton = await openButton.evaluate((node) => node === document.activeElement);
  assert.equal(focusedIsOpenButton, true, 'tras Esc el foco vuelve al botón «Despiece y dibujo» del toldo A');
  console.log('OK: Esc cierra el panel y el foco vuelve al botón «Despiece y dibujo»');

  // Guarda el pedido y ábrelo desde Pedidos → Abrir.
  await page.getByRole('button', { name: 'Guardar para revisión', exact: true }).click();
  await page.waitForTimeout(600);
  for (const name of ['Guardar igualmente', 'Actualizar pedido']) {
    const confirmButton = page.getByRole('button', { name, exact: true });
    if (await confirmButton.count()) {
      await confirmButton.click();
      await page.waitForTimeout(600);
    }
  }

  await page.getByRole('button', { name: /^Pedidos/ }).click();
  await page.waitForTimeout(500);
  const allFilter = page.getByRole('button', { name: /^Todos/ });
  if (await allFilter.count()) await allFilter.click();
  await page.waitForTimeout(300);
  await page.locator('.orders-row', { hasText: 'AR2603332' }).getByRole('button', { name: 'Abrir' }).click();
  await page.locator('.review-readonly-order .awning-blocks-track').waitFor();
  console.log('OK: se abre el pedido guardado desde Pedidos');

  // Ficha de lectura del toldo A: grupos «Medidas» y «Accionamiento», y «Frente» con su unidad.
  const readCardA = page.locator('.review-readonly-order [data-awning-letter="A"]');
  await readCardA.locator('.read-group-title', { hasText: 'Medidas' }).waitFor();
  await readCardA.locator('.read-group-title', { hasText: 'Accionamiento' }).waitFor();
  const frentePair = readCardA.locator('.read-pair').filter({ has: page.locator('.read-label', { hasText: /^Frente$/ }) });
  const frenteValue = await frentePair.locator('.read-value').innerText();
  assert.equal(frenteValue, '337 cm', `«Frente» en la ficha de lectura: "${frenteValue}"`);
  console.log('OK: la ficha de lectura enseña los grupos «Medidas»/«Accionamiento» y «Frente» = «337 cm»');

  // Sin botón «Despiece y dibujo» en modo lectura.
  const readOpenButtons = await readCardA.getByRole('button', { name: 'Despiece y dibujo', exact: true }).count();
  assert.equal(readOpenButtons, 0, 'no debe haber botón «Despiece y dibujo» en modo lectura');
  console.log('OK: no hay botón «Despiece y dibujo» en modo lectura');

  console.log('Panel por toldo: OK');
} finally {
  await browser.close();
}
