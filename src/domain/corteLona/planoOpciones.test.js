import { describe, expect, it } from 'vitest';
import revision from './fixtures/revision-AR2604784.json' with { type: 'json' };
import { generarCorteLona } from './index.js';

describe('El plano reúne todas las opciones del corte', () => {
  it('AR2604784 lleva solo la opción con sacos', () => {
    const plano = generarCorteLona(revision.order, { ofStockSacos: '0230811' }).plano[0];
    expect(plano.dxf.includes('OPCIÓN 1 · CON SACOS')).toBe(true);
    expect(plano.dxf.includes('OPCIÓN 2')).toBe(false);
  });
  it('con empate horizontal dibuja las dos opciones sin solaparse y las encuadra enteras', () => {
    const order = structuredClone(revision.order);
    order.awnings[0].width = 700;
    order.awnings[0].projection = 350;
    const resultado = generarCorteLona(order, { ofStockSacos: '0230811' });
    expect(resultado.cortes.trozoSeparado).not.toBeNull();
    const plano = resultado.plano[0];
    expect(plano.dxf.includes('OPCIÓN 1 · CON SACOS')).toBe(true);
    expect(plano.dxf.includes('OPCIÓN 2 · TROZO SEPARADO')).toBe(true);
    expect(plano.dxf.includes('CORTAR DE RESTOS')).toBe(true);
    const titulos = plano.geometria.corte.textos.filter(t => t.valor.startsWith('OPCIÓN'));
    expect(titulos).toHaveLength(2);
    expect(Math.abs(titulos[0].y - titulos[1].y)).toBeGreaterThan(2.5);
    const zona = plano.geometria.zonas.corte;
    for (const t of plano.geometria.corte.textos) {
      expect(t.y + t.h).toBeLessThanOrEqual(zona.y1);
      expect(t.y - t.h).toBeGreaterThanOrEqual(zona.y0);
    }
  });
});
