import { describe, expect, it } from 'vitest';
import { CONFIG_CODEX, construir, revisarCiclo, separacionFinal, diametroFinal } from './geometria.ts';

// Valores de las simulaciones HTML de Codex (18/11/2026), tubo de enrolle Ø88,9, tubos Ø42, lona 0,8.
describe('geometría del enrolle: contraste con Codex', () => {
  it('4200 con [1470, 2714, 4200]: lo más justo, T1–T2 a 79,5 mm', () => {
    const p = revisarCiclo(construir(CONFIG_CODEX, [1470, 2714, 4200]));
    expect(p[0]).toMatchObject({ i: 0, j: 1 });
    expect(p[0].separacion).toBeCloseTo(79.513, 1);
    expect(p[0].donde).toBeCloseTo(2601.2, 0);
    const resto = Object.fromEntries(p.map(x => [`${x.i}${x.j}`, x.separacion]));
    expect(resto['12']).toBeCloseTo(83.945, 1);
    expect(resto['02']).toBeCloseTo(84.203, 1);
  });
  it('3660 con [1138, 2471, 3660]: lo más justo, T1–T3 a 80 mm', () => {
    const p = revisarCiclo(construir(CONFIG_CODEX, [1138, 2471, 3660]));
    expect(p[0]).toMatchObject({ i: 0, j: 2 });
    expect(p[0].separacion).toBeCloseTo(79.978, 1);
    expect(p[0].donde).toBeCloseTo(3547.7, 0);
  });
  it('tramos iguales: casi se tocan (6 mm en 4200, 15,5 mm en 3660)', () => {
    expect(revisarCiclo(construir(CONFIG_CODEX, [1400, 2800, 4200]))[0].separacion).toBeCloseTo(5.959, 1);
    expect(revisarCiclo(construir(CONFIG_CODEX, [1220, 2440, 3660]))[0].separacion).toBeCloseTo(15.536, 1);
  });
  it('vale para cualquier número de tubos y da el diámetro final', () => {
    const m = construir(CONFIG_CODEX, [1008, 1816, 2869, 3826, 4782]);
    expect(m.tubos).toHaveLength(5);
    expect(revisarCiclo(m)).toHaveLength(10);
    const pareja = separacionFinal(m);
    expect(pareja).toMatchObject({ i: 2, j: 3 });
    expect(pareja.separacion).toBeCloseTo(1.954, 1);
    expect(diametroFinal(m)).toBeGreaterThan(88.9 + 2 * 42);
  });
  it('con saco: el largo enrollado pasa del último tubo y el rollo sigue girando', () => {
    const corto = construir(CONFIG_CODEX, [1100, 2200, 3300]);
    const largo = construir(CONFIG_CODEX, [1100, 2200, 3300], 4400);
    expect(largo.largo).toBe(4400);
    expect(diametroFinal(largo)).toBeGreaterThan(diametroFinal(corto));
  });
});
