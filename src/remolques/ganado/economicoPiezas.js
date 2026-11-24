// El DXF histórico de AR2600752 comparte aristas y omite el orillo. Aquí se recupera
// el perímetro de cada pieza del mismo corte para poder moverla entera.
import { CORTE_ECONOMICO as corte } from './economicoDatos.ts';

const mm = (n) => Math.round(n * 10) / 10;
const lineas = corte.lineas;
const { x0: izquierda, x1: derecha, y1: alto } = corte.cuerpo;
const [bordeFrente, techoFrente, ladoFrente] = lineas;
const xFrente = ladoFrente[0], xTapa = lineas[32][0];
const xTrasero = lineas[28][0], xSolapas = lineas[31][0];
const baseSolapas = lineas[26][1], unionSolapas = lineas[29][1], techoSolapas = lineas[30][1];
const base = (de, a) => [de, 0, a, 0];
const lado = (x, de, a) => [x, de, x, a];

const piezas = [
  {
    nombre: 'Cuerpo',
    borde: [base(izquierda, derecha), lado(izquierda, 0, alto), ...lineas.slice(24, 26)],
    marcas: corte.rot.slice(10),
    ollaos: corte.ollaos.slice(9),
  },
  {
    nombre: 'Trasero',
    borde: [...lineas.slice(3, 7), ...lineas.slice(26, 29), base(xTrasero, izquierda), lado(izquierda, 0, baseSolapas)],
    marcas: corte.rot.slice(7, 8),
    ollaos: corte.ollaos.slice(4, 7),
  },
  {
    nombre: 'Zona en cuña',
    borde: lineas.slice(7, 23),
    marcas: [...corte.rot.slice(0, 2), ...corte.rot.slice(8, 10)],
    ollaos: [...corte.ollaos.slice(2, 4), ...corte.ollaos.slice(7, 9)],
  },
  {
    nombre: 'Frente',
    borde: [bordeFrente, techoFrente, ladoFrente, base(xFrente, bordeFrente[0])],
    marcas: corte.rot.slice(2, 7),
    ollaos: corte.ollaos.slice(0, 2),
    arcos: corte.arcos,
  },
  {
    nombre: 'Tapa de ventana',
    borde: [...lineas.slice(32), base(xTapa, xFrente), lado(xFrente, 0, lineas[33][1])],
  },
  {
    nombre: 'Solapa 1',
    borde: [[xSolapas, baseSolapas, izquierda, baseSolapas], lado(xSolapas, baseSolapas, unionSolapas), lineas[29], lado(izquierda, baseSolapas, unionSolapas)],
  },
  {
    nombre: 'Solapa 2',
    borde: [lineas[29], lado(xSolapas, unionSolapas, techoSolapas), lineas[30], lado(izquierda, unionSolapas, techoSolapas)],
  },
].map(({ nombre, borde, marcas = [], ollaos = [], arcos = [] }) => {
  const xs = borde.flatMap(([x1, , x2]) => [x1, x2]);
  const ys = borde.flatMap(([, y1, , y2]) => [y1, y2]);
  const x = Math.min(...xs), y = Math.min(...ys);
  const w = mm(Math.max(...xs) - x), h = mm(Math.max(...ys) - y);
  const trasladar = ([x1, y1, x2, y2]) => [mm(x1 - x), mm(y1 - y), mm(x2 - x), mm(y2 - y)];
  return {
    nombre, w, h, lineas: borde.map(trasladar), rot: marcas.map(trasladar),
    ollaos: ollaos.map(([a, b]) => [mm(a - x), mm(b - y)]),
    arcos: arcos.map(a => ({ ...a, x: mm(a.x - x), y: mm(a.y - y) })),
  };
});

export function piezasEconomico(cantidad, of) {
  return Array.from({ length: cantidad }, () => piezas.map(({ nombre, ...pieza }) => ({
    ...pieza,
    textos: [{ x: pieza.w / 2, y: pieza.h / 2, h: 45, valor: `${nombre} · ${of}` }],
  }))).flat();
}
