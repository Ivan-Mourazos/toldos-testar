import { describe, expect, it } from 'vitest';
import pedido from './corteLona/fixtures/AR2605193-pedido.json' with { type: 'json' };
import { calculateCortina } from './cortinaRules.js';
import { normalizeOrder } from './validation.js';

// Iván, 26/10/2026: «en los Cortina añade el soporte Elit vertical, como existe en el Electra, con sus descuentos».
describe('Cortina con soporte Elit vertical', () => {
  const awning = (curtainSupport, device = 'MOTOR') => ({ ...pedido.awnings[0], width: 300, device, curtainSupport });
  const calcular = (soporte, device) => { const r = calculateCortina({ order: pedido, awning: awning(soporte, device) }); return { ...r.calculation, materials: r.materials }; };
  const codigos = (r) => r.materials.map((l) => l.code);

  it.each(['MOTOR', 'MAQ. INTERIOR', 'MAQ. EXTERIOR'])('%s: descuentos de la Electra con Elit (tela 10, tubo 8, barra 9,5)', (device) => {
    const r = calcular('SOPORTE ELIT VERTICAL', device);
    expect(r.fabricWidth).toBe(290);
    expect(r.rollTubeLength).toBe(292);
    expect(r.structureLength).toBe(290.5);
  });
  it('lleva el juego de soportes Elit y no el universal', () => {
    const elit = codigos(calcular('SOPORTE ELIT VERTICAL'));
    expect(elit.some((c) => c.startsWith('ELITSOST'))).toBe(true);
    expect(elit.some((c) => c.startsWith('SOPUNI3AGU'))).toBe(false);
  });
  it('con el universal, como siempre (tela 11, tubo 10, barra 10 a motor)', () => {
    const r = calcular('UNIVERSAL 3 AGUJEROS');
    expect([r.fabricWidth, r.rollTubeLength, r.structureLength]).toEqual([289, 290, 290]);
    expect(codigos(r).some((c) => c.startsWith('SOPUNI3AGU'))).toBe(true);
  });
  it('se guarda en la Cortina y no en la Selena', () => {
    const conModelo = (model) => normalizeOrder({ ...pedido, awnings: [{ ...pedido.awnings[0], model, curtainSupport: 'SOPORTE ELIT VERTICAL' }] }).awnings[0].curtainSupport;
    expect(conModelo('CORTINA')).toBe('SOPORTE ELIT VERTICAL');
    expect(conModelo('SELENA')).toBe('UNIVERSAL 3 AGUJEROS');
  });
});
