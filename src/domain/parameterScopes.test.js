import { describe, expect, it } from 'vitest';
import { applyScope, changedScopes, COMMON_FABRIC_SCOPE, pageScopes, parameterScopes, rebaseDraft, scopeParts } from './parameterScopes.js';
import { modelNames } from './modelBehavior.js';
import { normalizeRuleParameters } from './ruleParameters.js';

const image = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=';
const base = () => normalizeRuleParameters();
const conDibujo = (p, model) => ({ ...p, drawings: { byModel: { ...p.drawings.byModel, [model]: [{ id: 'general', name: 'General', usage: 'auto', enabled: true, image, conditions: [] }] } } });

describe('ámbitos de los parámetros de toldos', () => {
  it('un ámbito por modelo y otro para lo común de los trabajos de tela', () => {
    expect(parameterScopes).toEqual([...modelNames, COMMON_FABRIC_SCOPE]);
    expect(pageScopes('enrollable')).toEqual(['ENROLLABLE', COMMON_FABRIC_SCOPE]);
    expect(pageScopes('GALICIA')).toEqual(['GALICIA']);
  });

  it('cada cambio cae en su modelo: apartado, margen de trabajo de tela, comunes y dibujos', () => {
    const p = base();
    expect(changedScopes(p, { ...p, cortina: { ...p.cortina, fabricDropAllowanceCm: 50 } })).toEqual(['CORTINA']);
    expect(changedScopes(p, { ...p, fabricJobs: { ...p.fabricJobs, dropAllowanceByModel: { ...p.fabricJobs.dropAllowanceByModel, ENROLLABLE: 30 } } })).toEqual(['ENROLLABLE']);
    expect(changedScopes(p, { ...p, fabricJobs: { ...p.fabricJobs, valanceExtraCm: 8 } })).toEqual([COMMON_FABRIC_SCOPE]);
    expect(changedScopes(p, conDibujo(p, 'HERA'))).toEqual(['HERA']);
    expect(changedScopes(p, base())).toEqual([]);
  });

  it('aplicar un ámbito copia solo lo suyo', () => {
    const p = base();
    const otro = conDibujo({ ...p, cortina: { ...p.cortina, fabricDropAllowanceCm: 50 }, galicia: { ...p.galicia, fabricDropAllowanceCm: 60 } }, 'CORTINA');
    const next = applyScope(p, otro, 'CORTINA');
    expect(next.cortina.fabricDropAllowanceCm).toBe(50);
    expect(next.galicia).toEqual(p.galicia);
    expect(next.drawings.byModel.CORTINA).toHaveLength(1);
    expect(applyScope(p, otro, 'CORTINA', { includeDrawings: false }).drawings.byModel.CORTINA).toBeUndefined();
    expect(applyScope(otro, p, 'CORTINA').drawings.byModel.CORTINA).toBeUndefined();
  });

  it('los comunes de tela no tocan el margen de cada trabajo, y al revés', () => {
    const p = base();
    const otro = { ...p, fabricJobs: { ...p.fabricJobs, valanceExtraCm: 8, dropAllowanceByModel: { ...p.fabricJobs.dropAllowanceByModel, ENROLLABLE: 30 } } };
    const comunes = applyScope(p, otro, COMMON_FABRIC_SCOPE);
    expect(comunes.fabricJobs.valanceExtraCm).toBe(8);
    expect(scopeParts(comunes, 'ENROLLABLE').values).toBe(25);
    const enrollable = applyScope(p, otro, 'ENROLLABLE');
    expect(enrollable.fabricJobs.dropAllowanceByModel.ENROLLABLE).toBe(30);
    expect(enrollable.fabricJobs.valanceExtraCm).toBe(5);
  });

  it('rebasar el borrador conserva lo pendiente de otros modelos sobre lo guardado nuevo', () => {
    const antes = base();
    const borrador = { ...antes, cortina: { ...antes.cortina, fabricDropAllowanceCm: 50 }, galicia: { ...antes.galicia, fabricDropAllowanceCm: 60 } };
    const guardado = { ...antes, cortina: { ...antes.cortina, fabricDropAllowanceCm: 50 } };
    expect(changedScopes(guardado, rebaseDraft(antes, guardado, borrador))).toEqual(['GALICIA']);
    expect(rebaseDraft(antes, borrador, borrador)).toBeNull();
    expect(rebaseDraft(antes, guardado, null)).toBeNull();
  });
});
