import { textoSeguro } from '../domain/corteLona/texto.js';
import { medidasSacoArena, numeroSacoArena } from './sacoArena.ts';
import type { LienzoEnrollable } from './planoEnrollable.ts';
import type { CortePuertas, Puerta } from './tipos.ts';

const vacio = (): LienzoEnrollable => ({ lineas: [], polilineas: [], textos: [], cotas: [], inserciones: [], sombreados: [], arcos: [], circulos: [] });
const texto = (l: LienzoEnrollable, valor: string, x: number, y: number, h = 14) => l.textos.push({ capa: 'texto', valor: textoSeguro(valor), x, y, h, centrado: true });
const rect = (l: LienzoEnrollable, x: number, y: number, ancho: number, alto: number, capa = 'DISCO1') =>
  l.polilineas.push({ capa, puntos: [[x,y],[x+ancho,y],[x+ancho,y+alto],[x,y+alto]], cerrada: true });
function cota(l: LienzoEnrollable, x1: number, y1: number, x2: number, y2: number, d: number, valor: number) {
  l.cotas.push({ capa: 'cotas', estilo: 'XERA 20', x1, y1, x2, y2, d, giro: x1===x2?90:0, valor, rotulo: numeroSacoArena(valor) });
}

/** Esquema ensanchado y largo reducido para leerlo en A4. Las cotas conservan siempre los cm reales. */
export function dibujarSacoConfeccionado(p: Puerta) {
  const l = vacio(), m = medidasSacoArena(p), w = 120, h = 440;
  texto(l, 'SACO CONFECCIONADO', w/2, 85, 20);
  texto(l, `OF ${p.of || 'SIN OF'} · CANTIDAD: ${p.cantidad}`, w/2, 55);
  rect(l, 0, -h, w, h, 'referencias');
  const marca = w * 3/m.confeccionado;
  l.lineas.push({ capa: 'ROTULADOR', x1: marca, y1: -h, x2: marca, y2: 0 });
  cota(l, 0, 0, w, 0, 25, m.confeccionado);
  cota(l, w, -h, w, 0, w+35, m.largo);
  texto(l, 'PISAR 3CM', w/2, -h-35);
  texto(l, 'SOLDAR 3CM PARA CERRAR EL CILINDRO', w/2, -h-65);
  texto(l, `${p.material} ${p.color}`, w/2, -h-95);
  texto(l, '(NEGRO HACIA EL EXTERIOR)', w/2, -h-120);
  texto(l, 'ESQUEMA SIN ESCALA · COTAS REALES EN CM', w/2, -h-150, 12);
  return { lienzo: l, zona: { x0: -155, x1: 285, y0: -h-175, y1: 110 } };
}

export function dibujarOpcionesSacoArena(p: Puerta) {
  const l = vacio(), m = medidasSacoArena(p), w = 90, h = 440, x = 255;
  texto(l, 'AL CORTE · SIN EMPATE', w/2, 70, 18);
  rect(l, 0, -h, w, h);
  cota(l, 0, 0, w, 0, 25, m.anchoCorte);
  cota(l, 0, -h, 0, 0, -35, m.largoCorte);
  texto(l, 'PARA EMPATAR', x+w, 70, 18);
  // Las dos mitades juntas, como el dibujo de Iván: cota de ancho total y de largo de cada mitad.
  for (const [i, px] of [x, x+w].entries()) {
    rect(l, px, -h/2, w, h/2);
    const yy = i===0 ? -h/2+8 : -8;
    l.lineas.push({ capa: 'ROTULADOR', x1: px, y1: yy, x2: px+w, y2: yy });
    texto(l, '1', px+w/2, i===0 ? yy+14 : yy-24, 16);
  }
  cota(l, x, 0, x+2*w, 0, 25, 2*m.anchoCorte);
  cota(l, x+2*w, -h/2, x+2*w, 0, x+2*w+35, m.largoMitad);
  cota(l, x, -h/2, x+w, -h/2, -h/2-30, m.anchoCorte);
  texto(l, 'EMPATE 2 CM · 1 CM EN CADA MITAD', x+w, -h/2-65, 13);
  texto(l, 'MARCAR POR LADO NEGRO', x+w, -h/2-95, 14);
  texto(l, `2 PIEZAS DE ${numeroSacoArena(m.anchoCorte)} X ${numeroSacoArena(m.largoMitad)} CM`, x+w, -h/2-125, 13);
  texto(l, 'ELEGIR SOLO UNA DE LAS DOS OPCIONES', 210, -h-65, 16);
  texto(l, `OF ${p.of || 'SIN OF'} · CANTIDAD: ${p.cantidad} SACO(S)`, 210, -h-95, 14);
  texto(l, 'ESQUEMA SIN ESCALA · COTAS REALES EN CM', 210, -h-125, 13);
  return { lienzo: l, zona: { x0: -65, x1: 515, y0: -h-160, y1: 100 } };
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
