import { expect, it } from 'vitest';
import lineas from './fixtures/lote0711.json' with { type: 'json' };
import { prepararLote } from './lote.js';
import { escribirDocumentoLote } from './documentoLote.js';

const fecha = '2026-11-07';
const cortinas = lineas.filter(l => /410(129-0117|130-0175|17[01]-0001)/.test(l.CodArticle));
const palets = Object.fromEntries(cortinas.map((l, i) => [l.IDOrderLine, i + 3]));

it('la 410179-0054 marca un cuerpo por OF aunque se reparta entre palets', () => {
  const base = { ...cortinas[0], CodArticle: 'H0K410179-0054', cantidad: 15,
    descripcion: 'PLANE 2MM WB=300 WT=300 H=2900 SCHWARZ PVC, WHITE PKG 750MM' };
  const lineas = [base, { ...base, IDOrderLine: 'otro-palet' }];
  const lote = prepararLote(fecha, lineas, {}, undefined, { palets: { [base.IDOrderLine]: 2, 'otro-palet': 3 } });
  const cuerpos = lote.programas.filter(p => p.material === 'Lona 2 mm');
  const marcados = cuerpos.filter(p => p.entidades.lineas.some(l => l.capa === 'ROTULADOR'));
  expect(marcados).toHaveLength(1);
  expect(marcados[0]).toMatchObject({ palet: 2, piezas: 1, repeticiones: 1 });
  expect(marcados[0].entidades.lineas.filter(l => l.capa === 'ROTULADOR')).toHaveLength(8);
  expect(lote.cortador.map(f => [f.palet, f.material, f.unidades, f.pedidas, f.cuadra])).toEqual([
    [2, 'Lona 2 mm', 15, 15, true], [2, 'PVC 900 g negro', 30, 30, true],
    [3, 'Lona 2 mm', 15, 15, true], [3, 'PVC 900 g negro', 30, 30, true],
  ]);
});

it.each([
  ['0001', 'TRWB500XTFWB400XTWT300XB3400', 3400, 4, true],
  ['0002', 'TRWB500XTFWB400XTWT300XB3350', 3350, 4, true],
  ['0003', 'TRWB500XTFWB400TWT300XB3100', 3100, 8, false],
])('corta un cuerpo y dos tapas trapezoidales de PLASTEL para la 410149-%s', (sufijo, medidas, ancho, cantidad, juntas) => {
  const linea = { ...cortinas[0], CodArticle: `H0K410149-${sufijo}`, cantidad, descripcion: `PLANE TWP OBEN ${medidas}` };
  const lote = prepararLote(fecha, [linea]);
  expect(lote.lineas[0]).toMatchObject({ estado: 'validado', corteMm: [ancho, 1116.2] });
  expect(lote.cortador).toMatchObject([{ material: 'PLASTEL 8800 TE62 negra', unidades: 3 * cantidad, pedidas: 3 * cantidad, cuadra: true }]);
  const cuerpo = lote.programas.find(p => p.nombrePiezas.startsWith(juntas ? 'juegos de cuerpo' : 'cuerpos'));
  expect(cuerpo).toMatchObject({ anchoOcupadoMm: juntas ? 1486.2 : 1116.2, largoMm: ancho });
  const tapas = juntas ? cuerpo : lote.programas.find(p => p.nombrePiezas.startsWith('pares'));
  expect(tapas.entidades.lineas.some(l => l.x1 !== l.x2 && l.y1 !== l.y2)).toBe(true);
});

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

it.each([
  ['0010', 'PLANE TWP OBEN 300x300x1900', 1900, 4, [370, 340], false],
  ['0013', 'TOP CURTAIN TWP 300x300x2250', 2250, 5, [340, 370], true],
  ['0015', 'PLANE TWP OBEN 300x300x2600', 2600, 6, [340, 370], true],
  ['0052', 'TOP CURTAIN TWP 300X300X3200 U=BLACK/A=BLACK', 3200, 8, [340, 370], true],
  ['0056', 'TOP CURTAIN TWP 300X300X1850 U=BLACK/A=BLANCK', 1850, 4, [340, 370], false],
  ['0091', 'PLANE TWP OBEN 300x300X3600 PVC SCHWARZ', 3600, 9, [340, 370], false],
  ['0209', 'PLANE TWP OBEN WB300XWT300X3400', 3400, 9, [340, 370], false],
])('corta el superior de PLASTEL 410129-%s con su patrón de agujeros', (sufijo, descripcion, ancho, agujeros, tapa, juntas) => {
  const linea = { ...cortinas[0], CodArticle: `H0K410129-${sufijo}`, descripcion, cantidad: 2 };
  const lote = prepararLote(fecha, [linea]);
  expect(lote.lineas[0]).toMatchObject({ estado: 'validado', corteMm: [ancho, 1000] });
  const cuerpo = lote.programas.find(p => p.entidades.circulos.length > 0);
  expect(cuerpo.entidades.circulos).toHaveLength(2 * agujeros);
  expect(cuerpo.largoMm).toBe(ancho + (juntas ? tapa[0] : 0));
  expect(lote.cortador.map(f => [f.material, f.unidades, f.pedidas, f.cuadra])).toEqual([
    ['Lona 3 mm', 2, 2, true], ['PLASTEL 8800 TE62 negra', 6, 6, true],
  ]);
});

it.each([
  ['0053', 'TOP CURTAIN TWP WB300xWT250x3100 BLACK', 3100, 900, 7, [320, 340], 300, 3100, 1240],
  ['0112', 'PLANE TWP OBEN WB400xWT300xB=2500 PVC BLACK', 2500, 1100, 6, [370, 440], 400, 2870, 1100],
  ['0115', 'PLANE TWP OBEN WB400xWT400xB=2550 MATTE PVC BLACK', 2550, 1300, 6, [470, 440], 400, 2550, 1740],
])('corta las variantes altas del superior 410129-%s con su colocación de tapas', (sufijo, descripcion, ancho, alto, agujeros, tapa, anchoFrente, largoBloque, altoBloque) => {
  const linea = { ...cortinas[0], CodArticle: `H0K410129-${sufijo}`, descripcion, cantidad: 1 };
  const lote = prepararLote(fecha, [linea]);
  expect(lote.lineas[0]).toMatchObject({ estado: 'validado', corteMm: [ancho, alto] });
  const cuerpo = lote.programas.find(p => p.entidades.circulos.length > 0);
  expect(cuerpo.entidades.circulos).toHaveLength(agujeros);
  expect(cuerpo).toMatchObject({ largoMm: largoBloque, anchoOcupadoMm: altoBloque, piezas: 3 });
  const largoCierre = largoBloque === ancho ? 2 * tapa[0] : tapa[0];
  expect(cuerpo.entidades.lineas.some(l => Math.abs(l.x1 - l.x2) === largoCierre && l.y1 === l.y2)).toBe(true);
  expect(lote.programas.find(p => p.material === 'Lona 3 mm').anchoOcupadoMm).toBe(anchoFrente);
});

it('corta la 410129-0212 con las tapas unidas al borde del cuerpo de PLASTEL', () => {
  const linea = { ...cortinas[0], CodArticle: '0K410129-0212', cantidad: 8,
    descripcion: 'Top PVC WB300xWT250X1900 black' };
  const lote = prepararLote(fecha, [linea]);
  expect(lote.lineas[0]).toMatchObject({ estado: 'validado', corteMm: [1900, 900] });
  expect(lote.cortador.map(f => [f.material, f.unidades, f.pedidas, f.cuadra])).toEqual([
    ['Lona 3 mm', 8, 8, true], ['PLASTEL 8800 TE62 negra', 24, 24, true],
  ]);
  const cuerpos = lote.programas.find(p => p.material === 'PLASTEL 8800 TE62 negra');
  expect(cuerpos).toMatchObject({ largoMm: 2220, anchoOcupadoMm: 1800, piezas: 6, repeticiones: 4 });
  expect(cuerpos.entidades.circulos).toHaveLength(8);
  expect(cuerpos.entidades.lineas).toContainEqual({ capa: 'DISCO1', x1: 0, y1: 0, x2: 2220, y2: 0 });
});

it.each([
  ['0108', 3200, 7, 2],
  ['0109', 3400, 8, 3],
])('corta el superior 410135-%s con los frentes enfrentados hacia dentro', (sufijo, largo, agujeros, cantidad) => {
  const linea = { ...cortinas[0], CodArticle: `H0K410135-${sufijo}`, cantidad,
    descripcion: `PLANE TWP OBEN WB300XWT300X${largo} OP=600 SCHWARZ SCHWARZ` };
  const lote = prepararLote(fecha, [linea]);
  expect(lote.lineas[0]).toMatchObject({ estado: 'validado', corteMm: [largo, 1000] });
  const cuerpo = lote.programas.find(p => p.material === 'PLASTEL 8800 TE62 negra');
  expect(cuerpo).toMatchObject({ largoMm: largo + 340, anchoOcupadoMm: 2000, piezas: 6 });
  expect(cuerpo.entidades.circulos).toHaveLength(agujeros * 2);
  const frente = lote.programas.find(p => p.material === 'Lona 3 mm');
  expect(frente).toMatchObject({ anchoOcupadoMm: 1150, piezas: 2 });
  expect(frente.entidades.lineas).toContainEqual({ capa: 'CUTTER', x1: 300, y1: 575, x2: largo - 300, y2: 575 });
  expect(frente.entidades.circulos.map(c => c.y).sort((a, b) => a - b)).toEqual([320, 320, 830, 830]);
  expect(lote.cortador.map(f => [f.material, f.unidades, f.pedidas, f.cuadra])).toEqual([
    ['Lona 3 mm', cantidad, cantidad, true], ['PLASTEL 8800 TE62 negra', cantidad * 3, cantidad * 3, true],
  ]);
});

it.each([
  ['410130-0004', 'PLANE SC SEITLICH300X300X2900 ANFAHRSTREIFEN:WEIßS', 2900, 50, 50, 100],
  ['410130-0017', 'SC SIDE CURTAIN 300X300X2500 PARK GUIDE=WHITE', 2500, 60, 10, 50],
])('corta el lateral %s con las marcas de su maestro', (codigo, descripcion, largo, inicio, fin, marca) => {
  const linea = { ...cortinas[0], CodArticle: `H0K${codigo}`, descripcion, cantidad: 4 };
  const lote = prepararLote(fecha, [linea]);
  expect(lote.lineas[0]).toMatchObject({ estado: 'validado', corteMm: [largo, 1000] });
  const cuerpo = lote.programas.find(p => p.nombrePiezas === 'cuerpos');
  expect(cuerpo.entidades.lineas.filter(l => l.capa === 'ROTULADOR' && l.y1 < 1000)
    .map(l => [l.x1, l.x2])).toEqual([
    [inicio, inicio + marca], [inicio, inicio + marca],
    [largo - fin, largo - fin - marca], [largo - fin, largo - fin - marca],
  ]);
  expect(lote.cortador.map(f => [f.material, f.unidades, f.pedidas, f.cuadra])).toEqual([
    ['Lona 3 mm', 4, 4, true], ['PLASTEL 8800 TE62 negra', 4, 4, true], ['PVC 900 g negro', 8, 8, true],
  ]);
});

it.each([
  ['410130-0165', 'PLANE SC SEITLICH WB300xWT250xH2500 PARKING GUIDE WHITE/STANDARD (750mm)', 2500, 900, [320, 340], [324.1, 340], 1600],
  ['410130-0166', 'PLANE SC SEITLICH WB300 X WT300 X H2450 PARKING GUIDE WHITE/STANDAR (750MM)', 2450, 1000, [340, 370], [340, 373], 1000],
])('corta por separado las tapas lisas y perforadas de la %s', (codigo, descripcion, largo, alto, lisa, perforada, anchoFrente) => {
  const linea = { ...cortinas[0], CodArticle: `H0K${codigo}`, descripcion, cantidad: 8 };
  const lote = prepararLote(fecha, [linea]);
  expect(lote.lineas[0]).toMatchObject({ estado: 'validado', corteMm: [largo, alto] });
  const tapas = lote.programas.filter(p => p.material === 'PVC 900 g negro');
  expect(tapas.map(p => [p.largoMm, p.anchoOcupadoMm, p.piezas, p.entidades.circulos.length]))
    .toEqual([[perforada[0], perforada[1] * 8, 8, 48], [lisa[0], lisa[1] * 8, 8, 0]]);
  expect(lote.programas.filter(p => p.material === 'Lona 3 mm').every(p => p.anchoRolloMm === anchoFrente)).toBe(true);
  expect(lote.cortador.find(f => f.material === 'PVC 900 g negro')).toMatchObject({ unidades: 16, pedidas: 16, cuadra: true });
});

it.each([
  ['410130-0003', 'PLANE SC SEITLICH300X300X2800ANFAHRSTREIFEN:WEIß:S', 2, 2800, [170, 270, 910, 1010]],
  ['410130-0015', 'SC SIDE CURTAIN 00X300X2650 PARKING GUIDE:WHITE/ST', 4, 2650, [540, 640, 1280, 1380, 2020, 2120, 2760, 2860]],
  ['410130-0169', 'PLANE SC SEITLICH WB300XWT300XH3400 PARKIING GUIDE WHITE/STANDARD (750MM)', 2, 3400, [910, 1010, 1283, 1383]],
  ['410130-0171', 'PLANE SC SEITLICH WB300 X WT300 X H4300 PARKING GUIDE WHITE / STANDARD (750MM)', 4, 4300,
    [910, 1010, 1283, 1383, 2396, 2496, 2769, 2869]],
])('conserva el orden y la altura de las tapas de %s', (codigo, descripcion, cantidad, largo, ys) => {
  const linea = { ...cortinas[0], CodArticle: `H0K${codigo}`, descripcion, cantidad };
  const lote = prepararLote(fecha, [linea]);
  expect(lote.lineas[0]).toMatchObject({ estado: 'validado', corteMm: [largo, 1000] });
  const tapas = lote.programas.find(p => p.material === 'PVC 900 g negro');
  expect([...new Set(tapas.entidades.circulos.map(c => c.y))].sort((a, b) => a - b)).toEqual(ys);
  expect(lote.cortador.find(f => f.material === 'PVC 900 g negro')).toMatchObject({
    unidades: 2 * cantidad, pedidas: 2 * cantidad, cuadra: true,
  });
});

it.each([
  ['410130-0098', 'PLANE SC SEITLICH 300X300X2700 PKG WHITE/CONTINUOUSLLY H=2700', 2700, 1000, 300, true],
  ['410130-0170', 'PLANE SC SEITLICH WB300xWT300xH2780 PARKING GUIDE YELLOW RAL 1021/STANDARD (750MM)', 2780, 1000, 300, false],
  ['410130-0172', 'PLANE SC SEITLICH WB350XWT300XH2780 PARKIING GUIDE YELLOW RAL1021/STANDARD (750MM)', 2780, 1050, 350, false],
  ['410130-0173', 'PLANE SC SEITLICH 300X300X3100 PARKING GUIDE WHITE/CONTINUOSUSLY WITH H=3100mm', 3100, 1000, 300, true],
])('conserva la guía de aparcamiento del lateral %s', (codigo, descripcion, largo, alto, anchoFrente, continua) => {
  const linea = { ...cortinas[0], CodArticle: `H0K${codigo}`, descripcion, cantidad: 2 };
  const lote = prepararLote(fecha, [linea]);
  expect(lote.lineas[0]).toMatchObject({ estado: 'validado', corteMm: [largo, alto] });
  expect(lote.programas.every(p => p.anchoOcupadoMm <= p.anchoRolloMm)).toBe(true);
  const frente = lote.programas.find(p => p.material === 'Lona 3 mm');
  expect(frente.anchoOcupadoMm).toBe(anchoFrente * 2);
  const marcas = frente.entidades.lineas.filter(l => l.capa === 'ROTULADOR');
  if (continua) expect(marcas.map(l => l.x2 - l.x1)).toEqual(Array(4).fill(largo - 50));
  else expect(frente.entidades.textos.filter(t => t.capa === 'ROTULADOR').map(t => t.valor)).toEqual(['A', 'A']);
});

it('corta las tapas de la 410130-0167 giradas y los cuerpos de uno en uno', () => {
  const linea = { ...cortinas[0], CodArticle: 'H0K410130-0167', cantidad: 2,
    descripcion: 'PLANE SC SEITLICH WB400xWT300xH2900 PARKING GUIDE YELLOW RAL 1021 STANDARD (750mm)' };
  const lote = prepararLote(fecha, [linea]);
  expect(lote.lineas[0]).toMatchObject({ estado: 'validado', corteMm: [2900, 1100] });
  expect(lote.programas).toEqual(expect.arrayContaining([
    expect.objectContaining({ nombrePiezas: 'cuerpos', anchoOcupadoMm: 1100, repeticiones: 2 }),
    expect.objectContaining({ nombrePiezas: 'tapas perforadas', largoMm: 373, anchoOcupadoMm: 880, piezas: 2 }),
    expect.objectContaining({ nombrePiezas: 'tapas lisas', largoMm: 370, anchoOcupadoMm: 880, piezas: 2 }),
    expect.objectContaining({ nombrePiezas: 'frentes con marca amarilla RAL 1021', anchoOcupadoMm: 800, piezas: 2 }),
  ]));
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

it('corta la 410143-0006 con tapas de 420 mm y el frente del maestro', () => {
  const linea = { ...cortinas[0], CodArticle: 'H0K410143-0006', cantidad: 5,
    descripcion: 'PLANE TWP OBEN TWB250XTWT350XB3100 OP=600 PVC BLACK 2MM REINFORCED' };
  const lote = prepararLote(fecha, [linea]);
  expect(lote.lineas[0]).toMatchObject({ estado: 'validado', corteMm: [3100, 1050] });
  expect(lote.cortador.map(f => [f.material, f.unidades, f.pedidas, f.cuadra])).toEqual([
    ['Lona 2 mm', 15, 15, true], ['Lona 3 mm', 5, 5, true],
  ]);
  const [cuerpo, doble, suelto] = lote.programas;
  expect(cuerpo).toMatchObject({ largoMm: 3390, anchoOcupadoMm: 1050, piezas: 3, repeticiones: 5 });
  expect(cuerpo.entidades.circulos).toHaveLength(7);
  expect(cuerpo.entidades.circulos.every(c => c.y === 200)).toBe(true);
  expect([doble.anchoOcupadoMm, suelto.anchoOcupadoMm]).toEqual([1150, 575]);
  expect(suelto.entidades.circulos.map(c => [c.x, c.y])).toEqual([[450, 270], [2650, 270]]);
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

it('apila la 410182-0031 de dos en dos y prepara dos tapas de PVC por cuerpo', () => {
  const linea = { ...cortinas[0], CodArticle: 'H0K410182-0031', cantidad: 45,
    descripcion: 'PLANE OBEN 2MM SC WB=300 WT=300 B=2500 SCHWARZ' };
  const lote = prepararLote(fecha, [linea]);
  expect(lote.lineas[0]).toMatchObject({ estado: 'validado', corteMm: [2500, 1000] });
  expect(lote.cortador.map(f => [f.material, f.unidades, f.pedidas, f.cuadra])).toEqual([
    ['Lona 2 mm', 45, 45, true], ['PVC 900 g negro', 90, 90, true],
  ]);
  const cuerpos = lote.programas.filter(p => p.nombrePiezas === 'cuerpos');
  expect(cuerpos.map(p => [p.repeticiones, p.piezas, p.anchoRolloMm]))
    .toEqual([[22, 2, 2040], [1, 1, 2040]]);
  expect(cuerpos[1].entidades.circulos.map(c => [c.capa, c.x, c.y, c.r]))
    .toEqual([400, 740, 1080, 1420, 1760, 2100].map(x => ['CUTTER', x, 150, 20]));
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
  ['410129-0051', /marcas laterales.*faltan/],
  ['410129-0205', /marcas laterales.*faltan/],
  ['410129-0206', /marcas laterales.*faltan/],
  ['410143-0004', /300 mm.*400 mm/],
  ['410143-0005', /300 mm.*400 mm/],
  ['410186-0001', /400 mm.*416,2 mm/],
  ['410187-0001', /400 mm.*416,2 mm/],
  ['410174-0060', /tiras marcadas/],
  ['410179-0053', /disco.*cuchilla/],
  ['410245-0005', /letra D.*rotulador/],
  ['410123-0005', /580 g.*650 g/],
  ['410241-0007', /580 g.*650 g/],
  ['410242-0003', /580 g.*650 g/],
  ['410245-0002', /580 g.*650 g/],
  ['410251-0002', /580 g.*650 g/],
])('muestra por qué %s requiere una decisión de taller', (codigo, motivo) => {
  const lote = prepararLote(fecha, [{ ...cortinas[0], CodArticle: `H0K${codigo}` }]);
  expect(lote.lineas[0]).toMatchObject({ estado: 'a-mano', motivos: [expect.stringMatching(motivo)] });
  expect(lote.programas).toEqual([]);
});

it.each(['410121-0001', '410129-0200', '410182-0038'])('explica que el pedido de %s no tiene un corte localizado', codigo => {
  const lote = prepararLote(fecha, [{ ...cortinas[0], CodArticle: `H0K${codigo}` }]);
  expect(lote.lineas[0]).toMatchObject({ estado: 'a-mano', motivos: ['Sin corte de taller para contrastar.'] });
  expect(lote.programas).toEqual([]);
});
