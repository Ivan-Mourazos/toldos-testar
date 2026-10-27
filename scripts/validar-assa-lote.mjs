// Un lote reciente: SELECT opcional de RPS, comparación local y salida exclusiva de pruebas.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { prepararLote } from '../src/assa/lote.js';
import { leerLoteRps } from '../src/assa/rps.js';
import { escribirDxf2004 } from '../src/domain/corteLona/dxfCorte.js';
import { codigoAssa, extraerPanos } from '../src/assa/leerCorte.js';
import { leerPlanoDxf } from './lib/plano-dxf.mjs';
import { CARPETA_PRUEBAS_ASSA } from '../src/assa/archivos.js';

const fecha = process.env.ASSA_FECHA || '2026-10-31';
const carpeta = path.resolve('tmp/assa-fase-a/lote-' + fecha);
fs.mkdirSync(carpeta, { recursive: true });
const entrada = process.env.ASSA_RPS;
const lineas = process.argv.includes('--actualizar-rps') ? await leerLoteRps(fecha) :
  JSON.parse(fs.readFileSync(entrada, 'utf8')).lineas.filter(l => l.entregaSolicitada === fecha);
const lote = prepararLote(fecha, lineas);
const local = path.join(carpeta, lote.nombre + '.dxf');
if (!lote.programas.length) throw new Error('No hay líneas validadas: no se escribe un corte vacío.');
fs.writeFileSync(path.join(carpeta, 'rps.json'), JSON.stringify({ recogido: new Date().toISOString(), lineas }, null, 2));
fs.writeFileSync(local, escribirDxf2004(lote.entidades, { dx: 0, dy: 0, leyenda: true }), 'latin1');
const anio = fecha.slice(0, 4), nombre = lote.nombre + '.dxf';
const real = process.env.ASSA_CORTE_REAL || path.join(process.env.ASSA_ESTUDIO, 'cortes', anio, nombre);
const hash = p => crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');
const modeloReal = leerPlanoDxf(real).modelo, modeloNuevo = leerPlanoDxf(local).modelo;
const reales = extraerPanos(modeloReal), nuevos = extraerPanos(modeloNuevo);
const familias = new Set(['420102', '420148', '420150']);
const filas = [...Map.groupBy(lineas.filter(l => familias.has(codigoAssa(l.CodArticle)?.slice(0, 6))), l => codigoAssa(l.CodArticle))].map(([codigo, ls]) => {
  const cantidad = gs => gs.filter(g => g.codigo === codigo).reduce((n, g) => n + g.panos.length * g.repeticiones, 0);
  const manuales = lote.lineas.filter(l => l.codigo === codigo && l.estado === 'a-mano');
  return { codigo, pedida: ls.reduce((n, l) => n + l.cantidad, 0), nueva: cantidad(nuevos), real: cantidad(reales),
    estado: manuales.length ? 'a-mano' : 'generado', motivos: [...new Set(manuales.flatMap(l => l.motivos))] };
});
const tabla = [
  '| Referencia | RPS | Paños nuevos × repeticiones | Paños reales × repeticiones | Estado / diferencias |',
  '| --- | --- | --- | --- | --- |',
  ...filas.map(f => `| ${f.codigo} | ${f.pedida} | ${f.nueva} | ${f.real} | ${f.estado}: ${f.motivos.join(' ').replaceAll('|', '\\|')} |`),
].join('\n');
const informe = `# ${lote.nombre} · ${fecha}\n\nComparación generada por \`scripts/validar-assa-lote.mjs\`. Cantidades de paños por fecha y referencia; los motivos se conservan, sin completar stock ni ocultar las líneas a mano. Las familias de fase B no entran en esta tabla.\n\n${tabla}\n\nOriginal leído: ${real}\n\nSHA-256 original: ${hash(real)}\n\nSHA-256 nuevo: ${hash(local)}\n\nLa 420150 permanece fuera del archivo mientras no se cierre la cantidad de canalones por cubierta. Este archivo es una prueba parcial de las líneas validadas, no un lote completo aprobado.\n`;
fs.writeFileSync(path.join(carpeta, 'diferencias.md'), informe);
fs.writeFileSync(path.join(carpeta, 'comparacion.json'), JSON.stringify({ fecha, lineas: filas, hashReal: hash(real), hashNuevo: hash(local), corteReal: real, parcial: lote.aMano > 0 }, null, 2));
let publicado = null;
if (process.argv.includes('--red')) {
  publicado = path.win32.join(CARPETA_PRUEBAS_ASSA, 'COMBURSA', anio, nombre);
  fs.mkdirSync(path.win32.dirname(publicado), { recursive: true });
  fs.copyFileSync(local, publicado, fs.constants.COPYFILE_EXCL);
}
console.log(JSON.stringify({ fecha, lineas: lineas.length, unidades: lote.totalUnidades, aMano: lote.aMano, programas: lote.programas.length, publicado, informe: path.join(carpeta, 'diferencias.md') }, null, 2));
if (process.argv.includes('--actualizar-rps')) {
  const { closeRpsCatalog } = await import('../src/rpsCatalog.js');
  await closeRpsCatalog();
}
