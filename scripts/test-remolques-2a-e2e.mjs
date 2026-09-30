// Prueba e2e de la pantalla de remolques (fase 2a): elige Remolques, teclea a mano dos casos
// reales de producción (src/remolques/__fixtures__/produccion-2026-09.json) y comprueba en
// pantalla lo mismo que guarda su `result`; recarga y comprueba que el borrador sigue; borra
// un elemento con su confirmación; trae pedidos reales de remolques de RPS (solo lectura): al
// obtenerlos se crea un elemento por línea de una vez y, con elementos en el pedido, pregunta
// (añadir solo las que faltan o sustituir) sin duplicar nunca; y, desde Nuevo pedido de Toldos,
// comprueba el aviso «Este pedido es de remolques» y que «Abrir en Remolques» crea los elementos.
// Capturas del pedido obtenido en claro y oscuro en tmp/ui-audit/remolques-obtener/.
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
// Iván, 30/09/2026: «que en los remolques se inserten los datos como en los toldos». Obtener el
// pedido crea de una vez un elemento por línea de RPS; ya no hay «Usar línea». Con elementos en
// el pedido, «Obtener datos del pedido» pregunta: añadir solo las que faltan o sustituir.
const hayRps = await rpsResponde(PEDIDO_RPS);
if (!hayRps) {
  console.log(`SALTADO: RPS no responde con ${PEDIDO_RPS} en la aislada; se omite la importación y el aviso de Toldos`);
} else {
  const lineasRps = (await (await fetch(`${BASE_URL}/api/remolques/rps-pedido?numero=${PEDIDO_RPS}`)).json()).pedido.lineas;
  assert.equal(lineasRps.length, 3, `${PEDIDO_RPS} trae 3 líneas de lona en RPS`);
  const dialogo = (page) => page.getByRole('alertdialog');
  const obtener = (page) => page.locator('.rem-cabecera').getByRole('button', { name: 'Obtener datos del pedido', exact: true });
  const largoAbierto = async (page) => editor(page).locator('input[data-campo="largo"]').inputValue();
  const ofAbierta = async (page) => (await editor(page).getByLabel('O.F.', { exact: true }).inputValue()).trim();
  const tresPestanas = async (page, mensaje) => {
    await page.waitForFunction(() => document.querySelectorAll('.rem-pestana-abrir').length === 3);
    await page.waitForTimeout(300);
    assert.equal(await pestanas(page).count(), 3, mensaje);
  };
  {
    const { browser, page, errors } = await openApp({ width: 1600, height: 1000 });
    page.setDefaultTimeout(15000);
    try {
      await page.getByRole('button', { name: /^Remolques/ }).click();
      await page.getByLabel('Pedido', { exact: true }).fill(PEDIDO_RPS);
      // Al escribir el pedido completo en un pedido vacío se crean todos, sin pulsar nada más.
      await tresPestanas(page, 'un elemento por cada línea de RPS');
      assert.equal(await page.getByRole('button', { name: /^(Usar|Volver a aplicar) línea|^Cambiar línea$/ }).count(), 0, 'ya no se aplican las líneas una a una');
      assert.equal(await page.locator('.rem-cabecera').getByLabel('Cliente', { exact: true }).inputValue(), 'TALLERES CAL, C. B.', 'el cliente viene de RPS');
      assert.match(await page.locator('.rem-rps-resumen').innerText(), /Sus 3 líneas de remolque están en el pedido/, 'la cabecera dice que están todas');
      for (const [i, linea] of lineasRps.entries()) {
        await pestanas(page).nth(i).click();
        assert.equal(await ofAbierta(page), linea.ordenFabricacion, `${'ABC'[i]}: la O.F. de la línea ${linea.numeroLinea}`);
        assert.equal(await largoAbierto(page), String(linea.largo), `${'ABC'[i]}: el largo de la línea ${linea.numeroLinea}`);
        assert.equal(await editor(page).locator('input[data-campo="ancho"]').inputValue(), String(linea.ancho), `${'ABC'[i]}: el ancho`);
        assert.match(await editor(page).locator('.rem-rps-origen').innerText(), new RegExp(`De RPS · Línea ${linea.numeroLinea}`), `${'ABC'[i]}: dice de qué línea salió`);
        // Lo que RPS no da (el perfil) queda pendiente, como siempre.
        assert.match(await editor(page).locator('.rem-editor-estado').innerText(), /^Falta: /, `${'ABC'[i]}: enseña lo que falta`);
      }
      assert.equal(await pestanas(page).first().getAttribute('aria-current'), null, 'se puede cambiar de elemento');
      console.log(`OK: ${PEDIDO_RPS}: al escribirlo se crean los 3 elementos con su OF, medidas y cliente de RPS`);

      // Volver a obtener lo mismo no duplica ni pregunta: está al día.
      await obtener(page).click();
      await page.getByText('no hay nada nuevo que traer').first().waitFor();
      assert.equal(await dialogo(page).count(), 0, 'al día: no pregunta');
      assert.equal(await pestanas(page).count(), 3, 'volver a obtener no duplica');
      console.log('OK: volver a obtener el mismo pedido no duplica ni pregunta');

      // Con un dato corregido a mano, obtener pregunta y «Cancelar» no toca nada.
      await pestanas(page).nth(0).click();
      await editor(page).locator('input[data-campo="largo"]').fill('251');
      await editor(page).locator('input[data-campo="largo"]').blur();
      await obtener(page).click();
      await dialogo(page).waitFor();
      assert.equal(await dialogo(page).getByRole('button', { name: 'Sustituir por las líneas de RPS', exact: true }).count(), 1, 'ofrece sustituir');
      assert.equal(await dialogo(page).getByRole('button', { name: 'Añadir solo las que faltan', exact: true }).count(), 0, 'sin líneas que falten no ofrece añadir');
      await dialogo(page).getByRole('button', { name: 'Cancelar', exact: true }).click();
      await dialogo(page).waitFor({ state: 'hidden' });
      assert.equal(await pestanas(page).count(), 3, 'Cancelar no quita ni añade');
      assert.equal(await largoAbierto(page), '251', 'Cancelar conserva lo corregido a mano');

      // Sin un elemento, obtener ofrece añadir solo el que falta sin tocar lo corregido.
      await page.getByRole('button', { name: /^Eliminar C · .* del pedido/ }).click();
      await dialogo(page).waitFor();
      await dialogo(page).getByRole('button', { name: 'Eliminar', exact: true }).click();
      await dialogo(page).waitFor({ state: 'hidden' });
      assert.equal(await pestanas(page).count(), 2, 'queda sin el C');
      assert.match(await page.locator('.rem-rps-resumen').innerText(), /1 de 3 líneas sin elemento/, 'la cabecera dice cuál falta');
      await obtener(page).click();
      await dialogo(page).waitFor();
      assert.match(await dialogo(page).innerText(), /Línea 3 · Lona · OF 0231782 .*: no está en el pedido/, 'dice qué línea falta');
      await dialogo(page).getByRole('button', { name: 'Añadir solo las que faltan', exact: true }).click();
      await dialogo(page).waitFor({ state: 'hidden' });
      await tresPestanas(page, 'añadir trae solo la que faltaba');
      assert.equal(await ofAbierta(page), lineasRps[2].ordenFabricacion, 'se abre el añadido');
      await pestanas(page).nth(0).click();
      assert.equal(await largoAbierto(page), '251', 'añadir no toca lo corregido a mano');
      console.log('OK: con elementos en el pedido pregunta; «Añadir solo las que faltan» trae la que falta sin tocar lo demás');

      // «Sustituir» deja los datos de RPS.
      await obtener(page).click();
      await dialogo(page).waitFor();
      await dialogo(page).getByRole('button', { name: 'Sustituir por las líneas de RPS', exact: true }).click();
      await dialogo(page).waitFor({ state: 'hidden' });
      await tresPestanas(page, 'sustituir deja las 3 de RPS');
      await pestanas(page).nth(0).click();
      assert.equal(await largoAbierto(page), String(lineasRps[0].largo), 'sustituir vuelve al largo de RPS');
      console.log('OK: «Sustituir por las líneas de RPS» deja los datos de RPS');

      // Los borradores siguen: tras recargar vuelven los 3, sin crear otros encima.
      await page.waitForTimeout(900);
      await page.reload();
      await page.getByLabel('Pedido', { exact: true }).fill(PEDIDO_RPS);
      await pestanas(page).first().waitFor();
      await page.waitForTimeout(1500);
      assert.equal(await pestanas(page).count(), 3, 'tras recargar, los mismos 3 elementos del borrador');
      console.log('OK: tras recargar el borrador conserva los 3 sin duplicar');
      assert.deepEqual(errors, [], 'sin errores de consola');
    } finally {
      await browser.close();
    }
  }

  // ── Parte 2b: lona y baquetón (AR.26.04414), en claro y en oscuro, con capturas ──
  const PEDIDO_MIXTO = 'AR.26.04414';
  const CAPTURAS_OBTENER = 'tmp/ui-audit/remolques-obtener';
  fs.mkdirSync(CAPTURAS_OBTENER, { recursive: true });
  const respuestaMixto = await (await fetch(`${BASE_URL}/api/remolques/rps-pedido?numero=${PEDIDO_MIXTO}`)).json();
  const lineasMixto = respuestaMixto.pedido?.lineas ?? [];
  if (lineasMixto.length !== 4) {
    console.log(`SALTADO: ${PEDIDO_MIXTO} no trae sus 4 líneas en RPS (${lineasMixto.length})`);
  } else {
    for (const tema of ['claro', 'oscuro']) {
      const { browser, page, errors } = await openApp({ width: 1600, height: 1000 });
      page.setDefaultTimeout(15000);
      try {
        if (tema === 'oscuro') {
          await page.evaluate(() => localStorage.setItem('toldos-tema', 'dark'));
          await page.reload();
          await page.getByRole('button', { name: 'Nuevo pedido', exact: true }).waitFor();
        }
        await page.getByRole('button', { name: /^Remolques/ }).click();
        await page.getByLabel('Pedido', { exact: true }).fill(PEDIDO_MIXTO);
        await page.waitForFunction(() => document.querySelectorAll('.rem-pestana-abrir').length === 4);
        const rotulos = await pestanas(page).allInnerTexts();
        assert.deepEqual(rotulos.map((r) => r.match(/^[A-D] · (Remolque|Baquetón)/)?.[1]),
          lineasMixto.map((l) => (l.tipoTrabajo === 'lona' ? 'Remolque' : 'Baquetón')), `${tema}: lona o baquetón según RPS, en su orden`);
        await pestanas(page).nth(0).click();
        assert.equal(await editor(page).locator('input[data-campo="baqueton"]').inputValue(), String(lineasMixto[0].baqueton), `${tema}: el baquetón de RPS`);
        assert.equal(await editor(page).locator('textarea[data-campo="material"]').inputValue(), lineasMixto[0].materialSugerido, `${tema}: la bobina de RPS`);
        await pestanas(page).nth(1).click();
        assert.equal(await editor(page).locator('input[data-campo="altoDelante"]').inputValue(), String(lineasMixto[1].altoDelante ?? lineasMixto[1].alto), `${tema}: el alto de RPS`);
        await page.waitForTimeout(600);
        await page.screenshot({ path: `${CAPTURAS_OBTENER}/creados-${tema}.png` });
        await page.locator('.rem-cabecera').screenshot({ path: `${CAPTURAS_OBTENER}/cabecera-${tema}.png` });

        // Sin el D, «Obtener» ofrece las tres salidas.
        await page.getByRole('button', { name: /^Eliminar D · .* del pedido/ }).click();
        await dialogo(page).waitFor();
        await dialogo(page).getByRole('button', { name: 'Eliminar', exact: true }).click();
        await dialogo(page).waitFor({ state: 'hidden' });
        await obtener(page).click();
        await dialogo(page).waitFor();
        for (const nombre of ['Cancelar', 'Sustituir por las líneas de RPS', 'Añadir solo las que faltan']) {
          assert.equal(await dialogo(page).getByRole('button', { name: nombre, exact: true }).count(), 1, `${tema}: el diálogo ofrece «${nombre}»`);
        }
        await page.waitForTimeout(300);
        await page.screenshot({ path: `${CAPTURAS_OBTENER}/pregunta-${tema}.png` });
        await dialogo(page).getByRole('button', { name: 'Añadir solo las que faltan', exact: true }).click();
        await dialogo(page).waitFor({ state: 'hidden' });
        await page.waitForFunction(() => document.querySelectorAll('.rem-pestana-abrir').length === 4);
        assert.match((await pestanas(page).allInnerTexts())[3], /^D · Baquetón/, `${tema}: vuelve el baquetón que faltaba`);
        assert.deepEqual(errors, [], `sin errores de consola (${tema})`);
        console.log(`OK: ${PEDIDO_MIXTO} (${tema}): 4 elementos lona y baquetón de una vez; capturas en ${CAPTURAS_OBTENER}`);
      } finally {
        await browser.close();
      }
    }
  }

  // ── Parte 3: el aviso en Nuevo pedido de Toldos ──
  {
    const { browser, page, errors } = await openApp({ width: 1600, height: 1000 });
    page.setDefaultTimeout(15000);
    try {
      // Con Remolques ya visitada hay dos «Pedido» (el de toldos y el oculto de remolques).
      const orden = page.locator('.order-header:not(.rem-cabecera)').getByLabel('Pedido', { exact: true });
      const obtenerToldos = page.locator('.order-header:not(.rem-cabecera)').getByRole('button', { name: 'Obtener datos del pedido', exact: true });
      await orden.fill(PEDIDO_RPS);
      await obtenerToldos.click();
      const aviso = page.locator('.rem-aviso-pedido');
      await aviso.waitFor();
      assert.match(await aviso.innerText(), /Este pedido es de remolques/, 'Toldos avisa de que el pedido es de remolques');
      assert.equal(await page.locator('.order-autofill-summary').count(), 0, 'el pedido de remolques no rellena el formulario de toldos');
      await aviso.getByRole('button', { name: 'Abrir en Remolques', exact: true }).click();
      assert.equal(await page.getByRole('button', { name: /^Remolques/ }).getAttribute('aria-pressed'), 'true', 'el selector pasa a Remolques');
      const pedidoRemolques = page.locator('.rem-cabecera').getByLabel('Pedido', { exact: true });
      await pedidoRemolques.waitFor();
      assert.equal(await pedidoRemolques.inputValue(), PEDIDO_RPS, 'Remolques trae el número del pedido');
      await tresPestanas(page, '«Abrir en Remolques» crea los 3 elementos');
      assert.equal(await ofAbierta(page), lineasRps[0].ordenFabricacion, 'abre el primero, con su OF');
      console.log('OK: Toldos avisa «Este pedido es de remolques» y «Abrir en Remolques» crea los elementos del pedido');

      // Abrirlo otra vez desde Toldos no duplica: ya está al día.
      await page.getByRole('button', { name: 'Toldos', exact: true }).click();
      await obtenerToldos.click();
      await aviso.waitFor();
      await aviso.getByRole('button', { name: 'Abrir en Remolques', exact: true }).click();
      await page.getByText('no hay nada nuevo que traer').first().waitFor();
      assert.equal(await pestanas(page).count(), 3, 'abrirlo otra vez no duplica');
      console.log('OK: abrirlo otra vez desde Toldos no duplica los elementos');

      // Vuelta a Toldos: el aviso no se arrastra a otro número ni a un pedido inexistente.
      await page.getByRole('button', { name: 'Toldos', exact: true }).click();
      await orden.fill('AR.26.99999');
      assert.equal(await aviso.count(), 0, 'el aviso desaparece al cambiar de pedido');
      await obtenerToldos.click();
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
