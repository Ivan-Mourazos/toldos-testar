// Capturas locales de los SVG; no arranca la web ni consulta ninguna dirección de red.
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { leerPlanoDxf, svgPrimitivas } from '../lib/plano-dxf.mjs';
import { puntos } from './dibujos.mjs';
import { cajaDe, dentro } from './geometria.mjs';
const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const dir = path.join(repo, 'tmp/assa-investigacion');
const catalogo = JSON.parse(fs.readFileSync(path.join(repo, 'src/assa/dibujosConfeccion.json'), 'utf8'));
const a = JSON.parse(fs.readFileSync(path.join(dir, 'analisis.json'), 'utf8'));
function png(html, salida) {
  const r = spawnSync(process.execPath, [path.join(repo, 'node_modules/playwright/cli.js'), 'screenshot', '--browser', 'chromium',
    '--viewport-size', '1600,1000', '--full-page', pathToFileURL(html).href, salida], { cwd: repo, encoding: 'utf8' });
  if (r.status !== 0) throw new Error(r.stderr || r.stdout);
}
for (const familia of ['420102', '420148', '420150', '430125', '430127', '430129', '430172']) {
  const codigo = Object.keys(catalogo).find(c => c.startsWith(familia) && catalogo[c].fecha === '2026-10-31') ?? Object.keys(catalogo).find(c => c.startsWith(familia));
  const d = catalogo[codigo], [ox, oy] = d.origenMetros;
  const es = [...d.entidades.lineas.map(l => ({ ...l, tipo: 'raya', a: [l.x1 / 1000, l.y1 / 1000], b: [l.x2 / 1000, l.y2 / 1000] })),
    ...d.entidades.arcos.map(c => ({ ...c, tipo: 'arco', punto: [c.x / 1000, c.y / 1000], r: c.r / 1000 })),
    ...d.entidades.textos.map(t => ({ ...t, tipo: 'texto', punto: [t.x / 1000, t.y / 1000], h: t.h / 1000, ancho: t.ancho / 1000 }))];
  const caja = cajaDe(es.flatMap(puntos)), zona = { x0: caja.x0 - .3, y0: caja.y0 - .3, x1: caja.x1 + .3, y1: caja.y1 + .3 };
  fs.writeFileSync(path.join(dir, `confeccion-${familia}.svg`), svgPrimitivas(es, { zona, ancho: 1500, alto: 410, trazo: .008 }));
  const zonaOriginal = { x0: zona.x0 + ox, x1: zona.x1 + ox, y0: zona.y0 + oy, y1: zona.y1 + oy };
  const originalModelo = leerPlanoDxf(path.join(a.rutas.estudio, 'lotes-oficina/dxf', d.fuente.replace(/\.dwg$/i, '.dxf'))).modelo;
  const originalEs = originalModelo.filter(p => p.tipo !== 'cota' && !/vent-pre-noimpr|borrar|RECUADROS/i.test(p.capa) && puntos(p).some(q => dentro(q, zonaOriginal)));
  fs.writeFileSync(path.join(dir, `original-${familia}.svg`), svgPrimitivas(originalEs, { zona: zonaOriginal, ancho: 1500, alto: 410, trazo: .008 }));
  const original = fs.readFileSync(path.join(dir, `original-${familia}.svg`), 'utf8');
  const copia = fs.readFileSync(path.join(dir, `confeccion-${familia}.svg`), 'utf8');
  const html = path.join(dir, `confeccion-${familia}.html`);
  fs.writeFileSync(html, `<!doctype html><meta charset="utf-8"><title>${familia}</title><style>body{background:#202328;color:white;font:18px Arial;margin:20px}svg{width:1500px;height:410px;background:#15171b}h2{margin:10px 0}</style><h2>${codigo}: original de ${d.fuente}</h2>${original}<h2>Extracción de confección</h2>${copia}`);
  png(html, path.join(dir, `confeccion-${familia}.png`));
  console.log(`${familia}: PNG guardado`);
}
const contraste = JSON.parse(fs.readFileSync(path.join(dir, 'plantilla-variantes.json'), 'utf8'));
for (const r of contraste.resultados) {
  const paneles = r.formas.map((f, i) => {
    const svg = fs.readFileSync(path.join(dir, `variante-${r.codigo}-${i + 1}.svg`), 'utf8');
    const p = path.join(dir, `plantilla-${r.codigo}-${i + 1}.svg`);
    const maestro = fs.existsSync(p) ? fs.readFileSync(p, 'utf8') : '<p>No se localiza un anclaje seguro en la plantilla.</p>';
    return `<article><h2>Variante ${i + 1}: ${f.fuente}</h2><p>${f.estado}; faltan ${f.contraste?.faltanForma ?? '?'} / extras ${f.contraste?.extrasForma ?? '?'} trazos de forma</p>${svg}<h2>Plantilla en la posición contrastada</h2>${maestro}</article>`;
  });
  const html = path.join(dir, `variantes-${r.codigo}.html`);
  fs.writeFileSync(html, `<!doctype html><meta charset="utf-8"><title>${r.codigo}: variantes</title><style>body{background:#202328;color:white;font:16px Arial;margin:20px}main{display:grid;grid-template-columns:repeat(2,1fr);gap:20px}svg{width:740px;height:350px;background:#15171b}h1{font-size:24px}h2{font-size:18px}</style><h1>${r.codigo} · ${r.seleccion.criterio} · ${r.seleccion.fuente}</h1><main>${paneles.join('')}</main>`);
  png(html, path.join(dir, `variantes-${r.codigo}.png`));
  console.log(`${r.codigo}: variantes y plantilla capturadas`);
}
