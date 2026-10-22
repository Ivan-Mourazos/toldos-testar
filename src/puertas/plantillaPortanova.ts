import { readFileSync } from 'node:fs';
import { textoSeguro } from '../domain/corteLona/texto.js';
import type { PedidoPuertas, Punto } from './tipos.ts';

type Zona = { x0: number; y0: number; x1: number; y1: number };
let plantilla: string | undefined;
const unicos = (xs: string[]) => [...new Set(xs.filter(Boolean))];
/** Ventana del corte, en mm de papel: arriba hasta el marco y abajo hasta MATERIALES, que Iván bajó junto a las notas (22/10/2026). */
export const VENTANA_CORTE_PORTANOVA = { centro: [225.3602038, 140.9411701] as Punto, ancho: 127.4184910, alto: 121.8823402 };

/** Hoja fija de la oficina: solo se rellenan los campos y se encuadran alzado y corte. */
export function presentacionPortanova(pedido: PedidoPuertas,
  cabecera: { cliente: string; tecnico: string; revisor: string; fecha: string },
  zonas: { toldos: Zona; corte: Zona }, altoVistaCorte?: number) {
  plantilla ??= readFileSync(new URL('./plantillas/portanova.dxf', import.meta.url), 'utf8').replace(/\r\n/g, '\n');
  const puertas = pedido.elementos.map(e => e.input);
  const materiales = unicos(puertas.flatMap(p => [p.materialCristal, `${p.material} ${p.color}`, p.materialSaco]))
    .map(v => textoSeguro(v).replace(/LAC\s*900/g, 'LAC 900'));
  const fecha = cabecera.fecha.split('-').reverse().map((v, i) => i === 2 ? v.slice(2) : v).join('/');
  const ventana = (z: Zona, centro: Punto, ancho: number, alto: number) => ({ z, centro, ancho, alto });
  return {
    plantilla: plantilla.replaceAll('ENRROLLABLES', 'ENROLLABLES').replace('TIENES QUE IR', 'TIENEN QUE IR').replace('CM.SOLDAR', 'CM. SOLDAR'),
    papel: '73996', materiales: `MATERIALES:\\P${materiales.join('\\P')}`,
    atributos: { PEDIDO: textoSeguro(pedido.orderCode), OF: textoSeguro(unicos(puertas.map(p => p.of)).join(' / ')),
      CLIENTE: textoSeguro(cabecera.cliente), 'TÉCNICO': textoSeguro(cabecera.tecnico), REV: textoSeguro(cabecera.revisor), '20/12/18': fecha, 'NºPAG': '1/1' },
    anchosAtributos: { PEDIDO: 32, OF: 20, CLIENTE: 53, 'TÉCNICO': 28, REV: 14, '20/12/18': 22, 'NºPAG': 8 },
    presentacion: { ventanas: {
      2: ventana(zonas.toldos, [84.8917052, 104.9631513], 153.7829813, 193.8383777),
      4: { ...ventana(zonas.corte, VENTANA_CORTE_PORTANOVA.centro, VENTANA_CORTE_PORTANOVA.ancho, VENTANA_CORTE_PORTANOVA.alto), altoVista: altoVistaCorte },
    }, textos: [] },
  };
}
