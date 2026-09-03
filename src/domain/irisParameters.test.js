import { describe, expect, test } from 'vitest';
import {
  defaultIrisParameters,
  getIrisDiscounts,
  getIrisFabricDropAllowance,
  getIrisLimits,
  irisConfigCode,
  irisHasBox,
  irisSeriesOf,
  normalizeIrisDevice,
  normalizeIrisGuideFixing,
  normalizeIrisGuideType,
  normalizeIrisParameters,
  normalizeIrisSubmodel,
  resolveIrisGlassSize
} from './irisParameters.js';

const config = (overrides) => ({
  submodel: 'IRIS 110 CON COFRE',
  guideType: 'ESTÁNDAR',
  device: 'MAQUINA',
  windBlock: false,
  ...overrides
});

describe('parámetros IRIS', () => {
  test('compone el código de cinco dígitos del libro maestro', () => {
    expect(irisConfigCode(config())).toBe('00000');
    expect(irisConfigCode(config({ submodel: 'IRIS 110 SIN COFRE', device: 'MOTOR' }))).toBe('01010');
    expect(irisConfigCode(config({ submodel: 'IRIS 130 CON COFRE', device: 'MOTOR', windBlock: true }))).toBe('10011');
    expect(irisConfigCode(config({ submodel: 'IRIS 150 CON COFRE', device: 'MOTOR' }))).toBe('20010');
    expect(irisConfigCode(config({ guideType: '' }))).toBe('');
  });

  test('conserva literalmente la tabla de corte de BAT', () => {
    const p = defaultIrisParameters;
    expect(getIrisDiscounts(p, config()))
      .toMatchObject({ fabric: 9, box: 1.4, roll: 15.8, loadBar: 13.2, ballast: 26.2, guideWall: 12, guideCeiling: 12.2 });
    expect(getIrisDiscounts(p, config({ device: 'MOTOR' }))).toMatchObject({ roll: 14.8 });
    expect(getIrisDiscounts(p, config({ guideType: 'PEQUEÑA', device: 'MOTOR' })))
      .toMatchObject({ fabric: 5.2, roll: 14.6, loadBar: 9.4, ballast: 22.4 });
    expect(getIrisDiscounts(p, config({ guideType: 'COMPENSADORA' })))
      .toMatchObject({
        fabric: 9.7, roll: 15.5, loadBar: 14.6, ballast: 27.6,
        compensatorWall: 11.2, compensatorCeiling: 11.4, zipWall: 12, zipCeiling: 12.2
      });
    expect(getIrisDiscounts(p, config({ guideType: 'COMPENSADORA', device: 'MOTOR' })))
      .toMatchObject({ fabric: 8.5, loadBar: 13.4, ballast: 26.4 });
    expect(getIrisDiscounts(p, config({ submodel: 'IRIS 110 SIN COFRE' })))
      .toMatchObject({ fabric: 9, roll: 15.8, guideWall: 11.3, guideCeiling: 12.8 });
    expect(getIrisDiscounts(p, config({ submodel: 'IRIS 130 CON COFRE' })))
      .toMatchObject({ guideWall: 13.7, guideCeiling: 13.9, zipWall: 13.7, zipCeiling: 13.9 });
    expect(getIrisDiscounts(p, config({ submodel: 'IRIS 150 CON COFRE', device: 'MOTOR' })))
      .toMatchObject({ fabric: 9, box: 0.6, roll: 16.8, loadBar: 13.2, ballast: 27.8, guideWall: 15.5, guideCeiling: 15.5 });
  });

  test('aplica el Secur Wind Block System', () => {
    const p = defaultIrisParameters;
    expect(getIrisDiscounts(p, config({ guideType: 'COMPENSADORA', windBlock: true })))
      .toMatchObject({ fabric: 10.6, ballast: 44.6, zipWall: 18.1, zipCeiling: 18.3, windBlockTerminal: 14.8 });
    expect(getIrisDiscounts(p, config({ submodel: 'IRIS 130 CON COFRE', device: 'MOTOR', windBlock: true })))
      .toMatchObject({ fabric: 9.4, ballast: 33.2, zipWall: 19.8, zipCeiling: 20, windBlockTerminal: 13.4 });
  });

  test('no devuelve descuentos para las combinaciones que el libro maestro descarta', () => {
    const p = defaultIrisParameters;
    // 110 con guía pequeña a máquina: el fabricante deja vacía la fila de molinete 9:1.
    expect(getIrisDiscounts(p, config({ guideType: 'PEQUEÑA' }))).toBeNull();
    // 130 con guía compensadora: columna marcada "Sen uso" y sin valores.
    expect(getIrisDiscounts(p, config({ submodel: 'IRIS 130 CON COFRE', guideType: 'COMPENSADORA', device: 'MOTOR' }))).toBeNull();
    // 130 sin cofre a motor: no hay ni un pedido conservado.
    expect(getIrisDiscounts(p, config({ submodel: 'IRIS 130 SIN COFRE', device: 'MOTOR' }))).toBeNull();
  });

  test('el 130 sin cofre a máquina usa el 15,5 de los dos pedidos conservados', () => {
    expect(getIrisDiscounts(defaultIrisParameters, config({ submodel: 'IRIS 130 SIN COFRE' })))
      .toMatchObject({ fabric: 9, roll: 15.8, loadBar: 13.2, ballast: 26.2, guideWall: 15.5, guideCeiling: 15.5, unverified: true });
  });

  test('normaliza lo que escriben los técnicos', () => {
    expect(normalizeIrisSubmodel('iris 110 con cofre')).toBe('IRIS 110 CON COFRE');
    expect(normalizeIrisSubmodel('screeny 150')).toBe('');
    expect(normalizeIrisGuideType('estandar')).toBe('ESTÁNDAR');
    expect(normalizeIrisGuideType('guia compensadora')).toBe('COMPENSADORA');
    expect(normalizeIrisGuideType('pequena')).toBe('PEQUEÑA');
    expect(normalizeIrisGuideType('pequeña')).toBe('PEQUEÑA');
    expect(normalizeIrisGuideType('ESTÁNDAR')).toBe('ESTÁNDAR');
    expect(normalizeIrisGuideFixing('nicho')).toBe('PARED');
    expect(normalizeIrisGuideFixing('TECHO')).toBe('TECHO');
    expect(normalizeIrisDevice('máquina')).toBe('MAQUINA');
    expect(normalizeIrisDevice('MOTOR')).toBe('MOTOR');
    expect(irisSeriesOf('IRIS 130 CON COFRE')).toBe('130');
    expect(irisHasBox('IRIS 110 SIN COFRE')).toBe(false);
    expect(irisHasBox('IRIS 110 CON COFRE')).toBe(true);
  });

  test('límites de fabricación de los manuales de ensamblaje', () => {
    expect(getIrisLimits('110')).toEqual({ maxWidth: 400, maxDrop: 300, minWidth: 82.5, minDrop: 60 });
    expect(getIrisLimits('130')).toEqual({ maxWidth: 500, maxDrop: 500, minWidth: 83, minDrop: 60 });
    expect(getIrisLimits('150')).toEqual({ maxWidth: 800, maxDrop: 500, minWidth: 87.5, minDrop: 60 });
    expect(getIrisLimits('')).toBeNull();
  });

  test('elige la primera medida de cristal por encima del frente de tela', () => {
    expect(resolveIrisGlassSize(180)).toBe(200);
    expect(resolveIrisGlassSize(200)).toBe(250);
    expect(resolveIrisGlassSize(412.5)).toBe(450);
    expect(resolveIrisGlassSize(750)).toBe(0);
  });

  test('rellena parámetros parciales sin perder ajustes válidos', () => {
    const normalized = normalizeIrisParameters({
      fabricDropAllowanceCm: { 110: { MOTOR: 32 } },
      compensatorMaxCm: -5
    });

    expect(normalized.fabricDropAllowanceCm['110']).toEqual({ MAQUINA: 40, MOTOR: 32 });
    expect(normalized.fabricDropAllowanceCm['150']).toEqual({ MAQUINA: 49.8, MOTOR: 49.8 });
    expect(normalized.compensatorMaxCm).toBe(3);
    expect(normalized.glassFabricSavingM).toBe(1.4);
    expect(getIrisFabricDropAllowance(normalized, '110', 'MOTOR')).toBe(32);
    expect(getIrisFabricDropAllowance(normalized, '110', 'MAQUINA')).toBe(40);
  });
});
