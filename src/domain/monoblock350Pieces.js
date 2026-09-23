// Piezas del Monoblock 350 contrastadas con el consumo real de 59 OF de MONOB desde
// 2024 y el maestro de RPS con InactiveDate (23/09/2026).
import { onyxArmLines } from './galiciaSupportPieces.js';

// En RPS los soportes van en JUEGO (dos piezas) y hay sueltos para completar un
// número impar. Solo existen en estos lacados; en el resto lo detecta
// `pnpm validate:rps-refs`.
const armSupportSingles = Object.freeze(['BL16', 'GR16', 'MA15', 'NE11']);
const placementCodes = Object.freeze({
  FRONTAL: { set: 'SOPFROMONOBL', single: 'SOPFRMONOUND', name: 'FRONTAL' },
  TECHO: { set: 'SOPFTECMONOB', single: 'SOPFTEMONUND', name: 'FRONTAL TECHO' }
});
// Apoyo intermedio del currón (el "currón" que se reservaba, CURRONMOPL, no se
// consume y en blanco está de baja).
const curronSupportSuffixes = Object.freeze(['BL16', 'NE11', 'NEM1']);
// Barra cuadrada 40×40: largos activos por color.
export const squareBarLengths = Object.freeze({ BLANCO: [400, 500, 600, 700], NEGRO: [500, 600, 635, 700] });
// Tubo de enrolle P801: largos activos.
export const rollTubeLengths = Object.freeze([400, 500, 600, 700, 800]);

export function monoblockArmLines(suffix, projection, armCount, units) {
  return onyxArmLines(suffix, projection, armCount, units).map((line) => ({ ...line, length: projection }));
}

// Soporte de brazo: uno por brazo, en juegos de dos y un suelto si son tres.
export function monoblockArmSupportLines(suffix, armCount, units) {
  const arms = Number(armCount) || 2;
  const lines = [{ code: `SOPBRAMONOB${suffix}`, quantity: Math.floor(arms / 2) * units, description: 'JUEGO SOPORTE BRAZO MONOBLOC 350' }];
  if (arms % 2 === 1) {
    lines.push({ code: `SOPBRAMONOBD${suffix}`, quantity: units, description: 'SOPORTE BRAZO MONOBLOC 350 DERECHO', missingSingle: !armSupportSingles.includes(suffix) });
  }
  return lines;
}

// Soportes a pared o techo: el número de piezas sale de la regla del manual (dos por
// brazo más los intermedios) y se reserva en juegos más un suelto si es impar.
export function monoblockPlacementLines(placement, suffix, supportCount, units) {
  const codes = placementCodes[String(placement || '').toUpperCase()];
  if (!codes || !supportCount) return [];
  const lines = [];
  const sets = Math.floor(supportCount / 2);
  if (sets) lines.push({ code: `${codes.set}${suffix}`, quantity: sets * units, description: `JUEGO SOPORTE ${codes.name} MONOBLOC 350` });
  if (supportCount % 2) lines.push({ code: `${codes.single}${suffix}`, quantity: units, description: `SOPORTE ${codes.name} MONOBLOC 350` });
  return lines;
}

export function curronSupportCode(lacado) {
  if (curronSupportSuffixes.includes(lacado.suffix)) return `APOIN40${lacado.suffix}`;
  return lacado.crank === 'BLANCA' ? 'APOIN40BL16' : 'APOIN40NE11';
}

export function squareBarCapCode(lacado) {
  return lacado.crank === 'BLANCA' ? 'TAPTUBO40BL16' : 'TAPTUBO40NE05';
}

export function squareBarColor(lacado) {
  return lacado.name === 'NEGRO (R-09011)' ? 'NEGRO' : 'BLANCO';
}

// Corte en barras de stock. Hasta el largo mayor, una barra: la que diga `single`
// (la regla de siempre, 600 o 700). Por encima, el Monoblock empalma: se reparte
// en el menor número de barras iguales y cada una es el largo más corto que cabe:
// para un frente de 868, 500 + 500, como se consumió.
// `toleranceCm`: en frentes de 720 a 725 el almacén imputó una sola barra de 700
// (de carga y 40×40) en 3 de 4 OF, aunque el corte pasa de 700 (Q-M03).
export function splitIntoBars(cutLength, lengths, single, toleranceCm = 0) {
  const sorted = [...lengths].sort((a, b) => a - b);
  const longest = sorted.at(-1);
  if (!longest || !(cutLength > 0)) return [];
  if (cutLength <= longest + toleranceCm) {
    if (cutLength > longest) return [longest];
    const chosen = single(sorted);
    return chosen ? [chosen] : [];
  }
  const count = Math.ceil(cutLength / longest);
  const piece = sorted.find((length) => length * count >= cutLength) || longest;
  return Array(count).fill(piece);
}

export function groupBars(bars) {
  const counts = {};
  for (const bar of bars) counts[bar] = (counts[bar] || 0) + 1;
  return Object.entries(counts).map(([length, count]) => ({ length: Number(length), count }));
}
