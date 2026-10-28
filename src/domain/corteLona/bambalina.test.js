import { describe, expect, it } from 'vitest';
import { bordeOndulado, FORMAS_BAMBALINA, formaBambalina } from './bambalina.js';
import { ONDAS_BAMBALINA } from './bambalinasDatos.js';

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
});
