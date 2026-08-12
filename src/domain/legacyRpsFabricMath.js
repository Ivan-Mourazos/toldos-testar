import { roundQuantity } from './math.js';

/**
 * Fórmula fija que usa ESTR.01-04!Q28 para enviar lona a RPS.
 * Es deliberadamente distinta del cálculo de paños mostrado en TELA: el libro
 * antiguo ya separaba el planteamiento visible de la cantidad reservada.
 */
export function countLegacyRpsFabricPanels(width, rollWidth, {
  seamAllowanceCm = 2.2,
  seamBaseCm = 7
} = {}) {
  const safeWidth = Math.max(0, Number(width) || 0);
  if (safeWidth === 0) return 0;
  const safeRollWidth = Math.max(1, Number(rollWidth) || 120);
  const seam = nonNegative(seamAllowanceCm, 2.2);
  const base = nonNegative(seamBaseCm, 7);
  const preparedWidth = safeWidth + base;
  const seamCount = Math.floor((preparedWidth / safeRollWidth) + 1e-9);
  const adjustedWidth = preparedWidth + seamCount * seam;
  return Math.ceil((adjustedWidth / safeRollWidth) - 1e-9);
}

export function calculateLegacyRpsFabricUsage({
  width,
  drop,
  units,
  rollWidth,
  seamAllowanceCm,
  seamBaseCm
}) {
  const panels = countLegacyRpsFabricPanels(width, rollWidth, { seamAllowanceCm, seamBaseCm });
  return {
    panels,
    ml: roundQuantity((Number(units) || 0) * (Number(drop) || 0) * panels / 100)
  };
}

function nonNegative(value, fallback) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
}
