// Uso: node scripts/bambalinas/extraer.mjs BAMBALINAS.dxf [--comprobar]
// Saca de la plantilla de la oficina (\\192.168.0.128\Oftecnica\Oficina Tecnica\DIBUJOS\TOLDOS\BAMBALINAS.dwg, pasada a
// DXF con ODA) la onda de cada forma de bambalina y escribe src/domain/corteLona/bambalinasDatos.js. Con
// --comprobar, solo compara lo que escribiría con lo que hay.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { bordeDeAbajo, pasoDe, pasoFino, onda } from './motivos.mjs';

const [, , entrada, opcion] = process.argv;
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'bambalinas-'));
const json = path.join(tmp, 'formas.json');
execFileSync(process.execPath, [path.join(import.meta.dirname, 'catalogo.mjs'), entrada, json], { stdio: 'ignore' });
const formas = JSON.parse(fs.readFileSync(json, 'utf8'));

// Nombre de cada forma en la web. Las dos CAMELOT, como en la lista de la izquierda de la plantilla (CAMELOT 1 la de
// la columna de la izquierda); la segunda ALMENA (en gris) y la RECTA no se sacan.
const vistas = new Set();
const nombres = formas.map((f) => {
  const base = f.nombre.replace('SU ERSUAVE', 'SUPERSUAVE').replace(/^IRAMIDE$/, 'PIRAMIDE');
  const n = base === 'CAMELOT' ? (vistas.has('CAMELOT') ? 'CAMELOT 2' : 'CAMELOT 1') : base;
  const repetida = vistas.has(n);
  vistas.add(base); vistas.add(n);
  return repetida || n === 'RECTA' ? null : n;
});

// Simplifica una polilínea (Douglas-Peucker) con una tolerancia en cm.
function simplificar(p, tol) {
  if (p.length < 3) return p;
  const [a, b] = [p[0], p.at(-1)], L = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
  let k = -1, dmax = 0;
  for (let i = 1; i < p.length - 1; i++) {
    const d = Math.abs((b[0] - a[0]) * (a[1] - p[i][1]) - (a[0] - p[i][0]) * (b[1] - a[1])) / L;
    if (d > dmax) { dmax = d; k = i; }
  }
  return dmax <= tol ? [a, b] : [...simplificar(p.slice(0, k + 1), tol).slice(0, -1), ...simplificar(p.slice(k), tol)];
}
const r3 = (v) => Math.round(v * 1000) / 1000;

const datos = {};
formas.forEach((f, k) => {
  const nombre = nombres[k];
  if (!nombre) return;
  let { camino } = bordeDeAbajo(f);
  // La MARINA de la plantilla empieza a media onda: se arranca en su primer tramo recto, el de abajo.
  if (nombre === 'MARINA') {
    const i = camino.findIndex(([, y], j) => j > 0 && Math.abs(y) < 0.01 && Math.abs(camino[j + 1]?.[1] ?? 1) < 0.01);
    camino = camino.slice(i);
  }
  const [p0] = pasoDe(camino, f.ancho);
  const [pFino] = pasoFino(camino, f.ancho, p0);
  // Si en la plantilla caben ondas enteras, el paso exacto es el ancho entre su número (NORMAL: 156,37 / 6 = 26,06,
  // el de AR2603936 cortado en la máquina).
  const n = Math.round(f.ancho / pFino), paso = Math.abs(f.ancho / n - pFino) < 0.15 ? f.ancho / n : pFino;
  const o = onda(camino, paso);
  if (o.cierre > 0.1) throw new Error(`${nombre}: la onda no cierra (${o.cierre.toFixed(2)} cm).`);
  const ys = camino.map((q) => q[1]), bajo = Math.min(...ys);
  datos[nombre] = {
    paso: r3(paso),
    // Altura de las puntas (lo recto, donde arranca la onda) sobre lo más bajo de la onda, y la onda desde su
    // arranque, en cm (y hacia arriba, hacia la tela). Menos de 2 mm es redondeo del dibujo: las puntas, abajo.
    nivel: camino[0][1] - bajo < 0.2 ? 0 : r3(camino[0][1] - bajo),
    onda: simplificar(o.puntos, 0.02).map(([x, y]) => [r3(x), r3(y)])
  };
});

const destino = path.join(import.meta.dirname, '../../src/domain/corteLona/bambalinasDatos.js');
const texto = `// Generado por scripts/bambalinas/extraer.mjs desde la plantilla BAMBALINAS.dwg de la oficina
// (\\\\192.168.0.128\\Oftecnica\\Oficina Tecnica\\DIBUJOS\\TOLDOS). No editar a mano.
// Cada forma: su paso, la altura de las puntas sobre lo más bajo de la onda y una onda desde su arranque, en cm.
export const ONDAS_BAMBALINA = ${JSON.stringify(datos, null, 0).replace(/\],\[/g, '], [').replace(/\},"/g, '},\n  "').replace(/^\{"/, '{\n  "').replace(/\}\}$/, '}\n}')};
`;
if (opcion === '--comprobar') {
  const actual = fs.existsSync(destino) ? fs.readFileSync(destino, 'utf8') : '';
  if (actual !== texto) { console.error('bambalinasDatos.js no está al día con la plantilla.'); process.exitCode = 1; }
  else console.log('bambalinasDatos.js al día.');
} else {
  fs.writeFileSync(destino, texto);
  for (const [n, d] of Object.entries(datos)) console.log(n.padEnd(15), 'paso', d.paso, 'nivel', d.nivel, 'puntos', d.onda.length);
}
