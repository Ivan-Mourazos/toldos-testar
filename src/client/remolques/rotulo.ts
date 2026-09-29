import { awningLetter } from '../../domain/awningCompleteness.js';
import { formatearNumeroEs } from './numeroEs';
import type { LineaPedido } from '../../remolques/workspace/lineas.ts';

/**
 * Cómo se llama un elemento del pedido en pantalla: «A · Remolque 250×143». La letra sigue el
 * orden del pedido, como las de los toldos. Lo usan las pestañas, la ficha y los avisos y
 * confirmaciones, para que no se llame de dos maneras («D» en la pestaña y «Remolque 4» en el
 * aviso).
 */
export function rotuloElemento(linea: LineaPedido, indice: number): string {
  const nombre = linea.tipo === 'lona' ? 'Remolque' : 'Baquetón';
  const { largo, ancho } = linea.input;
  const medidas = largo > 0 && ancho > 0 ? ` ${formatearNumeroEs(largo)}×${formatearNumeroEs(ancho)}` : '';
  return `${awningLetter(indice)} · ${nombre}${medidas}`;
}
