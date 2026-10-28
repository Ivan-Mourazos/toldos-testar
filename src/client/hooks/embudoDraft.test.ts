import { describe, expect, it } from 'vitest';
import { createAwning } from '../constants';
import { sanitizeAwning, switchAwningModel } from './useDraft';
import oficina from '../../domain/__fixtures__/embudos-oficina.json';

describe('Embudo en la tarjeta y los borradores', () => {
  it('ofrece cierre 3 y cinta 25 al elegir el modelo; pide las medidas del cliente', () => {
    const a = switchAwningModel(createAwning('FABRIC_ONLY'), 'EMBUDO');
    expect(a.workType).toBe('FABRIC_ONLY');
    expect(a.embudo).toMatchObject({ cierre: 3, anchoCinta: 25, alto: null, largoCinta: null });
  });
  it('conserva ambos contornos, bastillas y cinta tras guardar y reabrir', () => {
    const a = sanitizeAwning({ ...createAwning('FABRIC_ONLY'), model: 'EMBUDO', embudo: oficina.recto.entrada });
    const b = sanitizeAwning(JSON.parse(JSON.stringify(a)));
    expect(b.embudo).toEqual(a.embudo);
    expect(b.embudo).toMatchObject({ forma: 'RECTO', bastillaArriba: 10, bastillaAbajo: 10, largoCinta: 95 });
    expect(switchAwningModel(b, 'SOLAPAS').embudo).toBeUndefined();
  });
});
