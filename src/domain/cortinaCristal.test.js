import { describe, expect, it } from 'vitest';
import pedido from './corteLona/fixtures/AR2605193-pedido.json' with { type: 'json' };
import { calculateCortina } from './cortinaRules.js';

// Iván, 23/10/2026: AR2605193 se reutilizó con ventana de 137 y el cristal salía partido (846 en vez de 792).
describe('Cortina: el cristal tiene que caber en su rollo de 140', () => {
  const avisos = (alto) => calculateCortina({ order: pedido, awning: { ...pedido.awnings[0], curtainWindowHeight: alto } })
    .diagnostics.filter((d) => d.level === 'warn').map((d) => d.message);
  it('con 137 avisa en la tarjeta y propone 136', () => {
    expect(avisos(137)).toContain('Ventana de 137 en OF 0233272: el cristal de 141 no cabe en el rollo de 140 y saldrá partido. Con la ventana en 136 va entero.');
  });
  it('con 136 no avisa', () => {
    expect(avisos(136).some((m) => /cristal/.test(m))).toBe(false);
  });
});
