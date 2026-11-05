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
  if (!clean || (whiteSuffixes.includes(suffix) && suffix !== 'BL10') || existing.has(clean)) return { code: clean || code, painted: false };
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
  // BL10 (9010) también necesita blanco 9016 si la pieza no existe en 9010.
  // Todos los colores sin sufijo siguen el tratamiento del lacado especial.
  if (whiteSuffixes.includes(suffix) && suffix !== 'BL10') return result;
  // El Ágata Box no se manda a lacar: lo que no está en ese color se pide al fabricante en el color (Iván, 05/11/2026).
  // Se reserva la referencia del color y el despiece y el aviso dicen que hay que pedirla.
  if (awning?.model === 'AGATA BOX') return withAgataToOrder(result, { awning, lacadoName, suffix });
  const painted = new Set();
  const swap = (code) => {
    const resolved = resolveLacadoCode(code, suffix);
    if (resolved.painted) painted.add(resolved.code);
    return resolved.code;
  };
  const materials = (result.materials || []).map((line) => ({ ...line, code: swap(line.code) }));
  // En el despiece, la fila de la pieza que va en blanco lo dice para el taller (Iván, 08/10/2026).
  const despieceRow = (row) => {
    if (!row.reference) return row;
    const reference = swap(row.reference);
    return reference === row.reference ? row : { ...row, reference, name: `${row.name} · MANDAR A LACAR` };
  };
  const despiece = result.despiece
    ? { ...result.despiece, rows: (result.despiece.rows || []).map(despieceRow) }
    : result.despiece;
  if (!painted.size) return result;
  const diagnostics = [
    ...(result.diagnostics || []),
    {
      level: 'warn',
      awningId: awning.id,
      message: `Lacado ${lacadoName}: estas piezas no existen en ese color y se reservan en blanco para lacar fuera: ${[...painted].join(', ')}.`
    }
  ];
  return { ...result, materials, despiece, diagnostics, paintedCodes: [...painted] };
}

function withAgataToOrder(result, { awning, lacadoName, suffix }) {
  const toOrder = new Set();
  const missing = (code) => resolveLacadoCode(code, suffix).painted;
  for (const line of result.materials || []) if (missing(line.code)) toOrder.add(String(line.code).toUpperCase());
  if (!toOrder.size) return result;
  const despiece = result.despiece
    ? { ...result.despiece, rows: (result.despiece.rows || []).map((row) =>
      row.reference && toOrder.has(String(row.reference).toUpperCase()) ? { ...row, name: `${row.name} · PEDIR EN EL COLOR` } : row) }
    : result.despiece;
  const diagnostics = [...(result.diagnostics || []), {
    level: 'warn', awningId: awning.id,
    message: `Ágata Box en ${lacadoName}: estas piezas no están en RPS en ese color y hay que pedirlas: ${[...toOrder].join(', ')}.`
  }];
  return { ...result, despiece, diagnostics, orderedCodes: [...toOrder] };
}
