import React from 'react';
import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { OrderHeader } from './OrderHeader';
import type { OrderAutofill } from '../types';

const noop = () => undefined;
const NEGRO = 'ACRILI2170P120|||120|||LONA ACRILICA MASACRIL 300 NEGRO 2170|||ACRILICA (LONA)';

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
  summary: ['1 Perla Box · lacado negro 9011 · rotulación no indicada']
};

type Overrides = { fabric?: string; sameFabric?: boolean };

function render(autofill: OrderAutofill | null, readOnly = false, overrides: Overrides = {}) {
  return renderToStaticMarkup(React.createElement(OrderHeader, {
    orderCode: 'AR2604716', customer: 'CLIENTE', orderDate: '',
    fabric: '', sameFabric: true,
    notes: '', onNotesChange: noop,
    set: noop,
    onAutofill: noop, autofillLoading: false,
    autofill,
    readOnly,
    ...overrides
  }));
}

// Iván, 02/10/2026: fuera las telas propuestas, los pendientes y el resumen de RPS; cada tarjeta ya
// dice en vivo lo que le falta. Solo quedan los avisos de RPS, a la vista y solo si los hay.
describe('OrderHeader · lo que queda de RPS', () => {
  it('sin avisos no sale nada de RPS: ni resumen, ni pendientes, ni propuestas', () => {
    const markup = render(AUTOFILL);
    expect(markup).not.toContain('Datos de RPSNext');
    expect(markup).not.toContain('Ver pendientes');
    expect(markup).not.toContain('Tela propuesta');
    expect(markup).not.toContain('1 Perla Box');
    expect(markup).not.toContain('order-autofill-warnings');
  });

  it('los avisos de RPS salen a la vista, sin desplegable', () => {
    const markup = render({ ...AUTOFILL, warnings: ['OF 0232109: RPS contiene más de una tela; revisa la propuesta.'] });
    expect(markup).toContain('aria-label="Avisos de RPSNext"');
    expect(markup).toContain('OF 0232109: RPS contiene más de una tela');
    expect(markup).not.toContain('Ver avisos');
  });

  it('en modo lectura solo la tela y sus observaciones', () => {
    const markup = render({ ...AUTOFILL, warnings: ['aviso'] }, true);
    expect(markup).toContain('order-header-read-line');
    expect(markup).not.toContain('order-autofill-warnings');
  });
});

describe('OrderHeader · la tela que se ve es la que lleva el pedido (informe tela-0930)', () => {
  it('F4: con «Por toldo», «Referencia» no enseña la tela común guardada', () => {
    const markup = render(AUTOFILL, false, { fabric: NEGRO, sameFabric: false });
    expect(markup).toContain('Tela por toldo · se elige en cada tarjeta');
    expect(markup).not.toContain('fabric-readonly-value');
    expect(markup).not.toMatch(/value="ACRILI2170P120/);
  });

  it('con tela común elegida, enseña la línea de stock bajo «Referencia»', () => {
    expect(render(AUTOFILL, false, { fabric: NEGRO })).toContain('fabric-stock-line');
    expect(render(AUTOFILL, false, { fabric: '' })).not.toContain('fabric-stock-line');
  });
});
