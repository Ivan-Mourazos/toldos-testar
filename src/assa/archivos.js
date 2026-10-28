import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { prepararLote } from './lote.js';
import { leerLoteRps } from './rps.js';
import { fechaLote } from './faseA.js';
import { escribirDxf2004 } from '../domain/corteLona/dxfCorte.js';
import { crearFlujoDwg } from '../flujoDwg/flujo.ts';
import { crearAlmacenConfirmaciones } from '../flujoDwg/confirmaciones.js';
import { writeFileAtomic } from '../workflow.js';
import { rutaParaTgmPedidos } from '../flujoDwg/rutaPc.js';
import { CAPAS_HOJAS, hojasPedidos } from './hojasLote.js';

export const CARPETA_PRUEBAS_ASSA = '\\\\192.168.0.128\\Oftecnica\\Oficina Tecnica\\DXF PRUEBAS WEB';
const error = mensaje => Object.assign(new Error(mensaje), { statusCode: 409 });
const huella = dato => createHash('sha256').update(JSON.stringify(dato)).digest('hex');

const n = v => Number(v).toFixed(6);

/** Plano de revisión en metros: el corte en su recuadro CORTE (lo único que va al bot, con el mismo extractor del resto
 * de la web) y, encima y fuera de él, las hojas de pedido con los dibujos de confección. */
export function planoDelLote(lote) {
  // El recuadro CORTE abarca todo el lote: los palets, sus filas, los números grandes y el listado de cada palet.
  const e = lote.entidades, xs = [0, ...e.lineas.flatMap(l => [l.x1, l.x2]), ...e.textos.flatMap(t => [t.x, t.x + String(t.valor).length * t.h * 0.7])];
  const ys = [0, 2040, ...e.lineas.flatMap(l => [l.y1, l.y2]), ...e.textos.flatMap(t => [t.y, t.y + t.h])];
  const [xmin, xmax, ymin, ymax] = [Math.min(...xs) / 1000 - 1, Math.max(...xs) / 1000 + 1, Math.min(...ys) / 1000 - 1, Math.max(...ys) / 1000 + 1];
  let dxf = escribirDxf2004(lote.entidades, { dx: 0, dy: 0, escala: .001, leyenda: false }).replace(/\r\n/g, '\n');
  // Se añade una capa de revisión que jamás llega al bot. Sus entidades usan el modelo 1F de la plantilla común.
  const ini = dxf.indexOf('  0\nTABLE\n  2\nLAYER\n'), fin = dxf.indexOf('  0\nENDTAB\n', ini);
  if (ini < 0 || fin < 0) throw new Error('La plantilla no contiene la tabla de capas.');
  const seed = /\$HANDSEED\n\s*5\n([0-9A-F]+)/.exec(dxf);
  let handle = parseInt(seed[1], 16);
  const id = () => (handle++).toString(16).toUpperCase();
  const registro = (nombre, color, imprimir = true) => `  0\nLAYER\n  5\n${id()}\n330\n2\n100\nAcDbSymbolTableRecord\n100\nAcDbLayerTableRecord\n  2\n${nombre}\n 70\n0\n 62\n${color}\n  6\nContinuous\n${imprimir ? '' : '290\n0\n'}`;
  // Las capas de oficina de los dibujos de confección de las hojas, si la plantilla no las trae.
  const nuevas = CAPAS_HOJAS.filter(c => !dxf.includes(`\n  2\n${c.nombre}\n`));
  const capa = registro('RECUADROS', 30, false) + nuevas.map(c => registro(c.nombre, c.color)).join('');
  const tabla = dxf.slice(ini, fin).replace(/( 70\n\s*)(\d+)/, (_m, p, n) => p + (Number(n) + 1 + nuevas.length));
  dxf = dxf.slice(0, ini) + tabla + capa + dxf.slice(fin);
  const comun = tipo => `  0\n${tipo}\n  5\n${id()}\n330\n1F\n100\nAcDbEntity\n  8\nRECUADROS\n`;
  const marco = comun('LWPOLYLINE') + `100\nAcDbPolyline\n 90\n4\n 70\n1\n 10\n${xmin}\n 20\n${ymin}\n 10\n${xmax}\n 20\n${ymin}\n 10\n${xmax}\n 20\n${ymax}\n 10\n${xmin}\n 20\n${ymax}\n`;
  const titulo = comun('TEXT') + `100\nAcDbText\n 10\n${xmin}\n 20\n${ymax + 0.2}\n 30\n0\n 40\n0.15\n  1\nCORTE\n100\nAcDbText\n`;
  // Las hojas de pedido, 20 m por encima del corte y fuera de su recuadro: no llegan al bot.
  const enCero = hojasPedidos(lote.lineas ?? [], 0).entidades;
  const bajo = Math.min(0, ...enCero.lineas.flatMap(l => [l.y1, l.y2]), ...enCero.textos.map(t => t.y - t.h)), sube = ymax * 1000 + 20000 - bajo;
  const hojas = { lineas: enCero.lineas.map(l => ({ ...l, y1: l.y1 + sube, y2: l.y2 + sube })), arcos: enCero.arcos.map(a => ({ ...a, y: a.y + sube })),
    textos: enCero.textos.map(t => ({ ...t, y: t.y + sube })) }, m = v => n(v / 1000);
  const ent = (tipo, c) => `  0\n${tipo}\n  5\n${id()}\n330\n1F\n100\nAcDbEntity\n  8\n${c}\n`;
  // Alineación del TEXT según el anclaje del MTEXT de origen (1-9: de arriba a la izquierda a abajo a la derecha).
  const alinear = a => [[0, 3], [1, 3], [2, 3], [0, 2], [1, 2], [2, 2], [0, 1], [1, 1], [2, 1]][(a ?? 1) - 1] ?? [0, 0];
  const deHojas = [
    ...hojas.lineas.map(l => ent('LINE', l.capa) + `100\nAcDbLine\n 10\n${m(l.x1)}\n 20\n${m(l.y1)}\n 30\n0\n 11\n${m(l.x2)}\n 21\n${m(l.y2)}\n 31\n0\n`),
    ...hojas.arcos.map(a => ent('ARC', a.capa) + `100\nAcDbCircle\n 10\n${m(a.x)}\n 20\n${m(a.y)}\n 30\n0\n 40\n${m(a.r)}\n100\nAcDbArc\n 50\n${n(a.desde)}\n 51\n${n(a.hasta)}\n`),
    ...hojas.textos.map(t => {
      const [h, v] = alinear(t.ancla), valor = String(t.valor).replace(/\s*\n\s*/g, ' ');
      return ent('TEXT', t.capa) + `100\nAcDbText\n 10\n${m(t.x)}\n 20\n${m(t.y)}\n 30\n0\n 40\n${m(t.h)}\n  1\n${valor}\n 50\n${n(t.giro ?? 0)}\n 72\n${h}\n 11\n${m(t.x)}\n 21\n${m(t.y)}\n 31\n0\n100\nAcDbText\n 73\n${v}\n`;
    }),
  ].join('');
  const comienzo = dxf.indexOf('\nENTITIES\n') + '\nENTITIES\n'.length;
  const end = dxf.indexOf('  0\nENDSEC\n', comienzo);
  return (dxf.slice(0, end) + marco + titulo + deHojas + dxf.slice(end)).replace(/(\$HANDSEED\n\s*5\n)[0-9A-F]+/, `$1${id()}`).replace(/\n/g, '\r\n');
}

export function crearServicioLotes({ carpeta = path.resolve('tmp/combursa'), oda = { disponible: false }, leer = leerLoteRps, preparar = prepararLote } = {}) {
  const base = path.resolve(carpeta), tmp = path.resolve('tmp');
  if (base.toLowerCase() !== path.resolve(CARPETA_PRUEBAS_ASSA).toLowerCase() && !base.startsWith(tmp + path.sep)) throw new Error('COMBURSA solo escribe en tmp o en DXF PRUEBAS WEB durante esta fase.');
  const pendientes = new Set();
  const obtener = async input => {
    fechaLote(input.fecha);
    const lineas = await leer(input.fecha), sueltas = input.sueltas ?? {};
    if (typeof sueltas !== 'object' || Array.isArray(sueltas) || Object.values(sueltas).some(v => typeof v !== 'boolean')) throw error('Las opciones por referencia deben ser casillas de sueltas.');
    const palets = input.palets ?? {};
    if (typeof palets !== 'object' || Array.isArray(palets) || Object.values(palets).some(v => !Number.isSafeInteger(v) || v < 1 || v > 99)) throw error('El palet de cada línea debe ser un número del 1 al 99.');
    const lote = preparar(input.fecha, lineas, sueltas, undefined, { palets });
    const ordenadas = o => Object.entries(o).sort(([a], [b]) => a.localeCompare(b));
    const firma = huella({ lineas, sueltas: ordenadas(sueltas), palets: ordenadas(palets), version: 2 });
    const raiz = path.join(base, 'COMBURSA', input.fecha.slice(0, 4));
    const borradores = path.join(raiz, 'Borradores'), interno = path.join(raiz, 'Registro');
    const manifest = path.join(interno, input.fecha + '.json');
    const confirmaciones = crearAlmacenConfirmaciones({ carpeta: async () => path.join(interno, 'Confirmaciones') });
    const flujo = crearFlujoDwg({ ajustes: async () => ({ productionEnabled: true, corteBorradoresDirectory: borradores,
      corteBorradoresRed: rutaParaTgmPedidos(borradores), corteLonaPlanoDirectory: borradores }), confirmaciones,
      leer: async ruta => (await oda.convertir(await fs.readFile(ruta), { desde: 'dwg', hasta: 'dxf' })).toString('utf8'),
      escribir: async f => { await fs.mkdir(path.dirname(f.savedPath), { recursive: true }); await writeFileAtomic(f.savedPath, f.contenido); } });
    return { lote, firma, raiz, borradores, manifest, flujo, confirmaciones };
  };
  const leerManifest = async ruta => {
    try { return JSON.parse(await fs.readFile(ruta, 'utf8')); }
    catch (e) { if (e.code === 'ENOENT') return null; throw e; }
  };
  const guardar = async (ruta, datos) => { await fs.mkdir(path.dirname(ruta), { recursive: true }); await writeFileAtomic(ruta, JSON.stringify(datos, null, 2)); };
  const vigente = async ctx => {
    const anterior = await leerManifest(ctx.manifest);
    if (!anterior || anterior.firma !== ctx.firma) throw error('Han cambiado RPS o las opciones: abre el corte y genéralo de nuevo antes de confirmar.');
    return anterior;
  };
  const accion = fn => async input => {
    if (!String(input.savedBy ?? '').trim()) throw error('Elige quién eres antes de preparar o confirmar el lote.');
    fechaLote(input.fecha);
    if (pendientes.has(input.fecha)) throw error('Este lote está ocupado: espera un momento.');
    pendientes.add(input.fecha);
    try { return await fn(await obtener(input), input); }
    finally { pendientes.delete(input.fecha); }
  };
  return {
    async vista(input) {
      const ctx = await obtener(input);
      return { ...ctx.lote, destino: base, dwgDisponible: oda.disponible };
    },
    abrir: accion(async (ctx, input) => {
      if (!ctx.lote.programas.length) throw error('No hay corte validado para preparar: todas las líneas quedan a mano.');
      if (!ctx.lote.paletsCompletos) throw error('Pon el palet de todas las líneas del corte antes de abrirlo.');
      if (!oda.disponible) throw error('Configura ODA para preparar y abrir el DWG del lote.');
      const respuesta = await ctx.flujo.borrador({ orderCode: ctx.lote.nombre, regenerar: input.regenerar === true,
        preparar: async carpeta => ({ avisos: ctx.lote.aMano ? [`${ctx.lote.aMano} líneas a mano: no están incluidas en este corte.`] : [],
          fichero: { filename: ctx.lote.nombre + '.dwg', savedPath: path.join(carpeta, ctx.lote.nombre + '.dwg'),
            contenido: await oda.convertir(Buffer.from(planoDelLote(ctx.lote), 'latin1')) } }) });
      if (!respuesta.cuerpo.existente) {
        await ctx.confirmaciones.borrar(ctx.lote.nombre);
        await guardar(ctx.manifest, { firma: ctx.firma, reparto: ctx.lote.reparto, fecha: input.fecha });
      }
      return respuesta.cuerpo;
    }),
    confirmar: accion(async (ctx, input) => {
      await vigente(ctx);
      const respuesta = await ctx.flujo.confirmar(ctx.lote.nombre, input.savedBy);
      if (respuesta.status !== 200) throw error(respuesta.cuerpo.error);
      const c = await ctx.confirmaciones.leer(ctx.lote.nombre);
      await ctx.confirmaciones.guardar(ctx.lote.nombre, { ...c, firmaRps: ctx.firma });
      return respuesta.cuerpo;
    }),
    mandar: accion(async ctx => {
      const anterior = await vigente(ctx);
      const c = await ctx.confirmaciones.leer(ctx.lote.nombre);
      if (!c || c.firmaRps !== ctx.firma) throw error('Abre el DWG y pulsa Confirmar corte antes de enviar.');
      const corte = await ctx.flujo.corteDelDwg({ ...c, plano: path.join(ctx.borradores, c.filename) });
      if (corte.huella !== c.huella) throw error('El DWG ha cambiado: revísalo y vuelve a confirmar el corte.');
      if (anterior.envio) return { ...anterior.envio, yaEnviado: true };
      const carpetaDxf = path.join(ctx.raiz, 'DXF'), ruta = path.join(carpetaDxf, ctx.lote.nombre + '.dxf');
      await fs.mkdir(carpetaDxf, { recursive: true });
      // wx protege también frente a un segundo proceso o a la pérdida del registro después de escribir.
      await fs.writeFile(ruta, Buffer.from(corte.dxf, 'latin1'), { flag: 'wx' });
      const envio = { ruta, huella: corte.huella, fecha: new Date().toISOString() };
      await guardar(ctx.manifest, { ...anterior, envio });
      return envio;
    }),
  };
}
