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
    // Guía de OT (Iván, 08/10/2026): «la medida del frente será la menor y la salida la mayor».
    expect(result.dropOpening).toBeCloseTo(404.99, 2);
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

  // Iván, 08/10/2026 (AR2604748): las seis medidas tienen que cuadrar. Con el frente superior,
  // las salidas y las diagonales sale el frente inferior; se compara con el medido.
  test('el frente inferior que dan las diagonales cuadra con el medido en el CAD de referencia', () => {
    const result = squareIrisOpening({ frontTop: 355, frontBottom: 350, exitLeft: 400, exitRight: 405, diagonal1: 533.1, diagonal2: 537 });
    expect(result.frontBottomFromDiagonals).toBeCloseTo(350.05, 1);
  });

  test('unas diagonales exageradas dan un frente inferior que no es el medido', () => {
    const result = squareIrisOpening({ frontTop: 253.5, frontBottom: 253.5, exitLeft: 220, exitRight: 220, diagonal1: 400, diagonal2: 300 });
    expect(Math.abs(result.frontBottomFromDiagonals - 253.5)).toBeGreaterThan(10);
  });

  test('escuadrado por defecto, el frente inferior cuadra', () => {
    const result = squareIrisOpening({ frontTop: 253.5, exitLeft: 220, assumeSquare: true });
    expect(result.frontBottomFromDiagonals).toBeCloseTo(253.5, 5);
  });

  test('rechaza medidas ausentes o negativas', () => {
    expect(squareIrisOpening({ frontTop: 0, exitLeft: 250, assumeSquare: true }).valid).toBe(false);
    expect(squareIrisOpening({ frontTop: 300, exitLeft: -1, assumeSquare: true }).valid).toBe(false);
    expect(squareIrisOpening({ frontTop: 300, exitLeft: 250 }).valid).toBe(false);
  });
});
