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
  return {
    plantilla: plantilla.replaceAll('ENRROLLABLES', 'ENROLLABLES').replace('TIENES QUE IR', 'TIENEN QUE IR').replace('CM.SOLDAR', 'CM. SOLDAR')
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
