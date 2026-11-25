import fs from 'node:fs/promises';
import path from 'node:path';
import { renombrarAtomico } from './renombrarAtomico.js';
import { isPendingGeneration, TERMINADO_SIN_GENERAR } from './reviewRules.js';

export function errorRegistro(statusCode, message) {
  return Object.assign(new Error(message), { statusCode });
}

export function terminarRegistro(pedido, { usuario, fecha = new Date().toISOString() }) {
  if (!isPendingGeneration(pedido.status)) throw errorRegistro(409, 'Solo puedes marcar como terminado un pedido pendiente.');
  return {
    ...pedido, status: TERMINADO_SIN_GENERAR, updatedAt: fecha, updatedBy: usuario,
    terminadoSinGenerar: { usuario, fecha, estadoAnterior: pedido.status }
  };
}

export function reabrirRegistro(pedido, { usuario, fecha = new Date().toISOString() }) {
  const { terminadoSinGenerar, ...registro } = pedido;
  if (registro.status !== TERMINADO_SIN_GENERAR) throw errorRegistro(409, 'Este pedido no está terminado sin generar.');
  const anterior = terminadoSinGenerar?.estadoAnterior;
  return { ...registro, status: isPendingGeneration(anterior) ? anterior : 'PENDING_REVIEW', updatedAt: fecha, updatedBy: usuario };
}

export function comprobarConfirmacionPapelera(codigo, confirmacion) {
  if (confirmacion !== codigo) throw errorRegistro(400, 'Escribe el código completo del pedido para enviarlo a la papelera.');
}

/** Las rutas pertenecen al almacén del producto que leyó el registro. */
export async function moverRegistroAPapelera(rutas, { codigo, usuario, fecha = new Date().toISOString() }) {
  const papelera = path.join(path.dirname(rutas[0]), 'papelera');
  await fs.mkdir(papelera, { recursive: true });
  const destino = await fs.mkdtemp(path.join(papelera, `${codigo}-${fecha.slice(0, 10)}-`));
  const movidos = [];
  try {
    await fs.writeFile(path.join(destino, 'papelera.json'), JSON.stringify({ codigo, usuario, fecha }, null, 2));
    for (const ruta of rutas) {
      const apartada = path.join(destino, path.basename(ruta));
      await renombrarAtomico(ruta, apartada);
      movidos.push({ ruta, apartada });
    }
  } catch (error) {
    for (const { ruta, apartada } of movidos.reverse()) await renombrarAtomico(apartada, ruta);
    await fs.rm(path.join(destino, 'papelera.json'), { force: true });
    await fs.rmdir(destino);
    throw error;
  }
  return destino;
}
