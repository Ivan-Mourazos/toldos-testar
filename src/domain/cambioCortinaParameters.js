export const defaultCambioCortinaParameters = {
  fabricDropAllowanceCm: 45,
  bottomDeductionCm: 18,
  seamAllowanceCm: 0,
  seamBaseCm: 0
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
