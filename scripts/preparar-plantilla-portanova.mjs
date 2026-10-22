// Depura una copia local convertida de PORTANOVA (NAVE NOVA).dwg. Emite el DXF por stdout;
// el fichero de referencia del repositorio se incorpora como un artefacto revisable.
// Uso: node scripts/preparar-plantilla-portanova.mjs <portanova.dxf>
import fs from 'node:fs';
import assert from 'node:assert/strict';
import { registrosDxf, valor } from '../src/domain/corteLona/dxfTestHelpers.js';
const original = fs.readFileSync(process.argv[2], 'utf8').replaceAll('\r\n', '\n');
const n = (r, c) => Number(valor(r, c));
const entidades = registrosDxf(original), tablas = registrosDxf(original, 'TABLES');
const vistas = entidades.filter(r => r.tipo === 'VIEWPORT' && [3, 5, 6].includes(n(r, 69))).map(r => {
  const medio = n(r, 45) / 2, semiancho = medio * n(r, 40) / n(r, 41);
  return [n(r, 12) - semiancho, n(r, 22) - medio, n(r, 12) + semiancho, n(r, 22) + medio];
});
const seleccion = entidades.filter(r => valor(r, 67) === '1' || r.pares.some(([c, v], i) =>
  c === 10 && r.pares[i + 1]?.[0] === 20 && vistas.some(([x0, y0, x1, y1]) => +v >= x0 && +v <= x1 && +r.pares[i + 1][1] >= y0 && +r.pares[i + 1][1] <= y1)));
// Los reactores y los campos automáticos del DWG anterior apuntaban a entidades que se eliminan.
function limpiar(r) {
  const pares = []; let dentro = false;
  for (const [c, v] of r.pares) {
    if (c === 102 && v.startsWith('{ACAD_')) { dentro = true; continue; }
    if (dentro) { if (c === 102 && v === '}') dentro = false; continue; }
    pares.push([c, v]);
  }
  return { ...r, pares };
}
const bloques = new Map(); let bloque;
for (const r of registrosDxf(original, 'BLOCKS')) {
  if (r.tipo === 'BLOCK') { bloque = []; bloques.set(valor(r, 2), bloque); }
  bloque?.push(r);
  if (r.tipo === 'ENDBLK') bloque = undefined;
}
const nombres = new Set(['*Model_Space', '*Paper_Space', 'FLECHA2', 'CAJETIN']);
const buscar = lista => lista.filter(r => ['INSERT', 'DIMENSION'].includes(r.tipo)).forEach(r => nombres.add(valor(r, 2)));
buscar(seleccion);
let anterior = -1;
while (anterior !== nombres.size) { anterior = nombres.size; for (const nombre of nombres) buscar(bloques.get(nombre) ?? []); }
const bt = [...nombres].flatMap(nombre => bloques.get(nombre) ?? []).map(limpiar);
const tt = tablas.filter(r => r.tipo !== 'BLOCK_RECORD' || nombres.has(valor(r, 2))).map(limpiar);
for (let i = 0; i < tt.length; i++) {
  if (tt[i].tipo !== 'TABLE') continue;
  let j = i + 1; while (j < tt.length && tt[j].tipo !== 'ENDTAB') j++;
  tt[i].pares = tt[i].pares.map(([c, v]) => [c, c === 70 ? String(j - i - 1) : v]);
}
const et = seleccion.map(limpiar);
const todosObjetos = new Map(registrosDxf(original, 'OBJECTS').map(r => [valor(r, 5), limpiar(r)]));
const raiz = todosObjetos.get('C'); assert.ok(raiz, 'Falta el diccionario raíz del DXF.');
// Solo los diccionarios de recursos CAD; se eliminan redes y grupos de trabajos anteriores.
const conservar = new Set(['ACAD_LAYOUT', 'ACAD_MLINESTYLE', 'ACAD_PLOTSETTINGS', 'ACAD_PLOTSTYLENAME', 'ACAD_MATERIAL', 'ACAD_VISUALSTYLE', 'ACAD_TABLESTYLE']);
raiz.pares = raiz.pares.filter(([c, v], i, pares) => c === 3 ? conservar.has(v) : ![350, 360].includes(c) || pares[i - 1]?.[0] !== 3 || conservar.has(pares[i - 1][1]));
const usados = new Map([['C', raiz]]), pendientes = [raiz, ...et, ...tt, ...bt];
while (pendientes.length) {
  const r = pendientes.pop();
  for (const [c, h] of r.pares) if (c >= 330 && c <= 369 && todosObjetos.has(h) && !usados.has(h)) {
    usados.set(h, todosObjetos.get(h)); pendientes.push(todosObjetos.get(h));
  }
}
const conocidos = new Set([...et, ...tt, ...bt, ...usados.values()].map(r => valor(r, 5) ?? valor(r, 105)).filter(Boolean));
for (const r of usados.values()) r.pares = r.pares.filter(([c, v]) => !(c >= 330 && c <= 369) || v === '0' || conocidos.has(v));
const serializar = r => `  0\n${r.tipo}\n${r.pares.map(([c, v]) => `${String(c).padStart(3)}\n${v}\n`).join('')}`;
const seccion = (nombre, cuerpo) => `  0\nSECTION\n  2\n${nombre}\n${cuerpo}  0\nENDSEC\n`;
const cabecera = original.slice(original.indexOf('\nHEADER\n') + '\nHEADER\n'.length, original.indexOf('  0\nENDSEC\n', original.indexOf('\nHEADER\n')));
const resultado = seccion('HEADER', cabecera) + seccion('CLASSES', registrosDxf(original, 'CLASSES').map(serializar).join(''))
  + seccion('TABLES', tt.map(serializar).join('')) + seccion('BLOCKS', bt.map(serializar).join(''))
  + seccion('ENTITIES', et.map(serializar).join('')) + seccion('OBJECTS', [...usados.values()].map(serializar).join('')) + '  0\nEOF\n';
assert.ok(et.some(r => r.tipo === 'DIMENSION' && valor(r, 1) === '1 CM'), 'No se conserva la cota del detalle.');
assert.ok(nombres.has('CAJETIN') && nombres.has('FLECHA2'), 'Faltan bloques de la oficina.');
process.stdout.write(resultado);
