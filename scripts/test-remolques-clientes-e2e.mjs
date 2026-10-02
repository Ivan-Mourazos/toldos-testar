// Prueba e2e de las fichas de cliente de remolques (fase 3, diseño 01/10/2026): las fichas de partida
// salen de los parámetros y los generales se quedan con GENERAL; la hoja Parámetros › Remolques ›
// Clientes con una versión por ficha (Iván, 01/10/2026): crear una ficha, editarla y guardarla con
// su botón sin motivo, su historial con lo cambiado escrito solo, los cambios sin guardar de cada
// ficha al pasar de una a otra, el 409 solo si otro guardó esa misma ficha, «Cargar esta versión»,
// «Descartar cambios» y quitarla; obtener un pedido real de RPS de un cliente con ficha (rellena y
// marca «del cliente», cambiar quita la marca); guardar una medida con sus ollaos con «Guardar en la
// ficha del cliente» y volver a obtenerlo (ollaos a medida); y la sugerencia por nombre («Añadir el
// código y aplicar»). Si RPS no responde, esa parte se anota (SALTADO) y se sigue.
// Va en su propia aislada, porque borra y cambia las fichas de su carpeta:
//   ISOLATED_DIR="$PWD/tmp/clientes" PORT=4313 FAKE_COORDINA_PORT=4323 bash .claude/skills/running-toldos-testar/start-isolated.sh
//   TOLDOS_ISOLATED_URL=http://127.0.0.1:4313 node scripts/test-remolques-clientes-e2e.mjs
// Capturas en tmp/ui-audit/remolques-clientes-por-ficha/ (claro y oscuro, 1280×720 y 1600×1000).
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { BASE_URL, openApp } from '../.claude/skills/running-toldos-testar/drive.mjs';
import { DEFAULT_PARAMS } from '../src/remolques/calc/params.ts';
import { CLAVES_OLLAOS, editor, elegir, filaOllaos } from './lib/remolques-e2e.mjs';

const FICHERO = path.resolve('tmp/clientes/remolques-clientes.json');
const SALIDA = 'tmp/ui-audit/remolques-clientes-por-ficha';
const PEDIDO_RPS = 'AR.26.04286'; // pedido real de remolques (3 líneas de lona), solo lectura
fs.mkdirSync(SALIDA, { recursive: true });
assert.equal(new URL(BASE_URL).port, '4313', 'esta prueba va en su aislada de 4313: borra y cambia las fichas');

const enviar = (method, datos) => ({ method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(datos ?? {}) });
async function api(ruta, init) {
  const r = await fetch(`${BASE_URL}${ruta}`, init);
  return { status: r.status, datos: await r.json().catch(() => null) };
}
const fichaPorId = async (id) => (await api('/api/remolques/clientes')).datos.fichas.find((f) => f.id === id);
const historial = async (id) => (await api(`/api/remolques/clientes/${encodeURIComponent(id)}/historial`)).datos.entries;
/** Guarda una ficha como lo haría otro puesto: con su versión y, si se da, un motivo. */
async function guardarFicha(id, cambiar, motivo) {
  const actual = await fichaPorId(id);
  const r = await api(`/api/remolques/clientes/${encodeURIComponent(id)}`, enviar('PUT', { ficha: cambiar(actual), baseVersion: actual.version, updatedBy: 'IVÁN', ...(motivo ? { motivo } : {}) }));
  assert.equal(r.status, 200, `guardar la ficha ${id}: ${JSON.stringify(r.datos)}`);
  return r.datos.ficha;
}
async function crearFicha(ficha) {
  const r = await api('/api/remolques/clientes', enviar('POST', { ficha, updatedBy: 'IVÁN' }));
  assert.equal(r.status, 201, `crear la ficha: ${JSON.stringify(r.datos)}`);
  return r.datos.ficha;
}
async function capturas(page, nombre) {
  for (const [width, height] of [[1280, 720], [1600, 1000]]) {
    await page.setViewportSize({ width, height });
    for (const tema of ['light', 'dark']) {
      await page.evaluate((t) => { document.documentElement.dataset.theme = t; }, tema);
      // Los botones cambian de color con transición: se espera a que acaben para no capturar a medias.
      await page.waitForTimeout(600);
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
assert.deepEqual(inicio.fichas.map((f) => f.version), [1, 1, 1], 'cada ficha empieza en su versión 1');
assert.deepEqual((await historial('ayala')).map((e) => e.resumen), [['Ficha creada']]);
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
  // El 409 de la ficha que otro puesto guardó antes es parte de la prueba.
  if (r.status() === 409 && r.request().method() === 'PUT' && pathname.startsWith('/api/remolques/clientes/')) return;
  inesperadas.push(`${r.status()} ${r.request().method()} ${pathname}`);
});
const dialogo = () => page.getByRole('alertdialog');
const avisos = () => page.locator('.notification-stack');

try {
  // ── 2. Parámetros › Remolques › Clientes ──
  await page.getByRole('button', { name: 'Parámetros', exact: true }).click();
  await page.locator('[data-group="REMOLQUES"]').click();
  await page.locator('[data-model="REMOLQUES-CLIENTES"]').click();
  const lista = page.getByRole('navigation', { name: 'Fichas de cliente' });
  for (const nombre of ['HIJOS DE PEDRO LOPEZ', 'AYALA', 'GENERAL WOLDER']) await lista.getByRole('button', { name: new RegExp(`^${nombre}`) }).waitFor();
  await page.locator('[aria-label="Ficha de HIJOS DE PEDRO LOPEZ"]').waitFor();
  await capturas(page, 'clientes-hpl');

  // Crear: solo el nombre, y se guarda al momento.
  await lista.getByRole('button', { name: 'Añadir ficha' }).click();
  await lista.getByLabel('Nombre del cliente').fill('PRUEBA PANTALLA');
  await lista.getByRole('button', { name: 'Crear ficha' }).click();
  await avisos().getByText('Ficha creada', { exact: true }).first().waitFor();
  const ficha = page.locator('section.clientes-remolques-ficha[aria-label="Ficha de PRUEBA PANTALLA"]');
  await ficha.waitFor();
  const creada = (await api('/api/remolques/clientes')).datos.fichas.find((f) => f.nombre === 'PRUEBA PANTALLA');
  assert.ok(creada, 'la ficha nueva se guarda al crearla');
  assert.equal(creada.version, 1);
  const barra = ficha.getByRole('region', { name: 'Guardar la ficha' });
  assert.ok(await barra.getByRole('button', { name: 'Guardar', exact: true }).isDisabled(), 'sin cambios, «Guardar» no se puede pulsar');

  // Editar: código, recogida de detrás y una medida con sus ollaos.
  await ficha.getByLabel('Códigos de RPS').fill('999991');
  await ficha.getByLabel('Códigos de RPS').blur();
  await ficha.getByRole('combobox', { name: 'Recogida detrás' }).click();
  await page.getByRole('option', { name: /^goma$/i }).click();
  await ficha.getByRole('button', { name: 'Añadir medida' }).click();
  const medida = ficha.getByRole('region', { name: 'Medida 1' });
  await medida.getByLabel('Largo (cm)').fill('220');
  await medida.getByLabel('Ancho (cm)').fill('130');
  await medida.getByLabel('Delante · posiciones').fill('2,5 · 65 · 127,5');
  await medida.getByLabel('Delante · posiciones').blur();
  await barra.getByText('Cambios sin guardar en esta ficha').waitFor();
  await lista.getByRole('button', { name: /^PRUEBA PANTALLA/ }).getByText('Cambios sin guardar').waitFor();
  // Pasar a otra ficha y volver no pierde lo escrito.
  await lista.getByRole('button', { name: /^AYALA/ }).click();
  await page.locator('section.clientes-remolques-ficha[aria-label="Ficha de AYALA"]').getByText('Ficha guardada').waitFor();
  await lista.getByRole('button', { name: /^PRUEBA PANTALLA/ }).click();
  await barra.getByText('Cambios sin guardar en esta ficha').waitFor();
  assert.equal(await ficha.getByLabel('Códigos de RPS').inputValue(), '999991');
  await capturas(page, 'ficha-editada');

  // Otro puesto guarda OTRA ficha: no choca.
  await guardarFicha('ayala', (f) => ({ ...f, rotulacion: true }));
  // Guardar sin motivo: solo con el «Soy».
  await barra.getByRole('button', { name: 'Guardar', exact: true }).click();
  await barra.getByText('Ficha guardada').waitFor();
  const guardada = await fichaPorId(creada.id);
  assert.equal(guardada.version, 2, 'guardar sube solo la versión de esa ficha');
  assert.deepEqual(guardada.codigosRps, ['999991']);
  assert.equal(guardada.recogeAtras, 'GOMA');
  assert.deepEqual(guardada.medidas, [{ tipo: 'lona', largo: 220, ancho: 130, ollaos: { delante: [2.5, 65, 127.5], atras: [], laterales: [] } }]);
  assert.equal((await fichaPorId('ayala')).version, 2, 'la de AYALA la guardó el otro puesto');
  const entradas = await historial(creada.id);
  assert.equal(entradas[0].updatedBy, 'IVÁN');
  assert.equal(entradas[0].motivo, '', 'el motivo es opcional');
  assert.deepEqual(entradas[0].resumen, ['Códigos de RPS: + 999991', 'Recogida detrás: — → Goma', 'Medida 220 × 130 de lona nueva']);
  await capturas(page, 'ficha-guardada');

  // El historial de la ficha, con lo cambiado escrito solo.
  await barra.locator('summary').click();
  const panel = barra.getByLabel('Historial de la ficha');
  await panel.getByText('Medida 220 × 130 de lona nueva').waitFor();
  await panel.getByText('Ficha creada').waitFor();
  await capturas(page, 'historial');

  // «Cargar esta versión» (la recién creada) la pone como cambios sin guardar; «Descartar cambios» los quita.
  await panel.getByRole('button', { name: 'Cargar esta versión' }).click();
  await barra.getByText('Cambios sin guardar en esta ficha').waitFor();
  assert.equal(await ficha.getByLabel('Códigos de RPS').inputValue(), '');
  await barra.locator('summary').click();
  await barra.getByRole('button', { name: 'Descartar cambios' }).click();
  await dialogo().getByRole('button', { name: 'Descartar' }).click();
  await barra.getByText('Ficha guardada').waitFor();
  assert.equal(await ficha.getByLabel('Códigos de RPS').inputValue(), '999991');

  // Otro puesto guarda ESTA ficha mientras se edita: 409, los cambios siguen y al volver a guardar se guardan.
  await ficha.getByLabel('Material').fill('PVC 680 BLANCO');
  await guardarFicha(creada.id, (f) => ({ ...f, rotulacion: true }), 'Otro puesto');
  await barra.getByRole('button', { name: 'Guardar', exact: true }).click();
  await avisos().getByText('Ficha cambiada por otro puesto').first().waitFor();
  assert.equal(await ficha.getByLabel('Material').inputValue(), 'PVC 680 BLANCO');
  await barra.getByLabel('Motivo (opcional)').fill('Material confirmado');
  await barra.getByRole('button', { name: 'Guardar', exact: true }).click();
  await barra.getByText('Ficha guardada').waitFor();
  assert.equal((await fichaPorId(creada.id)).version, 4);
  assert.equal((await historial(creada.id))[0].motivo, 'Material confirmado');

  // Quitar: con confirmación, al momento, y queda en su historial.
  await ficha.getByRole('button', { name: 'Quitar la ficha PRUEBA PANTALLA' }).click();
  await dialogo().getByRole('button', { name: 'Quitar ficha' }).click();
  await avisos().getByText('Ficha quitada', { exact: true }).first().waitFor();
  assert.ok(!(await fichaPorId(creada.id)), 'la ficha quitada ya no está');
  assert.deepEqual((await historial(creada.id))[0].resumen, ['Ficha quitada']);
  console.log('OK: la hoja Clientes guarda cada ficha con su botón, sin motivo, con su historial y su versión');

  // ── 3. Obtener un pedido de un cliente con ficha ──
  const rps = await api(`/api/remolques/rps-pedido?numero=${PEDIDO_RPS}`);
  const pedido = rps.status === 200 ? rps.datos.pedido : null;
  if (!pedido?.cliente?.codigo || !pedido.lineas.length) {
    console.log('SALTADO: RPS no responde en la aislada; sin «Obtener datos», el botón ni la sugerencia');
  } else {
    const { codigo, nombre, alias } = pedido.cliente;
    const propia = (await api('/api/remolques/clientes')).datos.fichas.find((f) => f.codigosRps.includes(codigo));
    const id = propia?.id ?? (await crearFicha({ nombre: `PRUEBA ${codigo}`, codigosRps: [codigo] })).id;
    const nombreFicha = propia?.nombre ?? `PRUEBA ${codigo}`;
    await guardarFicha(id, (f) => ({ ...f, perfil: { tipoPerfil: 'TIPO 02', aguas: 20 }, recogeDelante: 'GOMA', recogeAtras: 'GOMA', observaciones: ['OBSERVACIÓN FIJA DE PRUEBA'], medidas: [] }), 'Prueba e2e: ficha del pedido');

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
    await ventana.getByRole('button', { name: 'Guardar en la ficha' }).click();
    await page.getByText(`Guardado en la ficha de ${nombreFicha}.`).waitFor();
    const conMedida = (await api('/api/remolques/clientes')).datos;
    const medidaPedido = conMedida.fichas.find((f) => f.id === id).medidas.find((m) => m.largo === linea.largo && m.ancho === linea.ancho);
    assert.deepEqual(medidaPedido?.ollaos, posiciones, 'la ficha guarda la medida con sus ollaos tal cual');
    const trasMedida = (await historial(id))[0];
    assert.equal(trasMedida.motivo, `Desde el pedido ${PEDIDO_RPS}`);
    const medidaTexto = `Medida ${linea.largo.toLocaleString('es-ES')} × ${linea.ancho.toLocaleString('es-ES')} de lona`;
    assert.ok(trasMedida.resumen.some((l) => l.startsWith(medidaTexto)), `el historial dice la medida: ${trasMedida.resumen}`);
    await obtener();
    await editor(page).waitFor();
    const valores = await filaOllaos(page, editor(page), 'DELANTE ·').locator('input').evaluateAll((els) => els.map((e) => e.value).filter(Boolean));
    assert.deepEqual(valores.map((v) => Number(v.replace(',', '.'))), posiciones.delante, 'al volver a obtenerlo, los ollaos salen a medida con sus posiciones');
    console.log('OK: «Guardar en la ficha del cliente» y volver a obtener el pedido');

    // ── 5. Sugerencia por nombre ──
    const parecido = (alias || nombre).trim();
    await guardarFicha(id, (f) => ({ ...f, nombre: parecido, codigosRps: f.codigosRps.filter((c) => c !== codigo) }), 'Prueba e2e: sin código');
    await obtener();
    await dialogo().getByText(`¿Es de la ficha ${parecido}?`).waitFor();
    await dialogo().getByRole('button', { name: 'Añadir el código y aplicar' }).click();
    await editor(page).locator('.rem-del-cliente').first().waitFor();
    const trasSugerencia = (await api('/api/remolques/clientes')).datos;
    assert.ok(trasSugerencia.fichas.find((f) => f.id === id).codigosRps.includes(codigo), 'el código se añade a la ficha');
    const ultima = (await historial(id))[0];
    assert.equal(ultima.motivo, `Código añadido desde el pedido ${pedido.numero}`);
    assert.deepEqual(ultima.resumen, [`Códigos de RPS: + ${codigo}`]);
    console.log('OK: la sugerencia por nombre añade el código y aplica la ficha');

    // ── 6. El historial de esa ficha en la hoja, con lo que vino de los pedidos ──
    await page.getByRole('button', { name: 'Parámetros', exact: true }).click();
    await lista.getByRole('button', { name: new RegExp(`^${parecido.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`) }).click();
    const barraPedido = page.locator(`section.clientes-remolques-ficha[aria-label="Ficha de ${parecido}"]`).getByRole('region', { name: 'Guardar la ficha' });
    await barraPedido.locator('summary').click();
    await barraPedido.getByLabel('Historial de la ficha').getByText(`Código añadido desde el pedido ${pedido.numero}`).waitFor();
    await capturas(page, 'historial-desde-pedido');
    await barraPedido.locator('summary').click();
    console.log('OK: el historial de la ficha cuenta lo guardado desde los pedidos');
  }
  assert.deepEqual(inesperadas, [], `respuestas de error inesperadas: ${inesperadas.join(', ')}`);
  // El navegador apunta en la consola el 409 esperado de la ficha guardada por otro puesto.
  const errores = app.errors.filter((e) => !/status of 409 \(Conflict\)/.test(e));
  assert.deepEqual(errores, [], `errores de la página: ${errores.join(' | ')}`);
} finally {
  await app.browser.close();
}
console.log('OK: fichas de cliente de remolques de punta a punta');
