import { describe, expect, it, vi } from 'vitest';
import { DEFAULT_PARAMS } from '../../remolques/calc/params.ts';
import { emptyBaqueton, emptyLona } from '../../remolques/entradas-vacias.ts';
import type { PedidoRemolques } from '../../remolques/flujo/tipos.ts';
import type { LineaPedido } from '../../remolques/workspace/lineas.ts';
import { clienteRpsDeLineas, contenidoBorradorRemolques, cuerpoGuardar, lineasDesdePedidoGuardado } from './guardarPedido';
import { cuerpoVistaPrevia } from './vistaPrevia';

const lona = emptyLona();
const baqueton = emptyBaqueton();
const linea: LineaPedido = {
  version: '10', tipo: 'lona',
  input: { ...lona, observaciones: 'UNO\n\nDOS\n', cabecera: { ...lona.cabecera, numeroPedido: 'AR.26.04286' } },
};

describe('cuerpoGuardar', () => {
  it('manda lo de la vista previa (sin resultado y con las observaciones limpias), los parámetros y quién guarda', () => {
    expect(cuerpoGuardar([linea], DEFAULT_PARAMS, 'IVÁN', false)).toEqual({
      ...cuerpoVistaPrevia([linea]), params: DEFAULT_PARAMS, savedBy: 'IVÁN', confirmOverwrite: false,
    });
  });

  it('si los elementos vienen de RPS manda el cliente de RPS (código y nombre)', () => {
    const cuerpo = cuerpoGuardar([deRps(linea, '001300')], DEFAULT_PARAMS, 'IVÁN', false);
    expect(cuerpo.clienteRps).toEqual({ codigo: '001300', nombre: 'HIJOS DE PEDRO LOPEZ' });
    expect(cuerpo.elementos[0]).not.toHaveProperty('origenRps');
  });
});

/** La línea como la deja «Obtener de RPS» del pedido AR.26.04286. */
function deRps(base: LineaPedido, codigo: string, numeroPedido = 'AR.26.04286'): LineaPedido {
  return {
    ...base,
    origenRps: {
      numeroPedido, numeroLinea: 1, idLinea: 'X', ordenFabricacion: null, importadoEn: '2026-10-02T08:00:00.000Z',
      cliente: { codigo, nombre: 'HIJOS DE PEDRO LOPEZ', alias: null },
    },
  };
}

describe('clienteRpsDeLineas', () => {
  const otra: LineaPedido = { ...linea, version: '11' };

  it('toma el de la primera línea que lo trae; sin RPS no hay', () => {
    expect(clienteRpsDeLineas([linea, deRps(otra, '001300')])).toEqual({ codigo: '001300', nombre: 'HIJOS DE PEDRO LOPEZ' });
    expect(clienteRpsDeLineas([linea])).toBeNull();
    expect(clienteRpsDeLineas([])).toBeNull();
    expect(cuerpoGuardar([linea], DEFAULT_PARAMS, 'IVÁN', false)).not.toHaveProperty('clienteRps');
  });

  it('si dos líneas traen clientes distintos se queda el primero y lo apunta', () => {
    const avisar = vi.fn();
    expect(clienteRpsDeLineas([deRps(linea, '001300'), deRps(otra, '002000')], avisar)).toEqual({ codigo: '001300', nombre: 'HIJOS DE PEDRO LOPEZ' });
    expect(avisar).toHaveBeenCalledWith(expect.stringContaining('002000'));
  });

  it('no usa el cliente de una línea traída de otro pedido de RPS', () => {
    expect(clienteRpsDeLineas([deRps(linea, '001300', 'AR.26.09999')])).toBeNull();
    expect(clienteRpsDeLineas([deRps(linea, '001300', 'ar2604286')])).toEqual({ codigo: '001300', nombre: 'HIJOS DE PEDRO LOPEZ' });
  });
});

describe('lineasDesdePedidoGuardado', () => {
  const pedido = {
    elementos: [
      { version: '10', tipo: 'lona', input: { ...lona, largo: 250, cabecera: { ...lona.cabecera, realizadoPor: 'JAIME', revision: 'ÁNGEL', fecha: '2026-09-01' } }, result: {}, paramsSnapshot: DEFAULT_PARAMS },
      { version: '11', tipo: 'baqueton', input: { ...baqueton, cabecera: { ...baqueton.cabecera, realizadoPor: 'JAIME', revision: 'ÁNGEL', fecha: '2026-09-01' } }, result: {}, paramsSnapshot: DEFAULT_PARAMS },
    ],
  } as unknown as PedidoRemolques;

  it('«Corregir» deja los elementos como se guardaron', () => {
    expect(lineasDesdePedidoGuardado(pedido, 'corregir', 'IVÁN', '2026-10-01'))
      .toEqual(pedido.elementos.map(({ version, tipo, input }) => ({ version, tipo, input })));
  });

  it('«Reutilizar» es un pedido nuevo: lo hace quien está, sin revisor y con la fecha de hoy', () => {
    const lineas = lineasDesdePedidoGuardado(pedido, 'reutilizar', 'IVÁN', '2026-10-01');
    expect(lineas.map((l) => [l.version, l.input.cabecera.realizadoPor, l.input.cabecera.revision, l.input.cabecera.fecha]))
      .toEqual([['10', 'IVÁN', '', '2026-10-01'], ['11', 'IVÁN', '', '2026-10-01']]);
    expect(lineas[0].input.largo).toBe(250);
  });
});

describe('contenidoBorradorRemolques', () => {
  it('la cabecera y las líneas tal cual; los parámetros solo si se estaba corrigiendo', () => {
    const estado = { numeroPedido: ' AR.26.04286 ', cliente: 'TALLERES CAL', fecha: '2026-10-01', lineas: [linea] };
    expect(contenidoBorradorRemolques(estado, null)).toEqual({ numeroPedido: 'AR.26.04286', cliente: 'TALLERES CAL', fecha: '2026-10-01', lineas: [linea] });
    expect(contenidoBorradorRemolques(estado, DEFAULT_PARAMS)).toEqual({
      numeroPedido: 'AR.26.04286', cliente: 'TALLERES CAL', fecha: '2026-10-01', lineas: [linea], paramsGuardados: DEFAULT_PARAMS,
    });
  });
});
