import { describe, expect, test } from 'vitest';
import { cortinaMotorPower, isPvcFabric } from './curtainMotor.js';

const pvc = { code: 'NS86BLANP250', description: 'LONA NS86 2L 630 g/m² :BLANCO :250 AN (580)', material: 'PLASTICA (LONA)' };
const acrilica = { code: 'ACRILI2170P120', description: 'LONA ACRILICA MASACRIL 300 :NEGRO 2170 :120 AN', material: 'ACRÍLICAS' };

// Iván, 02/10/2026, a partir de los motores gastados en RPS (docs/modelos/cortina.md, Q-CO04).
describe('cortinaMotorPower', () => {
  test.each([
    ['por defecto, 15/17', { width: 318, projection: 140, curtainHasWindow: false, fabric: acrilica }, '15/17'],
    ['salida de 320 sin cristal, 15/17', { width: 720, projection: 320, curtainHasWindow: false, fabric: acrilica }, '15/17'],
    ['salida de más de 350, 35/17', { width: 420, projection: 351, curtainHasWindow: false, fabric: acrilica }, '35/17'],
    ['salida de 350 justos, 15/17', { width: 420, projection: 350, curtainHasWindow: false, fabric: acrilica }, '15/17'],
    ['más de 300 con PVC y ventana, 35/17', { width: 387, projection: 310, curtainHasWindow: true, fabric: pvc }, '35/17'],
    ['más de 300 con PVC sin ventana, 15/17', { width: 387, projection: 310, curtainHasWindow: false, fabric: pvc }, '15/17'],
    ['más de 300 con acrílica y ventana, 15/17', { width: 387, projection: 310, curtainHasWindow: true, fabric: acrilica }, '15/17'],
    ['300 justos con PVC y ventana, 15/17', { width: 410, projection: 300, curtainHasWindow: true, fabric: pvc }, '15/17'],
    ['frente de más de 800, 55/17', { width: 952, projection: 258, curtainHasWindow: false, fabric: acrilica }, '55/17'],
    ['frente de más de 800 aunque la salida pida 35/17, 55/17', { width: 900, projection: 400, curtainHasWindow: true, fabric: pvc }, '55/17'],
  ])('%s', (_caso, entrada, motor) => {
    expect(cortinaMotorPower(entrada)).toBe(motor);
  });
});

describe('isPvcFabric', () => {
  test('la subfamilia plástica de RPS es PVC', () => expect(isPvcFabric(pvc)).toBe(true));
  test('una acrílica no es PVC', () => expect(isPvcFabric(acrilica)).toBe(false));
  test('sin subfamilia, por el nombre de la lona', () => expect(isPvcFabric({ description: 'LONA G650 2L 650 :GRIS RAL 7037 :250AN' })).toBe(true));
  test('sin tela, no es PVC', () => expect(isPvcFabric(null)).toBe(false));
});
