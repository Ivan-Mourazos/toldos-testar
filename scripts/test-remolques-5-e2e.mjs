// Prueba e2e de la fase 5 de remolques: guardar para revisión en Remolques, Pedidos con toldos y
// remolques (etiqueta, filtro, grupos de CoordinaOT), «Generar archivos» con los dos PDF iguales,
// sus datos dentro y «REVISADO POR», lo que no se puede hacer, «Reutilizar datos» y «Corregir».
// Va en una aislada con su propia carpeta de prueba, porque activa la generación de archivos (solo
// dentro de tmp/) y no debe tocar la configuración de la de 4310:
//   ISOLATED_DIR="$PWD/tmp/remolques-5" PORT=4311 FAKE_COORDINA_PORT=4321 bash .claude/skills/running-toldos-testar/start-isolated.sh
//   TOLDOS_ISOLATED_URL=http://127.0.0.1:4311 FAKE_COORDINA_PORT=4321 node scripts/test-remolques-5-e2e.mjs
// Capturas en tmp/ui-audit/remolques-5/ (claro y oscuro, 1280×720 y 1600×1000). Al acabar deja la
// generación apagada y el CoordinaOT simulado como al principio.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs';
import { BASE_URL, openApp } from '../.claude/skills/running-toldos-testar/drive.mjs';
import { leerDatosPedido } from '../src/remolques/flujo/adjunto.ts';
import { editor, teclearCaso } from './lib/remolques-e2e.mjs';

const FAKE = `http://127.0.0.1:${process.env.FAKE_COORDINA_PORT || 4320}`;
const SALIDA = 'tmp/ui-audit/remolques-5';
fs.mkdirSync(SALIDA, { recursive: true });
const CON_WEBGL = ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'];
// El año del número es el de hoy: así el generado sale en «Generados» del año que abre Pedidos.
const ANIO = String(new Date().getFullYear());
const AA = ANIO.slice(2);
const numero = (n) => ({ pedido: `AR.${AA}.${n}`, codigo: `AR${AA}${n}` });
const P1 = numero('99501');
const P2 = numero('99502');
const P3 = numero('99503');
const OF = { a: '0299501', b: '0299502', c: '0299503', d: '0299504' };
const fixture = JSON.parse(fs.readFileSync('src/remolques/__fixtures__/produccion-2026-09.json', 'utf8'));
const caso = (id) => fixture.find((c) => c.caso === id);
const json = (datos) => ({ method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(datos ?? {}) });
async function api(ruta, init) {
  const r = await fetch(`${BASE_URL}${ruta}`, init);
  return { status: r.status, datos: await r.json().catch(() => null) };
}
const fijarCoordina = (ofs) => fetch(`${FAKE}/__estado`, json({ ofs }));
const elemento = (id, version, pedido, of) => {
  const c = caso(id);
  return { version, tipo: c.tipo, input: { ...c.input, cabecera: { ...c.input.cabecera, numeroPedido: pedido, version, cliente: 'TALLERES DE PRUEBA', fecha: `${ANIO}-09-30`, ordenFabricacion: of } } };
};

// Las carpetas de esta aislada tienen que estar dentro de tmp/ del repositorio: aquí se activa la generación.
const { settings: ajustes } = (await api('/api/workflow/settings')).datos;
const TMP = path.resolve('tmp');
for (const clave of ['remolquesRevisionDirectory', 'remolquesPlanteamientosDirectory', 'remolquesOficinaTecnicaDirectory']) {
  const ruta = path.resolve(String(ajustes[clave] || '').replace('{YYYY}', ANIO));
  assert.ok(ajustes[clave] && ruta.startsWith(`${TMP}${path.sep}`), `${clave} tiene que estar dentro de tmp/: «${ajustes[clave]}»`);
}
const ponerGeneracion = (activa) => api('/api/workflow/settings', { ...json({ ...ajustes, productionEnabled: activa }), method: 'PUT' });
const oficinaDelAnio = ajustes.remolquesOficinaTecnicaDirectory.replace('{YYYY}', ANIO);
const pdfPlan = path.join(ajustes.remolquesPlanteamientosDirectory, `${P1.codigo}-10.pdf`);
const pdfOficina = path.join(oficinaDelAnio, `${P1.codigo}.pdf`);

// Empezar de cero: los pedidos y los PDF de una vuelta anterior, la generación apagada.
for (const p of [P1, P2, P3]) {
  fs.rmSync(path.join(ajustes.remolquesRevisionDirectory, `${p.codigo}.json`), { force: true });
  fs.rmSync(path.join(ajustes.remolquesPlanteamientosDirectory, `${p.codigo}-10.pdf`), { force: true });
  fs.rmSync(path.join(oficinaDelAnio, `${p.codigo}.pdf`), { force: true });
}
await ponerGeneracion(false);
await fetch(`${FAKE}/__reset`, json());
await fijarCoordina({ [OF.a]: { estado: 'en_revision' }, [OF.b]: { estado: 'en_revision' } });

const { browser, page, errors } = await openApp({ width: 1600, height: 1000 }, { launchArgs: CON_WEBGL });
page.setDefaultTimeout(20000);
const irAPedidos = () => page.getByRole('button', { name: /^Pedidos/ }).first().click();
const fila = (codigo) => page.locator('.orders-row', { hasText: codigo });
const grupoDe = (codigo) => page.locator('.orders-group', { has: fila(codigo) });
async function abrir(codigo) {
  await fila(codigo).first().waitFor();
  if (!(await fila(codigo).getByRole('button', { name: 'Abrir el pedido' }).isVisible())) await fila(codigo).locator('.orders-row-toggle').click();
  await fila(codigo).getByRole('button', { name: 'Abrir el pedido' }).click();
}
const botonActivo = (texto) => page.waitForFunction((t) => [...document.querySelectorAll('button')].some((b) => b.textContent.trim() === t && !b.disabled), texto);
// El servidor recuerda 30 s cada respuesta de CoordinaOT: se repite hasta que se cumple (40 s como mucho).
async function hasta(comprobar, que, limiteMs = 40_000) {
  const fin = Date.now() + limiteMs;
  let ultimo;
  for (;;) {
    try {
      await comprobar();
      return;
    } catch (error) {
      ultimo = error;
    }
    if (Date.now() > fin) throw new Error(`${que}: no se cumplió en ${limiteMs / 1000} s. ${ultimo.message}`);
    await page.waitForTimeout(3000);
  }
}
async function capturas(nombre) {
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

try {
  // ── 1. Guardar para revisión desde Remolques ──
  await page.getByRole('button', { name: /^Remolques/ }).click();
  await page.getByLabel('Pedido', { exact: true }).fill(P1.pedido);
  await page.getByLabel('Cliente', { exact: true }).fill('TALLERES DE PRUEBA');
  for (const [id, boton, of] of [['lona-02', '+ Remolque', OF.a], ['baqueton-01', '+ Baquetón', OF.b]]) {
    await page.getByRole('button', { name: boton, exact: true }).click();
    await editor(page).waitFor();
    await teclearCaso(page, caso(id));
    await editor(page).locator('input[data-campo="ordenFabricacion"]').fill(of);
  }
  await botonActivo('Guardar para revisión');
  await capturas('1-remolques-listo');
  await page.getByRole('button', { name: 'Guardar para revisión', exact: true }).click();
  await page.getByText(`Guardado en Pedidos para revisión: ${P1.codigo}.`).waitFor();
  assert.equal(await page.locator('.rem-pestana').count(), 0, 'al guardar, la pantalla queda para un pedido nuevo');
  const guardado = (await api(`/api/remolques/pedidos/${P1.codigo}`)).datos;
  assert.equal(guardado.status, 'PENDING_REVIEW');
  assert.equal(guardado.summary.technician, 'IVÁN');
  assert.deepEqual(guardado.summary.ofs, [OF.a, OF.b]);
  console.log('OK: guardado para revisión desde Remolques');

  // ── 2. En Pedidos: etiqueta, filtro, búsqueda y «Por revisar» ──
  await irAPedidos();
  await fila(P1.codigo).waitFor();
  assert.equal((await fila(P1.codigo).locator('.orders-kind-tag').innerText()).trim(), 'Remolque');
  assert.match(await grupoDe(P1.codigo).locator('.orders-group-title').innerText(), /Por revisar/);
  const filtro = page.getByRole('group', { name: 'Qué tipo de pedidos' });
  await filtro.getByRole('button', { name: 'Toldos', exact: true }).click();
  assert.equal(await fila(P1.codigo).count(), 0, '«Toldos» deja fuera los remolques');
  await filtro.getByRole('button', { name: 'Remolques', exact: true }).click();
  await fila(P1.codigo).waitFor();
  assert.equal(await page.locator('.orders-kind-tag.is-toldos').count(), 0, '«Remolques» deja solo remolques');
  await filtro.getByRole('button', { name: 'Todos', exact: true }).click();
  await page.getByLabel('Buscar pedidos').fill('arquillado');
  await fila(P1.codigo).waitFor();
  await page.getByLabel('Buscar pedidos').fill('');
  await capturas('2-pedidos-por-revisar');
  await abrir(P1.codigo);
  await page.getByText(`Sin aprobar en CoordinaOT: A (${OF.a}) en revisión, B (${OF.b}) en revisión.`).first().waitFor();
  assert.equal(await page.getByRole('button', { name: 'Generar archivos', exact: true }).isDisabled(), true);
  console.log('OK: en Pedidos con «Remolque», el filtro, la búsqueda por perfil y «Por revisar»');

  // ── 3. CoordinaOT aprueba (revisor «jaime») ──
  await fijarCoordina({ [OF.a]: { estado: 'aprobada', revisor: 'jaime' }, [OF.b]: { estado: 'aprobada', revisor: 'jaime' } });
  await hasta(async () => {
    await page.reload();
    await irAPedidos();
    await fila(P1.codigo).waitFor();
    assert.match(await grupoDe(P1.codigo).locator('.orders-group-title').innerText(), /Aprobados · falta generar/);
  }, 'aprobado en CoordinaOT');
  await ponerGeneracion(true);
  await abrir(P1.codigo);
  await botonActivo('Generar archivos');
  await page.getByText('Aprobado por Jaime').first().waitFor();
  await capturas('3-detalle-aprobado');
  console.log('OK: aprobado → «Aprobados · falta generar» y «Generar archivos» encendido para el autor');

  // ── 4. Generar archivos ──
  await page.getByRole('button', { name: 'Generar archivos', exact: true }).click();
  await page.getByRole('alertdialog').getByRole('button', { name: 'Sí, generar archivos' }).click();
  await page.getByText(new RegExp(`Guardada la hoja de taller ${P1.codigo}-10\\.pdf`)).waitFor({ timeout: 90_000 });
  const plan = fs.readFileSync(pdfPlan);
  assert.ok(plan.equals(fs.readFileSync(pdfOficina)), 'las dos copias son el mismo PDF');
  const dentro = await leerDatosPedido(plan);
  assert.equal(dentro.orderCode, P1.codigo);
  assert.equal(dentro.status, 'PRODUCED');
  assert.equal(dentro.reviewedBy, 'JAIME');
  assert.deepEqual(dentro.elementos.map((e) => [e.tipo, e.input.cabecera.ordenFabricacion]), [['lona', OF.a], ['baqueton', OF.b]]);
  const doc = await getDocument({ data: new Uint8Array(plan) }).promise;
  assert.equal(doc.numPages, 2, 'una hoja por elemento');
  for (let n = 1; n <= doc.numPages; n++) {
    const texto = (await (await doc.getPage(n)).getTextContent()).items.map((i) => i.str).join(' ');
    assert.match(texto, /REVISADO POR/, `hoja ${n}: lleva «REVISADO POR»`);
    assert.match(texto, /JAIME/, `hoja ${n}: con el revisor de CoordinaOT`);
  }
  fs.copyFileSync(pdfPlan, `${SALIDA}/${P1.codigo}-10.pdf`);
  await fila(P1.codigo).waitFor();
  assert.equal(await grupoDe(P1.codigo).locator('.orders-day-title').count(), 1, 'el pedido está en «Generados»');
  await capturas('4-generados');
  console.log('OK: generado, dos PDF iguales con los datos dentro y «REVISADO POR» JAIME, y en «Generados»');

  // ── 5. Lo que no se puede: regenerar, guardar encima, sustituir sin preguntar ──
  assert.equal((await api(`/api/remolques/pedidos/${P1.codigo}/generar`, json({}))).datos?.unchanged, true, 'un generado no se vuelve a generar');
  const encima = await api('/api/remolques/pedidos', json({ elementos: [elemento('lona-02', '10', P1.pedido, OF.a)], savedBy: 'IVÁN', confirmOverwrite: true }));
  assert.deepEqual([encima.status, encima.datos.error], [409, 'Este pedido ya está generado. Cambia el número de pedido para guardarlo como uno nuevo.']);
  assert.equal((await api('/api/remolques/pedidos', json({ elementos: [elemento('lona-03', '10', P3.pedido, OF.d)], savedBy: 'IVÁN' }))).status, 200);
  await fijarCoordina({ [OF.d]: { estado: 'aprobada', revisor: 'angel' } });
  const yaHay = path.join(ajustes.remolquesPlanteamientosDirectory, `${P3.codigo}-10.pdf`);
  fs.writeFileSync(yaHay, '%PDF-1.4 viejo');
  const pregunta = await api(`/api/remolques/pedidos/${P3.codigo}/generar`, json({}));
  assert.deepEqual([pregunta.status, pregunta.datos.needsConfirmation, pregunta.datos.existing], [409, true, [`${P3.codigo}-10.pdf`]]);
  const sustituido = await api(`/api/remolques/pedidos/${P3.codigo}/generar`, json({ confirmOverwrite: true }));
  assert.equal(sustituido.status, 200, JSON.stringify(sustituido.datos));
  assert.equal((await leerDatosPedido(fs.readFileSync(yaHay))).reviewedBy, 'ÁNGEL');
  // Un pedido es de toldos o de remolques: toldos no guarda con el número de uno de remolques.
  const deToldos = await api('/api/reviews', json({ order: { orderCode: P1.pedido, awnings: [{ model: 'ARTE' }] }, savedBy: 'IVÁN' }));
  assert.deepEqual([deToldos.status, deToldos.datos?.error],
    [409, `${P1.codigo} ya está guardado como pedido de remolques: un pedido es de toldos o de remolques. Revisa el número.`]);
  console.log('OK: sin regenerar, sin guardar encima de un generado, sustituir solo confirmando y toldos no guarda un número de remolques');

  // ── 6. Reutilizar datos ──
  await abrir(P1.codigo);
  await page.getByRole('button', { name: 'Reutilizar datos', exact: true }).click();
  await page.getByRole('alertdialog').getByRole('button', { name: 'Reutilizar datos', exact: true }).click();
  await editor(page).waitFor();
  assert.equal(await page.getByLabel('Pedido', { exact: true }).inputValue(), P1.pedido);
  assert.equal(await page.locator('.rem-pestana').count(), 2);
  assert.equal(await page.locator('.rem-aviso-params').count(), 0, '«Reutilizar» calcula con los parámetros actuales');
  console.log('OK: «Reutilizar datos» carga el pedido como uno nuevo');

  // ── 7. Corregir, con sus parámetros, y volver a guardar ──
  const comunes = (await api('/api/remolques/parametros')).datos;
  const propios = { ...comunes, demasiaAlto: comunes.demasiaAlto + 1 };
  assert.equal((await api('/api/remolques/pedidos', json({ elementos: [elemento('lona-02', '10', P2.pedido, OF.c)], params: propios, savedBy: 'IVÁN' }))).status, 200);
  // Guardado por la API: la lista de pendientes se lee al cargar la página.
  await page.reload();
  await irAPedidos();
  await abrir(P2.codigo);
  await page.getByRole('button', { name: 'Corregir', exact: true }).click();
  // Solo pregunta si Remolques tiene algo (tras recargar está vacío).
  const abrirParaCorregir = page.getByRole('alertdialog').getByRole('button', { name: 'Abrir para corregir', exact: true });
  if (await abrirParaCorregir.waitFor({ timeout: 3000 }).then(() => true, () => false)) await abrirParaCorregir.click();
  await page.locator('.rem-aviso-params').waitFor();
  assert.equal(await page.getByLabel('Pedido', { exact: true }).inputValue(), P2.pedido);
  assert.equal(await editor(page).locator('input[data-campo="ordenFabricacion"]').inputValue(), OF.c);
  await capturas('5-corregir');
  await page.getByRole('button', { name: 'Guardar para revisión', exact: true }).click();
  await page.getByRole('alertdialog').getByRole('button', { name: 'Actualizar pedido', exact: true }).click();
  await page.getByText(`Guardado en Pedidos para revisión: ${P2.codigo}.`).waitFor();
  assert.equal((await api(`/api/remolques/pedidos/${P2.codigo}`)).datos.params.demasiaAlto, propios.demasiaAlto, '«Corregir» guarda con los parámetros con que se guardó');
  console.log('OK: «Corregir» abre el pedido con sus datos y sus parámetros, y se vuelve a guardar');
} finally {
  await ponerGeneracion(false).catch(() => {});
  await fetch(`${FAKE}/__reset`, json()).catch(() => {});
  await browser.close();
}
// Los 409 son las preguntas de confirmar («Actualizar pedido»): el navegador los apunta como error de red.
assert.deepEqual(errors.filter((e) => !/status of 409/.test(e)), [], 'sin errores de consola');
console.log('Remolques fase 5: OK');
