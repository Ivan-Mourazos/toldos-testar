// Prueba e2e del buscador de remolques en Pedidos (diseño 02/10/2026): siembra tres pedidos de
// remolques (uno generado) en la carpeta interna de su aislada, busca por la API y en pantalla (por
// cliente, por cremallera en cualquier lado y por largo con margen), abre un resultado, comprueba
// que la ficha del pedido sale con ese elemento elegido y vuelve al buscador con sus filtros.
// Va en su propia aislada, porque vacía la carpeta interna de remolques de esa aislada:
//   ISOLATED_DIR="$PWD/tmp/buscador" PORT=4314 FAKE_COORDINA_PORT=4324 bash .claude/skills/running-toldos-testar/start-isolated.sh
//   TOLDOS_ISOLATED_URL=http://127.0.0.1:4314 node scripts/test-remolques-buscador-e2e.mjs
// Capturas en tmp/ui-audit/buscador-remolques/ (claro y oscuro, 1280×720 y 1600×1000).
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { BASE_URL, openApp } from '../.claude/skills/running-toldos-testar/drive.mjs';
import { DEFAULT_PARAMS } from '../src/remolques/calc/params.ts';
import { crearPedidoRemolques, marcarPedidoGenerado } from '../src/remolques/flujo/pedido.ts';
import { prepararPedidoHoja } from '../src/remolques/hoja/pedido.ts';

const SALIDA = 'tmp/ui-audit/buscador-remolques';
fs.mkdirSync(SALIDA, { recursive: true });
assert.equal(new URL(BASE_URL).port, '4314', 'esta prueba va en su aislada de 4314: vacía la carpeta interna de remolques');
const CON_WEBGL = ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'];
const ANIO = String(new Date().getFullYear());
const AA = ANIO.slice(2);
const fixture = JSON.parse(fs.readFileSync('src/remolques/__fixtures__/produccion-2026-09.json', 'utf8'));
const json = (datos) => ({ method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(datos ?? {}) });
async function api(ruta, init) {
  const r = await fetch(`${BASE_URL}${ruta}`, init);
  return { status: r.status, datos: await r.json().catch(() => null) };
}
async function capturas(page, nombre) {
  for (const [width, height] of [[1280, 720], [1600, 1000]]) {
    await page.setViewportSize({ width, height });
    for (const tema of ['light', 'dark']) {
      await page.evaluate((t) => { document.documentElement.dataset.theme = t; }, tema);
      await page.waitForTimeout(500); // deja acabar la transición de colores
      await page.screenshot({ path: `${SALIDA}/${nombre}-${width}-${tema === 'light' ? 'claro' : 'oscuro'}.png` });
    }
  }
  await page.evaluate(() => { document.documentElement.dataset.theme = 'light'; });
  await page.setViewportSize({ width: 1600, height: 1000 });
}

// ── 1. Sembrar: tres pedidos con elementos reales de producción ──
function pedido(numero, cliente, fecha, casos) {
  const elementos = casos.map(([id, version, of]) => {
    const c = fixture.find((x) => x.caso === id);
    return { version, tipo: c.tipo, input: { ...c.input, cabecera: { ...c.input.cabecera, numeroPedido: numero, version, cliente, fecha, ordenFabricacion: of } } };
  });
  return crearPedidoRemolques({
    datos: prepararPedidoHoja(elementos, DEFAULT_PARAMS),
    autoria: { technician: 'IVÁN', reviewer: '' }, existente: null, ahora: `${fecha}T08:00:00.000Z`,
  });
}
// P1: lona 200 con goma detrás + baquetón; P2 (generado): lona 253 con cremallera detrás;
// P3: lona 150 con velcro (A) y lona 190 con cremallera detrás (B).
const P1 = pedido(`AR.${AA}.99701`, 'TALLERES CAL', `${ANIO}-09-28`, [['lona-02', '10', '0299701'], ['baqueton-01', '11', '0299702']]);
const P2 = marcarPedidoGenerado(pedido(`AR.${AA}.99702`, 'HIJOS DE PEDRO LOPEZ S.L.', `${ANIO}-09-29`, [['lona-08', '10', '0299703']]),
  { revisor: 'JAIME', ficheros: [], ahora: `${ANIO}-09-29T10:00:00.000Z` });
const P3 = pedido(`AR.${AA}.99703`, 'REMOLQUES AYALA', `${ANIO}-09-30`, [['lona-10', '10', '0299704'], ['lona-32', '11', '0299705']]);

const { settings: ajustes } = (await api('/api/workflow/settings')).datos;
const carpeta = path.resolve(String(ajustes.remolquesRevisionDirectory || ''));
assert.ok(carpeta.startsWith(`${path.resolve('tmp/buscador')}${path.sep}`), `la carpeta interna de remolques tiene que estar en tmp/buscador: «${carpeta}»`);
fs.mkdirSync(carpeta, { recursive: true });
for (const nombre of fs.readdirSync(carpeta)) if (nombre.toLowerCase().endsWith('.json')) fs.rmSync(path.join(carpeta, nombre));
for (const p of [P1, P2, P3]) fs.writeFileSync(path.join(carpeta, `${p.orderCode}.json`), `${JSON.stringify(p, null, 2)}\n`);

// ── 2. La API ──
const clave = (f) => `${f.orderCode}-${f.letra}`;
const todos = (await api('/api/remolques/buscar', json({}))).datos;
assert.equal(todos.total, 5);
assert.equal(todos.pedidos, 3);
assert.deepEqual(todos.filas.map(clave), [`${P3.orderCode}-A`, `${P3.orderCode}-B`, `${P2.orderCode}-A`, `${P1.orderCode}-A`, `${P1.orderCode}-B`]);
const cremallera = (await api('/api/remolques/buscar', json({ recogida: { nombre: 'CREMALLERA', lado: 'detras' } }))).datos;
assert.deepEqual(cremallera.filas.map(clave), [`${P3.orderCode}-B`, `${P2.orderCode}-A`]);
const mal = await api('/api/remolques/buscar', json({ medidas: { largo: { valor: 'x' } } }));
assert.equal(mal.status, 400);
assert.match(mal.datos.error, /largo/);
console.log('OK: la API busca en todos los pedidos guardados');

// ── 3. La pantalla ──
const { browser, page, errors } = await openApp({ width: 1600, height: 1000 }, { launchArgs: CON_WEBGL });
page.setDefaultTimeout(20000);
const inesperadas = [];
page.on('response', (r) => {
  const { pathname } = new URL(r.url());
  if (!pathname.startsWith('/api/') || r.status() < 400) return;
  if (/^\/api\/(coordina|remolques\/materiales)/.test(pathname)) return;
  inesperadas.push(`${r.status()} ${r.request().method()} ${pathname}`);
});
const contador = (texto) => page.locator('.buscador-contador', { hasText: texto });
const buscar = () => page.getByRole('button', { name: 'Buscar', exact: true }).click();
const quitar = () => page.getByRole('button', { name: 'Quitar filtros' }).click();

try {
  await page.getByRole('button', { name: /^Pedidos/ }).first().click();
  await page.getByRole('button', { name: 'Buscar remolques' }).click();
  await page.getByRole('heading', { name: 'Buscar remolques' }).waitFor();
  await contador('5 remolques en 3 pedidos').waitFor();
  await capturas(page, 'sin-filtros');
  console.log('OK: «Buscar remolques» abre el buscador con los más nuevos');

  await page.getByLabel('Cliente', { exact: true }).fill('pedro lopez');
  await buscar();
  await contador('1 remolque en 1 pedido').waitFor();
  console.log('OK: por cliente');

  await quitar();
  await contador('5 remolques en 3 pedidos').waitFor();
  await page.getByRole('combobox', { name: 'Recogida' }).click();
  await page.getByRole('option', { name: 'Cremallera', exact: true }).click();
  await buscar();
  await contador('2 remolques en 2 pedidos').waitFor();
  await capturas(page, 'cremallera');
  console.log('OK: por cremallera en cualquier lado');

  await quitar();
  await contador('5 remolques en 3 pedidos').waitFor();
  await page.getByLabel('Largo', { exact: true }).fill('195');
  await buscar();
  await contador('2 remolques en 2 pedidos').waitFor();
  await page.getByLabel('Margen de largo').fill('2');
  await buscar();
  await contador('Ningún remolque cumple estos filtros').waitFor();
  await capturas(page, 'sin-resultados');
  await page.getByLabel('Margen de largo').fill('');
  await buscar();
  await contador('2 remolques en 2 pedidos').waitFor();
  console.log('OK: por largo con margen (± 5 por defecto)');

  await page.getByRole('button', { name: `Abrir ${P3.numeroPedido} · B` }).click();
  await page.locator(`[aria-label="Pedido de remolques ${P3.orderCode}"]`).waitFor();
  const activa = page.locator('.rem-pestana-abrir[aria-current="true"] .rem-pestana-rotulo');
  assert.match(await activa.textContent(), /^B · /, 'el pedido se abre con el elemento buscado elegido');
  await capturas(page, 'pedido-abierto');
  await page.getByRole('button', { name: '← Buscar remolques' }).click();
  await contador('2 remolques en 2 pedidos').waitFor();
  assert.equal(await page.getByLabel('Largo', { exact: true }).inputValue(), '195', 'al volver, los filtros siguen');
  await page.getByRole('button', { name: '← Pedidos' }).click();
  await page.getByRole('button', { name: 'Buscar remolques' }).waitFor();
  console.log('OK: abrir un resultado con su elemento elegido y volver al buscador');

  assert.deepEqual(inesperadas, [], `respuestas de error inesperadas: ${inesperadas.join(', ')}`);
  assert.deepEqual(errors, [], `errores de la página: ${errors.join(' | ')}`);
} finally {
  await browser.close();
}
console.log('OK: buscador de remolques de punta a punta');
