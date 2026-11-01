// Revisión del contraste ya generado: láminas de todos los casos y capturas de la hoja.
import fs from 'node:fs/promises';
import path from 'node:path';
import { createRequire } from 'node:module';
import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { buildFabricDiagramSvg } from '../src/domain/planteamientoPdf.js';

const requirePdf = createRequire(import.meta.resolve('pdfjs-dist/package.json'));
const { createCanvas, loadImage } = requirePdf('@napi-rs/canvas');
const salida = path.resolve('tmp/ui-audit/dibujos-html/contraste');
const resultados = JSON.parse(await fs.readFile(path.join(salida, 'resultados.json'), 'utf8'));
for (let inicio = 0; inicio < resultados.length; inicio += 12) {
  const canvas = createCanvas(1488, 1320), ctx = canvas.getContext('2d');
  ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, canvas.width, canvas.height);
  for (const [i, r] of resultados.slice(inicio, inicio + 12).entries()) {
    const x = i % 3 * 496, y = Math.floor(i / 3) * 330;
    ctx.fillStyle = '#000'; ctx.font = '11px Arial'; ctx.fillText(r.id, x + 4, y + 12, 486);
    ctx.fillText('pdfkit                                      SVG', x + 4, y + 25);
    for (const [columna, tipo] of ['pdfkit', 'svg'].entries()) {
      ctx.drawImage(await loadImage(path.join(salida, `${r.id}-${tipo}.png`)), x + columna * 246 + 3, y + 28, 242, 300);
    }
  }
  await fs.writeFile(path.join(salida, `lamina-${String(inicio / 12 + 1).padStart(2, '0')}.png`), canvas.toBuffer('image/png'));
}
const familias = Object.groupBy(resultados, r => r.diagram);
const tabla = Object.entries(familias).map(([nombre, casos]) => ({
  nombre, casos: casos.length, textosDistintos: casos.filter(c => !c.textoIgual).length,
  diferenciaMediaMaxima: Math.max(...casos.map(c => c.diferenciaMedia)),
  porcentajeMaximo: Math.max(...casos.map(c => c.porcentajePixeles))
}));
await fs.writeFile(path.join(salida, 'resumen.json'), JSON.stringify(tabla, null, 2));
console.log(JSON.stringify(tabla));

const base = process.env.TOLDOS_ISOLATED_URL || 'http://127.0.0.1:4318';
const health = await fetch(`${base}/api/health`).then(r => r.json());
assert.equal(health.simulationMode, true); assert.equal(health.fileWritesEnabled, false);
assert.equal(new URL(base).hostname, '127.0.0.1');
const browser = await chromium.launch({ headless: true });
try {
  const datos = {
    planIndex: 0, header: { of: '0230194', orderCode: 'SVG-CONTRASTE', customer: 'OFICINA TÉCNICA', technician: 'IVÁN', reviewer: 'REVISIÓN', date: '01/11/2026', title: 'PLANTEAMIENTO DE TELAS' },
    diagramTitle: 'ARZÚA PRO', diagramSvg: buildFabricDiagramSvg({ diagram: 'GENERAL', awning: { model: 'ARZUA PRO', valanceHeight: 30, valanceCurve: 'RECTA' } }),
    rotulacion: { tela: 'NO', bamba: 'NO' }, datos: { material: 'ACRÍLICA', curva: 'RECTA', remate: 'COMO TELA' },
    rows: [{ letter: 'A', fabricWidth: '326,2', fabricDrop: '300,0', dropLabel: 'SALIDA', units: '1', line: 'BAMBALINA INCLUIDA DE 30 CM' }],
    total: { label: 'ACRILI2018P120 · ACR AZUL', amount: '9,0 ML' }, notes: '', footer: 'Planteamiento de telas'
  };
  for (const [width, height] of [[1280, 720], [1600, 1000]]) {
    for (const colorScheme of ['light', 'dark']) {
      const page = await browser.newPage({ viewport: { width, height }, colorScheme });
      await page.route('**/api/hoja-telas/revision', route => route.fulfill({ json: [datos] }));
      await page.goto(`${base}/hoja-telas.html?id=revision`);
      await page.waitForFunction(() => window.hojaLista || window.hojaError);
      assert.equal(await page.evaluate(() => window.hojaError), undefined);
      await page.screenshot({ path: path.join(salida, `hoja-${width}-${height}-${colorScheme}.png`), fullPage: true });
      await page.close();
    }
  }
} finally { await browser.close(); }
