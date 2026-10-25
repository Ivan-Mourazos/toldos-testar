import { describe, expect, it } from 'vitest';
import { cintasSimetricas, leerCadena } from './cadenaDibujo';

describe('leerCadena', () => {
  it('lee la fila de la hoja de Portanova en mm, de abajo arriba (AR2605035)', () => {
    expect(leerCadena('310 580 550 580 550 580 700', 0)).toEqual({ pie: 31, pasos: [58, 55, 58, 55, 58], cabecera: 70, enMm: true });
  });
  it('si la suma cuadra con el alto en cm, la toma en cm; admite ; y coma decimal', () => {
    expect(leerCadena('31; 58; 55,5; 70', 214.5)).toEqual({ pie: 31, pasos: [58, 55.5], cabecera: 70, enMm: false });
    expect(leerCadena('310 580 550 700', 214)).toMatchObject({ enMm: true, pie: 31 });
  });
  it('rechaza lo que no son cotas', () => {
    expect(leerCadena('310', 0)).toBeNull();
    expect(leerCadena('310 abc 700', 0)).toBeNull();
    expect(leerCadena('310 0 700', 0)).toBeNull();
  });
});

describe('cintasSimetricas', () => {
  it('completa la derecha en simétrico y no repite la del centro (432 cm: 44 y 210 → 44, 210, 376)', () => {
    expect(cintasSimetricas([44, 210], 432)).toEqual([44, 210, 376]);
    expect(cintasSimetricas([44], 432)).toEqual([44, 376]);
  });
});
