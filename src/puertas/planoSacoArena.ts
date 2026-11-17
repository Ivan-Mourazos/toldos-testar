import { textoSeguro } from '../domain/corteLona/texto.js';
import { marcasSacoArena, medidasSacoArena, numeroSacoArena, REGLAS_SACO_ARENA } from './sacoArena.ts';
import type { LienzoEnrollable } from './planoEnrollable.ts';
import type { CortePuertas, Puerta } from './tipos.ts';

const vacio = (): LienzoEnrollable => ({ lineas: [], polilineas: [], textos: [], cotas: [], inserciones: [], sombreados: [], arcos: [], circulos: [] });
const texto = (l: LienzoEnrollable, valor: string, x: number, y: number, h = 14) => l.textos.push({ capa: 'texto', valor: textoSeguro(valor), x, y, h, centrado: true });
const rect = (l: LienzoEnrollable, x: number, y: number, ancho: number, alto: number, capa = 'DISCO1') =>
  l.polilineas.push({ capa, puntos: [[x,y],[x+ancho,y],[x+ancho,y+alto],[x,y+alto]], cerrada: true });
function cota(l: LienzoEnrollable, x1: number, y1: number, x2: number, y2: number, d: number, valor: number, letra?: number) {
  // Sin rótulo: el número es siempre lo que mide la cota (Iván, 17/11/2026). La altura del texto, en metros del modelo.
  l.cotas.push({ capa: 'cotas', estilo: 'XERA 20', x1, y1, x2, y2, d, giro: x1===x2?90:0, valor, ...(letra ? { alturaTexto: letra/100 } : {}) });
}

// En horizontal, como los planos de Iván (AR2604808, AR2604933): el largo a lo ancho de la hoja y cada cota mide lo
// que dice (Iván, 17/11/2026). La letra crece con el largo para que se lea en A4.
const letra = (largo: number) => Math.max(12, largo / 55);

type P = [number, number];
// El saco cerrado, copiado tal cual del plano de Iván AR2604933 (en sus unidades, origen en la esquina de abajo a la
// izquierda): la cabeza aplastada como un rectángulo inclinado, sus pliegues y el otro extremo redondo. Solo bordes.
const SACO_IVAN = {
  ancho: 1.0121, alto: 0.8797, giro: 40.5,
  lineas: [[0, 0.05064, 0.10314, 0], [0.02797, 0.07783, 0.13112, 0.02719], [0, 0.05064, 0.02797, 0.07783], [0.10314, 0, 0.13112, 0.02719],
    [0.04867, 0.09737, 0.94248, 0.86079], [0.13112, 0.02719, 1.0121, 0.77966]],
  arcos: [[0.08712, 0.0359, 0.0725, 71.45726, 144.66437, 'corte'], [0.08033, 0.05502, 0.0579, 331.282, 58.97582, 'corte'],
    [0.10981, 0.10352, 0.08578, 197.428, 256.66091, 'ejes'], [0.10226, 0.07148, 0.05285, 256.6111, 303.08754, 'ejes']] as const,
  elipses: [[0.9732, 0.81684, -0.0389, 0.03717, 0.61855, 3.01583, 6.32012, 'corte'], [0.97, 0.81411, -0.0389, 0.03717, 0.61855, -0.16269, Math.PI, 'ejes']] as const,
  boca: [0.06556, 0.03891] as P,
};
function dibujarTubo(l: LienzoEnrollable, x0: number, y0: number, ancho: number, m: ReturnType<typeof medidasSacoArena>, T: number) {
  const k = ancho/SACO_IVAN.ancho, en = (x: number, y: number): P => [x0+k*x, y0+k*y];
  for (const [x1, y1, x2, y2] of SACO_IVAN.lineas) { const [a, b] = [en(x1, y1), en(x2, y2)]; l.lineas.push({ capa: 'corte', x1: a[0], y1: a[1], x2: b[0], y2: b[1] }); }
  for (const [x, y, r, desde, hasta, capa] of SACO_IVAN.arcos) { const c = en(x, y); l.arcos.push({ capa, x: c[0], y: c[1], r: k*r, desde, hasta }); }
  for (const [cx, cy, mx, my, razon, t0, t1, capa] of SACO_IVAN.elipses) {
    const n = 24, puntos = Array.from({ length: n+1 }, (_, i) => { const t = t0+(t1-t0)*i/n;
      return en(cx+mx*Math.cos(t)-razon*my*Math.sin(t), cy+my*Math.cos(t)+razon*mx*Math.sin(t)); });
    l.polilineas.push({ capa, puntos, cerrada: false });
  }
  // Medidas escritas: el largo a lo largo del saco, el aplastado debajo de la cabeza.
  const g = SACO_IVAN.giro*Math.PI/180, medio = en(0.5, 0.43);
  l.textos.push({ capa: 'texto', valor: `LARGO ${numeroSacoArena(m.largo)} CM`, x: medio[0]-Math.sin(g)*1.6*T, y: medio[1]+Math.cos(g)*1.6*T, h: 1.2*T, giro: SACO_IVAN.giro, centrado: true });
  const boca = en(...SACO_IVAN.boca);
  l.textos.push({ capa: 'texto', valor: `APLASTADO ${numeroSacoArena(m.aplastado)} CM`, x: boca[0], y: y0-1.8*T, h: 1.2*T, centrado: true });
}

/** Pieza con sus marcas de rotulador, en cm, con la esquina de abajo a la izquierda en (x, y). */
function piezaConMarcas(l: LienzoEnrollable, x: number, y: number, largo: number, ancho: number, tramo: Parameters<typeof marcasSacoArena>[2]) {
  rect(l, x, y, largo, ancho);
  for (const [x1, y1, x2, y2] of marcasSacoArena(largo, ancho, tramo)) l.lineas.push({ capa: 'ROTULADOR', x1: x+x1, y1: y+y1, x2: x+x2, y2: y+y2 });
}

export function dibujarSacoConfeccionado(p: Puerta) {
  const l = vacio(), m = medidasSacoArena(p), L = m.largoCorte, c = m.anchoCorte, T = letra(L), x3 = REGLAS_SACO_ARENA.inicioLargo;
  texto(l, `SACO CONFECCIONADO · OF ${p.of || 'SIN OF'} · CANTIDAD: ${p.cantidad}`, L/2, 3*T, 1.2*T);
  // La misma pieza que se corta, como los planos de Iván (AR2604808): la marca a 3 cm de arriba, el largo pedido
  // entre las rayas verticales y, a la izquierda, el doble del aplastado hasta la marca y los 3 cm que se pisan.
  piezaConMarcas(l, 0, -c, L, c, 'entero');
  cota(l, x3, 0, x3+m.largo, 0, 0.9*T, m.largo, 1.4*T);
  cota(l, 0, -c, 0, -REGLAS_SACO_ARENA.soldadura, -1.2*T, c-REGLAS_SACO_ARENA.soldadura, 1.4*T);
  l.textos.push({ capa: 'texto', valor: 'PISAR 3CM', x: -3.4*T, y: -c/2, h: T, giro: 90, centrado: true });
  texto(l, 'SOLDAR 3CM PARA CERRAR EL CILINDRO', L/2, -c-1.6*T, T);
  texto(l, `${p.material} ${p.color} (NEGRO HACIA EL EXTERIOR)`, L/2, -c-3*T, T);
  // El saco ya cerrado debajo, centrado.
  const ancho = 0.3*L, alto = ancho*SACO_IVAN.alto/SACO_IVAN.ancho, y0 = -c-5.5*T-alto;
  dibujarTubo(l, L/2-ancho/2, y0, ancho, m, T);
  return { lienzo: l, zona: { x0: -4.5*T, x1: L+2*T, y0: y0-3.5*T, y1: 4.2*T } };
}

/**
 * El corte del saco, que es el mismo que va a la máquina (Iván, 17/11/2026): las piezas, las marcas y el mininúmero
 * salen del DXF del bot (mm → cm), y encima solo los títulos y las cotas, que el bot no lee. Abajo las dos mitades
 * apiladas y encima la pieza sin empate.
 */
export function dibujarOpcionesSacoArena(p: Puerta, corte: CortePuertas) {
  const l = vacio(), m = medidasSacoArena(p), c = m.anchoCorte, T = letra(m.largoCorte), cm = (n: number) => n / 10;
  for (const a of corte.entidades.lineas) l.lineas.push({ ...a, x1: cm(a.x1), y1: cm(a.y1), x2: cm(a.x2), y2: cm(a.y2) });
  for (const t of corte.entidades.textos) l.textos.push({ ...t, x: cm(t.x), y: cm(t.y), h: cm(t.h) });
  const pieza = (nombre: string) => corte.colocadas.find(t => t.pieza.nombre === nombre);
  const entera = pieza('SIN EMPATE'), mitades = ['PARA EMPATAR 1/2', 'PARA EMPATAR 2/2'].map(pieza);
  let x1 = 0, y0 = 0, y1 = 0;
  if (entera) {
    const x = cm(entera.x), y = cm(entera.y), L = entera.pieza.ancho;
    texto(l, 'AL CORTE · SIN EMPATE', x + L / 2, y + c + 3.2 * T, 1.2 * T);
    cota(l, x, y + c, x + L, y + c, y + c + 0.9 * T, L, 1.4 * T);
    cota(l, x + L, y, x + L, y + c, x + L + 1.2 * T, c, 1.4 * T);
    x1 = x + L + 3 * T; y1 = y + c + 4.6 * T; y0 = y;
  }
  if (mitades[0] && mitades[1]) {
    const [a, b] = mitades, x = cm(a.x), ya = cm(a.y), yb = cm(b.y) + c, M = a.pieza.ancho;
    // El «1» grande, para leerlo en la hoja; el pequeño del rotulador ya viene del bot.
    texto(l, '1', x + M - 3 * T, ya + c / 2 - T / 3, T);
    texto(l, '1', cm(b.x) + 3 * T, cm(b.y) + c / 2 - T / 3, T);
    cota(l, x, ya, x + M, ya, ya - 0.9 * T, M, 1.4 * T);
    // Apiladas: cota del alto de las dos; si van una detrás de otra, el ancho de una.
    const apiladas = b.x === a.x;
    cota(l, x + M, ya, x + M, apiladas ? yb : ya + c, x + M + 1.2 * T, apiladas ? 2 * c : c, 1.4 * T);
    // A la derecha de las mitades, en dos líneas, sin salirse del largo de la pieza entera.
    const xt = apiladas ? x + M + 4 * T : cm(b.x) + M + 2 * T, yt = (ya + (apiladas ? yb : ya + c)) / 2;
    l.textos.push({ capa: 'texto', valor: 'PARA EMPATAR', x: xt, y: yt + 0.2 * T, h: T });
    l.textos.push({ capa: 'texto', valor: 'MARCAR POR LADO NEGRO', x: xt, y: yt - 1.3 * T, h: T });
    x1 = Math.max(x1, xt + 14 * T); y0 = Math.min(y0 || ya, ya - 2.5 * T); y1 = Math.max(y1, ya + 2 * c);
  }
  return { lienzo: l, zona: { x0: -T, x1, y0, y1 } };
}
