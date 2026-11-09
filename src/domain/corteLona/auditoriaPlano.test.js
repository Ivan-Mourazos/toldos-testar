import { describe, expect, it } from 'vitest';
import { auditarDxf, auditarHoja, medirRecuadros } from './auditoriaPlano.js';
import { escribirDxfPlano } from './presentacion.js';

const ventana = { id: 2, centro: [50, 50], ancho: 80, alto: 80, escala: 10 };
const texto = (valor, x, y, h = 3) => ({ tipo: 'texto', valor, punto: [x, y], h, ancla: 5, espacio: 'ventana 2', recorte: ventana });

describe('Auditor común de planos (mm de papel)', () => {
  it('declara los mininúmeros de empate coincidentes sin exigir mover ROTULADOR', () => {
    const t = { ...texto('a1', 50, 50), capa: 'ROTULADOR' };
    const r = auditarHoja([t, { ...t, handle: 'SEGUNDO' }]);
    expect(r.solapes).toEqual([]);
    expect(r.duplicadosRotulador).toHaveLength(1);
    expect(auditarHoja([t, { ...t, valor: 'a2' }]).solapes).toHaveLength(1);
    expect(auditarHoja([t, { ...t, capa: 'texto' }]).solapes).toHaveLength(1);
  });
  it('excluye los mininúmeros de máquina a petición, conservando sus líneas como obstáculos', () => {
    const ps = [{ ...texto('1', 50, 50, .1), capa: 'ROTULADOR' }, texto('NOTA', 30, 30),
      { tipo: 'raya', capa: 'DISCO1', a: [40, 50], b: [60, 50] },
      { tipo: 'raya', capa: 'ROTULADOR', a: [30, 20], b: [30, 40] }];
    expect(auditarHoja(ps).textosPequenos).toHaveLength(1);
    const r = auditarHoja(ps, { capasTextosExcluidas: ['ROTULADOR'] });
    expect(r.textosPequenos).toEqual([]);
    expect(r.cruces.map(c => c.texto)).toEqual(['NOTA']);
  });
  it('acepta textos legibles separados y geometría centrada', () => {
    const r = auditarHoja([texto('A', 30, 60), texto('B', 70, 60), { tipo: 'raya', capa: 'DISCO1', a: [20, 20], b: [80, 80], recorte: ventana }]);
    expect(r.solapes).toEqual([]);
    expect(r.cruces).toEqual([]);
    expect(r.recortes).toEqual([]);
    expect(r.textosPequenos).toEqual([]);
    expect(r.ventanas[0].desvioXPorcentaje).toBeCloseTo(0);
    expect(r.ventanas[0].desvioYPorcentaje).toBeCloseTo(0);
    expect(r.ventanas[0].ocupacionAreaPorcentaje).toBeCloseTo(56.25);
  });
  it('incluye cotas, cruces de CUTTER, recortes y tamaños extremos', () => {
    const r = auditarHoja([texto('A', 50, 50), { ...texto('123', 50, 50), deCota: true }, texto('Fuera', 89, 89), texto('Mini', 20, 20, 1), texto('Grande', 40, 75, 13), { tipo: 'raya', capa: 'CUTTER', a: [10, 50], b: [90, 50], recorte: ventana }]);
    expect(r.solapes.length).toBeGreaterThan(0);
    expect(r.cruces.some(c => c.texto === '123')).toBe(true);
    expect(r.recortes.some(c => c.texto === 'Fuera')).toBe(true);
    expect(r.textosPequenos.map(t => t.texto)).toEqual(['Mini']);
    expect(r.textosGrandes.map(t => t.texto)).toEqual(['Grande']);
    expect([r.minimoMm, r.maximoMm]).toEqual([1, 13]);
  });
  it('detecta invasiones del cajetín y de los límites del papel', () => {
    const r = auditarHoja([texto('Invade', 250, 25), { ...texto('Fuera A4', 1, 120), recorte: undefined }], { cajetin: { x0: 240, x1: 287, y0: 10, y1: 40 } });
    expect(r.encimaCajetin.map(t => t.texto)).toEqual(['Invade']);
    expect(r.fueraPapel.map(t => t.texto)).toEqual(['Fuera A4']);
  });
  it('mide el contenido visible y conserva aparte el desbordamiento sin recortar', () => {
    const r = auditarHoja([texto('A', 70, 70), { tipo: 'raya', capa: 'DISCO1', a: [60, 60], b: [100, 100], recorte: ventana }]);
    expect(r.ventanas[0].desvioXPorcentaje).toBeCloseTo(31.25);
    expect(r.ventanas[0].ocupacionAnchoPorcentaje).toBeCloseTo(37.5);
    expect(r.ventanas[0].ocupacionSinRecortarAreaPorcentaje).toBeCloseTo(25);
  });
  it('distingue los campos propios del cajetín del contenido que lo invade', () => {
    const r = auditarHoja([{ ...texto('Nº PEDIDO', 250, 25), handle: 'CAJ', espacio: 'papel', recorte: undefined }], { cajetin: { x0: 240, x1: 287, y0: 10, y1: 40 }, handlesCajetin: ['CAJ'] });
    expect(r.encimaCajetin).toEqual([]);
  });
  it('mide y cruza el arco real, sin usar su círculo completo ni su cuerda', () => {
    const r = auditarHoja([texto('A', 50, 70), texto('B', 50, 50), { tipo: 'arco', capa: 'DISCO1', punto: [50, 50], r: 20, desde: 0, hasta: 180, recorte: ventana }]);
    expect(r.cruces.map(c => c.texto)).toEqual(['A']);
    expect(r.ventanas[0].contenidoMm.y0).toBeGreaterThan(48);
    expect(r.ventanas[0].contenidoMm.y1).toBeLessThan(73);
  });
  it('comprueba alto, alineación y margen común del 20 %, con mínimo de un metro', () => {
    const zonas = [{ x0: 0, x1: 10, y0: 0, y1: 10 }, { x0: 14, x1: 24, y0: 0, y1: 10 }];
    const marcos = [{ x0: -2, x1: 12, y0: -2, y1: 12 }, { x0: 12, x1: 26, y0: -2, y1: 12 }];
    expect(medirRecuadros(marcos, zonas).ok).toBe(true);
    expect(medirRecuadros([{ ...marcos[0], y1: 13 }, marcos[1]], zonas).ok).toBe(false);
    expect(medirRecuadros([], zonas).ok).toBe(false);
  });
  it('lee el DXF final, aplica la escala real y reconoce el cajetín también en hojas copiadas', () => {
    const zona = { x0: 100, x1: 104, y0: 96, y1: 100 };
    const geometria = { lineas: [], polilineas: [], textos: [{ capa: 'texto', valor: 'Prueba', x: 102, y: 98, h: .1, centrado: true }],
      corte: { lineas: [], polilineas: [], textos: [] }, zonas: { toldos: zona, corte: { ...zona, x0: 110, x1: 114 } },
      hojas: [{ nombre: 'Primera', zona }, { nombre: 'Segunda', zona }] };
    const { dxf, ventanas } = escribirDxfPlano(geometria, { pedido: 'PRUEBA', of: '1234567', cliente: 'Auditor', fecha: '2026-11-09' });
    const antes = JSON.stringify(geometria), r = auditarDxf(dxf);
    expect(JSON.stringify(geometria)).toBe(antes);
    expect(r.hojas.map(h => h.nombre)).toEqual(['Primera', 'Segunda']);
    for (const h of r.hojas) {
      const t = h.textos.find(t => t.texto === 'Prueba');
      expect(t.alturaMm).toBeCloseTo(.1 * ventanas[2].ancho / (4 * 1.03), 4);
      expect(h.textos.find(t => t.texto === 'PRUEBA').cajetin).toBe(true);
      expect(h.encimaCajetin).toEqual([]);
    }
  });
});
