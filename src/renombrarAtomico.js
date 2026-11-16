import fs from 'node:fs/promises';
import path from 'node:path';

/** Sustituye el destino de una vez, conservando el fichero anterior si falla. */
export async function renombrarAtomico(origen, destino) {
  const pausas = [20, 50, 100, 200];
  for (let intento = 0; ; intento++) {
    try { await fs.rename(origen, destino); return; }
    catch (error) {
      // Windows puede retener el JSON unos milisegundos mientras otro lector o el antivirus lo consulta.
      if (!['EPERM', 'EACCES', 'EBUSY', 'ETXTBSY'].includes(error.code) || intento === pausas.length) throw error;
      await new Promise(resolve => setTimeout(resolve, pausas[intento]));
    }
  }
}

/**
 * Sustituye sin renombrar nunca encima de un archivo existente. En las carpetas de red montadas en Linux (CIFS),
 * cuando el servidor rechaza reemplazar, el propio sistema borra el destino y vuelve a intentarlo; si ese segundo
 * intento falla, el destino se pierde sin que la web pueda evitarlo (pedido AR2605535, 16/11/2026). Por eso el
 * anterior se aparta primero con un nombre que no existe, se publica el nuevo y, si falla, se devuelve a su sitio.
 * Si está abierto (EBUSY) no se toca: el usuario lo cierra y vuelve a guardar.
 */
export async function sustituirApartando(origen, destino) {
  const existe = await fs.lstat(destino).then(s => s.isFile(), e => { if (e.code === 'ENOENT') return false; throw e; });
  if (!existe) return renombrarAtomico(origen, destino);
  // Como ZWCAD, pero con el tipo en la extensión para no chocar con su .bak: AR2605535.bakpdf, «AR2605535 (plano).bakdwg».
  // Para recuperarlo basta cambiarle la extensión (Iván, 16/11/2026). Uno que ya esté ahí es de un fallo anterior
  // sin recuperar: no se pisa, este lleva la fecha. Si todo va bien se borra (10/11/2026: sin copias viejas).
  const { dir, name, ext } = path.parse(destino);
  const extension = `.bak${ext.slice(1).toLowerCase()}`;
  let respaldo = path.join(dir, `${name}${extension}`);
  if (await fs.lstat(respaldo).then(() => true, e => { if (e.code === 'ENOENT') return false; throw e; })) {
    respaldo = path.join(dir, `${name} ${new Date().toISOString().replace(/[:.]/g, '-')}${extension}`);
  }
  await renombrarAtomico(destino, respaldo);
  try { await renombrarAtomico(origen, destino); }
  catch (error) {
    try {
      // No se pisa un archivo que otro programa haya publicado mientras tanto.
      const ocupado = await fs.lstat(destino).then(() => true, e => { if (e.code === 'ENOENT') return false; throw e; });
      if (ocupado) throw new Error('Otro archivo ocupa el destino.');
      await renombrarAtomico(respaldo, destino);
    } catch (restauracion) {
      throw Object.assign(new Error(`No se pudo guardar ${path.basename(destino)} ni devolver el anterior a su sitio. El anterior está en ${respaldo}: cámbiale la extensión ${extension} por ${ext} para recuperarlo. Avisa a informática.`,
        { cause: new AggregateError([error, restauracion]) }), { statusCode: 500, respaldo });
    }
    throw error;
  }
  await fs.rm(respaldo, { force: true }).catch(() => {});
}
