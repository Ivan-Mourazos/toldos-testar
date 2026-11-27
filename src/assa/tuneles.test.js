import { describe, expect, it } from 'vitest';
import { codigoAssa } from './codigos.js';
import { maquetarLote } from './documentoLote.js';
import { prepararLote } from './lote.js';

const fecha = '2026-12-05';
const variantes = [
  // Número de línea, referencia, cotas RPS, corte, unidades y palet.
  [1, 'P1602298-0003', 'NH3400, NT600', 3253, 661, 36, 2, [6, 6]],
  [2, 'P1602304-0003', 'NW3450, NT600', 4060, 721, 18, 2, [4, 4, 2, 1]],
  [3, 'P1602298-0001', 'NH3200, NT600', 3053, 661, 24, 1, [6, 4]],
  [4, 'P1602298-0002', 'NH3200, NT900', 3053, 961, 24, 2, [4, 6]],
  [5, 'P1602298-0004', 'NH3400, NT900', 3253, 961, 24, 1, [4, 6]],
  [6, 'P1602298-0005', 'NH3600, NT600', 3453, 661, 36, 1, [6, 6]],
  [7, 'P1602298-0006', 'NH3600, NT900', 3453, 961, 24, 2, [4, 6]],
  [8, 'P1602304-0001', 'NW3250, NT600', 3860, 721, 18, 1, [4, 4, 2, 1]],
  [9, 'P1602304-0002', 'NW3250, NT900', 3860, 1020, 12, 1, [4, 3]],
  [10, 'P1602304-0004', 'NW3450, NT900', 4060, 1020, 12, 2, [4, 3]],
];
const linea = ([NumLine, CodArticle, cotas, , , cantidad]) => ({
  IDOrderLine: String(NumLine), NumLine, CodOrder: 'AR.26.05285', CodArticle, cantidad, entregaSolicitada: fecha,
  descripcion: `${CodArticle.startsWith('P1602298') ? 'SIDE' : 'ROOF'} TUNNEL CURTAIN, ${cotas}`,
  of_: String(233461 + NumLine).padStart(7, '0'),
});

describe('cortinas de túnel de Combursa', () => {
  it('reconoce el código RPS y los rótulos cortos, manteniendo las referencias antiguas distintas', () => {
    expect(codigoAssa('P1602298-003 x6')).toBe('P1602298-0003');
    expect(codigoAssa('P001602304-001 x4')).toBe('P1602304-0001');
    expect(codigoAssa('P1602304-0004')).toBe('P1602304-0004');
    expect(codigoAssa('D001602304-001')).toBe('D001602304-001');
    expect(codigoAssa('P1602304.dwg')).toBe('D001602304-001');
  });

  it('corta las diez líneas con su medida, palet, OF y repeticiones dentro del rollo', () => {
    const lineas = variantes.map(linea);
    const palets = Object.fromEntries(variantes.map(([n, , , , , , p]) => [n, p]));
    const lote = prepararLote(fecha, lineas, {}, undefined, { palets });
    expect(lote.aMano).toBe(0);
    expect(lote.totalUnidades).toBe(228);
    expect(lote.paletsCompletos).toBe(true);
    expect(lote.reparto).toEqual(lineas.map(l => ({
      pedido: l.CodOrder, numeroLinea: l.NumLine, linea: l.IDOrderLine, referencia: l.CodArticle,
      of: l.of_, cantidad: l.cantidad, palet: palets[l.IDOrderLine],
    })));
    const papel = maquetarLote(lote).primitivas.filter(p => p.capa === 'HOJAS' && p.tipo === 'texto').map(p => p.valor);
    for (const [n, codigo, , largo, ancho, cantidad, palet, programas] of variantes) {
      expect(lote.lineas[n - 1].corteMm).toEqual([largo, ancho]);
      expect(papel).toContain(`AR.26.05285 / ${n} · ${codigo} · ${cantidad} UDS · ${lineas[n - 1].of_} · P${palet}`);
      expect(papel.some(t => t.startsWith(`P${palet} · ${codigo} · PLASTEL 8800 TE62 negra · ${cantidad}/${cantidad} UDS`))).toBe(true);
      expect(lote.cortador).toContainEqual(expect.objectContaining({
        referencia: codigo, palet, pedidas: cantidad, unidades: cantidad, cuadra: true,
      }));
      const tiradas = lote.programas.filter(p => p.codigo === codigo);
      expect(tiradas.flatMap(p => [p.panos, p.repeticiones])).toEqual(programas);
      for (const p of tiradas) {
        expect(p.largoMm).toBe(2 * largo);
        expect(p.anchoOcupadoMm).toBeLessThanOrEqual(2040);
        expect(p.material).toBe('PLASTEL 8800 TE62 negra');
        expect(p.entidades.arcos).toEqual([]);
        expect(p.entidades.circulos).toEqual([]);
        expect(p.entidades.lineas.filter(l => l.capa === 'ROTULADOR')).toEqual(
          Array.from({ length: p.filas }, (_, i) => ({
            capa: 'ROTULADOR', x1: largo, x2: largo, y1: i * ancho, y2: (i + 1) * ancho,
          })),
        );
        expect(p.entidades.lineas.filter(l => l.capa === 'DISCO1')).toHaveLength(4 * p.filas);
      }
    }
  });

  it.each([
    ['NH3200, NT600', /cotas.*variante/i],
    ['NH3400', /Falta NT/],
    ['NH3400, NT600, RED', /color distinto/],
  ])('deja la línea a mano si la descripción dice %s', (cotas, motivo) => {
    const [l] = prepararLote(fecha, [linea([1, 'P1602298-0003', cotas, 0, 0, 4])]).lineas;
    expect(l.estado).toBe('a-mano');
    expect(l.motivos.join(' ')).toMatch(motivo);
  });

  it('solo usa las medidas fijas de las referencias antiguas con sus descripciones RPS', () => {
    const base = linea(variantes[0]);
    const lineas = [
      { ...base, CodArticle: 'D001602298-001', descripcion: 'SIDE CURTAIN WIDTH=600' },
      { ...base, IDOrderLine: '2', CodArticle: 'D001602304-001', descripcion: 'ROOF CURTAIN' },
      { ...base, IDOrderLine: '3', CodArticle: 'D001624514-001', descripcion: 'ROOF W RAIN CHANNEL NT=600' },
      { ...base, IDOrderLine: '4', CodArticle: 'D001602298-001', descripcion: 'SIDE CURTAIN WIDTH=900' },
      { ...base, IDOrderLine: '5', CodArticle: 'P1602298-0099' },
    ];
    const lote = prepararLote(fecha, lineas);
    expect(lote.lineas.map(l => [l.estado, l.corteMm])).toEqual([
      ['validado', [3253, 661]], ['validado', [4060, 721]], ['a-mano', undefined],
      ['a-mano', undefined], ['a-mano', undefined],
    ]);
    expect(lote.lineas[2].motivos.join(' ')).toMatch(/vierteaguas/i);
    expect(lote.lineas[4].motivos.join(' ')).toMatch(/variante.*plantilla/i);
  });

  it('conserva los pedidos impares y deja el paño suelto con tres bordes de disco', () => {
    const rps = { ...linea(variantes[0]), cantidad: 5 };
    const lote = prepararLote(fecha, [rps], { [rps.CodArticle]: true });
    expect(lote.programas.map(p => [p.panos, p.repeticiones, p.unidos])).toEqual([[2, 2, true], [1, 1, false]]);
    expect(lote.programas[1].entidades.lineas.map(l => l.capa)).toEqual(['DISCO1', 'DISCO1', 'DISCO1']);
    expect(lote.cortador[0].unidades).toBe(5);
  });
});
