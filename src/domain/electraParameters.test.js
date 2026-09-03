import { describe, expect, test } from 'vitest';
import {
  defaultElectraParameters,
  electraHasCofre,
  electraHasGuide,
  getElectraMotor,
  normalizeElectraDevice,
  normalizeElectraMotor,
  normalizeElectraParameters,
  normalizeElectraSupport,
  normalizeElectraVariant
} from './electraParameters.js';

describe('parámetros ELECTRA / Elit Vertical', () => {
  test('conserva literalmente la matriz de descuentos de la guía de fabricación', () => {
    expect(defaultElectraParameters.supportDiscounts).toEqual({
      'SOPORTE ELIT VERTICAL': {
        'MAQ. INTERIOR': { fabric: 10, roll: 8, loadBar: 9.5, guide: 14 },
        'MAQ. EXTERIOR': { fabric: 10, roll: 8, loadBar: 9.5, guide: 14 },
        MOTOR: { fabric: 10, roll: 8, loadBar: 9.5, guide: 14 }
      },
      'SOPORTES ALMAGRO': {
        'MAQ. INTERIOR': { fabric: 10, roll: 9, loadBar: 9.5, guide: 14.5 },
        'MAQ. EXTERIOR': { fabric: 10, roll: 9, loadBar: 9.5, guide: 14.5 },
        MOTOR: { fabric: 9.5, roll: 8.5, loadBar: 9, guide: 14.5 }
      },
      'UNIVERSAL 3 AGUJEROS': {
        'MAQ. INTERIOR': { fabric: 12, roll: 11, loadBar: 11, guide: 14 },
        'MAQ. EXTERIOR': { fabric: 12.5, roll: 11, loadBar: 11, guide: 14 },
        MOTOR: { fabric: 11, roll: 10, loadBar: 10, guide: 14 }
      }
    });
  });

  test('normaliza nombres históricos y variantes escritas sin separador', () => {
    expect(normalizeElectraSupport('soporte elit vertical')).toBe('SOPORTE ELIT VERTICAL');
    expect(normalizeElectraSupport('Almagro')).toBe('SOPORTES ALMAGRO');
    expect(normalizeElectraSupport('universal de 3 agujeros')).toBe('UNIVERSAL 3 AGUJEROS');
    expect(normalizeElectraSupport('soporte Maxiscreem Box')).toBe('SOPORTE MAXISCREEM BOX');
    expect(normalizeElectraDevice('máquina exterior')).toBe('MAQ. EXTERIOR');
    expect(normalizeElectraVariant('sin cofre con guia')).toBe('SIN COFRE / CON GUÍA');
    expect(electraHasCofre('con cofre sin guía')).toBe(true);
    expect(electraHasGuide('sin cofre con guía')).toBe(true);
    expect(normalizeElectraMotor('METEOR20//17')).toBe('METEOR 20/17');
    expect(getElectraMotor('Meteor 20/17')).toMatchObject({ code: 'METEOR20//17' });
  });

  test('rellena parámetros parciales sin perder ajustes válidos', () => {
    const normalized = normalizeElectraParameters({
      standardMaxWidth: 480,
      standardMaxDrop: -1,
      fabricDropAllowanceCm: { MOTOR: 42 },
      supportDiscounts: {
        'SOPORTES ALMAGRO': {
          MOTOR: { fabric: 8.5 }
        }
      },
      rollStockLengths: [700, 500, 700, 0]
    });

    expect(normalized).toMatchObject({
      standardMaxWidth: 480,
      standardMaxDrop: 300,
      fabricDropAllowanceCm: {
        'MAQ. INTERIOR': 45,
        'MAQ. EXTERIOR': 45,
        MOTOR: 42
      },
      rollStockLengths: [500, 700]
    });
    expect(normalized.supportDiscounts['SOPORTES ALMAGRO'].MOTOR).toEqual({
      fabric: 8.5,
      roll: 8.5,
      loadBar: 9,
      guide: 14.5
    });
  });
});
