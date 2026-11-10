import { readFileSync } from 'node:fs';
import { ANCHO_CAJETIN } from '../domain/corteLona/cajetin.js';
import { anchoArial, textoSeguro } from '../domain/corteLona/texto.js';
import { calcularPuerta } from './calcular.ts';
import { separarNumeroCotaDetalle } from './presentacionImpresion.js';
import type { PedidoPuertas, Punto } from './tipos.ts';

type Zona = { x0: number; y0: number; x1: number; y1: number };
let plantilla: string | undefined;
const ESCALA_CAJETIN = 0.74;
const unicos = (xs: string[]) => [...new Set(xs.filter(Boolean))];
/** Ventana del corte, en mm de papel: arriba hasta el marco y abajo hasta MATERIALES, que Iván bajó junto a las notas (22/10/2026). */
export const VENTANA_CORTE_PORTANOVA = { centro: [225.3602038, 140.9411701] as Punto, ancho: 127.4184910, alto: 121.8823402 };
const ventanaEnZona = (v: { centro: Punto; ancho: number; alto: number }): Zona =>
  ({ x0: v.centro[0] - v.ancho / 2, x1: v.centro[0] + v.ancho / 2, y0: v.centro[1] - v.alto / 2, y1: v.centro[1] + v.alto / 2 });
export type DisposicionPortanova = 'lado' | 'arriba';
/**
 * Dónde van el dibujo y el corte en la hoja (mm de papel). «lado»: el dibujo a la izquierda y el corte arriba a la
 * derecha, como la plantilla. «arriba»: para puertas muy anchas, el dibujo centrado arriba a todo lo ancho y el corte
 * abajo a la izquierda; las notas, MATERIALES y el cajetín siguen abajo a la derecha (Iván, 06/11/2026).
 */
export const DISPOSICIONES_PORTANOVA: Record<DisposicionPortanova, { dibujo: Zona; corte: Zona; rayas: Punto[][] }> = {
  lado: { dibujo: ventanaEnZona({ centro: [84.8917052, 104.9631513], ancho: 153.7829813, alto: 193.8383777 }),
    corte: ventanaEnZona(VENTANA_CORTE_PORTANOVA), rayas: [[[160.5, 16], [160.5, 194]]] },
  arriba: { dibujo: { x0: 9, x1: 288, y0: 86, y1: 201.88 }, corte: { x0: 9, x1: 157, y0: 9, y1: 80 },
    // La raya entre el dibujo y lo de abajo, y otra entre el corte y los textos (Iván, 06/11/2026).
    rayas: [[[16, 83], [281, 83]], [[160.5, 16], [160.5, 78]]] },
};

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
/** Las notas de taller de la plantilla de Portanova, con su texto de siempre (Iván: «siempre la misma, notas y todo»). */
const NOTAS_PORTANOVA = [
  'SACO NEGRO (900 GR) ABAJO, SOLDADO ENCIMA DE LA SOLDADURA DE LA E.T.',
  'SACO INFERIOR: SUBIR LA TEMPERATURA DE REFRIGERACIÓN AL SOLDAR.',
  'ELECTRODO DE 2 EN TODO (VENTANAS INTERIORES CON CURVA: 2 DE AUMENTO ALREDEDOR).',
  'BOLSILLO 30 X 17 CM (900 GR) CON SOPLETE EN EL SACO NEGRO, 1 CM BAJO LA E.T. INTERIOR.',
  'NUNCA PONER LAS ETIQUETAS EN LA LONA.',
];
const AVISO_ET_PORTANOVA = 'E.T. INTERIORES DE LAS ENROLLABLES: DE 5 CM (NUNCA MENOS) A 5,5 CM COMO MÁXIMO. SOLDAR CON ELECTRODO DE 2 CM.';
type TextoPapel = { x: number; y: number; h: number; ancho: number; valor: string; capa?: string };
/** Salto de línea dentro de un texto de la hoja (la presentación lo pasa a \P del MTEXT). */
const SALTO = String.fromCharCode(10);
/** Cuántas líneas ocupa un texto con ese ancho y esa letra (Arial). */
function lineasDe(valor: string, h: number, ancho: number) {
  let n = 1, actual = '';
  for (const palabra of valor.split(' ')) {
    if (actual && anchoArial(`${actual} ${palabra}`, h) > ancho) { n++; actual = palabra; } else actual += (actual ? ' ' : '') + palabra;
  }
  return n;
}
/**
 * El bloque de junto al cajetín, ordenado (Iván, 06/11/2026: «que quede todo más profesional»): arriba MATERIALES a la
 * izquierda y el aviso de las E.T. en un recuadro a la derecha; debajo las notas, todas iguales; abajo el detalle del
 * saco y el cajetín, que no se mueven. Medidas en mm de papel.
 */
export function bloqueNotasPortanova(materiales: string[]) {
  // Iván, 06/11/2026: compacto y legible en papel. Arriba MATERIALES en una línea y las notas a todo lo ancho; abajo, el
  // detalle del saco ocupando su hueco entero y el aviso de las E.T. del ancho del cajetín, apoyado encima de él.
  const X0 = 164, X1 = 289.1, ARRIBA = 79.5, MEDIO = 289.1 - ANCHO_CAJETIN * ESCALA_CAJETIN, CAJETIN = 27.6;
  const textos: TextoPapel[] = [], lineas: Punto[][] = [];
  const hTitulo = 2.6, salto = hTitulo * 1.9, util = (X1 - X0) * .92;
  const lista = `MATERIALES: ${materiales.join('  ·  ')}`;
  const hMaterial = [2.4, 2.2, 2, 1.8, 1.6].find(h => lineasDe(lista, h, util) === 1) ?? 1.6;
  const lineasMat = lineasDe(lista, hMaterial, util);
  textos.push({ x: X0, y: ARRIBA, h: hMaterial, ancho: X1 - X0, valor: lista });
  let y = ARRIBA - lineasMat * hMaterial * 1.3 - 1.5;
  lineas.push([[X0, y], [X1, y]]);
  y -= 2;
  // Las notas: con su letra, hasta 2,3 mm; el interlineado real del MTEXT es 1,3 veces la letra.
  const notas = NOTAS_PORTANOVA.map(v => `· ${v}`);
  const hNota = [2.3, 2.2, 2.1, 2, 1.9, 1.8].find(h => notas.reduce((s, v) => s + lineasDe(v, h, util), 0) <= notas.length) ?? 1.8;
  const lineasNotas = notas.reduce((s, v) => s + lineasDe(v, hNota, util), 0);
  textos.push({ x: X0, y, h: hTitulo, ancho: X1 - X0, valor: 'NOTAS DE CONFECCIÓN' });
  textos.push({ x: X0, y: y - salto, h: hNota, ancho: X1 - X0, valor: notas.join(SALTO) });
  y -= salto + lineasNotas * hNota * 1.3 + 1.5;
  lineas.push([[X0, y], [X1, y]]);
  // El aviso, apoyado en el cajetín y de su mismo ancho.
  const anchoAviso = X1 - MEDIO - 4, hAviso = 2.1;
  const altoAviso = salto + lineasDe(AVISO_ET_PORTANOVA, hAviso, anchoAviso * .92) * hAviso * 1.3 + 1.5;
  const techoAviso = CAJETIN + altoAviso;
  textos.push({ x: MEDIO + 2, y: techoAviso - 1.5, h: hTitulo, ancho: anchoAviso, valor: 'IMPORTANTE', capa: 'referencias' });
  textos.push({ x: MEDIO + 2, y: techoAviso - 1.5 - salto, h: hAviso, ancho: anchoAviso, valor: AVISO_ET_PORTANOVA, capa: 'referencias' });
  lineas.push([[MEDIO, CAJETIN], [MEDIO, techoAviso], [X1, techoAviso], [X1, CAJETIN]]);
  // El detalle del saco, en todo el hueco de abajo a la izquierda.
  const detalle = { x0: X0 - 3, x1: MEDIO - 2, y0: 9, y1: y - 1.5 };
  return { textos, lineas, detalle, // Las notas viejas de la plantilla, que están en el modelo junto al detalle, salen: van arriba, reescritas.
    quitarTextos: ['MATERIALES', 'LAS ENTRADAS DE TUBO INTERIORES', 'ABAJO SACO NEGRO', 'PARA SOLDAR EL SACO INFERIOR',
      'UTILIZAR EN TODO EL', 'BOLSILLO CORTADO', 'NO PONER NUNCA LAS ETIQUETAS', 'LAS E.T DE'], quitarVentanas: [3] };
}

export function presentacionPortanova(pedido: PedidoPuertas,
  cabecera: { cliente: string; tecnico: string; revisor: string; fecha: string },
  zonas: { toldos: Zona; corte: Zona }, altoVistaCorte?: number, tramosCorte?: Array<{ zona: Zona; papel: Zona }>,
  disposicion: DisposicionPortanova = 'lado', ventanaCorte?: Zona) {
  const sitio = { ...DISPOSICIONES_PORTANOVA[disposicion], ...(ventanaCorte ? { corte: ventanaCorte } : {}) };
  const centro = (z: Zona): Punto => [(z.x0 + z.x1) / 2, (z.y0 + z.y1) / 2];
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
  const detalleModelo = { x0: CAJA_DETALLE.x0 + dx, x1: CAJA_DETALLE.x1 + dx, y0: CAJA_DETALLE.y0 + dy, y1: CAJA_DETALLE.y1 + dy };
  const bloque = bloqueNotasPortanova(materiales);
  return {
    detalle: detalleModelo,
    plantilla: separarNumeroCotaDetalle(moverDetalle(plantilla, dx, dy)).replaceAll('ENRROLLABLES', 'ENROLLABLES').replace('TIENES QUE IR', 'TIENEN QUE IR').replace('CM.SOLDAR', 'CM. SOLDAR')
      // Iván, 23/10/2026: el cajetín se comía texto. La nota del bolsillo, un poco más estrecha para que quepa en
      // el marco, y el aviso de las E.T. 1 mm más arriba, separado del cajetín.
      .replace('E.T INTERIOR\n  7\n10 cm\n', 'E.T INTERIOR\n 41\n0.92\n  7\n10 cm\n')
      .replace(' 20\n35.50927074676054\n', ' 20\n36.6\n'),
    papel: '73996', materiales: `MATERIALES:\\P${materiales.join('\\P')}`,
    // El cajetín de la oficina al día (CAJETIN TGM) en el sitio del viejo, a su escala: no tapa el detalle
    // del saco ni el aviso de las E.T. (Iván, 22/10/2026: «así unificamos diseño»).
    cajetin: { sitio: [289.1 - ANCHO_CAJETIN * ESCALA_CAJETIN, 8] as Punto, escala: ESCALA_CAJETIN },
    presentacion: { ventanas: {
      2: ventana(zonas.toldos, centro(sitio.dibujo), sitio.dibujo.x1 - sitio.dibujo.x0, sitio.dibujo.y1 - sitio.dibujo.y0),
      4: { ...ventana(zonas.corte, centro(sitio.corte), sitio.corte.x1 - sitio.corte.x0, sitio.corte.y1 - sitio.corte.y0), altoVista: altoVistaCorte },
      // El corte repartido en tramos, uno debajo de otro (Iván, 05/11/2026): la 4 enseña el primero; la 7, la 8… el resto.
      ...Object.fromEntries((tramosCorte ?? []).map((t, i) => [i ? 6 + i : 4, {
        ...ventana(t.zona, [(t.papel.x0 + t.papel.x1) / 2, (t.papel.y0 + t.papel.y1) / 2] as Punto,
          t.papel.x1 - t.papel.x0, t.papel.y1 - t.papel.y0), altoVista: t.zona.y1 - t.zona.y0 }])),
      // El detalle del saco, en el hueco que le deja el bloque de notas (Iván, 06/11/2026).
      5: (() => {
        // A la medida del detalle (sin las notas viejas de debajo) y centrado en su hueco.
        const z = { ...detalleModelo, y0: detalleModelo.y0 + .75, x1: detalleModelo.x1 + .45 }, R = bloque.detalle;
        const k = Math.min((R.x1 - R.x0) / (z.x1 - z.x0), (R.y1 - R.y0) / (z.y1 - z.y0));
        return ventana(z, centro(R), (z.x1 - z.x0) * k, (z.y1 - z.y0) * k);
      })(),
    }, textos: bloque.textos, quitarTextos: bloque.quitarTextos, quitarVentanas: bloque.quitarVentanas,
    // La raya entre el dibujo (ventana 2) y el corte, como en las demás hojas, sin llegar al marco (Iván, 06/11/2026).
    lineas: [...sitio.rayas, ...bloque.lineas] },
  };
}
