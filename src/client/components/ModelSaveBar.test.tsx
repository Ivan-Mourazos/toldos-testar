import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { normalizeRuleParameters } from '../../domain/ruleParameters.js';
import { COMMON_FABRIC_SCOPE } from '../../domain/parameterScopes.js';
import type { EstadoParametros } from '../parametrosToldos';
import type { RuleParameters } from '../types';
import { ModelSaveBar, nombreAmbito } from './ModelSaveBar';

const guardados = normalizeRuleParameters() as RuleParameters;
const estado = (draft: RuleParameters | null): EstadoParametros => ({
  shared: { version: 3, parameters: guardados, modelos: { ENROLLABLE: { version: 2, updatedAt: '', updatedBy: 'IVÁN', motivo: '' } } },
  draft, order: null, saving: false, modeloVisible: 'ENROLLABLE'
});
const ambitos = ['ENROLLABLE', COMMON_FABRIC_SCOPE];

describe('barra de cada modelo', () => {
  it('nombres de los modelos y de lo común', () => {
    expect(nombreAmbito('ENROLLABLE')).toBe('Enrollable');
    expect(nombreAmbito(COMMON_FABRIC_SCOPE)).toBe('Trabajos de tela (comunes)');
  });

  it('sin cambios: guardado, con su versión', () => {
    const html = renderToStaticMarkup(<ModelSaveBar ambitos={ambitos} estado={estado(null)} />);
    expect(html).toContain('Modelo guardado');
    expect(html).toContain('Versión 2');
  });

  it('con cambios aquí y en otro modelo: dice cuáles, y sin «Soy» no deja guardar', () => {
    const draft = { ...guardados, fabricJobs: { ...guardados.fabricJobs, valanceExtraCm: 8 }, galicia: { ...guardados.galicia, fabricDropAllowanceCm: 60 } } as RuleParameters;
    const html = renderToStaticMarkup(<ModelSaveBar ambitos={ambitos} estado={estado(draft)} />);
    expect(html).toContain('Cambios sin guardar en Trabajos de tela (comunes)');
    expect(html).toContain('También sin guardar: Galicia');
    expect(html).toContain('Elige «Soy» arriba para guardar.');
  });
});
