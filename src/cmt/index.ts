import plantilla from './plantilla.json' with { type: 'json' };
import { leerCmt, registro } from './binario.ts';
import { leerDxf, value, number } from './dxf.ts';
import { generarGeometria } from './geometria.ts';
import { leerFuente } from './fuente.ts';
import { quitarLeyendaWeb, recolocar } from './leyenda.ts';
import type { Duda, ObjetoGeometrico, OpcionesCmt, Dxf } from './tipos.ts';
export { leerCmt, serializarCmt } from './binario.ts';
export type { DocumentoCmt, ObjetoCmt, RegistroCmt } from './binario.ts';
export type { Duda, ObjetoGeometrico, OpcionesCmt } from './tipos.ts';

export interface ResultadoCmt {
  /** Es null si hay dudas: el llamante debe resolverlas antes de obtener un fichero. */
  cmt: Buffer | null;
  objetos: ObjetoGeometrico[];
  avisos: Duda[];
  dudas: Duda[];
}

function escribir(objetos: ObjetoGeometrico[]): Buffer {
  const records = plantilla.records.map(r => registro(r.id, r.version, Buffer.from(r.base64, 'base64')));
  const n = Buffer.alloc(4); n.writeUInt32LE(objetos.length); records.push(registro(1, 0, n));
  for (const o of objetos) {
    records.push(registro(5, 1, Buffer.alloc(0)));
    const attr = Buffer.alloc(2); attr.writeUInt16LE(o.paths.length); records.push(registro(4, 2, attr)); let lastSize = 0;
    for (const points of o.paths) {
      const b = Buffer.alloc(24 + 20 * points.length); lastSize = b.length; b.writeUInt32LE(points.length);
      for (let i = 0; i < points.length; i++) {
        const p = 4 + 20 * i, q = points[i]; b.writeDoubleLE(q.x, p); b.writeDoubleLE(q.y, p + 8); b.writeUInt16LE(q.type, p + 16); b.writeUInt16LE(q.mark, p + 18);
      }
      records.push(registro(3, 3, b));
    }
    const tool = Buffer.alloc(64);
    if (Buffer.byteLength(o.tool, 'utf16le') > 22) throw new Error('Nombre de herramienta demasiado largo');
    tool.write(o.tool, 0, 22, 'utf16le'); tool.writeUInt32LE(lastSize, 24); tool.writeUInt16LE(3, 28); records.push(registro(53, 2, tool));
  }
  const order = Buffer.alloc(8 + 4 * objetos.length); order.writeUInt32LE(objetos.length);
  for (let i = 0; i < objetos.length; i++) order.writeUInt32LE(i, 4 + 4 * i);
  records.push(registro(2, 0, order));
  const result = Buffer.concat([Buffer.from(plantilla.header, 'base64'), ...records]); leerCmt(result); return result;
}

function validar(d: Dxf): { dudas: Duda[]; avisos: Duda[]; tieneTexto: boolean } {
  const dudas: Duda[] = [], avisos: Duda[] = []; let tieneTexto = false;
  const cabecera = d.sections.HEADER?.[0]?.pairs ?? [];
  const min = cabecera.findIndex(([c, v]) => c === 9 && v === '$EXTMIN');
  if (min < 0 || cabecera[min + 1]?.[0] !== 10 || cabecera[min + 2]?.[0] !== 20 || !Number.isFinite(Number(cabecera[min + 1]?.[1])) || !Number.isFinite(Number(cabecera[min + 2]?.[1]))) dudas.push({motivo: 'Falta $EXTMIN válido para situar el origen en 300/20 mm'});
  const unidades = cabecera.findIndex(([c, v]) => c === 9 && v === '$INSUNITS');
  if (unidades >= 0 && Number(cabecera[unidades + 1]?.[1]) !== 4) dudas.push({motivo: 'El DXF declara unidades distintas de milímetros o sin definir'});
  for (const e of d.entities) {
    const capa = value(e, 8), handle = value(e, 5), base = {handle, tipo: e.type, capa};
    if (number(e, 67)) { avisos.push({...base, motivo: 'Entidad de espacio papel excluida del corte'}); continue; }
    if (e.type === 'VIEWPORT') { avisos.push({...base, motivo: 'Ventana de presentación excluida del corte'}); continue; }
    if (!['DISCO1', 'DISCO2', 'CUTTER', 'ROTULADOR', 'TALADRO', 'TEXTO'].includes(capa.toUpperCase())) dudas.push({...base, motivo: `Capa desconocida: ${capa}`});
    if (!['LINE', 'ARC', 'CIRCLE', 'LWPOLYLINE', 'TEXT'].includes(e.type)) { dudas.push({...base, motivo: `Entidad sin soportar: ${e.type}`}); continue; }
    const requeridos: Record<string, number[]> = {LINE: [10, 20, 11, 21], ARC: [10, 20, 40, 50, 51], CIRCLE: [10, 20, 40], TEXT: [1, 10, 20, 40], LWPOLYLINE: [90, 10, 20]};
    const faltan = requeridos[e.type].filter(c => !e.pairs.some(([codigo]) => codigo === c));
    if (faltan.length) dudas.push({...base, motivo: `Entidad incompleta: faltan códigos ${faltan.join(', ')}`});
    if (e.type === 'LWPOLYLINE' && (number(e, 90) < 2 || e.pairs.filter(([c]) => c === 10).length !== number(e, 90) || e.pairs.filter(([c]) => c === 20).length !== number(e, 90))) dudas.push({...base, motivo: 'Polilínea con contador de vértices incorrecto'});
    if (number(e, 210) !== 0 || number(e, 220) !== 0 || number(e, 230, 1) !== 1 || number(e, 30) !== 0 || number(e, 31) !== 0 || number(e, 38) !== 0 || number(e, 39) !== 0) dudas.push({...base, motivo: 'Geometría 3D, elevación o extrusión sin soportar'});
    if (['ARC', 'CIRCLE'].includes(e.type) && number(e, 40) <= 0) dudas.push({...base, motivo: 'Radio no positivo'});
    if (e.type === 'LWPOLYLINE' && (number(e, 43) || e.pairs.some(([c, v]) => (c === 40 || c === 41) && Number(v) !== 0))) dudas.push({...base, motivo: 'Polilínea con anchura sin soportar'});
    if (e.type === 'TEXT') {
      tieneTexto = true;
      const estilo = value(e, 7, 'Standard'), fuenteDxf = d.styles[estilo]?.[3];
      if (fuenteDxf && fuenteDxf.toLowerCase() !== 'arial.ttf') dudas.push({...base, fuenteDxf, motivo: `Fuente DXF sin soportar: ${fuenteDxf}`});
      if (!fuenteDxf) dudas.push({...base, motivo: `Estilo ${estilo} sin fuente DXF declarada`});
      if (number(e, 51) || number(e, 71) || number(e, 72) > 2) dudas.push({...base, motivo: 'Texto oblicuo, reflejado o ajustado sin soportar'});
      if (number(e, 40) <= 0 || number(e, 41, 1) <= 0) dudas.push({...base, motivo: 'Altura o anchura de texto no positiva'});
      if (/%%|\\(?!U\+[a-f\d]{4})/i.test(value(e, 1))) dudas.push({...base, motivo: 'Formato de texto DXF sin soportar'});
    }
  }
  return {dudas, avisos, tieneTexto};
}

/** Convierte en memoria. No escribe ficheros ni consulta carpetas de producción. */
export function dxfACmt(dxfTexto: string, opciones: OpcionesCmt = {}): ResultadoCmt {
  const resultado: ResultadoCmt = {cmt: null, objetos: [], avisos: [], dudas: []};
  try {
    const d = leerDxf(dxfTexto);
    let sinLeyenda = false;
    if (opciones.sinLeyenda) {
      const q = quitarLeyendaWeb(d); d.entities = q.entidades; sinLeyenda = q.quitada;
      resultado.avisos.push({motivo: q.quitada ? 'Se ha quitado la leyenda del bot: el dibujo va a 300 y 20 mm' : 'No se ha encontrado entera la leyenda de la web: el dibujo se convierte tal cual'});
    }
    const v = validar(d); resultado.dudas.push(...v.dudas); resultado.avisos.push(...v.avisos);
    let font: ReturnType<typeof leerFuente> | undefined;
    if (v.tieneTexto) {
      const ruta = opciones.rutaFuente ?? process.env.CMT_ARIAL_PATH ?? (process.platform === 'win32' ? 'C:/Windows/Fonts/arial.ttf' : undefined);
      if (!ruta) resultado.dudas.push({motivo: 'Falta la fuente Arial: configure rutaFuente o CMT_ARIAL_PATH'});
      else {
        try { font = leerFuente(ruta); }
        catch (error) { resultado.dudas.push({motivo: `No se puede leer la fuente Arial en ${ruta}: ${error instanceof Error ? error.message : String(error)}`}); }
      }
    }
    if (resultado.dudas.length) return resultado;
    const g = generarGeometria(d, {font, compatibilidadRobot: opciones.compatibilidadRobot}); resultado.avisos.push(...g.avisos); resultado.dudas.push(...g.issues); resultado.objetos = g.objects;
    if (sinLeyenda) recolocar(g.objects);
    if (opciones.compatibilidadRobot !== false) resultado.avisos.push({motivo: 'Se reproduce el redondeo SVG del robot (seis cifras, 96 dpi); compatibilidadRobot:false conserva la precisión del DXF y puede mostrar rellenos distintos'});
    if (!resultado.dudas.length) resultado.cmt = escribir(g.objects);
  } catch (error) {
    resultado.dudas.push({motivo: error instanceof Error ? error.message : String(error)});
  }
  return resultado;
}

