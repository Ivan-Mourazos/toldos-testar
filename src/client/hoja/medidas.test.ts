import { describe, expect, it } from 'vitest';
import { VISTAS_HOJA } from '../remolques/render/captura';
import { ANCHO_DIBUJO_MM, aPixeles, HUECO_MM, LETRA_COTA_MM, tamanoVista } from './medidas';

describe('medidas de las vistas en la hoja', () => {
  it.each([0, 1, 2] as const)('caben a lo ancho del dibujo (nivel de vistas: %s)', (nivel) => {
    const t = (v: (typeof VISTAS_HOJA)[number]) => tamanoVista(v, nivel);
    expect(t('tres-cuartos').ancho + HUECO_MM + t('tres-cuartos-detras').ancho).toBe(ANCHO_DIBUJO_MM);
    expect(t('delante').ancho + t('detras').ancho + t('lateral').ancho + 2 * HUECO_MM).toBe(ANCHO_DIBUJO_MM);
  });

  it('con la tabla de ganchos las vistas encogen, más las rectas que las 3/4', () => {
    const alto = (nivel: 0 | 1 | 2) => tamanoVista('tres-cuartos', nivel).alto + HUECO_MM + tamanoVista('delante', nivel).alto;
    expect(alto(0)).toBe(106);
    expect(alto(1)).toBe(82);
    expect(alto(2)).toBe(74);
  });

  it.each(VISTAS_HOJA)('%s se captura a 200 ppp o más en su tamaño impreso', (vista) => {
    for (const nivel of [0, 1, 2] as const) {
      const { ancho, alto } = tamanoVista(vista, nivel);
      expect(aPixeles(ancho) / (ancho / 25.4)).toBeGreaterThanOrEqual(200);
      expect(aPixeles(alto) / (alto / 25.4)).toBeGreaterThanOrEqual(200);
    }
  });

  it('la letra de las cotas no baja de 7 pt', () => {
    expect(LETRA_COTA_MM / 0.3528).toBeGreaterThanOrEqual(7);
  });
});
