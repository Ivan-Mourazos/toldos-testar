import React from 'react';
import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { AwningColumn } from './AwningColumn';
import { SAMPLE_FABRIC, sampleAwnings } from '../../../scripts/lib/model-samples.mjs';
import { normalizeRuleParameters } from '../../domain/ruleParameters.js';
import type { Awning, RuleParameters } from '../types';

const image = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=';
const noop = () => undefined;
const arzua = (patch: Partial<Awning> = {}): Awning => ({
  ...(sampleAwnings('ARZUA PRO')[0].awning as Awning), device: 'MOTOR', fabricDiagramOverride: '', workshopDrawingId: '', fabricImage: null, ...patch
});
const conDibujos = (list: unknown[]) => normalizeRuleParameters({ drawings: { byModel: { 'ARZUA PRO': list } } }) as RuleParameters;
const render = (awning: Awning, parameters: RuleParameters) => renderToStaticMarkup(React.createElement(AwningColumn, {
  awning, index: 0, parameters, sameFabric: true, orderFabric: SAMPLE_FABRIC, onUpdate: noop, onDuplicate: noop, onRemove: noop
}));

describe('«Dibujo de confección» en la tarjeta (02/10/2026)', () => {
  it('sin dibujos del taller dice que sale el de la web', () => {
    expect(render(arzua(), normalizeRuleParameters() as RuleParameters)).toContain('Automático (sale: el de la web)');
  });

  it('con un automático del taller que encaja, dice cuál', () => {
    const html = render(arzua(), conDibujos([{ id: 'motor', name: 'Motor', enabled: true, image, conditions: [{ field: 'device', value: 'MOTOR' }] }]));
    expect(html).toContain('Automático (sale: «Motor» del taller)');
  });

  it('el elegido a mano se ve con su nombre', () => {
    const html = render(arzua({ workshopDrawingId: 'plano' }), conDibujos([{ id: 'plano', name: 'Plano', usage: 'manual', enabled: true, image, conditions: [] }]));
    expect(html).toContain('Plano (taller)');
    expect(html).not.toContain('ya no está en Parámetros');
  });

  it('si el elegido ya no está, avisa y vuelve a Automático', () => {
    const html = render(arzua({ workshopDrawingId: 'quitado' }), conDibujos([]));
    expect(html).toContain('ya no está en Parámetros o está desactivado');
    expect(html).toContain('Automático (sale: el de la web)');
  });
});
