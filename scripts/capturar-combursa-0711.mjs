// Capturas de los DWG releídos con ODA, servidas en la instancia aislada. Todo queda en tmp del repositorio.
import fs from 'node:fs/promises';
import path from 'node:path';
import { chromium } from 'playwright';
import { leerPlanoDxf, svgPrimitivas } from './lib/plano-dxf.mjs';
import { cajaPrimitiva, enZona, presentacionesDxf } from '../src/flujoDwg/planoDxf.js';
import { cajaDocumento } from '../src/assa/documentoLote.js';

const base = process.env.TOLDOS_ISOLATED_URL || 'http://127.0.0.1:4440';
const health = await fetch(base + '/api/health').then(r => r.json());
if (!health.simulationMode || health.fileWritesEnabled) throw new Error('La instancia no está aislada.');
const dir = path.resolve('tmp/ui-audit/combursa-0711'), temporales = path.join(dir, 'navegador');
await fs.mkdir(temporales, { recursive: true });
process.env.TEMP = temporales; process.env.TMP = temporales; process.env.TMPDIR = temporales;
const fuente = process.argv.find(a => a.startsWith('--fuente='))?.slice(9);
if (!fuente) throw new Error('Indica --fuente con la copia DXF de oficina.');
const oficina = leerPlanoDxf(fuente), web = leerPlanoDxf(path.join(dir, 'LOTE 07-11 - WEB - relectura.dxf'));
const auxiliar = leerPlanoDxf(path.join(path.dirname(fuente), 'lote-0711-palet45.dxf'));
const resumen = JSON.parse(await fs.readFile(path.resolve('tmp/combursa-0711/resultado.json'), 'utf8'));
const corteWeb = web.modelo.filter(p => web.imprime(p) && enZona(p, resumen.zonaCorte));
const activo = oficina.modelo.filter(p => oficina.imprime(p) && cajaPrimitiva(p).x0 > -65 && cajaPrimitiva(p).y0 > 10);
const zona = ps => {
  const cs = ps.map(cajaDocumento);
  return { x0: Math.min(...cs.map(c => c.x0)) - 1, x1: Math.max(...cs.map(c => c.x1)) + 1,
    y0: Math.min(...cs.map(c => c.y0)) - 1, y1: Math.max(...cs.map(c => c.y1)) + 1 };
};
const comparaciones = [
  ['entero', 'Oficina · Modelo activo completo', activo, zona(activo), 'Web · Modelo completo', web.modelo.filter(web.imprime), zona(web.modelo.filter(web.imprime))],
  ['modelo-con-restos', 'Palets 4-5 · archivo auxiliar entero, con restos históricos', auxiliar.modelo.filter(auxiliar.imprime), zona(auxiliar.modelo.filter(auxiliar.imprime)), 'Web · Modelo entero del 07-11', web.modelo.filter(web.imprime), zona(web.modelo.filter(web.imprime))],
  ['corte', 'Oficina · apartado de corte', activo.filter(p => cajaPrimitiva(p).y0 < 85), zona(activo.filter(p => cajaPrimitiva(p).y0 < 85)), 'Web · mismo apartado', corteWeb, zona(corteWeb)],
];
const paginas = presentacionesDxf(web.src);
const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage();
  for (const [ancho, alto] of [[1280, 720], [1600, 1000]]) for (const tema of ['claro', 'oscuro']) {
    await page.setViewportSize({ width: ancho, height: alto });
    for (const [nombre, tituloA, psA, zA, tituloB, psB, zB] of comparaciones) {
      const svg = (ps, z) => {
        const s = svgPrimitivas(ps.filter(p => enZona(p, z)), { zona: z, ancho: '100%', alto: '100%', trazo: nombre === 'modelo-con-restos' ? .3 : .06 });
        return tema === 'oscuro' ? s.replaceAll('#111', '#d6dce4') : s;
      };
      const html = `<!doctype html><meta charset="utf-8"><title>COMBURSA · ${nombre}</title><style>body{margin:0;background:${tema === 'oscuro' ? '#111820' : '#f0f2f4'};color:${tema === 'oscuro' ? '#e3e9f0' : '#253345'};font:14px Arial}header{padding:16px 20px}h1{margin:0;font-size:20px}p{margin:8px 0 0}main{display:grid;grid-template-columns:1fr 1fr;gap:12px;padding:0 12px}article{height:${alto - 106}px;display:flex;flex-direction:column}h2{margin:0;padding:10px;font-size:15px}.cad{flex:1;min-height:0;background:${tema === 'oscuro' ? '#18212b' : '#fff'};border:1px solid #728294}svg{display:block}</style><header><h1>COMBURSA · Lote 07-11 · ${nombre}</h1><p>Geometría de las copias DXF / DWG releído con ODA. Escala ajustada a cada panel; mismo contenido de fabricación.</p></header><main><article><h2>${tituloA}</h2><div class="cad">${svg(psA, zA)}</div></article><article><h2>${tituloB}</h2><div class="cad">${svg(psB, zB)}</div></article></main>`;
      const ruta = `${base}/auditoria-combursa-${nombre}`;
      await page.route(ruta, route => route.fulfill({ contentType: 'text/html', body: html }));
      await page.goto(ruta); await page.screenshot({ path: path.join(dir, `${nombre}-${tema}-${ancho}x${alto}.png`) });
      await page.unroute(ruta);
      if (ancho === 1600 && tema === 'claro') await fs.writeFile(path.join(dir, `${nombre}.html`), html);
    }
  }
  for (const [i, h] of paginas.entries()) {
    await page.setViewportSize({ width: 1600, height: 1131 });
    await page.setContent(`<style>body{margin:0;background:white}</style>${svgPrimitivas(h.primitivas, { zona: { x0: 0, y0: 0, x1: 297, y1: 210 }, ancho: 1600, alto: 1131, trazo: .15 })}`);
    await page.screenshot({ path: path.join(dir, `presentacion-${String(i + 1).padStart(2, '0')}.png`) });
  }
} finally { await browser.close(); }
console.log(`Capturadas tres comparaciones en claro/oscuro y dos tamaños, y ${paginas.length} presentaciones.`);
