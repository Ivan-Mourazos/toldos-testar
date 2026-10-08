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
    // Iván, 08/10/2026 (AR2604748): el negro 9005 brillo, además del mate 9005-9405.
    expect(resolveLacado('NEGRO 9005')).toMatchObject({ suffix: 'NE05', crank: 'NEGRA' });
    expect(lacadoNames).toEqual(expect.arrayContaining(['NEGRO 9005', 'NEGRO MATE 9005-9405']));
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
    expect(machineCode(resolveLacado('BLANCO'))).toBe('MAQMB11L12BLAN');
    expect(machineCode(resolveLacado('MARRON (R-08014)'))).toBe('MAQMB11L12NEGRO');
  });

  test('lista canónica para el desplegable', () => {
    expect(lacadoNames).toHaveLength(35);
    expect(lacadoNames).toContain('ANTRACITA (RAL 7016)');
    expect(resolveLacado('ANTRACITA (RAL 7016)')).toMatchObject({ suffix: 'GR16', crank: 'NEGRA' });
    expect(lacadoNames).toContain('BLANCO');
    expect(lacadoNames).toContain('LACADO ESPECIAL');
    expect(lacadoNames).toContain('GRIS 7016');
  });

  // Iván, 08/10/2026: por orden alfabético y con los colores que tienen piezas lacadas en RPS.
  test('el desplegable va por orden alfabético', () => {
    expect(lacadoNames).toEqual([...lacadoNames].sort((a, b) => a.localeCompare(b, 'es')));
  });

  test('colores añadidos el 08/10/2026, con su sufijo de RPS y su manivela', () => {
    const added = {
      'AZUL 5004 MATE': ['AZM4', 'NEGRA'],
      'BLANCO 9016 MATE TEXT.': ['B16M', 'BLANCA'],
      'BLANCO ALUMINIO 9006 TEXT.': ['BT06', 'NEGRA'],
      'BLANCO ALUMINIO 99006': ['BL06', 'NEGRA'],
      'BLANCO MATE 9003': ['BL3M', 'BLANCA'],
      'GRIS 7016 MATE': ['G16M', 'NEGRA'],
      'MARFIL BLANCO OSTRA 1013 TEXT.': ['MATX', 'BLANCA'],
      'MARFIL MATE 1013': ['MM13', 'BLANCA'],
      'MARRON 8002': ['MR02', 'NEGRA'],
      'MARRON 8007': ['MR07', 'NEGRA'],
      'MARRON 8014 TEXT.': ['MT14', 'NEGRA'],
      'MARRON 8017': ['MR17', 'NEGRA'],
      'MARRON 8019': ['MR19', 'NEGRA'],
      'PARDO 8019': ['PA19', 'NEGRA'],
      'PLATA 9006': ['PL06', 'NEGRA'],
      'PLATA ANODIZADO 537': ['P537', 'NEGRA'],
      'VERDE 6009': ['VE09', 'NEGRA']
    };
    for (const [name, [suffix, crank]] of Object.entries(added)) {
      expect(lacadoNames).toContain(name);
      expect(resolveLacado(name)).toMatchObject({ name, suffix, crank });
    }
  });

  test('un nombre desconocido sigue cayendo en blanco aunque la lista vaya ordenada', () => {
    expect(resolveLacado('COLOR INVENTADO').name).toBe('BLANCO');
  });

  test('GRIS sin código no cae en GRIS PLATA por coincidencia parcial', () => {
    expect(resolveLacado('GRIS').suffix).toBe('GR22');
    expect(resolveLacado('GRIS PLATA').suffix).toBe('PL27');
    expect(resolveLacado('gris').suffix).toBe('GR22');
  });

  test('un prefijo corto o ambiguo no resuelve por accidente (cae a BLANCO)', () => {
    expect(resolveLacado('GR').suffix).toBe('BL16');
    expect(resolveLacado('B').suffix).toBe('BL16');
  });

  test('la tabla de lacados es inmutable', () => {
    expect(Object.isFrozen(resolveLacado('BLANCO'))).toBe(true);
    expect(() => { resolveLacado('BLANCO').suffix = 'HACKED'; }).toThrow();
  });
});
