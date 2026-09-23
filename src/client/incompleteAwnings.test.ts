import { describe, expect, it } from 'vitest';
import { incompleteAwningLines } from './incompleteAwnings';
import type { Awning } from './types';

describe('incompleteAwningLines', () => {
  it('nombra cada toldo incompleto con su letra, su nombre comercial y lo que le falta', () => {
    const awnings = [
      { model: 'ARZUA PRO', of: '1', width: 300, projection: 250, valanceHeight: 0, rotFabric: 'NO', structureColor: 'BLANCO', device: 'MAQ. INTERIOR', crankHeight: 150, tubeLoad: 'TUBO DE CARGA EVO 80' },
      { model: 'CORTINA', of: '2', width: 300, projection: 200, rotFabric: 'NO', structureColor: 'BLANCO', device: 'MAQ. INTERIOR', crankHeight: 150, curtainHasWindow: null, curtainFinish: '' }
    ] as unknown as Awning[];
    expect(incompleteAwningLines(awnings)).toEqual(['Toldo B · Cortina: falta ventana y confección']);
  });
});
