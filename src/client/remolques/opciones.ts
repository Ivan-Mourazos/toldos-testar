import type { Opcion } from './Campos';

// Las opciones de los desplegables del formulario, como en `opciones-formulario.ts` de la web
// de remolques: se normaliza solo la etiqueta que se ve; el valor guardado no cambia.

export const MODOS_OLLAOS: Opcion[] = [
  { value: 'REPARTIDOS', label: 'Repartidos automáticamente' },
  { value: 'SEGUN SE INDICA', label: 'A medida' },
  { value: 'SEGUN GANCHOS', label: 'Según ganchos' },
];

const etiquetasConocidas: Record<string, string> = {
  NO: 'No',
  'GANCHOS CORAZON': 'Ganchos corazón',
  'PUENTES ESVA': 'Puentes ESVA',
  'PUENTES HIJOS DE PEDRO LOPEZ': 'Puentes Hijos de Pedro López',
  'HIJOS DE PEDRO LOPEZ': 'Hijos de Pedro López',
};

function capitalizar(valor: string): string {
  return valor
    .toLocaleLowerCase('es-ES')
    .replace(/(^|[\s/(-])([a-záéíóúüñ])/giu, (_, separador: string, letra: string) => `${separador}${letra.toLocaleUpperCase('es-ES')}`);
}

export function opcionesConEtiqueta(valores: string[]): Opcion[] {
  return valores.map((value) => ({ value, label: etiquetasConocidas[value] ?? capitalizar(value) }));
}
