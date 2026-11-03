// Importa la revisión de oficina del 07-11 desde copias. No consulta RPS, no abre CAD ni escribe en red.
// Uso: node scripts/extraer-revision-combursa-0711.mjs --fuente=tmp/copia.dxf --rps=tmp/vista.json [--guardar]
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { leerPlanoDxf } from './lib/plano-dxf.mjs';
import { cajaPrimitiva, transformarPrimitiva } from '../src/flujoDwg/planoDxf.js';
import { pedidoDe } from './assa-investigacion/geometria.mjs';

const arg = nombre => process.argv.find(a => a.startsWith(`--${nombre}=`))?.split('=').slice(1).join('=');
const fuente = arg('fuente'), rps = arg('rps');
if (!fuente || !rps) throw new Error('Indica --fuente y --rps, con las copias de lectura.');
const modelo = leerPlanoDxf(fuente).modelo, lineas = JSON.parse(fs.readFileSync(rps, 'utf8')).lineas;
if (lineas.length !== 25 || lineas.some(l => l.entregaSolicitada !== '2026-11-07')) throw new Error('La foto no es el lote 07-11 completo.');
const cabeceras = modelo.filter(t => t.tipo === 'texto' && t.capa === 'HOJAS' && pedidoDe(t.valor));
const palets = {
  'AR.26.05111': [4, 4, 3], 'AR.26.05142': [3, 3, 3, [5, 6]], 'AR.26.05234': [1, 4, 1, 4, 4, 4],
  'AR.26.05240': [4, 4, 4, 2, 4, 2, 3, 2, 4, 2], 'AR.26.05263': [3, 4],
};
const usados = new Set(), omitidos = new Set();
const red = n => +n.toFixed(8);
const codificar = p => {
  if (p.tipo === 'raya') return [0, p.capa, ...p.a.map(red), ...p.b.map(red), p.curva ?? 0, p.color ?? null];
  if (p.tipo === 'arco') return [1, p.capa, ...p.punto.map(red), red(p.r), p.desde, p.hasta, p.color ?? null];
  if (p.tipo === 'texto') return [2, p.capa, ...p.punto.map(red), red(p.h), p.valor, p.giro ?? 0, p.ancla ?? 7, p.color ?? null];
  return [3, p.capa, p.puntos.map(q => q.map(red)), p.color ?? null];
};
const normalizar = ps => {
  const cs = ps.map(cajaPrimitiva), x = Math.min(...cs.map(c => c.x0)), y = Math.min(...cs.map(c => c.y0));
  for (const p of ps) usados.add(p);
  // Los bloques se han explotado por el lector; se conserva su geometría, sin duplicar la inserción indicativa.
  return { origenMetros: [x, y], primitivas: ps.filter(p => p.tipo !== 'bloque').map(p => codificar(transformarPrimitiva(p, (a, b) => [a - x, b - y], 1))) };
};
const dentro = (p, x0, x1, y0, y1) => {
  const b = cajaPrimitiva(p);
  return b.x0 >= x0 && b.x1 < x1 && b.y0 > y0 && b.y1 < y1;
};
const hojas = [];
for (const c of cabeceras) {
  const ls = lineas.filter(l => l.CodOrder === pedidoDe(c.valor)).sort((a, b) => a.NumLine - b.NumLine);
  const x0 = c.punto[0] + 4.5, x1 = Math.min(...cabeceras.filter(q => q.punto[0] > c.punto[0]).map(q => q.punto[0] - 1), c.punto[0] + 64);
  let techo = c.punto[1] - 3;
  omitidos.add(c);
  for (const l of ls) {
    const nota = modelo.find(p => p.tipo === 'texto' && p.capa === 'HOJAS' && p.valor.includes('OF ' + l.of_));
    const numero = modelo.find(p => p.tipo === 'texto' && p.capa === 'HOJAS' && p.valor === String(l.NumLine) && Math.abs(p.punto[0] - c.punto[0]) < .01 && p.punto[1] < techo);
    if (!numero) throw new Error(`No se encuentra ${l.CodOrder}/${l.NumLine}.`);
    const suelo = nota?.punto[1] ?? (numero.punto[1] - 11);
    const ps = modelo.filter(p => p !== nota && p.tipo !== 'cota' && p.capa !== 'vent-pre-noimpr' && dentro(p, x0, x1, suelo + .25, techo));
    if (!ps.length) throw new Error(`Sin dibujo para ${l.CodArticle}.`);
    hojas.push({ pedido: l.CodOrder, linea: l.NumLine, referencia: l.CodArticle, ...normalizar(ps) });
    omitidos.add(nota); omitidos.add(numero);
    techo = suelo - .4;
  }
}
const corte = normalizar(modelo.filter(p => p.tipo !== 'cota' && !['vent-pre-noimpr', 'RECUADROS'].includes(p.capa) && dentro(p, -2, 270, 10, 85)));
const minimo = lineas.map(l => ({ ...Object.fromEntries(['CodOrder', 'NumLine', 'CodArticle', 'descripcion', 'cantidad', 'of_', 'entregaSolicitada'].map(k => [k, l[k]])), palets: [palets[l.CodOrder][l.NumLine - 1]].flat() }));
const revision = { fecha: '2026-11-07', fuente: 'LOTE 07-11.dwg, copia definitiva del 03/11/2026',
  sha256Dxf: crypto.createHash('sha256').update(fs.readFileSync(fuente)).digest('hex'), lineas: minimo, hojas, corte: corte.primitivas, origenCorteMetros: corte.origenMetros };
const salida = path.resolve('tmp/combursa-0711');
fs.mkdirSync(salida, { recursive: true });
const pendientes = modelo.filter(p => !usados.has(p) && !omitidos.has(p) && !['vent-pre-noimpr', 'RECUADROS'].includes(p.capa) && dentro(p, -65, 270, 10, 190));
fs.writeFileSync(path.join(salida, 'extraccion-pendiente.json'), JSON.stringify(pendientes, null, 2));
fs.writeFileSync(path.join(salida, 'revision-oficina.json'), JSON.stringify(revision) + '\n');
if (process.argv.includes('--guardar')) fs.writeFileSync('src/assa/revisiones/lote-0711.json', JSON.stringify(revision) + '\n');
console.log(JSON.stringify({ hojas: hojas.length, primitivasHojas: hojas.reduce((s, h) => s + h.primitivas.length, 0), primitivasCorte: revision.corte.length, pendientes: pendientes.length }));
