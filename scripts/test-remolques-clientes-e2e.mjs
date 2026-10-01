// Prueba e2e de las fichas de cliente de remolques (fase 3, diseño 01/10/2026): las fichas de partida
// salen de los parámetros y los generales se quedan con GENERAL; la hoja Parámetros › Remolques ›
// Clientes (crear una ficha y guardarla con quién y motivo); obtener un pedido real de RPS de un
// cliente con ficha (rellena y marca «del cliente», cambiar quita la marca); guardar una medida con
// sus ollaos con «Guardar en la ficha del cliente» y volver a obtenerlo (ollaos a medida); y la
// sugerencia por nombre («Añadir el código y aplicar»). Si RPS no responde, esa parte se anota
// (SALTADO) y se sigue.
// Va en su propia aislada, porque borra y cambia las fichas de su carpeta:
//   ISOLATED_DIR="$PWD/tmp/clientes" PORT=4313 FAKE_COORDINA_PORT=4323 bash .claude/skills/running-toldos-testar/start-isolated.sh
//   TOLDOS_ISOLATED_URL=http://127.0.0.1:4313 node scripts/test-remolques-clientes-e2e.mjs
// Capturas en tmp/ui-audit/remolques-clientes/ (claro y oscuro, 1280×720 y 1600×1000).
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { BASE_URL, openApp } from '../.claude/skills/running-toldos-testar/drive.mjs';
import { DEFAULT_PARAMS } from '../src/remolques/calc/params.ts';
import { CLAVES_OLLAOS, editor, elegir, filaOllaos } from './lib/remolques-e2e.mjs';

const FICHERO = path.resolve('tmp/clientes/remolques-clientes.json');
const SALIDA = 'tmp/ui-audit/remolques-clientes';
const PEDIDO_RPS = 'AR.26.04286'; // pedido real de remolques (3 líneas de lona), solo lectura
fs.mkdirSync(SALIDA, { recursive: true });
assert.equal(new URL(BASE_URL).port, '4313', 'esta prueba va en su aislada de 4313: borra y cambia las fichas');

const enviar = (method, datos) => ({ method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(datos ?? {}) });
async function api(ruta, init) {
  const r = await fetch(`${BASE_URL}${ruta}`, init);
  return { status: r.status, datos: await r.json().catch(() => null) };
}
async function guardarFichas(cambiar, reason) {
  const { datos } = await api('/api/remolques/clientes');
  const r = await api('/api/remolques/clientes', enviar('PUT', { baseVersion: datos.version, fichas: cambiar(datos.fichas), updatedBy: 'IVÁN', reason }));
  assert.equal(r.status, 200, `guardar fichas: ${JSON.stringify(r.datos)}`);
  return r.datos;
}
async function capturas(page, nombre) {
  for (const [width, height] of [[1280, 720], [1600, 1000]]) {
    await page.setViewportSize({ width, height });
    for (const tema of ['light', 'dark']) {
      await page.evaluate((t) => { document.documentElement.dataset.theme = t; }, tema);
      await page.screenshot({ path: `${SALIDA}/${nombre}-${width}-${tema === 'light' ? 'claro' : 'oscuro'}.png` });
    }
  }
  await page.evaluate(() => { document.documentElement.dataset.theme = 'light'; });
  await page.setViewportSize({ width: 1600, height: 1000 });
}

// ── 1. Paso de lo que hay: sin fichero, la primera lectura crea las fichas de partida ──
for (const f of [FICHERO, FICHERO.replace(/\.json$/, '-history.jsonl')]) fs.rmSync(f, { force: true });
const inicio = (await api('/api/remolques/clientes')).datos;
assert.deepEqual(inicio.fichas.map((f) => f.nombre), ['HIJOS DE PEDRO LOPEZ', 'AYALA', 'GENERAL WOLDER']);
assert.deepEqual(inicio.fichas[0].codigosRps, ['001300']);
assert.equal(inicio.fichas[0].recogidaPropia.nombre, 'PUENTES HIJOS DE PEDRO LOPEZ');
assert.ok(fs.existsSync(FICHERO), 'las fichas de partida se guardan en tmp/clientes');
const generales = (await api('/api/remolques/parametros?detalle=1')).datos.parameters;
assert.deepEqual(generales.clientesBaqueton.map((c) => c.nombre), ['GENERAL']);
assert.ok(!generales.recogidas.some((r) => r.nombre === 'PUENTES HIJOS DE PEDRO LOPEZ'));
const efectivos = (await api('/api/remolques/parametros')).datos;
assert.deepEqual(efectivos.clientesBaqueton, DEFAULT_PARAMS.clientesBaqueton, 'con las fichas de partida, se calcula como antes');
assert.deepEqual(efectivos.recogidas, DEFAULT_PARAMS.recogidas);
console.log('OK: fichas de partida y parámetros generales sin clientes');

const app = await openApp({ width: 1600, height: 1000 });
const { page } = app;
page.setDefaultTimeout(20000);
const inesperadas = [];
page.on('response', (r) => {
  const { pathname } = new URL(r.url());
  if (!pathname.startsWith('/api/') || r.status() < 400) return;
  if (/^\/api\/(remolques\/(rps-pedido|materiales)|coordina)/.test(pathname)) return;
  inesperadas.push(`${r.status()} ${r.request().method()} ${pathname}`);
});
const dialogo = () => page.getByRole('alertdialog');

try {
  // ── 2. Parámetros › Remolques › Clientes ──
  await page.getByRole('button', { name: 'Parámetros', exact: true }).click();
  await page.locator('[data-model="REMOLQUES-CLIENTES"]').click();
  const lista = page.getByRole('navigation', { name: 'Fichas de cliente' });
  for (const nombre of ['HIJOS DE PEDRO LOPEZ', 'AYALA', 'GENERAL WOLDER']) await lista.getByRole('button', { name: new RegExp(`^${nombre}`) }).waitFor();
  await page.locator('[aria-label="Ficha de HIJOS DE PEDRO LOPEZ"]').waitFor();
  await capturas(page, 'clientes-hpl');
  await lista.getByRole('button', { name: 'Añadir ficha' }).click();
  const nueva = page.locator('section.clientes-remolques-ficha');
  await nueva.getByLabel('Nombre', { exact: true }).fill('PRUEBA PANTALLA');
  await nueva.getByLabel('Códigos de RPS').fill('999991');
  await nueva.getByLabel('Códigos de RPS').blur();
  await page.getByRole('button', { name: 'Guardar para todos' }).click();
  const guardar = page.getByRole('dialog');
  await guardar.getByRole('combobox', { name: 'Quién hace el cambio' }).click();
  await page.getByRole('option', { name: /^Iv[aá]n$/i }).first().click();
  await guardar.getByLabel('Motivo').fill('Prueba e2e');
  await guardar.getByRole('button', { name: 'Guardar para todos' }).click();
  await page.getByText('Parámetros guardados').first().waitFor();
  const trasPantalla = (await api('/api/remolques/clientes')).datos;
  assert.ok(trasPantalla.fichas.some((f) => f.nombre === 'PRUEBA PANTALLA' && f.codigosRps.includes('999991')), 'la ficha nueva se guarda');
  assert.equal(trasPantalla.updatedBy, 'IVÁN');
  console.log('OK: la hoja Clientes lista, crea y guarda fichas con quién y motivo');

  // ── 3. Obtener un pedido de un cliente con ficha ──
  const rps = await api(`/api/remolques/rps-pedido?numero=${PEDIDO_RPS}`);
  const pedido = rps.status === 200 ? rps.datos.pedido : null;
  if (!pedido?.cliente?.codigo || !pedido.lineas.length) {
    console.log('SALTADO: RPS no responde en la aislada; sin «Obtener datos», el botón ni la sugerencia');
  } else {
    const { codigo, nombre, alias } = pedido.cliente;
    const propia = (await api('/api/remolques/clientes')).datos.fichas.find((f) => f.codigosRps.includes(codigo));
    const id = propia?.id ?? 'prueba-e2e';
    const nombreFicha = propia?.nombre ?? `PRUEBA ${codigo}`;
    await guardarFichas((fichas) => {
      const base = propia ?? { id, nombre: nombreFicha, codigosRps: [codigo] };
      const ficha = { ...base, perfil: { tipoPerfil: 'TIPO 02', aguas: 20 }, recogeDelante: 'GOMA', recogeAtras: 'GOMA', observaciones: ['OBSERVACIÓN FIJA DE PRUEBA'], medidas: [] };
      return propia ? fichas.map((f) => (f.id === id ? ficha : f)) : [...fichas, ficha];
    }, 'Prueba e2e: ficha del pedido');

    const obtener = async () => {
      await page.getByRole('button', { name: 'Nuevo pedido', exact: true }).click();
      await page.getByRole('button', { name: /^Remolques/ }).click();
      if (await page.locator('.rem-pestana').count()) {
        await page.getByRole('button', { name: 'Limpiar', exact: true }).click();
        await dialogo().getByRole('button', { name: 'Limpiar formulario' }).click();
      }
      await page.getByLabel('Pedido', { exact: true }).fill(PEDIDO_RPS);
      await page.locator('.rem-cabecera').getByRole('button', { name: 'Obtener datos del pedido', exact: true }).click();
    };
    await obtener();
    await editor(page).waitFor();
    const ed = editor(page);
    await ed.locator('.rem-del-cliente').first().waitFor();
    assert.ok(await ed.locator('.rem-del-cliente').count() >= 4, 'perfil, recogidas y observaciones llevan «del cliente»');
    await ed.locator('.rem-nota-ficha', { hasText: nombreFicha }).waitFor();
    await capturas(page, 'obtener-con-ficha');
    const antes = await ed.locator('.rem-del-cliente').count();
    await elegir(page, ed, 'recogeDelante', 'No');
    assert.equal(await ed.locator('.rem-del-cliente').count(), antes - 1, 'cambiar un campo le quita la marca');
    console.log('OK: obtener el pedido aplica la ficha con la marca «del cliente»');

    // ── 4. «Guardar en la ficha del cliente» con la medida y sus ollaos ──
    await elegir(page, ed, 'modoOllaos', 'A medida');
    const linea = pedido.lineas[0];
    const posiciones = { laterales: [2.5, Math.round(linea.largo / 2), linea.largo - 1.5], atras: [2.5, Math.round(linea.ancho / 2), linea.ancho - 1.5], delante: [2.5, Math.round(linea.ancho / 2), linea.ancho - 1.5] };
    for (const [rotulo, clave] of CLAVES_OLLAOS) {
      const fila = filaOllaos(page, ed, rotulo);
      for (let n = 0; n < 3; n++) await fila.locator('input').nth(n).fill(String(posiciones[clave][n]).replace('.', ','));
    }
    await ed.getByRole('button', { name: 'Guardar en la ficha del cliente' }).click();
    const ventana = page.getByRole('dialog', { name: new RegExp(`ficha de ${nombreFicha}`) });
    await ventana.waitFor();
    const casillaMedida = ventana.getByRole('checkbox', { name: /^Medida/ });
    assert.ok(await casillaMedida.isChecked(), 'la medida con sus ollaos sale marcada');
    await capturas(page, 'ventana');
    await ventana.getByRole('button', { name: 'Guardar en la ficha' }).click();
    await page.getByText(`Guardado en la ficha de ${nombreFicha}.`).waitFor();
    const conMedida = (await api('/api/remolques/clientes')).datos;
    const medida = conMedida.fichas.find((f) => f.id === id).medidas.find((m) => m.largo === linea.largo && m.ancho === linea.ancho);
    assert.deepEqual(medida?.ollaos, posiciones, 'la ficha guarda la medida con sus ollaos tal cual');
    assert.equal(conMedida.reason, `Desde el pedido ${PEDIDO_RPS}`);
    await obtener();
    await editor(page).waitFor();
    const valores = await filaOllaos(page, editor(page), 'DELANTE ·').locator('input').evaluateAll((els) => els.map((e) => e.value).filter(Boolean));
    assert.deepEqual(valores.map((v) => Number(v.replace(',', '.'))), posiciones.delante, 'al volver a obtenerlo, los ollaos salen a medida con sus posiciones');
    console.log('OK: «Guardar en la ficha del cliente» y volver a obtener el pedido');

    // ── 5. Sugerencia por nombre ──
    const parecido = (alias || nombre).trim();
    await guardarFichas((fichas) => fichas.map((f) => (f.id === id ? { ...f, nombre: parecido, codigosRps: f.codigosRps.filter((c) => c !== codigo) } : f)), 'Prueba e2e: sin código');
    await obtener();
    await dialogo().getByText(`¿Es de la ficha ${parecido}?`).waitFor();
    await capturas(page, 'sugerencia');
    await dialogo().getByRole('button', { name: 'Añadir el código y aplicar' }).click();
    await editor(page).locator('.rem-del-cliente').first().waitFor();
    const trasSugerencia = (await api('/api/remolques/clientes')).datos;
    assert.ok(trasSugerencia.fichas.find((f) => f.id === id).codigosRps.includes(codigo), 'el código se añade a la ficha');
    assert.equal(trasSugerencia.reason, `Código añadido desde el pedido ${pedido.numero}`);
    console.log('OK: la sugerencia por nombre añade el código y aplica la ficha');
  }
  assert.deepEqual(inesperadas, [], `respuestas de error inesperadas: ${inesperadas.join(', ')}`);
  assert.deepEqual(app.errors, [], `errores de la página: ${app.errors.join(' | ')}`);
} finally {
  await app.browser.close();
}
console.log('OK: fichas de cliente de remolques de punta a punta');
