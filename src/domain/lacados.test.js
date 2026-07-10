import { describe, expect, test } from 'vitest';
import { resolveLacado, crankSuffix, machineCode, lacadoNames } from './lacados.js';

describe('lacados', () => {
  test('mapa completo de sufijos', () => {
    expect(resolveLacado('BLANCO').suffix).toBe('BL16');
    expect(resolveLacado('GRIS PLATA (R-00027)').suffix).toBe('PL27');
    expect(resolveLacado('GRIS (R-07022)').suffix).toBe('GR22');
    expect(resolveLacado('BRONCE (R-00028)').suffix).toBe('BR28');
    expect(resolveLacado('MARFIL (R-01015)').suffix).toBe('MA15');
    expect(resolveLacado('MARRON (R-08014)').suffix).toBe('MR14');
    expect(resolveLacado('NEGRO (R-09011)').suffix).toBe('NE11');
    expect(resolveLacado('VERDE (R-06005)').suffix).toBe('VE05');
    expect(resolveLacado('BURDEOS (R-03005)').suffix).toBe('BU05');
    expect(resolveLacado('LACADO ESPECIAL').suffix).toBe('');
  });

  test('tolerante a espacios y variantes del Excel', () => {
    expect(resolveLacado('MARFIL( R-01015)').suffix).toBe('MA15');
    expect(resolveLacado('  negro (r-09011) ').suffix).toBe('NE11');
    expect(resolveLacado('BURDEOS').suffix).toBe('BU05');
  });

  test('desconocido cae a BLANCO (comportamiento actual)', () => {
    expect(resolveLacado('').suffix).toBe('BL16');
    expect(resolveLacado('FUCSIA').suffix).toBe('BL16');
  });

  test('color de manivela: solo BLANCO y MARFIL llevan manivela blanca', () => {
    expect(resolveLacado('BLANCO').crank).toBe('BLANCA');
    expect(resolveLacado('MARFIL (R-01015)').crank).toBe('BLANCA');
    expect(resolveLacado('NEGRO (R-09011)').crank).toBe('NEGRA');
    expect(resolveLacado('GRIS PLATA (R-00027)').crank).toBe('NEGRA');
  });

  test('las piezas de manivela/máquina van por color de manivela, no por lacado', () => {
    expect(crankSuffix(resolveLacado('GRIS PLATA (R-00027)'))).toBe('NE11');
    expect(crankSuffix(resolveLacado('BLANCO'))).toBe('BL16');
    expect(machineCode(resolveLacado('BLANCO'))).toBe('MAQMB9L13BLANBL16');
    expect(machineCode(resolveLacado('MARRON (R-08014)'))).toBe('MAQMB9L13NEGRNE11');
  });

  test('lista canónica para el desplegable', () => {
    expect(lacadoNames).toHaveLength(10);
    expect(lacadoNames).toContain('BLANCO');
    expect(lacadoNames).toContain('LACADO ESPECIAL');
  });
});
