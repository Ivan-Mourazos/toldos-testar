import type { Punto } from './tipos';

export interface Parametro { name: string; type: number; value: number | string; desde: number; hasta: number }
export interface RegistroCmt {
  id: number; version: number; raw: Buffer; desde: number; hasta: number;
  points?: Punto[]; parametros?: Parametro[];
}
export interface ObjetoCmt { index: number; paths: { points: Punto[]; cola: Buffer }[]; tool: string; flags: number; atributo: number }
export interface DocumentoCmt { header: Buffer; records: RegistroCmt[]; objects: ObjetoCmt[]; order: number[]; consumidos: number }
const firma = Buffer.from('090001000000000092ab6f8c9a849999948b00000000', 'hex');
const versiones: Record<number, number> = {16: 0, 49: 0, 34: 0, 1: 0, 5: 1, 4: 2, 3: 3, 53: 2, 2: 0};
function comprobar(ok: unknown, mensaje: string): asserts ok { if (!ok) throw new Error(mensaje); }

function parametros(b: Buffer, inicio: number): Parametro[] {
  comprobar(inicio + 2 <= b.length, 'Tabla de parámetros truncada');
  const end = inicio + 2 + b.readUInt16LE(inicio);
  comprobar(end + 2 === b.length, 'Longitud de DRIVER-BLOC incorrecta');
  let p = inicio + 2;
  comprobar(b.toString('ascii', p, p + 11) === 'DRIVER-BLOC', 'Firma DRIVER-BLOC incorrecta'); p += 11;
  const entries: Parametro[] = [];
  const limite = (n: number) => comprobar(p + n <= end, 'Parámetro truncado');
  while (p < end) {
    const desde = p; limite(2); const n = b.readUInt16LE(p); p += 2; limite(n + 1);
    const name = b.toString('latin1', p, p + n); p += n; const type = b[p++]; let value: string | number;
    if (type === 0) { limite(4); value = b.readInt32LE(p); p += 4; }
    else if (type === 1) { limite(8); value = b.readDoubleLE(p); p += 8; }
    else if (type === 2) { limite(2); const l = b.readUInt16LE(p); p += 2; limite(l); value = b.toString('latin1', p, p + l); p += l; }
    else throw new Error(`Tipo de parámetro desconocido: ${type}`);
    entries.push({name, type, value, desde, hasta: p});
  }
  return entries;
}

/** Conserva los campos opacos como bytes: reescribir no intenta interpretarlos. */
export function leerCmt(input: Buffer): DocumentoCmt {
  const b = Buffer.from(input);
  comprobar(b.length >= 50 && b.subarray(0, 22).equals(firma), 'Cabecera CMT inválida');
  const size = b.readUInt32LE(22), end = 26 + size;
  comprobar(size >= 24 && end + 2 <= b.length, 'Miniatura truncada');
  comprobar(b.readUInt32LE(42) === size - 20 && b.toString('ascii', 46, 50) === 'LEAD', 'Miniatura CMT inválida');
  const header = b.subarray(0, end + 2), records: RegistroCmt[] = [], objects: ObjetoCmt[] = [];
  let p = end + 2, count: number | null = null, order: number[] | null = null, current: ObjetoCmt | null = null, atributoLeido = false;
  const prefijo = [16, 49, 34, 1];
  while (p < b.length) {
    comprobar(p + 10 <= b.length, `Registro truncado en ${p}`);
    const id = b.readUInt32LE(p), n = b.readUInt32LE(p + 4), version = b.readUInt16LE(p + 8), start = p + 10, stop = start + n;
    comprobar(stop <= b.length && versiones[id] === version, `Registro CMT desconocido o truncado: ${id}/${version}`);
    comprobar(order === null, 'Datos después de la lista final');
    if (records.length < 4) comprobar(id === prefijo[records.length], 'Prefijo de documento incorrecto');
    else comprobar([5, 4, 3, 53, 2].includes(id), 'Registro de documento fuera de orden');
    const raw = b.subarray(start, stop), r: RegistroCmt = {id, version, raw, desde: p, hasta: stop};
    if (id === 16 || id === 49) {
      if (id === 16) comprobar(n >= 84 && raw.toString('ascii', 0, 8) === 'CUTMatic', 'Documento CUTMatic inválido');
      r.parametros = parametros(raw, id === 16 ? 80 : 0);
    }
    if (id === 34) comprobar(n === 8, 'Estado auxiliar inválido');
    if (id === 1) { comprobar(n === 4 && count === null, 'Contador inválido'); count = raw.readUInt32LE(); }
    if (id === 5) {
      comprobar(n === 0 && !current && count !== null && objects.length < count, 'Inicio de objeto inesperado');
      current = {index: objects.length, paths: [], tool: '', flags: 0, atributo: 0}; atributoLeido = false;
    }
    if (id === 4) { comprobar(n === 2 && current && !atributoLeido && current.paths.length === 0, 'Atributo sin objeto o duplicado'); current.atributo = raw.readUInt16LE(); atributoLeido = true; }
    if (id === 3) {
      comprobar(current && atributoLeido && n >= 24, 'Trayectoria sin objeto');
      const np = raw.readUInt32LE(); comprobar(n === 24 + 20 * np && np > 0, 'Longitud de trayectoria incorrecta');
      const points: Punto[] = [];
      for (let i = 0; i < np; i++) {
        const at = 4 + i * 20, q = {x: raw.readDoubleLE(at), y: raw.readDoubleLE(at + 8), type: raw.readUInt16LE(at + 16), mark: raw.readUInt16LE(at + 18)};
        comprobar(Number.isFinite(q.x) && Number.isFinite(q.y) && q.type <= 4, 'Punto CMT inválido'); points.push(q);
      }
      comprobar(points[0].type === 0, 'Trayectoria sin inicio');
      for (let i = 1; i < points.length;) {
        if (points[i].type === 4) i++;
        else { comprobar(points[i].type === 1 && points[i + 1]?.type === 2 && points[i + 2]?.type === 3, 'Secuencia Bézier incorrecta'); i += 3; }
      }
      r.points = points; current.paths.push({points, cola: raw.subarray(n - 20)});
    }
    if (id === 53) {
      comprobar(n === 64 && current && current.paths.length > 0 && current.atributo === current.paths.length, 'Herramienta sin trayectorias completas');
      let z = 0; while (z < 24 && raw.readUInt16LE(z) !== 0) z += 2;
      comprobar(z < 24, 'Herramienta sin terminador'); current.tool = raw.toString('utf16le', 0, z); current.flags = raw.readUInt32LE(30); objects.push(current); current = null;
    }
    if (id === 2) {
      comprobar(n >= 8 && !current && count === objects.length, 'Lista final sin objetos completos');
      const no = raw.readUInt32LE(); comprobar(n === 8 + 4 * no, 'Longitud de índices incorrecta');
      order = Array.from({length: no}, (_, i) => raw.readUInt32LE(4 + 4 * i));
      comprobar(new Set(order).size === no && order.every(x => x < objects.length), 'Índices CMT inválidos');
    }
    records.push(r); p = stop;
  }
  comprobar(!current && order && count === objects.length && records.length >= 5, 'Documento CMT incompleto');
  return {header, records, objects, order, consumidos: p};
}

export function registro(id: number, version: number, raw: Buffer): Buffer {
  const h = Buffer.alloc(10); h.writeUInt32LE(id); h.writeUInt32LE(raw.length, 4); h.writeUInt16LE(version, 8); return Buffer.concat([h, raw]);
}
export function serializarCmt(doc: DocumentoCmt): Buffer {
  return Buffer.concat([doc.header, ...doc.records.map(r => registro(r.id, r.version, r.raw))]);
}
