import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { ParameterModelPicker, gruposDelSelector } from './ParameterModelPicker';

const grupos = [
  { family: 'COFRE', models: ['AMBAR BOX', 'AGATA BOX'] },
  { family: 'BRAZOS INVISIBLES', models: ['ARZUA PRO', 'GALICIA'] },
  { family: '', models: ['ENROLLABLE'] }
];
const pintar = (selectedModel: string, extra: Partial<React.ComponentProps<typeof ParameterModelPicker>> = {}) => renderToStaticMarkup(
  <ParameterModelPicker selectedModel={selectedModel} groups={grupos} includeRemolques pendientes={[]} onSelectModel={() => {}} {...extra} />
);

describe('selector de modelo de Parámetros', () => {
  it('un botón por grupo, con Remolques primero y los trabajos de tela al final', () => {
    const html = pintar('AMBAR BOX');
    expect(html).toContain('aria-label="Grupo de modelos"');
    const etiquetas = gruposDelSelector(grupos, true).map((g) => g.label);
    expect(etiquetas).toEqual(['Remolques', 'Cofre', 'Brazos invisibles', 'Trabajos de tela']);
    const posiciones = etiquetas.map((e) => html.indexOf('>' + e));
    expect(posiciones.every((p) => p > 0)).toBe(true);
    expect([...posiciones].sort((a, b) => a - b)).toEqual(posiciones);
  });

  it('enseña solo los modelos del grupo elegido y marca el abierto con aria-pressed', () => {
    const html = pintar('AGATA BOX');
    expect(html).toContain('aria-label="Modelos de Cofre"');
    expect(html).toContain('data-model="AMBAR BOX"');
    expect(html).toContain('data-model="AGATA BOX"');
    expect(html).not.toContain('data-model="ARZUA PRO"');
    expect(html).toMatch(/data-model="AGATA BOX"[^>]*aria-pressed="true"/);
    expect(html).toMatch(/data-model="AMBAR BOX"[^>]*aria-pressed="false"/);
    expect(html).toMatch(/data-group="COFRE"[^>]*aria-pressed="true"/);
  });

  it('Remolques: Generales y Clientes', () => {
    const html = pintar('REMOLQUES-CLIENTES');
    expect(html).toContain('aria-label="Modelos de Remolques"');
    expect(html).toMatch(/data-model="REMOLQUES"[^>]*aria-pressed="false"/);
    expect(html).toMatch(/data-model="REMOLQUES-CLIENTES"[^>]*aria-pressed="true"/);
    expect(html).toContain('Generales');
    expect(html).toContain('Clientes');
  });

  it('el código antiguo va en pequeño junto al nombre', () => {
    expect(pintar('ARZUA PRO')).toMatch(/<strong>Arzúa Pro<\/strong><small>[^<]+<\/small>/);
  });

  it('sin cambios pendientes no hay punto; con cambios, en el modelo y en su grupo', () => {
    expect(pintar('AMBAR BOX')).not.toContain('parameter-model-dot');
    const html = pintar('AMBAR BOX', { pendientes: ['AGATA BOX'] });
    expect(html.match(/parameter-model-dot/g)).toHaveLength(2);
    expect(html).toMatch(/data-model="AGATA BOX"[^>]*>(?:(?!<\/button>).)*parameter-model-dot/);
    expect(html).not.toMatch(/data-model="AMBAR BOX"[^>]*>(?:(?!<\/button>).)*parameter-model-dot/);
    expect(html).toContain('Cambios sin guardar');
  });

  it('el punto de las hojas de remolques sale de sus propios avisos', () => {
    const html = pintar('REMOLQUES', { remolquesPendientes: { clientes: true } });
    expect(html).toMatch(/data-model="REMOLQUES-CLIENTES"[^>]*>(?:(?!<\/button>).)*parameter-model-dot/);
    expect(html).not.toMatch(/data-model="REMOLQUES"[^>]*>(?:(?!<\/button>).)*parameter-model-dot/);
  });
});
