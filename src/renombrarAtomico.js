import fs from 'node:fs/promises';

/** Sustituye el destino de una vez, conservando el fichero anterior si falla. */
export async function renombrarAtomico(origen, destino) {
  const pausas = [20, 50, 100, 200];
  for (let intento = 0; ; intento++) {
    try { await fs.rename(origen, destino); return; }
    catch (error) {
      // Windows puede retener el JSON unos milisegundos mientras otro lector o el antivirus lo consulta.
      if (!['EPERM', 'EACCES', 'EBUSY'].includes(error.code) || intento === pausas.length) throw error;
      await new Promise(resolve => setTimeout(resolve, pausas[intento]));
    }
  }
}
