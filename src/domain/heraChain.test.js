import { expect, test } from 'vitest';
import { resolveHeraChainRing } from './heraChain.js';

test('resuelve las referencias verificadas por color y largo del anillo cerrado', () => {
  expect(resolveHeraChainRing('BLANCO', 150)?.code).toBe('SCRANILBLAN150C');
  expect(resolveHeraChainRing('NEGRO', 200)?.code).toBe('SCRANILNEGRO200C');
  expect(resolveHeraChainRing('BLANCO', 400)?.code).toBe('SCRANILBLAN400C');
});

test('no inventa referencias para colores o medidas no documentados', () => {
  expect(resolveHeraChainRing('BLANCO', 130)).toBeNull();
  expect(resolveHeraChainRing('NEGRO', 250)).toBeNull();
  expect(resolveHeraChainRing('', 150)).toBeNull();
});
