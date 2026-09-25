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

function render(autofill: OrderAutofill | null, onApplyFabricProposal = noop as (proposal: FabricProposal, selection: string) => void, readOnly = false) {
  return renderToStaticMarkup(React.createElement(OrderHeader, {
    orderCode: 'AR2604716', customer: 'CLIENTE', orderDate: '',
    fabric: '', sameFabric: true,
    notes: '', onNotesChange: noop,
    set: noop,
    onAutofill: noop, autofillLoading: false,
    autofill,
    awnings: [{ id: 'a' }, { id: 'b' }, { id: 'c' }],
    onApplyFabricProposal,
    readOnly
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

describe('OrderHeader · resumen al terminar (rediseño 4, tarea 4)', () => {
  it('enseña las frases del resumen antes de los contadores', () => {
    const markup = render({
      ...AUTOFILL,
      summary: [
        '8 cortinas · lacado marrón 8014 · rotulación no indicada · medidas: RPS pone «diferentes medidas»',
        'tela: elige entre las propuestas'
      ]
    });
    expect(markup).toContain('order-autofill-summary-lines');
    expect(markup).toContain('8 cortinas · lacado marrón 8014 · rotulación no indicada · medidas: RPS pone «diferentes medidas»');
    expect(markup).toContain('tela: elige entre las propuestas');
    // Las frases del resumen van antes de los contadores («campos recuperados»).
    expect(markup.indexOf('8 cortinas')).toBeLessThan(markup.indexOf('campos recuperados'));
  });

  it('sin resumen, no muestra la lista de frases', () => {
    const markup = render({ ...AUTOFILL, summary: [] });
    expect(markup).not.toContain('order-autofill-summary-lines');
  });
});

describe('OrderHeader · propuestas de tela, accesibilidad y lectura (revisión final del plan 4)', () => {
  it('cada bloque de opciones es un grupo con la frase como nombre, y los botones dicen si están pulsados', () => {
    const markup = render(AUTOFILL);
    expect(markup).toContain('role="group" aria-label="tejido acrilico, tintado masa, color negro"');
    expect((markup.match(/aria-pressed="false"/g) || [])).toHaveLength(PROPOSAL.options.length);
  });

  it('en modo lectura los botones de propuesta salen desactivados', () => {
    const markup = render(AUTOFILL, noop, true);
    const buttons = markup.match(/<button[^>]*class="order-fabric-proposal-option"[^>]*>/g) || [];
    expect(buttons).toHaveLength(PROPOSAL.options.length);
    expect(buttons.every((button) => button.includes('disabled'))).toBe(true);
  });

  it('fuera del modo lectura los botones de propuesta están activos', () => {
    const markup = render(AUTOFILL);
    const buttons = markup.match(/<button[^>]*class="order-fabric-proposal-option"[^>]*>/g) || [];
    expect(buttons.some((button) => button.includes('disabled'))).toBe(false);
  });

  it('un grupo sin opciones enseña «sin coincidencias en el catálogo»', () => {
    const markup = render({ ...AUTOFILL, fabricProposals: [{ ...PROPOSAL, options: [] }] });
    expect(markup).toContain('Tela propuesta para A, B');
    expect(markup).toContain('sin coincidencias en el catálogo');
    expect(markup).not.toContain('order-fabric-proposal-option');
  });
});
