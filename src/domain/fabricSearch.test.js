import { describe, expect, test } from 'vitest';
import { normalizeSearchText, rankFabricMatches } from './fabricSearch.js';

const fabrics = [
  { code: 'ACRILI2170P120', description: 'LONA ACRILICA MASACRIL 300 NEGRO 2170', width: 120, subfamily: 'ACRILICA (LONA)' },
  { code: 'ACRILI2171P120', description: 'LONA ACRILICA MASACRIL 300 NEGRO N 2171', width: 120, subfamily: 'ACRILICA (LONA)' },
  { code: 'ACRILI2101P120', description: 'LONA ACRILICA MASACRIL 300 GRANATE 2101', width: 120, subfamily: 'ACRILICA (LONA)' },
  { code: 'ACRISAT', description: 'LONA ACRILICA SATTLER 290 GR/M2', width: 120, subfamily: 'ACRILICA (LONA)' },
  { code: 'ALPHANA04P250', description: 'LONA PVC NARANJA', width: 250, subfamily: 'PLASTICA (LONA)' }
];

const preferredFabrics = [
  { code: 'PVCNEGROP250', description: 'LONA PVC NEGRA', width: 250, subfamily: 'PLASTICA (LONA)' },
  { code: 'ACROTRAP153', description: 'LONA ACRILICA OTRA NEGRA', width: 153, subfamily: 'ACRILICA (LONA)' },
  { code: 'ACROTRAP120', description: 'LONA ACRILICA OTRA NEGRA', width: 120, subfamily: 'ACRILICA (LONA)' },
  { code: 'ACRMASAP120', description: 'LONA ACRILICA MASACRIL NEGRA', width: 120, subfamily: 'ACRILICA (LONA)' }
];

describe('rankFabricMatches', () => {
  test('acepta palabras parciales en cualquier orden', () => {
    const result = rankFabricMatches(fabrics, 'neg acr');
    expect(result.map((fabric) => fabric.code)).toEqual(['ACRILI2170P120', 'ACRILI2171P120']);
  });

  test('entiende material, color y parte del código escritos de forma natural', () => {
    expect(rankFabricMatches(fabrics, 'acrílico negro 2170')[0]?.code).toBe('ACRILI2170P120');
    expect(rankFabricMatches(fabrics, 'plástica naranja')[0]?.code).toBe('ALPHANA04P250');
  });

  test('tolera un pequeño error de escritura', () => {
    expect(rankFabricMatches(fabrics, 'grante')[0]?.code).toBe('ACRILI2101P120');
    expect(rankFabricMatches(fabrics, 'acrilico grante')[0]?.code).toBe('ACRILI2101P120');
  });

  test('mantiene primero una coincidencia exacta y respeta el límite', () => {
    const result = rankFabricMatches(fabrics, 'ACRILI2170P120', 1);
    expect(result).toEqual([fabrics[0]]);
  });

  test('a igual coincidencia prioriza acrílico, ancho 120 y Masacril', () => {
    expect(rankFabricMatches(preferredFabrics, 'negra').map((fabric) => fabric.code)).toEqual([
      'ACRMASAP120', 'ACROTRAP120', 'ACROTRAP153', 'PVCNEGROP250'
    ]);
  });

  test('no devuelve resultados sin relación', () => {
    expect(rankFabricMatches(fabrics, 'turquesa ignífuga')).toEqual([]);
  });
});

test('normalizeSearchText ignora acentos, signos y espacios duplicados', () => {
  expect(normalizeSearchText('  Plástica · azul-océano  ')).toBe('PLASTICA AZUL OCEANO');
});
