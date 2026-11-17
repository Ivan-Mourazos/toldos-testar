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
function dibujarTubo(l: LienzoEnrollable, A: P, largo: number, r: number, m: ReturnType<typeof medidasSacoArena>, T: number) {
  const ang = Math.PI/6, u: P = [Math.cos(ang), Math.sin(ang)], v: P = [-Math.sin(ang), Math.cos(ang)], k = 0.1; // k pequeño: saco aplastado, la boca es una ranura
  const B: P = [A[0]+u[0]*largo, A[1]+u[1]*largo];
  const punto = (c: P, th: number, esc = 1): P => [c[0]+esc*r*(v[0]*Math.sin(th)+u[0]*k*Math.cos(th)), c[1]+esc*r*(v[1]*Math.sin(th)+u[1]*k*Math.cos(th))];
  const arco = (c: P, desde: number, hasta: number, esc = 1, n = 24) => Array.from({ length: n+1 }, (_, i) => punto(c, desde+(hasta-desde)*i/n, esc));
  const grados = (g: number) => g*Math.PI/180;
  // Bandas de luz: más claras arriba a la izquierda, casi negras abajo (ACI 250 = casi negro … 254 = gris claro).
  const N = 14;
  for (let i = 0; i < N; i++) {
    const t1 = grados(-90+180*i/N), t2 = grados(-90+180*(i+1)/N), luz = Math.cos((t1+t2)/2-grados(50));
    const color = luz > 0.93 ? 253 : luz > 0.75 ? 252 : luz > 0.35 ? 251 : 250;
    l.sombreados.push({ capa: 'referencias', solido: true, color, puntos: [...arco(A, t1, t2, 1, 4), ...arco(B, t2, t1, 1, 4)] });
  }
  // Boca del saco: por dentro plata, con la sombra del interior.
  l.sombreados.push({ capa: 'referencias', solido: true, color: 254, puntos: arco(A, 0, 2*Math.PI, 1, 48).slice(0, -1) });
  const fondo: P = [A[0]+u[0]*r*0.25, A[1]+u[1]*r*0.25];
  l.sombreados.push({ capa: 'referencias', solido: true, color: 9, puntos: arco(fondo, 0, 2*Math.PI, 0.72, 48).slice(0, -1) });
  const pl = (puntos: P[], capa = 'corte', cerrada = false) => l.polilineas.push({ capa, puntos, cerrada });
  pl(arco(A, 0, 2*Math.PI, 1, 48).slice(0, -1), 'corte', true);
  pl([punto(A, grados(90)), punto(B, grados(90))]); pl([punto(A, grados(-90)), punto(B, grados(-90))]);
  pl(arco(B, grados(-90), grados(90)));
  pl(arco(B, grados(90), grados(270)), 'ejes');
  // Medidas escritas sobre el dibujo: largo a lo largo del tubo, aplastado en la boca.
  const centro: P = [(A[0]+B[0])/2+v[0]*(r+1.3*T), (A[1]+B[1])/2+v[1]*(r+1.3*T)];
  l.textos.push({ capa: 'texto', valor: `LARGO ${numeroSacoArena(m.largo)} CM`, x: centro[0], y: centro[1], h: 1.2*T, giro: 30, centrado: true });
  l.textos.push({ capa: 'texto', valor: `APLASTADO ${numeroSacoArena(m.aplastado)} CM`, x: A[0], y: A[1]-0.9*r-1.6*T, h: 1.2*T, centrado: true });
  return B;
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
  const largoTubo = 0.6*L, r = 0.06*L, alto = largoTubo*Math.sin(Math.PI/6);
  const A: P = [L/2-largoTubo*Math.cos(Math.PI/6)/2, -a-5.5*T-r-alto];
  dibujarTubo(l, A, largoTubo, r, m, T);
  return { lienzo: l, zona: { x0: -4.5*T, x1: L+2*T, y0: A[1]-r-3.5*T, y1: 4.2*T } };
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
  const xt = Lm+4*T, xc = xt+(Lc-xt)/2;
  texto(l, 'EMPATE 2 CM · 1 CM EN CADA MITAD', xc, y+1.5*T, T);
  texto(l, 'MARCAR POR LADO NEGRO', xc, y, T);
  texto(l, `2 PIEZAS DE ${numeroSacoArena(c)} X ${numeroSacoArena(Lm)} CM`, xc, y-1.5*T, T);
  const yb = y-2*c-4*T;
  texto(l, 'ELEGIR SOLO UNA DE LAS DOS OPCIONES', Lc/2, yb, 1.1*T);
  texto(l, `OF ${p.of || 'SIN OF'} · CANTIDAD: ${p.cantidad} SACO(S)`, Lc/2, yb-1.5*T, T);
  return { lienzo: l, zona: { x0: -T, x1: Lc+3*T, y0: yb-2.5*T, y1: 4.6*T } };
}

/** Copia real en metros para CORTE; los esquemas de papel quedan en DIBUJO y nunca llegan al bot. */
export function corteRealSacosArena(cortes: CortePuertas[]) {
  const l = vacio(), x = 500, y = 100;
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
