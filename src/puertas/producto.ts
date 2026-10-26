import type { ModeloPuerta } from './tipos.ts';

export function esPedidoMixto(elementos: ReadonlyArray<{ input: { modelo: ModeloPuerta } }>): boolean {
  return elementos.some(e => e.input.modelo === 'SYSTEMDOCK') && elementos.some(e => e.input.modelo !== 'SYSTEMDOCK');
}

/** El formato y el servicio siguen siendo de puertas, también para pedidos antiguos. */
export function productoDeElementos(elementos: ReadonlyArray<{ input: { modelo: ModeloPuerta } }>): 'puertas' | 'systemdock' {
  return elementos.length > 0 && elementos.every(e => e.input.modelo === 'SYSTEMDOCK') ? 'systemdock' : 'puertas';
}

/** Las listas no incluyen los elementos; sus modelos ya vienen en el resumen guardado. */
export function productoDeModelos(modelos: readonly string[]): 'puertas' | 'systemdock' {
  return modelos.length > 0 && modelos.every(m => m === 'System Dock' || m === 'SYSTEMDOCK') ? 'systemdock' : 'puertas';
}
