import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { FabricCombobox } from './FabricCombobox';

describe('ancho de rollo en la selección de tela', () => {
  it('avisa y ofrece un campo sin rellenar cuando el catálogo desconoce el ancho', () => {
    const markup = renderToStaticMarkup(<FabricCombobox label="Tela" value="PLAST880||||||LONA" onChange={() => {}} />);
    expect(markup).toContain('Ancho de rollo desconocido. Indícalo para poder calcular.');
    expect(markup).toContain('Ancho de rollo (cm)');
    expect(markup).toContain('value=""');
    expect(markup).not.toContain('value="120"');
  });

  it('conserva el campo para revisar el ancho introducido y distingue la bamba', () => {
    const markup = renderToStaticMarkup(<FabricCombobox label="Tela bamba" value="PLAST880|||137.2|||LONA" onChange={() => {}} />);
    expect(markup).toContain('Ancho de rollo de bamba (cm)');
    expect(markup).toContain('value="137.2"');
    expect(markup).not.toContain('Ancho de rollo desconocido.');
  });
});
