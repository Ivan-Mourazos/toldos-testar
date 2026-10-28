// Un lote reciente: SELECT opcional de RPS, comparación local y salida exclusiva de pruebas.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { prepararLote } from '../src/assa/lote.js';
import { leerLoteRps } from '../src/assa/rps.js';
import { calcularFamilia, generarProgramas } from '../src/assa/faseA.js';
import catalogo from '../src/assa/validacionCatalogo.json' with { type: 'json' };
import { operacionesEnPano } from '../src/assa/comparar.js';
import { validarLineasLote } from '../src/assa/validarLotes.js';
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
// Palets de prueba en ASSA_PALETS: {"AR.26.05047": 1, "AR.26.05064/1": 1, …}; la línea manda sobre el pedido.
const porPedido = process.env.ASSA_PALETS ? JSON.parse(process.env.ASSA_PALETS) : {};
const palets = Object.fromEntries(lineas.map(l => [l.IDOrderLine, porPedido[`${l.CodOrder}/${l.NumLine}`] ?? porPedido[l.CodOrder]]).filter(([, p]) => p));
const lote = prepararLote(fecha, lineas, {}, undefined, { palets });
const local = path.join(carpeta, lote.nombre + '.dxf');
if (!lote.programas.length) throw new Error('No hay líneas validadas: no se escribe un corte vacío.');
fs.writeFileSync(path.join(carpeta, 'rps.json'), JSON.stringify({ recogido: new Date().toISOString(), lineas }, null, 2));
fs.writeFileSync(local, escribirDxf2004(lote.entidades), 'latin1');
const anio = fecha.slice(0, 4), nombre = lote.nombre + '.dxf';
const real = process.env.ASSA_CORTE_REAL || path.join(process.env.ASSA_ESTUDIO, 'cortes', anio, nombre);
const hash = p => crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');
const modeloReal = leerPlanoDxf(real).modelo, modeloNuevo = leerPlanoDxf(local).modelo;
const reales = extraerPanos(modeloReal), nuevos = extraerPanos(modeloNuevo);
const familias = new Set(['420102', '420148', '420150']);
const seleccion = lineas.filter(l => familias.has(codigoAssa(l.CodArticle)?.slice(0, 6)));
const programas = (grupos, modelo, fichero) => grupos.map(g => ({ fecha, fichero, sha256: hash(fichero), codigo: g.codigo,
  rotulo: g.titulo.handle, repeticiones: g.repeticiones,
  panos: g.panos.map(p => ({ ...p, operaciones: operacionesEnPano(modelo, p.caja, p.uniones) })) }));
const generar = l => {
  const prueba = catalogo.referencias[codigoAssa(l.CodArticle)]?.descripciones.find(p => p.descripcion === String(l.descripcion).trim());
  const g = calcularFamilia(l, prueba);
  return { ...g, programas: generarProgramas(g) };
};
const contrasteReal = validarLineasLote(seleccion, programas(reales, modeloReal, real), { generar });
const contrasteNuevo = validarLineasLote(seleccion, programas(nuevos, modeloNuevo, local), { generar });
const filas = [...Map.groupBy(lineas.filter(l => familias.has(codigoAssa(l.CodArticle)?.slice(0, 6))), l => codigoAssa(l.CodArticle))].map(([codigo, ls]) => {
  const cantidad = gs => gs.filter(g => g.codigo === codigo).reduce((n, g) => n + g.panos.length * g.repeticiones, 0);
  const manuales = lote.lineas.filter(l => l.codigo === codigo && l.estado === 'a-mano');
  const rs = contrasteReal.filter(f => codigoAssa(f.referencia) === codigo);
  const ns = contrasteNuevo.filter(f => codigoAssa(f.referencia) === codigo);
  // Lo generado se cuenta en los programas del lote: el lector de cortes está hecho para los lotes de la oficina y
  // confunde columnas sueltas de uno o dos paños. Sus medidas ya se exigen iguales a las del catálogo contrastado.
  const generada = lote.programas.filter(p => p.codigo === codigo).reduce((n, p) => n + p.panos * p.repeticiones, 0);
  return { codigo, pedida: ls.reduce((n, l) => n + l.cantidad, 0), nueva: generada, leidaNueva: cantidad(nuevos), real: cantidad(reales),
    geometriaReal: rs.every(f => f.geometria), geometriaNueva: ns.every(f => f.geometria),
    estado: manuales.length ? 'a-mano' : 'generado', motivos: [...new Set(manuales.flatMap(l => l.motivos))],
    diferencias: [...new Set(rs.flatMap(f => f.motivos))] };
});
// La cantidad del lote real puede ser menor: el stock se pone en corte (Q-AS03). Se exige la forma real y la cantidad de RPS.
if (filas.some(f => f.estado === 'generado' && (!f.geometriaReal || f.nueva !== f.pedida))) {
  throw new Error('Una referencia habilitada no coincide en contorno, herramienta, orillo o cantidad: no se publica. ' +
    JSON.stringify(contrasteNuevo.filter(f => lote.lineas.some(l => l.IDOrderLine === f.linea && l.estado === 'validado'))
      .map(f => ({ referencia: f.referencia, motivos: f.motivos, comprobaciones: f.comprobaciones }))));
}
let publicado = null;
if (process.argv.includes('--red')) {
  // Cada huella tiene su carpeta: nunca sustituye una prueba anterior ni escribe en producción.
  publicado = path.win32.join(CARPETA_PRUEBAS_ASSA, 'COMBURSA', anio, hash(local).slice(0, 12), nombre);
  fs.mkdirSync(path.win32.dirname(publicado), { recursive: true });
  if (!fs.existsSync(publicado)) fs.copyFileSync(local, publicado, fs.constants.COPYFILE_EXCL);
  if (hash(publicado) !== hash(local)) throw new Error('La copia de prueba no conserva los bytes del DXF local.');
}
const tabla = [
  '| Referencia | RPS | Paños nuevos × repeticiones | Paños reales × repeticiones | Geometría real / nueva | Estado / diferencias |',
  '| --- | --- | --- | --- | --- | --- |',
  ...filas.map(f => `| ${f.codigo} | ${f.pedida} | ${f.nueva} | ${f.real} | ${f.geometriaReal ? 'Igual' : 'Difiere'} / ${f.nueva ? (f.geometriaNueva ? 'Igual' : 'Difiere') : 'Excluida'} | ${f.estado}: ${[...new Set([...f.motivos, ...f.diferencias])].join(' ').replaceAll('|', '\\|')} |`),
].join('\n');
const informe = `# ${lote.nombre} · ${fecha}\n\nComparación generada por \`scripts/validar-assa-lote.mjs\`. Medidas, herramientas y orillo de todos los paños identificados dentro de ±1 mm, y cantidades exactas por fecha y referencia; los motivos se conservan, sin completar stock ni ocultar las líneas a mano. Las familias de fase B no entran en esta tabla.\n\n${tabla}\n\nOriginal leído: ${real}\n\nSHA-256 original: ${hash(real)}\n\nSHA-256 nuevo: ${hash(local)}\n\nPrueba publicada: ${publicado || 'No solicitada'}\n\nLa 420150 permanece fuera del archivo mientras no se cierre la cantidad de canalones por cubierta. Este archivo es una prueba parcial de las líneas validadas, no un lote completo aprobado.\n`;
fs.writeFileSync(path.join(carpeta, 'diferencias.md'), informe);
fs.writeFileSync(path.join(carpeta, 'comparacion.json'), JSON.stringify({ fecha, lineas: filas, hashReal: hash(real), hashNuevo: hash(local), corteReal: real, publicado, parcial: lote.aMano > 0, contrasteReal, contrasteNuevo }, null, 2));
console.log(JSON.stringify({ fecha, lineas: lineas.length, unidades: lote.totalUnidades, aMano: lote.aMano, programas: lote.programas.length, publicado, informe: path.join(carpeta, 'diferencias.md') }, null, 2));
if (process.argv.includes('--actualizar-rps')) {
  const { closeRpsCatalog } = await import('../src/rpsCatalog.js');
  await closeRpsCatalog();
}
