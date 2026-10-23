import { readFileSync } from 'node:fs';
import { ANCHO_CAJETIN } from '../domain/corteLona/cajetin.js';
import { textoSeguro } from '../domain/corteLona/texto.js';
import { calcularPuerta } from './calcular.ts';
import type { PedidoPuertas, Punto } from './tipos.ts';

type Zona = { x0: number; y0: number; x1: number; y1: number };
let plantilla: string | undefined;
const ESCALA_CAJETIN = 0.74;
const unicos = (xs: string[]) => [...new Set(xs.filter(Boolean))];
/** Ventana del corte, en mm de papel: arriba hasta el marco y abajo hasta MATERIALES, que Iván bajó junto a las notas (22/10/2026). */
export const VENTANA_CORTE_PORTANOVA = { centro: [225.3602038, 140.9411701] as Punto, ancho: 127.4184910, alto: 121.8823402 };

/** Lo que la plantilla trae en el modelo: el detalle del saco, que enseñan las ventanas 3 y 5. */
const DETALLE = { x0: 133, y0: 3, x1: 136, y1: 7 };
/** Lo que ocupa el detalle (sus puntos más extremos, con sitio para los textos). */
const CAJA_DETALLE = { x0: 133.3368022, y0: 3.5978769, x1: 135.2, y1: 6.2 };
const en = (x: number, y: number, z: Zona) => x >= z.x0 && x <= z.x1 && y >= z.y0 && y <= z.y1;
/**
 * Mueve el detalle del saco dentro del recuadro DIBUJO, debajo de las puertas, con las ventanas que lo enseñan y el
 * bloque de su cota: en el modelo no queda nada suelto y la hoja sale igual (Iván, 23/10/2026).
 */
function moverDetalle(src: string, dx: number, dy: number) {
  const mover = (t: string, codigos: number[]) => {
    const pares = t.split('\n');
    for (let i = 0; i + 1 < pares.length; i += 2) {
      const k = Number(pares[i]);
      if (codigos.includes(k)) pares[i + 1] = String(Number(pares[i + 1]) + (k < 20 ? dx : dy));
    }
    return pares.join('\n');
  };
  // Puntos de cada entidad; en el MTEXT, 11/21 es su dirección y no se mueve.
  const puntos = (t: string) => mover(t, /^ {2}0\nMTEXT\n/.test(t) ? [10, 12, 13, 14, 15, 16, 20, 22, 23, 24, 25, 26] : [10, 11, 12, 13, 14, 15, 16, 20, 21, 22, 23, 24, 25, 26]);
  const seccion = (nombre: string, f: (trozo: string) => string) => {
    const ini = src.indexOf(`\n${nombre}\n`) + nombre.length + 2, fin = src.indexOf('  0\nENDSEC\n', ini);
    src = src.slice(0, ini) + src.slice(ini, fin).split(/(?=^ {2}0\n)/m).map(f).join('') + src.slice(fin);
  };
  const bloquesCota = new Set<string>();
  seccion('ENTITIES', t => {
    if (/^ {2}0\nVIEWPORT\n/.test(t)) {
      const [x, y] = [12, 22].map(k => Number(new RegExp(`\\n ${k}\\n([^\\n]+)`).exec(t)?.[1]));
      return en(x, y, DETALLE) ? mover(t, [12, 22]) : t;
    }
    if (!/\n330\n1F\n/.test(t) || /\n 67\n\s*1\n/.test(t)) return t;
    const bloque = /^ {2}0\nDIMENSION\n[\s\S]*?\n {2}2\n([^\n]+)/.exec(t)?.[1];
    if (bloque) bloquesCota.add(bloque);
    return puntos(t);
  });
  let dentro = false;
  seccion('BLOCKS', t => {
    if (/^ {2}0\nBLOCK\n/.test(t)) { dentro = bloquesCota.has(/\n {2}2\n([^\n]+)/.exec(t)![1]); return t; }
    if (/^ {2}0\nENDBLK\n/.test(t)) { dentro = false; return t; }
    return dentro ? puntos(t) : t;
  });
  return src;
}

/** Hoja fija de la oficina: solo se rellenan los campos y se encuadran alzado y corte. */
export function presentacionPortanova(pedido: PedidoPuertas,
  cabecera: { cliente: string; tecnico: string; revisor: string; fecha: string },
  zonas: { toldos: Zona; corte: Zona }, altoVistaCorte?: number) {
  plantilla ??= readFileSync(new URL('./plantillas/portanova.dxf', import.meta.url), 'utf8').replace(/\r\n/g, '\n');
  const puertas = pedido.elementos.map(e => e.input);
  // Como los planos de la oficina (AR2604904): el cristal solo si la puerta lo lleva, y el saco que va a impresión
  // digital como AMARILLO/NEGRO (Iván, 22/10/2026).
  const materiales = unicos(puertas.flatMap(p => [
    ...(calcularPuerta(p).piezas.some(x => x.clase === 'cristal') ? [p.materialCristal] : []),
    `${p.material} ${p.color}`,
    p.sacoDiagonalesAmarillas ? p.materialSaco.replace(/NEGRO\s*$/i, 'AMARILLO/NEGRO') : p.materialSaco,
  ]))
    .map(v => textoSeguro(v).replace(/LAC\s*900/g, 'LAC 900'));
  const ventana = (z: Zona, centro: Punto, ancho: number, alto: number) => ({ z, centro, ancho, alto });
  // El detalle, 3 m por debajo de las puertas y alineado a su izquierda; el recuadro DIBUJO lo encierra también.
  const [dx, dy] = [zonas.toldos.x0 - CAJA_DETALLE.x0, zonas.toldos.y0 - 3 - CAJA_DETALLE.y1];
  return {
    detalle: { x0: CAJA_DETALLE.x0 + dx, x1: CAJA_DETALLE.x1 + dx, y0: CAJA_DETALLE.y0 + dy, y1: CAJA_DETALLE.y1 + dy },
    plantilla: moverDetalle(plantilla, dx, dy).replaceAll('ENRROLLABLES', 'ENROLLABLES').replace('TIENES QUE IR', 'TIENEN QUE IR').replace('CM.SOLDAR', 'CM. SOLDAR')
      // Iván, 23/10/2026: el cajetín se comía texto. La nota del bolsillo, un poco más estrecha para que quepa en
      // el marco, y el aviso de las E.T. 1 mm más arriba, separado del cajetín.
      .replace('E.T INTERIOR\n  7\n10 cm\n', 'E.T INTERIOR\n 41\n0.92\n  7\n10 cm\n')
      .replace(' 20\n35.50927074676054\n', ' 20\n36.6\n'),
    papel: '73996', materiales: `MATERIALES:\\P${materiales.join('\\P')}`,
    // El cajetín de la oficina al día (CAJETIN TGM) en el sitio del viejo, a su escala: no tapa el detalle
    // del saco ni el aviso de las E.T. (Iván, 22/10/2026: «así unificamos diseño»).
    cajetin: { sitio: [289.1 - ANCHO_CAJETIN * ESCALA_CAJETIN, 8] as Punto, escala: ESCALA_CAJETIN },
    presentacion: { ventanas: {
      2: ventana(zonas.toldos, [84.8917052, 104.9631513], 153.7829813, 193.8383777),
      4: { ...ventana(zonas.corte, VENTANA_CORTE_PORTANOVA.centro, VENTANA_CORTE_PORTANOVA.ancho, VENTANA_CORTE_PORTANOVA.alto), altoVista: altoVistaCorte },
    }, textos: [] },
  };
}
