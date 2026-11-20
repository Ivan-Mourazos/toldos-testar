import { describe, expect, it } from 'vitest';
import { ajustesDeBastillas, bordeOndulado, FORMAS_BAMBALINA, formaBambalina, normalizarBastillasBamba } from './bambalina.js';
import { normalizeOrder } from '../validation.js';

describe('Bastillas de la bambalina en el formulario (Iván, 20/11/2026)', () => {
  it('guarda solo los bordes válidos y nada si no se tocó ninguno', () => {
    expect(normalizarBastillasBamba({ izq: 0, der: '3', abajo: -1, arriba: '' })).toEqual({ izq: 0, der: 3 });
    expect(normalizarBastillasBamba({})).toBeUndefined();
    expect(normalizarBastillasBamba(null)).toBeUndefined();
    expect(ajustesDeBastillas({ izq: 0, arriba: 4 })).toEqual({ bambaPuntaIzqCm: 0, bambaArribaCm: 4 });
  });
  it('el pedido las conserva solo en la bambalina suelta y sin ellas no añade la clave', () => {
    const toldo = (model, extra = {}) => normalizeOrder({ awnings: [{ model, ...extra }] }).awnings[0];
    expect(toldo('BAMBALINA', { bambaBastillas: { abajo: 0 } }).bambaBastillas).toEqual({ abajo: 0 });
    expect('bambaBastillas' in toldo('BAMBALINA')).toBe(false);
    expect('bambaBastillas' in toldo('GALICIA', { bambaBastillas: { abajo: 0 } })).toBe(false);
  });
});
import { ONDAS_BAMBALINA } from './bambalinasDatos.js';
import { piezasToldo } from './despiece.js';

describe('Bambalinas con onda (plantilla BAMBALINAS.dwg)', () => {
  it('tiene las 15 formas de la plantilla; la EXTRASUAVE de la web es la SUPERSUAVE', () => {
    expect(FORMAS_BAMBALINA).toHaveLength(15);
    expect(formaBambalina('extrasuave')).toBe('SUPERSUAVE');
    expect(formaBambalina('NORMAL')).toBe('NORMAL');
    expect(formaBambalina('RECTA')).toBeNull();
    expect(formaBambalina('')).toBeNull();
  });

  it('la NORMAL tiene el paso del corte a máquina de AR2603936 (26,06) y 7,1 de fondo', () => {
    const d = ONDAS_BAMBALINA.NORMAL;
    expect(d.paso).toBeCloseTo(26.06, 1);
    expect(Math.max(...d.onda.map(([, y]) => y))).toBeCloseTo(7.1, 0);
  });

  it('como la bamba A de AR2603936 (402 de corte): 15 ondas centradas y recto 5,5 en cada punta', () => {
    const borde = bordeOndulado('NORMAL', 4020, 20);
    expect(borde[0]).toEqual([0, 0]);
    expect(borde[1][0]).toBeCloseTo(55.4, 0);
    expect(borde.at(-1)).toEqual([4020, 0]);
    expect(borde.at(-2)[0]).toBeCloseTo(4020 - 55.4, 0);
    // Cada onda vuelve abajo un paso más allá: 16 puntos a ras (las dos puntas y los 15 finales de onda, más el arranque).
    expect(borde.filter(([, v]) => v === 0).length).toBeGreaterThanOrEqual(17);
  });

  it('las puntas, a la altura donde arranca la onda (la CAMELOT 2, colgando por debajo)', () => {
    const borde = bordeOndulado('CAMELOT 2', 2000, 20);
    expect(borde[0][1]).toBeCloseTo(ONDAS_BAMBALINA['CAMELOT 2'].nivel * 10, 5);
    expect(Math.min(...borde.map(([, v]) => v))).toBeCloseTo(0, 0);
  });

  it('si no cabe ninguna onda entera, va recta a la altura de las puntas', () => {
    expect(bordeOndulado('ARABICA', 600, 20)).toEqual([[0, 0], [600, 0]]);
  });

  it('con onda, la tira no lleva bastilla abajo (va con remate, aparte): bamba + 3 y 1 cm libre bajo la onda; recta, bamba + 5', () => {
    const tira = (onda) => piezasToldo({ letra: 'A', frenteTela: 400, caidaTela: 300, bamba: 30, anchoRollo: 250, onda }).find((p) => p.nombre === 'A BAMBA');
    expect(tira(null).alto).toBe(350);
    expect(tira('NORMAL')).toMatchObject({ alto: 340, onda: 'NORMAL' });
  });
});

describe('Bastillas de la bambalina (Iván, 19/11/2026)', () => {
  const tira = (ajustes, extra = {}) => piezasToldo({ modelo: 'BAMBALINA', letra: 'A', frenteTela: 480, caidaTela: 35, bamba: 30, anchoRollo: 250, ajustes, ...extra })[0];
  it('sin tocar, lo de siempre: B.N(2) en cada punta, B.N(2) abajo y 3 arriba para la varilla', () => {
    expect(tira({})).toMatchObject({ largo: 4840, alto: 350, marcas: ['tira'] });
    expect(tira({ bambaPuntaIzqCm: 2, bambaPuntaDerCm: 2, bambaAbajoCm: 2, bambaArribaCm: 3 })).toEqual(tira({}));
  });
  it('cada borde con su bastilla o al corte (0)', () => {
    expect(tira({ bambaPuntaIzqCm: 0, bambaPuntaDerCm: 3, bambaAbajoCm: 0, bambaArribaCm: 4 })).toMatchObject({ largo: 4830, alto: 340, marcas: ['tira'] });
  });
  it('arriba al corte: sin varilla ni raya de rotulador', () => {
    expect(tira({ bambaArribaCm: 0 })).toMatchObject({ alto: 320, marcas: [] });
  });
  it('con onda no hay bastilla abajo y las ondas van entre las bastillas de las puntas', () => {
    const p = tira({ bambaPuntaIzqCm: 0, bambaPuntaDerCm: 5, bambaAbajoCm: 4 }, { onda: 'NORMAL' });
    expect(p).toMatchObject({ largo: 4850, alto: 330 + 10, margenOnda: [0, 50] });
    const borde = bordeOndulado('NORMAL', p.largo, p.margenOnda);
    const ondas = borde.filter(([, v]) => v < borde[0][1]);
    expect(Math.min(...ondas.map(([u]) => u))).toBeGreaterThanOrEqual(0);
    expect(Math.max(...ondas.map(([u]) => u))).toBeLessThanOrEqual(4800);
    expect(tira({}, { onda: 'NORMAL' }).margenOnda).toBeUndefined();
  });
  it('rechaza una bastilla negativa o que no es un número', () => {
    expect(() => tira({ bambaAbajoCm: -1 })).toThrow(/bambaAbajoCm/);
    expect(() => tira({ bambaPuntaIzqCm: Number.NaN })).toThrow(/bambaPuntaIzqCm/);
  });
});
