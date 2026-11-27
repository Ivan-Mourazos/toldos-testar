import { expect, it } from 'vitest';
import lineas from './fixtures/lote0711.json' with { type: 'json' };
import { prepararLote } from './lote.js';
import { escribirDocumentoLote } from './documentoLote.js';

const fecha = '2026-11-07';
const cortinas = lineas.filter(l => /410(129-0117|130-0175|17[01]-0001)/.test(l.CodArticle));
const palets = Object.fromEntries(cortinas.map((l, i) => [l.IDOrderLine, i + 3]));

it('la 410124-0003 corta y rotula A1, A2 y A3 una vez por unidad', () => {
  const linea = { ...cortinas[0], CodArticle: 'H0K410124-0003', cantidad: 17,
    descripcion: 'TOP PVC 0,5MM GLOSSY BLK TNB2080XTWB300XTWT400_W/O OP_480X200_OPEN RECESS' };
  const lote = prepararLote(fecha, [linea], {}, undefined, { palets: { [linea.IDOrderLine]: 4 } });
  expect(lote.lineas[0]).toMatchObject({ estado: 'validado' });
  expect(lote.cortador).toMatchObject([{ material: 'ALPHA negro 580 g', unidades: 51, pedidas: 51, cuadra: true }]);
  for (const valor of ['A1', 'A2', 'A3']) {
    const hechos = lote.programas.reduce((n, p) => n + p.entidades.textos.filter(t =>
      t.capa === 'ROTULADOR' && t.valor === valor).length * p.repeticiones, 0);
    expect(hechos).toBe(17);
  }
});

it('la 410130-0018 conserva DISCO2 entre tapas y cuenta las parejas del resto', () => {
  const linea = { ...cortinas[0], CodArticle: 'H0K410130-0018', cantidad: 5,
    descripcion: 'SC SIDE CURTAIN 300X300X2400 ANFAHRSTREIFEN: WEIS/STANDARD' };
  const lote = prepararLote(fecha, [linea], {}, undefined, { palets: { [linea.IDOrderLine]: 2 } });
  expect(lote.lineas[0]).toMatchObject({ estado: 'validado', corteMm: [2400, 1000] });
  const tapas = lote.programas.filter(p => p.material === 'PVC 900 g negro');
  expect(tapas.map(p => [p.piezas, p.anchoOcupadoMm, p.entidades.circulos.length])).toEqual([[8, 2960, 24], [2, 740, 6]]);
  expect(tapas[0].entidades.lineas.filter(l => l.capa === 'DISCO2')).toHaveLength(8);
  expect(lote.cortador.map(f => [f.material, f.unidades, f.pedidas])).toEqual([
    ['Lona 3 mm', 5, 5], ['PLASTEL 8800 TE62 negra', 5, 5], ['PVC 900 g negro', 10, 10],
  ]);
});

it('la 410130-0006 alterna tapas lisas y perforadas con DISCO1', () => {
  const linea = { ...cortinas[0], CodArticle: 'H0K410130-0006', cantidad: 6,
    descripcion: 'SC SIDE CURTAIN 300X300X3000 ANFAHRSTREIFEN:WEI?/S' };
  const lote = prepararLote(fecha, [linea]);
  expect(lote.lineas[0]).toMatchObject({ estado: 'validado', corteMm: [3000, 1000] });
  const pvc = lote.programas.filter(p => p.material === 'PVC 900 g negro');
  expect(pvc.map(p => p.piezas)).toEqual([8, 4]);
  expect(pvc[0].entidades.lineas.every(l => l.capa === 'DISCO1')).toBe(true);
  expect([...new Set(pvc[0].entidades.circulos.map(c => Math.floor(c.y / 370)))]).toEqual([1, 3, 5, 7]);
});

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

it('la 410143-0007 conserva los dos giros del frente corregido y cuenta las tapas por unidad', () => {
  const linea = { ...cortinas[0], CodArticle: 'H0K410143-0007', cantidad: 17,
    descripcion: 'PLANE SC IN COMPLETE WIDTH WB300XWT300XB3000 OP=700 PVC BLACK, 2mm REINFORCED' };
  const lote = prepararLote(fecha, [linea]);
  expect(lote.lineas[0]).toMatchObject({ estado: 'validado', corteMm: [3000, 1000] });
  expect(lote.cortador.map(f => [f.material, f.unidades, f.pedidas, f.cuadra])).toEqual([
    ['Lona 2 mm', 51, 51, true], ['Lona 3 mm', 17, 17, true],
  ]);
  const tapas = lote.programas.filter(p => p.nombrePiezas === 'pares de tapas');
  expect(tapas.map(p => [p.largoMm, p.anchoOcupadoMm, p.piezas, p.repeticiones]))
    .toEqual([[2380, 740, 14, 2], [1020, 740, 6, 1]]);
  const frentes = lote.programas.filter(p => p.nombrePiezas === 'frentes con abertura');
  expect(frentes.map(p => [p.piezas, p.repeticiones])).toEqual([[2, 8], [1, 1]]);
  expect(frentes[0].entidades.circulos.map(c => [c.capa, c.x, c.y])).toEqual(expect.arrayContaining([
    ['ROTULADOR', 500, 355], ['ROTULADOR', 2500, 355], ['ROTULADOR', 500, 995], ['ROTULADOR', 2500, 995],
  ]));
  expect(frentes[0].entidades.circulos).toHaveLength(4);
});

it('cuenta solo dos tapas lisas de PVC por cada cuerpo de la 410182-0037', () => {
  const linea = { ...cortinas[0], CodArticle: 'H0K410182-0037', cantidad: 26,
    descripcion: 'PLANE OBEN 2MM SC WB=300 WT=300 B=3100 SCHWARZ' };
  const lote = prepararLote(fecha, [linea]);
  expect(lote.lineas[0]).toMatchObject({ estado: 'validado', corteMm: [3100, 1000] });
  expect(lote.cortador.map(f => [f.material, f.unidades, f.pedidas, f.cuadra])).toEqual([
    ['Lona 2 mm', 26, 26, true], ['PVC 900 g negro', 52, 52, true],
  ]);
  const [cuerpo, llena, resto] = lote.programas;
  expect(cuerpo.anchoRolloMm).toBe(1200);
  expect(cuerpo.entidades.circulos).toHaveLength(8);
  expect(cuerpo.entidades.circulos.every(c => c.capa === 'CUTTER' && c.y === 250 && c.r === 20)).toBe(true);
  expect([llena, resto].map(p => [p.piezas, p.repeticiones, p.anchoOcupadoMm]))
    .toEqual([[8, 6, 2960], [4, 1, 1480]]);
  expect([llena, resto].every(p => p.entidades.circulos.length === 0 &&
    p.entidades.lineas.every(l => l.capa === 'DISCO1'))).toBe(true);
});

it('la 410134-0002 aprovecha el borde de los cuerpos para cortar sus tapas', () => {
  const linea = { ...cortinas[0], CodArticle: 'H0K410134-0002', cantidad: 15,
    descripcion: 'PLANE SC STANDARD 300X300X2500 OP=600 PVC SCHWARZ, REINFORCED' };
  const lote = prepararLote(fecha, [linea]);
  expect(lote.lineas[0]).toMatchObject({ estado: 'validado', corteMm: [2500, 1000] });
  expect(lote.cortador.map(f => [f.material, f.unidades, f.pedidas, f.cuadra])).toEqual([
    ['Lona 2 mm', 45, 45, true], ['Lona 3 mm', 15, 15, true],
  ]);
  const [doble, sencillo, frenteDoble, frenteSencillo] = lote.programas;
  expect([doble, sencillo].map(p => [p.largoMm, p.anchoOcupadoMm, p.piezas, p.repeticiones]))
    .toEqual([[2840, 2000, 6, 7], [2840, 1000, 3, 1]]);
  expect(doble.entidades.lineas.filter(l => l.x1 === 2840 && l.x2 === 2840))
    .toEqual([{ capa: 'CUTTER', x1: 2840, y1: 0, x2: 2840, y2: 1480 }]);
  expect(frenteDoble.entidades.circulos).toHaveLength(4);
  expect(frenteSencillo.entidades.circulos).toEqual([200, 2300].map(x => ({ capa: 'ROTULADOR', x, y: 255, r: 4 })));
  expect(frenteSencillo.entidades.lineas).toContainEqual({ capa: 'CUTTER', x1: 0, y1: 0, x2: 2500, y2: 0 });
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
