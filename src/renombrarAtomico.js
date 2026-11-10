import fs from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';

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

/**
 * Algunos recursos SMB permiten apartar el plano pero rechazan reemplazarlo directamente. El anterior se aparta
 * con un nombre provisional en su misma carpeta y se borra cuando el nuevo ya está en su sitio: no se guardan
 * copias (Iván, 10/11/2026: sin carpeta «_anteriores»; las versiones viejas se borran). Si está abierto (EBUSY)
 * no se toca: el usuario lo cierra y vuelve a guardar.
 */
export async function renombrarConRespaldo(origen, destino) {
  try { await renombrarAtomico(origen, destino); return; }
  catch (error) {
    if (!['EACCES', 'EPERM'].includes(error.code)) throw error;
    let anterior;
    try { anterior = await fs.lstat(destino); } catch { throw error; }
    if (!anterior.isFile()) throw error;
  }
  const respaldo = path.join(path.dirname(destino), `.${path.basename(destino)}.anterior-${randomUUID()}`);
  await renombrarAtomico(destino, respaldo);
  try { await renombrarAtomico(origen, destino); }
  catch (error) {
    try {
      // No se pisa un archivo que otro programa haya publicado mientras tanto.
      const ocupado = await fs.lstat(destino).then(() => true, e => { if (e.code === 'ENOENT') return false; throw e; });
      if (ocupado) throw new Error('Otro archivo ocupa el destino del plano.');
      await renombrarAtomico(respaldo, destino);
    } catch (restauracion) {
      throw Object.assign(new Error(`No se pudo guardar ${path.basename(destino)} ni restaurar su nombre. El plano anterior está conservado en ${respaldo}. Avisa a informática.`,
        { cause: new AggregateError([error, restauracion]) }), { statusCode: 500, respaldo });
    }
    throw error;
  }
  // Publicado el nuevo, el anterior sobra. Si no se deja borrar, queda oculto y no impide el guardado.
  await fs.rm(respaldo, { force: true }).catch(() => {});
}
