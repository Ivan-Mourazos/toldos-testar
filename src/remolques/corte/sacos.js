// Mismas medidas, tolerancia y elección de sacos que toldos y puertas. Las piezas del pedido ya están
// colocadas: solo se aprovechan rectángulos libres dentro del rollo gastado, nunca las piezas de restos.
import { SACOS, sacosEnHuecos, sacosEnRetales } from '../../domain/corteLona/colocacion.js';
import { anchoArial } from '../../domain/corteLona/texto.js';

const area = sacos => sacos.reduce((s, p) => s + p.ancho * p.hueco, 0);
const derecha = p => p.x + p.w, arriba = p => p.y + p.h;
const EPS = 0.001;

// Conserva los rectángulos libres máximos, aunque se crucen entre sí. A diferencia de la partición
// común, no se reserva un retal entero antes de saber si da sacos: una franja de 70 cm no debe partir
// un hueco vertical válido. Solo se restan las piezas y, después, los sacos realmente elegidos.
function restar(libres, p) {
  const siguientes = [];
  for (const h of libres) {
    if (p.x >= derecha(h) - EPS || derecha(p) <= h.x + EPS || p.y >= arriba(h) - EPS || arriba(p) <= h.y + EPS) {
      siguientes.push(h); continue;
    }
    if (p.x > h.x + EPS) siguientes.push({ ...h, w: p.x - h.x });
    if (derecha(p) < derecha(h) - EPS) siguientes.push({ ...h, x: derecha(p), w: derecha(h) - derecha(p) });
    if (p.y > h.y + EPS) siguientes.push({ ...h, h: p.y - h.y });
    if (arriba(p) < arriba(h) - EPS) siguientes.push({ ...h, y: arriba(p), h: arriba(h) - arriba(p) });
  }
  return siguientes.filter((a, i) => !siguientes.some((b, j) => i !== j && b.x <= a.x + EPS && b.y <= a.y + EPS
    && derecha(b) >= derecha(a) - EPS && arriba(b) >= arriba(a) - EPS
    && (j < i || b.w * b.h > a.w * a.h + EPS)));
}

function mejorPlan(planes) {
  const opciones = planes.map(sacos => ({ sacos, area: area(sacos) }));
  const maximo = Math.max(0, ...opciones.map(p => p.area));
  return opciones.filter(p => p.area >= maximo * 0.95)
    .sort((a, b) => a.sacos.length - b.sacos.length || b.area - a.area)[0]?.sacos ?? [];
}

function llenar(h, ofStock) {
  const rejilla = r => sacosEnHuecos([{ x: r.x, y: 0, ancho: r.w, hueco: r.y }], r.y + r.h, ofStock);
  const planes = [rejilla(h)];
  // Dos bandas permiten mezclar medidas, por ejemplo 120×165 + 120×115 en 285×120 cm.
  // El catálogo y la tolerancia siguen siendo los comunes: también sus rejillas deciden cada medida real.
  const medidas = new Set(SACOS.flatMap(s => s.flatMap(cm => [cm - 5, cm, cm + 5].map(v => v * 10))));
  for (const d of medidas) {
    if (d < h.w) planes.push([...rejilla({ ...h, w: d }), ...rejilla({ ...h, x: h.x + d, w: h.w - d })]);
    if (d < h.h) planes.push([...rejilla({ ...h, h: d }), ...rejilla({ ...h, y: h.y + d, h: h.h - d })]);
  }
  return mejorPlan(planes);
}

function aprovechar(ocupadas, largo, rollo, ofStock) {
  let libres = [{ x: 0, y: 0, w: largo, h: rollo }];
  for (const p of ocupadas) libres = restar(libres, { x: p.x, y: p.y, w: p.ancho, h: p.hueco });
  const sacos = [];
  while (libres.length) {
    const elegidos = mejorPlan(libres.map(h => llenar(h, ofStock)));
    if (!elegidos.length) break;
    sacos.push(...elegidos);
    for (const s of elegidos) libres = restar(libres, { x: s.x, y: s.y, w: s.ancho, h: s.hueco });
  }
  // La búsqueda adicional nunca pierde superficie respecto del resultado común anterior.
  const anteriores = sacosEnRetales(ocupadas, rollo, ofStock)
    .filter(s => s.x + s.ancho <= largo + EPS);
  return area(sacos) > area(anteriores) + EPS ? sacos : anteriores;
}

export function sacosDeStock(ocupadas, rollo, ofStock, largo = Math.max(0, ...ocupadas.map(p => p.x + p.ancho))) {
  if (!ofStock) return { sacos: [], lineas: [], textos: [] };
  const sacos = aprovechar(ocupadas, largo, rollo, ofStock);
  const lineas = [], textos = [];
  for (const s of sacos) {
    const { x, y, ancho: w, hueco: h } = s;
    lineas.push([x, y, x + w, y], [x + w, y, x + w, y + h], [x + w, y + h, x, y + h], [x, y + h, x, y]);
    const rotulo = [s.of, 'SACO', s.medida, 'STOCK'];
    // A lo largo del lado largo, como en los sacos de AR2604390/4990/5000. Solo texto de consulta:
    // las marcas de montaje en ROTULADOR siguen siendo las del remolque, de 1 cm.
    const vertical = h > w, largo = Math.max(w, h), corto = Math.min(w, h);
    const alto = Math.min(150, corto / 8, corto * 0.9 / (3 * 1.6 + 1), ...rotulo.map(v => largo * 0.9 / anchoArial(v, 1)));
    rotulo.forEach((valor, k) => {
      const d = (1.5 - k) * alto * 1.6;
      textos.push({ capa: 'texto', x: x + w / 2 - (vertical ? d : 0), y: y + h / 2 + (vertical ? 0 : d),
        h: alto, valor, centrado: true, ...(vertical ? { giro: 90 } : {}) });
    });
  }
  return { sacos, lineas, textos };
}
