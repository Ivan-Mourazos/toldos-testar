// Prueba e2e de la pantalla de remolques (fase 2a): elige Remolques, teclea a mano dos casos
// reales de producción (src/remolques/__fixtures__/produccion-2026-09.json) y comprueba en
// pantalla lo mismo que guarda su `result`; recarga y comprueba que el borrador sigue; borra
// un elemento con su confirmación; trae un pedido real de remolques de RPS (solo lectura) y,
// desde Nuevo pedido de Toldos, comprueba el aviso «Este pedido es de remolques» con su botón
// «Abrir en Remolques».
//   · lona-24: TIPO 05 (radio de esquina 8), ventana 50×35, rotulación y ollaos «según se indica».
//   · baqueton-28: cliente AYALA, baquetón 28, ollaos «según se indica».
// Si RPS no responde en la instancia aislada, esa parte se anota (SALTADO) y se sigue.
// Ejecutar con la aislada en marcha: node scripts/test-remolques-2a-e2e.mjs
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { BASE_URL, openApp } from '../.claude/skills/running-toldos-testar/drive.mjs';

const casos = JSON.parse(fs.readFileSync('src/remolques/__fixtures__/produccion-2026-09.json', 'utf8'));
const lona = casos.find((c) => c.caso === 'lona-24');
const baqueton = casos.find((c) => c.caso === 'baqueton-28');
assert.ok(lona && baqueton, 'los casos lona-24 y baqueton-28 existen en la fixture');

const PEDIDO_PRUEBA = 'AR.26.99999'; // no existe en RPS: no trae nada y los borradores cuelgan de él
const PEDIDO_RPS = 'AR.26.04286'; // pedido real de remolques (3 líneas de lona), solo lectura

const fmt = (n) => n.toLocaleString('es-ES', { maximumFractionDigits: 2 });
const norm = (t) => t.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
const CLAVES_OLLAOS = [['LATERALES ·', 'laterales'], ['ATRÁS ·', 'atras'], ['DELANTE ·', 'delante']];

// Lo que la pantalla debe enseñar de cada caso, con el formato de la web (coma decimal).
function esperado(c) {
  const r = c.result;
  if (c.tipo === 'lona') {
    return {
      'Lona hecha': r.lonaHecha.anchoAtras != null && r.lonaHecha.anchoAtras !== r.lonaHecha.ancho
        ? `${fmt(r.lonaHecha.largo)} × ${fmt(r.lonaHecha.ancho)} del. / ${fmt(r.lonaHecha.anchoAtras)} tras.`
        : `${fmt(r.lonaHecha.largo)} × ${fmt(r.lonaHecha.ancho)}`,
      [`Contorno corte (+${fmt(r.ajusteContorno)})`]: r.contornoAjustado ? fmt(r.contornoAjustado) : '—',
      'Paño delantero': `${fmt(r.panoDelantero.ancho)} × ${fmt(r.panoDelantero.alto)}`,
      'Paño trasero': `${fmt(r.panoTrasero.ancho)} × ${fmt(r.panoTrasero.alto)}`,
      'Paño contorno': r.panoContorno ? `${fmt(r.panoContorno.ancho)} × ${fmt(r.panoContorno.alto)}` : '—',
      'Recoge delante': r.recogeDelanteTexto,
      'Recoge atrás': r.recogeAtrasTexto,
      'Metros de tela': `${fmt(r.metrosTela)} m`,
    };
  }
  return {
    'Paño único': `${fmt(r.panoUnico.largo)} × ${fmt(r.panoUnico.ancho)}`,
    'Remolque hecho': `${fmt(r.remolqueHecho.largo)} × ${fmt(r.remolqueHecho.ancho)}`,
    'Baquetón + costura': fmt(r.baquetonCostura),
    'Esquinas del./tras.': `${fmt(r.esquinaDelante)} / ${fmt(r.esquinaDetras)}`,
    'Delante': r.baquetonDelantero != null ? `${fmt(r.baquetonDelantero)} · NO EN LÍNEA` : 'EN LÍNEA',
    'Detrás': r.baquetonTrasero != null ? `${fmt(r.baquetonTrasero)} · NO EN LÍNEA` : 'EN LÍNEA',
    'Superficie': `${fmt(r.superficieM2)} m²/ud`,
    'Metros de tela': `${fmt(r.metrosTela)} m`,
  };
}

// RemolquesView sigue montada (oculta) tras la primera visita: todo se busca dentro de su editor.
const editor = (page) => page.locator('section.rem-editor');

async function elegir(page, ed, campo, textoOpcion) {
  await ed.locator(`[data-campo="${campo}"]`).click();
  const menu = page.locator('.select-options-portal');
  await menu.waitFor();
  const opciones = await menu.locator('[role=option]').allInnerTexts();
  const i = opciones.findIndex((t) => norm(t) === norm(textoOpcion) || norm(t).startsWith(`${norm(textoOpcion)} `));
  assert.ok(i >= 0, `hay opción «${textoOpcion}» en ${campo}: ${opciones.join(' | ')}`);
  await menu.locator('[role=option]').nth(i).click();
}
const num = async (ed, campo, v) => { if (v) await ed.locator(`input[data-campo="${campo}"]`).fill(String(v)); };
const siNo = (ed, nombre, v) =>
  ed.getByRole('group', { name: nombre, exact: true }).getByRole('button', { name: v ? 'Sí' : 'No', exact: true }).click();
const filaOllaos = (page, ed, nombre) =>
  ed.locator('.rem-ollaos-fila').filter({ has: page.locator(`[aria-label^="${nombre}"]`) });

async function teclearCaso(page, c) {
  const ed = editor(page);
  const i = c.input;
  if (c.tipo === 'lona') {
    await elegir(page, ed, 'tipoPerfil', i.tipoPerfil);
    await elegir(page, ed, 'recogeDelante', i.recogeDelante);
    await elegir(page, ed, 'recogeAtras', i.recogeAtras);
    await siNo(ed, 'Bastilla enfundar', i.bastillaEnfundar);
    for (const k of ['cantidad', 'largo', 'ancho', 'anchoAtras', 'altoDelante', 'altoAtras', 'aguas', 'radioCumbrera', 'radioHombro', 'chaflan', 'radioChaflanAbajo', 'radioChaflanArriba', 'radioEsquina']) await num(ed, k, i[k]);
    await num(ed, 'contorno', i.contorno);
    await siNo(ed, 'Ventana', i.ventana);
    if (i.ventana) { await num(ed, 'ventanaAncho', i.ventanaAncho); await num(ed, 'ventanaAlto', i.ventanaAlto); }
    await siNo(ed, 'Rotulación', i.rotulacion);
  } else {
    for (const k of ['cantidad', 'largo', 'ancho', 'baqueton']) await num(ed, k, i[k]);
    for (const k of ['baquetonDelante', 'baquetonDetras']) {
      if (i[k] === undefined) continue;
      await elegir(page, ed, `${k}Modo`, i[k] === null ? 'En línea con lateral' : 'Medida diferente');
      if (i[k] !== null) await num(ed, k, i[k]);
    }
    await elegir(page, ed, 'clienteEspecifico', i.clienteEspecifico);
    await siNo(ed, 'Rotulación', i.rotulacion);
  }
  await ed.locator('input[data-campo="material"]').fill(i.material);
  await page.keyboard.press('Escape');
  await elegir(page, ed, 'modoOllaos', 'A medida');
  for (const [nombre, clave] of CLAVES_OLLAOS) {
    const fila = filaOllaos(page, ed, nombre);
    for (let n = 0; n < i.ollaosManuales[clave].length; n++) await fila.locator('input').nth(n).fill(String(i.ollaosManuales[clave][n]));
  }
  await page.waitForTimeout(300);
}

// Compara lo que hay en pantalla con el `result` del caso: tarjetas (lona hecha, contorno de
// corte, paños…), posiciones de ollaos, notas, dibujo y estado «Listo.».
async function comprobarCaso(page, c, etapa) {
  const ed = editor(page);
  assert.match((await ed.locator('.rem-editor-estado').innerText()).trim(), /^Listo\./, `${c.caso} ${etapa}: el elemento está listo`);
  const tarjetas = {};
  for (const d of await ed.locator('.rem-dato').all()) tarjetas[(await d.locator('span').textContent()).trim()] = (await d.locator('strong').innerText()).trim();
  assert.deepEqual(tarjetas, esperado(c), `${c.caso} ${etapa}: tarjetas de resultados`);
  const reparto = {};
  for (const [nombre, clave] of CLAVES_OLLAOS) {
    const valores = await filaOllaos(page, ed, nombre).locator('input').evaluateAll((els) => els.map((e) => e.value));
    reparto[clave] = valores.filter((v) => v !== '').map((v) => Number(v.replace(',', '.')));
  }
  assert.deepEqual(reparto, c.result.reparto, `${c.caso} ${etapa}: posiciones de ollaos`);
  assert.deepEqual(await ed.locator('.rem-notas li').allInnerTexts(), c.result.notas, `${c.caso} ${etapa}: notas`);
  assert.ok(await page.locator('.rem-dibujo svg').first().isVisible(), `${c.caso} ${etapa}: el dibujo se ve`);
  console.log(`OK: ${c.caso} ${etapa}: ${Object.keys(tarjetas).length} tarjetas, ollaos ${JSON.stringify(reparto)}, notas ${c.result.notas.length}`);
}

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
