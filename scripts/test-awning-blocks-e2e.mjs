// Prueba e2e de "toldos por bloques": índice, flechas, PageUp/PageDown, Tab entre
// bloques, salto a un toldo desde un aviso de Planteamientos y desde «Qué revisar», y
// el estado de cada toldo en el índice del pedido abierto.
// Ejecutar con TOLDOS_ISOLATED_URL=http://127.0.0.1:4330 node scripts/test-awning-blocks-e2e.mjs
import assert from 'node:assert/strict';
import { openApp, addAwning, fillArzuaAR2603332 } from '../.claude/skills/running-toldos-testar/drive.mjs';

const LABEL = '.awning-blocks-label';
const letter = (index) => String.fromCharCode(65 + index);

// Misma etiqueta que pageLabel() de src/client/awningBlocks.ts.
function labelFor(page, perPage, count) {
  const first = page * perPage;
  const last = Math.min(first + perPage, count) - 1;
  return first === last ? `${letter(first)} de ${count}` : `${letter(first)} – ${letter(last)} de ${count}`;
}

// Espera a que la etiqueta diga lo esperado (los saltos son desplazamientos suaves: un
// tiempo fijo no garantiza que hayan terminado).
async function waitLabel(page, expected, what) {
  try {
    await page.waitForFunction(
      ([selector, text]) => document.querySelector(selector)?.textContent === text,
      [LABEL, expected],
      { timeout: 5000 }
    );
  } catch {
    const got = await page.locator(LABEL).innerText().catch(() => '(sin etiqueta)');
    assert.fail(`${what}: se esperaba la etiqueta "${expected}" y hay "${got}"`);
  }
}

async function perPageOf(page) {
  return Number(await page.locator('.awning-blocks-track').evaluate((track) => track.style.getPropertyValue('--per-page')));
}

// La tarjeta está dentro de la pista en horizontal (no a un lado, fuera de la vista).
async function waitInsideTrack(page, selector, what) {
  try {
    await page.waitForFunction((sel) => {
      const track = document.querySelector('.awning-blocks-track')?.getBoundingClientRect();
      const card = document.querySelector(sel)?.getBoundingClientRect();
      return Boolean(track && card) && card.left >= track.left - 1 && card.right <= track.right + 1;
    }, selector, { timeout: 5000 });
  } catch {
    const boxes = await page.evaluate((sel) => ({
      track: document.querySelector('.awning-blocks-track')?.getBoundingClientRect().toJSON(),
      card: document.querySelector(sel)?.getBoundingClientRect().toJSON()
    }), selector);
    assert.fail(`${what}: ${selector} no queda dentro de la pista en horizontal (${JSON.stringify(boxes)})`);
  }
}

async function buildFiveAwnings(page) {
  await addAwning(page, 'Arzúa Pro');
  await fillArzuaAR2603332(page);
  const perPage = await perPageOf(page);
  for (let count = 2; count <= 5; count++) {
    await page.getByRole('button', { name: 'Duplicar' }).first().click();
    await page.locator(`[data-awning-index="${count - 1}"]`).waitFor();
    // Cada duplicado lleva la fila al bloque del toldo nuevo (con un solo bloque no hay etiqueta).
    if (count > perPage) await waitLabel(page, labelFor(Math.floor((count - 1) / perPage), perPage, count), `tras duplicar hasta ${count} toldos`);
  }
  return perPage;
}

// Último control que puede recibir el foco en la tarjeta indicada.
async function focusLastControlOf(page, index) {
  await page.locator(`[data-awning-index="${index}"]`).evaluate((slot) => {
    const controls = Array.from(slot.querySelectorAll('input, select, textarea, button, [tabindex]:not([tabindex="-1"])'))
      .filter((element) => !element.matches(':disabled') && element.getClientRects().length > 0);
    controls.at(-1).focus();
  });
}

const focusedSlotIndex = (page) => page.evaluate(() => document.activeElement?.closest('[data-awning-index]')?.getAttribute('data-awning-index') ?? null);

async function run1280() {
  const { browser, page, errors } = await openApp({ width: 1280, height: 720 });
  try {
    const perPage = await buildFiveAwnings(page);

    // A 1280 px el ancho real de la pista (con la barra lateral y el resto del layout
    // alrededor) cabe en 2 tarjetas por página, no 3: con 5 toldos el último bloque
    // sólo tiene la E ("E de 5"), no "D – E de 5" (eso sale a 3 por página, ver 1600 px).
    assert.equal(perPage, 2, 'a 1280×720 caben 2 tarjetas por página');
    assert.equal(await page.locator(LABEL).innerText(), 'E de 5', 'etiqueta inicial a 1280×720');
    console.log('OK: etiqueta inicial "E de 5" a 1280×720 (2 por página)');

    // PageUp con el foco en la tarjeta visible (la E): la fila vuelve un bloque y el foco
    // pasa a la primera tarjeta del bloque nuevo (la C).
    await page.locator('[data-awning-index="4"] [aria-label="Duplicar"]').focus();
    await page.keyboard.press('PageUp');
    await waitLabel(page, 'C – D de 5', 'tras PageUp');
    assert.equal(await focusedSlotIndex(page), '2', 'tras PageUp el foco pasa a la primera tarjeta del bloque (C)');
    console.log('OK: PageUp lleva a "C – D de 5" y el foco a la tarjeta C');

    // Clic en "A" del índice.
    await page.locator('.awning-index-item').first().click();
    await waitLabel(page, 'A – B de 5', 'tras clic en A');
    console.log('OK: etiqueta tras clic en A "A – B de 5"');

    // Tab desde el último control de la última tarjeta visible (la B): el foco pasa a la
    // C y la fila tiene que llevarla a la vista entera, con la etiqueta de su bloque.
    await focusLastControlOf(page, 1);
    await page.keyboard.press('Tab');
    assert.equal(await focusedSlotIndex(page), '2', 'Tab desde el final de la B entra en la C');
    await waitLabel(page, 'C – D de 5', 'tras Tab al bloque siguiente');
    await waitInsideTrack(page, '[data-awning-index="2"]', 'tras Tab al bloque siguiente');
    console.log('OK: Tab desde la última tarjeta visible pasa al bloque "C – D de 5" con la C a la vista');

    await page.screenshot({ path: 'tmp/ui-audit/bloques/1280x720.png', fullPage: true });

    // Para que Planteamientos calcule y muestre un aviso de verdad hace falta que los
    // duplicados (que salen con el OF vacío) estén completos, y forzar un error real
    // en la E: frente por debajo del mínimo para su salida/dispositivo. fill() enfoca
    // tarjetas de otros bloques: la fila tiene que seguir alineada a su bloque.
    for (let i = 1; i < 5; i++) {
      await page.locator(`[data-awning-index="${i}"]`).getByLabel('OF', { exact: true }).fill(`023019${i}`);
      await waitLabel(page, labelFor(Math.floor(i / perPage), perPage, 5), `tras escribir el OF de ${letter(i)}`);
      await waitInsideTrack(page, `[data-awning-index="${i}"]`, `tras escribir el OF de ${letter(i)}`);
    }
    await page.locator('[data-awning-index="4"]').getByLabel('Frente', { exact: true }).fill('100');
    console.log('OK: escribir en tarjetas de otros bloques deja la fila alineada con su etiqueta');

    // Vuelve al principio con "A" para comprobar que el salto realmente mueve la fila.
    await page.locator('.awning-index-item').first().click();
    await waitLabel(page, 'A – B de 5', 'antes del aviso de E');

    const warningLink = page.locator('.diagnostics-awning-link', { hasText: 'Toldo E' }).first();
    await warningLink.waitFor({ timeout: 10000 }).catch(() => assert.fail('no apareció ningún aviso de Planteamientos para el toldo E'));
    await warningLink.click();
    await waitLabel(page, 'E de 5', 'tras el aviso de E');
    await waitInsideTrack(page, '[data-awning-letter="E"]', 'tras el aviso de E');
    await page.waitForFunction(() => (document.querySelector('[data-awning-letter="E"]')?.getBoundingClientRect().top ?? -1) >= 50, null, { timeout: 5000 })
      .catch(() => assert.fail('el salto del aviso no trae la E por debajo de la barra superior'));
    console.log('OK: el aviso de Planteamientos lleva a "E de 5" con la E a la vista, bajo la barra superior');

    // Modo lectura del pedido abierto: guarda (con el error de la E, «Guardar igualmente»),
    // ábrelo desde Pedidos y comprueba índice, flechas, teclas y «Qué revisar».
    await page.getByRole('button', { name: 'Guardar para revisión', exact: true }).click();
    for (const name of ['Guardar igualmente', 'Actualizar pedido']) {
      const confirmButton = page.getByRole('button', { name, exact: true });
      await confirmButton.waitFor({ timeout: 2000 }).then(() => confirmButton.click()).catch(() => undefined);
    }
    await page.getByRole('button', { name: /^Pedidos/ }).click();
    const allFilter = page.getByRole('button', { name: /^Todos/ });
    await allFilter.waitFor({ timeout: 3000 }).then(() => allFilter.click()).catch(() => undefined);
    await page.locator('.orders-row', { hasText: 'AR2603332' }).getByRole('button', { name: 'Abrir' }).click();
    await page.locator('.review-readonly-order .awning-blocks-track').waitFor();
    const readPerPage = await perPageOf(page);

    const stripDisabled = await page.locator('.review-readonly-order fieldset.order-strip').evaluate((fieldset) => fieldset.disabled);
    assert.equal(stripDisabled, true, 'la cabecera del pedido abierto (fieldset.order-strip) está desactivada');
    console.log('OK: la cabecera del pedido abierto está desactivada');

    const readIndexItems = page.locator('.awning-index-item');
    const disabledReadIndexItems = await readIndexItems.evaluateAll(
      (elements) => elements.filter((element) => element.disabled || element.matches(':disabled')).length,
    );
    assert.equal(disabledReadIndexItems, 0, `los botones del índice del pedido abierto no deben estar desactivados (desactivados: ${disabledReadIndexItems})`);
    console.log('OK: el índice del pedido abierto tiene sus botones activos');

    // El índice recibe los avisos del mismo cálculo que «Qué revisar»: la E tiene errores.
    const indexE = readIndexItems.nth(4);
    await page.waitForFunction(() => document.querySelectorAll('.awning-index-item')[4]?.classList.contains('is-error'), null, { timeout: 10000 })
      .catch(async () => assert.fail(`el índice del pedido abierto debe marcar la E con error (clase: "${await indexE.getAttribute('class')}", nombre: "${await indexE.getAttribute('aria-label')}")`));
    const nameE = await indexE.getAttribute('aria-label');
    assert.match(nameE, /^Toldo E: \d+ errore?s?$/, 'nombre accesible del índice de la E');
    assert.equal(await readIndexItems.first().getAttribute('aria-label'), 'Toldo A: completo', 'nombre accesible del índice de la A');
    console.log(`OK: el índice del pedido abierto marca la E con error ("${nameE}") y la A como completa`);

    await waitLabel(page, labelFor(0, readPerPage, 5), 'pedido abierto al entrar');
    const labelBeforeNext = await page.locator(LABEL).innerText();
    await page.getByRole('button', { name: 'Toldos siguientes' }).click();
    await waitLabel(page, labelFor(1, readPerPage, 5), 'pedido abierto tras «Toldos siguientes»');
    console.log(`OK: «Toldos siguientes» mueve la etiqueta del pedido abierto ("${labelBeforeNext}" → "${labelFor(1, readPerPage, 5)}")`);

    // En lectura las tarjetas no reciben el foco: la pista sí, para usar Re Pág / Av Pág.
    await page.locator('.review-readonly-order .awning-blocks-track').focus();
    await page.keyboard.press('PageUp');
    await waitLabel(page, labelFor(0, readPerPage, 5), 'pedido abierto tras Re Pág con el foco en la pista');
    console.log('OK: Re Pág con el foco en la pista del pedido abierto cambia de bloque');

    const readCardDisabled = await page.locator('.review-readonly-order .awning-column').first().getAttribute('disabled');
    assert.notEqual(readCardDisabled, null, 'la tarjeta del pedido abierto debe tener el atributo disabled');
    console.log('OK: la tarjeta del pedido abierto tiene el atributo disabled');

    // Índice del pedido abierto, letra E (desde el 25/09/2026 no hay «Qué revisar»): la fila salta al bloque de la E.
    await page.locator('.review-readonly-order .awning-index-item', { has: page.locator('strong', { hasText: /^E$/ }) }).click();
    await waitLabel(page, labelFor(Math.floor(4 / readPerPage), readPerPage, 5), 'pedido abierto tras el índice E');
    await waitInsideTrack(page, '.review-readonly-order [data-awning-letter="E"]', 'pedido abierto tras el índice E');
    console.log(`OK: el índice E lleva al bloque "${labelFor(Math.floor(4 / readPerPage), readPerPage, 5)}" con la E a la vista`);

    const relevant = errors.filter((error) => !/status of (400|409)|WebSocket|\[vite\]/.test(error));
    assert.deepEqual(relevant, [], `sin errores de consola/página relevantes (obtenido: ${JSON.stringify(relevant)})`);
  } finally {
    await browser.close();
  }
}

async function run1600() {
  const { browser, page } = await openApp({ width: 1600, height: 1000 });
  try {
    const perPage = await buildFiveAwnings(page);
    assert.equal(perPage, 3, 'a 1600×1000 caben 3 tarjetas por página');
    assert.equal(await page.locator(LABEL).innerText(), 'D – E de 5', 'etiqueta a 1600×1000');
    await waitInsideTrack(page, '[data-awning-index="3"]', 'a 1600×1000');
    await waitInsideTrack(page, '[data-awning-index="4"]', 'a 1600×1000');
    console.log('OK: etiqueta "D – E de 5" a 1600×1000 (3 por página), con D y E a la vista');

    await page.screenshot({ path: 'tmp/ui-audit/bloques/1600x1000.png', fullPage: true });

    // Escribir en una tarjeta de otro bloque sin esperar a nada (como un fill() seguido de
    // otro): la fila tiene que quedar en el bloque de esa tarjeta, no a medias ni en el anterior.
    await page.locator('.awning-index-item').first().click();
    await waitLabel(page, 'A – C de 5', 'a 1600×1000 tras clic en A');
    await page.locator('[data-awning-index="3"]').getByLabel('OF', { exact: true }).fill('0230193');
    await waitLabel(page, 'D – E de 5', 'a 1600×1000 tras escribir el OF de la D');
    await waitInsideTrack(page, '[data-awning-index="3"]', 'a 1600×1000 tras escribir el OF de la D');
    // La etiqueta no puede volver atrás cuando termina el desplazamiento.
    await page.waitForTimeout(1200);
    assert.equal(await page.locator(LABEL).innerText(), 'D – E de 5', 'a 1600×1000, la etiqueta sigue en el bloque de la D');
    console.log('OK: a 1600×1000, escribir en la D desde el primer bloque deja la fila en "D – E de 5"');
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
