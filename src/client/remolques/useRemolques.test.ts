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

describe('reducirRemolques · obtener el pedido de RPS', () => {
  const deRps = (version: string, idLinea: string): LineaPedido => ({
    ...linea(version, 'TALLERES RPS', '2026-09-07'),
    origenRps: {
      numeroPedido: 'AR.26.04414', numeroLinea: 1, idLinea,
      ordenFabricacion: null, importadoEn: '2026-09-30T10:00:00Z',
    },
  });
  const conPedido = (): EstadoRemolques => reducirRemolques(vacio(), { tipo: 'PEDIDO_CAMBIADO', valor: 'AR2604414' });

  it('al crear los elementos, la fecha del pedido es la de RPS, en la cabecera y en todos', () => {
    const siguiente = reducirRemolques(conPedido(), {
      tipo: 'RPS_IMPORTADO', lineas: [deRps('10', 'L1'), deRps('11', 'L2')], modo: 'sustituir',
    });
    expect(siguiente.fecha).toBe('2026-09-07');
    expect(siguiente.lineas.map((l) => l.input.cabecera.fecha)).toEqual(['2026-09-07', '2026-09-07']);
    expect(siguiente.cliente).toBe('TALLERES RPS');
  });

  it('al añadir solo las que faltan, la fecha escrita en la cabecera se queda y la llevan las nuevas', () => {
    const conFecha = reducirRemolques(conPedido(), { tipo: 'FECHA_CAMBIADA', valor: '2026-09-15' });
    const conUno = reducirRemolques(conFecha, { tipo: 'LINEA_ANADIDA', linea: linea('10', '', '2026-09-15') });
    const siguiente = reducirRemolques(conUno, { tipo: 'RPS_IMPORTADO', lineas: [deRps('10', 'L1')], modo: 'anadir' });
    expect(siguiente.fecha).toBe('2026-09-15');
    expect(siguiente.lineas.map((l) => [l.version, l.input.cabecera.fecha])).toEqual([['10', '2026-09-15'], ['11', '2026-09-15']]);
  });
});

describe('reducirRemolques · limpiar el formulario', () => {
  it('deja pedido, cliente, elementos y consulta de RPS en blanco, con la fecha de hoy', () => {
    const lleno: EstadoRemolques = {
      ...estadoInicial(), fecha: '2026-09-20', numeroPedido: 'AR.26.04286', cliente: 'TALLERES X',
      lineas: [linea('10', 'TALLERES X', '2026-09-20')], versionActiva: '10',
      rps: { estado: 'encontrado', numeroConsultado: 'AR.26.04286', pedido: null, error: null, reintento: 2 },
    };
    const limpio = reducirRemolques(lleno, { tipo: 'PEDIDO_LIMPIADO' });
    expect(limpio.numeroPedido).toBe('');
    expect(limpio.cliente).toBe('');
    expect(limpio.lineas).toEqual([]);
    expect(limpio.versionActiva).toBeNull();
    expect(limpio.rps.estado).toBe('idle');
    expect(limpio.fecha).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(limpio.fecha).not.toBe('2026-09-20');
  });
});
