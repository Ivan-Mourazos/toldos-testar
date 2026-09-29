/**
 * Parámetros de cálculo de remolques (recogidas, clientes con baquetón, demasías...).
 * En esta fase solo se leen: viven en un JSON junto a los parámetros comunes y, si
 * no existe o está roto, valen los del código (los mismos que usaba Remolques-TGM).
 * Se lee en cada petición para que un cambio a mano en el fichero se vea sin reiniciar.
 */
import fs from 'node:fs/promises';
import { DEFAULT_PARAMS } from './remolques/calc/params.ts';
import { normalizarParams } from './remolques/calc/validar-params.ts';

export function createRemolquesParametersStore({ file, logger = console }) {
  async function get() {
    let texto;
    try {
      texto = await fs.readFile(file, 'utf8');
    } catch (error) {
      if (error.code !== 'ENOENT') logger.warn(`No se pudieron leer los parámetros de remolques (${file}): ${error.message}. Se usan los del código.`);
      return DEFAULT_PARAMS;
    }
    try {
      return normalizarParams(JSON.parse(texto));
    } catch (error) {
      // Un fichero a medio escribir o editado a mano no debe dejar la pantalla sin parámetros.
      logger.warn(`Los parámetros de remolques (${file}) no son un JSON válido: ${error.message}. Se usan los del código.`);
      return DEFAULT_PARAMS;
    }
  }

  return { get };
}
