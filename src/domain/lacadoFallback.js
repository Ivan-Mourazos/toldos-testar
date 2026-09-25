// Lacados poco habituales (bronce, gris texturado…): muchas piezas no existen en ese
// color en RPS. Iván (25/09/2026, Q-A02): esos toldos se venden y las piezas se mandan
// a lacar fuera, así que se reserva la pieza en blanco. Sin esto la reserva llevaba
// códigos que no existen y, como RPS no bloquea la subida, el fallo no se veía.
//
// Qué existe sale de src/domain/data/lacadoCodes.json (scripts/snapshot-lacado-codes.mjs).
// Solo se tocan las familias de esa foto: una referencia de otra familia se deja igual.
import snapshot from './data/lacadoCodes.json' with { type: 'json' };
import { resolveLacado } from './lacados.js';

const existing = new Set(snapshot.codes);
const prefixes = snapshot.prefixes;
// El blanco de la tabla es BL16; el Univers 280 blanco vigente es BL10 (lacados.js).
const whiteSuffixes = ['BL16', 'BL10', 'BLAN', 'BL06'];

/**
 * Referencia que se reserva para `code` en el lacado de sufijo `suffix`.
 * @returns {{ code: string, painted: boolean }} painted = va en blanco para lacar fuera.
 */
export function resolveLacadoCode(code, suffix) {
  const clean = String(code || '').toUpperCase();
  if (!clean || whiteSuffixes.includes(suffix) || existing.has(clean)) return { code: clean || code, painted: false };
  // Con el sufijo, la familia es lo que va delante. El lacado especial no tiene sufijo
  // (BONYX150C): la familia es el prefijo conocido más largo y el color se inserta tras él.
  let head = '';
  let tail = '';
  if (suffix) {
    const at = clean.lastIndexOf(suffix);
    if (at > 0) { head = clean.slice(0, at); tail = clean.slice(at + suffix.length); }
  } else {
    head = prefixes.filter((prefix) => clean.startsWith(prefix)).sort((a, b) => b.length - a.length)[0] || '';
    tail = clean.slice(head.length);
  }
  if (!head || !prefixes.includes(head)) return { code: clean, painted: false };
  for (const white of whiteSuffixes) {
    const candidate = head + white + tail;
    if (existing.has(candidate)) return { code: candidate, painted: true };
  }
  return { code: clean, painted: false };
}

// Se aplica una vez a la salida de cada toldo, después de withRpsCodes, a reserva y
// despiece por igual, y deja un aviso con las piezas que van a lacar.
export function withLacadoFallback(result, { awning, order }) {
  const lacadoName = awning?.structureColor || order?.structureColor || '';
  const lacado = resolveLacado(lacadoName);
  const { suffix } = lacado;
  // Sin sufijo solo está el lacado especial; un nombre desconocido cae en blanco.
  if (whiteSuffixes.includes(suffix) || (!suffix && lacado.name !== 'LACADO ESPECIAL')) return result;
  const painted = new Set();
  const swap = (code) => {
    const resolved = resolveLacadoCode(code, suffix);
    if (resolved.painted) painted.add(resolved.code);
    return resolved.code;
  };
  const materials = (result.materials || []).map((line) => ({ ...line, code: swap(line.code) }));
  const despiece = result.despiece
    ? { ...result.despiece, rows: (result.despiece.rows || []).map((row) => ({ ...row, reference: row.reference ? swap(row.reference) : row.reference })) }
    : result.despiece;
  if (!painted.size) return result;
  const diagnostics = [
    ...(result.diagnostics || []),
    {
      level: 'warning',
      awningId: awning.id,
      message: `Lacado ${lacadoName}: estas piezas no existen en ese color y se reservan en blanco para lacar fuera: ${[...painted].join(', ')}.`
    }
  ];
  return { ...result, materials, despiece, diagnostics, paintedCodes: [...painted] };
}
