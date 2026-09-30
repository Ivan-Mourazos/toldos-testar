import { afterEach, describe, expect, it, vi } from 'vitest';
import { emptyLona } from '../../remolques/entradas-vacias.ts';
import { calcLona, type LonaInput } from '../../remolques/calc/lona.ts';
import { DEFAULT_PARAMS } from '../../remolques/calc/params.ts';
import type { ElementoEscena } from '../../remolques/escena/tipos.ts';
import { construirEscenaSegura, escenaEstable } from './escenaDibujo';

const elemento = (extra: Partial<LonaInput> = {}): ElementoEscena => {
  const input: LonaInput = {
    ...emptyLona(), largo: 300, ancho: 200, altoDelante: 100, tipoPerfil: 'TIPO 01', material: 'PVC ROJO',
    recogeDelante: 'GOMA', recogeAtras: 'NO', ...extra,
  };
  return { tipo: 'lona', input, res: calcLona(input, DEFAULT_PARAMS) };
};

afterEach(() => vi.restoreAllMocks());

describe('escenaEstable', () => {
  it('si lo que se dibuja no cambia (observaciones, número de pedido), sigue la escena anterior', () => {
    const anterior = construirEscenaSegura(elemento({ observaciones: 'A' }), DEFAULT_PARAMS)!;
    const base = emptyLona().cabecera;
    const nueva = construirEscenaSegura(elemento({ observaciones: 'AB', cabecera: { ...base, numeroPedido: 'AR1' } }), DEFAULT_PARAMS)!;
    expect(nueva).not.toBe(anterior);
    expect(escenaEstable(anterior, nueva)).toBe(anterior);
  });

  it('si cambia algo que se dibuja, la nueva', () => {
    const anterior = construirEscenaSegura(elemento(), DEFAULT_PARAMS)!;
    const nueva = construirEscenaSegura(elemento({ altoDelante: 90 }), DEFAULT_PARAMS)!;
    expect(escenaEstable(anterior, nueva)).toBe(nueva);
    expect(escenaEstable(anterior, null)).toBeNull();
    expect(escenaEstable(null, nueva)).toBe(nueva);
  });
});

describe('construirEscenaSegura', () => {
  it('si preparar la escena revienta, null (dibujo técnico) y un aviso en la consola', () => {
    const consola = vi.spyOn(console, 'error').mockImplementation(() => {});
    const roto = { tipo: 'lona', input: undefined, res: undefined } as unknown as ElementoEscena;
    expect(construirEscenaSegura(roto, DEFAULT_PARAMS)).toBeNull();
    expect(consola).toHaveBeenCalledTimes(1);
  });
});
