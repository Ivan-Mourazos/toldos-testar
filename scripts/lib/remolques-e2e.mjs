// Ayudas compartidas de las pruebas e2e de remolques (2a y 2b): teclear un caso real de
// producción en la pantalla y comprobar que lo que se ve es lo que guarda su `result`.
import assert from 'node:assert/strict';

export const fmt = (n) => n.toLocaleString('es-ES', { maximumFractionDigits: 2 });
export const norm = (t) => t.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
// Lo que el desplegable «Tipo» enseña de cada perfil: solo el nombre, sin «TIPO 0X» (Iván,
// 30/09/2026). Escrito a mano a propósito: si la pantalla cambiara los nombres, la e2e lo dice.
export const NOMBRE_PERFIL = {
  'TIPO 01': 'Recto',
  'TIPO 02': 'Recto con aguas',
  'TIPO 03': 'Arquillado con aguas',
  'TIPO 04': 'Con chaflán',
  'TIPO 05': 'Arquillado',
};
export const CLAVES_OLLAOS = [['LATERALES ·', 'laterales'], ['ATRÁS ·', 'atras'], ['DELANTE ·', 'delante']];

// Con el remolque distinto detrás el contorno lleva una medida en cada punta (el paño se corta
// en trapecio): «169,3 del. / 170,8 tras.», o una raya detrás si aún no se ha puesto.
const puntasContorno = (r) =>
  `${fmt(r.contornoAjustado)} del. / ${r.contornoAtrasAjustado ? fmt(r.contornoAtrasAjustado) : '—'} tras.`;

// Lo que la pantalla debe enseñar de cada caso, con el formato de la web (coma decimal).
export function esperado(c) {
  const r = c.result;
  if (c.tipo === 'lona' && r.contornoAtrasAjustado !== undefined) {
    return {
      ...esperado({ ...c, result: { ...r, contornoAtrasAjustado: undefined } }),
      [`Contorno corte (+${fmt(r.ajusteContorno)})`]: r.contornoAjustado ? puntasContorno(r) : '—',
      'Paño contorno': r.panoContorno ? `${fmt(r.panoContorno.ancho)} × ${puntasContorno(r)}` : '—',
    };
  }
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
    'Lona hecha': `${fmt(r.remolqueHecho.largo)} × ${fmt(r.remolqueHecho.ancho)}`,
    'Baquetón + costura': fmt(r.baquetonCostura),
    'Esquinas del./tras.': `${fmt(r.esquinaDelante)} / ${fmt(r.esquinaDetras)}`,
    'Delante': r.baquetonDelantero != null ? `${fmt(r.baquetonDelantero)} · NO EN LÍNEA` : 'EN LÍNEA',
    'Detrás': r.baquetonTrasero != null ? `${fmt(r.baquetonTrasero)} · NO EN LÍNEA` : 'EN LÍNEA',
    'Superficie': `${fmt(r.superficieM2)} m²/ud`,
    'Metros de tela': `${fmt(r.metrosTela)} m`,
  };
}

// RemolquesView sigue montada (oculta) tras la primera visita: todo se busca dentro de su editor.
export const editor = (page) => page.locator('section.rem-editor');

export async function elegir(page, ed, campo, textoOpcion) {
  await ed.locator(`[data-campo="${campo}"]`).click();
  const menu = page.locator('.select-options-portal');
  await menu.waitFor();
  const opciones = await menu.locator('[role=option]').allInnerTexts();
  // Primero el nombre exacto: «Recto» no puede quedarse con «Recto con aguas».
  const exacta = opciones.findIndex((t) => norm(t) === norm(textoOpcion));
  const i = exacta >= 0 ? exacta : opciones.findIndex((t) => norm(t).startsWith(`${norm(textoOpcion)} `));
  assert.ok(i >= 0, `hay opción «${textoOpcion}» en ${campo}: ${opciones.join(' | ')}`);
  await menu.locator('[role=option]').nth(i).click();
}
export const num = async (ed, campo, v) => { if (v) await ed.locator(`input[data-campo="${campo}"]`).fill(String(v)); };
export const siNo = (ed, nombre, v) =>
  ed.getByRole('group', { name: nombre, exact: true }).getByRole('button', { name: v ? 'Sí' : 'No', exact: true }).click();
export const filaOllaos = (page, ed, nombre) =>
  ed.locator('.rem-ollaos-fila').filter({ has: page.locator(`[aria-label^="${nombre}"]`) });

// Las medidas que el formulario esconde tras un Sí / No: los radios opcionales de cada perfil y
// las de detrás (solo si el remolque es distinto detrás; iguales que delante no cambian nada).
const RADIOS_OPCIONALES = { 'TIPO 03': ['radioCumbrera', 'radioHombro'], 'TIPO 04': ['radioChaflanAbajo', 'radioChaflanArriba'] };
const detrasDistinto = (i) => ((i.anchoAtras ?? 0) > 0 && i.anchoAtras !== i.ancho)
  || (i.altoAtras > 0 && i.altoAtras !== i.altoDelante) || (i.contornoAtras ?? 0) > 0;

export async function teclearCaso(page, c) {
  const ed = editor(page);
  const i = c.input;
  if (c.tipo === 'lona') {
    await elegir(page, ed, 'tipoPerfil', NOMBRE_PERFIL[i.tipoPerfil]);
    await elegir(page, ed, 'recogeDelante', i.recogeDelante);
    await elegir(page, ed, 'recogeAtras', i.recogeAtras);
    await siNo(ed, 'Bastilla enfundar', i.bastillaEnfundar);
    for (const k of ['cantidad', 'largo', 'ancho', 'altoDelante', 'aguas', 'chaflan', 'radioEsquina']) await num(ed, k, i[k]);
    const radios = (RADIOS_OPCIONALES[i.tipoPerfil] ?? []).filter((k) => i[k] > 0);
    if (radios.length > 0) {
      await siNo(ed, 'Con radios', true);
      for (const k of radios) await num(ed, k, i[k]);
    }
    await num(ed, 'contorno', i.contorno);
    if (detrasDistinto(i)) {
      await siNo(ed, 'Detrás distinto', true);
      for (const k of ['anchoAtras', 'altoAtras', 'contornoAtras']) await num(ed, k, i[k]);
    }
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
  await ed.locator('textarea[data-campo="material"]').fill(i.material);
  await page.keyboard.press('Escape');
  if (i.modoOllaos === 'REPARTIDOS') {
    await elegir(page, ed, 'modoOllaos', 'Repartidos automáticamente');
    await num(ed, 'pasoOllaos', i.pasoOllaos);
    await ed.locator('input[data-campo="primerOllao"]').fill(String(i.primerOllao));
  } else {
    await elegir(page, ed, 'modoOllaos', 'A medida');
    for (const [nombre, clave] of CLAVES_OLLAOS) {
      const fila = filaOllaos(page, ed, nombre);
      for (let n = 0; n < i.ollaosManuales[clave].length; n++) await fila.locator('input').nth(n).fill(String(i.ollaosManuales[clave][n]));
    }
  }
  await page.waitForTimeout(300);
}

// Compara lo que hay en pantalla con el `result` del caso: tarjetas (lona hecha, contorno de
// corte, paños…), posiciones de ollaos, notas, dibujo y estado «Listo.».
export async function comprobarCaso(page, c, etapa) {
  const ed = editor(page);
  assert.match((await ed.locator('.rem-editor-estado').innerText()).trim(), /^Listo\./, `${c.caso} ${etapa}: el elemento está listo`);
  const tarjetas = {};
  for (const d of await ed.locator('.rem-dato').all()) tarjetas[(await d.locator('span').textContent()).trim()] = (await d.locator('strong').innerText()).trim();
  assert.deepEqual(tarjetas, esperado(c), `${c.caso} ${etapa}: tarjetas de resultados`);
  const reparto = {};
  if (c.input.modoOllaos === 'REPARTIDOS') {
    // La tabla del reparto automático: tres filas (laterales, atrás, delante), 12 huecos y el total.
    const filas = await ed.locator('.rem-tabla tbody tr').all();
    assert.equal(filas.length, 3, `${c.caso} ${etapa}: la tabla tiene tres filas`);
    for (const [n, [, clave]] of CLAVES_OLLAOS.entries()) {
      const celdas = await filas[n].locator('td').allInnerTexts();
      const total = Number(celdas.pop());
      reparto[clave] = celdas.filter((t) => t !== '–').map((t) => Number(t.replace(',', '.')));
      assert.equal(total, reparto[clave].length, `${c.caso} ${etapa}: el total de ${clave} coincide con sus posiciones`);
    }
    assert.equal((await ed.locator('.rem-pie-ollaos').innerText()).trim(),
      `Primer y último ollao a ${fmt(c.input.primerOllao)} cm del borde.`, `${c.caso} ${etapa}: pie del reparto`);
  } else {
    for (const [nombre, clave] of CLAVES_OLLAOS) {
      const valores = await filaOllaos(page, ed, nombre).locator('input').evaluateAll((els) => els.map((e) => e.value));
      reparto[clave] = valores.filter((v) => v !== '').map((v) => Number(v.replace(',', '.')));
    }
  }
  assert.deepEqual(reparto, c.result.reparto, `${c.caso} ${etapa}: posiciones de ollaos`);
  assert.deepEqual(await ed.locator('.rem-notas li').allInnerTexts(), c.result.notas, `${c.caso} ${etapa}: notas`);
  // Con el 3D el dibujo llega tras descargar el trozo de three.js (en la primera visita, más de 300 ms): se espera.
  await page.locator('.rem-dibujo').locator('canvas, svg').first().waitFor({ state: 'visible', timeout: 15000 })
    .catch(() => assert.fail(`${c.caso} ${etapa}: el dibujo se ve`));
  console.log(`OK: ${c.caso} ${etapa}: ${Object.keys(tarjetas).length} tarjetas, ollaos ${JSON.stringify(reparto)}, notas ${c.result.notas.length}`);
}
