const defaultAllowances = Object.freeze({
  'CAMBIO TELA': 40,
  ENROLLABLE: 25,
  BAMBALINA: 0,
  'CAMBIO ANTICA': 25
});

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

function nonNegative(value, fallback) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
}
