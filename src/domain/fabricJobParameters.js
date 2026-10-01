const defaultAllowances = Object.freeze({
  'CAMBIO TELA': 55,
  ENROLLABLE: 25,
  BAMBALINA: 0,
  // CAM. ANTICA!I5 del libro antiguo: aumento del cuerpo con bamba integrada.
  'CAMBIO ANTICA': 65
});

/** @type {import('../client/types').FabricJobParameters} */
export const defaultFabricJobParameters = Object.freeze({
  dropAllowanceByModel: defaultAllowances,
  anticaSeparateValanceAllowanceCm: 40,
  valanceExtraCm: 5,
  seamAllowanceCm: 2.5,
  seamBaseCm: 6.5
});

export function normalizeFabricJobParameters(input = {}) {
  return {
    dropAllowanceByModel: Object.fromEntries(Object.entries(defaultAllowances).map(([model, fallback]) => [
      model,
      nonNegative(input.dropAllowanceByModel?.[model], fallback)
    ])),
    anticaSeparateValanceAllowanceCm: nonNegative(input.anticaSeparateValanceAllowanceCm, defaultFabricJobParameters.anticaSeparateValanceAllowanceCm),
    valanceExtraCm: nonNegative(input.valanceExtraCm, defaultFabricJobParameters.valanceExtraCm),
    seamAllowanceCm: nonNegative(input.seamAllowanceCm, defaultFabricJobParameters.seamAllowanceCm),
    seamBaseCm: nonNegative(input.seamBaseCm, defaultFabricJobParameters.seamBaseCm)
  };
}

export function resolveFabricJobAllowance(model, _hasValance, parameters = defaultFabricJobParameters) {
  return parameters.dropAllowanceByModel[model] ?? 0;
}

// Iván, 01/10/2026: 55 cm para enrolle y entrada de tubo, ajustables por toldo.
// Un borrador con un margen técnico anterior conserva lo que había indicado OT.
export function resolveCambioTelaExtraCm(awning) {
  const value = awning.cambioTelaExtraCm === undefined
    ? awning.reglasModificadas && awning.fabricJobDropAllowanceCm != null
      ? awning.fabricJobDropAllowanceCm
      : defaultAllowances['CAMBIO TELA']
    : awning.cambioTelaExtraCm;
  if (value === null || (typeof value === 'string' && !value.trim()) || typeof value === 'boolean') return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

export function cambioTelaExtraError(awning) {
  const value = resolveCambioTelaExtraCm(awning);
  if (value === null) return 'Indica cuánto sumar para enrolle y tubo (cm).';
  return value < 0 ? 'La suma para enrolle y tubo debe ser mayor o igual que cero.' : '';
}

function nonNegative(value, fallback) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
}
