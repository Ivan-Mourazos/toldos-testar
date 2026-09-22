export const defaultCambioCortinaParameters = {
  fabricDropAllowanceCm: 45,
  // En Cambio de cortina la salida medida ya es la que debe llevar la tela: no
  // se descuenta. Los 18 cm son de Cortina (Iván, 22/09/2026). Queda el candado
  // de la tarjeta para un descuento puntual.
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
