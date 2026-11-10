// Mismas medidas, tolerancia y elección de sacos que toldos y puertas. Las piezas del pedido ya están
// colocadas: solo se aprovechan rectángulos libres dentro del rollo gastado, nunca las piezas de restos.
import { SACOS } from '../../domain/corteLona/colocacion.js';
import { huecosLibres } from '../../domain/corteLona/colocacionTetris.ts';
import { anchoArial } from '../../domain/corteLona/texto.js';
import { huecosStock, restarRetal as restar } from './retales.js';

const area = sacos => sacos.reduce((s, p) => s + p.ancho * p.hueco, 0);
const EPS = 0.001;

// Conserva los rectángulos libres máximos, aunque se crucen entre sí. A diferencia de la partición
// común, no se reserva un retal entero antes de saber si da sacos: una franja de 70 cm no debe partir
// un hueco vertical válido. Solo se restan las piezas y, después, los sacos realmente elegidos.
function mejorPlan(planes) {
  const opciones = planes.map(sacos => ({ sacos, area: area(sacos) }));
  const maximo = Math.max(0, ...opciones.map(p => p.area));
  return opciones.filter(p => p.area >= maximo * 0.95)
    .sort((a, b) => a.sacos.length - b.sacos.length || b.area - a.area)[0]?.sacos ?? [];
}

function rejilla(h, ofStock) {
  const planes = [];
  for (const [alto, ancho] of SACOS) for (const girado of [false, true]) {
    const w = (girado ? alto : ancho) * 10, v = (girado ? ancho : alto) * 10;
    // AR2605467: primero la medida nominal, sin agrandar el saco hasta agotar la tolerancia.
    // Solo se reduce (hasta 5 cm y en cm enteros) cuando el nominal no cabe ni una vez.
    const nx = Math.floor(h.w / w) || (h.w >= w - 50 ? 1 : 0);
    const ny = Math.floor(h.h / v) || (h.h >= v - 50 ? 1 : 0);
    if (!nx || !ny) continue;
    const wr = Math.min(w, Math.floor(h.w / 10) * 10), hr = Math.min(v, Math.floor(h.h / 10) * 10);
    const medida = girado ? `${wr / 10}X${hr / 10}` : `${hr / 10}X${wr / 10}`;
    planes.push(Array.from({ length: nx }, (_, i) => Array.from({ length: ny }, (_, j) => ({
      nombre: 'SACO', saco: true, medida, medidaCatalogo: `${alto}X${ancho}`, of: ofStock, marcas: [], girada: false,
      x: h.x + i * wr, y: h.y + j * hr, ancho: wr, hueco: hr, largo: wr, alto: hr,
    }))).flat());
  }
  return mejorPlan(planes);
}

function llenar(h, ofStock) {
  const poner = r => rejilla(r, ofStock);
  const planes = [poner(h)];
  // Dos bandas permiten mezclar medidas, por ejemplo 120×160 + 120×110 en 285×120 cm.
  // Se conserva el catálogo común, priorizando las medidas nominales del manual de remolques.
  const medidas = new Set(SACOS.flatMap(s => s.flatMap(cm => [cm - 5, cm, cm + 5].map(v => v * 10))));
  for (const d of medidas) {
    if (d < h.w) planes.push([...poner({ ...h, w: d }), ...poner({ ...h, x: h.x + d, w: h.w - d })]);
    if (d < h.h) planes.push([...poner({ ...h, h: d }), ...poner({ ...h, y: h.y + d, h: h.h - d })]);
  }
  return mejorPlan(planes);
}

function aprovechar(ocupadas, largo, rollo, ofStock) {
  let libres = huecosStock(ocupadas, largo, rollo);
  const sacos = [];
  while (libres.length) {
    const elegidos = mejorPlan(libres.map(h => llenar(h, ofStock)));
    if (!elegidos.length) break;
    sacos.push(...elegidos);
    for (const s of elegidos) libres = restar(libres, { x: s.x, y: s.y, w: s.ancho, h: s.hueco });
  }
  // Se compara con la partición anterior, aplicando también en ella las medidas del manual.
  const anteriores = huecosLibres(ocupadas.map(p => ({ x: p.x, y: p.y, w: p.ancho, h: p.hueco })), largo, rollo)
    .flatMap(h => rejilla(h, ofStock));
  return area(sacos) > area(anteriores) + EPS ? sacos : anteriores;
}

export function sacosDeStock(ocupadas, rollo, ofStock, largo = Math.max(0, ...ocupadas.map(p => p.x + p.ancho))) {
  if (!ofStock) return { sacos: [], lineas: [], textos: [] };
  const sacos = aprovechar(ocupadas, largo, rollo, ofStock);
  const lineas = [], textos = [];
  const grupos = [];
  for (const s of sacos) {
    const { x, y, ancho: w, hueco: h } = s;
    lineas.push([x, y, x + w, y], [x + w, y, x + w, y + h], [x + w, y + h, x, y + h], [x, y + h, x, y]);
    const vertical = h > w;
    textos.push({ capa: 'texto', x: x + w * (vertical ? .25 : .5), y: y + h * (vertical ? .5 : .75),
      h: Math.min(100, Math.min(w, h) / 6, Math.max(w, h) * .9 / anchoArial(s.of, 1)), valor: s.of, centrado: true,
      ...(vertical ? { giro: 90 } : {}) });
    const g = grupos.find(g => !vertical && g.medida === s.medidaCatalogo && Math.abs(g.y - y) < EPS && g.h === h && Math.abs(g.x + g.w - x) < EPS);
    if (g) { g.w += w; g.n++; }
    else grupos.push({ x, y, w, h, medida: s.medidaCatalogo, n: 1 });
  }
  for (const g of grupos) {
    const valor = `${g.n > 1 ? 'SACOS' : 'SACO'} ${g.medida} STOCK`, vertical = g.h > g.w;
    textos.push({ capa: 'texto', x: g.x + g.w * (vertical ? .65 : .5), y: g.y + g.h * (vertical ? .5 : .4),
      h: Math.min(150, Math.min(g.w, g.h) / 5, Math.max(g.w, g.h) * .9 / anchoArial(valor, 1)), valor, centrado: true,
      ...(vertical ? { giro: 90 } : {}) });
  }
  return { sacos, lineas, textos };
}
