import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { ModelPickerDialog } from './ModelPickerDialog';

const nada = () => undefined;

describe('ModelPickerDialog', () => {
  it('al añadir, «Nuevo elemento» y sin pestañas de tipo', () => {
    const html = renderToStaticMarkup(<ModelPickerDialog workType="FABRIC_ONLY" models={['CAMBIO TELA', 'CAMBIO CORTINA']} onSelect={nada} onClose={nada} />);
    expect(html).toContain('Nuevo elemento');
    expect(html).not.toContain('aria-label="Tipo de elemento"');
  });

  it('al cambiar el modelo de una tarjeta: su letra, las pestañas de tipo y el modelo actual marcado', () => {
    const html = renderToStaticMarkup(
      <ModelPickerDialog workType="FABRIC_ONLY" models={['CAMBIO TELA', 'CAMBIO CORTINA']} onSelect={nada} onClose={nada}
        cambio={{ letra: 'B', actual: 'CAMBIO TELA', onWorkType: nada }} />,
    );
    expect(html).toContain('Cambiar el elemento B');
    expect(html).toContain('Sigue en el puesto B con su OF, unidades, medidas y tela.');
    expect(html).toMatch(/aria-label="Tipo de elemento".*>Toldo<\/button>.*aria-pressed="true"[^>]*>Trabajo de tela<\/button>/);
    expect(html.match(/class="model-picker-option is-current" disabled="" aria-current="true"/g)).toHaveLength(1);
    expect(html).toMatch(/is-current[^>]*><span class="model-picker-name"><strong>[^<]*<\/strong><small>Ahora<\/small>/);
  });
});
