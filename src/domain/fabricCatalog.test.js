// src/domain/fabricCatalog.test.js
import { describe, expect, it } from 'vitest';
import { resolveFabric } from './fabricCatalog.js';

describe('resolveFabric', () => {
  it('resolves a known fabric by exact name', () => {
    const fabric = resolveFabric('ACR GRANATE');
    expect(fabric).toEqual({ code: 'ACRILI2101P120', description: 'ACR GRANATE', width: 120, material: 'ACR', color: 'GRANATE' });
  });

  it('normalizes case and surrounding whitespace before matching', () => {
    const fabric = resolveFabric('  acr   granate  ');
    expect(fabric?.code).toBe('ACRILI2101P120');
  });

  it('returns null for a fabric name that does not exist in the catalog', () => {
    expect(resolveFabric('ACR GENERAT RED')).toBeNull();
  });

  it('returns null for an empty or missing name', () => {
    expect(resolveFabric('')).toBeNull();
    expect(resolveFabric(undefined)).toBeNull();
  });

  it('resolves a fabric whose roll width is not 120cm', () => {
    const fabric = resolveFabric('PVC 580 NARANJA');
    expect(fabric).toMatchObject({ code: 'ALPHANA04P250', width: 250 });
  });

  it('picks the first table match when a fabric name has more than one roll width on record', () => {
    const fabric = resolveFabric('ACR ADMIRAL');
    expect(fabric).toMatchObject({ code: 'ACRILI2051P120', width: 120 });
  });
});
