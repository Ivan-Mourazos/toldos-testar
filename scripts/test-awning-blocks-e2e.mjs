// Prueba e2e de "toldos por bloques": índice, flechas, PageUp/PageDown y salto
// a un toldo desde un aviso de Planteamientos. Se basa en tmp/bloques.mjs (Task 3).
// Ejecutar con TOLDOS_ISOLATED_URL=http://127.0.0.1:4330 node scripts/test-awning-blocks-e2e.mjs
import assert from 'node:assert/strict';
import { openApp, addAwning, fillArzuaAR2603332 } from '../.claude/skills/running-toldos-testar/drive.mjs';

async function buildFiveAwnings(page) {
  await addAwning(page, 'Arzúa Pro');
  await fillArzuaAR2603332(page);
  for (let i = 0; i < 4; i++) {
    await page.getByRole('button', { name: 'Duplicar' }).first().click();
    // Deja que cada salto de bloque termine antes del siguiente clic: si no, los
    // desplazamientos suaves se interrumpen entre sí y el resultado no es fiable
    // (no es un caso real: nadie hace click en Duplicar cuatro veces en el mismo instante).
    await page.waitForTimeout(400);
  }
  // Espera a que termine el scroll suave del último salto.
  await page.waitForTimeout(400);
}

async function run1280() {
  const { browser, page, errors } = await openApp({ width: 1280, height: 720 });
  try {
    await buildFiveAwnings(page);

    // A 1280 px el ancho real de la pista (con la barra lateral y el resto del layout
    // alrededor) cabe en 2 tarjetas por página, no 3: con 5 toldos el último bloque
    // sólo tiene la E ("E de 5"), no "D – E de 5" (eso sale a 3 por página, ver 1600 px).
    const label = await page.locator('.awning-blocks-label').innerText();
    assert.equal(label, 'E de 5', `etiqueta inicial a 1280×720 (obtenido: "${label}")`);
    console.log('OK: etiqueta inicial "E de 5" a 1280×720 (2 por página)');

    // PageUp con foco en una tarjeta de la página visible (la E, índice 4): un
    // clic en una tarjeta fuera de pantalla la traería a la vista con el scroll
    // nativo del navegador y falsearía la prueba.
    // Un div no admite foco propio: hay que enfocar algo interactivo dentro de la
    // tarjeta visible (su botón «Duplicar») para que la tecla suba burbujeando
    // hasta el onKeyDown de .awning-blocks.
    await page.locator('[data-awning-index="4"] [aria-label="Duplicar"]').focus();
    await page.keyboard.press('PageUp');
    await page.waitForTimeout(500);
    const labelAfterPageUp = await page.locator('.awning-blocks-label').innerText();
    assert.equal(labelAfterPageUp, 'C – D de 5', `etiqueta tras PageUp (obtenido: "${labelAfterPageUp}")`);
    console.log('OK: etiqueta tras PageUp "C – D de 5"');

    // Clic en "A" del índice.
    await page.locator('.awning-index-item').first().click();
    await page.waitForTimeout(500);
    const labelAfterA = await page.locator('.awning-blocks-label').innerText();
    assert.equal(labelAfterA, 'A – B de 5', `etiqueta tras clic en A (obtenido: "${labelAfterA}")`);
    console.log('OK: etiqueta tras clic en A "A – B de 5"');

    await page.screenshot({ path: 'tmp/ui-audit/bloques/1280x720.png', fullPage: true });

    // Para que Planteamientos calcule y muestre un aviso de verdad hace falta que los
    // duplicados (que salen con el OF vacío) estén completos, y forzar un error real
    // en la E: frente por debajo del mínimo para su salida/dispositivo.
    for (let i = 1; i < 5; i++) {
      await page.locator(`[data-awning-index="${i}"]`).getByLabel('OF', { exact: true }).fill(`023019${i}`);
    }
    await page.waitForTimeout(300);
    await page.locator('[data-awning-index="4"]').getByLabel('Frente', { exact: true }).fill('100');
    await page.waitForTimeout(700);

    // Vuelve al principio con "A" para comprobar que el salto realmente mueve la fila.
    await page.locator('.awning-index-item').first().click();
    await page.waitForTimeout(500);

    const warningLink = page.locator('.diagnostics-awning-link', { hasText: 'Toldo E' }).first();
    const hasWarning = await warningLink.count();
    assert.ok(hasWarning, 'no apareció ningún aviso de Planteamientos para el toldo E');
    await warningLink.click();
    await page.waitForTimeout(1200);
    const labelAfterWarning = await page.locator('.awning-blocks-label').innerText();
    console.log('Etiqueta tras el aviso de E:', labelAfterWarning);
    const cardE = page.locator('[data-awning-letter="E"]');
    const box = await cardE.boundingBox();
    assert.ok(box && box.y >= 50, `el salto del aviso trae la E por debajo de la barra superior (y=${box?.y})`);
    console.log('OK: el aviso de Planteamientos trae la E a la vista, bajo la barra superior');

    // Modo lectura del pedido abierto: guarda, ábrelo desde Pedidos y comprueba que el
    // índice y las flechas de bloques siguen activos, pero las tarjetas están bloqueadas.
    // Ver tmp/lectura-fix.mjs (referencia de Task 3/4).
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
    await page.waitForTimeout(800);
    const allFilter = page.getByRole('button', { name: /^Todos/ });
    if (await allFilter.count()) await allFilter.click();
    await page.locator('.orders-row', { hasText: 'AR2603332' }).getByRole('button', { name: 'Abrir' }).click();
    await page.waitForTimeout(1200);

    const readIndexItems = page.locator('.awning-index-item');
    const disabledReadIndexItems = await readIndexItems.evaluateAll(
      (elements) => elements.filter((element) => element.disabled || element.matches(':disabled')).length,
    );
    assert.equal(disabledReadIndexItems, 0, `los botones del índice del pedido abierto no deben estar desactivados (desactivados: ${disabledReadIndexItems})`);
    console.log('OK: el índice del pedido abierto tiene sus botones activos');

    const labelBeforeNext = await page.locator('.awning-blocks-label').innerText();
    await page.getByRole('button', { name: 'Toldos siguientes' }).click();
    await page.waitForTimeout(700);
    const labelAfterNext = await page.locator('.awning-blocks-label').innerText();
    assert.notEqual(labelAfterNext, labelBeforeNext, `«Toldos siguientes» debe mover la etiqueta del pedido abierto (antes: "${labelBeforeNext}", después: "${labelAfterNext}")`);
    console.log(`OK: «Toldos siguientes» mueve la etiqueta del pedido abierto ("${labelBeforeNext}" → "${labelAfterNext}")`);

    const readCardDisabled = await page.locator('.review-readonly-order .awning-column').first().getAttribute('disabled');
    assert.notEqual(readCardDisabled, null, 'la tarjeta del pedido abierto debe tener el atributo disabled');
    console.log('OK: la tarjeta del pedido abierto tiene el atributo disabled');

    const relevant = errors.filter((error) => !/status of (400|409)|WebSocket|\[vite\]/.test(error));
    assert.deepEqual(relevant, [], `sin errores de consola/página relevantes (obtenido: ${JSON.stringify(relevant)})`);
  } finally {
    await browser.close();
  }
}

async function run1600() {
  const { browser, page } = await openApp({ width: 1600, height: 1000 });
  try {
    await buildFiveAwnings(page);
    const label = await page.locator('.awning-blocks-label').innerText();
    assert.equal(label, 'D – E de 5', `etiqueta a 1600×1000 (obtenido: "${label}")`);
    console.log('OK: etiqueta "D – E de 5" a 1600×1000 (3 por página)');

    await page.screenshot({ path: 'tmp/ui-audit/bloques/1600x1000.png', fullPage: true });
  } finally {
    await browser.close();
  }
}

async function main() {
  await run1280();
  await run1600();
  console.log('Toldos por bloques: OK');
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
