// Prueba e2e del panel «Despiece y dibujo» de un toldo (rediseño 3, tarea 6): rellena
// Arzúa AR2603332, comprueba la línea resumen de Planteamientos, abre el panel del
// toldo A, edita el despiece (fila 1 a 2 unidades) comprobando que Esc, la X y el cambio
// de pestaña no pierden la edición sin preguntar, y comprueba que la Reserva del panel y
// la de la línea resumen desplegada lo reflejan; cierra con Esc y comprueba el foco, y por
// último abre el pedido guardado y comprueba la ficha de lectura (grupos, «Frente» con su
// unidad, «OF» leída, sin controles ni botón del panel).
// Ejecutar con TOLDOS_ISOLATED_URL=http://127.0.0.1:4330 node scripts/test-awning-panel-e2e.mjs
import assert from 'node:assert/strict';
import { addAwning, fillArzuaAR2603332, openApp } from '../.claude/skills/running-toldos-testar/drive.mjs';

const { browser, page } = await openApp({ width: 1280, height: 720 });
page.setDefaultTimeout(10000);

try {
  await addAwning(page, 'Arzúa Pro');
  await fillArzuaAR2603332(page);
  await page.waitForTimeout(500);

  // «Limpiar» pregunta; al salir con Esc o con «Volver al pedido» el foco vuelve a
  // «Limpiar», no al <body>.
  const clearButton = page.getByRole('button', { name: 'Limpiar', exact: true });
  const clearDialog = page.getByRole('alertdialog', { name: 'Limpiar el formulario' });
  for (const [how, leave] of [
    ['Esc', () => page.keyboard.press('Escape')],
    ['«Volver al pedido»', () => clearDialog.getByRole('button', { name: 'Volver al pedido', exact: true }).click()]
  ]) {
    await clearButton.click();
    await clearDialog.waitFor();
    await leave();
    await clearDialog.waitFor({ state: 'hidden' });
    await page.waitForTimeout(100);
    const focused = await page.evaluate(() => document.activeElement?.textContent?.trim() || document.activeElement?.tagName);
    assert.equal(focused, 'Limpiar', `tras cerrar «Limpiar» con ${how} el foco vuelve al botón (está en "${focused}")`);
  }
  console.log('OK: tras la confirmación de «Limpiar» (Esc y «Volver al pedido») el foco vuelve a «Limpiar»');

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

  // Con la edición abierta, Esc pregunta como la X. Tres Esc seguidos (abre, descarta la
  // pregunta, vuelve a abrir) no deben cerrar el <dialog> por su cuenta (Chrome lo hace
  // tras varios «cancel» evitados).
  const discard = page.getByRole('alertdialog', { name: 'Despiece sin guardar' });
  for (let press = 0; press < 3; press += 1) {
    await page.keyboard.press('Escape');
    await page.waitForTimeout(250);
  }
  await discard.waitFor();
  await discard.getByRole('button', { name: 'Seguir editando', exact: true }).click();
  await discard.waitFor({ state: 'hidden' });
  assert.equal(await dialog.isVisible(), true, 'tras tres Esc y «Seguir editando» el panel sigue a la vista');
  assert.equal(await row1.inputValue(), '2', 'tras tres Esc y «Seguir editando» la edición sigue');
  assert.equal(await page.evaluate(() => document.body.style.overflow), 'hidden', 'con el panel abierto la página no se desplaza');
  console.log('OK: tres Esc con el despiece en edición preguntan y «Seguir editando» conserva panel y edición');

  // La X y el cambio de pestaña también preguntan; «Seguir editando» deja la edición.
  for (const [action, run] of [
    ['la X', () => dialog.getByRole('button', { name: 'Cerrar panel', exact: true }).click()],
    ['la pestaña Reserva', () => dialog.getByRole('tab', { name: 'Reserva', exact: true }).click()]
  ]) {
    await run();
    await discard.waitFor();
    assert.match(await discard.innerText(), /Hay cambios del despiece sin guardar\. ¿Descartarlos\?/);
    await discard.getByRole('button', { name: 'Seguir editando', exact: true }).click();
    await discard.waitFor({ state: 'hidden' });
    assert.equal(await dialog.isVisible(), true, `${action}: tras «Seguir editando» el panel sigue abierto`);
    assert.equal(await row1.inputValue(), '2', `${action}: tras «Seguir editando» la edición sigue`);
    if (action === 'la X') {
      const backOnClose = await dialog.getByRole('button', { name: 'Cerrar panel', exact: true }).evaluate((node) => node === document.activeElement);
      assert.equal(backOnClose, true, 'tras «Seguir editando» el foco vuelve a «Cerrar panel»');
    }
    console.log(`OK: ${action} con el despiece en edición pregunta y «Seguir editando» la conserva`);
  }
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
  assert.equal(await page.evaluate(() => document.body.style.overflow), '', 'al cerrar el panel la página vuelve a desplazarse');
  console.log('OK: Esc cierra el panel y el foco vuelve al botón «Despiece y dibujo»');

  // La reserva del pedido, al desplegar la línea resumen, también lleva el cambio.
  const summary = page.locator('details.planning-summary');
  await summary.locator('summary').click();
  assert.equal(await summary.evaluate((node) => node.open), true, 'la línea resumen se despliega');
  const summaryRow = summary.locator('.rps-table tbody tr', { has: page.locator('td.code', { hasText: row1Code }) }).first();
  await summaryRow.waitFor();
  const summaryQuantity = await summaryRow.locator('td').last().innerText();
  assert.equal(summaryQuantity, '2', `cantidad de ${row1Code} en la reserva de la línea resumen: "${summaryQuantity}"`);
  console.log(`OK: la reserva de la línea resumen enseña 2 para ${row1Code}`);

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

  // «OF» leída como par y ningún control en la tarjeta, que sigue deshabilitada.
  const ofPair = readCardA.locator('.read-pair').filter({ has: page.locator('.read-label', { hasText: /^OF$/ }) });
  assert.equal(await ofPair.locator('.read-value').innerText(), '0230194', '«OF» en la ficha de lectura');
  assert.equal(await readCardA.locator('input').count(), 0, 'la ficha de lectura no tiene ningún input');
  assert.notEqual(await readCardA.getAttribute('disabled'), null, 'la tarjeta de lectura sigue deshabilitada');
  console.log('OK: la ficha de lectura enseña «OF» = 0230194, sin inputs y deshabilitada');

  // Sin botón «Despiece y dibujo» en modo lectura.
  const readOpenButtons = await readCardA.getByRole('button', { name: 'Despiece y dibujo', exact: true }).count();
  assert.equal(readOpenButtons, 0, 'no debe haber botón «Despiece y dibujo» en modo lectura');
  console.log('OK: no hay botón «Despiece y dibujo» en modo lectura');

  console.log('Panel por toldo: OK');
} finally {
  await browser.close();
}
