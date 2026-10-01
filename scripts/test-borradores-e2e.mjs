// Prueba e2e de los borradores en el servidor (diseño 01/10/2026): guardar borrador de toldos y de
// remolques; verlos en «Borradores» como otro técnico (etiquetas, filtro, búsqueda, «Míos»); que no
// cuentan en «Pedidos N»; descartar uno; «Seguir con el borrador» y sustituir el de otra persona; el
// aviso al obtener un pedido con borrador («Abrir borrador» y «Empezar de cero»); pasarlo a revisión,
// en toldos y en remolques, y que desaparece; y la carpeta en Configuración (paso 08).
// Va en su propia aislada, porque borra pedidos de prueba de su carpeta:
//   ISOLATED_DIR="$PWD/tmp/borradores" PORT=4311 FAKE_COORDINA_PORT=4321 bash .claude/skills/running-toldos-testar/start-isolated.sh
//   TOLDOS_ISOLATED_URL=http://127.0.0.1:4311 node scripts/test-borradores-e2e.mjs
// Capturas en tmp/ui-audit/borradores/ (claro y oscuro, 1280×720 y 1600×1000).
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { BASE_URL, addAwning, fillArzuaAR2603332, openApp } from '../.claude/skills/running-toldos-testar/drive.mjs';
import { editor, teclearCaso } from './lib/remolques-e2e.mjs';

const SALIDA = 'tmp/ui-audit/borradores';
fs.mkdirSync(SALIDA, { recursive: true });
const CON_WEBGL = ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'];
const AA = String(new Date().getFullYear()).slice(2);
const T1 = 'AR2603332'; // el pedido de Arzúa que rellena fillArzuaAR2603332
const R1 = { pedido: `AR.${AA}.99602`, codigo: `AR${AA}99602` };
const T2 = `AR${AA}99603`;
const R3 = { pedido: `AR.${AA}99604`, codigo: `AR${AA}99604` }; // remolques con un borrador de toldos del mismo número
const OF_R1 = '0299602';
const OF_R3 = '0299604';
const fixture = JSON.parse(fs.readFileSync('src/remolques/__fixtures__/produccion-2026-09.json', 'utf8'));
const caso = (id) => fixture.find((c) => c.caso === id);
const enviar = (method, datos) => ({ method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(datos ?? {}) });
async function api(ruta, init) {
  const r = await fetch(`${BASE_URL}${ruta}`, init);
  return { status: r.status, datos: await r.json().catch(() => null) };
}

// Las carpetas de esta aislada tienen que estar dentro de tmp/: aquí se borran ficheros.
const { settings: ajustes } = (await api('/api/workflow/settings')).datos;
const TMP = path.resolve('tmp');
const enTmp = (ruta) => path.resolve(String(ruta || '').replace('{YYYY}', '2026')).startsWith(`${TMP}${path.sep}`);
for (const clave of ['draftsDirectory', 'reviewDirectory', 'remolquesRevisionDirectory']) {
  assert.ok(ajustes[clave] && enTmp(ajustes[clave]), `${clave} tiene que estar dentro de tmp/: «${ajustes[clave]}»`);
}
// Empezar de cero: los borradores y pedidos de prueba de una vuelta anterior.
for (const codigo of [T1, R1.codigo, T2, R3.codigo]) fs.rmSync(path.join(ajustes.draftsDirectory, `${codigo}.json`), { force: true });
fs.rmSync(path.join(ajustes.reviewDirectory.replace('{YYYY}', '2026'), `${T1}.pdf`), { force: true });
for (const codigo of [R1.codigo, R3.codigo]) fs.rmSync(path.join(ajustes.remolquesRevisionDirectory, `${codigo}.json`), { force: true });

const ivan = await openApp({ width: 1600, height: 1000 }, { launchArgs: CON_WEBGL });
const jaime = await openApp({ width: 1600, height: 1000 }, { user: 'JAIME', launchArgs: CON_WEBGL });
ivan.page.setDefaultTimeout(20000);
jaime.page.setDefaultTimeout(20000);
// Respuestas de error del servidor que no se esperan: el navegador las apunta en la consola sin decir
// la ruta, así que se miran aquí. Se esperan los 409 de las preguntas de confirmar de /api/borradores
// y lo que falle de RPS y de las OF en la aislada (no hay RPS ni CoordinaOT reales).
const RUTAS_RPS = /\/api\/(orders\/[^/]+\/(autofill|ofs)|remolques\/rps-pedido|coordina\/ofs)(\?|$)/;
const respuestasInesperadas = [];
for (const { page } of [ivan, jaime]) {
  page.on('response', (r) => {
    const { pathname, search } = new URL(r.url());
    if (!pathname.startsWith('/api/') || r.status() < 400) return;
    if (RUTAS_RPS.test(pathname + search)) return;
    if (pathname.startsWith('/api/borradores') && r.status() === 409) return;
    respuestasInesperadas.push(`${r.status()} ${r.request().method()} ${pathname}`);
  });
}
const toldos = (page) => page.locator('.order-form-fieldset');
const remolques = (page) => page.locator('.remolques-pantalla');
const pestanaPedidos = (page) => page.getByRole('button', { name: /^Pedidos/ }).first();
const seccionBorradores = (page) => page.locator('section.orders-group', { has: page.locator('.orders-group-title.tone-draft') });
const filaBorrador = (page, codigo) => seccionBorradores(page).locator('.orders-row', { hasText: codigo });
const dialogo = (page) => page.getByRole('alertdialog');
async function desplegar(page, codigo) {
  const fila = filaBorrador(page, codigo);
  await fila.waitFor();
  if (!(await fila.getByRole('button', { name: 'Seguir con el borrador' }).isVisible())) await fila.locator('.orders-row-toggle').click();
  return fila;
}
async function capturas(page, nombre, tamanos = [[1280, 720], [1600, 1000]], enfocar = null) {
  for (const [width, height] of tamanos) {
    await page.setViewportSize({ width, height });
    if (enfocar) await enfocar.scrollIntoViewIfNeeded();
    for (const tema of ['light', 'dark']) {
      await page.evaluate((t) => { document.documentElement.dataset.theme = t; }, tema);
      await page.screenshot({ path: `${SALIDA}/${nombre}-${width}-${tema === 'light' ? 'claro' : 'oscuro'}.png` });
    }
  }
  await page.evaluate(() => { document.documentElement.dataset.theme = 'light'; });
  await page.setViewportSize({ width: 1600, height: 1000 });
}

try {
  const page = ivan.page;
  const pj = jaime.page;
  await page.waitForLoadState('networkidle');
  const pedidosAntes = (await pestanaPedidos(page).innerText()).trim();

  // ── 1. Borrador de toldos (Iván) ──
  await page.getByRole('button', { name: 'Toldos', exact: true }).click();
  await addAwning(page, 'Arzúa Pro');
  await fillArzuaAR2603332(page);
  await page.waitForLoadState('networkidle');
  await page.getByRole('button', { name: 'Guardar borrador', exact: true }).click();
  await page.getByText(`Borrador guardado: ${T1}.`).waitFor();
  assert.equal(await toldos(page).getByLabel('Pedido', { exact: true }).inputValue(), '', 'tras guardar el borrador, el formulario queda limpio');
  const b1 = (await api(`/api/borradores/${T1}`)).datos;
  assert.equal(b1.kind, 'toldos');
  assert.equal(b1.savedBy, 'IVÁN');
  assert.equal(b1.summary.elementos, 1);
  console.log('OK: borrador de toldos guardado y formulario limpio');

  // ── 2. Borrador de remolques (Iván) ──
  await page.getByRole('button', { name: /^Remolques/ }).first().click();
  await remolques(page).getByLabel('Pedido', { exact: true }).fill(R1.pedido);
  await remolques(page).getByLabel('Cliente', { exact: true }).fill('TALLERES DE PRUEBA');
  await page.getByRole('button', { name: '+ Remolque', exact: true }).click();
  await editor(page).waitFor();
  await teclearCaso(page, caso('lona-02'));
  await editor(page).locator('input[data-campo="ordenFabricacion"]').fill(OF_R1);
  await capturas(page, '1-remolques-guardar-borrador');
  await page.getByRole('button', { name: 'Guardar borrador', exact: true }).click();
  await page.getByText(`Borrador guardado: ${R1.codigo}.`).waitFor();
  assert.equal(await page.locator('.rem-pestana').count(), 0, 'tras guardar el borrador, la pantalla queda para un pedido nuevo');
  assert.equal((await api(`/api/borradores/${R1.codigo}`)).datos.kind, 'remolques');
  console.log('OK: borrador de remolques guardado y pantalla limpia');

  // ── 3. Reglas por la API y un borrador de Jaime para descartar ──
  const ordenT2 = { orderCode: T2, customer: 'CLIENTE PARA DESCARTAR', orderDate: `20${AA}-10-01`, awnings: [] };
  assert.equal((await api(`/api/borradores/${T2}`, enviar('PUT', { kind: 'toldos', savedBy: 'JAIME', contenido: { order: ordenT2 } }))).status, 200);
  assert.equal((await api(`/api/borradores/${T2}`, enviar('PUT', { kind: 'toldos', savedBy: '', contenido: { order: ordenT2 } }))).status, 400, 'sin «Soy» no se guarda');
  const otroTipo = await api(`/api/borradores/${T1}`, enviar('PUT', { kind: 'remolques', savedBy: 'IVÁN', contenido: { numeroPedido: T1, cliente: '', fecha: '', lineas: [] } }));
  assert.equal(otroTipo.status, 409);
  assert.match(otroTipo.datos.error, /toldos o de remolques/);
  await page.reload();
  await page.waitForLoadState('networkidle');
  assert.equal((await pestanaPedidos(page).innerText()).trim(), pedidosAntes, 'los borradores no cuentan en «Pedidos N»');
  console.log('OK: reglas del servidor y «Pedidos N» sin cambiar');

  // ── 4. Jaime ve todos en «Borradores» ──
  await pestanaPedidos(pj).click();
  for (const codigo of [T1, R1.codigo, T2]) await filaBorrador(pj, codigo).waitFor();
  assert.match(await pj.locator('.orders-group-title').first().innerText(), /Borradores/, '«Borradores» va el primero, encima de «Por revisar»');
  assert.equal((await filaBorrador(pj, T1).locator('.orders-borrador-tag').innerText()).trim(), 'Borrador');
  assert.equal((await filaBorrador(pj, T1).locator('.orders-kind-tag').innerText()).trim(), 'Toldo');
  assert.equal((await filaBorrador(pj, R1.codigo).locator('.orders-kind-tag').innerText()).trim(), 'Remolque');
  const filtro = pj.getByRole('group', { name: 'Qué tipo de pedidos' });
  await filtro.getByRole('button', { name: 'Remolques', exact: true }).click();
  await filaBorrador(pj, R1.codigo).waitFor();
  assert.equal(await filaBorrador(pj, T1).count(), 0, '«Remolques» deja fuera los borradores de toldos');
  await filtro.getByRole('button', { name: 'Todos', exact: true }).click();
  await pj.getByLabel('Buscar pedidos').fill('99603');
  await filaBorrador(pj, T2).waitFor();
  assert.equal(await filaBorrador(pj, T1).count(), 0, 'la búsqueda también filtra los borradores');
  await pj.getByLabel('Buscar pedidos').fill('');
  const alcance = pj.getByRole('group', { name: 'Qué pedidos pendientes' });
  await alcance.getByRole('button', { name: /^Míos/ }).click();
  await filaBorrador(pj, T2).waitFor();
  assert.equal(await filaBorrador(pj, T1).count(), 0, '«Míos» enseña solo los borradores guardados por mí');
  await alcance.getByRole('button', { name: /^Todo el equipo/ }).click();
  await desplegar(pj, T1);
  await capturas(pj, '2-pedidos-borradores');
  console.log('OK: «Borradores» con etiquetas, filtro, búsqueda y «Míos»');

  // ── 5. Descartar ──
  let fila = await desplegar(pj, T2);
  await fila.getByRole('button', { name: 'Descartar borrador' }).click();
  await dialogo(pj).getByRole('button', { name: 'Descartar borrador', exact: true }).click();
  await pj.getByText(`Borrador descartado: ${T2}.`).waitFor();
  await filaBorrador(pj, T2).waitFor({ state: 'detached' });
  assert.equal((await api(`/api/borradores/${T2}`)).datos, null);
  console.log('OK: «Descartar borrador» con confirmación');

  // ── 6. Jaime sigue con el borrador de Iván y lo sustituye ──
  fila = await desplegar(pj, T1);
  await fila.getByRole('button', { name: 'Seguir con el borrador' }).click();
  await toldos(pj).getByLabel('OF', { exact: true }).waitFor();
  assert.equal(await toldos(pj).getByLabel('Pedido', { exact: true }).inputValue(), T1);
  assert.equal(await toldos(pj).getByLabel('OF', { exact: true }).inputValue(), '0230194');
  await capturas(pj, '3-seguir-con-el-borrador');
  await pj.getByRole('button', { name: 'Guardar borrador', exact: true }).click();
  await dialogo(pj).getByText('Este borrador es de Iván, ¿lo sustituyes?').waitFor();
  await capturas(pj, '4-sustituir-borrador-de-otro');
  await dialogo(pj).getByRole('button', { name: 'Sustituir borrador', exact: true }).click();
  await pj.getByText(`Borrador guardado: ${T1}.`).waitFor();
  assert.equal((await api(`/api/borradores/${T1}`)).datos.savedBy, 'JAIME');
  console.log('OK: «Seguir con el borrador» y sustituir el de otra persona preguntando');

  // ── 7. Iván obtiene el pedido: «Abrir borrador», y lo pasa a revisión ──
  await page.getByRole('button', { name: 'Toldos', exact: true }).click();
  await toldos(page).getByLabel('Pedido', { exact: true }).fill(T1);
  await page.getByRole('button', { name: 'Obtener datos del pedido' }).click();
  await dialogo(page).getByText(`${T1} tiene un borrador de Jaime del`).waitFor();
  await capturas(page, '5-obtener-con-borrador');
  // El cálculo llega tras cargar el formulario; con él pendiente, guardar avisa «Faltan datos»: se
  // espera a su respuesta y a que el botón se habilite.
  const calculado = page.waitForResponse((r) => r.url().includes('/api/calculate') && r.ok());
  await dialogo(page).getByRole('button', { name: 'Abrir borrador', exact: true }).click();
  await toldos(page).getByLabel('OF', { exact: true }).waitFor();
  assert.equal(await toldos(page).getByLabel('OF', { exact: true }).inputValue(), '0230194');
  await calculado;
  await page.waitForFunction(() => {
    const boton = [...document.querySelectorAll('button')].find((b) => b.textContent.trim() === 'Guardar para revisión');
    return Boolean(boton) && !boton.disabled;
  });
  await page.getByRole('button', { name: 'Guardar para revisión' }).click();
  await page.getByText(`Guardado en Pedidos para revisión: ${T1}.pdf`).waitFor();
  assert.equal((await api(`/api/borradores/${T1}`)).datos, null, 'al pasar a revisión, el borrador de toldos desaparece');
  const yaEnPedidos = await api(`/api/borradores/${T1}`, enviar('PUT', { kind: 'toldos', savedBy: 'IVÁN', contenido: { order: { orderCode: T1, awnings: [] } } }));
  assert.equal(yaEnPedidos.status, 409);
  assert.equal(yaEnPedidos.datos.error, 'Este pedido ya está en Pedidos: ábrelo y usa «Corregir».');
  console.log('OK: «Abrir borrador» al obtener el pedido, y pasado a revisión el borrador desaparece');

  // ── 8. Remolques: «Empezar de cero» deja el borrador; Jaime lo sigue y lo pasa a revisión ──
  await page.getByRole('button', { name: /^Remolques/ }).first().click();
  await remolques(page).getByLabel('Pedido', { exact: true }).fill(R1.pedido);
  await page.getByRole('button', { name: 'Obtener datos del pedido' }).click();
  await dialogo(page).getByText(`${R1.codigo} tiene un borrador de Iván del`).waitFor();
  await dialogo(page).getByRole('button', { name: 'Empezar de cero', exact: true }).click();
  // Sigue con RPS como siempre (en la aislada puede no responder: da igual aquí).
  await page.waitForLoadState('networkidle');
  assert.equal((await api(`/api/borradores/${R1.codigo}`)).status, 200, '«Empezar de cero» no borra el borrador');
  await pestanaPedidos(pj).click();
  fila = await desplegar(pj, R1.codigo);
  await fila.getByRole('button', { name: 'Seguir con el borrador' }).click();
  await editor(pj).waitFor();
  assert.equal(await remolques(pj).getByLabel('Pedido', { exact: true }).inputValue(), R1.pedido);
  assert.equal(await pj.locator('.rem-pestana').count(), 1);
  await capturas(pj, '6-seguir-remolques');
  await pj.getByRole('button', { name: 'Guardar para revisión', exact: true }).click();
  await pj.getByText(`Guardado en Pedidos para revisión: ${R1.codigo}.`).waitFor();
  assert.equal((await api(`/api/borradores/${R1.codigo}`)).datos, null, 'al pasar a revisión, el borrador de remolques desaparece');
  console.log('OK: remolques: «Empezar de cero», «Seguir con el borrador» y pasado a revisión');

  // ── 8b. Un pedido de remolques guardado para revisión no borra un borrador de toldos del mismo número ──
  assert.equal((await api(`/api/borradores/${R3.codigo}`, enviar('PUT', { kind: 'toldos', savedBy: 'IVÁN', contenido: { order: { orderCode: R3.codigo, customer: 'BORRADOR DE TOLDOS', orderDate: `20${AA}-10-01`, awnings: [] } } }))).status, 200);
  await page.getByRole('button', { name: /^Remolques/ }).first().click();
  await remolques(page).getByLabel('Pedido', { exact: true }).fill(R3.pedido);
  await remolques(page).getByLabel('Cliente', { exact: true }).fill('TALLERES DE PRUEBA');
  await page.getByRole('button', { name: '+ Remolque', exact: true }).click();
  await editor(page).waitFor();
  await teclearCaso(page, caso('lona-02'));
  await editor(page).locator('input[data-campo="ordenFabricacion"]').fill(OF_R3);
  await page.getByRole('button', { name: 'Guardar para revisión', exact: true }).click();
  await page.getByText(`Guardado en Pedidos para revisión: ${R3.codigo}.`).waitFor();
  const sigueDeToldos = (await api(`/api/borradores/${R3.codigo}`)).datos;
  assert.equal(sigueDeToldos?.kind, 'toldos', 'guardar remolques para revisión no borra un borrador de toldos del mismo número');
  console.log('OK: el pedido de remolques pasa a revisión y el borrador de toldos del mismo número se conserva');

  // ── 9. Configuración: paso 08 «Borradores» ──
  await page.getByRole('button', { name: 'Configuración', exact: true }).click();
  const paso08 = page.locator('label.workflow-route-card', { has: page.locator('.workflow-step', { hasText: '08' }) });
  await paso08.waitFor();
  await paso08.scrollIntoViewIfNeeded();
  assert.equal(await paso08.locator('input').inputValue(), ajustes.draftsDirectory);
  await capturas(page, '7-configuracion-borradores', [[1280, 720]], paso08);
  console.log('OK: Configuración, paso 08 «Borradores»');
} finally {
  await ivan.browser.close();
  await jaime.browser.close();
}
// Las respuestas con error las apunta el navegador en la consola como «Failed to load resource» sin
// la ruta: esas se comprueban arriba una a una (solo se aceptan los 409 de /api/borradores y las
// consultas de RPS/OF); aquí no se admite ningún otro error, y los fallos de la página (pageerror) cuentan.
assert.deepEqual(respuestasInesperadas, [], 'sin respuestas de error inesperadas del servidor (un 500 de /api/borradores falla la prueba)');
const errores = [...ivan.errors, ...jaime.errors].filter((e) => !/^Failed to load resource: the server responded with a status of (409|4\d\d|5\d\d)/.test(e));
assert.deepEqual(errores, [], 'sin errores de consola');
console.log('Borradores: OK');
