import { describe, expect, it } from 'vitest';
import { VISTAS_HOJA } from '../remolques/render/captura';
import { ANCHO_DIBUJO_MM, aPixeles, HUECO_MM, LETRA_COTA_MM, tamanoVista } from './medidas';

describe('medidas de las vistas en la hoja', () => {
  it.each([false, true])('caben a lo ancho del dibujo (con ganchos: %s)', (conGanchos) => {
    const t = (v: (typeof VISTAS_HOJA)[number]) => tamanoVista(v, conGanchos);
    expect(t('tres-cuartos').ancho + HUECO_MM + t('tres-cuartos-detras').ancho).toBe(ANCHO_DIBUJO_MM);
    expect(t('delante').ancho + t('detras').ancho + t('lateral').ancho + 2 * HUECO_MM).toBe(ANCHO_DIBUJO_MM);
  });

  it('con la tabla de ganchos las vistas encogen, más las rectas que las 3/4', () => {
    const alto = (conGanchos: boolean) => tamanoVista('tres-cuartos', conGanchos).alto + HUECO_MM + tamanoVista('delante', conGanchos).alto;
    expect(alto(false)).toBe(106);
    expect(alto(true)).toBe(82);
  });

  it.each(VISTAS_HOJA)('%s se captura a 200 ppp o más en su tamaño impreso', (vista) => {
    for (const conGanchos of [false, true]) {
      const { ancho, alto } = tamanoVista(vista, conGanchos);
      expect(aPixeles(ancho) / (ancho / 25.4)).toBeGreaterThanOrEqual(200);
      expect(aPixeles(alto) / (alto / 25.4)).toBeGreaterThanOrEqual(200);
    }
  });

  it('la letra de las cotas no baja de 7 pt', () => {
    expect(LETRA_COTA_MM / 0.3528).toBeGreaterThanOrEqual(7);
  });
});
