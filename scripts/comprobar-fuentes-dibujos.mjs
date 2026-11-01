// Prueba en Chromium de la resolución web de la familia usada en Linux. No simula Linux:
// fuerza solo la familia SVG y comprueba descarga de TTF e incrustación real en el PDF.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import pdfLib from 'pdf-lib';
import { buildFabricDiagramSvg } from '../src/domain/planteamientoPdf.js';

const { PDFDocument, PDFName, PDFDict, PDFArray } = pdfLib;
const base = process.env.TOLDOS_ISOLATED_URL || 'http://127.0.0.1:4331';
assert.equal(new URL(base).hostname, '127.0.0.1');
const health = await fetch(`${base}/api/health`).then(r => r.json());
assert.equal(health.simulationMode, true); assert.equal(health.fileWritesEnabled, false);
const salida = path.resolve('tmp/ui-audit/dibujos-html/segunda-pasada/fuentes');
await fs.mkdir(salida, { recursive: true });
const svg = buildFabricDiagramSvg({ diagram: 'IRIS', awning: { model: 'IRIS', irisAssumeSquare: true,
  irisFrontTop: 400, irisExitLeft: 250, submodel: 'IRIS 110 CON COFRE' } });
for (const n of svg.nodes) if (n.tag === 'text') {
  n.attrs.fontFamily = 'ToldosHelvetica';
  if (n.attrs.fontWeight === 600) n.attrs.fontWeight = 700;
}
// El escuadrado usa negrita y cursiva; añadimos regular para comprobar las tres caras.
svg.nodes.push({ tag: 'text', text: 'REGULAR ÁÉÍÓÚÑ 0123456789', attrs: { x: 12, y: 100, fill: '#10282d',
  transform: '', fontFamily: 'ToldosHelvetica', fontWeight: 400, fontStyle: 'normal', fontSize: 10,
  textLength: 160, lengthAdjust: 'spacingAndGlyphs' } });
const hoja = { planIndex: 0, header: { of: 'FUENTES', orderCode: 'FUENTES', customer: '', technician: '', reviewer: '', date: '', title: 'FUENTES' },
  diagramTitle: 'RESOLUCIÓN WEB', diagramSvg: svg, rotulacion: { tela: '', bamba: '' },
  datos: { material: '', curva: '', remate: '' }, rows: [], total: { label: '', amount: '' }, notes: '', footer: '' };
const browser = await chromium.launch({ headless: true });
const descargas = [];
try {
  const page = await browser.newPage();
  const pendientes = [];
  page.on('response', response => {
    if (!/LiberationSans-(Regular|Bold|Italic)\.ttf/.test(response.url())) return;
    pendientes.push((async () => {
      const nombre = /LiberationSans-[A-Za-z]+\.ttf/.exec(response.url())[0];
      const datos = await response.body();
      const origen = await fs.readFile(fileURLToPath(new URL(`standard_fonts/${nombre}`, import.meta.resolve('pdfjs-dist/package.json'))));
      const hash = b => createHash('sha256').update(b).digest('hex');
      assert.equal(response.status(), 200); assert.equal(hash(datos), hash(origen));
      descargas.push({ nombre, estado: response.status(), bytes: datos.length, sha256: hash(datos) });
    })());
  });
  await page.route('**/api/hoja-telas/fuentes', route => route.fulfill({ json: [hoja] }));
  await page.goto(`${base}/hoja-telas.html?id=fuentes`);
  await page.waitForFunction(() => window.hojaLista || window.hojaError);
  assert.equal(await page.evaluate(() => window.hojaError), undefined);
  await Promise.all(pendientes);
  assert.equal(new Set(descargas.map(d => d.nombre)).size, 3);
  const caras = await page.evaluate(() => [...document.fonts].filter(f => f.family === 'ToldosHelvetica')
    .map(f => ({ familia: f.family, peso: f.weight, estilo: f.style, estado: f.status })));
  assert.ok(caras.every(f => f.estado === 'loaded'));
  const pdf = await page.pdf({ preferCSSPageSize: true, printBackground: true });
  await fs.writeFile(path.join(salida, 'fuentes-web.pdf'), pdf);
  const doc = await PDFDocument.load(pdf), incrustadas = [];
  for (const p of doc.getPages()) {
    const fuentes = p.node.Resources().lookup(PDFName.of('Font'), PDFDict);
    for (const [, ref] of fuentes.entries()) {
      const fuente = doc.context.lookup(ref, PDFDict);
      const nombre = fuente.get(PDFName.of('BaseFont'))?.toString() || '';
      if (!nombre.includes('LiberationSans')) continue;
      const descendientes = fuente.lookup(PDFName.of('DescendantFonts'), PDFArray);
      const descendiente = doc.context.lookup(descendientes.get(0), PDFDict);
      const descriptor = descendiente.lookup(PDFName.of('FontDescriptor'), PDFDict);
      const archivo = descriptor.lookup(PDFName.of('FontFile2'));
      assert.ok(archivo?.contents?.length > 0, `${nombre}: no lleva TTF incrustada`);
      incrustadas.push({ nombre, bytesComprimidos: archivo.contents.length });
    }
  }
  assert.equal(incrustadas.length, 3);
  // Si no se puede bajar la fuente, la página falla antes de imprimirse y activa el respaldo.
  await page.close();
  const rota = await browser.newPage();
  await rota.route('**/api/hoja-telas/fuentes', route => route.fulfill({ json: [hoja] }));
  await rota.route('**/*LiberationSans*', route => route.abort());
  await rota.goto(`${base}/hoja-telas.html?id=fuentes`);
  await rota.waitForFunction(() => window.hojaError);
  const fallo = await rota.evaluate(() => window.hojaError);
  const resultado = { sistemaEjecutado: 'Windows, no Linux', descargas, caras, incrustadas, falloSinTtf: fallo,
    limite: 'La resolución e incrustación web quedan comprobadas; métricas y salida final de Linux no ejecutadas.' };
  await fs.writeFile(path.join(salida, 'resultado.json'), JSON.stringify(resultado, null, 2));
  console.log(JSON.stringify(resultado));
} finally { await browser.close(); }
