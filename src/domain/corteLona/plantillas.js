import { readFileSync } from 'node:fs';

const cache = new Map();
/** Plantillas incluidas en el repositorio: nunca consulta carpetas compartidas. */
export function leerPlantilla(nombre) {
  if (!['base-corte.dxf', 'presentacion-a4.dxf'].includes(nombre)) throw new Error('Plantilla desconocida.');
  if (!cache.has(nombre)) cache.set(nombre, readFileSync(new URL(`./plantillas/${nombre}`, import.meta.url), 'utf8').replace(/\r\n/g, '\n'));
  return cache.get(nombre);
}
