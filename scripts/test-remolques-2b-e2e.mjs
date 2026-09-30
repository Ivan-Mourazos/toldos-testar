// Prueba e2e del render 3D de remolques y del modo «Según ganchos» (fase 2b). Con la aislada en
// marcha (puerto 4310), en un pedido de prueba que no existe en RPS:
//   1. Teclea a mano casos de la fixture de producción (src/remolques/__fixtures__/produccion-2026-09.json):
//      el primer caso de cada perfil de lona (TIPO 02, 03 y 05 salen de la fixture; TIPO 01 y TIPO 04
//      no aparecen en producción y se derivan de un caso real), uno con ventana, uno con bastilla
//      enfundar, dos baquetones y una lona por cada recogida que esos casos no usan (derivadas del
//      TIPO 01 cambiando «Delante»). Lo que salta a la vista de cada caso se compara con su `result`
//      (o con el cálculo, en los derivados) igual que en la e2e de la 2a.
//   2. En cada caso: el render pinta algo (el lienzo no está en blanco) en las cinco vistas, y
//      captura cada una en tmp/ui-audit/remolques-2b/.
//   3. Cotas: en «Delante» aparece el ancho de la lona hecha y, al apagarlas, desaparece la capa.
//      Los rótulos DELANTE y DETRÁS siguen en las vistas rectas sin cotas (en la 3/4, no).
//      Espejo: en «Delante», «Detrás» y «Lateral» la etiqueta del primer ollao (2,5) queda a la
//      izquierda de quien mira y la del último a su derecha.
//   4. Vista fija: girar la 3/4 con el ratón enseña «Volver a la vista fija», que la restituye.
//   5. Según ganchos: 300 × 200 × 100, TIPO 01, sin recogidas: los ollaos de delante, «Medido al
//      revés», el aviso de ganchos que bajan, lo que falta con un solo gancho y las cotas de ganchos.
//   6. Sin WebGL (Chromium con --disable-webgl) se ve el dibujo técnico con su aviso.
//   7. Claro y oscuro, a 1600×1000 y a 1280×720, de un caso con ventana y de un baquetón.
//   8. Ninguna sesión escribe errores en la consola.
//   9. three.js va aparte: no se pide en la primera carga y sí al abrir el primer elemento.
// Ejecutar con la aislada en marcha: node scripts/test-remolques-2b-e2e.mjs
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { BASE_URL, openApp } from '../.claude/skills/running-toldos-testar/drive.mjs';
import { calcLona } from '../src/remolques/calc/lona.ts';
import { DEFAULT_PARAMS } from '../src/remolques/calc/params.ts';
import { comprobarCaso, editor, elegir, filaOllaos, fmt, NOMBRE_PERFIL, num, siNo, teclearCaso } from './lib/remolques-e2e.mjs';

const CAPTURAS = 'tmp/ui-audit/remolques-2b';
fs.mkdirSync(CAPTURAS, { recursive: true });
const PEDIDO = 'AR.26.99995'; // no existe en RPS: los borradores cuelgan de él
// Chromium headless no siempre trae GPU: SwiftShader da un WebGL por software.
const CON_WEBGL = ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'];
const SIN_WEBGL = ['--disable-webgl', '--disable-3d-apis'];
const VISTAS = [['3/4', 'tres-cuartos'], ['Delante', 'delante'], ['Detrás', 'detras'], ['Lateral', 'lateral'], ['Arriba', 'arriba']];

// ── Casos ──
const fixture = JSON.parse(fs.readFileSync('src/remolques/__fixtures__/produccion-2026-09.json', 'utf8'));
const deFixture = (id) => {
  const c = fixture.find((x) => x.caso === id);
  assert.ok(c, `la fixture trae ${id}`);
  return c;
};
const primeroDe = (perfil) => fixture.find((c) => c.tipo === 'lona' && c.input.tipoPerfil === perfil);
const derivado = (caso, base, cambios) => {
  const input = { ...base.input, ...cambios };
  return { caso, tipo: 'lona', input, result: calcLona(input, DEFAULT_PARAMS) };
};

const tipo02 = primeroDe('TIPO 02');
const tipo03 = primeroDe('TIPO 03');
const tipo05 = primeroDe('TIPO 05');
assert.ok(tipo02 && tipo03 && tipo05, 'la fixture trae lonas de TIPO 02, 03 y 05');
const conVentana = fixture.find((c) => c.tipo === 'lona' && c.input.ventana);
assert.ok(conVentana, 'la fixture trae una lona con ventana');
// TIPO 01 (recto) y TIPO 04 (chaflanes) no aparecen entre los 32 casos reales.
const tipo01 = derivado('lona-tipo01', tipo02, { tipoPerfil: 'TIPO 01', aguas: 0 });
const tipo04 = derivado('lona-tipo04', tipo02, { tipoPerfil: 'TIPO 04', aguas: 0, chaflan: 30, radioChaflanAbajo: 0, radioChaflanArriba: 0 });
// Ninguno de los 32 casos lleva bastilla enfundar.
const conBastilla = derivado('lona-bastilla', tipo02, { bastillaEnfundar: true });
const baqueton01 = deFixture('baqueton-01');
const baqueton28 = deFixture('baqueton-28');

const elegidos = [tipo02, tipo03, tipo05];
const usadas = new Set(elegidos.flatMap((c) => [c.input.recogeDelante, c.input.recogeAtras]));
const recogidasNuevas = DEFAULT_PARAMS.recogidas.map((r) => r.nombre).filter((n) => !usadas.has(n));
assert.ok(recogidasNuevas.length > 0, 'hay recogidas que los casos elegidos no usan');
const porRecogida = recogidasNuevas.map((nombre) => derivado(`lona-recoge-${nombre.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`, tipo01, { recogeDelante: nombre }));

// Sin repetir: el primer TIPO 03 de la fixture ya lleva ventana.
const CASOS = [tipo02, tipo03, conVentana, tipo05, tipo01, tipo04, conBastilla, baqueton01, baqueton28, ...porRecogida]
  .filter((c, i, todos) => todos.findIndex((x) => x.caso === c.caso) === i)
  // E2E_CASOS=n: solo los n primeros, para depurar una parte sin esperar a todas (a mano, no en la prueba completa).
  .slice(0, Number(process.env.E2E_CASOS ?? Infinity));
const CASO_TEMAS = [conVentana, baqueton01];

// ── Ayudas ──
const dibujo = (page) => page.locator('section.rem-dibujo[aria-label="Dibujo del remolque"]');
const botonVista = (page, nombre) => dibujo(page).getByRole('group', { name: 'Vista' }).getByRole('button', { name: nombre, exact: true });
const botonCotas = (page) => dibujo(page).getByRole('button', { name: 'Cotas', exact: true });
const numeroEs = (t) => Number(t.replace(/\./g, '').replace(',', '.'));

/** Fracción del lienzo con algo pintado (transparente = nada), leída con drawImage. */
async function pintado(page) {
  return page.locator('.rem-render canvas').evaluate((c) => {
    const copia = document.createElement('canvas');
    copia.width = 64; copia.height = 40;
    const ctx = copia.getContext('2d');
    ctx.drawImage(c, 0, 0, 64, 40);
    const { data } = ctx.getImageData(0, 0, 64, 40);
    let opacos = 0;
    for (let i = 3; i < data.length; i += 4) if (data[i] > 0) opacos += 1;
    return opacos / (64 * 40);
  });
}

async function comprobarPintado(page, etiqueta) {
  let p = 0;
  for (let i = 0; i < 40 && p <= 0.05; i++) {
    p = await pintado(page);
    if (p <= 0.05) await page.waitForTimeout(250);
  }
  assert.ok(p > 0.05, `${etiqueta}: el render pinta algo (${p})`);
  return p;
}

async function irAVista(page, nombre) {
  await botonVista(page, nombre).click();
  assert.equal(await botonVista(page, nombre).getAttribute('aria-pressed'), 'true', `la vista ${nombre} queda marcada`);
  await page.waitForTimeout(250);
}

/** Cada etiqueta de ollao (o gancho) de la capa de cotas con su posición horizontal en pantalla. */
async function marcasEnPantalla(page) {
  return page.locator('.rem-render-cotas text.rem-render-marca')
    .evaluateAll((els) => els.map((e) => ({ texto: e.textContent.trim(), x: e.getBoundingClientRect().x })));
}

async function esperarMarcas(page, minimo, etiqueta) {
  let m = [];
  for (let i = 0; i < 20 && m.length < minimo; i++) {
    m = await marcasEnPantalla(page);
    if (m.length < minimo) await page.waitForTimeout(200);
  }
  assert.ok(m.length >= minimo, `${etiqueta}: hay al menos ${minimo} etiquetas (${m.length})`);
  return m;
}

/** El remolque está espejado en el mundo de three.js: el primer ollao (el de menor posición, casi siempre el 2,5) tiene que verse a la
 *  izquierda de quien mira y el último a su derecha, en delante, detrás y (de atrás a delante) lateral. */
async function comprobarEspejo(page, c) {
  const caso = c.caso;
  for (const [nombre, lado] of [['Delante', 'delante'], ['Detrás', 'atras'], ['Lateral', 'laterales']]) {
    await irAVista(page, nombre);
    const m = await esperarMarcas(page, 2, `${caso} ${nombre}`);
    const ordenadas = [...m].sort((a, b) => numeroEs(a.texto) - numeroEs(b.texto));
    const primera = ordenadas[0];
    const ultima = ordenadas.at(-1);
    const posiciones = c.result.reparto[lado];
    assert.equal(primera.texto, fmt(posiciones[0]), `${caso} ${nombre}: el primer ollao es el ${fmt(posiciones[0])}`);
    assert.equal(ultima.texto, fmt(posiciones.at(-1)), `${caso} ${nombre}: el último ollao es el ${fmt(posiciones.at(-1))}`);
    assert.ok(primera.x < ultima.x,
      `${caso} ${nombre}: el ${primera.texto} (x=${primera.x.toFixed(0)}) queda a la izquierda del ${ultima.texto} (x=${ultima.x.toFixed(0)})`);
  }
}

async function abrirRemolques(page) {
  await page.getByRole('button', { name: /^Remolques/ }).click();
  await page.getByLabel('Pedido', { exact: true }).fill(PEDIDO);
}

async function nuevoElemento(page, tipo) {
  await page.getByRole('button', { name: tipo === 'lona' ? '+ Remolque' : '+ Baquetón' }).click();
  await editor(page).waitFor();
}

/** Lo que dice la tabla de reparto de ollaos, por lado. */
async function tablaReparto(page) {
  const filas = await editor(page).locator('.rem-tabla tbody tr').all();
  const claves = ['laterales', 'atras', 'delante'];
  const reparto = {};
  for (const [n, clave] of claves.entries()) {
    const celdas = await filas[n].locator('td').allInnerTexts();
    celdas.pop(); // el total
    reparto[clave] = celdas.filter((t) => t !== '–').map(numeroEs);
  }
  return reparto;
}

/** Espera a que `leer()` dé `esperada` (el cálculo se rehace con una pausa de 150 ms). */
async function esperarIgual(page, leer, esperada, etiqueta) {
  let valor;
  for (let i = 0; i < 30; i++) {
    valor = await leer();
    if (JSON.stringify(valor) === JSON.stringify(esperada)) return;
    await page.waitForTimeout(150);
  }
  assert.deepEqual(valor, esperada, etiqueta);
}

const casillasGanchos = (page, nombre) => filaOllaos(page, editor(page), nombre).locator('.rem-ollaos-casillas input');
async function ponerGanchos(page, nombre, valores) {
  const casillas = casillasGanchos(page, nombre);
  for (const [n, v] of valores.entries()) await casillas.nth(n).fill(String(v));
}

// ── Parte 1: casos, vistas, cotas, vista fija, ganchos y errores ──
// La aislada corre con el servidor de desarrollo de Vite (módulos sueltos) y el despliegue con el
// build (trozos): en los dos casos se mira qué scripts pidió la página y cuáles llevan WebGLRenderer.
if (fs.existsSync('dist/assets')) {
  const trozos = fs.readdirSync('dist/assets')
    .filter((f) => f.endsWith('.js') && fs.readFileSync(`dist/assets/${f}`, 'utf8').includes('WebGLRenderer'));
  assert.equal(trozos.length, 1, `en el build WebGLRenderer va en un solo trozo (${trozos.join(', ')})`);
  assert.ok(!trozos[0].startsWith('index-'), `en el build three.js no va en el bundle principal (${trozos[0]})`);
  console.log(`OK: en el build, three.js va aparte (${trozos[0]})`);
}

{
  const { browser, page, errors } = await openApp({ width: 1600, height: 1000 }, { launchArgs: CON_WEBGL });
  page.setDefaultTimeout(15000);
  // Scripts que ha pedido la página hasta ahora y llevan el renderizador de three.js.
  const scriptsConThree = async () => {
    const urls = await page.evaluate(() => performance.getEntriesByType('resource').map((r) => r.name));
    const candidatos = urls.filter((u) => u.startsWith(BASE_URL) && /\.(m?js|tsx?)(\?|$)/.test(u) && !u.includes('pdf.worker'));
    const llevan = [];
    for (const u of candidatos) if ((await (await fetch(u)).text()).includes('WebGLRenderer')) llevan.push(u.replace(BASE_URL, ''));
    return llevan;
  };
  try {
    // 9. three.js aparte: nada en la primera carga.
    assert.deepEqual(await scriptsConThree(), [], 'la primera carga no pide three.js');
    await abrirRemolques(page);
    assert.deepEqual(await scriptsConThree(), [], 'abrir Remolques sin elemento no pide three.js');
    console.log('OK: three.js no se descarga al cargar ni al abrir Remolques');

    let primero = true;
    for (const c of CASOS) {
      await nuevoElemento(page, c.tipo);
      await teclearCaso(page, c);
      await comprobarCaso(page, c, '2b');
      await page.locator('.rem-render canvas').waitFor();
      if (primero) {
        const conThree = await scriptsConThree();
        assert.ok(conThree.length > 0, 'al abrir el primer elemento se pide three.js');
        console.log(`OK: three.js se descarga al abrir el primer elemento (${conThree.join(', ')})`);
        primero = false;
      }

      // 2. Cinco vistas: cada una pinta y se captura.
      for (const [nombre, archivo] of VISTAS) {
        await irAVista(page, nombre);
        await comprobarPintado(page, `${c.caso} ${nombre}`);
        await dibujo(page).screenshot({ path: `${CAPTURAS}/${c.caso}-${archivo}.png` });
      }

      // 3. Cotas: el ancho de la lona hecha (o del remolque hecho) en «Delante»; se apagan y se van.
      const ancho = c.tipo === 'lona' ? c.result.lonaHecha.ancho : c.result.remolqueHecho.ancho;
      await irAVista(page, 'Delante');
      await botonCotas(page).click();
      assert.equal(await botonCotas(page).getAttribute('aria-pressed'), 'true', `${c.caso}: Cotas queda pulsado`);
      const capa = page.locator('.rem-render-cotas');
      await capa.waitFor();
      const textos = await capa.locator('text').evaluateAll((els) => els.map((e) => e.textContent.trim()));
      assert.ok(textos.includes(fmt(ancho)), `${c.caso}: las cotas de delante llevan el ancho ${fmt(ancho)} (${textos.join(' | ')})`);
      await page.waitForTimeout(150);
      await dibujo(page).screenshot({ path: `${CAPTURAS}/${c.caso}-delante-cotas.png` });
      await comprobarEspejo(page, c);
      await irAVista(page, 'Arriba');
      await dibujo(page).screenshot({ path: `${CAPTURAS}/${c.caso}-arriba-cotas.png` });
      await irAVista(page, 'Lateral');
      await dibujo(page).screenshot({ path: `${CAPTURAS}/${c.caso}-lateral-cotas.png` });
      await irAVista(page, 'Delante');
      await botonCotas(page).click();
      assert.equal(await botonCotas(page).getAttribute('aria-pressed'), 'false', `${c.caso}: Cotas se suelta`);
      await capa.waitFor({ state: 'detached' });
      // DELANTE y DETRÁS se ven siempre en las vistas rectas, sin cotas; en la 3/4, no.
      const rotulos = () => page.locator('.rem-render-rotulos text').evaluateAll((els) => els.map((e) => e.textContent.trim()));
      assert.deepEqual(await rotulos(), ['DELANTE'], `${c.caso}: sin cotas, «Delante» lleva el rótulo DELANTE`);
      await irAVista(page, 'Lateral');
      assert.deepEqual(await rotulos(), ['DELANTE', 'DETRÁS'], `${c.caso}: el lateral rotula DELANTE y DETRÁS`);
      const [xDelante, xDetras] = await page.locator('.rem-render-rotulos text').evaluateAll((els) => els.map((e) => e.getBoundingClientRect().x));
      assert.ok(xDelante > xDetras, `${c.caso}: en el lateral DELANTE queda a la derecha (el frente) y DETRÁS a la izquierda`);
      await irAVista(page, 'Detrás');
      assert.deepEqual(await rotulos(), ['DETRÁS'], `${c.caso}: «Detrás» lleva el rótulo DETRÁS`);

      // 4. Vista fija: girar la 3/4 y volver.
      await irAVista(page, '3/4');
      assert.equal(await page.locator('.rem-render-rotulos').count(), 0, `${c.caso}: la 3/4 no lleva rótulos`);
      const volver = dibujo(page).getByRole('button', { name: 'Volver a la vista fija', exact: true });
      assert.equal(await volver.count(), 0, `${c.caso}: sin girar no hay «Volver a la vista fija»`);
      const caja = await page.locator('.rem-render canvas').boundingBox();
      await page.mouse.move(caja.x + caja.width / 2, caja.y + caja.height / 2);
      await page.mouse.down();
      await page.mouse.move(caja.x + caja.width / 2 + 120, caja.y + caja.height / 2 - 40, { steps: 8 });
      await page.mouse.up();
      await volver.waitFor();
      await comprobarPintado(page, `${c.caso} 3/4 girada`);
      if (c.caso === CASOS[0].caso) await dibujo(page).screenshot({ path: `${CAPTURAS}/${c.caso}-tres-cuartos-girada.png` });
      await volver.click();
      await volver.waitFor({ state: 'detached' });
      await comprobarPintado(page, `${c.caso} 3/4 restituida`);
      console.log(`OK: ${c.caso}: cinco vistas pintadas, cotas, espejo y vista fija`);
    }

    // ── 5. Según ganchos ──
    await nuevoElemento(page, 'lona');
    const ed = editor(page);
    await elegir(page, ed, 'tipoPerfil', NOMBRE_PERFIL['TIPO 01']);
    await elegir(page, ed, 'recogeDelante', 'NO');
    await elegir(page, ed, 'recogeAtras', 'NO');
    await num(ed, 'largo', 300);
    await num(ed, 'ancho', 200);
    await num(ed, 'altoDelante', 100);
    await num(ed, 'cantidad', 1);
    await num(ed, 'contorno', 700);
    await siNo(ed, 'Bastilla enfundar', false);
    await siNo(ed, 'Ventana', false);
    await siNo(ed, 'Rotulación', false);
    await ed.locator('textarea[data-campo="material"]').fill(tipo02.input.material);
    await page.keyboard.press('Escape');
    await elegir(page, ed, 'modoOllaos', 'Según ganchos');
    await page.getByRole('heading', { name: 'Ganchos del pedido' }).waitFor();
    assert.equal(await ed.getByRole('group', { name: 'Ollaos en los extremos', exact: true }).getByRole('button', { name: 'Sí', exact: true }).getAttribute('aria-pressed'), 'true',
      'los ollaos en los extremos van puestos por defecto');

    const tablaDelante = [2.5, 35.5, 85.5, 135.5, 198.5];
    await ponerGanchos(page, 'DELANTE', [10, 60, 110, 160]);
    await esperarIgual(page, async () => (await tablaReparto(page)).delante, tablaDelante, 'delante 10, 60, 110, 160 → ollaos 2,5 · 35,5 · 85,5 · 135,5 · 198,5');
    console.log('OK: ganchos de delante 10 · 60 · 110 · 160 → ollaos 2,5 · 35,5 · 85,5 · 135,5 · 198,5');

    // Medido al revés: 40, 90, 140, 190 con M = 200 son los mismos ganchos.
    await filaOllaos(page, ed, 'DELANTE').getByRole('checkbox', { name: 'Medido al revés' }).check();
    await ponerGanchos(page, 'DELANTE', [40, 90, 140, 190]);
    await esperarIgual(page, async () => (await tablaReparto(page)).delante, tablaDelante, 'delante al revés 40, 90, 140, 190 → la misma tabla');
    console.log('OK: «Medido al revés» con 40 · 90 · 140 · 190 da la misma tabla de delante');

    // Detrás va bajando: aviso, no bloqueo.
    await ponerGanchos(page, 'ATRÁS', [160, 110, 60, 10]);
    const avisos = ed.locator('.rem-ganchos-avisos');
    await avisos.getByText(/Los ganchos de atrás van bajando/).waitFor();
    console.log(`OK: aviso «${(await avisos.innerText()).replace(/\s+/g, ' ').trim()}»`);

    // Laterales con un solo gancho: falta.
    await ponerGanchos(page, 'LATERALES', [5]);
    let estado = '';
    for (let i = 0; i < 20; i++) {
      estado = (await ed.locator('.rem-editor-estado').innerText()).trim();
      if (/^Falta:/.test(estado)) break;
      await page.waitForTimeout(150);
    }
    assert.match(estado, /^Falta:.*ganchos/i, 'con un solo gancho en laterales el estado dice qué falta');
    console.log(`OK: con un gancho en laterales, «${estado}»`);

    // Cotas: en «Delante» las etiquetas de los ganchos del pedido.
    await esperarIgual(page, async () => (await tablaReparto(page)).delante, tablaDelante, 'la tabla de delante sigue igual');
    await page.locator('.rem-render canvas').waitFor();
    await comprobarPintado(page, 'ganchos');
    await irAVista(page, 'Delante');
    await botonCotas(page).click();
    const etiquetas = (await esperarMarcas(page, 9, 'ganchos delante')).map((m) => m.texto);
    for (const g of ['10,5', '60,5', '110,5', '160,5']) assert.ok(etiquetas.includes(g), `el gancho ${g} se rotula en delante (${etiquetas.join(' | ')})`);
    for (const o of ['2,5', '35,5', '85,5', '135,5', '198,5']) assert.ok(etiquetas.includes(o), `el ollao ${o} se rotula en delante (${etiquetas.join(' | ')})`);
    await dibujo(page).screenshot({ path: `${CAPTURAS}/ganchos-delante-cotas.png` });
    for (const [nombre, archivo] of VISTAS) {
      await irAVista(page, nombre);
      await dibujo(page).screenshot({ path: `${CAPTURAS}/ganchos-${archivo}.png` });
    }
    console.log(`OK: con cotas, delante rotula los ganchos 10,5 · 60,5 · 110,5 · 160,5 junto a sus ollaos (${etiquetas.join(' · ')})`);

    // 8. Sin errores de consola.
    assert.deepEqual(errors, [], 'sin errores de consola en la sesión del render');
  } finally {
    await browser.close();
  }
}

// ── 6. Sin WebGL: el dibujo técnico de siempre ──
{
  const { browser, page, errors } = await openApp({ width: 1600, height: 1000 }, { launchArgs: SIN_WEBGL });
  page.setDefaultTimeout(15000);
  try {
    await abrirRemolques(page);
    await nuevoElemento(page, 'lona');
    await teclearCaso(page, tipo03);
    await comprobarCaso(page, tipo03, 'sin WebGL');
    assert.ok(await dibujo(page).locator('svg').first().isVisible(), 'sin WebGL se ve el dibujo técnico');
    await dibujo(page).getByText('Este equipo no puede mostrar el 3D: se ve el dibujo técnico.', { exact: true }).waitFor();
    assert.equal(await page.locator('.rem-render canvas').count(), 0, 'sin WebGL no hay lienzo del render');
    assert.equal(await botonCotas(page).count(), 0, 'sin WebGL no hay pestañas de vista ni cotas');
    await dibujo(page).screenshot({ path: `${CAPTURAS}/sin-webgl-${tipo03.caso}.png` });
    console.log('OK: sin WebGL se ve el dibujo técnico con su aviso');
    assert.deepEqual(errors, [], 'sin errores de consola sin WebGL');
  } finally {
    await browser.close();
  }
}

// ── 7. Claro y oscuro, a 1600×1000 y a 1280×720 ──
for (const tema of ['claro', 'oscuro']) {
  for (const viewport of [{ width: 1600, height: 1000 }, { width: 1280, height: 720 }]) {
    const { browser, page, errors } = await openApp(viewport, { launchArgs: CON_WEBGL });
    page.setDefaultTimeout(15000);
    const sufijo = `${tema}-${viewport.width}x${viewport.height}`;
    try {
      if (tema === 'oscuro') {
        await page.evaluate(() => localStorage.setItem('toldos-tema', 'dark'));
        await page.reload();
        await page.getByRole('button', { name: 'Nuevo pedido', exact: true }).waitFor();
        assert.equal(await page.evaluate(() => document.documentElement.getAttribute('data-theme')), 'dark', 'el tema oscuro está puesto');
      }
      await abrirRemolques(page);
      for (const c of CASO_TEMAS) {
        await nuevoElemento(page, c.tipo);
        await teclearCaso(page, c);
        await comprobarPintado(page, `${c.caso} ${sufijo}`);
        for (const [nombre, archivo] of VISTAS) {
          await irAVista(page, nombre);
          await comprobarPintado(page, `${c.caso} ${nombre} ${sufijo}`);
          await dibujo(page).screenshot({ path: `${CAPTURAS}/${c.caso}-${sufijo}-${archivo}.png` });
        }
        await irAVista(page, '3/4');
        await botonCotas(page).click();
        await page.locator('.rem-render-cotas').waitFor();
        await dibujo(page).screenshot({ path: `${CAPTURAS}/${c.caso}-${sufijo}-tres-cuartos-cotas.png` });
        await page.screenshot({ path: `${CAPTURAS}/${c.caso}-${sufijo}-pagina.png` });
        await botonCotas(page).click();
      }
      assert.deepEqual(errors, [], `sin errores de consola (${sufijo})`);
      console.log(`OK: ${sufijo}: ${CASO_TEMAS.map((c) => c.caso).join(' y ')} pintados en las cinco vistas`);
    } finally {
      await browser.close();
    }
  }
}
console.log('test-remolques-2b-e2e OK');
