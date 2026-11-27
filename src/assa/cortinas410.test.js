import { expect, it } from 'vitest';
import lineas from './fixtures/lote0711.json' with { type: 'json' };
import { prepararLote } from './lote.js';
import { escribirDocumentoLote } from './documentoLote.js';

const fecha = '2026-11-07';
const cortinas = lineas.filter(l => /410(129-0117|130-0175|17[01]-0001)/.test(l.CodArticle));
const palets = Object.fromEntries(cortinas.map((l, i) => [l.IDOrderLine, i + 3]));

it('corta la 410143-0002 con ocho agujeros en el cuerpo y un frente con abertura por unidad', () => {
  const linea = { ...cortinas[0], CodArticle: 'H0K410143-0002', cantidad: 5,
    descripcion: 'PLANE SC IN COMPLETE WIDTH WB400xWT300xB3350 OP=600 PVC BACLK, 2MM REINFORCED' };
  const lote = prepararLote(fecha, [linea], {}, undefined, { palets: { [linea.IDOrderLine]: 2 } });
  expect(lote.lineas[0]).toMatchObject({ estado: 'validado', corteMm: [3350, 1100] });
  expect(lote.cortador.map(f => [f.material, f.unidades, f.pedidas, f.cuadra])).toEqual([
    ['Lona 2 mm', 15, 15, true], ['Lona 3 mm', 5, 5, true],
  ]);
  const [cuerpo, tapas, frente] = lote.programas;
  expect(cuerpo.entidades.circulos).toHaveLength(8);
  expect(cuerpo.entidades.circulos.every(c => c.capa === 'CUTTER' && c.r === 20)).toBe(true);
  expect(tapas).toMatchObject({ piezas: 2, largoMm: 880, anchoOcupadoMm: 370, repeticiones: 5 });
  expect(frente.entidades.circulos).toEqual([600, 2750].map(x => ({ capa: 'ROTULADOR', x, y: 420, r: 4 })));
  expect(prepararLote(fecha, [{ ...linea, descripcion: linea.descripcion.replace('OP=600', 'OP=700') }]).aMano).toBe(1);
});

it('corta las cuatro cortinas del 07-11 y cuenta cada pieza por material y palet', () => {
  const lote = prepararLote(fecha, cortinas, {}, undefined, { palets });
  expect(lote.aMano).toBe(0);
  expect(lote.reparto.map(r => [r.pedido, r.numeroLinea, r.of, r.cantidad, r.palet]))
    .toEqual(cortinas.map(l => [l.CodOrder, l.NumLine, l.of_, l.cantidad, palets[l.IDOrderLine]]));
  expect(lote.cortador.map(r => [r.referencia.slice(-11), r.material, r.unidades, r.pedidas, r.cuadra]))
    .toEqual(expect.arrayContaining([
      ['410129-0117', 'PLASTEL 8800 TE62 negra', 81, 81, true],
      ['410129-0117', 'Lona 3 mm', 27, 27, true],
      ['410130-0175', 'PLASTEL 8800 TE62 negra', 54, 54, true],
      ['410130-0175', 'PVC 900 g negro', 108, 108, true],
      ['410130-0175', 'Lona 3 mm', 54, 54, true],
      ['410170-0001', 'Lona 2 mm', 3, 3, true],
      ['410170-0001', 'Lona 1 mm', 13, 13, true],
      ['410171-0001', 'Lona 2 mm', 3, 3, true],
      ['410171-0001', 'Lona 1 mm', 13, 13, true],
    ]));
  expect(lote.cortador).toHaveLength(9);
  for (const fila of Map.groupBy(lote.programas, p => `${p.palet}/${p.y}`).values()) {
    expect(new Set(fila.map(p => p.material)).size).toBe(1);
    expect(fila.every(p => p.anchoOcupadoMm <= p.anchoRolloMm)).toBe(true);
  }
  const dxf = escribirDocumentoLote(lote);
  expect(dxf).toContain('PAPEL DEL CORTADOR');
  expect(dxf).toContain('PVC 900 g negro');
  expect(dxf).toContain('0233209');
});

it('retiene un cambio de cotas o de marca de RPS y las muestras de lona', () => {
  const lateral = cortinas.find(l => l.CodArticle.endsWith('410130-0175'));
  const cambios = [
    { descripcion: lateral.descripcion.replace('2300', '2350') },
    { descripcion: lateral.descripcion.replace('750', '1000') },
    { CodArticle: 'MUESTRALONA' },
    { of_: '' },
    { cantidad: 0 },
  ];
  for (const cambio of cambios) {
    const lote = prepararLote(fecha, [{ ...lateral, ...cambio }]);
    expect(lote.lineas[0].estado).toBe('a-mano');
    expect(lote.programas).toEqual([]);
  }
});

it.each([
  ['410129-0105', /cinco agujeros.*seis/],
  ['410129-0003', /figura como puerta y como cortina/],
  ['410174-0049', /solapas lisas y tiras para rotular/],
  ['410241-0011', /marca D.*D1 a D5/],
  ['410242-0004', /marca C.*C1 a C5/],
])('muestra por qué %s requiere una decisión de taller', (codigo, motivo) => {
  const lote = prepararLote(fecha, [{ ...cortinas[0], CodArticle: `H0K${codigo}` }]);
  expect(lote.lineas[0]).toMatchObject({ estado: 'a-mano', motivos: [expect.stringMatching(motivo)] });
  expect(lote.programas).toEqual([]);
});
