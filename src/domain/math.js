/**
 * Round a quantity to avoid floating point drift.
 * Used across validation, rules and workbook generation.
 */
export function roundQuantity(value) {
  return Math.round(value * 1000000) / 1000000;
}

/**
 * Format a number for display using Spanish locale (comma as decimal separator).
 */
export function formatNumber(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return String(value ?? '').trim() || '-';
  return new Intl.NumberFormat('es-ES', { maximumFractionDigits: 2 }).format(number);
}
