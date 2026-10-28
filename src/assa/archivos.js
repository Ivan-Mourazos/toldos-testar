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

export const CARPETA_PRUEBAS_ASSA = '\\\\192.168.0.128\\Oftecnica\\Oficina Tecnica\\DXF PRUEBAS WEB';
const error = mensaje => Object.assign(new Error(mensaje), { statusCode: 409 });
const huella = dato => createHash('sha256').update(JSON.stringify(dato)).digest('hex');

/** Plano de revisión en metros y sin hojas: el mismo extractor CORTE del resto de la web. */
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
  const capa = `  0\nLAYER\n  5\n${id()}\n330\n2\n100\nAcDbSymbolTableRecord\n100\nAcDbLayerTableRecord\n  2\nRECUADROS\n 70\n0\n 62\n30\n  6\nContinuous\n290\n0\n`;
  const tabla = dxf.slice(ini, fin).replace(/( 70\n\s*)(\d+)/, (_m, p, n) => p + (Number(n) + 1));
  dxf = dxf.slice(0, ini) + tabla + capa + dxf.slice(fin);
  const comun = tipo => `  0\n${tipo}\n  5\n${id()}\n330\n1F\n100\nAcDbEntity\n  8\nRECUADROS\n`;
  const marco = comun('LWPOLYLINE') + `100\nAcDbPolyline\n 90\n4\n 70\n1\n 10\n${xmin}\n 20\n${ymin}\n 10\n${xmax}\n 20\n${ymin}\n 10\n${xmax}\n 20\n${ymax}\n 10\n${xmin}\n 20\n${ymax}\n`;
  const titulo = comun('TEXT') + `100\nAcDbText\n 10\n${xmin}\n 20\n${ymax + 0.2}\n 30\n0\n 40\n0.15\n  1\nCORTE\n100\nAcDbText\n`;
  const comienzo = dxf.indexOf('\nENTITIES\n') + '\nENTITIES\n'.length;
  const end = dxf.indexOf('  0\nENDSEC\n', comienzo);
  return (dxf.slice(0, end) + marco + titulo + dxf.slice(end)).replace(/(\$HANDSEED\n\s*5\n)[0-9A-F]+/, `$1${id()}`).replace(/\n/g, '\r\n');
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
