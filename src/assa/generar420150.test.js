import { describe, expect, it } from 'vitest';
import { generar420150, generarPanos420150 } from './generar420150.js';
import { escribirDxf2004 } from '../domain/corteLona/dxfCorte.js';

// Línea SELECT de RPS: lote 22-08-2026. No se usan dibujos de cliente como plantilla.
const linea = {
  IDOrderLine: 'a260d94e-ec64-455b-ab98-f546c02bbaaa', CodOrder: 'AR.26.03639',
  CodArticle: 'H0K420150-0090', of_: '0230759', cantidad: 90,
  descripcion: 'ABDECKPLANE MIT REGENRINNE NT600NB3450NH3480 SCHWA',
};

describe('reglas de paños 420150 en milímetros', () => {
  it('reproduce el caso real: terminado +10/+66, tres paños por treinta cortes', () => {
    const g = generarPanos420150(linea);
    expect(g.estado).toBe('generado');
    expect(g.terminadoMm).toEqual([10402, 600]);
    expect(g.pieza.medidasMm).toEqual([10412, 666]);
    expect(g.programas.map(p => [p.panos, p.repeticiones])).toEqual([[3, 30]]);
    const e = g.pieza.entidades;
    expect(e.circulos).toHaveLength(12);
    expect(e.circulos[0]).toEqual({ capa: 'CUTTER', x: 3635, y: 333, r: 7 });
    expect(e.circulos.at(-1).x).toBe(6777);
    expect(e.arcos).toHaveLength(8);
    expect(e.lineas.filter(l => l.capa === 'ROTULADOR')).toEqual([
      { capa: 'ROTULADOR', x1: 3485, y1: 300.5, x2: 6927, y2: 300.5 },
      { capa: 'ROTULADOR', x1: 3485, y1: 365.5, x2: 6927, y2: 365.5 },
    ]);
  });

  it('genera otra altura del mismo código desde la línea, sin buscar una plantilla por referencia', () => {
    const g = generarPanos420150({ ...linea, descripcion: 'NT=600 NB=3250 NH=3600' });
    expect(g.pieza.medidasMm).toEqual([10452, 666]);
    expect(g.pieza.entidades.circulos).toHaveLength(11);
    expect(g.pieza.entidades.circulos[0].x).toBe(3755);
    expect(g.pieza.entidades.circulos.at(-1).x).toBe(6697);
  });

  it.each([1, 2, 3, 4, 5, 89, 90, 91])('conserva exactamente %i unidades, conjuntos y sueltas', cantidad => {
    const g = generarPanos420150({ ...linea, cantidad });
    expect(g.programas.reduce((n, p) => n + p.panos * p.repeticiones, 0)).toBe(cantidad);
    expect(g.programas.every(p => p.panos * 666 <= 2040)).toBe(true);
    for (const p of g.programas) {
      expect(p.entidades.lineas.filter(l => l.capa === 'DISCO1')).toHaveLength(3 * p.panos);
      expect(p.entidades.lineas.some(l => l.capa === 'DISCO1' && l.y1 === 0 && l.y2 === 0)).toBe(false);
      expect(p.entidades.textos.some(t => /x\d/.test(t.valor))).toBe(false);
      expect(p.entidades.textos.every(t => t.valor.includes('0230759'))).toBe(true);
    }
  });

  it('es compatible con el escritor DXF de la web y no mete x30 en la máquina', () => {
    const p = generarPanos420150(linea).programas[0];
    const dxf = escribirDxf2004(p.entidades, { dx: 0, dy: 0, leyenda: false });
    expect(dxf).toContain('DISCO1');
    expect(dxf).toContain('ROTULADOR');
    expect(dxf).toContain('CUTTER');
    expect(dxf).not.toContain('x30');
  });

  it.each([1, 2, 3, 4, 5, 20, 89, 90, 91])('solo completa conjuntos para stock si se activa expresamente: %i', cantidad => {
    const exacto = generarPanos420150({ ...linea, cantidad });
    const completo = generarPanos420150({ ...linea, cantidad }, { completarConjuntosDe3: true });
    expect(exacto.cantidadCortada).toBe(cantidad);
    expect(exacto.extraStock).toBe(0);
    expect(completo.cantidadCortada).toBe(Math.ceil(cantidad / 3) * 3);
    expect(completo.extraStock).toBe(completo.cantidadCortada - cantidad);
    expect(completo.programas).toHaveLength(1);
    expect(completo.programas[0].panos).toBe(3);
  });

  it.each([
    ['NH truncada', { descripcion: 'NT600 NB3250 NH348' }],
    ['alias sin confirmar', { descripcion: 'NT600 NW3450 NH3480' }],
    ['medida ausente', { descripcion: 'NT600 NB3450' }],
    ['aritmética sin confirmar', { descripcion: 'NT600 NB3450 NH3680-200' }],
    ['medidas contradictorias', { descripcion: 'NT600 NB3450 NH3480 NH3680' }],
    ['ancho sin regla de agujeros', { descripcion: 'NT600 NB3400 NH3480' }],
    ['fondo sin validar', { descripcion: 'NT900 NB3450 NH3480' }],
    ['color distinto', { descripcion: 'NT600 NB3450 NH3480 RED RAL 3002' }],
    ['sin OF', { of_: '' }],
    ['cantidad decimal', { cantidad: 1.5 }],
    ['cantidad nula', { cantidad: 0 }],
    ['otra familia', { CodArticle: 'H0K420148-0090' }],
  ])('devuelve a mano: %s', (_motivo, cambios) => {
    const g = generarPanos420150({ ...linea, ...cambios });
    expect(g.estado).toBe('a-mano');
    expect(g.motivos.length).toBeGreaterThan(0);
    expect(g.programas).toEqual([]);
  });

  it('mantiene el conjunto completo a mano mientras falten reglas de accesorios', () => {
    const g = generar420150(linea);
    expect(g.estado).toBe('a-mano');
    expect(g.aptoFabricacion).toBe(false);
    expect(g.panos.estado).toBe('generado');
    expect(g.motivos.join(' ')).toMatch(/canalones|refuerzos/);
  });
});
