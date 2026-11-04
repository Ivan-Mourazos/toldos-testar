import { describe, expect, it } from 'vitest';
import { calcularMedidasCal, MEDIDAS_CAL_5319, MEDIDAS_CAL_GEMELO } from './medidas.ts';

describe('Caballos por medidas de Cal', () => {
  it('conserva recto y diagonal con el centímetro de lona hecha del gemelo', () => {
    const r = calcularMedidasCal(MEDIDAS_CAL_GEMELO);
    expect(r.proyeccion).toBeCloseTo(636.867, 3);
    expect(r.largoHecho).toBeCloseTo(2596.867, 3);
    expect(r.piezas.map(p => p.nombre)).toEqual(['Cuerpo', 'Morro', 'Frente', 'Tapa ventana']);
    expect(r.ventana).toEqual({ ancho: 50, alto: 35 });
    expect(r.piezas[0].contorno[1][0] - r.piezas[0].contorno[0][0]).toBeCloseTo(2020);
  });

  it('usa el exterior R9,5 en el 5319 sin forzar los 300 de largo', () => {
    const r = calcularMedidasCal(MEDIDAS_CAL_5319);
    expect(r.medidas.radioA).toBe(95);
    expect(r.medidas.radioB).toBe(95);
    expect(r.medidas.altoA + r.medidas.aguasA).toBe(670);
    expect(r.medidas.altoB + r.medidas.aguasB).toBe(570);
    expect(r.largoHecho).toBeCloseTo(2993.176, 3);
    expect(r.ventana).toEqual({ ancho: 50, alto: 35 });
    expect(r.piezas[0].ollaos).toHaveLength(12);
    expect(r.piezas[0].ollaos.slice(0, 6).map(p => p.c[0])).toEqual([300, 550, 940, 1260, 1570, 1930]);
    expect(r.pendientes.join(' ')).toMatch(/puerta MFI/i);
  });

  it('reduce la ventana al espacio disponible y mantiene la tapa con 3 cm más', () => {
    const r = calcularMedidasCal({ ...MEDIDAS_CAL_GEMELO, frente: 40, altoFrente: 35, aguasFrente: 0 });
    expect(r.ventana).toEqual({ ancho: 41, alto: 22 });
    const tapa = r.piezas.at(-1)!;
    expect(tapa.contorno[2]).toEqual([440, 250]);
  });

  it('rechaza datos incompletos, diagonales imposibles y ollaos fuera del cuerpo', () => {
    for (const cambio of [{ radio: 0 }, { diagonal: 1 }, { recto: NaN }, { laterales: [220] }, { alto: -1 }, { aguas: Infinity }]) {
      expect(() => calcularMedidasCal({ ...MEDIDAS_CAL_5319, ...cambio })).toThrow();
    }
  });
});
