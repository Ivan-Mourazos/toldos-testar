import { describe, expect, it } from 'vitest';
import { debePreguntarAlCorregir } from './correccionPedido';
import { pasoCorteEditable } from './flujoCorteDwg';
import { generationBlock } from '../reviewRules.js';
import { nombresElementosPuertas } from '../puertas/flujo/pedido';

describe('abrir un pedido para corregir', () => {
  it.each([
    ['', 'AR2601000', false, false],
    ['AR.26.01000', 'AR2601000', true, false],
    ['AR2601001', 'AR2601000', false, false],
    ['AR2601001', 'AR2601000', true, true],
  ])('%s → %s: con cambios %s pregunta %s', (actual, nuevo, cambios, esperado) => {
    expect(debePreguntarAlCorregir(actual, nuevo, cambios)).toBe(esperado);
  });
});

describe('abrir el corte del editor', () => {
  it.each([{ borrador: true }, { revisado: true }, { corteSimulado: true }])('explica los datos que faltan aunque exista un corte: %j', estado => {
    expect(pasoCorteEditable({ activo: true, ...estado }, 'Falta la OF')).toEqual({ paso: 'incompleto', motivo: 'Falta la OF' });
  });
  it('explica que la simulación no crea un DWG', () => {
    expect(pasoCorteEditable({ activo: true, corteSimulado: true }, null)).toMatchObject({ motivo: expect.stringContaining('no hay DWG') });
  });
});

describe('nombre y género de puertas y lonas', () => {
  it.each(['APILABLE', 'SYSTEMDOCK'])('%s: concordancia en singular y plural', modelo => {
    const elementos = [{ input: { modelo } }] as Parameters<typeof nombresElementosPuertas>[0]['elementos'];
    const nombres = nombresElementosPuertas({ elementos });
    const nombre = modelo === 'SYSTEMDOCK' ? 'lona System Dock' : 'puerta';
    const plural = modelo === 'SYSTEMDOCK' ? 'lonas System Dock' : 'puertas';
    expect(generationBlock([{ letter: 'A', of: '' }], null, nombres)).toBe(`Falta la OF en la ${nombre} A.`);
    expect(generationBlock([{ letter: 'A', of: '' }, { letter: 'B', of: '' }], null, nombres)).toBe(`Falta la OF en las ${plural} A, B.`);
  });
});
