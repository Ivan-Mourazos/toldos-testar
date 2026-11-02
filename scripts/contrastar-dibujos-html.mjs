import { casosContrasteDibujos } from './lib/casos-contraste-dibujos.mjs';
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
import { buildFabricDiagramBoxPdf, buildFabricDiagramSvg } from '../src/domain/planteamientoPdf.js';

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
const muestras = casosContrasteDibujos();

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
        return p.text === q?.text ? { texto: p.text, dx: q.x - p.x, dy: q.y - p.y,
          origenPt: Math.hypot(q.x - p.x, q.y - p.y), anchoPt: q.width - p.width, altoPt: q.height - p.height } : null;
      });
      const posicionesCasadas = desplazamientos.every(d => d !== null) && antes.posiciones.length === despues.posiciones.length;
      const peor = posicionesCasadas ? desplazamientos.reduce((a, b) => a.origenPt >= b.origenPt ? a : b,
        { texto: '', dx: 0, dy: 0, origenPt: 0, anchoPt: 0, altoPt: 0 }) : null;
      await Promise.all([
        fs.writeFile(path.join(salida, `${muestra.id}-pdfkit.png`), antes.canvas.toBuffer('image/png')),
        fs.writeFile(path.join(salida, `${muestra.id}-svg.png`), despues.canvas.toBuffer('image/png')),
        fs.writeFile(path.join(salida, `${muestra.id}-diferencia.png`), diff.toBuffer('image/png'))
      ]);
      resultados.push({ id: muestra.id, diagram: muestra.diagram, diferenciaMedia: suma / (ancho * alto),
        porcentajePixeles: distintos / (ancho * alto) * 100, textoIgual: antes.textos === despues.textos,
        desplazamientoMaximoPt: peor?.origenPt ?? null,
        desplazamientoMaximoMm: peor ? peor.origenPt * 25.4 / 72 : null,
        peorRotulo: peor, rotulos: desplazamientos,
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
${resultados.map(r => `<article><h2>${escapar(r.id)}</h2><p>Diferencia media ${r.diferenciaMedia.toFixed(3)}; píxeles ${r.porcentajePixeles.toFixed(3)} %; texto ${r.textoIgual ? 'igual' : 'REVISAR'}; desplazamiento máximo ${r.desplazamientoMaximoMm?.toFixed(4) ?? 'SIN CASAR'} mm</p>
${['pdfkit', 'svg', 'diferencia'].map(tipo => `<figure><img src="${r.id}-${tipo}.png"><figcaption>${tipo}</figcaption></figure>`).join('')}
${r.textoIgual ? '' : `<pre>${escapar(r.textoPdfkit)}\n${escapar(r.textoSvg)}</pre>`}</article>`).join('')}</html>`);
console.log(JSON.stringify({ casos: resultados.length, textosDistintos: resultados.filter(r => !r.textoIgual).length,
  posicionesSinCasar: resultados.filter(r => r.desplazamientoMaximoPt === null).map(r => r.id),
  peorDesplazamiento: resultados.reduce((a, b) => (a.desplazamientoMaximoPt ?? 0) >= (b.desplazamientoMaximoPt ?? 0) ? a : b),
  diferenciaMaxima: Math.max(...resultados.map(r => r.diferenciaMedia)), salida }));
