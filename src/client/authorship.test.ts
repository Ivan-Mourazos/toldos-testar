import { describe, expect, it } from 'vitest';
import { stampAuthorship } from './authorship';

describe('stampAuthorship', () => {
  it('un pedido nuevo toma como autor a quien lo guarda', () => {
    expect(stampAuthorship({ technician: '', reviewer: '' }, 'IVÁN')).toEqual({ technician: 'IVÁN', reviewer: '' });
  });

  it('si corrige otro, el autor se mantiene y el revisor es quien corrige', () => {
    expect(stampAuthorship({ technician: 'IVÁN', reviewer: '' }, 'JAIME')).toEqual({ technician: 'IVÁN', reviewer: 'JAIME' });
  });

  it('si el autor vuelve a guardar, no se borra el revisor anterior', () => {
    expect(stampAuthorship({ technician: 'IVÁN', reviewer: 'JAIME' }, 'IVÁN')).toEqual({ technician: 'IVÁN', reviewer: 'JAIME' });
  });

  it('un revisor igual al autor no se conserva: nadie corrigió', () => {
    expect(stampAuthorship({ technician: 'IVÁN', reviewer: 'IVÁN' }, 'IVÁN')).toEqual({ technician: 'IVÁN', reviewer: '' });
  });

  it('sin usuario elegido deja el pedido como está', () => {
    expect(stampAuthorship({ technician: 'ÁNGEL', reviewer: '' }, '')).toEqual({ technician: 'ÁNGEL', reviewer: '' });
  });
});
