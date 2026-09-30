// Prueba e2e de la pantalla de remolques (fase 2a): elige Remolques, teclea a mano dos casos
// reales de producción (src/remolques/__fixtures__/produccion-2026-09.json) y comprueba en
// pantalla lo mismo que guarda su `result`; recarga y comprueba que el borrador sigue; borra
// un elemento con su confirmación; trae un pedido real de remolques de RPS (solo lectura) y,
// desde Nuevo pedido de Toldos, comprueba el aviso «Este pedido es de remolques» con su botón
// «Abrir en Remolques».
//   · lona-24: TIPO 05 (radio de esquina 8), ventana 50×35, rotulación y ollaos «según se indica».
//   · baqueton-28: cliente AYALA, baquetón 28, ollaos «según se indica».
// Además, un pedido con dos casos de ollaos «repartidos automáticamente» (lona-02, TIPO 03 con
// ventana y rotulación; baqueton-07) que compara la tabla de reparto con la del `result`, y que
// el cliente de la cabecera sobrevive a recargar. Los 32 casos, sin navegador, los compara
// src/client/remolques/resultados-paridad.test.tsx.
// Remolque distinto detrás (parte 1c): el pedido de Hijos de Pedro López del CAD de Iván (30/09/2026,
// 130 delante y 131,5 detrás): paño trasero 172,5, ollaos de detrás del CAD, paño contorno en
// trapecio; «Detrás distinto» arranca en Sí tras recargar y al pasarlo a No pregunta y borra lo de
// detrás. «Con radios» igual con un TIPO 03 con radios. Capturas en tmp/ui-audit/remolques-sesgo/.
// Si RPS no responde en la instancia aislada, esa parte se anota (SALTADO) y se sigue.
// Ejecutar con la aislada en marcha: node scripts/test-remolques-2a-e2e.mjs
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { BASE_URL, openApp } from '../.claude/skills/running-toldos-testar/drive.mjs';
import { calcLona } from '../src/remolques/calc/lona.ts';
import { DEFAULT_PARAMS } from '../src/remolques/calc/params.ts';
import { comprobarCaso, editor, siNo, teclearCaso } from './lib/remolques-e2e.mjs';

const casos = JSON.parse(fs.readFileSync('src/remolques/__fixtures__/produccion-2026-09.json', 'utf8'));
const lona = casos.find((c) => c.caso === 'lona-24');
const baqueton = casos.find((c) => c.caso === 'baqueton-28');
const lonaRepartida = casos.find((c) => c.caso === 'lona-02');
const baquetonRepartido = casos.find((c) => c.caso === 'baqueton-07');
assert.ok(lona && baqueton, 'los casos lona-24 y baqueton-28 existen en la fixture');
assert.ok(lonaRepartida?.input.modoOllaos === 'REPARTIDOS' && baquetonRepartido?.input.modoOllaos === 'REPARTIDOS',
  'lona-02 y baqueton-07 llevan los ollaos repartidos automáticamente');

const PEDIDO_PRUEBA = 'AR.26.99999'; // no existe en RPS: no trae nada y los borradores cuelgan de él
const CLIENTE_PRUEBA = 'TALLERES X';
const PEDIDO_RPS = 'AR.26.04286'; // pedido real de remolques (3 líneas de lona), solo lectura

// El pedido de HPL del CAD de Iván. El CAD no trae el alto: los contornos van introducidos (TIPO 01, +7).
const baseHpl = casos.find((c) => c.caso === 'lona-10');
const inputHpl = {
  ...baseHpl.input,
  tipoPerfil: 'TIPO 01', aguas: 0, largo: 211, ancho: 130, anchoAtras: 131.5, altoDelante: 40, altoAtras: 40,
  contorno: 162.3, contornoAtras: 163.8,
  recogeDelante: 'PUENTES HIJOS DE PEDRO LOPEZ', recogeAtras: 'PUENTES HIJOS DE PEDRO LOPEZ',
  bastillaEnfundar: false, ventana: false, rotulacion: false,
  modoOllaos: 'REPARTIDOS', pasoOllaos: 35, primerOllao: 2.5,
};
const hpl = { caso: 'lona-hpl-sesgada', tipo: 'lona', input: inputHpl, result: calcLona(inputHpl, DEFAULT_PARAMS) };
assert.equal(hpl.result.panoTrasero.ancho, 172.5, 'HPL: paño trasero 172,5 como en el CAD');
assert.deepEqual(hpl.result.reparto.atras, [2.5, 34.4, 66.3, 98.1, 130], 'HPL: ollaos de detrás del CAD');
const conRadios = casos.find((c) => c.caso === 'lona-05');
assert.ok(conRadios.input.radioCumbrera > 0 && conRadios.input.radioHombro > 0, 'lona-05 es un TIPO 03 con los dos radios');
const PEDIDO_SESGO = 'AR.26.99994'; // no existe en RPS
const CAPTURAS_SESGO = 'tmp/ui-audit/remolques-sesgo';
fs.mkdirSync(CAPTURAS_SESGO, { recursive: true });

const pestanas = (page) => page.locator('.rem-pestana-abrir');
const rpsResponde = async (numero) => {
  try {
    const respuesta = await fetch(`${BASE_URL}/api/remolques/rps-pedido?numero=${numero}`);
    if (!respuesta.ok) return false;
    const { pedido } = await respuesta.json();
    return Boolean(pedido && pedido.lineas.length > 0);
  } catch {
    return false;
  }
};

// ── Parte 1: crear los dos casos, recargar y borrar ──
{
  const { browser, page, errors } = await openApp({ width: 1600, height: 1000 });
  page.setDefaultTimeout(10000);
  try {
    await page.getByRole('button', { name: /^Remolques/ }).click();
    assert.ok(await page.locator('.producto-en-pruebas').isVisible(), 'Remolques lleva la etiqueta «en pruebas»');
    assert.equal(await page.evaluate(() => localStorage.getItem('planteamientos-producto')), 'remolques', 'el producto elegido se recuerda');
    await page.getByLabel('Pedido', { exact: true }).fill(PEDIDO_PRUEBA);
    const cliente = page.locator('.rem-cabecera').getByLabel('Cliente', { exact: true });
    await cliente.fill(CLIENTE_PRUEBA);

    await page.getByRole('button', { name: '+ Remolque' }).click();
    await editor(page).waitFor();
    await teclearCaso(page, lona);
    await comprobarCaso(page, lona, 'al teclear');

    await page.getByRole('button', { name: '+ Baquetón' }).click();
    await teclearCaso(page, baqueton);
    await comprobarCaso(page, baqueton, 'al teclear');
    assert.equal(await pestanas(page).count(), 2, 'hay dos elementos');

    // El borrador se guarda con una pausa de 600 ms (y al cerrar); tras recargar vuelve al
    // escribir el mismo pedido.
    await page.waitForTimeout(900);
    await page.reload();
    await page.getByLabel('Pedido', { exact: true }).waitFor();
    assert.ok(await page.getByRole('button', { name: /^Remolques/ }).getAttribute('aria-pressed') === 'true', 'tras recargar sigue en Remolques');
    await page.getByLabel('Pedido', { exact: true }).fill(PEDIDO_PRUEBA);
    await pestanas(page).first().waitFor();
    assert.equal(await pestanas(page).count(), 2, 'el borrador conserva los dos elementos tras recargar');
    // El cliente vuelve a la cabecera con los borradores (antes solo volvía a los elementos).
    assert.equal(await cliente.inputValue(), CLIENTE_PRUEBA, 'tras recargar la cabecera conserva el cliente');
    await pestanas(page).nth(0).click();
    await comprobarCaso(page, lona, 'tras recargar');
    await pestanas(page).nth(1).click();
    await comprobarCaso(page, baqueton, 'tras recargar');

    // Borrar: «Cancelar» conserva, «Eliminar» quita (el baquetón).
    await page.getByRole('button', { name: /^Eliminar B · .* del pedido/ }).click();
    const dialogo = page.getByRole('alertdialog');
    await dialogo.waitFor();
    await dialogo.getByRole('button', { name: 'Cancelar', exact: true }).click();
    await dialogo.waitFor({ state: 'hidden' });
    assert.equal(await pestanas(page).count(), 2, 'Cancelar conserva el elemento');
    await page.getByRole('button', { name: /^Eliminar B · .* del pedido/ }).click();
    await dialogo.waitFor();
    await dialogo.getByRole('button', { name: 'Eliminar', exact: true }).click();
    await dialogo.waitFor({ state: 'hidden' });
    assert.equal(await pestanas(page).count(), 1, 'Eliminar quita el elemento');
    assert.match(await pestanas(page).first().innerText(), /^A · Remolque 127×104/, 'queda la lona');
    console.log('OK: borrar un elemento pide confirmación (Cancelar conserva, Eliminar quita)');

    assert.deepEqual(errors, [], 'sin errores de consola');
  } finally {
    await browser.close();
  }
}

// ── Parte 1b: ollaos repartidos automáticamente ──
{
  const { browser, page, errors } = await openApp({ width: 1600, height: 1000 });
  page.setDefaultTimeout(10000);
  try {
    await page.getByRole('button', { name: /^Remolques/ }).click();
    await page.getByLabel('Pedido', { exact: true }).fill(PEDIDO_PRUEBA);
    await page.getByRole('button', { name: '+ Remolque' }).click();
    await editor(page).waitFor();
    await teclearCaso(page, lonaRepartida);
    await comprobarCaso(page, lonaRepartida, 'repartidos');
    await page.getByRole('button', { name: '+ Baquetón' }).click();
    await teclearCaso(page, baquetonRepartido);
    await comprobarCaso(page, baquetonRepartido, 'repartidos');
    assert.deepEqual(errors, [], 'sin errores de consola');
  } finally {
    await browser.close();
  }
}

// ── Parte 1c: remolque distinto detrás y radios opcionales, en claro y en oscuro ──
for (const tema of ['claro', 'oscuro']) {
  const { browser, page, errors } = await openApp({ width: 1600, height: 1000 });
  page.setDefaultTimeout(10000);
  try {
    if (tema === 'oscuro') {
      await page.evaluate(() => localStorage.setItem('toldos-tema', 'dark'));
      await page.reload();
      await page.getByRole('button', { name: 'Nuevo pedido', exact: true }).waitFor();
      assert.equal(await page.evaluate(() => document.documentElement.getAttribute('data-theme')), 'dark', 'el tema oscuro está puesto');
    }
    await page.getByRole('button', { name: /^Remolques/ }).click();
    await page.getByLabel('Pedido', { exact: true }).fill(PEDIDO_SESGO);
    await page.getByRole('button', { name: '+ Remolque' }).click();
    const ed = editor(page);
    await ed.waitFor();
    const pulsado = (grupo) => ed.getByRole('group', { name: grupo, exact: true }).locator('[aria-pressed="true"]').innerText();
    // Un elemento nuevo arranca con las dos en No y sin sus medidas a la vista.
    await ed.locator('[data-campo="tipoPerfil"]').waitFor();
    assert.equal(await pulsado('Detrás distinto'), 'No', 'un elemento nuevo arranca con «Detrás distinto» en No');
    assert.equal(await ed.locator('input[data-campo="anchoAtras"]').count(), 0, 'sin «Detrás distinto» no se ve el ancho de detrás');

    await teclearCaso(page, hpl);
    await comprobarCaso(page, hpl, `al teclear (${tema})`);
    const tarjeta = async (nombre) => (await ed.locator('.rem-dato').filter({ has: page.getByText(nombre, { exact: true }) }).locator('strong').innerText()).trim();
    assert.equal(await tarjeta('Paño contorno'), '234,5 × 169,3 del. / 170,8 tras.', 'el paño contorno se corta en trapecio');
    assert.equal(await tarjeta('Paño trasero'), '172,5 × 44,5', 'HPL: paño trasero con el ancho de delante');
    await ed.locator('.rem-editor-izquierda').screenshot({ path: `${CAPTURAS_SESGO}/formulario-detras-si-${tema}.png` });
    await ed.screenshot({ path: `${CAPTURAS_SESGO}/hpl-resultados-${tema}.png` });

    if (tema === 'claro') {
      // Tras recargar, el borrador trae las medidas de detrás y el interruptor arranca en Sí.
      await page.waitForTimeout(900);
      await page.reload();
      await page.getByLabel('Pedido', { exact: true }).fill(PEDIDO_SESGO);
      await pestanas(page).first().waitFor();
      await pestanas(page).first().click();
      assert.equal(await pulsado('Detrás distinto'), 'Sí', 'tras recargar «Detrás distinto» arranca en Sí');
      await comprobarCaso(page, hpl, 'tras recargar');
    }

    // Pasar a No con medidas escritas pregunta: «Mantener» las deja, «Quitar» las borra.
    const dialogo = page.getByRole('alertdialog');
    await siNo(ed, 'Detrás distinto', false);
    await dialogo.waitFor();
    await dialogo.getByRole('button', { name: 'Mantener', exact: true }).click();
    await dialogo.waitFor({ state: 'hidden' });
    assert.equal(await pulsado('Detrás distinto'), 'Sí', '«Mantener» deja «Detrás distinto» en Sí');
    assert.equal(await ed.locator('input[data-campo="anchoAtras"]').inputValue(), '131,5', '«Mantener» conserva el ancho de detrás');
    await siNo(ed, 'Detrás distinto', false);
    await dialogo.waitFor();
    await dialogo.getByRole('button', { name: 'Quitar', exact: true }).click();
    await dialogo.waitFor({ state: 'hidden' });
    assert.equal(await pulsado('Detrás distinto'), 'No', '«Quitar» deja «Detrás distinto» en No');
    for (const campo of ['anchoAtras', 'altoAtras', 'contornoAtras']) {
      assert.equal(await ed.locator(`input[data-campo="${campo}"]`).count(), 0, `«Quitar» esconde ${campo}`);
    }
    assert.equal(await tarjeta('Lona hecha'), '212 × 131', 'sin detrás distinto la lona hecha es igual delante y detrás');
    assert.equal(await tarjeta('Paño contorno'), '234,5 × 169,3', 'sin detrás distinto el paño contorno es un rectángulo');
    // Otra vez en Sí, sin nada escrito: sale vacío y al volver a No no pregunta.
    await siNo(ed, 'Detrás distinto', true);
    assert.equal(await ed.locator('input[data-campo="anchoAtras"]').inputValue(), '', 'en Sí de nuevo, el ancho de detrás sale vacío');
    await siNo(ed, 'Detrás distinto', false);
    assert.equal(await dialogo.count(), 0, 'sin medidas de detrás, pasar a No no pregunta');
    await ed.locator('.rem-editor-izquierda').screenshot({ path: `${CAPTURAS_SESGO}/formulario-detras-no-${tema}.png` });

    // «Con radios»: un TIPO 03 real con radios los enseña; en No pregunta y los borra.
    await page.getByRole('button', { name: '+ Remolque' }).click();
    await teclearCaso(page, conRadios);
    await comprobarCaso(page, conRadios, `con radios (${tema})`);
    assert.equal(await pulsado('Con radios'), 'Sí', '«Con radios» en Sí con los radios escritos');
    await ed.locator('.rem-editor-izquierda').screenshot({ path: `${CAPTURAS_SESGO}/formulario-radios-si-${tema}.png` });
    await siNo(ed, 'Con radios', false);
    await dialogo.waitFor();
    await dialogo.getByRole('button', { name: 'Quitar', exact: true }).click();
    await dialogo.waitFor({ state: 'hidden' });
    assert.equal(await ed.locator('input[data-campo="radioCumbrera"]').count(), 0, '«Quitar» esconde el radio de cumbrera');
    assert.equal(await ed.locator('input[data-campo="radioHombro"]').count(), 0, '«Quitar» esconde el radio de hombro');
    await ed.locator('.rem-editor-izquierda').screenshot({ path: `${CAPTURAS_SESGO}/formulario-radios-no-${tema}.png` });
    assert.deepEqual(errors, [], `sin errores de consola (${tema})`);
    console.log(`OK: remolque distinto detrás y radios opcionales (${tema})`);
  } finally {
    await browser.close();
  }
}

// ── Parte 2: pedido real de remolques de RPS (solo lectura) ──
const hayRps = await rpsResponde(PEDIDO_RPS);
if (!hayRps) {
  console.log(`SALTADO: RPS no responde con ${PEDIDO_RPS} en la aislada; se omite la importación y el aviso de Toldos`);
} else {
  {
    const { browser, page, errors } = await openApp({ width: 1600, height: 1000 });
    page.setDefaultTimeout(10000);
    try {
      await page.getByRole('button', { name: /^Remolques/ }).click();
      await page.getByLabel('Pedido', { exact: true }).fill(PEDIDO_RPS);
      const usar = page.getByRole('button', { name: /^(Usar|Volver a aplicar) línea/ });
      await usar.first().waitFor({ timeout: 15000 });
      const ofrecidas = await usar.count();
      assert.ok(ofrecidas >= 2, `RPS ofrece las líneas de ${PEDIDO_RPS} (${ofrecidas})`);
      await usar.first().click();
      await pestanas(page).first().waitFor();
      assert.equal(await pestanas(page).count(), 1, 'la primera línea crea un elemento');
      assert.notEqual((await page.getByLabel('Cliente', { exact: true }).inputValue()).trim(), '', 'el cliente viene de RPS');
      const ed = editor(page);
      assert.notEqual((await ed.getByLabel('O.F.', { exact: true }).inputValue()).trim(), '', 'la O.F. viene de RPS');
      assert.notEqual(await ed.locator('input[data-campo="largo"]').inputValue(), '', 'el largo viene de RPS');
      await page.getByRole('button', { name: 'Cambiar línea' }).click();
      await page.getByRole('button', { name: 'Usar línea' }).first().click();
      await page.waitForFunction(() => document.querySelectorAll('.rem-pestana-abrir').length === 2);
      console.log(`OK: ${PEDIDO_RPS} de RPS: ${ofrecidas} líneas ofrecidas, dos aplicadas = ${await pestanas(page).count()} elementos`);
      assert.deepEqual(errors, [], 'sin errores de consola');
    } finally {
      await browser.close();
    }
  }

  // ── Parte 3: el aviso en Nuevo pedido de Toldos ──
  {
    const { browser, page, errors } = await openApp({ width: 1600, height: 1000 });
    page.setDefaultTimeout(15000);
    try {
      // Con Remolques ya visitada hay dos «Pedido» (el de toldos y el oculto de remolques).
      const orden = page.locator('.order-header:not(.rem-cabecera)').getByLabel('Pedido', { exact: true });
      await orden.fill(PEDIDO_RPS);
      await page.getByRole('button', { name: 'Obtener datos del pedido', exact: true }).click();
      const aviso = page.locator('.rem-aviso-pedido');
      await aviso.waitFor();
      assert.match(await aviso.innerText(), /Este pedido es de remolques/, 'Toldos avisa de que el pedido es de remolques');
      assert.equal(await page.locator('.order-autofill-summary').count(), 0, 'el pedido de remolques no rellena el formulario de toldos');
      await aviso.getByRole('button', { name: 'Abrir en Remolques', exact: true }).click();
      assert.equal(await page.getByRole('button', { name: /^Remolques/ }).getAttribute('aria-pressed'), 'true', 'el selector pasa a Remolques');
      const pedidoRemolques = page.locator('.rem-cabecera').getByLabel('Pedido', { exact: true });
      await pedidoRemolques.waitFor();
      assert.equal(await pedidoRemolques.inputValue(), PEDIDO_RPS, 'Remolques trae el número del pedido');
      await page.getByRole('button', { name: /^(Usar|Volver a aplicar) línea/ }).first().waitFor({ timeout: 15000 });
      console.log('OK: Toldos avisa «Este pedido es de remolques» y «Abrir en Remolques» carga el pedido con sus líneas');

      // Vuelta a Toldos: el aviso no se arrastra a otro número ni a un pedido inexistente.
      await page.getByRole('button', { name: 'Toldos', exact: true }).click();
      await orden.fill('AR.26.99999');
      assert.equal(await aviso.count(), 0, 'el aviso desaparece al cambiar de pedido');
      await page.getByRole('button', { name: 'Obtener datos del pedido', exact: true }).click();
      await page.waitForTimeout(1500);
      assert.equal(await aviso.count(), 0, 'un pedido inexistente no avisa de remolques (sigue el error de siempre)');
      console.log('OK: sin aviso para un pedido que no existe ni al cambiar de número');
      assert.deepEqual(errors.filter((e) => !/404/.test(e)), [], 'sin errores de consola');
    } finally {
      await browser.close();
    }
  }
}
console.log('test-remolques-2a-e2e OK');
