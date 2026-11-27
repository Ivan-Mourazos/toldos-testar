// Un lote reciente: SELECT opcional de RPS, comparación local y salida exclusiva de pruebas.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { prepararLote } from '../src/assa/lote.js';
import { leerLoteRps } from '../src/assa/rps.js';
import { calcularFamilia, generarProgramas } from '../src/assa/faseA.js';
import catalogo from '../src/assa/validacionCatalogo.json' with { type: 'json' };
import { compararOperaciones, operacionesEnPano } from '../src/assa/comparar.js';
import { contrastarCanalon } from '../src/assa/contrastarCanalon.js';
import { validarLineasLote } from '../src/assa/validarLotes.js';
import { escribirDxf2004 } from '../src/domain/corteLona/dxfCorte.js';
import { codigoAssa, extraerPanos } from '../src/assa/leerCorte.js';
import { leerPlanoDxf } from './lib/plano-dxf.mjs';
import { CARPETA_PRUEBAS_ASSA } from '../src/assa/archivos.js';
import { familiaTunel } from '../src/assa/tuneles.js';

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
const familias = new Set(['420102', '420148', '420150', '430125', '430127', '430129', '430172']);
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
// Se vuelve a leer cada programa por sus coordenadas, con todos sus bordes, curvas y marcas. Las columnas de una o
// dos sueltas no dependen así del lector de rótulos de oficina. El escritor desplaza el corte 1000 mm en ambos ejes.
const operacionesPrograma = e => [
  ...e.lineas.map(l => ({ tipo: 'raya', capa: l.capa, a: [l.x1, l.y1], b: [l.x2, l.y2] })),
  ...e.arcos.map(a => ({ ...a, tipo: 'arco', punto: [a.x, a.y] })),
  ...e.circulos.map(c => ({ ...c, tipo: 'arco', punto: [c.x, c.y], desde: 0, hasta: 360 })),
];
const programasEscritos = lote.programas.map(p => {
  const caja = { x0: p.x + 1000, y0: p.y + 1000, x1: p.x + 1000 + p.largoMm, y1: p.y + 1000 + p.anchoOcupadoMm };
  return { codigo: p.codigo, palet: p.palet, ...compararOperaciones(operacionesPrograma(p.entidades),
    operacionesEnPano(modeloNuevo, caja, [], { conBordes: true, conTaladro: !!familiaTunel(p.codigo) })) };
});
const canalesReales = [...new Map(lote.lineas.filter(l => l.estado === 'validado' && l.canalon)
  .map(l => [JSON.stringify(l.canalon), l])).values()].map(l => ({ codigo: l.codigo,
    ...contrastarCanalon(modeloReal, l.canalon) }));
if (programasEscritos.some(p => !p.coincide) || canalesReales.some(p => !p.coincide) || lote.cortador.some(f => !f.cuadra)) {
  throw new Error('El DXF escrito, los canalones reales o el papel del cortador no cuadran: no se publica. ' + JSON.stringify({
    programas: programasEscritos.filter(p => !p.coincide), canalones: canalesReales.filter(p => !p.coincide),
    cortador: lote.cortador.filter(f => !f.cuadra),
  }));
}
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

for (const [codigo, ls] of Map.groupBy(lote.lineas.filter(l => familiaTunel(l.codigo)), l => l.codigo)) {
  const pedida = ls.reduce((n, l) => n + l.cantidad, 0);
  const ps = lote.programas.filter(p => p.codigo === codigo);
  const gs = reales.filter(g => g.codigo === codigo);
  const manuales = ls.filter(l => l.estado === 'a-mano');
  const [largo, ancho] = ls.find(l => l.corteMm)?.corteMm ?? [];
  const nueva = ps.reduce((n, p) => n + p.panos * p.repeticiones, 0);
  const leidaNueva = nuevos.filter(g => g.codigo === codigo).reduce((n, g) => n + g.panos.length * g.repeticiones, 0);
  const real = gs.reduce((n, g) => n + g.panos.length * g.repeticiones, 0);
  const motivos = [...new Set(manuales.flatMap(l => l.motivos))], diferencias = [];
  const programasReales = gs.map(g => {
    const n = g.panos.length / 2;
    const y0 = Math.min(...g.panos.map(p => p.caja.y0)), y1 = Math.max(...g.panos.map(p => p.caja.y1));
    const caja = { x0: g.x0, x1: g.x1, y0, y1 };
    const pareja = ps.find(p => p.unidos);
    const opciones = { conBordes: true, conTaladro: true };
    // Una pareja del programa nuevo sirve de patrón por fila. Para comparar se repite
    // en las filas del original, que puede haber usado tiradas más anchas que el rollo.
    const base = pareja ? operacionesEnPano(operacionesPrograma(pareja.entidades),
      { x0: 0, x1: 2 * largo, y0: 0, y1: ancho }, [], opciones) : [];
    const esperado = Array.from({ length: n }, (_, i) => {
      const mover = ([x, y]) => [x, y + i * ancho];
      return base.map(p => p.tipo === 'raya' ? { ...p, a: mover(p.a), b: mover(p.b) } : { ...p, punto: mover(p.punto) });
    }).flat();
    const forma = compararOperaciones(esperado, operacionesEnPano(modeloReal, caja, [], opciones));
    const medidas = Number.isInteger(n) && g.panos.every(p => p.uniones.length === 1 &&
      p.medidasMm.every((v, j) => Math.abs(v - [largo, ancho][j]) <= 1));
    return { panos: g.panos.length, repeticiones: g.repeticiones, anchoMm: Math.round(y1 - y0), medidas, ...forma };
  });
  const geometriaReal = programasReales.length > 0 && programasReales.every(p => p.medidas && p.coincide);
  if (!geometriaReal) diferencias.push('El contorno o las herramientas del DXF real difieren o no se han podido comprobar.');
  if (pedida !== real) diferencias.push(`El DXF de Tamara contiene ${real} unidades y RPS pide ${pedida}.`);
  const sobreancho = [...new Set(programasReales.map(p => p.anchoMm))].filter(mm => mm > 2040);
  if (sobreancho.length) diferencias.push(`El DXF de Tamara ocupa ${sobreancho.join(', ')} mm de ancho; la web mantiene las cotas del paño con menos filas por tirada.`);
  const geometriaNueva = ps.length > 0 && nueva === leidaNueva &&
    ps.every(p => p.anchoOcupadoMm <= 2040) && programasEscritos.filter(p => p.codigo === codigo).every(p => p.coincide);
  if (ps.length && !geometriaNueva) diferencias.push('El DXF nuevo no cuadra al releer sus paños, herramientas o ancho de rollo.');
  filas.push({ codigo, pedida, nueva, leidaNueva, real, geometriaReal, geometriaNueva, motivos, diferencias, programasReales,
    programasNuevos: ps.map(p => ({ panos: p.panos, repeticiones: p.repeticiones, anchoMm: p.anchoOcupadoMm })),
    estado: manuales.length ? 'a-mano' : 'generado' });
}
// La cantidad del lote real puede ser menor: el stock se pone en corte (Q-AS03). Se exige la forma real y la cantidad de RPS.
const sinContraste = filas.filter(f => f.estado === 'generado' &&
  (!f.geometriaReal || f.nueva !== f.pedida || (familiaTunel(f.codigo) && !f.geometriaNueva)));
if (sinContraste.length) {
  throw new Error('Una referencia habilitada no coincide en contorno, herramienta, orillo o cantidad: no se publica. ' +
    JSON.stringify(sinContraste));
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
const informe = `# ${lote.nombre} · ${fecha}\n\nComparación generada por \`scripts/validar-assa-lote.mjs\`. Medidas y herramientas dentro de ±1 mm; cantidades exactas de RPS, sin completar stock ni ocultar las líneas a mano. NumLine, OF y palet se conservan en el listado.\n\n${tabla}\n\nOriginal leído: ${real}\n\nSHA-256 original: ${hash(real)}\n\nSHA-256 nuevo: ${hash(local)}\n\nPrueba publicada: ${publicado || 'No solicitada'}\n\nSe han releído y contrastado ${programasEscritos.length} programas escritos y ${canalesReales.length} juegos reales de canalón. El papel del cortador cuadra en sus ${lote.cortador.length} filas. Líneas a mano: ${lote.aMano}.\n`;
fs.writeFileSync(path.join(carpeta, 'diferencias.md'), informe);
fs.writeFileSync(path.join(carpeta, 'comparacion.json'), JSON.stringify({ fecha, lineas: filas, hashReal: hash(real), hashNuevo: hash(local), corteReal: real, publicado, parcial: lote.aMano > 0,
  programasEscritos, canalesReales, cortador: lote.cortador, contrasteReal, contrasteNuevo }, null, 2));
console.log(JSON.stringify({ fecha, lineas: lineas.length, unidades: lote.totalUnidades, aMano: lote.aMano, programas: lote.programas.length, publicado, informe: path.join(carpeta, 'diferencias.md') }, null, 2));
if (process.argv.includes('--actualizar-rps')) {
  const { closeRpsCatalog } = await import('../src/rpsCatalog.js');
  await closeRpsCatalog();
}
