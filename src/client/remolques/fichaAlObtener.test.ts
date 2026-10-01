import { describe, expect, it } from 'vitest';
import { DEFAULT_PARAMS } from '../../remolques/calc/params.ts';
import { entradasDeCliente, fichasSemilla } from '../../remolques/clientes/semilla.ts';
import type { PedidoRps } from '../../remolques/rps/types.ts';
import { decidirFicha, notaFicha, preguntaSugerencia } from './fichaAlObtener';

const fichas = fichasSemilla(entradasDeCliente(DEFAULT_PARAMS));
const pedido = (codigo: string, nombre: string, alias: string | null = null): PedidoRps => ({
  numero: 'AR.26.04286', fecha: '2026-10-01', fechaSalida: null, cliente: { codigo, nombre, alias }, lineas: [],
});

describe('qué ficha toca a un pedido', () => {
  it('por el código: esa, sin preguntar', () => {
    expect(decidirFicha(fichas, pedido('001300', 'HIJOS DE PEDRO LOPEZ S.L.').cliente)).toMatchObject({ ficha: { id: 'hijos-de-pedro-lopez' }, sugerida: null });
  });
  it('sin código en ninguna ficha y con el nombre parecido: se sugiere', () => {
    expect(decidirFicha(fichas, pedido('099999', 'REMOLQUES AYALA NORTE').cliente)).toMatchObject({ ficha: null, sugerida: { id: 'ayala' } });
  });
  it('sin código de cliente, ni ficha ni sugerencia', () => {
    expect(decidirFicha(fichas, pedido('', 'REMOLQUES AYALA').cliente)).toEqual({ ficha: null, sugerida: null });
  });
});

describe('la pregunta y el aviso', () => {
  it('pregunta si es de la ficha, con «Añadir el código y aplicar» y «No»', () => {
    const p = pedido('099999', 'ENGANCHES AYALA', 'REMOLQUES AYALA NORTE');
    expect(preguntaSugerencia(fichas[1], p)).toEqual({
      title: '¿Es de la ficha AYALA?',
      message: 'El cliente de AR.26.04286 en RPS, REMOLQUES AYALA NORTE (código 099999), no está en ninguna ficha, pero su nombre se parece al de AYALA. Si añades el código, sus pedidos tomarán la ficha solos.',
      confirmLabel: 'Añadir el código y aplicar',
      cancelLabel: 'No',
    });
  });
  it('un nombre de ficha que acaba en punto no lleva punto doble', () => {
    const ficha = { ...fichas[1], nombre: 'TALLERES CAL, C. B.' };
    expect(preguntaSugerencia(ficha, pedido('016573', 'TALLERES CAL')).message).toContain('al de TALLERES CAL, C. B. Si añades');
  });
  it('el aviso dice de qué ficha viene lo marcado, solo si puso algo', () => {
    expect(notaFicha(fichas[0], [{ version: '10', tipo: 'lona', input: {} as never, delCliente: { ficha: 'HIJOS DE PEDRO LOPEZ', campos: ['material'] } }]))
      .toBe(' Con la ficha de HIJOS DE PEDRO LOPEZ: lo marcado «del cliente» viene de ella.');
    expect(notaFicha(fichas[0], [{ version: '10', tipo: 'lona', input: {} as never }])).toBe('');
    expect(notaFicha(null, [])).toBe('');
  });
});
