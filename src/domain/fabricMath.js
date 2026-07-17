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

export function calculateFabricMl({ width, drop, units, rollWidth, seamAllowanceCm, seamBaseCm }) {
  const panels = countFabricPanels(width, rollWidth, { seamAllowanceCm, seamBaseCm });
  return roundQuantity((Number(units) || 0) * (Number(drop) || 0) * panels / 100);
}

export function calculateFabricUsage({ width, drop, units, rollWidth, seamAllowanceCm, seamBaseCm }) {
  const panels = countFabricPanels(width, rollWidth, { seamAllowanceCm, seamBaseCm });
  return {
    panels,
    ml: roundQuantity((Number(units) || 0) * (Number(drop) || 0) * panels / 100)
  };
}

function roundUp(value) {
  return Math.ceil(value - 1e-9);
}

function nonNegative(value, fallback) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
}
