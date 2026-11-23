import fs from 'node:fs/promises';
import path from 'node:path';
import { writeFileAtomic } from './workflow.js';
import { CAPAS_FIJAS, claveCapa } from './cmt/preparacion/capas.ts';
import { HERRAMIENTAS } from './cmt/preparacion/tipos.ts';

export const esObjeto = valor => valor !== null && typeof valor === 'object' && !Array.isArray(valor);

function limpiar(tabla) {
  if (!esObjeto(tabla)) throw new Error('Indica una tabla de capas.');
  const entradas = [];
  for (const [nombre, herramienta] of Object.entries(tabla)) {
    const clave = claveCapa(nombre);
    if (!clave || clave === '0' || Object.hasOwn(CAPAS_FIJAS, clave)) continue;
    if (clave.length > 255 || [...clave].some(c => c.charCodeAt(0) < 32)) throw new Error('El nombre de capa no es válido.');
    if (!HERRAMIENTAS.includes(herramienta)) throw new Error(`Herramienta no válida para la capa ${nombre}.`);
    entradas.push([clave, herramienta]);
  }
  return Object.fromEntries(entradas);
}

export function crearTablaCapas({ archivo, inicial = {} }) {
  let cola = Promise.resolve();
  function encolar(escribir) {
    const guardado = cola.then(escribir);
    cola = guardado.catch(() => {});
    return guardado;
  }
  async function leer() {
    try {
      return limpiar(JSON.parse(await fs.readFile(archivo, 'utf8')));
    } catch (error) {
      if (error.code === 'ENOENT') return limpiar(inicial);
      throw error;
    }
  }
  async function escribir(tabla) {
    await fs.mkdir(path.dirname(archivo), { recursive: true });
    await writeFileAtomic(archivo, JSON.stringify(tabla, null, 2) + '\n');
    return tabla;
  }
  const reemplazar = tabla => encolar(() => escribir(limpiar(tabla)));
  const guardar = nuevas => encolar(async () => escribir({ ...(await leer()), ...limpiar(nuevas) }));
  return { leer, guardar, reemplazar };
}
