import cuerpos from './cuerposCortinas410.json' with { type: 'json' };
import { MATERIAL_COMBURSA, entidadesVacias, desplazarEntidades, unirEntidades } from './faseA.js';

const lona1 = { nombre: 'Lona 1 mm', anchoRolloMm: 1500 };
const lona2 = { nombre: 'Lona 2 mm', anchoRolloMm: 2100 };
const lona3 = { nombre: 'Lona 3 mm', anchoRolloMm: 1600 };
const pvc = { nombre: 'PVC 900 g negro', anchoRolloMm: 3000 };
const alpha = { nombre: 'ALPHA negro 580 g', anchoRolloMm: 2500 };

const rectangulo = (capa, largo, alto) => [
  [capa, 0, 0, 0, alto], [capa, largo, 0, largo, alto], [capa, 0, alto, largo, alto],
];
const marcasLaterales = (x, fin, alturas = [300, 600]) => alturas.map(y => ['ROTULADOR', x, y, fin, y]);
const agujerosDeCuerpo = (ancho, cantidad, y, margen = 400) =>
  Array.from({ length: cantidad }, (_, i) => ['CUTTER', margen + i * (ancho - 2 * margen) / (cantidad - 1), y, 20]);
const grupo = (material, nombre, piezasPorGrupo, porTirada, medidasMm, operaciones, gruposPorUnidad = 1) =>
  ({ material, nombre, piezasPorGrupo, gruposPorUnidad, porTirada, medidasMm, operaciones });

function cuerpoReforzado(ancho, alto, agujeros, margen, { alturaAgujeros = 150, marcaInferior = 350 } = {}) {
  const alturas = [marcaInferior, alto - marcaInferior];
  return [
    ...rectangulo('CUTTER', ancho, alto), ...agujerosDeCuerpo(ancho, agujeros, alturaAgujeros, margen),
    ...marcasLaterales(0, 20, alturas), ...marcasLaterales(ancho, ancho - 20, alturas),
  ];
}

function superiorConTapasPvc(ancho, agujeros, alturaAgujeros, anchoRolloMm, porTirada) {
  return [
    grupo({ ...lona2, anchoRolloMm }, 'cuerpos', 1, porTirada, [ancho, 1000], [
      ...rectangulo('CUTTER', ancho, 1000), ...agujerosDeCuerpo(ancho, agujeros, alturaAgujeros),
    ]),
    grupo(pvc, 'tapas lisas', 1, 8, [340, 370], rectangulo('DISCO1', 340, 370), 2),
  ];
}

function superiorPerforada(ancho, {
  alto = 900, agujeros = 4, tapa = [320, 340], tapasJuntas = false, cerrarBase = false, frentesPorTirada = 5,
  alturaAgujeros = alto === 900 ? 800 : 850, anchoFrente = 300, tapasArriba = false,
} = {}) {
  const alturas = [(alto - anchoFrente) / 2, (alto + anchoFrente) / 2];
  const [anchoTapa, altoTapa] = tapa;
  const cuerposPorTirada = Math.floor(MATERIAL_COMBURSA.anchoRolloMm / alto);
  const operaciones = [
    ...rectangulo('DISCO1', ancho, alto), ...marcasLaterales(0, 20, alturas), ...marcasLaterales(ancho, ancho - 20, alturas),
    ...agujerosDeCuerpo(ancho, agujeros, alturaAgujeros),
  ];
  const frente = grupo(lona3, 'frentes', 1, Math.min(frentesPorTirada, Math.floor(lona3.anchoRolloMm / anchoFrente)),
    [ancho, anchoFrente], rectangulo('CUTTER', ancho, anchoFrente));
  if (tapasArriba) {
    const cortesTapas = tapasEnFilas(2, anchoTapa, 1, altoTapa, 'DISCO1')
      .map(([capa, x1, y1, x2, y2]) => [capa, x1, y1 + alto, x2, y2 + alto]);
    if (cerrarBase) cortesTapas.push(['DISCO1', 0, 0, ancho, 0]);
    return [grupo(MATERIAL_COMBURSA, 'juegos de cuerpo y 2 tapas', 3, 1, [ancho, alto + altoTapa],
      [...operaciones, ...cortesTapas]), frente];
  }
  if (tapasJuntas) {
    return [
      {
        ...grupo(MATERIAL_COMBURSA, 'juegos de cuerpo y 2 tapas', 3, cuerposPorTirada, [ancho, alto], operaciones),
        tapasJuntoAlCuerpo: { ancho: anchoTapa, alto: altoTapa, capa: 'DISCO1', cerrarBase },
      },
      frente,
    ];
  }
  return [
    grupo(MATERIAL_COMBURSA, 'cuerpos', 1, cuerposPorTirada, [ancho, alto], operaciones),
    grupo(MATERIAL_COMBURSA, 'tapas', 1, Math.floor(MATERIAL_COMBURSA.anchoRolloMm / altoTapa),
      tapa, rectangulo('DISCO1', anchoTapa, altoTapa), 2),
    frente,
  ];
}
function contornoLateral(capa, largo, alto, inicio, fin) {
  return [
    [capa, 0, alto, largo, alto], [capa, largo, 0, largo, alto],
    [capa, 0, 0, 50, inicio], [capa, 50, inicio, 50, fin], [capa, 50, fin, 0, alto],
  ];
}

function lateral(largo, alto, [marcaInicio, marcaFin, longitudMarca], tapa, nombreFrente, frentesPorTirada,
  { material = lona3, ancho = 300, continua = false, rotulo } = {}) {
  const [inicio, fin] = [(alto - ancho) / 2, (alto + ancho) / 2], alturas = [inicio, fin];
  const cuerpo = grupo(MATERIAL_COMBURSA, 'cuerpos', 1, Math.floor(MATERIAL_COMBURSA.anchoRolloMm / alto), [largo, alto], [
    ...contornoLateral('DISCO1', largo, alto, inicio, fin),
    ...marcasLaterales(marcaInicio, marcaInicio + longitudMarca, alturas),
    ...marcasLaterales(largo - marcaFin, largo - marcaFin - longitudMarca, alturas),
  ]);
  const tapas = tapa.lisa ? tapasPvcSeparadas(tapa)
    : [{ ...grupo(pvc, 'pares de tapas (lisa y perforada)', 2, 4, [tapa.ancho, tapa.alto + (tapa.altoLisa ?? tapa.alto)]), tapa }];
  const largoFrente = largo - 50, y0 = (ancho - 100) / 2, y1 = y0 + 100;
  const marcas = continua ? [
    ['ROTULADOR', 0, y0, largoFrente, y0], ['ROTULADOR', 0, y1, largoFrente, y1],
  ] : [
    ['ROTULADOR', 350, y0, 350, y1], ['ROTULADOR', 350, y0, 1100, y0],
    ['ROTULADOR', 350, y1, 1100, y1], ['ROTULADOR', 1100, y0, 1100, y1],
  ];
  const frente = grupo(material, nombreFrente, 1, frentesPorTirada, [largoFrente, ancho], [
    ...rectangulo('CUTTER', largoFrente, ancho), ...marcas,
  ]);
  return [cuerpo, ...tapas, rotulo ? {
    ...frente, rotulos: [{ valor: rotulo, x: 355.2732, y: y0 + 4.4298, giro: 0 }],
  } : frente];
}

function tapasPvcSeparadas({ ancho, alto, xs, ys, lisa: [anchoLisa, altoLisa] }) {
  return [
    grupo(pvc, 'tapas perforadas', 1, Math.floor(pvc.anchoRolloMm / alto), [ancho, alto], [
      ...rectangulo('DISCO1', ancho, alto), ...xs.flatMap(x => ys.map(y => ['CUTTER', x, y, 20])),
    ]),
    grupo(pvc, 'tapas lisas', 1, Math.floor(pvc.anchoRolloMm / altoLisa), [anchoLisa, altoLisa],
      rectangulo('DISCO1', anchoLisa, altoLisa)),
  ];
}

const lateralConMuestra = [
  {
    ...grupo(lona2, 'cuerpos', 1, 2, [2900, 1000], contornoLateral('CUTTER', 2900, 1000, 350, 650)),
    marcasDeMuestra: [400, 1150].flatMap((x, i) => [450, 550].flatMap((y, j) => [
      ['ROTULADOR', x, y, x + (i ? -20 : 20), y], ['ROTULADOR', x, y, x, y + (j ? -20 : 20)],
    ])),
  },
  {
    ...grupo(pvc, 'pares de tapas (lisa y perforada)', 2, 4, [340, 744]),
    tapa: { ancho: 340, alto: 374, altoLisa: 370, travesano: 'DISCO1', xs: [70, 170, 270], ys: [170, 270] },
  },
];
const solapas = grupo(lona1, 'juegos de 8 solapas lisas y 4 marcadas', 12, 1, [1400, 1200], [
  ...[0, 350, 700, 1050, 1400].map(x => ['DISCO1', x, 0, x, 1200]),
  ...[400, 800, 1200].map(y => ['DISCO1', 0, y, 1400, y]),
  ...[0, 350].flatMap(x => [150, 250, 550, 650].map(y => ['ROTULADOR', x, y, x + 350, y])),
]);

const tramosDisco = puntos => puntos.slice(1).map((punto, i) => ['DISCO1', ...puntos[i], ...punto]);
const techoConEntrante = [
  {
    ...grupo(alpha, 'pares A1 y A2', 2, 1, [864, 2100], [
      ...tramosDisco([[22, 0], [22, 10], [0, 32], [0, 2068], [22, 2090], [22, 2100], [864, 2100]]),
      ...tramosDisco([[842, 0], [842, 10], [864, 32], [864, 2068], [842, 2090], [842, 2100]]),
      ...tramosDisco([[432, 0], [432, 820], [232, 820], [232, 1280], [432, 1280], [432, 2100]]),
      ...tramosDisco([[432, 1280], [632, 1280], [632, 820], [432, 820]]),
    ]),
    rotulos: [
      { valor: 'A1', x: 437.151, y: 2094.901, giro: 270 },
      { valor: 'A2', x: 414.935, y: 2096.169, giro: 270 },
    ],
  },
  {
    ...grupo(alpha, 'frentes A3', 1, 7, [3330, 320], [
      ...tramosDisco([[25, 0], [25, 10], [0, 35], [0, 285], [25, 310], [25, 320],
        [3305, 320], [3305, 310], [3330, 285], [3330, 35], [3305, 10], [3305, 0]]),
      ...[425, 1225, 1425, 1905, 2105, 2905].map(x => ['ROTULADOR', x, 10, x, 20]),
    ]),
    rotulos: [{ valor: 'A3', x: 8.454, y: 274.034, giro: 0 }],
  },
];

function frenteConAbertura(ancho, borde, base, fondo, marcarPliegue = true) {
  const alto = base + fondo;
  return [
    ['CUTTER', 0, 0, 0, base], ['CUTTER', 0, base, borde, base],
    ['CUTTER', borde, base, borde, alto], ['CUTTER', borde, alto, ancho - borde, alto],
    ['CUTTER', ancho - borde, alto, ancho - borde, base], ['CUTTER', ancho - borde, base, ancho, base],
    ['CUTTER', ancho, base, ancho, 0], ...(marcarPliegue ? [['ROTULADOR', borde, base, ancho - borde, base]] : []),
    ...[borde + 200, ancho - borde - 200].flatMap(x => [
      ['CUTTER', x, base + 20, x, alto], ['ROTULADOR', x, base + 20, 4],
    ]),
  ];
}

function tapasEnFilas(columnas, ancho, filas, altoTapa = 370, capa = 'CUTTER') {
  const largo = columnas * ancho, alto = filas * altoTapa;
  return [
    ...Array.from({ length: columnas + 1 }, (_, i) => [capa, i * ancho, 0, i * ancho, alto]),
    ...Array.from({ length: filas }, (_, i) => [capa, 0, (i + 1) * altoTapa, largo, (i + 1) * altoTapa]),
  ];
}

function superiorConAbertura(ancho, {
  altoCuerpo, agujeros, porTirada, anchoTapa, tapasEnDosFilas, borde, fondo,
  alturaAgujeros, marcaInferior, tapasJuntas, cerrarFrenteSuelto = true,
}) {
  const operaciones = cuerpoReforzado(ancho, altoCuerpo, agujeros, undefined, { alturaAgujeros, marcaInferior });
  const frente = grupo(lona3, 'frentes con abertura', 1, porTirada, [ancho, borde + fondo],
    frenteConAbertura(ancho, borde, borde, fondo));
  const frentes = porTirada === 2 ? { ...frente, frentesEnfrentados: true, cerrarFrenteSuelto } : frente;
  if (tapasJuntas) {
    return [
      { ...grupo(lona2, 'juegos de cuerpo y 2 tapas', 3, 1, [ancho, altoCuerpo], operaciones), tapasJuntoAlCuerpo: tapasJuntas },
      frentes,
    ];
  }
  const cuerpo = grupo(lona2, 'cuerpos', 1, porTirada, [ancho, altoCuerpo], operaciones);
  const tapas = tapasEnDosFilas
    ? { ...grupo(lona2, 'pares de tapas', 2, 7, [anchoTapa, 740], []), anchoTapa }
    : grupo(lona2, 'pares de tapas', 2, 1, [2 * anchoTapa, 370], tapasEnFilas(2, anchoTapa, 1));
  return [cuerpo, tapas, frentes];
}

const superiorConTapasJuntas = [
  {
    ...grupo(lona2, 'juegos de cuerpo y 2 tapas', 3, 2, [2500, 1000], cuerpoReforzado(2500, 1000, 7, 150)),
    tapasJuntoAlCuerpo: { ancho: 340, alto: 370, capa: 'CUTTER' },
  },
  {
    ...grupo(lona3, 'frentes', 1, 2, [2500, 575], [
      ...rectangulo('CUTTER', 2500, 575),
      ...[200, 2300].flatMap(x => [['CUTTER', x, 0, x, 255], ['ROTULADOR', x, 255, 4]]),
    ]),
    cerrarSiSuelto: true,
  },
];

function superiorPlastelConAbertura(ancho, agujeros) {
  const [cuerpo] = superiorPerforada(ancho, { alto: 1000, agujeros, tapa: [340, 370], tapasJuntas: true, alturaAgujeros: 150 });
  return [cuerpo, {
    ...grupo(lona3, 'frentes con abertura', 1, 2, [ancho, 575], frenteConAbertura(ancho, 300, 300, 275, false)),
    frentesEnfrentados: 'centro',
  }];
}

function cortarFrentesEnfrentados(n, largo, alto, operaciones, cerrarFrenteSuelto, ladoBocas) {
  if (n === 1) return entidadesDe(cerrarFrenteSuelto ? [...operaciones, ['CUTTER', 0, 0, largo, 0]] : operaciones);
  const invertir = (x, y) => [largo - x, alto - y];
  const invertidas = operaciones.filter(([, , y1, , y2]) => y1 !== alto || y2 !== alto)
    .map(([capa, x1, y1, x2, y2]) => y2 === undefined
      ? [capa, ...invertir(x1, y1), x2]
      : [capa, ...invertir(x1, y1), ...invertir(x2, y2)]);
  const alCentro = ladoBocas === 'centro';
  const entidades = entidadesDe(alCentro ? [...operaciones, ['CUTTER', 0, 2 * alto, largo, 2 * alto]]
    : [...invertidas, ['CUTTER', 0, alto, largo, alto]]);
  unirEntidades(entidades, desplazarEntidades(entidadesDe(alCentro ? invertidas : operaciones), 0, alto));
  return entidades;
}

function conMano(codigo, derecha) {
  const { medidasMm, operaciones } = cuerpos[codigo];
  const x = n => derecha ? n : 2600 - n;
  return [
    grupo(lona2, 'juegos de cuerpo y 2 tapas', 3, 1, medidasMm, operaciones),
    grupo(lona1, 'tiras', 1, 3, [2600, 416.2], [
      ['DISCO1', x(2600), 416.2, x(0), 416.2], ['DISCO1', x(2600), 0, x(2600), 416.2],
      ['DISCO1', x(50), 0, x(50), 50], ['DISCO1', x(50), 50, x(0), 366.2],
      ['DISCO1', x(0), 366.2, x(0), 416.2],
    ]),
    solapas,
  ];
}

const modelos = {
  '410124-0003': {
    descripcion: 'TOP PVC 0,5MM GLOSSY BLK TNB2080XTWB300XTWT400_W/O OP_480X200_OPEN RECESS',
    fichero: 'HOK410124.dwg', medidasMm: [3330, 320], grupos: techoConEntrante,
  },
  '410129-0010': {
    descripcion: 'PLANE TWP OBEN 300X300X1900',
    fichero: 'OK410129.dwg', medidasMm: [1900, 1000],
    grupos: superiorPerforada(1900, { alto: 1000, tapa: [370, 340] }),
  },
  '410129-0013': {
    descripcion: 'TOP CURTAIN TWP 300X300X2250',
    fichero: 'OK410129.dwg', medidasMm: [2250, 1000],
    grupos: superiorPerforada(2250, { alto: 1000, agujeros: 5, tapa: [340, 370], tapasJuntas: true }),
  },
  '410129-0015': {
    descripcion: 'PLANE TWP OBEN 300X300X2600',
    fichero: 'OK410129.dwg', medidasMm: [2600, 1000],
    grupos: superiorPerforada(2600, { alto: 1000, agujeros: 6, tapa: [340, 370], tapasJuntas: true }),
  },
  '410129-0052': {
    descripcion: 'TOP CURTAIN TWP 300X300X3200 U=BLACK/A=BLACK',
    fichero: 'OK410129.dwg', medidasMm: [3200, 1000],
    grupos: superiorPerforada(3200, { alto: 1000, agujeros: 8, tapa: [340, 370], tapasJuntas: true }),
  },
  '410129-0053': {
    descripcion: 'TOP CURTAIN TWP WB300XWT250X3100 BLACK',
    fichero: 'OK410129.dwg', medidasMm: [3100, 900],
    grupos: superiorPerforada(3100, { agujeros: 7, tapasArriba: true, cerrarBase: true }),
  },
  '410129-0056': {
    descripcion: 'TOP CURTAIN TWP 300X300X1850 U=BLACK/A=BLANCK',
    fichero: 'OK410129.dwg', medidasMm: [1850, 1000], grupos: superiorPerforada(1850, { alto: 1000, tapa: [340, 370] }),
  },
  '410129-0091': {
    descripcion: 'PLANE TWP OBEN 300X300X3600 PVC SCHWARZ',
    fichero: 'OK410129.dwg', medidasMm: [3600, 1000],
    grupos: superiorPerforada(3600, { alto: 1000, agujeros: 9, tapa: [340, 370] }),
  },
  '410129-0112': {
    descripcion: 'PLANE TWP OBEN WB400XWT300XB=2500 PVC BLACK',
    fichero: 'OK410129.dwg', medidasMm: [2500, 1100],
    grupos: superiorPerforada(2500, { alto: 1100, agujeros: 6, alturaAgujeros: 950,
      tapa: [370, 440], anchoFrente: 400, tapasJuntas: true, cerrarBase: true }),
  },
  '410129-0115': {
    descripcion: 'PLANE TWP OBEN WB400XWT400XB=2550 MATTE PVC BLACK',
    fichero: 'OK410129.dwg', medidasMm: [2550, 1300],
    grupos: superiorPerforada(2550, { alto: 1300, agujeros: 6, alturaAgujeros: 1050,
      tapa: [470, 440], anchoFrente: 400, tapasArriba: true }),
  },
  '410129-0117': {
    descripcion: 'TOP CURTAIN TWP TWB300XTWT250X2000',
    fichero: 'COMBURSA (CRAWFORD)2.dwg', medidasMm: [2000, 900], grupos: superiorPerforada(2000),
  },
  '410129-0209': {
    descripcion: 'PLANE TWP OBEN WB300XWT300X3400',
    fichero: 'OK410129.dwg', medidasMm: [3400, 1000],
    grupos: superiorPerforada(3400, { alto: 1000, agujeros: 9, tapa: [340, 370] }),
  },
  '410129-0212': {
    descripcion: 'TOP PVC WB300XWT250X1900 BLACK',
    fichero: 'OK410129.dwg', medidasMm: [1900, 900],
    grupos: superiorPerforada(1900, { tapasJuntas: true, cerrarBase: true, frentesPorTirada: 2 }),
  },
  '410130-0165': {
    descripcion: 'PLANE SC SEITLICH WB300XWT250XH2500 PARKING GUIDE WHITE/STANDARD (750MM)',
    fichero: 'OK410130.dwg', medidasMm: [2500, 900],
    grupos: lateral(2500, 900, [60, 10, 50],
      { ancho: 324.1, alto: 340, xs: [104.1, 204.1], ys: [70, 170, 270], lisa: [320, 340] }, 'frentes con marca blanca', 5),
  },
  '410130-0166': {
    descripcion: 'PLANE SC SEITLICH WB300 X WT300 X H2450 PARKING GUIDE WHITE/STANDAR (750MM)',
    fichero: 'OK410130.dwg', medidasMm: [2450, 1000],
    grupos: lateral(2450, 1000, [60, 10, 50],
      { ancho: 340, alto: 373, xs: [70, 170, 270], ys: [170, 270], lisa: [340, 370] },
      'frentes con marca blanca', 3, { material: { ...lona3, anchoRolloMm: 1000 } }),
  },
  '410130-0167': {
    descripcion: 'PLANE SC SEITLICH WB400XWT300XH2900 PARKING GUIDE YELLOW RAL 1021 STANDARD (750MM)',
    fichero: 'OK410130.dwg', medidasMm: [2900, 1100],
    grupos: lateral(2900, 1100, [60, 10, 50],
      { ancho: 373, alto: 440, xs: [103, 203], ys: [120, 220, 320], lisa: [370, 440] },
      'frentes con marca amarilla RAL 1021', 4, { ancho: 400 }),
  },
  '410130-0169': {
    descripcion: 'PLANE SC SEITLICH WB300XWT300XH3400 PARKIING GUIDE WHITE/STANDARD (750MM)',
    fichero: 'OK410130.dwg', medidasMm: [3400, 1000],
    grupos: lateral(3400, 1000, [60, 10, 50],
      { ancho: 340, alto: 373, altoLisa: 370, travesano: 'DISCO1', xs: [70, 170, 270], ys: [170, 270], lisasPorBloque: 2 },
      'frentes con marca blanca', 4),
  },
  '410130-0171': {
    descripcion: 'PLANE SC SEITLICH WB300 X WT300 X H4300 PARKING GUIDE WHITE / STANDARD (750MM)',
    fichero: 'OK410130.dwg', medidasMm: [4300, 1000],
    grupos: lateral(4300, 1000, [60, 10, 50],
      { ancho: 340, alto: 373, altoLisa: 370, travesano: 'DISCO1', xs: [70, 170, 270], ys: [170, 270], lisasPorBloque: 2 },
      'frentes con marca blanca', 4),
  },
  '410130-0098': {
    descripcion: 'PLANE SC SEITLICH 300X300X2700 PKG WHITE/CONTINUOUSLLY H=2700',
    fichero: 'OK410130.dwg', medidasMm: [2700, 1000],
    grupos: lateral(2700, 1000, [50, 10, 50],
      { ancho: 340, alto: 373, altoLisa: 370, travesano: 'DISCO1', xs: [70, 170, 270], ys: [170, 270], alternas: true },
      'frentes con marca blanca continua', 5, { continua: true }),
  },
  '410130-0170': {
    descripcion: 'PLANE SC SEITLICH WB300XWT300XH2780 PARKING GUIDE YELLOW RAL 1021/STANDARD (750MM)',
    fichero: 'OK410130.dwg', medidasMm: [2780, 1000],
    grupos: lateral(2780, 1000, [60, 10, 50],
      { ancho: 340, alto: 373, altoLisa: 370, travesano: 'DISCO1', xs: [70, 170, 270], ys: [170, 270], lisasPorBloque: 2 },
      'frentes con marca amarilla RAL 1021', 2, { rotulo: 'A' }),
  },
  '410130-0172': {
    descripcion: 'PLANE SC SEITLICH WB350XWT300XH2780 PARKIING GUIDE YELLOW RAL1021/STANDARD (750MM)',
    fichero: 'OK410130.dwg', medidasMm: [2780, 1050],
    grupos: lateral(2780, 1050, [60, 10, 50],
      { ancho: 390, alto: 373, altoLisa: 370, travesano: 'DISCO1', xs: [95, 195, 295], ys: [103, 203], alternas: true },
      'frentes con marca amarilla RAL 1021', 2, { ancho: 350, rotulo: 'A' }),
  },
  '410130-0173': {
    descripcion: 'PLANE SC SEITLICH 300X300X3100 PARKING GUIDE WHITE/CONTINUOSUSLY WITH H=3100MM',
    fichero: 'OK410130.dwg', medidasMm: [3100, 1000],
    grupos: lateral(3100, 1000, [50, 10, 50],
      { ancho: 340, alto: 373, altoLisa: 370, travesano: 'DISCO1', xs: [70, 170, 270], ys: [170, 270], alternas: true },
      'frentes con marca blanca continua', 4, { continua: true }),
  },
  '410130-0175': {
    descripcion: 'PLANE SC SEITLICH WB300XWT250XH2300 PARKING GUIDE WHITE/STANDARD (750MM)',
    fichero: 'COMBURSA (CRAWFORD)2.dwg', medidasMm: [2300, 900],
    grupos: lateral(2300, 900, [51.7486, 10, 50],
      { ancho: 324.1, alto: 340, travesano: 'DISCO1', recorteLisa: 4.1, xs: [104.1, 204.1], ys: [70, 170, 270] }, 'frentes con marca', 5),
  },
  '410130-0018': {
    descripcion: 'SC SIDE CURTAIN 300X300X2400 ANFAHRSTREIFEN: WEIS/STANDARD',
    fichero: 'OK410130.dwg', medidasMm: [2400, 1000],
    grupos: lateral(2400, 1000, [50, 50, 100],
      { ancho: 340, alto: 370, travesano: 'DISCO2', recorteLisa: 0, xs: [70, 170, 270], ys: [170, 270] }, 'frentes con marca blanca', 4),
  },
  '410130-0015': {
    descripcion: 'SC SIDE CURTAIN 00X300X2650 PARKING GUIDE:WHITE/ST',
    fichero: 'OK410130.dwg', medidasMm: [2650, 1000],
    grupos: lateral(2650, 1000, [50, 10, 50],
      { ancho: 340, alto: 370, travesano: 'DISCO1', xs: [70, 170, 270], ys: [170, 270], alternas: true }, 'frentes con marca blanca', 4),
  },
  '410130-0017': {
    descripcion: 'SC SIDE CURTAIN 300X300X2500 PARK GUIDE=WHITE',
    fichero: 'OK410130.dwg', medidasMm: [2500, 1000],
    grupos: lateral(2500, 1000, [60, 10, 50],
      { ancho: 340, alto: 370, travesano: 'DISCO1', recorteLisa: 0, xs: [70, 170, 270], ys: [170, 270] }, 'frentes con marca blanca', 5),
  },
  '410130-0006': {
    descripcion: 'SC SIDE CURTAIN 300X300X3000 ANFAHRSTREIFEN:WEI?/S',
    fichero: 'OK410130.dwg', medidasMm: [3000, 1000],
    grupos: lateral(3000, 1000, [50, 0, 50],
      { ancho: 340, alto: 370, travesano: 'DISCO1', recorteLisa: 0, xs: [70, 170, 270], ys: [170, 270], alternas: true }, 'frentes con marca blanca', 5),
  },
  '410130-0003': {
    descripcion: 'PLANE SC SEITLICH300X300X2800ANFAHRSTREIFEN:WEISS:S',
    fichero: 'OK410130.dwg', medidasMm: [2800, 1000],
    grupos: lateral(2800, 1000, [50, 50, 100],
      { ancho: 340, alto: 370, travesano: 'DISCO1', xs: [70, 170, 270], ys: [170, 270],
        alternas: true, perforadaPrimero: true }, 'frentes con marca blanca', 4),
  },
  '410130-0004': {
    descripcion: 'PLANE SC SEITLICH300X300X2900 ANFAHRSTREIFEN:WEISSS',
    fichero: 'OK410130.dwg', medidasMm: [2900, 1000],
    grupos: lateral(2900, 1000, [50, 50, 100],
      { ancho: 340, alto: 370, travesano: 'DISCO1', recorteLisa: 0, xs: [70, 170, 270], ys: [170, 270] }, 'frentes con marca blanca', 4),
  },
  '410134-0002': {
    descripcion: 'PLANE SC STANDARD 300X300X2500 OP=600 PVC SCHWARZ, REINFORCED',
    fichero: 'OK410134.dwg', medidasMm: [2500, 1000], grupos: superiorConTapasJuntas,
  },
  '410135-0108': {
    descripcion: 'PLANE TWP OBEN WB300XWT300X3200 OP=600 SCHWARZ SCHWARZ',
    fichero: 'OK410135.dwg', medidasMm: [3200, 1000], grupos: superiorPlastelConAbertura(3200, 7),
  },
  '410135-0109': {
    descripcion: 'PLANE TWP OBEN WB300XWT300X3400 OP=600 SCHWARZ SCHWARZ',
    fichero: 'OK410135.dwg', medidasMm: [3400, 1000], grupos: superiorPlastelConAbertura(3400, 8),
  },
  '410143-0002': {
    descripcion: 'PLANE SC IN COMPLETE WIDTH WB400XWT300XB3350 OP=600 PVC BACLK, 2MM REINFORCED',
    fichero: 'HOK410143.dwg', medidasMm: [3350, 1100], grupos: superiorConAbertura(3350, {
      altoCuerpo: 1100, agujeros: 8, porTirada: 1, anchoTapa: 440, borde: 400, fondo: 175,
    }),
  },
  '410143-0006': {
    descripcion: 'PLANE TWP OBEN TWB250XTWT350XB3100 OP=600 PVC BLACK 2MM REINFORCED',
    fichero: 'HOK410143.dwg', medidasMm: [3100, 1050],
    grupos: superiorConAbertura(3100, {
      altoCuerpo: 1050, agujeros: 7, alturaAgujeros: 200, marcaInferior: 400, porTirada: 2, borde: 250, fondo: 325,
      tapasJuntas: { ancho: 290, alto: 420, capa: 'CUTTER' }, cerrarFrenteSuelto: false,
    }),
  },
  '410143-0007': {
    descripcion: 'PLANE SC IN COMPLETE WIDTH WB300XWT300XB3000 OP=700 PVC BLACK, 2MM REINFORCED',
    fichero: 'HOK410143.dwg', medidasMm: [3000, 1000],
    grupos: superiorConAbertura(3000, {
      altoCuerpo: 1000, agujeros: 7, porTirada: 2, anchoTapa: 340, tapasEnDosFilas: true, borde: 300, fondo: 375,
    }),
  },
  '410170-0001': {
    descripcion: 'PLANE RIGHT SCHUPPEN/REINFORCED 2MM H=2600 SWB FRONT=400 SWB=300, SWT=300 PKG 750MM, SIMILAR DRAW. OK410173 BUT WITH SWB FRONT AND SWB REAR',
    fichero: 'OK410170.dwg', medidasMm: [2600, 1116.2], grupos: conMano('410170-0001', true),
  },
  '410171-0001': {
    descripcion: 'PLANE LEFT SCHUPOEN/REINFORCED 2MM H=2600 SWB FRONT=400 SWB REAR=300 SWT=300 PKG STD 750MM, SIMILAR DRAW. OK410172BUT WITH SWB FRONT AND SWB REAR',
    fichero: 'OK410171.dwg', medidasMm: [2600, 1116.2], grupos: conMano('410171-0001', false),
  },
  '410179-0054': {
    descripcion: 'PLANE 2MM WB=300 WT=300 H=2900 SCHWARZ PVC, WHITE PKG 750MM',
    fichero: 'OK410179.dwg', medidasMm: [2900, 1000], grupos: lateralConMuestra,
  },
  '410182-0031': {
    descripcion: 'PLANE OBEN 2MM SC WB=300 WT=300 B=2500 SCHWARZ',
    fichero: 'OK410182.dwg', medidasMm: [2500, 1000], grupos: superiorConTapasPvc(2500, 6, 150, 2040, 2),
  },
  '410182-0037': {
    descripcion: 'PLANE OBEN 2MM SC WB=300 WT=300 B=3100 SCHWARZ',
    fichero: 'OK410182.dwg', medidasMm: [3100, 1000], grupos: superiorConTapasPvc(3100, 8, 250, 1200, 1),
  },
};

const marcasLateralesSinConfirmar = 'El plano lleva marcas laterales que faltan en los cortes guardados. Falta confirmar si se rotulan.';
const hombrosSinConfirmar = 'El plano deja 300 mm a cada lado de la abertura del frente y el corte deja 400 mm. Falta confirmar la medida.';
const anchoTiraSinConfirmar = 'El corte de julio lleva una tira de 400 mm y el plano de 416,2 mm. Falta confirmar el ancho de corte.';
const gramajeSinConfirmar = 'El corte indica PVC negro de 580 g y la lona de la OF figura en RPS con 650 g. Falta confirmar qué lona se prepara.';
const pendientes = {
  '410123-0005': gramajeSinConfirmar,
  '410129-0002': marcasLateralesSinConfirmar,
  '410129-0005': 'La descripción de RPS indica 300 de largo y el dibujo de corte mide 3.000 mm. Falta confirmar el largo.',
  '410129-0051': marcasLateralesSinConfirmar,
  '410129-0205': marcasLateralesSinConfirmar,
  '410129-0206': marcasLateralesSinConfirmar,
  '410174-0049': 'Falta confirmar cuántas solapas lisas y tiras para rotular se cortan en lona de 1 mm por cortina.',
  '410129-0003': 'La misma referencia de RPS figura como puerta y como cortina. Falta confirmar el dibujo y el despiece.',
  '410129-0105': 'El maestro dibuja cinco agujeros y el corte real lleva seis. Taller tiene que confirmar el dibujo de corte.',
  '410143-0003': 'Los dos círculos pequeños del frente aparecen cortados en un lote y rotulados en otro. Falta confirmar la herramienta.',
  '410143-0004': hombrosSinConfirmar,
  '410143-0005': hombrosSinConfirmar,
  '410172-0104': 'Falta confirmar si la máquina separa las solapas de 1 mm o las marca para separarlas después.',
  '410173-0104': 'Falta confirmar si la máquina separa las solapas de 1 mm o las marca para separarlas después.',
  '410174-0060': 'Falta confirmar si las solapas se entregan separadas o en tiras marcadas.',
  '410179-0053': 'Un lote corta los cuerpos con disco y otro con cuchilla. Falta confirmar cómo cortar el cuerpo y si se perforan las tapas en máquina.',
  '410186-0001': anchoTiraSinConfirmar,
  '410187-0001': anchoTiraSinConfirmar,
  '410241-0007': gramajeSinConfirmar,
  '410241-0011': 'El plano marca D y el corte reciente marca D1 a D5. Falta confirmar qué rotular en las piezas.',
  '410242-0003': gramajeSinConfirmar,
  '410242-0004': 'El plano marca C y el corte reciente marca C1 a C5. Falta confirmar qué rotular en las piezas.',
  '410245-0002': gramajeSinConfirmar,
  '410245-0005': 'Un corte lleva la letra D en rotulador y otro solo como rótulo del plano. Falta confirmar si se marca la lona.',
  '410251-0002': gramajeSinConfirmar,
};

const sinCorteLocalizado = new Set([
  '410121-0001', '410122-0006', '410129-0116', '410129-0200', '410129-0213',
  '410130-0088', '410130-0176', '410130-0177', '410172-0107', '410182-0036',
  '410182-0038', '410185-0001', '410241-0014', '410242-0007',
]);

export function calcularCortina410(linea, codigo) {
  const modelo = modelos[codigo];
  const familia = codigo.slice(0, 6);
  const motivos = [];
  if (!String(linea.of_ ?? '').trim()) motivos.push('Falta la OF de RPS.');
  if (!Number.isSafeInteger(linea.cantidad) || linea.cantidad <= 0) motivos.push('La cantidad de RPS debe ser un entero positivo.');
  if (!modelo) motivos.push(pendientes[codigo] ?? (sinCorteLocalizado.has(codigo)
    ? 'Sin corte de taller para contrastar.'
    : 'Falta contrastar las piezas, los materiales y las herramientas de esta cortina con un corte de taller.'));
  else if (String(linea.descripcion ?? '').trim().toUpperCase().replace(/\s+/g, ' ').replace(/\.+$/, '') !== modelo.descripcion) {
    motivos.push('La descripción de RPS difiere de la variante de cortina contrastada. Revisa las medidas, la mano y los materiales.');
  }
  if (motivos.length) return { estado: 'a-mano', codigo, familia, motivos, avisos: [] };
  return { estado: 'generado', codigo, familia, motivos, avisos: [], cantidadPedida: linea.cantidad,
    grupos: modelo.grupos, pieza: { medidasMm: modelo.medidasMm },
    fuentePlantilla: { fichero: modelo.fichero, rotulo: codigo }, referencia: linea.CodArticle };
}

function entidadesDe(operaciones, rotulos = []) {
  const e = entidadesVacias();
  for (const [capa, x1, y1, x2, y2] of operaciones) {
    if (y2 === undefined) e.circulos.push({ capa, x: x1, y: y1, r: x2 });
    else e.lineas.push({ capa, x1, y1, x2, y2 });
  }
  for (const rotulo of rotulos) e.textos.push({ ...rotulo, capa: 'ROTULADOR', h: 10, literal: true });
  return e;
}

function columnaPvc(pares, { ancho, alto: altoTapa, altoLisa = altoTapa, travesano, recorteLisa = 0,
  xs, ys, alternas, perforadaPrimero = false, lisasPorBloque }) {
  const alto = pares * (altoTapa + altoLisa);
  const operaciones = [['DISCO1', 0, 0, 0, alto], ['DISCO1', ancho, 0, ancho, alto]];
  const orden = [];
  if (lisasPorBloque) {
    for (let quedan = pares; quedan > 0; quedan -= lisasPorBloque) {
      const bloque = Math.min(quedan, lisasPorBloque);
      orden.push(...Array(bloque).fill(false), ...Array(bloque).fill(true));
    }
  } else {
    for (let i = 0; i < 2 * pares; i++) orden.push(alternas ? (i % 2 === 0) === perforadaPrimero : i < pares);
  }
  let y = 0;
  for (const perforada of orden) {
    const inicio = y;
    y += perforada ? altoTapa : altoLisa;
    operaciones.push([travesano, !perforada && y < alto ? recorteLisa : 0, y, ancho, y]);
    if (perforada) operaciones.push(...xs.flatMap(x => ys.map(centro => ['CUTTER', x, centro + inicio, 20])));
  }
  return entidadesDe(operaciones);
}

export function generarProgramasCortina(g, sueltas, muestras = 1) {
  return g.grupos.flatMap(p => {
    const marcados = p.marcasDeMuestra ? muestras : 0;
    const cantidad = g.cantidadPedida * p.gruposPorUnidad - marcados;
    const capacidad = sueltas && (p.nombre === 'cuerpos' || p.tapasJuntoAlCuerpo) ? 1 : p.porTirada;
    const [largoMm, alto] = p.medidasMm;
    return [[1, marcados, p.marcasDeMuestra], [capacidad, Math.floor(cantidad / capacidad)], [cantidad % capacidad, 1]]
      .filter(([n, repeticiones]) => n && repeticiones)
      .map(([n, repeticiones, marcas]) => {
        const largoTotal = p.anchoTapa ? largoMm * n : largoMm + (p.tapasJuntoAlCuerpo?.ancho ?? 0);
        const anchoOcupadoMm = p.anchoTapa ? alto : alto * n;
        let entidades;
        if (p.tapa) entidades = columnaPvc(n, p.tapa);
        else if (p.anchoTapa) entidades = entidadesDe(tapasEnFilas(n, p.anchoTapa, 2));
        else if (p.frentesEnfrentados) {
          entidades = cortarFrentesEnfrentados(n, largoMm, alto, p.operaciones, p.cerrarFrenteSuelto, p.frentesEnfrentados);
        }
        else {
          entidades = entidadesVacias();
          const base = entidadesDe(marcas ? [...p.operaciones, ...marcas] : p.operaciones, p.rotulos);
          for (let i = 0; i < n; i++) unirEntidades(entidades, desplazarEntidades(base, 0, i * alto));
          if (p.tapasJuntoAlCuerpo) {
            const { ancho, alto: altoTapa, capa, cerrarBase } = p.tapasJuntoAlCuerpo;
            const cortes = tapasEnFilas(1, ancho, 2 * n, altoTapa, capa).slice(1);
            unirEntidades(entidades, desplazarEntidades(entidadesDe(cortes), largoMm, 0));
            if (cerrarBase) unirEntidades(entidades, entidadesDe([[capa, 0, 0, largoTotal, 0]]));
          }
          if (p.cerrarSiSuelto && n === 1) {
            unirEntidades(entidades, entidadesDe([['CUTTER', 0, 0, largoMm, 0]]));
          }
        }
        entidades.textos.push({ capa: 'texto', x: 100, y: anchoOcupadoMm + 120, h: 200, literal: true, valor: g.referencia },
          { capa: 'texto', x: 100, y: anchoOcupadoMm + 420, h: 200, literal: true, valor: `x${repeticiones}` });
        return { tipo: 'cortina', panos: 0, piezas: p.piezasPorGrupo * n, gruposDePiezas: n,
          nombrePiezas: marcas ? 'cuerpos con marca de muestra (cortar primero)' : p.nombre,
          material: p.material.nombre, anchoRolloMm: p.material.anchoRolloMm, largoMm: largoTotal, anchoOcupadoMm, repeticiones, entidades };
      });
  });
}
