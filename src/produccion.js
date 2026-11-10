import fs from 'node:fs/promises';

/** Prepara todos los pasos sin escribir; una pregunta cancela la operación completa. */
export async function pasarAProduccion(pasos) {
  const preparados = [];
  for (const paso of pasos) {
    const plan = await paso.preparar();
    if (plan.status !== 200) return { ...plan, cuerpo: { ...plan.cuerpo, paso: paso.nombre } };
    preparados.push({ ...paso, plan });
  }
  const hechos = [], avisos = [];
  for (const { nombre, plan } of preparados) {
    try {
      const resultado = plan.ejecutar ? await plan.ejecutar() : plan;
      if (resultado.status !== 200) throw new Error(resultado.cuerpo.error || 'Los archivos han cambiado desde la comprobación. Vuelve a revisar la operación.');
      hechos.push(nombre);
      avisos.push(...(resultado.cuerpo.avisos ?? []));
    } catch (error) {
      return { status: 500, cuerpo: { parcial: true, hechos, pendientes: preparados.map(p => p.nombre).filter(p => !hechos.includes(p)),
        error: `${hechos.length ? `Hecho: ${hechos.join(', ')}.` : 'No se ha completado ningún paso.'} Falta: ${preparados.map(p => p.nombre).filter(p => !hechos.includes(p)).join(', ')}. ${error.message}` } };
    }
  }
  try {
    for (const { plan } of preparados) await plan.finalizar?.();
  } catch (error) {
    return { status: 500, cuerpo: { parcial: true, hechos, pendientes: ['Registrar la entrega'],
      error: `Hecho: ${hechos.join(', ')}. No se pudo registrar la entrega como terminada. Avisa a informática antes de repetir. ${error.message}` } };
  }
  return { status: 200, cuerpo: { ok: true, hechos, avisos, mensaje: `Pedido pasado a producción. Hecho: ${hechos.join(', ')}.` } };
}

/**
 * El plano revisado se conserva; los planos calculados se comprueban antes de publicar.
 * @template {{ savedPath: string, filename: string }} T
 * @param {{ confirmado?: { plano: string, filename: string, planos?: { plano: string, filename: string }[] }, preparar?: () => Promise<{ ficheros: T[], avisos?: string[] }>, escribir?: (ficheros: T[]) => Promise<unknown>, confirmOverwrite?: boolean }} opciones
 */
export async function prepararPlanoProduccion({ confirmado, preparar = undefined, escribir = undefined, confirmOverwrite = false }) {
  if (confirmado) {
    const planos = confirmado.planos?.length ? confirmado.planos : [confirmado];
    for (const plano of planos) {
      if (!(await fs.stat(plano.plano).catch(error => { if (error.code !== 'ENOENT') throw error; return null; }))?.isFile()) {
        throw new Error(`No está el plano revisado ${plano.filename}: no se ha escrito nada.`);
      }
    }
    return { status: 200, cuerpo: { ok: true, mensaje: 'Plano revisado conservado en su carpeta.', files: planos.map(p => ({ filename: p.filename, savedPath: p.plano })) } };
  }
  const { ficheros, avisos = [] } = await preparar();
  if (!ficheros.length) throw new Error(avisos.at(-1) || 'No se pudo preparar el plano: no se ha escrito nada.');
  const existing = [];
  for (const fichero of ficheros) {
    if (await fs.stat(fichero.savedPath).catch(error => { if (error.code !== 'ENOENT') throw error; return null; })) existing.push(fichero.filename);
  }
  if (existing.length && !confirmOverwrite) return { status: 409, cuerpo: { needsConfirmation: true, existing, error: 'El plano ya existe. Comprueba si se puede sustituir.' } };
  return { status: 200, cuerpo: { ok: true, files: ficheros, avisos }, ejecutar: async () => {
    await escribir(ficheros);
    return { status: 200, cuerpo: { ok: true, avisos } };
  } };
}
