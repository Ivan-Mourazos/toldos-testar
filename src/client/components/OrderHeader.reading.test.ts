import React from 'react';
import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { OrderHeader } from './OrderHeader';
import type { FabricProposal, OrderAutofill } from '../types';

const noop = () => undefined;

const PROPOSAL: FabricProposal = {
  awningIds: ['a', 'b'],
  phrase: 'tejido acrilico, tintado masa, color negro',
  options: [
    { selection: 'ACRILI2170P120|||120|||LONA ACRILICA MASACRIL 300 NEGRO 2170|||ACRILICA (LONA)', label: 'ACRILI2170P120 · ACR NEGRO' },
    { selection: 'ACRILI2018P120|||120|||LONA ACRILICA MASACRIL 300 AZUL 2018|||ACRILICA (LONA)', label: 'ACRILI2018P120 · ACR AZUL' }
  ]
};

const AUTOFILL: OrderAutofill = {
  source: 'RPSNext',
  order: {
    orderCode: 'AR2604716', customer: 'CLIENTE', orderDate: '', technician: '', reviewer: '',
    fabric: '', sameFabric: true, remate: '', remateColor: '', structureColor: '',
    rotTela: '', rotBamba: '', notes: '', awnings: []
  },
  recovered: ['Pedido', 'Cliente'],
  pending: ['A: rotulación tela sí/no'],
  warnings: [],
  fabricProposals: [PROPOSAL]
};

function render(autofill: OrderAutofill | null, onApplyFabricProposal = noop as (proposal: FabricProposal, selection: string) => void) {
  return renderToStaticMarkup(React.createElement(OrderHeader, {
    orderCode: 'AR2604716', customer: 'CLIENTE', orderDate: '',
    fabric: '', sameFabric: true,
    notes: '', onNotesChange: noop,
    set: noop,
    onAddAwning: noop, onAddFabricWork: noop,
    onAutofill: noop, autofillLoading: false,
    autofill,
    awnings: [{ id: 'a' }, { id: 'b' }, { id: 'c' }],
    onApplyFabricProposal,
    readOnly: false
  }));
}

describe('OrderHeader · propuestas de tela (rediseño 4, tarea 3)', () => {
  it('enseña la frase de RPS con las letras de los toldos del grupo y sus opciones', () => {
    const markup = render(AUTOFILL);
    expect(markup).toContain('Tela propuesta para A, B: «tejido acrilico, tintado masa, color negro»');
    expect(markup).toContain('ACRILI2170P120 · ACR NEGRO');
    expect(markup).toContain('ACRILI2018P120 · ACR AZUL');
  });

  it('sin propuestas, no muestra el bloque', () => {
    const markup = render({ ...AUTOFILL, fabricProposals: [] });
    expect(markup).not.toContain('Tela propuesta para');
  });

  it('sin autofill, no muestra nada del resumen', () => {
    const markup = render(null);
    expect(markup).not.toContain('order-autofill-summary');
  });

  it('hasta 5 botones de opción, ninguno marcado antes de elegir', () => {
    const markup = render(AUTOFILL);
    const buttons = markup.match(/class="order-fabric-proposal-option"/g) || [];
    expect(buttons).toHaveLength(PROPOSAL.options.length);
    // El marcado estático no puede simular el click (no hay evento real), así que se
    // comprueba que ningún botón sale marcado de entrada: la elección es siempre del
    // técnico (aplicarla de verdad la prueba applyFabricProposal, ya unitaria).
    expect(markup).not.toContain('is-chosen');
  });
});
