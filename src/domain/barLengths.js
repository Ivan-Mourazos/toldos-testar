// Largo de las barras que se reservan (taller, 30/09/2026, Q-A06): «la más corta que
// llegue al corte». Hasta entonces cada modelo tenía sus largos «habituales» (600, 650
// y 700 en el Arzúa; 600 fijo en los cofres…) y se reservaban barras más largas de lo
// necesario, o de 650, que no existen en RPS.
//
// Qué largos existen:
// - Tubos de enrolle (sin color): maestro de RPS del 30/09/2026 (tmp/rps-revision-0930).
// - Perfiles con color: las referencias vigentes de src/domain/data/lacadoCodes.json
//   (scripts/snapshot-lacado-codes.mjs), la misma foto que decide qué va a lacar.
// Si un perfil no existe en ningún largo en ese color (todo de baja o un color sin perfil
// propio), se toman los largos del blanco: la referencia de color no existe y
// lacadoFallback.js la cambia por la blanca y avisa de que va a lacar (Q-A02).
import snapshot from './data/lacadoCodes.json' with { type: 'json' };

// TURA80HG (P801 Ø80): 400 a 800; el 580 está de baja.
export const P801_TUBE_LENGTHS = Object.freeze([400, 500, 600, 700, 800]);
// TURA70HG (P701 Ø70): 500 a 700; el 400 y el 580 están de baja.
export const P701_TUBE_LENGTHS = Object.freeze([500, 600, 700]);
// PRVMODUL (perfil protector de lona del Ágata, sin color).
export const PRVMODUL_LENGTHS = Object.freeze([500, 600, 700]);

const lengthsByFamily = new Map();
for (const code of snapshot.codes) {
  const match = /^(.+?)(\d{3})C$/.exec(code);
  if (!match) continue;
  const key = match[1];
  if (!lengthsByFamily.has(key)) lengthsByFamily.set(key, []);
  lengthsByFamily.get(key).push(Number(match[2]));
}
for (const lengths of lengthsByFamily.values()) lengths.sort((a, b) => a - b);

/** Largos vigentes de `${prefix}${suffix}{largo}C`, de menor a mayor ([] si no hay). */
export function activeProfileLengths(prefix, suffix) {
  return [...(lengthsByFamily.get(`${prefix}${suffix || ''}`) || [])];
}

/**
 * Largos entre los que se elige la barra de un perfil con color: los del color o, si ese
 * color no tiene ninguno, los del blanco (va a lacar).
 */
export function profileLengthsOrWhite(prefix, suffix, whiteSuffix = 'BL16') {
  const own = activeProfileLengths(prefix, suffix);
  return own.length ? own : activeProfileLengths(prefix, whiteSuffix);
}

/** La barra más corta que llega al corte (corte ≤ barra, sin margen), o null. */
export function shortestBar(lengths, cut) {
  const needed = Number(cut);
  if (!(needed > 0)) return null;
  return [...lengths].sort((a, b) => a - b).find((length) => length >= needed) ?? null;
}

/**
 * Barras para un corte: la más corta que llega o, si el corte pasa de la más larga, las
 * iguales más cortas que juntas llegan (empalme). [] si no hay largos o el corte es 0.
 */
export function barsForCut(lengths, cut) {
  const needed = Number(cut);
  const sorted = [...lengths].sort((a, b) => a - b);
  const longest = sorted.at(-1);
  if (!longest || !(needed > 0)) return [];
  if (needed <= longest) return [shortestBar(sorted, needed)];
  const count = Math.ceil(needed / longest);
  const piece = sorted.find((length) => length * count >= needed) || longest;
  return Array(count).fill(piece);
}
