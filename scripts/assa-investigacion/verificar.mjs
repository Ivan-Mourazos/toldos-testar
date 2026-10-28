import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { codigoAssa } from '../../src/assa/leerCorte.js';
const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const dir = path.join(repo, 'tmp/assa-investigacion');
const leer = f => JSON.parse(fs.readFileSync(path.join(dir, `${f}.json`), 'utf8'));
const a = leer('analisis'), citas = leer('citas-rps'), variantes = leer('dibujos-variantes'), apariciones = leer('dibujos-apariciones');
const rps = JSON.parse(fs.readFileSync(a.rutas.rps, 'utf8')).lineas;
const dibujos = JSON.parse(fs.readFileSync(path.join(repo, 'src/assa/dibujosConfeccion.json'), 'utf8'));
const sha = p => crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');
const fuentesAlteradas = a.fuentes.filter(f => sha(path.join(a.rutas.estudio, f.ruta)) !== f.sha256);
assert.deepEqual(fuentesAlteradas, [], 'Han cambiado fuentes de entrada');
assert.equal(sha(a.rutas.rps), a.rps.sha256, 'Ha cambiado la foto RPS');
for (const c of citas) assert(rps.some(l => l.IDOrderLine === c.IDOrderLine && l.CodOrder === c.pedido &&
  Number(l.NumLine) === Number(c.NumLine) && codigoAssa(l.CodArticle) === c.codigo), `Cita no válida: ${JSON.stringify(c)}`);
const sinTraza = [];
for (const [c, d] of Object.entries(dibujos)) {
  assert.equal(codigoAssa(d.entidades.textos.find(t => codigoAssa(t.valor))?.valor), c, `Rótulo de ${c}`);
  assert(!d.entidades.textos.some(t => /^[x×]\s*\d+$/i.test(t.valor.trim()) || /stock|PALET/i.test(t.valor)), `Nota de pedido en ${c}`);
  assert(d.entidades.lineas.length > 0, `Sin geometría en ${c}`);
  for (const l of d.entidades.lineas) for (const k of ['x1', 'y1', 'x2', 'y2']) assert(Number.isFinite(l[k]) && l[k] >= -.1, `${c}: coordenada ${k}`);
  const fechas = apariciones.filter(v => v.codigo === c).map(v => v.fecha ?? '').sort();
  if (!d.criterioSeleccion?.includes('plantilla')) assert.equal(d.fecha ?? '', fechas.at(-1), `${c}: no se eligió el lote más reciente`);
  else {
    const contraste = leer('plantilla-variantes').resultados.find(r => r.codigo === c);
    assert.equal(contraste?.seleccion.firma, d.firmaForma, `${c}: selección de plantilla no documentada`);
  }
  if (!d.trazabilidadRps) sinTraza.push(c);
  for (const id of d.candidatosRps) assert(rps.some(l => l.IDOrderLine === id && l.CodOrder === d.pedidoRotulado &&
    Number(l.NumLine) === d.numeroDibujo && codigoAssa(l.CodArticle) === c), `${c}: trazabilidad de la línea`);
}
const g = leer('informe-generacion');
assert.equal(sha(path.join(repo, 'docs/modelos/assa-combursa-lotes.md')), g.sha256, 'Informe modificado después de generarlo');
assert.equal(sha(path.join(repo, 'src/assa/dibujosConfeccion.json')), g.catalogoSha256, 'Catálogo cambiado tras generar el informe');
for (const e of g.entradas) assert.equal(sha(path.join(dir, e.fichero)), e.sha256, `Entrada de informe modificada: ${e.fichero}`);
const capturas = ['420102', '420148', '420150', '430125', '430127', '430129', '430172'];
for (const f of capturas) {
  const p = path.join(dir, `confeccion-${f}.png`);
  assert(fs.existsSync(p) && fs.statSync(p).size > 1000, `Falta PNG de ${f}`);
}
for (const r of leer('plantilla-variantes').resultados) assert(fs.existsSync(path.join(dir, `variantes-${r.codigo}.png`)), `Falta PNG de variantes ${r.codigo}`);
const informe = fs.readFileSync(path.join(repo, 'docs/modelos/assa-combursa-lotes.md'), 'utf8');
for (const pedido of new Set(informe.match(/AR\.\d{2}\.\d{5}/g))) assert(rps.some(l => l.CodOrder === pedido), `Pedido citado fuera de RPS: ${pedido}`);
for (const m of informe.matchAll(/(AR\.\d{2}\.\d{5})\s*\/\s*(\d+)/g)) assert(rps.some(l => l.CodOrder === m[1] && Number(l.NumLine) === Number(m[2])), `Línea citada fuera de RPS: ${m[0]}`);
const resultado = { fuentesSinCambios: a.fuentes.length, citasRpsComprobadas: citas.length,
  dibujos: Object.keys(dibujos).length, dibujosSinTrazaUnicaDeRps: sinTraza,
  referenciasSinDibujo: variantes.sinDibujo, capturas: capturas.length, informeGeneradoSinCambios: true,
  limites: ['Las diferencias de rótulo de oficina no se han corregido automáticamente.',
    'Las atribuciones de material y las cantidades de canalones no quedan certificadas por esta verificación.',
    'El catálogo extraído requiere revisión de confección y conserva variantes.'] };
fs.writeFileSync(path.join(dir, 'verificacion.json'), JSON.stringify(resultado, null, 2) + '\n');
console.log(JSON.stringify(resultado, null, 2));
