import { etiquetaOpcion } from '../../remolques/etiquetas.ts';
import type { Opcion } from './Campos';

// Las opciones de los desplegables del formulario, como en `opciones-formulario.ts` de la web
// de remolques: se normaliza solo la etiqueta que se ve (src/remolques/etiquetas.ts, la misma que
// usa la hoja de taller); el valor guardado no cambia.

export const MODOS_OLLAOS: Opcion[] = [
  { value: 'REPARTIDOS', label: 'Repartidos automáticamente' },
  { value: 'SEGUN SE INDICA', label: 'A medida' },
  { value: 'SEGUN GANCHOS', label: 'Según ganchos' },
];

export function opcionesConEtiqueta(valores: string[]): Opcion[] {
  return valores.map((value) => ({ value, label: etiquetaOpcion(value) }));
}
