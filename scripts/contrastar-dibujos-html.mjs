// Contraste reproducible: mismo trazado, PDF de pdfkit frente a SVG impreso por Chromium.
// Usa solo la aislada, sin cálculos de RPS ni escrituras fuera de tmp/. Sin dependencias nuevas:
// el canvas es el que ya incluye el renderizador PDF de pdfjs-dist.
// TOLDOS_ISOLATED_URL=http://127.0.0.1:4312 node scripts/contrastar-dibujos-html.mjs
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { createRequire } from 'node:module';
import { chromium } from 'playwright';
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs';
import { models } from '../src/domain/catalog.js';
import { exampleAwning, webDrawingVariants } from '../src/domain/drawingCatalog.js';
import { normalizeOrder } from '../src/domain/validation.js';
import { buildFabricDiagramBoxPdf, buildFabricDiagramSvg, getFabricPatternDiagram, SVG_FABRIC_DIAGRAMS } from '../src/domain/planteamientoPdf.js';

const requirePdf = createRequire(import.meta.resolve('pdfjs-dist/package.json'));
const { createCanvas } = requirePdf('@napi-rs/canvas');
const base = process.env.TOLDOS_ISOLATED_URL || 'http://127.0.0.1:4312';
assert.equal(new URL(base).hostname, '127.0.0.1');
assert.ok(!['4400', '4310', '4316'].includes(new URL(base).port));
const health = await fetch(`${base}/api/health`).then(r => r.json());
assert.equal(health.simulationMode, true);
assert.equal(health.fileWritesEnabled, false);
const salida = path.resolve(process.env.SALIDA || 'tmp/ui-audit/dibujos-html/contraste');
assert.ok(salida.startsWith(path.resolve('tmp') + path.sep));
await fs.mkdir(salida, { recursive: true });
const escala = 3, ancho = 242 * escala, alto = 300 * escala;
const muestras = [];
const agregar = (id, diagram, awning, calculation = { fabricWidth: 400, fabricDrop: 275 }) => {
  muestras.push({ id: id.replace(/[^a-z0-9-]/gi, '-'), diagram, awning, calculation });
};
for (const { code } of models) {
  for (const variante of webDrawingVariants(code).filter(v => v.webDrawing)) {
    const [awning] = normalizeOrder({ awnings: [exampleAwning(variante)] }).awnings;
    agregar(`catalogo-${code}-${variante.id}`, getFabricPatternDiagram(awning), awning);
  }
}
for (const diagram of SVG_FABRIC_DIAGRAMS) {
  for (const [nombre, medida, bamba] of [['normal', 400, 25], ['minimo', 50, 0], ['extremo', 1200.9, 120.5]]) {
    agregar(`reparto-${diagram}-${nombre}`, diagram, {
      model: diagram.startsWith('CORTINA') ? 'ELECTRA' : 'CAMBIO TELA', width: medida, projection: medida,
      valanceHeight: bamba, valanceCurve: nombre === 'extremo' ? 'EXTRASUAVE' : 'RECTA',
      armConfiguration: nombre === 'extremo' ? 'CROSSED' : '',
      tubeLoad: nombre === 'extremo' ? 'TUBO DE CARGA · RÓTULO MUY LARGO PARA COMPROBAR LA PARTICIÓN DE LÍNEAS' : '',
      curtainWindowCorner: medida / 8, curtainWindowHeight: medida / 2, curtainWindowFloorHeight: medida / 4,
      curtainWindowExit: medida, anticaVariant: nombre === 'extremo' ? 'TUBO 50X30 CONTRAPESO' : 'SOPORTE FIJO 3 AGUJEROS',
      anticaSupportHeight: 75.5, heraInteriorFace: 'REVÉS', submodel: nombre === 'extremo' ? 'COFRE CON VARILLA' : ''
    }, { fabricWidth: medida, fabricDrop: medida * 0.8 });
  }
}
// Ramas que no ofrece la selección general de Parámetros.
for (const curva of ['RECTA', 'NORMAL', 'SUAVE', 'EXTRASUAVE']) {
  for (const separado of [false, true]) agregar(`general-${curva}-${separado}`, 'GENERAL', {
    model: 'CAMBIO TELA', valanceHeight: 30.5, valanceCurve: curva, valanceFabric: separado ? 'OTRA TELA' : ''
  });
}
for (const forma of ['RECTO', 'CONICO']) agregar(`embudo-${forma}`, 'EMBUDO', {
  units: 4, embudo: { forma, contornoArriba: 400.5, contornoAbajo: 800.5, alto: 250.5 }
});
for (const bastilla of [true, false]) agregar(`solapas-${bastilla}`, 'SOLAPAS', { bastilla, solapas: [{ ancho: 50, alto: 250 }] });
for (const lado of ['DERECHO', 'REVÉS']) agregar(`hera-${lado}`, 'HERA', { heraInteriorFace: lado });
for (const ventana of [true, false]) agregar(`iris-${ventana}`, 'IRIS', {
  model: 'IRIS', submodel: 'IRIS 110 CON COFRE', irisGuideType: 'COMPENSADORA',
  irisAssumeSquare: false, irisFrontTop: 355, irisFrontBottom: 350, irisExitLeft: 400, irisExitRight: 405,
  irisDiagonal1: 533.1, irisDiagonal2: 537, curtainHasWindow: ventana,
  curtainWindowHeight: 150, curtainWindowFloorHeight: 70
}, { fabricWidth: 355, guideLeftLength: 398.5, guideRightLength: 403.5 });

async function raster(pdf, numero, recorte = false) {
  const task = getDocument({ data: new Uint8Array(pdf) });
  try {
    const doc = await task.promise, pagina = await doc.getPage(numero);
    const canvas = createCanvas(ancho, alto);
    await pagina.render({ canvasContext: canvas.getContext('2d'), viewport: pagina.getViewport({
      scale: escala, offsetX: recorte ? -36 * escala : 0, offsetY: recorte ? -149 * escala : 0
    }) }).promise;
    const contenido = await pagina.getTextContent();
    const textos = contenido.items.filter(i => i.str?.trim() && (!recorte ||
      (i.transform[4] >= 35 && i.transform[4] < 279 && pagina.view[3] - i.transform[5] >= 149 && pagina.view[3] - i.transform[5] < 450)))
      .map(i => i.str.trim()).join(' ').replace(/\s+/g, ' ');
    const posiciones = contenido.items.filter(i => i.str?.trim() && (!recorte ||
      (i.transform[4] >= 35 && i.transform[4] < 279 && pagina.view[3] - i.transform[5] >= 149 && pagina.view[3] - i.transform[5] < 450)))
      .map(i => ({ text: i.str.trim(), x: i.transform[4] - (recorte ? 36 : 0),
        y: pagina.view[3] - i.transform[5] - (recorte ? 149 : 0), width: i.width, height: i.height }));
    return { canvas, textos, posiciones };
  } finally { await task.destroy(); }
}
const hoja = (diagramSvg, i) => ({
  planIndex: i, header: { of: 'CONTRASTE', orderCode: 'SVG', customer: '', technician: '', reviewer: '', date: '', title: 'CONTRASTE' },
  diagramTitle: muestras[i].id, diagramSvg,
  rotulacion: { tela: '', bamba: '' }, datos: { material: '', curva: '', remate: '' },
  rows: [], total: { label: '', amount: '' }, notes: '', footer: ''
});
const browser = await chromium.launch({ headless: true });
const resultados = [];
try {
  const page = await browser.newPage();
  for (let inicio = 0; inicio < muestras.length; inicio += 30) {
    const lote = muestras.slice(inicio, inicio + 30);
    const hojas = lote.map((m, i) => hoja(buildFabricDiagramSvg(m), inicio + i));
    assert.ok(hojas.every(h => h.diagramSvg), 'ninguna muestra puede caer silenciosamente a pdfkit');
    await page.route('**/api/hoja-telas/contraste', route => route.fulfill({ json: hojas }));
    await page.goto(`${base}/hoja-telas.html?id=contraste`);
    await page.waitForFunction(() => window.hojaLista || window.hojaError);
    assert.equal(await page.evaluate(() => window.hojaError), undefined);
    const impreso = await page.pdf({ preferCSSPageSize: true, printBackground: true });
    await fs.writeFile(path.join(salida, `svg-lote-${inicio}.pdf`), impreso);
    for (const [i, muestra] of lote.entries()) {
      const original = await buildFabricDiagramBoxPdf(muestra);
      await fs.writeFile(path.join(salida, `${muestra.id}-pdfkit.pdf`), original);
      const antes = await raster(original, 1), despues = await raster(impreso, i + 1, true);
      const a = antes.canvas.getContext('2d').getImageData(0, 0, ancho, alto).data;
      const b = despues.canvas.getContext('2d').getImageData(0, 0, ancho, alto).data;
      const diff = createCanvas(ancho, alto), ctx = diff.getContext('2d'), imagen = ctx.createImageData(ancho, alto);
      let suma = 0, distintos = 0;
      for (let p = 0; p < a.length; p += 4) {
        const d = Math.max(...[0, 1, 2].map(c => Math.abs(a[p + c] - b[p + c])));
        suma += d;
        if (d > 32) distintos++;
        imagen.data[p] = 255; imagen.data[p + 1] = imagen.data[p + 2] = 255 - d; imagen.data[p + 3] = 255;
      }
      ctx.putImageData(imagen, 0, 0);
      const desplazamientos = antes.posiciones.map((p, n) => {
        const q = despues.posiciones[n];
        return p.text === q?.text ? Math.max(Math.abs(p.x - q.x), Math.abs(p.y - q.y), Math.abs(p.width - q.width), Math.abs(p.height - q.height)) : null;
      });
      await Promise.all([
        fs.writeFile(path.join(salida, `${muestra.id}-pdfkit.png`), antes.canvas.toBuffer('image/png')),
        fs.writeFile(path.join(salida, `${muestra.id}-svg.png`), despues.canvas.toBuffer('image/png')),
        fs.writeFile(path.join(salida, `${muestra.id}-diferencia.png`), diff.toBuffer('image/png'))
      ]);
      resultados.push({ id: muestra.id, diagram: muestra.diagram, diferenciaMedia: suma / (ancho * alto),
        porcentajePixeles: distintos / (ancho * alto) * 100, textoIgual: antes.textos === despues.textos,
        desplazamientoMaximoPt: desplazamientos.some(d => d === null) ? null : Math.max(0, ...desplazamientos),
        textoPdfkit: antes.textos, textoSvg: despues.textos });
    }
    await page.unroute('**/api/hoja-telas/contraste');
    console.log(`Contrastados ${resultados.length}/${muestras.length}`);
  }
} finally { await browser.close(); }
await fs.writeFile(path.join(salida, 'resultados.json'), JSON.stringify(resultados, null, 2));
const escapar = s => s.replaceAll('&', '&amp;').replaceAll('<', '&lt;');
await fs.writeFile(path.join(salida, 'informe.html'), `<!doctype html><html lang="es"><meta charset="utf-8"><title>Contraste de dibujos</title>
<style>body{font:16px Arial;margin:24px}article{break-inside:avoid;border-top:1px solid #999}img{width:242px;height:300px}figure{display:inline-block;margin:6px}figcaption{text-align:center}</style>
<h1>Contraste pdfkit / SVG · ${resultados.length} casos · 216 ppp</h1>
<p>La diferencia media mide niveles RGB (0–255). Píxeles cuenta diferencias mayores de 32. El orden es pdfkit, SVG, diferencia.</p>
${resultados.map(r => `<article><h2>${escapar(r.id)}</h2><p>Diferencia media ${r.diferenciaMedia.toFixed(3)}; píxeles ${r.porcentajePixeles.toFixed(3)} %; texto ${r.textoIgual ? 'igual' : 'REVISAR'}</p>
${['pdfkit', 'svg', 'diferencia'].map(tipo => `<figure><img src="${r.id}-${tipo}.png"><figcaption>${tipo}</figcaption></figure>`).join('')}
${r.textoIgual ? '' : `<pre>${escapar(r.textoPdfkit)}\n${escapar(r.textoSvg)}</pre>`}</article>`).join('')}</html>`);
console.log(JSON.stringify({ casos: resultados.length, textosDistintos: resultados.filter(r => !r.textoIgual).length,
  diferenciaMaxima: Math.max(...resultados.map(r => r.diferenciaMedia)), salida }));
