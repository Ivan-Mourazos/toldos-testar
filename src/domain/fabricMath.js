import { roundQuantity } from './math.js';

export const defaultFabricMathParameters = Object.freeze({
  seamAllowanceCm: 2.5,
  seamBaseCm: 6.5
});

export function countFabricPanels(width, rollWidth, parameters = defaultFabricMathParameters) {
  const safeWidth = Math.max(0, Number(width) || 0);
  const safeRollWidth = Math.max(1, Number(rollWidth) || 120);
  const seamAllowanceCm = nonNegative(parameters.seamAllowanceCm, defaultFabricMathParameters.seamAllowanceCm);
  const seamBaseCm = nonNegative(parameters.seamBaseCm, defaultFabricMathParameters.seamBaseCm);
  const initialPanels = roundUp(safeWidth / safeRollWidth);
  if (initialPanels === 0) return 0;
  const adjustedWidth = safeWidth + (initialPanels - 1) * seamAllowanceCm + seamBaseCm;
  return roundUp(adjustedWidth / safeRollWidth);
}

// Cuando varias piezas caben a lo ancho del rollo se colocan juntas y comparten
// pasada, en vez de gastar un ancho de rollo por unidad. Solo entra en juego con
// un paño: si la pieza necesita varios, ya ocupa el rollo entero.
export function countFabricRows(width, units, rollWidth) {
  const safeUnits = Math.max(0, Number(units) || 0);
  const safeWidth = Math.max(0, Number(width) || 0);
  const safeRollWidth = Math.max(1, Number(rollWidth) || 120);
  const perRow = safeWidth > 0 ? Math.max(1, Math.floor(safeRollWidth / safeWidth)) : 1;
  return perRow > 1 ? roundUp(safeUnits / perRow) : safeUnits;
}

export function calculateFabricMl({ width, drop, units, rollWidth, seamAllowanceCm, seamBaseCm }) {
  return calculateFabricUsage({ width, drop, units, rollWidth, seamAllowanceCm, seamBaseCm }).ml;
}

export function calculateFabricUsage({ width, drop, units, rollWidth, seamAllowanceCm, seamBaseCm }) {
  const panels = countFabricPanels(width, rollWidth, { seamAllowanceCm, seamBaseCm });
  const rows = countFabricRows(width, units, rollWidth);
  return {
    panels,
    ml: roundQuantity(rows * (Number(drop) || 0) * panels / 100)
  };
}

function roundUp(value) {
  return Math.ceil(value - 1e-9);
}

function nonNegative(value, fallback) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
}
