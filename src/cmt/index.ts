import plantilla from './plantilla.json' with { type: 'json' };
import { leerCmt, registro } from './binario.ts';
import { leerDxf } from './dxf.ts';
import { prepararEntidades } from './entidades.ts';
import { conReservas } from './reservas.ts';
import { validar } from './validacion.ts';
import { generarGeometria } from './geometria.ts';
import { leerFuente } from './fuente.ts';
import { quitarLeyendaWeb, recolocar } from './leyenda.ts';
import type { Duda, ObjetoGeometrico, OpcionesCmt } from './tipos.ts';
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

/** Convierte en memoria. No escribe ficheros ni consulta carpetas de producción. */
export function dxfACmt(dxfTexto: string, opciones: OpcionesCmt = {}): ResultadoCmt {
  const resultado: ResultadoCmt = {cmt: null, objetos: [], avisos: [], dudas: []};
  try {
    const d = leerDxf(dxfTexto);
    let sinLeyenda = false;
    if (opciones.sinLeyenda) {
      const q = quitarLeyendaWeb(d); d.entities = q.entidades; sinLeyenda = q.quitada;
      resultado.avisos.push({motivo: q.quitada ? 'Se ha quitado la leyenda del bot o de oficina: el dibujo va a 300 y 20 mm' : 'No se ha encontrado entera la leyenda de la web: el dibujo se convierte tal cual'});
    }
    prepararEntidades(d,resultado.avisos);
    if (opciones.sinTextos) {
      const antes=d.entities.length;
      d.entities=d.entities.filter(e=>!['TEXT','MTEXT'].includes(e.type));
      resultado.avisos.push({motivo: `Se han descartado ${antes-d.entities.length} textos (TEXT/MTEXT) por la opción «sin textos»`});
    }
    const v = validar(d); resultado.dudas.push(...v.dudas); resultado.avisos.push(...v.avisos);
    let font: ReturnType<typeof leerFuente> | undefined;
    if (v.tieneTexto) {
      const ruta = opciones.rutaFuente ?? process.env.CMT_ARIAL_PATH ?? (process.platform === 'win32' ? 'C:/Windows/Fonts/arial.ttf' : undefined);
      if (!ruta) resultado.dudas.push({motivo: 'Falta la fuente Arial en el equipo que convierte: avisa al responsable para configurar rutaFuente o CMT_ARIAL_PATH, o elige «sin textos»'});
      else {
        try { font = conReservas(leerFuente(ruta),opciones,resultado.avisos); }
        catch (error) { resultado.dudas.push({motivo: `No se puede leer la fuente Arial en ${ruta}: ${error instanceof Error ? error.message : String(error)}. Avisa al responsable para revisar la instalación o elige «sin textos»`}); }
      }
    }
    if (resultado.dudas.length) return resultado;
    const g = generarGeometria(d, {font, compatibilidadRobot: opciones.compatibilidadRobot, preparacionMtext: opciones.preparacionMtext}); resultado.avisos.push(...g.avisos); resultado.dudas.push(...g.issues); resultado.objetos = g.objects;
    if (sinLeyenda) recolocar(g.objects);
    if (opciones.compatibilidadRobot !== false) resultado.avisos.push({motivo: 'Se reproduce el redondeo SVG del robot (seis cifras, 96 dpi); compatibilidadRobot:false conserva la precisión del DXF y puede mostrar rellenos distintos'});
    if (!resultado.dudas.length) resultado.cmt = escribir(g.objects);
  } catch (error) {
    resultado.dudas.push({motivo: `${error instanceof Error ? error.message : String(error)}. Revisa el plano en ZWCAD y vuelve a exportar el DXF`});
  }
  return resultado;
}

