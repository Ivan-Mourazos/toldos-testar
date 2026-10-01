import { describe, expect, it } from 'vitest';
import { DEFAULT_PARAMS } from '../../remolques/calc/params.ts';
import { emptyBaqueton, emptyLona } from '../../remolques/entradas-vacias.ts';
import type { PedidoRemolques } from '../../remolques/flujo/tipos.ts';
import type { LineaPedido } from '../../remolques/workspace/lineas.ts';
import { contenidoBorradorRemolques, cuerpoGuardar, lineasDesdePedidoGuardado } from './guardarPedido';
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
