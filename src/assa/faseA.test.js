import { describe, expect, it } from 'vitest';
import { calcularFamilia, fechaLote, generarProgramas } from './faseA.js';

const linea = { CodArticle: 'H0K420102-0034', descripcion: 'NH=3200-200 NT=600 SCHWARZ', cantidad: 8, of_: '0232434', CodOrder: 'AR.26.04704', IDOrderLine: 'linea' };

describe('lote del sábado: reglas de fase A', () => {
  it('admite solo fechas reales de sábado sin depender de la zona horaria', () => {
    expect(fechaLote('2026-10-31')).toBe('LOTE 31-10');
    for (const f of ['2026-10-30', '2026-02-31', '31-10-2026', '', null]) expect(() => fechaLote(f)).toThrow();
  });
  it('descuenta NH una sola vez en un lateral y distingue terminado y corte', () => {
    const g = calcularFamilia(linea);
    expect(g.terminadoMm).toEqual([3000, 600]);
    expect(g.pieza.medidasMm).toEqual([3010, 666]);
    expect(g.pieza.entidades.lineas).toHaveLength(3);
    expect(g.pieza.entidades.lineas.some(l => l.y1 === 0 && l.y2 === 0)).toBe(false);
  });
  it('la envolvente sencilla no hereda agujeros de la 420150', () => {
    const g = calcularFamilia({ ...linea, CodArticle: 'H0K420148-0002', descripcion: 'NB=3450 NH=3600 NT=600' });
    expect(g.terminadoMm).toEqual([10645, 595]);
    expect(g.pieza.medidasMm).toEqual([10655, 661]);
    expect(g.pieza.entidades.circulos).toEqual([]);
  });
  it('NW equivale a NB con y sin H; NK requiere un contraste explícito', () => {
    const l = { ...linea, CodArticle: '0K420148-0105', descripcion: 'NW=3450-8 NK=3680 NT=600-5' };
    expect(calcularFamilia(l).estado).toBe('a-mano');
    expect(calcularFamilia(l, { nkValidado: true }).pieza.medidasMm).toEqual([10815, 661]);
  });
  it('recupera la medida truncada de 0088 solo de la ficha de medidas autorizada', () => {
    const l = { ...linea, CodArticle: 'H0K420150-0088', descripcion: 'NT600 NB3250 NH348' };
    expect(calcularFamilia(l).estado).toBe('a-mano');
    const g = calcularFamilia(l, { terminadoMm: [10202, 600] });
    expect(g.pieza.medidasMm).toEqual([10212, 666]);
    expect(g.medidas.NH).toBe(3480);
    expect(g.avisos.join(' ')).toMatch(/recortada/);
  });
  it.each([1, 2, 3, 8, 90])('cantidad exacta %i con juegos o sueltas, sin stock añadido', cantidad => {
    const g = calcularFamilia({ ...linea, cantidad });
    for (const sueltas of [false, true]) {
      const ps = generarProgramas(g, { sueltas });
      expect(ps.reduce((n, p) => n + p.panos * p.repeticiones, 0)).toBe(cantidad);
      expect(ps.every(p => p.anchoOcupadoMm <= 2040)).toBe(true);
      if (sueltas) expect(ps.every(p => p.panos === 1)).toBe(true);
      expect(ps.every(p => p.entidades.textos.every(t => t.capa === 'texto'))).toBe(true);
    }
  });
  it.each([
    { of_: '' }, { cantidad: 1.5 }, { descripcion: 'NH=3 NT=600' },
    { descripcion: 'NH=3200-100 NT=600' }, { descripcion: 'NH3200 NH3600 NT600' },
    { descripcion: 'NH=3200 NT=2200' }, { descripcion: 'NH3200 NT600 RED' },
    { CodArticle: 'H0K430172-0007' },
  ])('retiene entradas insuficientes o fuera del alcance: %j', cambios => {
    const g = calcularFamilia({ ...linea, ...cambios });
    expect(g.estado).toBe('a-mano');
    expect(g.motivos.length).toBeGreaterThan(0);
    expect(generarProgramas(g)).toEqual([]);
  });
});
