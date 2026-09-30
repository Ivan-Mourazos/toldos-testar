// Prueba e2e de la hoja de taller de remolques (fase 4) y muestras para Iván. Con la aislada en
// marcha (puerto 4310):
//   1. POST /api/remolques/pdf con cada muestra (src/remolques/hoja/muestras.ts): lona con ventana,
//      baquetón, «Según ganchos», bastilla, los cinco perfiles, un pedido de tres elementos, el sesgado
//      y la cremallera delante y detrás (con aguas, ventana y observaciones de varias líneas). Cada
//      PDF: una hoja A4 apaisada por elemento, con los textos que da paginaHoja (pdfjs), en menos
//      (el límite de 30 s lo vigila el servidor). Cada hoja se pasa además a PNG en grises, como la imprimiría el taller.
//   2. Errores claros: un elemento incompleto → 400 con cuál y qué le falta; dos pedidos → 400.
//   3. En la pantalla: «Vista previa del PDF» desactivado con lo que falta; con el remolque completo
//      abre el visor con «Página 1 de 1» y Esc lo cierra; sin errores de consola.
//   3c. Un pedido real de RPS (AR.26.04414, solo lectura) obtenido en la pantalla crea sus 4
//      elementos de una vez (Iván, 30/09/2026); con el baquetón A completo, la hoja lleva su OF,
//      su cliente y sus medidas de RPS.
//   4. El PDF viejo del mismo pedido: busca en la web vieja (solo GET) el pedido real de los casos de
//      la fixture usados en las muestras y hace el PDF nuevo de ese pedido entero; con PDF_VIEJOS_DIR
//      (la carpeta OFICINA TÉCNICA de la web vieja, solo lectura) copia al lado el PDF viejo.
// Ejecutar con la aislada en marcha: node scripts/test-remolques-4-e2e.mjs
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { isDeepStrictEqual } from 'node:util';
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs';
import { BASE_URL, openApp } from '../.claude/skills/running-toldos-testar/drive.mjs';
import { muestrasHoja, NOMBRES_MUESTRAS } from '../src/remolques/hoja/muestras.ts';
import { lineasObservaciones } from '../src/remolques/hoja/observaciones.ts';
import { paginaHoja } from '../src/remolques/hoja/pagina.ts';
import { prepararPedidoHoja } from '../src/remolques/hoja/pedido.ts';
import { remolquesUnicos } from '../src/remolques/pedidos/agrupar-pedido.ts';
import { normalizarNumeroPedido } from '../src/remolques/pedidos/numero-pedido.ts';
import { anioDelPlanteamiento, nombrePdf } from '../src/remolques/salida/nombre-pdf.ts';
import { claveBorradores } from '../src/remolques/workspace/borradores-locales.ts';
import { editor, elegir, teclearCaso } from './lib/remolques-e2e.mjs';

const SALIDA = 'tmp/ui-audit/remolques-4/final';
fs.mkdirSync(SALIDA, { recursive: true });
const CON_WEBGL = ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'];
const fixture = JSON.parse(fs.readFileSync('src/remolques/__fixtures__/produccion-2026-09.json', 'utf8'));
const muestras = muestrasHoja(fixture);
const params = await (await fetch(`${BASE_URL}/api/remolques/parametros`)).json();
const sinEspacios = (t) => t.replace(/\s+/g, '');

async function pedirPdf(elementos) {
  const inicio = Date.now();
  const r = await fetch(`${BASE_URL}/api/remolques/pdf`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ elementos }),
  });
  return { status: r.status, tipo: r.headers.get('content-type') ?? '', cuerpo: Buffer.from(await r.arrayBuffer()), ms: Date.now() - inicio };
}

async function leerPdf(bytes) {
  const doc = await getDocument({ data: new Uint8Array(bytes) }).promise;
  const paginas = [];
  for (let n = 1; n <= doc.numPages; n++) {
    const p = await doc.getPage(n);
    const { width, height } = p.getViewport({ scale: 1 });
    paginas.push({ width, height, texto: (await p.getTextContent()).items.map((i) => i.str).join(' ') });
  }
  return { doc, paginas };
}

/** Cada hoja a PNG en color y en grises (luminancia), como la sacaría la impresora de blanco y negro. */
async function aPngs(doc, base) {
  for (let n = 1; n <= doc.numPages; n++) {
    const p = await doc.getPage(n);
    const viewport = p.getViewport({ scale: 2 });
    const { canvas, context } = doc.canvasFactory.create(viewport.width, viewport.height);
    await p.render({ canvas, canvasContext: context, viewport }).promise;
    fs.writeFileSync(`${base}-hoja${n}-color.png`, canvas.toBuffer('image/png'));
    const img = context.getImageData(0, 0, canvas.width, canvas.height);
    for (let i = 0; i < img.data.length; i += 4) {
      const g = Math.round(0.299 * img.data[i] + 0.587 * img.data[i + 1] + 0.114 * img.data[i + 2]);
      img.data[i] = g; img.data[i + 1] = g; img.data[i + 2] = g;
    }
    context.putImageData(img, 0, 0);
    fs.writeFileSync(`${base}-hoja${n}-grises.png`, canvas.toBuffer('image/png'));
  }
}

function comprobarTextos(nombre, leido, esperadas) {
  assert.equal(leido.paginas.length, esperadas.length, `${nombre}: una hoja por elemento`);
  for (const [n, p] of leido.paginas.entries()) {
    assert.equal(Math.round(p.width), 842, `${nombre} hoja ${n + 1}: A4 apaisado (ancho)`);
    assert.equal(Math.round(p.height), 595, `${nombre} hoja ${n + 1}: A4 apaisado (alto)`);
    const e = esperadas[n];
    // Un cliente de nombre largo se corta con «…» en una sola línea: basta con que salga el principio.
    const textos = [
      e.titulo, e.cabecera.numeroPedido, e.cabecera.cliente.length > 40 ? e.cabecera.cliente.slice(0, 30) : e.cabecera.cliente, e.cabecera.of, e.cabecera.fecha, 'REVISADO POR',
      ...e.banda.map((c) => c.titulo), ...e.banda[0].lineas, e.material,
      e.ollaos.titulo, ...e.ollaos.filas.map((f) => f.nombre),
      ...(e.ganchos ? [e.ganchos.titulo, ...e.ganchos.filas.map((f) => f.nombre)] : []),
      // Una observación por línea, numeradas (Iván, 30/09/2026).
      ...lineasObservaciones(e.observaciones === '—' ? '' : e.observaciones).map((linea, i) => `${i + 1}.${linea}`),
      // La recogida de cada cara al pie de su vista, en las lonas.
      ...(e.notasVistas ? [e.notasVistas.delante, e.notasVistas.detras] : []),
    ];
    for (const t of textos) assert.ok(sinEspacios(p.texto).includes(sinEspacios(t)), `${nombre} hoja ${n + 1}: sale «${t}»`);
  }
}

// ── 1. Las muestras ──
for (const nombre of NOMBRES_MUESTRAS) {
  const pdf = await pedirPdf(muestras[nombre]);
  assert.equal(pdf.status, 200, `${nombre}: ${pdf.cuerpo.toString('utf8').slice(0, 300)}`);
  assert.equal(pdf.tipo, 'application/pdf');
  const base = `${SALIDA}/muestra-${nombre}`;
  fs.writeFileSync(`${base}.pdf`, pdf.cuerpo);
  const leido = await leerPdf(pdf.cuerpo);
  const datos = prepararPedidoHoja(muestras[nombre], params);
  comprobarTextos(nombre, leido, datos.elementos.map((e, i) => paginaHoja(e, i, datos.elementos.length, params)));
  await aPngs(leido.doc, base);
  console.log(`OK: ${nombre}, ${leido.paginas.length} hoja(s) en ${pdf.ms} ms`);
}

// ── 2. Errores claros ──
{
  const [lona] = muestras['lona-ventana'];
  const incompleto = await pedirPdf([{ ...lona, input: { ...lona.input, altoDelante: 0 } }]);
  assert.equal(incompleto.status, 400);
  assert.equal(JSON.parse(incompleto.cuerpo.toString('utf8')).error, 'Remolque 1: Introduce el alto delantero.');
  const mezclado = await pedirPdf([lona, { ...muestras.baqueton[0], version: '11' }]);
  assert.equal(mezclado.status, 400);
  assert.equal(JSON.parse(mezclado.cuerpo.toString('utf8')).error, 'Todos los elementos de la hoja tienen que ser del mismo pedido.');
  // Una ficha que no existe (o ya se leyó) no da datos: 404.
  const ficha = await fetch(`${BASE_URL}/api/remolques/hoja/${randomUUID()}`);
  assert.equal(ficha.status, 404, 'una ficha desconocida da 404');
  console.log('OK: errores claros');
}

// ── 3. En la pantalla ──
{
  const { browser, page, errors } = await openApp({ width: 1600, height: 1000 }, { launchArgs: CON_WEBGL });
  page.setDefaultTimeout(20000);
  await page.getByRole('button', { name: /^Remolques/ }).click();
  await page.getByLabel('Pedido', { exact: true }).fill('AR.26.99989');
  await page.getByRole('button', { name: '+ Remolque' }).click();
  await editor(page).waitFor();
  const boton = page.getByRole('button', { name: 'Vista previa del PDF' });
  assert.equal(await boton.isDisabled(), true, 'el botón empieza desactivado');
  assert.match(await page.locator('.rem-pdf-falta').innerText(), /^Para la vista previa del PDF falta: A · Remolque/);
  await teclearCaso(page, fixture.find((c) => c.caso === 'lona-02'));
  await page.locator('.rem-pdf-falta').waitFor({ state: 'detached' });
  assert.equal(await boton.isEnabled(), true, 'con el remolque completo se puede pedir');
  await boton.click();
  await page.locator('.pdf-preview-window').getByText('Página 1 de 1').waitFor({ timeout: 60000 });
  await page.screenshot({ path: `${SALIDA}/pantalla-vista-previa.png` });
  await page.keyboard.press('Escape');
  await page.locator('.pdf-preview-window').waitFor({ state: 'detached' });
  assert.deepEqual(errors, [], 'sin errores de consola');
  await browser.close();
  console.log('OK: botón y visor en la pantalla');
}

// ── 3c. Un pedido obtenido de RPS llega a la hoja con sus datos ──
{
  const PEDIDO_MIXTO = 'AR.26.04414';
  const rps = await fetch(`${BASE_URL}/api/remolques/rps-pedido?numero=${PEDIDO_MIXTO}`).then((r) => (r.ok ? r.json() : null)).catch(() => null);
  const lineasRps = rps?.pedido?.lineas ?? [];
  if (lineasRps.length !== 4) {
    console.log(`SALTADO: RPS no trae las 4 líneas de ${PEDIDO_MIXTO} en la aislada (${lineasRps.length})`);
  } else {
    const { browser, page, errors } = await openApp({ width: 1600, height: 1000 }, { launchArgs: CON_WEBGL });
    page.setDefaultTimeout(20000);
    await page.getByRole('button', { name: /^Remolques/ }).click();
    await page.getByLabel('Pedido', { exact: true }).fill(PEDIDO_MIXTO);
    await page.waitForFunction(() => document.querySelectorAll('.rem-pestana-abrir').length === 4);
    assert.match((await page.locator('.rem-pestana-abrir').allInnerTexts())[0], /^A · Baquetón 260×160/, 'el primero es el baquetón de la línea 1');
    // Solo el baquetón A: se quitan los demás (del último al segundo, cada uno con su confirmación).
    for (const letra of ['D', 'C', 'B']) {
      await page.getByRole('button', { name: new RegExp(`^Eliminar ${letra} · .* del pedido`) }).click();
      const dialogo = page.getByRole('alertdialog');
      await dialogo.getByRole('button', { name: 'Eliminar', exact: true }).click();
      await dialogo.waitFor({ state: 'hidden' });
    }
    assert.equal(await page.locator('.rem-pestana-abrir').count(), 1, 'queda el baquetón A');
    // Lo único que RPS no da de este baquetón es el reparto de ollaos.
    await elegir(page, editor(page), 'modoOllaos', 'Repartidos automáticamente');
    await page.locator('.rem-pdf-falta').waitFor({ state: 'detached' });
    const boton = page.getByRole('button', { name: 'Vista previa del PDF' });
    await boton.click();
    await page.locator('.pdf-preview-window').getByText('Página 1 de 1').waitFor({ timeout: 60000 });
    await page.keyboard.press('Escape');
    await page.locator('.pdf-preview-window').waitFor({ state: 'detached' });
    await page.waitForTimeout(900);
    const borrador = JSON.parse(await page.evaluate((clave) => localStorage.getItem(clave), claveBorradores(PEDIDO_MIXTO)));
    const elementos = borrador.lineas.map(({ version, tipo, input }) => ({ version, tipo, input }));
    assert.equal(elementos.length, 1, 'el borrador guarda el baquetón');
    assert.equal(elementos[0].input.cabecera.ordenFabricacion, lineasRps[0].ordenFabricacion, 'la OF es la de RPS');
    const pdf = await pedirPdf(elementos);
    assert.equal(pdf.status, 200, pdf.cuerpo.toString('utf8').slice(0, 300));
    const leido = await leerPdf(pdf.cuerpo);
    const datos = prepararPedidoHoja(elementos, params);
    comprobarTextos('pedido de RPS', leido, datos.elementos.map((e, i) => paginaHoja(e, i, datos.elementos.length, params)));
    for (const t of [lineasRps[0].ordenFabricacion, 'TALLERES SANTABALLA', PEDIDO_MIXTO]) {
      assert.ok(sinEspacios(leido.paginas[0].texto).includes(sinEspacios(t)), `la hoja del pedido de RPS lleva «${t}»`);
    }
    fs.writeFileSync(`${SALIDA}/pedido-rps-${normalizarNumeroPedido(PEDIDO_MIXTO)}.pdf`, pdf.cuerpo);
    assert.deepEqual(errors, [], 'sin errores de consola');
    await browser.close();
    console.log(`OK: ${PEDIDO_MIXTO} obtenido de RPS: 4 elementos de una vez y la hoja del baquetón con su OF y su cliente`);
  }
}

// ── 3b. La vista previa no archiva nada ──
for (const carpeta of ['rem-plan', 'rem-oficina']) {
  const dentro = fs.readdirSync(path.join('tmp', 'ui-audit', carpeta), { recursive: true }).filter((f) => !fs.statSync(path.join('tmp', 'ui-audit', carpeta, f)).isDirectory());
  assert.deepEqual(dentro, [], `tras las vistas previas, tmp/ui-audit/${carpeta} sigue sin ficheros`);
}
console.log('OK: las vistas previas no dejan ficheros en las carpetas de archivo');

// ── 4. El PDF viejo del mismo pedido ──
{
  const VIEJA = process.env.REMOLQUES_VIEJA_URL || 'http://192.168.0.90:4500';
  const sinCabecera = ({ cabecera: _cabecera, ...resto }) => resto;
  let registros = null;
  try {
    const r = await fetch(`${VIEJA}/api/planteamientos`, { signal: AbortSignal.timeout(10000) });
    if (r.ok) registros = await r.json();
  } catch { /* sin red a la web vieja */ }
  if (!registros) {
    console.log(`AVISO: no se pudo leer ${VIEJA}/api/planteamientos: pide a Iván los PDF viejos de los pedidos de lona-02, baqueton-01, baqueton-04 y lona-03.`);
  } else {
    const pedidos = new Map();
    for (const id of ['lona-02', 'baqueton-01', 'baqueton-04', 'lona-03']) {
      const caso = fixture.find((c) => c.caso === id);
      const rec = registros.find((x) => x.tipo === caso.tipo && isDeepStrictEqual(sinCabecera(x.input), sinCabecera(caso.input)));
      if (!rec) { console.log(`AVISO: ${id} no aparece en la web vieja.`); continue; }
      const numero = normalizarNumeroPedido(rec.numeroPedido);
      pedidos.set(numero, [...(pedidos.get(numero) ?? []), id]);
    }
    for (const [numero, ids] of pedidos) {
      const delPedido = remolquesUnicos(registros.filter((x) => normalizarNumeroPedido(x.numeroPedido) === numero));
      const pdf = await pedirPdf(delPedido.map((x) => ({ version: x.version, tipo: x.tipo, input: x.input })));
      const base = `${SALIDA}/pedido-${numero}`;
      assert.ok(pdf.status < 500, `${numero}: el pedido real no puede dar un fallo del servidor (${pdf.status}: ${pdf.cuerpo.toString('utf8').slice(0, 300)})`);
      if (pdf.status !== 200) { console.log(`AVISO: ${numero} (${ids.join(', ')}): ${pdf.cuerpo.toString('utf8')}`); continue; }
      fs.writeFileSync(`${base}-nuevo.pdf`, pdf.cuerpo);
      await aPngs((await leerPdf(pdf.cuerpo)).doc, `${base}-nuevo`);
      const anio = anioDelPlanteamiento(numero, '');
      const viejoNombre = nombrePdf(numero).replace(/-10\.pdf$/, '.pdf');
      const viejo = process.env.PDF_VIEJOS_DIR ? path.join(process.env.PDF_VIEJOS_DIR, String(anio), viejoNombre) : null;
      if (!viejo && fs.existsSync(`${base}-viejo.pdf`)) await aPngs((await leerPdf(fs.readFileSync(`${base}-viejo.pdf`))).doc, `${base}-viejo`);
      if (viejo && fs.existsSync(viejo)) {
        fs.copyFileSync(viejo, `${base}-viejo.pdf`);
        await aPngs((await leerPdf(fs.readFileSync(`${base}-viejo.pdf`))).doc, `${base}-viejo`);
        console.log(`OK: ${numero} (${ids.join(', ')}): nuevo y viejo en ${base}-*.pdf`);
      } else {
        console.log(`${numero} (${ids.join(', ')}): nuevo en ${base}-nuevo.pdf; el viejo está en OFICINA TÉCNICA/${anio}/${viejoNombre}`);
      }
    }
  }
}

console.log('Hoja de taller de remolques: todo bien.');
