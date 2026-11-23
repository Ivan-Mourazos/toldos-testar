import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { preparar } from '../../src/cmt/preparacion/index.ts';
import { leerDxf, value } from '../../src/cmt/dxf.ts';
import { quitarLeyendaWeb } from '../../src/cmt/leyenda.ts';
import tabla from '../../src/cmt/preparacion/capasIniciales.json' with { type: 'json' };
import { dxfACmt, leerCmt } from '../../src/cmt/index.ts';
import { invertir, UNIDADES } from '../../src/cmt/geometria.ts';
import { resumirObjetos } from '../../src/cmtHerramientaRoutes.js';
import { textoDxf } from '../../src/cmtPiloto.js';
import { crearOdaConverter } from '../../src/odaConverter.js';

const estudio = path.dirname(fileURLToPath(import.meta.url));
const tmp = path.dirname(estudio);
const muestras = [
  ['02_AR2605644.dwg', 'Toldos'],
  ['15_AR2604748.dwg', 'Toldos', 0],
  ['25_AR2605630.dwg', 'Expediente con capas de toldos'],
  ['31_AR2605548.dwg', 'Expediente con capas de toldos'],
  ['61_AR2605365.dwg', 'Puertas'],
  ['62_AR2605363.dwg', 'Puertas'],
  ['63_AR2605246.dwg', 'Puertas'],
  ['65_AR2605319.dwg', 'Remolques'],
  ['66_AR2605192.dwg', 'Remolques'],
  ['67_AR2605158.dwg', 'Remolques'],
];
const oda = crearOdaConverter({
  executable: process.env.ODA_FILE_CONVERTER || 'C:/Users/ivan.sanchez/tools/oda/ODAFileConverter.exe',
  tempRoot: path.join(estudio, 'verificacion-oda'),
});
const tolerancia = 0.1;
const sinCorte = new Set(['COTAS', 'EJES', 'BORRAR', 'SECCION L']);

async function cmtDelRobot(codigo) {
  if (!codigo) return null;
  const carpetas = [path.join(tmp, 'cmt-estudio'), path.join(tmp, 'cmt-estudio', 'pares-2026'),
    path.join(tmp, 'bot-estudio', 'pares-2026')];
  for (const carpeta of carpetas) {
    const candidatos = [path.join(carpeta, codigo + '.cmt'), path.join(carpeta, codigo, codigo + '.cmt')];
    for (const archivo of candidatos) {
      try { return { archivo: path.relative(tmp, archivo), bytes: await fs.readFile(archivo) }; }
      catch (e) { if (e.code !== 'ENOENT') throw e; }
    }
  }
  return null;
}

const caminos = doc => doc.objects.flatMap(o => o.paths.map(p => ({ tool: o.tool, puntos: p.points })));
const objetos = doc => doc.objects.map(o => ({ tool: o.tool, paths: o.paths.map(p => p.points) }));
const herramientas = ps => Object.fromEntries([...new Set(ps.map(p => p.tool))].sort()
  .map(h => [h, ps.filter(p => p.tool === h).length]));
function coincide(a, b) {
  return a.length === b.length && a.every((p, i) => p.type === b[i].type
    && Math.hypot(p.x - b[i].x, p.y - b[i].y) <= tolerancia * UNIDADES);
}

// Compara uno a uno los nodos y controles de trayectorias del mismo tipo. Informa de
// segmentos agrupados o divididos como diferencias aunque puedan cubrir una misma línea.
function comparar(nuevo, robot, { alinear = false } = {}) {
  const docNuevo = leerCmt(nuevo), docRobot = robot.doc ?? leerCmt(robot.bytes);
  const a = caminos(docNuevo), b = caminos(docRobot), libres = new Set(b.keys());
  const minimo = (ps, eje) => ps.reduce((min, p) => p.puntos.reduce((m, q) => Math.min(m, q[eje]), min), Infinity);
  const dx = alinear ? minimo(a, 'x') - minimo(b, 'x') : 0;
  const dy = alinear ? minimo(a, 'y') - minimo(b, 'y') : 0;
  const alineados = b.map(p => p.puntos.map(q => ({ ...q, x: q.x + dx, y: q.y + dy })));
  for (const pa of a) {
    for (const i of libres) {
      const pb = b[i];
      if (pa.tool !== pb.tool) continue;
      if (coincide(pa.puntos, alineados[i]) || coincide(pa.puntos, invertir(alineados[i]))) {
        libres.delete(i);
        break;
      }
    }
  }
  const medidaNueva = resumirObjetos(objetos(docNuevo)), medidaRobot = resumirObjetos(objetos(docRobot));
  const redondear = n => Math.round(n * 1000) / 1000;
  return { referencia: robot.archivo, toleranciaMm: tolerancia,
    herramientas: { nuevo: herramientas(a), robot: herramientas(b) },
    traslacionRobotMm: { x: redondear(dx / UNIDADES), y: redondear(dy / UNIDADES) },
    diferenciaMm: { ancho: redondear(medidaNueva.anchoMm - medidaRobot.anchoMm), alto: redondear(medidaNueva.altoMm - medidaRobot.altoMm) },
    trayectorias: { coinciden: b.length - libres.size, nuevo: a.length, robot: b.length },
  };
}

function resolver(texto, marco) {
  const decisiones = marco === undefined ? {} : { marco };
  let resultado = preparar(texto, { origen: 'dwg', tabla, decisiones });
  // Si los marcos detectados son pequeños y dejan todo descartado, se registra cada opción.
  if (resultado.pendientes.marcos) {
    const opciones = resultado.pendientes.marcos.map((_, i) => preparar(texto, { origen: 'dwg', tabla, decisiones: { marco: i }, soloAnalisis: true }));
    if (opciones.every(r => r.dudas.some(d => /No queda nada/.test(d.motivo)))) {
      return { resultado, decisiones, nota: 'Todos los marcos candidatos dejan el corte vacío.' };
    }
    return { resultado, decisiones, nota: 'Falta una elección de marco comprobada.' };
  }
  if (resultado.pendientes.cruces) decisiones.cruces = 'excluir';
  for (let paso = 0; paso < 4; paso++) {
    const capas = resultado.pendientes.capas ?? [];
    const elegidas = Object.fromEntries(capas.filter(c => sinCorte.has(c.capa.toUpperCase())).map(c => [c.capa, 'NO_CORTAR']));
    if (Object.keys(elegidas).length) decisiones.capas = { ...decisiones.capas, ...elegidas };
    const solapes = (resultado.pendientes.solapes ?? []).filter(g => g.capas.includes('DISCO1') && g.capas.includes('ROTULADOR'));
    if (solapes.length) decisiones.solapes = Object.fromEntries(solapes.map(g => [g.clave, 'DISCO1']));
    if (!Object.keys(elegidas).length && !solapes.length && !(paso === 0 && decisiones.cruces)) break;
    resultado = preparar(texto, { origen: 'dwg', tabla, decisiones });
    if (resultado.listo) break;
  }
  return { resultado, decisiones };
}

const resultados = [];
for (const [nombre, grupo, marco] of muestras) {
  const fila = { nombre, grupo };
  resultados.push(fila);
  try {
    const entrada = await fs.readFile(path.join(estudio, 'dwg', nombre));
    const dxf = await oda.convertir(entrada, { desde: 'dwg', hasta: 'dxf' });
    const { resultado: r, decisiones, nota } = resolver(textoDxf(dxf), marco);
    Object.assign(fila, { decisiones, nota, medidasMm: r.medidasMm, pendientes: r.pendientes,
      avisos: r.avisos.filter(a => /repetidos|capa 0/.test(a.motivo)).map(a => a.motivo),
      dudas: r.dudas.map(d => d.motivo), estado: r.listo ? 'Preparado' : 'Bloqueado' });
    const codigo = /AR\d+/i.exec(nombre)?.[0].toUpperCase();
    const robot = await cmtDelRobot(codigo);
    fila.robot = robot?.archivo ?? 'Sin CMT del robot en las carpetas locales';
    if (r.listo && r.dxf) {
      const c = dxfACmt(textoDxf(Buffer.from(r.dxf, 'latin1')), { recolocar: true });
      if (!c.cmt || c.dudas.length || !c.objetos.some(o => o.paths.some(p => p.length > 1))) {
        fila.estado = 'Bloqueado por el CMT';
        fila.dudas = c.dudas.map(d => d.motivo);
      } else {
        fila.estado = 'DXF y CMT verificados';
        fila.cmt = resumirObjetos(c.objetos);
        if (robot) fila.comparacion = comparar(c.cmt, robot);
      }
    }
  } catch (e) {
    fila.estado = 'Error';
    fila.dudas = [e.message];
    process.exitCode = 1;
  }
  console.log(JSON.stringify(fila));
}

// Control separado de los 10 DWG: este par sí tiene el CMT histórico disponible.
const control = 'AR2605081';
const fixtures = path.resolve(estudio, '../../src/cmt/__fixtures__');
const original = textoDxf(await fs.readFile(path.join(fixtures, control + '.dxf')));
const limpio = preparar(original, { origen: 'dxf', tabla });
if (!limpio.listo || !limpio.dxf) throw new Error('El DXF de control queda pendiente.');
const c = dxfACmt(textoDxf(Buffer.from(limpio.dxf, 'latin1')), { recolocar: true });
if (!c.cmt || c.dudas.length) throw new Error('El DXF de control no produce un CMT válido.');
const base64 = await fs.readFile(path.join(fixtures, control + '.cmt.base64'), 'utf8');
const ref = { archivo: control + '.cmt.base64', bytes: Buffer.from(base64, 'base64') };
const comparacionControl = comparar(c.cmt, ref);
const leyenda = quitarLeyendaWeb(leerDxf(original));
const idsCorte = new Set(leyenda.entidades.map(e => value(e, 5)));
const completo = dxfACmt(original);
const doc = leerCmt(ref.bytes);
const indicesCorte = completo.objetos.flatMap((o, i) => o.source.some(id => idsCorte.has(id)) ? [i] : []);
let comparacionSinLeyenda = null;
if (leyenda.quitada && indicesCorte.length && completo.objetos.length === doc.objects.length
    && indicesCorte.every(i => {
      const origen = completo.objetos[i], destino = doc.objects[i];
      return origen.tool === destino.tool && origen.paths.length === destino.paths.length
        && origen.paths.every((p, j) => coincide(p, destino.paths[j].points) || coincide(p, invertir(destino.paths[j].points)));
    })) {
  const dibujo = { objects: indicesCorte.map(i => doc.objects[i]) };
  comparacionSinLeyenda = comparar(c.cmt, { ...ref, doc: dibujo }, { alinear: true });
}
console.log(JSON.stringify({ control, comparacion: comparacionControl, comparacionSinLeyenda }));
await fs.writeFile(path.join(estudio, 'verificacion.json'), JSON.stringify({ resultados, comparacionControl, comparacionSinLeyenda }, null, 2) + '\n');
