import { tipBushing } from './tipBushing.js';

// RPS consultado el 14/09/2026; ver docs/modelos/antica.md (F08/P10).
// Catálogo explícito: otros largos no siguen necesariamente el mismo código.
const standardLengths = new Set([80, 100, 120, 150, 170, 200, 225, 250]);
export function resolveAnticaCrank(awning, lacado) {
  const selected = String(awning.anticaCrankColor || 'AUTOMÁTICO').trim().toUpperCase();
  const color = selected === 'BLANCA' || selected === 'NEGRA' ? selected : lacado.crank;
  const height = Number(awning.crankHeight) || 0;
  let code = null;
  if (standardLengths.has(height)) code = 'MANIVE' + (color === 'BLANCA' ? 'BL16' : 'NE11') + height + 'C';
  if (height === 350) code = color === 'BLANCA' ? 'MANIVEBLAN350C' : 'MANIVENEGRO350C';
  if (height === 325 && color === 'NEGRA') code = 'MANIVENEGRO325C';
  return { color, height, code, name: 'MANIVELA LUXE ' + color + ' ' + height };
}
export function anticaPointCode(rollSystem) {
  return tipBushing(rollSystem).code;
}
