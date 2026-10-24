import fs from 'node:fs/promises';
import path from 'node:path';
import { writeFileAtomic } from '../workflow.js';

// Flujo del DWG, fase 2: «Confirmar corte» apunta quién, cuándo y la huella del corte del borrador, antes de que el pedido
// esté guardado. Un JSON por pedido en una carpeta interna del servidor (no en la de borradores, que ven los PC).

const nombre = (orderCode) => `${String(orderCode).replace(/[^A-Za-z0-9_-]/g, '')}.json`;

export function crearAlmacenConfirmaciones({ carpeta }) {
  async function ruta(orderCode) {
    const dir = await carpeta();
    if (!dir) throw Object.assign(new Error('Falta la carpeta interna de remolques en Configuración: allí se apuntan los cortes confirmados.'), { statusCode: 409 });
    return path.join(dir, nombre(orderCode));
  }
  return {
    async leer(orderCode) {
      try {
        return JSON.parse(await fs.readFile(await ruta(orderCode), 'utf8'));
      } catch (error) {
        if (error.code === 'ENOENT') return null;
        throw error;
      }
    },
    async guardar(orderCode, datos) {
      const fichero = await ruta(orderCode);
      await fs.mkdir(path.dirname(fichero), { recursive: true });
      await writeFileAtomic(fichero, JSON.stringify(datos, null, 2));
    },
    async borrar(orderCode) {
      await fs.rm(await ruta(orderCode), { force: true });
    },
  };
}
