import cuerpos from './cuerposCortinas410.json' with { type: 'json' };
import { MATERIAL_COMBURSA, entidadesVacias, desplazarEntidades, unirEntidades } from './faseA.js';

const lona1 = { nombre: 'Lona 1 mm', anchoRolloMm: 1500 };
const lona2 = { nombre: 'Lona 2 mm', anchoRolloMm: 2100 };
const lona3 = { nombre: 'Lona 3 mm', anchoRolloMm: 1600 };
const pvc = { nombre: 'PVC 900 g negro', anchoRolloMm: 3000 };

const rectangulo = (capa, largo, alto) => [
  [capa, 0, 0, 0, alto], [capa, largo, 0, largo, alto], [capa, 0, alto, largo, alto],
];
const marcasLaterales = (x, fin) => [300, 600].map(y => ['ROTULADOR', x, y, fin, y]);
const orificiosTapa = [104.1, 204.1].flatMap(x => [70, 170, 270].map(y => ['CUTTER', x, y, 20]));
const grupo = (material, nombre, piezasPorGrupo, porTirada, medidasMm, operaciones, gruposPorUnidad = 1) =>
  ({ material, nombre, piezasPorGrupo, gruposPorUnidad, porTirada, medidasMm, operaciones });

const superior = [
  grupo(MATERIAL_COMBURSA, 'cuerpos', 1, 2, [2000, 900], [
    ...rectangulo('DISCO1', 2000, 900), ...marcasLaterales(0, 20), ...marcasLaterales(2000, 1980),
    ...[400, 800, 1200, 1600].map(x => ['CUTTER', x, 800, 20]),
  ]),
  grupo(MATERIAL_COMBURSA, 'tapas', 1, 6, [320, 340], rectangulo('DISCO1', 320, 340), 2),
  grupo(lona3, 'frentes', 1, 5, [2000, 300], rectangulo('CUTTER', 2000, 300)),
];
const lateral = [
  grupo(MATERIAL_COMBURSA, 'cuerpos', 1, 2, [2300, 900], [
    ['DISCO1', 0, 900, 2300, 900], ['DISCO1', 2300, 0, 2300, 900],
    ['DISCO1', 0, 0, 50, 300], ['DISCO1', 50, 300, 50, 600], ['DISCO1', 50, 600, 0, 900],
    ...marcasLaterales(51.7486, 101.7486), ...marcasLaterales(2290, 2240),
  ]),
  // Una columna con perforadas abajo y lisas arriba, como en el corte del 13-09-2025.
  { ...grupo(pvc, 'pares de tapas (lisa y perforada)', 2, 4, [324.1, 680]), pares: true },
  grupo(lona3, 'frentes con marca', 1, 5, [2250, 300], [
    ...rectangulo('CUTTER', 2250, 300),
    ['ROTULADOR', 350, 100, 350, 200], ['ROTULADOR', 350, 100, 1100, 100],
    ['ROTULADOR', 350, 200, 1100, 200], ['ROTULADOR', 1100, 100, 1100, 200],
  ]),
];
const solapas = grupo(lona1, 'juegos de 8 solapas lisas y 4 marcadas', 12, 1, [1400, 1200], [
  ...[0, 350, 700, 1050, 1400].map(x => ['DISCO1', x, 0, x, 1200]),
  ...[400, 800, 1200].map(y => ['DISCO1', 0, y, 1400, y]),
  ...[0, 350].flatMap(x => [150, 250, 550, 650].map(y => ['ROTULADOR', x, y, x + 350, y])),
]);

function superiorConAbertura(ancho, abertura, agujeros) {
  const borde = 400, base = 400, alto = base + abertura;
  return [
    grupo(lona2, 'cuerpos', 1, 1, [ancho, 1100], [
      ...rectangulo('CUTTER', ancho, 1100),
      ...Array.from({ length: agujeros }, (_, i) => ['CUTTER', borde + i * (ancho - 2 * borde) / (agujeros - 1), 150, 20]),
      ...[350, 750].flatMap(y => [['ROTULADOR', 0, y, 20, y], ['ROTULADOR', ancho - 20, y, ancho, y]]),
    ]),
    grupo(lona2, 'pares de tapas', 2, 1, [880, 370], [
      ['CUTTER', 0, 370, 880, 370], ...[0, 440, 880].map(x => ['CUTTER', x, 0, x, 370]),
    ]),
    grupo(lona3, 'frentes con abertura', 1, 1, [ancho, alto], [
      ['CUTTER', 0, 0, 0, base], ['CUTTER', 0, base, borde, base],
      ['CUTTER', borde, base, borde, alto], ['CUTTER', borde, alto, ancho - borde, alto],
      ['CUTTER', ancho - borde, alto, ancho - borde, base], ['CUTTER', ancho - borde, base, ancho, base],
      ['CUTTER', ancho, base, ancho, 0], ['ROTULADOR', borde, base, ancho - borde, base],
      ...[borde + 200, ancho - borde - 200].flatMap(x => [
        ['CUTTER', x, base + 20, x, alto], ['ROTULADOR', x, base + 20, 4],
      ]),
    ]),
  ];
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
  '410129-0117': {
    descripcion: 'TOP CURTAIN TWP TWB300XTWT250X2000',
    fichero: 'COMBURSA (CRAWFORD)2.dwg', medidasMm: [2000, 900], grupos: superior,
  },
  '410130-0175': {
    descripcion: 'PLANE SC SEITLICH WB300XWT250XH2300 PARKING GUIDE WHITE/STANDARD (750MM)',
    fichero: 'COMBURSA (CRAWFORD)2.dwg', medidasMm: [2300, 900], grupos: lateral,
  },
  '410143-0002': {
    descripcion: 'PLANE SC IN COMPLETE WIDTH WB400XWT300XB3350 OP=600 PVC BACLK, 2MM REINFORCED',
    fichero: 'HOK410143.dwg', medidasMm: [3350, 1100], grupos: superiorConAbertura(3350, 175, 8),
  },
  '410170-0001': {
    descripcion: 'PLANE RIGHT SCHUPPEN/REINFORCED 2MM H=2600 SWB FRONT=400 SWB=300, SWT=300 PKG 750MM, SIMILAR DRAW. OK410173 BUT WITH SWB FRONT AND SWB REAR',
    fichero: 'OK410170.dwg', medidasMm: [2600, 1116.2], grupos: conMano('410170-0001', true),
  },
  '410171-0001': {
    descripcion: 'PLANE LEFT SCHUPOEN/REINFORCED 2MM H=2600 SWB FRONT=400 SWB REAR=300 SWT=300 PKG STD 750MM, SIMILAR DRAW. OK410172BUT WITH SWB FRONT AND SWB REAR',
    fichero: 'OK410171.dwg', medidasMm: [2600, 1116.2], grupos: conMano('410171-0001', false),
  },
};

const pendientes = {
  '410174-0049': 'Falta confirmar cuántas solapas lisas y tiras para rotular se cortan en lona de 1 mm por cortina.',
  '410129-0003': 'La misma referencia de RPS figura como puerta y como cortina. Falta confirmar el dibujo y el despiece.',
  '410129-0105': 'El maestro dibuja cinco agujeros y el corte real lleva seis. Taller tiene que confirmar el dibujo de corte.',
  '410241-0011': 'El plano marca D y el corte reciente marca D1 a D5. Falta confirmar qué rotular en las piezas.',
  '410242-0004': 'El plano marca C y el corte reciente marca C1 a C5. Falta confirmar qué rotular en las piezas.',
};

export function calcularCortina410(linea, codigo) {
  const modelo = modelos[codigo];
  const familia = codigo.slice(0, 6);
  const motivos = [];
  if (!String(linea.of_ ?? '').trim()) motivos.push('Falta la OF de RPS.');
  if (!Number.isSafeInteger(linea.cantidad) || linea.cantidad <= 0) motivos.push('La cantidad de RPS debe ser un entero positivo.');
  if (!modelo) motivos.push(pendientes[codigo] ?? 'Falta contrastar las piezas, los materiales y las herramientas de esta cortina con un corte de taller.');
  else if (String(linea.descripcion ?? '').trim().toUpperCase().replace(/\s+/g, ' ').replace(/\.+$/, '') !== modelo.descripcion) {
    motivos.push('La descripción de RPS difiere de la variante de cortina contrastada. Revisa las medidas, la mano y los materiales.');
  }
  if (motivos.length) return { estado: 'a-mano', codigo, familia, motivos, avisos: [] };
  return { estado: 'generado', codigo, familia, motivos, avisos: [], cantidadPedida: linea.cantidad,
    grupos: modelo.grupos, pieza: { medidasMm: modelo.medidasMm },
    fuentePlantilla: { fichero: modelo.fichero, rotulo: codigo }, referencia: linea.CodArticle };
}

function entidadesDe(operaciones) {
  const e = entidadesVacias();
  for (const [capa, x1, y1, x2, y2] of operaciones) {
    if (y2 === undefined) e.circulos.push({ capa, x: x1, y: y1, r: x2 });
    else e.lineas.push({ capa, x1, y1, x2, y2 });
  }
  return e;
}

function columnaPvc(pares) {
  const alto = pares * 680;
  const operaciones = [['DISCO1', 0, 0, 0, alto], ['DISCO1', 324.1, 0, 324.1, alto]];
  for (let i = 0; i < 2 * pares; i++) {
    const y = 340 * (i + 1);
    operaciones.push(['DISCO1', i >= pares && y < alto ? 4.1 : 0, y, 324.1, y]);
    if (i < pares) operaciones.push(...orificiosTapa.map(([capa, x, centro, r]) => [capa, x, centro + 340 * i, r]));
  }
  return entidadesDe(operaciones);
}

export function generarProgramasCortina(g, sueltas) {
  return g.grupos.flatMap(p => {
    const cantidad = g.cantidadPedida * p.gruposPorUnidad;
    const capacidad = sueltas && p.nombre === 'cuerpos' ? 1 : p.porTirada;
    const [largoMm, alto] = p.medidasMm;
    return [[capacidad, Math.floor(cantidad / capacidad)], [cantidad % capacidad, 1]]
      .filter(([n, repeticiones]) => n && repeticiones)
      .map(([n, repeticiones]) => {
        const entidades = p.pares ? columnaPvc(n) : entidadesVacias();
        if (!p.pares) {
          const base = entidadesDe(p.operaciones);
          for (let i = 0; i < n; i++) unirEntidades(entidades, desplazarEntidades(base, 0, i * alto));
        }
        const anchoOcupadoMm = alto * n;
        entidades.textos.push({ capa: 'texto', x: 100, y: anchoOcupadoMm + 120, h: 200, literal: true, valor: g.referencia },
          { capa: 'texto', x: 100, y: anchoOcupadoMm + 420, h: 200, literal: true, valor: `x${repeticiones}` });
        return { tipo: 'cortina', panos: 0, piezas: p.piezasPorGrupo * n, gruposDePiezas: n, nombrePiezas: p.nombre,
          material: p.material.nombre, anchoRolloMm: p.material.anchoRolloMm, largoMm, anchoOcupadoMm, repeticiones, entidades };
      });
  });
}
