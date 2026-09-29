import { describe, expect, it } from 'vitest';
import { emptyLona } from '../../remolques/entradas-vacias.ts';
import type { LineaPedido } from '../../remolques/workspace/lineas.ts';
import { estadoInicial } from '../../remolques/workspace/estado.ts';
import { reducirRemolques, type EstadoRemolques } from './useRemolques';

const linea = (version: string, cliente: string, fecha: string): LineaPedido => {
  const plantilla = emptyLona();
  return {
    version,
    tipo: 'lona',
    input: { ...plantilla, cabecera: { ...plantilla.cabecera, version, cliente, fecha } },
  };
};

const vacio = (): EstadoRemolques => ({ ...estadoInicial(), fecha: '2026-09-29' });

describe('reducirRemolques · recuperar borradores', () => {
  it('toma la fecha y el cliente de las líneas recuperadas para la cabecera', () => {
    const siguiente = reducirRemolques(vacio(), {
      tipo: 'BORRADORES_RECUPERADOS',
      lineas: [linea('10', 'TALLERES X', '2026-09-20'), linea('20', 'TALLERES X', '2026-09-20')],
    });
    expect(siguiente.fecha).toBe('2026-09-20');
    expect(siguiente.cliente).toBe('TALLERES X');
  });

  it('salta las líneas sin cliente y coge el primero que lo tenga', () => {
    const siguiente = reducirRemolques(vacio(), {
      tipo: 'BORRADORES_RECUPERADOS',
      lineas: [linea('10', '  ', '2026-09-20'), linea('20', 'TALLERES X', '2026-09-20')],
    });
    expect(siguiente.cliente).toBe('TALLERES X');
  });

  it('no pisa el cliente que el usuario ya haya escrito', () => {
    const escrito: EstadoRemolques = { ...vacio(), cliente: 'OTRO' };
    const siguiente = reducirRemolques(escrito, {
      tipo: 'BORRADORES_RECUPERADOS',
      lineas: [linea('10', 'TALLERES X', '2026-09-20')],
    });
    expect(siguiente.cliente).toBe('OTRO');
  });

  it('sin cliente en las líneas deja la cabecera como estaba', () => {
    const siguiente = reducirRemolques(vacio(), {
      tipo: 'BORRADORES_RECUPERADOS',
      lineas: [linea('10', '', '2026-09-20')],
    });
    expect(siguiente.cliente).toBe('');
  });
});

describe('reducirRemolques · el resto de acciones no toca el cliente', () => {
  it('escribir el cliente en la cabecera lo conserva', () => {
    const siguiente = reducirRemolques(vacio(), { tipo: 'CLIENTE_CAMBIADO', valor: 'NUEVO' });
    expect(siguiente.cliente).toBe('NUEVO');
  });
});
