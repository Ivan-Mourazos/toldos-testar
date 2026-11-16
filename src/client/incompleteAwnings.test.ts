import { describe, expect, it } from 'vitest';
import { avisoSinCalculo, incompleteAwningLines } from './incompleteAwnings';
import type { Awning } from './types';

describe('incompleteAwningLines', () => {
  it('nombra cada toldo incompleto con su letra, su nombre comercial y lo que le falta', () => {
    const awnings = [
      { model: 'ARZUA PRO', of: '1', width: 300, projection: 250, valanceHeight: 0, rotFabric: 'NO', structureColor: 'BLANCO', device: 'MAQ. INTERIOR', crankHeight: 150, tubeLoad: 'TUBO DE CARGA EVO 80' },
      { model: 'CORTINA', of: '2', width: 300, projection: 200, rotFabric: 'NO', structureColor: 'BLANCO', device: 'MAQ. INTERIOR', crankHeight: 150, curtainHasWindow: null, curtainFinish: '' }
    ] as unknown as Awning[];
    expect(incompleteAwningLines(awnings)).toEqual(['Toldo B · Cortina: falta ventana y laterales']);
  });
});

describe('avisoSinCalculo', () => {
  const completo = [{ model: 'ARZUA PRO', of: '1', width: 300, projection: 250, valanceHeight: 0, rotFabric: 'NO', structureColor: 'BLANCO', device: 'MAQ. INTERIOR', crankHeight: 150, tubeLoad: 'TUBO DE CARGA EVO 80' }] as unknown as Awning[];

  it('sin toldos pide añadir uno', () => {
    expect(avisoSinCalculo([], null, { estado: 'idle', error: '' }, 'antes de guardarlo para revisión')).toEqual({ title: 'Faltan datos', message: 'Añade al menos un toldo antes de guardarlo para revisión.' });
  });

  it('con el toldo completo y el cálculo fallado no pide añadir un toldo: dice que no se pudo calcular y por qué (AR2605535, 16/11/2026)', () => {
    expect(incompleteAwningLines(completo)).toEqual([]);
    expect(avisoSinCalculo(completo, null, { estado: 'error', error: 'Sin conexión con RPS.' }, 'antes de guardarlo para revisión')).toEqual({
      title: 'No se pudo calcular', message: 'No se ha podido calcular el pedido: Sin conexión con RPS. Se vuelve a intentar ahora; espera unos segundos y repite.' });
    expect(avisoSinCalculo(completo, null, { estado: 'error', error: '' }, 'para ver el planteamiento').message).toBe('No se ha podido calcular el pedido. Se vuelve a intentar ahora; espera unos segundos y repite.');
  });

  it('mientras calcula pide esperar', () => {
    expect(avisoSinCalculo(completo, null, { estado: 'validating', error: '' }, 'para ver el planteamiento')).toEqual({ title: 'Calculando', message: 'El pedido se está calculando. Espera un momento y repite.' });
  });
});
