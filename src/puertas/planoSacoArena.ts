import { textoSeguro } from '../domain/corteLona/texto.js';
import { medidasSacoArena, numeroSacoArena, REGLAS_SACO_ARENA } from './sacoArena.ts';
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

export function dibujarSacoConfeccionado(p: Puerta) {
  const l = vacio(), m = medidasSacoArena(p), L = m.largo, a = m.confeccionado, T = letra(L);
  texto(l, `SACO CONFECCIONADO · OF ${p.of || 'SIN OF'} · CANTIDAD: ${p.cantidad}`, L/2, 3*T, 1.2*T);
  // Plano abierto a escala real, como los planos de Iván: largo arriba, ancho y «PISAR 3CM» a la izquierda.
  rect(l, 0, -a, L, a, 'referencias');
  l.lineas.push({ capa: 'ROTULADOR', x1: 0, y1: -a+REGLAS_SACO_ARENA.soldadura, x2: L, y2: -a+REGLAS_SACO_ARENA.soldadura });
  cota(l, 0, 0, L, 0, 0.9*T, L, 1.4*T);
  cota(l, 0, -a, 0, 0, -1.2*T, a, 1.4*T);
  l.textos.push({ capa: 'texto', valor: 'PISAR 3CM', x: -3.4*T, y: -a/2, h: T, giro: 90, centrado: true });
  texto(l, 'SOLDAR 3CM PARA CERRAR EL CILINDRO', L/2, -a-1.6*T, T);
  texto(l, `${p.material} ${p.color} (NEGRO HACIA EL EXTERIOR)`, L/2, -a-3*T, T);
  // El saco ya cerrado y aplastado debajo, centrado.
  const ancho = 0.3*L, alto = ancho*SACO_IVAN.alto/SACO_IVAN.ancho, y0 = -a-5.5*T-alto;
  dibujarTubo(l, L/2-ancho/2, y0, ancho, m, T);
  return { lienzo: l, zona: { x0: -4.5*T, x1: L+2*T, y0: y0-3.5*T, y1: 4.2*T } };
}

export function dibujarOpcionesSacoArena(p: Puerta) {
  const l = vacio(), m = medidasSacoArena(p), Lc = m.largoCorte, Lm = m.largoMitad, c = m.anchoCorte, T = letra(Lc);
  texto(l, 'AL CORTE · SIN EMPATE', Lc/2, 3.2*T, 1.2*T);
  rect(l, 0, -c, Lc, c);
  cota(l, 0, 0, Lc, 0, 0.9*T, Lc, 1.4*T);
  cota(l, Lc, -c, Lc, 0, Lc+1.2*T, c, 1.4*T);
  // Las dos mitades una encima de otra, como el dibujo de Iván: cota del alto de las dos y del largo de cada mitad.
  const y = -c-7*T;
  texto(l, 'PARA EMPATAR', Lm/2, y+3.2*T, 1.2*T);
  for (const [i, py] of [y-c, y-2*c].entries()) {
    rect(l, 0, py, Lm, c);
    const xm = i===0 ? Lm-1 : 1;
    l.lineas.push({ capa: 'ROTULADOR', x1: xm, y1: py, x2: xm, y2: py+c });
    texto(l, '1', i===0 ? Lm-3*T : 3*T, py+c/2-T/3, T);
  }
  cota(l, 0, y, Lm, y, y+0.9*T, Lm, 1.4*T);
  cota(l, Lm, y-2*c, Lm, y, Lm+1.2*T, 2*c, 1.4*T);
  // Como el plano de Iván: solo «MARCAR POR LADO NEGRO» al lado; el resto ya lo dicen las cotas y los «1» (17/11/2026).
  texto(l, 'MARCAR POR LADO NEGRO', Lm+4*T+(Lc-Lm-4*T)/2, y-c-T/3, T);
  return { lienzo: l, zona: { x0: -T, x1: Lc+3*T, y0: y-2*c-2.5*T, y1: 4.6*T } };
}

/** Copia real en metros para CORTE; los esquemas de papel quedan en DIBUJO y nunca llegan al bot. */
/** x, y: esquina de abajo a la izquierda, en metros, justo a la derecha del DIBUJO (no a cientos de metros). */
export function corteRealSacosArena(cortes: CortePuertas[], x: number, y: number) {
  const l = vacio();
  let dy = 0, ancho = 0;
  for (const c of cortes) {
    l.lineas.push(...c.entidades.lineas.map(a=>({...a,x1:x+a.x1/1000,x2:x+a.x2/1000,y1:y+dy+a.y1/1000,y2:y+dy+a.y2/1000})));
    l.textos.push(...c.entidades.textos.map(a=>({...a,x:x+a.x/1000,y:y+dy+a.y/1000,h:a.h/1000})));
    l.arcos.push(...c.entidades.arcos.map(a=>({...a,x:x+a.x/1000,y:y+dy+a.y/1000,r:a.r/1000})));
    l.circulos.push(...c.entidades.circulos.map(a=>({...a,x:x+a.x/1000,y:y+dy+a.y/1000,r:a.r/1000})));
    ancho=Math.max(ancho,c.largo/1000);dy+=(c.anchoRollo+1500)/1000;
  }
  return {lienzo:l,zona:{x0:x-.2,x1:x+ancho+.5,y0:y-.2,y1:y+dy+.5}};
}
