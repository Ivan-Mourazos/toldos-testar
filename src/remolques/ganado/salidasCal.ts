import { calcularMedidasCal, type DesarrolloCal, type MedidasCal, type PiezaCal, type PuntoCal, type PrimitivaCal } from './medidas.ts';
import type { DIBUJO_ECONOMICO } from './economicoDatos.ts';

type Dibujo = typeof DIBUJO_ECONOMICO;
const fmt = (x: number) => (x / 10).toLocaleString('es-ES', { maximumFractionDigits: 2 });
const limites = (p: PuntoCal[]) => {
  const xs = p.map(p => p[0]), ys = p.map(p => p[1]);
  return { x: Math.min(...xs), y: Math.min(...ys), w: Math.max(...xs) - Math.min(...xs), h: Math.max(...ys) - Math.min(...ys) };
};
export const medidaPiezaCal = (p: PiezaCal, terminado = false) => {
  const b = limites(terminado && p.terminado ? p.terminado : p.contorno);
  return `${fmt(b.w)} × ${fmt(b.h)}${p.nombre === 'Morro' ? ' (envolvente)' : ''}`;
};

/** Colocación conservadora por piezas enteras, sin empates ni cambios de escala; rollo de 250. */
export function juegoCorteCal(m: MedidasCal, of = '', cantidad = 1) {
  const g = calcularMedidasCal(m);
  const out = { w: 0, h: 0, lineas: [] as number[][], arcos: [] as { x: number; y: number; r: number; desde: number; hasta: number }[],
    rot: [] as number[][], ollaos: [] as number[][], numeros: [], textos: [] as { x: number; y: number; h: number; valor: string }[] };
  for (const p of g.piezas) {
    const b = limites(p.contorno), girar = b.h > 2500;
    const h = girar ? b.w : b.h, w = girar ? b.h : b.w;
    if (h > 2500) throw Error(`${p.nombre}: no cabe entero en el rollo de 250; hace falta definir el empate.`);
    const tx = out.w;
    const T = ([x, y]: PuntoCal): PuntoCal => girar ? [tx + b.h - (y - b.y), x - b.x] : [tx + x - b.x, y - b.y];
    for (const q of p.corte) {
      if (q.tipo === 'tramo') out.lineas.push([...T(q.a), ...T(q.b)]);
      if (q.tipo === 'arco') {
        const [x, y] = T(q.c), ang = (q.inicio + (girar ? Math.PI / 2 : 0)) * 180 / Math.PI;
        const fin = ang + q.barrido * 180 / Math.PI;
        const grados = (a: number) => (a % 360 + 360) % 360;
        out.arcos.push({ x, y, r: q.r, desde: grados(q.barrido < 0 ? fin : ang), hasta: grados(q.barrido < 0 ? ang : fin) });
      }
    }
    for (const q of p.marcas) if (q.tipo === 'tramo') out.rot.push([...T(q.a), ...T(q.b)]);
    for (const q of p.ollaos) out.ollaos.push(T(q.c));
    out.textos.push({ x: tx + w / 2, y: h / 2, h: 70, valor: `${p.nombre} · ${of}${cantidad > 1 ? ` · X${cantidad}` : ''}` });
    out.w += w + 10;
    out.h = Math.max(out.h, h);
  }
  out.w -= 10;
  return out;
}

/** El mismo contorno y los mismos centros para pantalla, hoja y plano. En cm. */
export function dibujoCal(m: MedidasCal): Dibujo {
  const g: DesarrolloCal = calcularMedidasCal(m);
  const d: Dibujo = { ancho: 0, alto: 0, lineas: [], polilineas: [], arcos: [], circulos: [], textos: [], cotas: [] };
  let x = 0, y = 0, fila = 0;
  const primitiva = (q: PrimitivaCal, capa: string, T: (p: PuntoCal) => PuntoCal) => {
    if (q.tipo === 'tramo') {
      const [x1, y1] = T(q.a), [x2, y2] = T(q.b);
      d.lineas.push({ capa, x1, y1, x2, y2 });
    } else {
      const [x, y] = T(q.c);
      if (q.tipo === 'ollao') d.circulos.push({ capa, x, y, r: q.r / 10 });
      else {
        const a = q.inicio * 180 / Math.PI, b = (q.inicio + q.barrido) * 180 / Math.PI;
        const grados = (a: number) => (a % 360 + 360) % 360;
        d.arcos.push({ capa, x, y, r: q.r / 10, desde: grados(q.barrido < 0 ? b : a), hasta: grados(q.barrido < 0 ? a : b) });
      }
    }
  };
  g.piezas.forEach((p, i) => {
    if (i === 2) { x = 0; y += fila + 55; fila = 0; }
    const b = limites(p.contorno), w = b.w / 10, h = b.h / 10;
    const T = ([a, c]: PuntoCal): PuntoCal => [x + (a - b.x) / 10, y + (c - b.y) / 10];
    for (const q of p.corte) primitiva(q, 'DISCO1', T);
    for (const q of [...p.marcas, ...p.ollaos]) primitiva(q, 'ROTULADOR', T);
    if (p.terminado) d.polilineas.push({ capa: 'referencias', puntos: p.terminado.map(T), cerrada: p.nombre === 'Cuerpo' || p.nombre === 'Morro' });
    d.textos.push({ valor: `${p.nombre} · corte ${medidaPiezaCal(p)}`, x: x + w / 2, y: y + h + 15, h: 6.5, giro: 0 });
    d.cotas.push({ x1: x, y1: y, x2: x + w, y2: y, valor: w, giro: 0, d: y - 12 },
      { x1: x + w, y1: y, x2: x + w, y2: y + h, valor: h, giro: 90, d: x + w + 10 });
    d.ancho = Math.max(d.ancho, x + w + 20);
    d.alto = Math.max(d.alto, y + h + 25);
    fila = Math.max(fila, h); x += w + 45;
  });
  const notas = [
    `Lona por el exterior del arco · R${m.radio.toLocaleString('es-ES')} · medidas en cm`,
    'Bajos B.N.(3) + ollaos · costura 1 · ' + (m.recogidaAtras === 'CUERDA' ? 'cuerda fruncida' : m.recogidaAtras === 'GOMA' ? 'goma fruncida' : 'fruncido') + ' atrás ' + m.fruncir.toLocaleString('es-ES'),
    ...(g.ventana ? [`Ventana ${g.ventana.ancho.toLocaleString('es-ES')} × ${g.ventana.alto.toLocaleString('es-ES')} · 5 bajo tangencia`] : []),
    ...(g.puerta ? [`Puerta ${g.puerta.lado} en diagonal ${g.puerta.ancho.toLocaleString('es-ES', { maximumFractionDigits: 2 })} · cremalleras a ${g.puerta.separacionBorde.toLocaleString('es-ES')} · sin solapas`] : []),
    ...(m.refuerzoMfd ? ['Refuerzo MFD de Cal · pieza aparte y posición marcada en el morro'] : []),
    ...(g.pendientes.length ? ['PARCIAL · FALTA DEFINIR LA PUERTA · CORTE COMPLETO A MANO'] : []),
  ];
  for (const nota of notas) { d.alto += 10; d.textos.push({ valor: nota, x: d.ancho / 2, y: d.alto, h: 6.5, giro: 0 }); }
  return d;
}

export function dibujoCorteCal(m: MedidasCal): Dibujo {
  const c = juegoCorteCal(m), g = calcularMedidasCal(m);
  return {
    ancho: c.w / 10, alto: c.h / 10 + 35,
    lineas: [...c.lineas.map(([x1, y1, x2, y2]) => ({ capa: 'DISCO1', x1: x1 / 10, y1: y1 / 10, x2: x2 / 10, y2: y2 / 10 })),
      ...c.rot.map(([x1, y1, x2, y2]) => ({ capa: 'ROTULADOR', x1: x1 / 10, y1: y1 / 10, x2: x2 / 10, y2: y2 / 10 }))],
    arcos: c.arcos.map(a => ({ ...a, capa: 'DISCO1', x: a.x / 10, y: a.y / 10, r: a.r / 10 })),
    circulos: c.ollaos.map(([x, y]) => ({ capa: 'ROTULADOR', x: x / 10, y: y / 10, r: 0.25 })),
    polilineas: [], cotas: [],
    textos: [...c.textos.map(t => ({ ...t, x: t.x / 10, y: t.y / 10, h: t.h / 10, giro: 0 })),
      { x: c.w / 20, y: c.h / 10 + 20, h: 7, giro: 0, valor: g.pendientes.length ? 'CORTE PARCIAL · FALTA LA PUERTA · PEDIDO COMPLETO A MANO' : 'CORTE POR PIEZAS ENTERAS · ROLLO DE 250' }],
  };
}
