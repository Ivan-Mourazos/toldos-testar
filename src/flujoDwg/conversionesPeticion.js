import { AsyncLocalStorage } from 'node:async_hooks';
import { createHash } from 'node:crypto';

const conversiones = new AsyncLocalStorage();

export function conConversionesDwg(tarea) {
  return conversiones.run(new Map(), tarea);
}

/** Se vuelve a leer el DWG: el técnico puede guardarlo entre la comprobación y la impresión. */
export function convertirDwgUnaVez(ruta, contenido, convertir) {
  const cache = conversiones.getStore();
  if (!cache) return convertir(contenido);
  const huella = createHash('sha256').update(contenido).digest('hex');
  const anterior = cache.get(ruta);
  if (anterior?.huella === huella) return anterior.dxf;
  const dxf = convertir(contenido).catch(error => {
    if (cache.get(ruta)?.dxf === dxf) cache.delete(ruta);
    throw error;
  });
  cache.set(ruta, { huella, dxf });
  return dxf;
}
