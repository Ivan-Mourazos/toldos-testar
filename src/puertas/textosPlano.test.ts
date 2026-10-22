import { describe, expect, it } from 'vitest';
import { alturasTubos, huecosEntrada, nuevaPuerta } from './calcular.ts';
import { colocarTextosPuerta, solapaCaja, type CajaTexto } from './textosPlano.ts';

describe('colocarTextosPuerta', () => {
  it('encaja los textos de taller en enrollables (AR2604638 y AR2604725) sin solapar tubos, cristal ni textos', () => {
    const p4638 = {
      ...nuevaPuerta('PUERTAENR'),
      frente: 172,
      alto: 314,
      of: '0232309',
      enrollable: { T: 123, D: 60, margen: 6, empates: [] },
      entradas: [{ altura: 60, diametro: 30 as const, largo: 172, alto: 8, huecos: [] }],
    };
    const textos4638 = colocarTextosPuerta(p4638);
    expect(textos4638.length).toBeGreaterThanOrEqual(7);
    expect(textos4638.some(t => t.lineas.join(' ').includes('0232309'))).toBe(true);
    expect(textos4638.some(t => t.lineas.join(' ').includes('3 CM (HUECOS)'))).toBe(true);
    expect(textos4638.some(t => t.lineas.join(' ').startsWith('CRISTAL'))).toBe(false);
    for (let i = 0; i < textos4638.length; i++) {
      for (let j = i + 1; j < textos4638.length; j++) {
        expect(solapaCaja(textos4638[i], textos4638[j])).toBe(false);
      }
    }

    const p4725 = {
      ...nuevaPuerta('PUERTAENR'),
      frente: 474,
      alto: 430,
      of: '0232504',
      enrollable: { T: 239, D: 60, margen: 11, empates: [] },
      entradas: [
        { altura: 60, diametro: 30 as const, largo: 474, alto: 8, huecos: [] },
        { altura: 241, diametro: 30 as const, largo: 474, alto: 8, huecos: [] },
      ],
    };
    const textos4725 = colocarTextosPuerta(p4725);
    expect(textos4725.some(t => t.lineas[0] === 'AL CORTE' && t.giro === -90)).toBe(true);
    const bandaTuboSup: CajaTexto = { x: 0, y: 430 - 241 - 3.75, ancho: 474, alto: 7.5 };
    for (const t of textos4725) {
      expect(solapaCaja(t, bandaTuboSup)).toBe(false);
    }
  });

  it('encaja los textos de apilable con ventanas y bolsillo sin solaparse', () => {
    const base = {
      ...nuevaPuerta('PUERTAPLE'),
      frente: 535,
      alto: 465,
      of: '0232656',
      bolsillo: true,
      apilable: { pie: 82.5, pasos: [75, 75, 75, 75], cabecera: 82.5, bolsillo: 24, saco: 80 as const, doble: false, empates: null },
      ventanas: [{ x: 75, y: 165, ancho: 385, alto: 55, radio: 2, radioCristal: 4 }],
    };
    const p = {
      ...base,
      entradas: alturasTubos(base).map(altura => ({
        altura,
        diametro: 30 as const,
        largo: 535,
        alto: 12,
        huecos: huecosEntrada(535, 30, [95, 428]),
      })),
    };
    const textos = colocarTextosPuerta(p);
    expect(textos.some(t => t.lineas.join(' ').includes('CORTES EN ENTRADA DE TUBO'))).toBe(true);
    expect(textos.some(t => t.lineas.join(' ').includes('BOLSILLO'))).toBe(true);
    const cajaVentana: CajaTexto = { x: 75, y: 465 - 165 - 55, ancho: 385, alto: 55 };
    for (const t of textos) {
      expect(solapaCaja(t, cajaVentana)).toBe(false);
    }
    for (let i = 0; i < textos.length; i++) {
      for (let j = i + 1; j < textos.length; j++) {
        expect(solapaCaja(textos[i], textos[j])).toBe(false);
      }
    }
  });

  it('saca fuera con línea de llamada cuando una ventana ocupa todo el hueco libre', () => {
    const p = {
      ...nuevaPuerta('PUERTAUTO'),
      frente: 80,
      alto: 120,
      of: '0232578',
      ventanas: [{ x: 2, y: 14, ancho: 76, alto: 88, radio: 2, radioCristal: 4 }],
    };
    const textos = colocarTextosPuerta(p);
    expect(textos.some(t => t.guia && t.x < 0)).toBe(true);
  });
});
