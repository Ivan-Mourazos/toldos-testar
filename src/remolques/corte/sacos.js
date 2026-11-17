// Mismas medidas, tolerancia y elección de sacos que toldos y puertas. Las piezas del pedido ya están
// colocadas: solo se aprovechan rectángulos libres dentro del rollo gastado, nunca las piezas de restos.
import { SACOS, MARGEN_SACO_CM, completarParejasSacos, planesSacosEnRectangulos, sacosEnRectangulos, valorarSacos } from '../../domain/corteLona/colocacion.js';
import { compararStock, huecosLibres } from '../../domain/corteLona/colocacionTetris.ts';
import { anchoArial } from '../../domain/corteLona/texto.js';
import { huecosStock, restarRetal as restar } from './retales.js';

const EPS = 0.001;

// Conserva los rectángulos libres máximos, aunque se crucen entre sí. A diferencia de la partición
// común, no se reserva un retal entero antes de saber si da sacos: una franja de 70 cm no debe partir
// un hueco vertical válido. Solo se restan las piezas y, después, los sacos realmente elegidos.
function mejorPlan(planes, previos = []) {
  // Iván, 17/11/2026: el mismo criterio de sacos equivalentes que toldos y puertas.
  return planes.map(sacos => {
    const todos = [...previos, ...sacos];
    return { sacos, valor: valorarSacos(completarParejasSacos(todos)), pendiente: valorarSacos(todos) };
  }).sort((a, b) => compararStock(b.valor, a.valor) || compararStock(b.pendiente, a.pendiente))[0]?.sacos ?? [];
}

function llenar(h, ofStock) {
  const planes = planesSacosEnRectangulos([h], ofStock);
  // Iván, 17/11/2026: dos bandas permiten mezclar tiras y trozos del catálogo nuevo.
  const medidas = new Set(SACOS.flatMap(s => s.flatMap(cm => [cm - MARGEN_SACO_CM, cm, cm + MARGEN_SACO_CM].map(v => v * 10))));
  for (const d of medidas) {
    if (d < h.w) planes.push(...planesSacosEnRectangulos([{ ...h, w: d }, { ...h, x: h.x + d, w: h.w - d }], ofStock));
    if (d < h.h) planes.push(...planesSacosEnRectangulos([{ ...h, h: d }, { ...h, y: h.y + d, h: h.h - d }], ofStock));
  }
  return planes;
}

function aprovechar(ocupadas, largo, rollo, ofStock) {
  let libres = huecosStock(ocupadas, largo, rollo);
  const sacos = [];
  while (libres.length) {
    const elegidos = mejorPlan(libres.flatMap(h => llenar(h, ofStock)), sacos);
    if (!elegidos.length) break;
    sacos.push(...elegidos);
    for (const s of elegidos) libres = restar(libres, { x: s.x, y: s.y, w: s.ancho, h: s.hueco });
  }
  // Iván, 17/11/2026: compara planes con las parejas cerradas en todo el material.
  const anteriores = sacosEnRectangulos(huecosLibres(ocupadas.map(p => ({ x: p.x, y: p.y, w: p.ancho, h: p.hueco })), largo, rollo), ofStock);
  return mejorPlan([completarParejasSacos(sacos), anteriores]);
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
    const g = grupos.find(g => !vertical && g.medida === s.medida && Math.abs(g.y - y) < EPS && g.h === h && Math.abs(g.x + g.w - x) < EPS);
    if (g) { g.w += w; g.n++; }
    else grupos.push({ x, y, w, h, medida: s.medida, n: 1 });
  }
  for (const g of grupos) {
    const valor = `${g.n > 1 ? 'SACOS' : 'SACO'} ${g.medida} STOCK`, vertical = g.h > g.w;
    textos.push({ capa: 'texto', x: g.x + g.w * (vertical ? .65 : .5), y: g.y + g.h * (vertical ? .5 : .4),
      h: Math.min(150, Math.min(g.w, g.h) / 5, Math.max(g.w, g.h) * .9 / anchoArial(valor, 1)), valor, centrado: true,
      ...(vertical ? { giro: 90 } : {}) });
  }
  return { sacos, lineas, textos };
}
