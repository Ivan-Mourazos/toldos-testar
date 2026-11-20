import React from 'react';
import { describe, expect, test } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { AwningColumn } from './AwningColumn';
import { createAwning } from '../constants';
import { switchAwningModel } from '../hooks/useDraft';
import { normalizeRuleParameters } from '../../domain/ruleParameters.js';
import type { RuleParameters } from '../types';

const noop = () => {};
const pvc = 'PVC580BL|||250|||LONA PVC 580 BLANCO :250 AN|||PLASTICA (LONA)';
const soltis = 'SOLTIS92BEIGP267|||267|||SOLTIS 92  BEIGE|||SOLTIS 92';
const acrilico = 'ACR|||120|||TELA ACRILICA|||ACR';

function formulario(model: string, orderFabric: string, extra = {}) {
  const awning = { ...switchAwningModel(createAwning(), model), valanceHeight: 30, ...extra };
  return renderToStaticMarkup(<AwningColumn awning={awning} index={0} parameters={normalizeRuleParameters() as RuleParameters} sameFabric orderFabric={orderFabric} onUpdate={noop} onDuplicate={noop} onRemove={noop} />);
}

describe('Bastillas de la bambalina en el formulario (Iván, 20/11/2026)', () => {
  test.each([['PVC', pvc], ['Soltis', soltis]])('en %s salen los cuatro bordes con bastilla o al corte', (_n, tela) => {
    const html = formulario('BAMBALINA', tela);
    for (const texto of ['Punta izquierda', 'Punta derecha', 'Abajo', 'Arriba (varilla)', 'Bastilla', 'Al corte']) expect(html).toContain(texto);
    expect(html).toContain('Punta izquierda: bastilla (cm)');
  });
  test('al corte no pide los cm de ese borde', () => {
    const html = formulario('BAMBALINA', pvc, { bambaBastillas: { izq: 0 } });
    expect(html).not.toContain('Punta izquierda: bastilla (cm)');
    expect(html).toContain('Punta derecha: bastilla (cm)');
  });
  test('con onda, abajo no lleva bastilla', () => {
    expect(formulario('BAMBALINA', pvc, { valanceCurve: 'NORMAL' })).toContain('el remate va aparte');
  });
  // Iván, 20/11/2026: también en acrílico, aunque no haya corte; va indicado en el dibujo.
  test('sale también en acrílico', () => {
    const html = formulario('BAMBALINA', acrilico);
    for (const texto of ['Punta izquierda', 'Punta derecha', 'Abajo', 'Arriba (varilla)']) expect(html).toContain(texto);
  });
  test('no sale en la bamba de un toldo', () => {
    expect(formulario('GALICIA', pvc)).not.toContain('Arriba (varilla)');
  });
});
