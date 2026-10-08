import { describe, expect, test } from 'vitest';
import { buildIrisSquaringView } from './irisSquaringView.js';

// CAD de referencia de Oficina Técnica (EJEMPLO.dwg).
const cad = {
  irisAssumeSquare: false, irisFrontTop: 355, irisFrontBottom: 350, irisExitLeft: 400, irisExitRight: 405,
  irisDiagonal1: 533.1, irisDiagonal2: 537, irisGuideType: 'ESTÁNDAR'
};

describe('dibujo del escuadrado del Iris', () => {
  test('sin las seis medidas no hay dibujo', () => {
    expect(buildIrisSquaringView({ irisAssumeSquare: false, irisFrontTop: 300, irisExitLeft: 250 })).toBeNull();
  });

  test('el CAD de referencia: toldo de frente menor y caída menor, cada guía por su altura', () => {
    const view = buildIrisSquaringView(cad);
    expect(view.toldo).toMatchObject({ width: 350.1, drop: 400 });
    expect(view.guides).toMatchObject({ left: 400, right: 405 });
    expect(view.slack).toMatchObject({ left: 2.6, right: 2.4 });
    expect(view.frontBottomFromDiagonals).toBeCloseTo(350, 0);
  });

  test('las esquinas reales: la de abajo a la izquierda entra 2,58 cm y la de abajo a la derecha, 2,37', () => {
    const { corners } = buildIrisSquaringView(cad);
    expect(corners.topLeft).toEqual({ x: 0, y: 0 });
    expect(corners.topRight).toEqual({ x: 355, y: 0 });
    expect(corners.bottomLeft.x).toBeCloseTo(2.58, 1);
    expect(corners.bottomLeft.y).toBeCloseTo(400, 1);
    expect(corners.bottomRight.x).toBeCloseTo(352.63, 1);
    expect(corners.bottomRight.y).toBeCloseTo(405, 1);
  });

  test('el dibujo exagera los desfases para que se vean, y dice cuánto', () => {
    const view = buildIrisSquaringView(cad);
    expect(view.exaggeration).toBeGreaterThan(1);
    const drawn = view.drawCorners;
    expect(drawn.bottomLeft.x).toBeCloseTo(2.58 * view.exaggeration, 0);
  });

  test('comprobaciones: el CAD pasa de 2,5 cm por guía, que es lo que absorbe la compensadora', () => {
    const { checks } = buildIrisSquaringView(cad);
    expect(checks.find((c) => c.id === 'cuadran')).toMatchObject({ level: 'ok' });
    expect(checks.find((c) => c.id === 'escuadra')).toMatchObject({ level: 'error' });
  });

  test('medidas que no cuadran: lo dice con el frente inferior que darían', () => {
    const view = buildIrisSquaringView({ ...cad, irisFrontBottom: 330 });
    const check = view.checks.find((c) => c.id === 'cuadran');
    expect(check.level).toBe('error');
    expect(check.text).toContain('350');
  });

  test('un hueco escuadrado no tiene desfases ni avisos', () => {
    const view = buildIrisSquaringView({ irisAssumeSquare: true, irisFrontTop: 253.5, irisExitLeft: 220 });
    expect(view.slack).toEqual({ left: 0, right: 0 });
    expect(view.toldo).toMatchObject({ width: 253.5, drop: 220 });
    expect(view.checks.every((c) => c.level === 'ok')).toBe(true);
  });
});
