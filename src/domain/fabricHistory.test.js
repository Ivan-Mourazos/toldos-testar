import { describe, expect, it } from 'vitest';
import { buildFabricHistory, preferredFabricCode } from './fabricHistory.js';

const NEGRO = 'FABRICADO EN TEJIDO ACRILICO, TINTADO MASA, COLOR NEGRO.';
const BOTELLA = 'FABRICADOS EN LONA ACRILICA COLOR VERDE BOTELLA.';

describe('buildFabricHistory · qué lona se usó antes con la misma frase (informe tela-0930)', () => {
  it('cuenta una vez por OF la lona de más cantidad, agrupada por la pista del texto', () => {
    const history = buildFabricHistory([
      { of: '1', comment: NEGRO, notes: '', code: 'ACRILI2170P120', description: 'ACR NEGRO', quantity: 10 },
      // La bamba de la misma OF, con menos metros: no cuenta.
      { of: '1', comment: NEGRO, notes: '', code: 'ACRILI2018P120', description: 'ACR AZUL', quantity: 2 },
      { of: '2', comment: NEGRO, notes: '', code: 'ACRILI2170P120', description: 'ACR NEGRO', quantity: 8 },
      { of: '3', comment: '', notes: NEGRO, code: 'ACRILI2171P120', description: 'ACR NEGRO N', quantity: 8 },
      { of: '4', comment: BOTELLA, notes: '', code: 'ACRILI2245P120', description: 'MASACRIL :BOTELLA 2245', quantity: 12 }
    ]);
    expect(history.get('ACR NEGRO')).toEqual(new Map([['ACRILI2170P120', 2], ['ACRILI2171P120', 1]]));
    expect(preferredFabricCode(history, 'ACR NEGRO')).toBe('ACRILI2170P120');
    expect(preferredFabricCode(history, 'ACR VERDE BOTELLA')).toBe('ACRILI2245P120');
  });

  it('no aprende de los sobrantes (RESTO…) ni de líneas sin frase de tela', () => {
    const history = buildFabricHistory([
      { of: '1', comment: NEGRO, notes: '', code: 'RESTOLONA01', description: 'RESTO LONA OPACA', quantity: 30 },
      { of: '2', comment: 'REPOSICION DE TUBO DE CARGA', notes: '', code: 'ACRILI2170P120', description: 'ACR NEGRO', quantity: 5 }
    ]);
    expect(history.size).toBe(0);
    expect(preferredFabricCode(history, 'ACR NEGRO')).toBeNull();
  });

  it('a igualdad de OF, la de código menor (resultado estable)', () => {
    const history = buildFabricHistory([
      { of: '1', comment: NEGRO, notes: '', code: 'ACRILI2171P120', description: 'x', quantity: 1 },
      { of: '2', comment: NEGRO, notes: '', code: 'ACRILI2170P120', description: 'x', quantity: 1 }
    ]);
    expect(preferredFabricCode(history, 'ACR NEGRO')).toBe('ACRILI2170P120');
  });
});
