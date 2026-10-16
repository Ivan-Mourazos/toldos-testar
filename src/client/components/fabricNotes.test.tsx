import React from 'react';
import { describe, expect, test } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { AwningColumn } from './AwningColumn';
import { OrderHeader } from './OrderHeader';
import { createAwning } from '../constants';
import { switchAwningModel } from '../hooks/useDraft';
import { modelNames } from '../../domain/modelBehavior.js';
import { normalizeRuleParameters } from '../../domain/ruleParameters.js';
import type { RuleParameters } from '../types';
import { NotasTela } from '../hojaTelas/NotasTela';

const noop = () => {};

describe('observaciones de tela visibles', () => {
  test.each(modelNames)('%s tiene un único cuadro y conserva la nota en lectura', (model) => {
    const awning = { ...switchAwningModel(createAwning(), model), fabricNotes: 'Solo este toldo' };
    const props = { awning, index: 0, parameters: normalizeRuleParameters() as RuleParameters, sameFabric: true, onUpdate: noop, onDuplicate: noop, onRemove: noop };
    const edit = renderToStaticMarkup(<AwningColumn {...props} />);
    expect(edit.match(/<section[^>]*aria-label="Obs. tela"/g)).toHaveLength(1);
    const read = renderToStaticMarkup(<AwningColumn {...props} readOnly />);
    expect(read).toContain('<span class="read-label">Obs. tela</span>');
    expect(read).toContain('Solo este toldo');
  });

  test('las generales están a la vista fuera del desplegable', () => {
    const markup = renderToStaticMarkup(<OrderHeader orderCode="" customer="" orderDate="" fabric="" sameFabric notes="General" onNotesChange={noop} set={noop} onAutofill={noop} autofillLoading={false} autofill={null} />);
    expect(markup).toContain('aria-label="Observaciones de tela para todo el pedido"');
    expect(markup).not.toContain('<details class="order-fabric-notes"');
  });

  test('la hoja separa comentarios y destaca la letra sin interpretar HTML', () => {
    const markup = renderToStaticMarkup(<NotasTela x={0} y={0} w={200} h={90} titulo="OBSERVACIONES" filas={['General', 'B: Solo B', 'C: <texto>']} />);
    expect(markup.match(/class="telas-comentario"/g)).toHaveLength(3);
    expect(markup).toContain('<strong>B:</strong>');
    expect(markup).toContain('&lt;texto&gt;');
  });
});
