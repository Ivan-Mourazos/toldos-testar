import { describe, expect, it } from 'vitest';
import casos from './__fixtures__/produccion-2026-09.json';
import { calcLona, type LonaInput } from './calc/lona.ts';
import { calcBaqueton, type BaquetonInput } from './calc/baqueton.ts';
import type { CalcParams } from './calc/params.ts';

// Paridad con producción (diseño 29/09/2026): los 32 planteamientos reales de remolques,
// del 08/09 al 25/09/2026, recalculados con sus propios parámetros tienen que dar
// exactamente lo mismo que se guardó. Única diferencia conocida: los baquetones
// anteriores al campo `baquetonDelantero` no lo tienen guardado y el cálculo lo da null.
type Caso = { caso: string; tipo: 'lona' | 'baqueton'; creado: string; input: unknown; paramsSnapshot: unknown; result: Record<string, unknown> };

function sinCamposNuevosVacios(calculado: Record<string, unknown>, guardado: Record<string, unknown>) {
  const copia = { ...calculado };
  if (!('baquetonDelantero' in guardado) && copia.baquetonDelantero === null) delete copia.baquetonDelantero;
  return copia;
}

describe('paridad de remolques con producción', () => {
  const lista = casos as Caso[];

  it('hay 32 planteamientos reales', () => {
    expect(lista).toHaveLength(32);
  });

  it.each(lista.map((c) => [c.caso, c] as const))('%s da lo mismo que en producción', (_nombre, caso) => {
    const params = caso.paramsSnapshot as CalcParams;
    const calculado = caso.tipo === 'lona'
      ? calcLona(caso.input as LonaInput, params)
      : calcBaqueton(caso.input as BaquetonInput, params);
    expect(sinCamposNuevosVacios(calculado as unknown as Record<string, unknown>, caso.result)).toEqual(caso.result);
  });
});
