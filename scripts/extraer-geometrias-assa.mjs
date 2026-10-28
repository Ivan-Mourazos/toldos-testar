// La plantilla se lee en metros. Solo se guardan cuerpos y motivos medidos, sin extrapolar referencias.
import fs from 'node:fs';
import crypto from 'node:crypto';
import { leerPlanoDxf } from './lib/plano-dxf.mjs';
import { codigoAssa, extraerPanos } from '../src/assa/leerCorte.js';
import { operacionesEnPano } from '../src/assa/comparar.js';

const ruta = process.env.ASSA_PLANTILLA;
if (!ruta) throw new Error('Indica ASSA_PLANTILLA: copia local de COMBURSA (CRAWFORD).dxf.');
const nuevas = c => /^430(?:125|127|129|172)-/.test(c ?? '');
const red = n => Math.round(n * 1000) / 1000;
const m = leerPlanoDxf(ruta).modelo.map(p => ({ ...p, a: p.a?.map(n => n * 1000), b: p.b?.map(n => n * 1000),
  punto: p.punto?.map(n => n * 1000), h: p.h * 1000, r: p.r * 1000 }));
const titulos = m.filter(p => p.tipo === 'texto' && !p.deCota && codigoAssa(p.valor));
const cortes = m.filter(p => p.tipo === 'raya' && !p.deCota && p.capa === 'cortes - lona' && !p.curva);
const lector = m.filter(p => ['texto', 'cortes - lona'].includes(p.capa))
  .map(p => ({ ...p, capa: p.capa === 'cortes - lona' ? 'DISCO1' : p.capa }));
const operaciones = m.map(p => ({ ...p, capa: p.capa === 'curv' ? 'CUTTER' :
  ['marca', 'marcas ent.tubo'].includes(p.capa) ? 'ROTULADOR' : p.capa }));
const cuerpos = {};
for (const g of extraerPanos(lector).filter(g => nuevas(g.codigo))) {
  // Las tiras auxiliares no se convierten en un cuerpo. Las variantes de un mismo cuerpo se conservan.
  for (const p of g.panos.filter(p => p.medidasMm[1] >= 600)) {
    const ops = operacionesEnPano(operaciones, p.caja).map(p => p.tipo === 'raya' ?
      { tipo: 'raya', capa: p.capa, a: p.a.map(red), b: p.b.map(red), ...(p.curva ? { curva: p.curva } : {}) } :
      { tipo: 'arco', capa: p.capa, punto: p.punto.map(red), r: red(p.r), desde: p.desde, hasta: p.hasta });
    const cuerpo = { medidasMm: p.medidasMm, operaciones: ops };
    const lista = cuerpos[g.codigo] ??= [];
    if (!lista.some(c => JSON.stringify(c) === JSON.stringify(cuerpo))) lista.push(cuerpo);
  }
}

// Un bloque combinado tiene dos mitades simétricas y al menos cuatro enteros.
const diagonales = cortes.filter(p => {
  const dx = Math.abs(p.a[0] - p.b[0]), dy = Math.abs(p.a[1] - p.b[1]);
  return dx > 1000 && dx < 2100 && dy >= 40 && dy <= 170;
}).map(p => p.a[0] < p.b[0] ? p : { ...p, a: p.b, b: p.a });
const grupos = Map.groupBy(diagonales, p => [p.a[0], p.b[0]].map(red).join('|'));
const canalones = {}, bloques = [];
const cerca = (a, b) => Math.abs(a - b) < .1;
for (const ds of grupos.values()) {
  const x0 = ds[0].a[0], L = ds[0].b[0] - x0;
  const derecha = diagonales.filter(p => cerca(p.a[0], x0 + L) && cerca(p.b[0], x0 + 2 * L));
  if (derecha.length < 8) continue;
  const orden = ds.sort((a, b) => Math.min(...[a.a[1], a.b[1]]) - Math.min(...[b.a[1], b.b[1]]));
  const pilas = [];
  for (const p of orden) {
    const previa = pilas.at(-1);
    if (!previa || Math.min(p.a[1], p.b[1]) - Math.max(...previa.flatMap(q => [q.a[1], q.b[1]])) > 600) pilas.push([p]);
    else previa.push(p);
  }
  for (const pila of pilas) {
    const suben = pila.filter(p => p.b[1] > p.a[1]).sort((a, b) => a.a[1] - b.a[1]);
    const bajan = pila.filter(p => p.b[1] < p.a[1]).sort((a, b) => a.a[1] - b.a[1]);
    if (suben.length < 4 || bajan.length !== suben.length) continue;
    if (!pila.every(p => derecha.some(q => cerca(q.a[1], p.b[1]) && cerca(q.b[1], p.a[1])))) continue;
    const y0 = suben[0].a[1], grueso = bajan[0].a[1] - y0;
    const paso = suben[1].a[1] - y0, caida = suben[0].b[1] - y0, filas = suben.length;
    if (grueso <= 2 * caida || paso <= grueso || (filas - 1) * paso + grueso > 2040.1) continue;
    if (!suben.every((p, i) => cerca(p.a[1], y0 + i * paso) && cerca(p.b[1] - p.a[1], caida)) ||
      !bajan.every((p, i) => cerca(p.a[1], y0 + grueso + i * paso) && cerca(p.a[1] - p.b[1], caida))) continue;
    const y1 = y0 + (filas - 1) * paso + grueso;
    const candidatos = titulos.filter(t => t.punto[0] >= x0 && t.punto[0] <= x0 + 2 * L &&
      t.punto[1] >= y1 && t.punto[1] - y1 < 1500).sort((a, b) => a.punto[1] - b.punto[1]);
    const codigo = codigoAssa(candidatos[0]?.valor);
    if (!nuevas(codigo) || codigo.startsWith('430125')) continue;
    const s = caida / L, linea = (capa, x1, y1, x2, y2) => ({ capa, x1: red(x1), y1: red(y1), x2: red(x2), y2: red(y2) });
    const pestañas = m.filter(p => p.tipo === 'raya' && !p.deCota &&
      ['cortes - lona', 'referencia-1', 'marca'].includes(p.capa) && Math.abs(p.a[0] - p.b[0]) <= 110 &&
      [p.a, p.b].every(q => q[0] >= x0 - .1 && q[0] <= x0 + 2 * L + .1 && q[1] >= y0 - .1 && q[1] <= y0 + paso + caida + .1));
    const mitad = x => Math.min(x, 2 * L - x);
    const motivo = pareja => {
      const inferior = x => pareja ? grueso - s * mitad(x) : s * mitad(x);
      const superior = x => pareja ? paso + s * mitad(x) : grueso - s * mitad(x);
      const es = [];
      for (const [a, b] of [[0, L], [L, 2 * L]]) {
        es.push(linea('DISCO1', a, inferior(a), b, inferior(b)), linea('DISCO1', a, superior(a), b, superior(b)));
      }
      for (const x of [0, 2 * L, ...pareja ? [L] : []]) es.push(linea('DISCO2', x, inferior(x), x, superior(x)));
      for (const p of pestañas) if ([p.a, p.b].every(q => q[1] - y0 >= inferior(q[0] - x0) - .1 && q[1] - y0 <= superior(q[0] - x0) + .1)) {
        // Los costados se reconstruyen completos, las pestañas conservan sus tramos exactos.
        if ([x0, x0 + L, x0 + 2 * L].some(x => cerca(p.a[0], x) && cerca(p.b[0], x))) continue;
        es.push(linea(p.capa === 'marca' ? 'ROTULADOR' : 'DISCO1', p.a[0] - x0, p.a[1] - y0, p.b[0] - x0, p.b[1] - y0));
      }
      return es;
    };
    const juego = { mitad: red(L), grueso: red(grueso), paso: red(paso), caida: red(caida), filas,
      entero: motivo(false), pareja: motivo(true) };
    (canalones[codigo] ??= []).push(juego);
    bloques.push({ codigo, mitad: red(L), grueso: red(grueso), paso: red(paso), caida: red(caida), filas,
      pestañas: [juego.entero.length - 6, juego.pareja.length - 7] });
  }
}
const fuente = { fichero: 'COMBURSA (CRAWFORD).dxf', sha256: crypto.createHash('sha256').update(fs.readFileSync(ruta)).digest('hex') };
fs.writeFileSync(new URL('../src/assa/geometriasPlantilla.json', import.meta.url), JSON.stringify({ fuente, cuerpos, canalones }, null, 2) + '\n');
console.log(JSON.stringify({ cuerpos: Object.keys(cuerpos).length, bloques: bloques.length,
  sinPestañas: bloques.filter(b => b.pestañas.some(n => n < 8)) }, null, 2));
