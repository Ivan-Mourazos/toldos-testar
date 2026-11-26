import { describe, expect, it } from 'vitest';
import revision from './fixtures/revision-AR2604784.json' with { type: 'json' };
import { generarCorteLona } from './index.js';
import { auditarDxf } from './auditoriaPlano.js';
import { leerPlanoTexto } from '../../flujoDwg/planoDxf.js';

describe('El plano reúne todas las opciones del corte', () => {
  // Iván, 26/11/2026: «la A girada se podría corregir, salvo que el corte salga girado».
  it('AR2604784: los rótulos del corte van derechos, como en el corte de la máquina', () => {
    const r = generarCorteLona(revision.order, { ofStockSacos: '0230811' });
    const maquina = new Map(r.cortes.conSacos[0].dibujo.textos.filter(t => t.capa === 'texto').map(t => [t.valor, t.giro ?? 0]));
    const plano = r.plano[0].geometria.corte.textos.filter(t => t.capa === 'texto' && maquina.has(t.valor));
    expect(plano.map(t => t.valor)).toContain('A');
    for (const t of plano) expect([t.valor, (t.giro ?? 0) % 180]).toEqual([t.valor, maquina.get(t.valor) % 180]);
  });
  it('AR2604784, sin sacos ni trozo aparte, titula un solo corte sin hablar de opciones', () => {
    const plano = generarCorteLona(revision.order, { ofStockSacos: '0230811' }).plano[0];
    const titulos = plano.geometria.corte.textos.filter(t => t.valor.startsWith('CORTE ·') || t.valor.startsWith('OPCIÓN'));
    expect(titulos.map(t => t.valor)).toEqual([expect.stringMatching(/^CORTE · [\d,]+ M$/)]);
  });
  // Iván, 26/11/2026: con paño pequeño, solo la opción separada; nada de sacos ni de «elegir».
  it('con empate horizontal dibuja solo el corte con el trozo de restos y lo encuadra entero', () => {
    const order = structuredClone(revision.order);
    order.awnings[0].width = 700;
    order.awnings[0].projection = 350;
    const resultado = generarCorteLona(order, { ofStockSacos: '0230811' });
    expect(resultado.cortes.trozoSeparado).toBeNull();
    const plano = resultado.plano[0];
    expect(plano.dxf.includes('OPCIÓN')).toBe(false);
    expect(plano.dxf.includes('STOCK')).toBe(false);
    expect(plano.dxf.includes('CORTAR DE RESTOS')).toBe(true);
    // Los recuadros del modelo se conservan: el encuadre de impresión está en las ventanas de cada hoja.
    const a = auditarDxf(plano.dxf, { capasTextosExcluidas: ['ROTULADOR'] });
    const visibles = new Set(a.hojas.flatMap(h => h.textos.filter(t => t.ventana).map(t => t.handle)));
    const ps = leerPlanoTexto(plano.dxf).modelo;
    for (const t of plano.geometria.corte.textos) {
      const p = ps.find(p => p.tipo === 'texto' && !p.deCota && p.valor === t.valor && p.capa === t.capa && Math.hypot(p.punto[0] - t.x, p.punto[1] - t.y) < 2e-6);
      expect(p, t.valor).toBeDefined(); expect(visibles.has(p.handle), t.valor).toBe(true);
    }
    for (const h of a.hojas) { expect(h.solapes).toEqual([]); expect(h.cruces).toEqual([]); expect(h.recortes).toEqual([]); }
  });
});
