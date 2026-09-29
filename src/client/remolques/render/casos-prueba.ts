import { emptyLona } from '../../../remolques/entradas-vacias.ts';
import { calcLona, type LonaInput } from '../../../remolques/calc/lona.ts';
import { DEFAULT_PARAMS } from '../../../remolques/calc/params.ts';
import { construirEscena } from '../../../remolques/escena/index.ts';
import type { EscenaRemolque } from '../../../remolques/escena/tipos.ts';

/** Lona TIPO 01 de 300 × 200 × 100 (hecha 301 × 201) con tres ollaos a medida por lado. */
export function escenaDePrueba(extra: Partial<LonaInput> = {}): EscenaRemolque {
  const input: LonaInput = {
    ...emptyLona(), largo: 300, ancho: 200, altoDelante: 100, tipoPerfil: 'TIPO 01',
    recogeDelante: 'NO', recogeAtras: 'NO', material: 'PVC ROJO', modoOllaos: 'SEGUN SE INDICA',
    ollaosManuales: { laterales: [2.5, 150.5, 298.5], atras: [2.5, 100.5, 198.5], delante: [2.5, 100.5, 198.5] },
    ...extra,
  };
  return construirEscena({ tipo: 'lona', input, res: calcLona(input, DEFAULT_PARAMS) }, DEFAULT_PARAMS)!;
}
