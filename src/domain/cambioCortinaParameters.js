export const defaultCambioCortinaParameters = {
  fabricDropAllowanceCm: 45,
  // Parámetro antiguo conservado para compatibilidad. El ajuste actual se elige
  // en la tarjeta y no se descuenta nada por defecto (Iván, 02/10/2026).
  bottomDeductionCm: 0,
  seamAllowanceCm: 2.2,
  seamBaseCm: 7
};

export function normalizeCambioCortinaParameters(input = {}) {
  return {
    fabricDropAllowanceCm: nonNegative(input.fabricDropAllowanceCm, defaultCambioCortinaParameters.fabricDropAllowanceCm),
    bottomDeductionCm: nonNegative(input.bottomDeductionCm, defaultCambioCortinaParameters.bottomDeductionCm),
    seamAllowanceCm: nonNegative(input.seamAllowanceCm, defaultCambioCortinaParameters.seamAllowanceCm),
    seamBaseCm: nonNegative(input.seamBaseCm, defaultCambioCortinaParameters.seamBaseCm)
  };
}

function nonNegative(value, fallback) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
}
