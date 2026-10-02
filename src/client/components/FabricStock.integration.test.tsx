import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { OrderHeader } from './OrderHeader';
import { AwningColumn } from './AwningColumn';
import { SAMPLE_FABRIC, sampleAwnings } from '../../../scripts/lib/model-samples.mjs';
import { normalizeRuleParameters } from '../../domain/ruleParameters.js';
import type { Awning, RuleParameters } from '../types';

const { stocks } = vi.hoisted(() => ({ stocks: {
  ACRILI2170P120: { status: 'ready', stock: { code: 'ACRILI2170P120', metros: 12.5, reservado: 0, disponible: 12.5, bobinasConDisponible: 2, mayorBobinaDisponible: 10, consignacion: 0, almacenes: [] } },
  ACRILI2018P120: { status: 'ready', stock: { code: 'ACRILI2018P120', metros: 0, reservado: 0, disponible: 0, bobinasConDisponible: 0, mayorBobinaDisponible: 0, consignacion: 0, almacenes: [] } }
} }));
vi.mock('../hooks/useFabricStock', () => ({
  useFabricStocks: vi.fn(() => stocks),
  useFabricStock: (code: keyof typeof stocks) => stocks[code] ?? { status: 'idle' }
}));
const noop = () => undefined;
const blue = 'ACRILI2018P120|||120|||ACR AZUL';

describe('stock en el formulario', () => {
  it('la tela de la cabecera enseña su stock', () => {
    const markup = renderToStaticMarkup(<OrderHeader orderCode="AR2603332" customer="" orderDate="" fabric={SAMPLE_FABRIC} sameFabric notes="" onNotesChange={noop} set={noop} onAutofill={noop} autofillLoading={false} autofill={null} />);
    expect(markup).toContain('fabric-stock-line');
  });

  it('la tela de bamba tiene su propia línea y desaparece con «Igual que la tela», sin bamba o en lectura', () => {
    const parameters = normalizeRuleParameters({}) as RuleParameters;
    const awning = { ...sampleAwnings('ARZUA PRO')[0].awning, id: 'a', valanceHeight: 30, valanceFabric: blue } as unknown as Awning;
    const render = (patch: Partial<Awning> = {}, readOnly = false) => renderToStaticMarkup(<AwningColumn awning={{ ...awning, ...patch }} index={0} parameters={parameters} sameFabric orderFabric={SAMPLE_FABRIC} valanceFabricNeedMl={4.2} readOnly={readOnly} onUpdate={noop} onDuplicate={noop} onRemove={noop} />);
    expect(render()).toContain('Sin stock en RPS');
    expect(render()).toContain('este pedido necesita 4,2 ml');
    expect(render({ valanceFabric: '' })).not.toContain('fabric-stock-line');
    expect(render({ valanceHeight: 0 })).not.toContain('fabric-stock-line');
    expect(render({}, true)).not.toContain('fabric-stock-line');
  });
});
