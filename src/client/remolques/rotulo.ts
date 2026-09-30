import { awningLetter } from '../../domain/awningCompleteness.js';
import { formatearNumeroEs } from './numeroEs';
import type { LineaPedido } from '../../remolques/workspace/lineas.ts';
import type { LineaPedidoRps } from '../../remolques/rps/types.ts';

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

/** Las medidas de una línea de RPS tal como las trae: «250 × 143 × 88», con «—» lo que falta. */
export function medidasLineaRps(linea: LineaPedidoRps): string {
  const n = (valor: number | null) => (valor === null ? '—' : formatearNumeroEs(valor));
  if (linea.tipoTrabajo === 'baqueton') return [linea.largo, linea.ancho, linea.baqueton].map(n).join(' × ');
  const alto = linea.alto !== null
    ? n(linea.alto)
    : linea.altoDelante !== null || linea.altoAtras !== null
      ? `${n(linea.altoDelante)}/${n(linea.altoAtras)}`
      : '—';
  return [n(linea.largo), n(linea.ancho), alto].join(' × ');
}

/** «Línea 2 · Lona · OF 0231781 · 258 × 163 × 100 cm»: cómo se nombra una línea de RPS. */
export function describirLineaRps(linea: LineaPedidoRps): string {
  return [
    `Línea ${linea.numeroLinea}`,
    linea.tipoTrabajo === 'lona' ? 'Lona' : 'Baquetón',
    linea.ordenFabricacion ? `OF ${linea.ordenFabricacion}` : null,
    `${medidasLineaRps(linea)} cm`,
  ].filter(Boolean).join(' · ');
}
