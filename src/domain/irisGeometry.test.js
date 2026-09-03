import { describe, expect, test } from 'vitest';
import { squareIrisOpening } from './irisGeometry.js';

describe('escuadrado del hueco IRIS', () => {
  test('reproduce el CAD de referencia de la carpeta de planteamientos', () => {
    const result = squareIrisOpening({
      frontTop: 355,
      frontBottom: 350,
      exitLeft: 400,
      exitRight: 405,
      diagonal1: 533.1,
      diagonal2: 537
    });

    expect(result.valid).toBe(true);
    expect(result.heightLeft).toBeCloseTo(399.99, 2);
    expect(result.heightRight).toBeCloseTo(404.99, 2);
    expect(result.slackLeft).toBeCloseTo(2.58, 2);
    expect(result.slackRight).toBeCloseTo(2.37, 2);
    expect(result.frontToldo).toBeCloseTo(350.06, 2);
    expect(result.dropOpening).toBeCloseTo(399.99, 2);
  });

  test('la diagonal 1 va con la salida izquierda: cruzarlas cambia el resultado', () => {
    const crossed = squareIrisOpening({
      frontTop: 355,
      frontBottom: 350,
      exitLeft: 400,
      exitRight: 405,
      diagonal1: 537,
      diagonal2: 533.1
    });

    expect(crossed.valid).toBe(true);
    expect(crossed.frontToldo).toBeCloseTo(346.75, 2);
  });

  test('con el hueco declarado escuadrado deriva las medidas que faltan', () => {
    const result = squareIrisOpening({
      frontTop: 300,
      exitLeft: 250,
      assumeSquare: true
    });

    expect(result.valid).toBe(true);
    expect(result.frontToldo).toBeCloseTo(300, 6);
    expect(result.dropOpening).toBeCloseTo(250, 6);
    expect(result.heightLeft).toBeCloseTo(250, 6);
    expect(result.heightRight).toBeCloseTo(250, 6);
    expect(result.frontBottom).toBeCloseTo(300, 6);
  });

  test('rechaza medidas que no forman triángulo', () => {
    const result = squareIrisOpening({
      frontTop: 355,
      frontBottom: 350,
      exitLeft: 400,
      exitRight: 405,
      diagonal1: 10,
      diagonal2: 537
    });

    expect(result.valid).toBe(false);
    expect(result.error).toContain('no forman un triángulo');
  });

  test('rechaza medidas ausentes o negativas', () => {
    expect(squareIrisOpening({ frontTop: 0, exitLeft: 250, assumeSquare: true }).valid).toBe(false);
    expect(squareIrisOpening({ frontTop: 300, exitLeft: -1, assumeSquare: true }).valid).toBe(false);
    expect(squareIrisOpening({ frontTop: 300, exitLeft: 250 }).valid).toBe(false);
  });
});
