// Página de estructura en HTML: comprobación de punta a punta en una instancia aislada ya arrancada.
// Para cada caso pide el PDF, mide el tiempo, mira con pdfjs las páginas de estructura (las A5
// que no son del HERA) y quién las imprimió (Chromium o pdfkit), y las captura en la vista
// previa de Nuevo pedido.
//
// Con la página en HTML (lo normal):
//   ISOLATED_DIR="$PWD/tmp/tarea4-estructura/html" PORT=4312 FAKE_COORDINA_PORT=4322 bash .claude/skills/running-toldos-testar/start-isolated.sh
//   TOLDOS_ISOLATED_URL=http://127.0.0.1:4312 node scripts/test-hoja-estructura-e2e.mjs
// Con ESTRUCTURA_HTML=0 (la de pdfkit, para comparar; capturas «antes-<caso>.png»):
//   ESTRUCTURA_HTML=0 ISOLATED_DIR="$PWD/tmp/tarea4-estructura/pdfkit" PORT=4314 FAKE_COORDINA_PORT=4324 bash .claude/skills/running-toldos-testar/start-isolated.sh
//   TOLDOS_ISOLATED_URL=http://127.0.0.1:4314 HOJA_ESPERADA=pdfkit node scripts/test-hoja-estructura-e2e.mjs
// Respaldo (Chromium que no arranca: PLAYWRIGHT_BROWSERS_PATH a una carpeta vacía de tmp/ al
// arrancar la instancia): todo sale con pdfkit, también la hoja de telas.
//   TOLDOS_ISOLATED_URL=http://127.0.0.1:4316 HOJA_ESPERADA=pdfkit TELAS_ESPERADA=pdfkit PREFIJO=respaldo- CAPTURAS=0 node scripts/test-hoja-estructura-e2e.mjs
//
// CASOS=arzua,cuatro limita los casos. REPETICIONES (5 por defecto) son las peticiones que se
// miden en cada caso; antes va una de calentamiento que no cuenta. CAPTURAS=0 no abre la vista
// previa. Cada pasada deja «<prefijo><caso>.paginas.json» con el tamaño de sus páginas y lo
// compara con el de la otra pasada (html ↔ antes-), si está.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs';
import { BASE_URL, openApp } from '../.claude/skills/running-toldos-testar/drive.mjs';
import { normalizeOrder } from '../src/domain/validation.js';

const esperada = process.env.HOJA_ESPERADA || 'html';
assert.ok(['html', 'pdfkit'].includes(esperada), 'HOJA_ESPERADA tiene que ser html o pdfkit');
const telasEsperada = process.env.TELAS_ESPERADA || 'html';
assert.ok(['html', 'pdfkit'].includes(telasEsperada), 'TELAS_ESPERADA tiene que ser html o pdfkit');
const prefijo = process.env.PREFIJO ?? (esperada === 'pdfkit' ? 'antes-' : '');
const repeticiones = Number(process.env.REPETICIONES || 5);
const conCapturas = process.env.CAPTURAS !== '0';
const LIMITE_MS = 2000;
const salida = 'tmp/ui-audit/estructura-html';
fs.mkdirSync(salida, { recursive: true });

const health = await fetch(`${BASE_URL}/api/health`).then((r) => r.json());
assert.equal(health.simulationMode, true, 'la instancia tiene que estar en simulación');
assert.equal(health.fileWritesEnabled, false, 'la instancia no puede escribir ficheros');
assert.notEqual(new URL(BASE_URL).port, '4400', 'nunca contra la instancia real');

const acrNegro = 'ACRILI2170P120|||120|||LONA ACRILICA NEGRA|||ACR';
const acrAzul = 'ACRILI2018P120|||120|||ACR AZUL';
const LINEAS_NOTAS = 40;
const linea = (n) => `NOTA ${String(n).padStart(2, '0')}`;
const notasLargas = Array.from({ length: LINEAS_NOTAS }, (_, i) =>
  `${linea(i + 1)} COMPROBAR LA MEDIDA Y EL MONTAJE EN OBRA`).join('\n');

const pedido = (extra) => ({
  customer: 'COMPROBACIÓN HOJA DE ESTRUCTURA', technician: 'IVÁN', reviewer: 'JAIME', orderDate: '2026-10-03',
  sameFabric: true, structureColor: 'BLANCO', remate: 'COMO TELA', rotTela: 'NO', rotBamba: 'NO', ...extra
});
// Lo que el formulario pide a cualquier toldo completo.
const comun = {
  units: 1, valanceHeight: 0, wallType: '', sensor: 'SIN SENSOR', rotFabric: 'NO', rotValance: 'NO',
  crankHeight: 150, machineSide: 'M.F.DER', structureColor: 'BLANCO'
};
// Caso de referencia AR2603332 (SKILL.md): 337 × 225, bamba 30, 2 brazos, EVO 80, motor, frontal.
const arzua = {
  id: 'a', of: '0230194', model: 'ARZUA PRO', units: 1, width: 337, projection: 225, valanceHeight: 30, armCount: 2,
  tubeLoad: 'TUBO DE CARGA EVO 80', structureColor: 'BLANCO', device: 'MOTOR', sensor: 'SIN SENSOR',
  machineSide: 'M.F.DER', placement: 'FRONTAL', valanceCurve: 'RECTA', rotFabric: 'NO', rotValance: 'NO'
};
const cortina = {
  id: 'a', of: '0232626', model: 'CORTINA', units: 1, width: 200, projection: 275,
  valanceHeight: 20, valanceCurve: 'RECTA', remate: 'COMO TELA', structureColor: 'BLANCO', rotFabric: 'NO', rotValance: 'NO',
  device: 'MAQ. INTERIOR', crankHeight: 170, machineSide: 'M.F.DER', placement: 'TECHO', curtainSupport: 'UNIVERSAL 3 AGUJEROS',
  curtainHasWindow: true, curtainFinish: 'VELCRO', curtainBottomFinish: 'ET', curtainWindowCorner: 15,
  curtainWindowHeight: 137, curtainWindowFloorHeight: 70, curtainWindowReference: 'SUELO', curtainFabricAdjustment: 'NINGUNO'
};
// Con cofre, motor y a techo: el despiece más largo (29 piezas).
const agata = {
  ...comun, id: 'a', of: '0230211', model: 'AGATA BOX', submodel: 'COFRE', device: 'MOTOR', placement: 'TECHO',
  width: 450, projection: 250
};
const electra = {
  ...comun, id: 'a', of: '0230212', model: 'ELECTRA', submodel: 'CON COFRE / SIN GUÍA', device: 'MOTOR',
  motorPower: 'METEOR 20/17', placement: 'FRONTAL', electraSupport: 'SOPORTE MAXISCREEM BOX', curtainHasWindow: true,
  curtainFinish: 'NORMAL', curtainWindowExit: 150, curtainWindowCorner: 30, curtainWindowFloorHeight: 40,
  curtainWindowHeight: 100, width: 220, projection: 250
};
const iris = {
  ...comun, id: 'a', of: '0230213', model: 'IRIS', submodel: 'IRIS 110 CON COFRE', device: 'MOTOR', placement: 'FRONTAL',
  irisGuideType: 'COMPENSADORA', irisBoxShape: 'REDONDO', irisGuideFixing: 'PARED', irisAssumeSquare: true,
  curtainHasWindow: false, curtainFinish: 'NORMAL', width: 220, projection: 250, irisFrontTop: 220, irisExitLeft: 250
};
const bambalina = {
  id: 'a', of: '0230196', model: 'BAMBALINA', units: 1, width: 300, projection: 0, valanceHeight: 30,
  valanceCurve: 'RECTA', rotValance: 'NO'
};
const antica = {
  id: 'a', of: '0230197', model: 'ANTICA', units: 1, width: 284, projection: 80, valanceHeight: 20, valanceFabric: '',
  anticaVariant: 'TUBO 50X30 CONTRAPESO', anticaSupportHeight: 0, device: 'MAQUINA', crankHeight: 200,
  machineSide: 'M.F.DER', sensor: 'SIN SENSOR', placement: 'FRONTAL', wallType: '', valanceCurve: 'RECTA',
  structureColor: 'BLANCO', rotFabric: 'NO', rotValance: 'NO'
};

const casos = {
  arzua: pedido({ orderCode: 'AR2603332', fabric: acrAzul, awnings: [arzua] }),
  cortina: pedido({ orderCode: 'AR2604782', fabric: acrNegro, awnings: [cortina] }),
  agata: pedido({ orderCode: 'AR2603341', fabric: acrNegro, awnings: [agata] }),
  electra: pedido({ orderCode: 'AR2603342', fabric: acrNegro, awnings: [electra] }),
  iris: pedido({ orderCode: 'AR2603343', fabric: acrNegro, awnings: [iris] }),
  notas: pedido({
    orderCode: 'AR2603344', fabric: acrAzul,
    awnings: [{ ...arzua, of: '0230214', structureNotes: notasLargas, structureNotesEdited: true }]
  }),
  // Sin tubo de carga el cálculo del Arzúa no es válido: recuadro REVISAR y despiece vacío.
  revisar: pedido({ orderCode: 'AR2603345', fabric: acrAzul, awnings: [{ ...arzua, of: '0230215', tubeLoad: '' }] }),
  // El de la prueba de telas: cuatro modelos distintos en un PDF, el caso que más tarda.
  cuatro: pedido({
    orderCode: 'AR2603338', fabric: acrNegro,
    awnings: [
      { ...cortina, id: 'a', of: '0230201' },
      { ...arzua, id: 'b', of: '0230202' },
      { ...bambalina, id: 'c', of: '0230203' },
      { ...antica, id: 'd', of: '0230204' }
    ]
  })
};
const elegidos = process.env.CASOS ? process.env.CASOS.split(',') : Object.keys(casos);
for (const nombre of elegidos) assert.ok(casos[nombre], `caso desconocido: ${nombre}`);

async function leerPdf(bytes) {
  const tarea = getDocument({ data: new Uint8Array(bytes) });
  const pdf = await tarea.promise;
  const paginas = [];
  try {
    for (let n = 1; n <= pdf.numPages; n++) {
      const p = await pdf.getPage(n);
      await p.getOperatorList(); // carga las fuentes para saber quién imprimió la página
      const contenido = await p.getTextContent();
      const fuentes = Object.keys(contenido.styles).map((f) => { try { return p.commonObjs.get(f).name; } catch { return f; } });
      const [x0, y0, x1, y1] = p.view;
      paginas.push({
        n, ancho: x1 - x0, alto: y1 - y0, fuentes,
        texto: contenido.items.map((i) => i.str).join(' ').replace(/\s+/g, ' ')
      });
    }
  } finally { await tarea.destroy(); }
  return paginas;
}

const mediana = (xs) => { const s = [...xs].sort((a, b) => a - b); const m = s.length >> 1; return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };
const deChromium = (p) => p.fuentes.some((f) => /geist/i.test(f));
const dePdfkit = (p) => p.fuentes.some((f) => /segoe|helvetica/i.test(f));
// A5 apaisado: 595,28 × 419,53 pt con pdfkit y 595 × 420 con Chromium (redondea al píxel).
const esA5 = (p) => Math.abs(p.ancho - 595.28) < 1.5 && Math.abs(p.alto - 419.53) < 1.5;
const esDeEstructura = (p) => esA5(p) && !p.texto.includes('Planteamiento HERA');
const tiempos = {};
const fallos = [];
const avisos = [];

for (const nombre of elegidos) {
  const order = normalizeOrder(casos[nombre]);
  try {
    // 1. El PDF por la API, con su tiempo. La primera petición calienta y no cuenta.
    tiempos[nombre] = [];
    let bytes;
    for (let i = 0; i <= repeticiones; i++) {
      const inicio = performance.now();
      const res = await fetch(`${BASE_URL}/api/planteamiento`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ order })
      });
      bytes = Buffer.from(await res.arrayBuffer());
      const ms = Math.round(performance.now() - inicio);
      assert.equal(res.status, 200, `${nombre}: ${bytes.toString().slice(0, 300)}`);
      assert.equal(bytes.subarray(0, 5).toString(), '%PDF-', `${nombre}: la respuesta no es un PDF`);
      if (i > 0) tiempos[nombre].push(ms);
    }
    fs.writeFileSync(`${salida}/${prefijo}${nombre}.pdf`, bytes);

    // 2. Las páginas de estructura: quién las imprimió (Geist = Chromium) y sus textos.
    const paginas = await leerPdf(bytes);
    const estructura = paginas.filter(esDeEstructura);
    assert.ok(estructura.length, `${nombre}: sin página de estructura`);
    for (const p of estructura) {
      const quien = deChromium(p) ? 'html' : dePdfkit(p) ? 'pdfkit' : 'desconocido';
      assert.equal(quien, esperada, `${nombre}: la página ${p.n} no sale de ${esperada} (${p.fuentes.join(', ')})`);
      assert.ok(p.texto.includes(order.orderCode), `${nombre}: la página ${p.n} no lleva el pedido ${order.orderCode}`);
      assert.ok(order.awnings.some((a) => p.texto.includes(a.of)), `${nombre}: la página ${p.n} no lleva el OF`);
      if (esperada === 'html') {
        assert.ok(!p.texto.includes('LONGIT.'), `${nombre}: la página ${p.n} abrevia «LONGIT.»`);
        assert.ok(!p.texto.includes('UNID.'), `${nombre}: la página ${p.n} abrevia «UNID.»`);
      }
    }
    const conDespiece = estructura.filter((p) => p.texto.includes('DESPIECE'));
    assert.ok(conDespiece.length, `${nombre}: ninguna página de estructura lleva «DESPIECE»`);
    for (const toldo of order.awnings.filter((a) => a.model !== 'BAMBALINA')) {
      assert.ok(conDespiece.some((p) => p.texto.includes(toldo.of)), `${nombre}: el OF ${toldo.of} no tiene página de despiece`);
    }
    const todo = estructura.map((p) => p.texto).join(' ');
    if (nombre === 'notas') {
      for (let n = 1; n <= LINEAS_NOTAS; n++) assert.ok(todo.includes(linea(n)), `notas: falta la línea ${n} de las observaciones`);
    }
    if (nombre === 'revisar') assert.ok(todo.includes('REVISAR'), 'revisar: falta el recuadro REVISAR');
    else assert.ok(!todo.includes('REVISAR'), `${nombre}: sale REVISAR en un pedido válido`);
    if (nombre === 'electra') {
      for (const fila of ['VARIANTE', 'SOPORTE']) assert.ok(todo.includes(fila), `electra: falta la fila ${fila} en DETALLES`);
    }

    // La hoja de telas no depende de ESTRUCTURA_HTML: sigue saliendo de donde salía.
    const telas = paginas.filter((p) => p.texto.includes('PLANTEAMIENTO DE TELAS'));
    assert.ok(telas.length, `${nombre}: sin página de telas`);
    for (const p of telas) {
      assert.equal(deChromium(p) ? 'html' : 'pdfkit', telasEsperada, `${nombre}: la hoja de telas (página ${p.n}) no sale de ${telasEsperada}`);
    }

    // 3. Mismas páginas y mismos tamaños que en la otra pasada (html ↔ pdfkit). En «notas» no:
    //    las continuaciones de observaciones pueden repartirse distinto.
    const medidas = paginas.map((p) => [Math.round(p.ancho), Math.round(p.alto)]);
    fs.writeFileSync(`${salida}/${prefijo}${nombre}.paginas.json`, JSON.stringify(medidas));
    const otra = `${salida}/${esperada === 'html' ? 'antes-' : ''}${nombre}.paginas.json`;
    let comparacion = 'sin la otra pasada para comparar';
    if (nombre === 'notas') comparacion = 'páginas sin comparar (observaciones largas)';
    else if (otra !== `${salida}/${prefijo}${nombre}.paginas.json` && fs.existsSync(otra)) {
      const otras = JSON.parse(fs.readFileSync(otra, 'utf8'));
      assert.equal(medidas.length, otras.length, `${nombre}: ${medidas.length} páginas y en la otra pasada ${otras.length}`);
      medidas.forEach(([ancho, alto], i) => {
        assert.ok(Math.abs(ancho - otras[i][0]) <= 1 && Math.abs(alto - otras[i][1]) <= 1,
          `${nombre}: la página ${i + 1} mide ${ancho}×${alto} y en la otra pasada ${otras[i].join('×')}`);
      });
      comparacion = 'mismas páginas y tamaños que la otra pasada';
    }

    // 4. La vista previa de Nuevo pedido: una captura por página de estructura.
    //    <caso>.png la primera y <caso>-pagina-<n>.png las demás.
    if (conCapturas) {
      const { browser, page, errors } = await openApp({ width: 1600, height: 1000 });
      try {
        page.setDefaultTimeout(60000);
        await page.evaluate((valor) => localStorage.setItem('toldos-testar-draft-v6', JSON.stringify(valor)), order);
        await page.reload();
        await page.getByRole('button', { name: 'Toldos', exact: true }).click();
        await page.locator('[data-awning-letter="A"]').waitFor();
        await page.waitForFunction(() => document.querySelector('.planning-summary-status')?.textContent
          === 'Estructura, tela y reserva se actualizan al cambiar el pedido');
        await page.getByRole('button', { name: 'Vista previa', exact: true }).click();
        const dialogo = page.getByRole('dialog', { name: 'Vista previa del planteamiento' });
        let actual = 1;
        for (const p of estructura) {
          for (; actual < p.n; actual++) {
            await page.getByRole('img', { name: new RegExp(`^Página ${actual} de `) }).waitFor();
            await dialogo.getByRole('button', { name: 'Página siguiente', exact: true }).first().click();
          }
          const imagen = page.getByRole('img', { name: new RegExp(`^Página ${p.n} de `) });
          await imagen.waitFor();
          await imagen.evaluate((el) => el.decode());
          await page.waitForTimeout(500);
          const sufijo = p === estructura[0] ? '' : `-pagina-${p.n}`;
          await imagen.screenshot({ path: `${salida}/${prefijo}${nombre}${sufijo}.png` });
        }
        assert.deepEqual(errors, [], `${nombre}: errores en la consola`);
      } finally { await browser.close(); }
    }
    console.log(`OK ${nombre}: ${paginas.length} páginas, estructura en ${estructura.map((p) => p.n).join(', ')} (${esperada}), telas (${telasEsperada}); ${comparacion}; ms ${tiempos[nombre].join(' / ')}`);
  } catch (error) {
    fallos.push(nombre);
    console.error(`FALLA ${nombre}: ${error.message}`);
  }
}

console.log(`\nTiempos de POST /api/planteamiento (ms, ${repeticiones} peticiones sin contar la primera):`);
for (const [nombre, ms] of Object.entries(tiempos)) {
  if (!ms.length) continue;
  const m = mediana(ms);
  console.log(`  ${nombre.padEnd(8)} ${ms.join(' / ')}  · mediana ${m} ms`);
  if (m > LIMITE_MS) avisos.push(`${nombre}: mediana ${m} ms, por encima de ${LIMITE_MS} ms`);
}
if (conCapturas) console.log(`Capturas en ${salida}/${prefijo}<caso>.png`);
if (avisos.length) console.error(`DEMASIADO LENTO: ${avisos.join('; ')}`);
if (fallos.length) console.error(`Fallan: ${fallos.join(', ')}`);
if (fallos.length || avisos.length) process.exit(1);
