import { describe, expect, it } from 'vitest';
import { fichaPorId } from '../../puertas/clientes.ts';
import { modelosInicio } from '../modelosInicio';
import { cabeceraInicialPuertas, clientesInicioPuertas } from './clientesInicioPuertas';

describe('clientes de Puertas en el inicio', () => {
  it('Puertas genéricas sale al final para empezar una puerta sin traer el pedido de RPS', () => {
    const ids = clientesInicioPuertas('').map(f => f.id);
    expect(ids).toContain('general');
    expect(ids.at(-1)).toBe('general');
  });
  it('el buscador encuentra Puertas genéricas', () => {
    expect(clientesInicioPuertas('genéricas').map(f => f.id)).toEqual(['general']);
  });
  it('solo el enrollable de Puertas genéricas se puede empezar; el resto, próximamente', () => {
    const tipos = modelosInicio('puertas', [], '', 'general')[0].modelos;
    expect(tipos.filter(t => !t.proximamente).map(t => t.nombre)).toEqual(['Enrollable']);
  });
  it('Puertas genéricas deja el cliente vacío para escribir el real; un cliente con ficha se rellena', () => {
    expect(cabeceraInicialPuertas(fichaPorId('general')!, '25/11/2026')).toEqual({ cliente: '', fecha: '25/11/2026' });
    expect(cabeceraInicialPuertas(fichaPorId('portanova')!, '25/11/2026')).toEqual({ cliente: 'Portanova', fecha: '25/11/2026', clienteRps: { codigo: '001336', nombre: 'Portanova' } });
  });
});
