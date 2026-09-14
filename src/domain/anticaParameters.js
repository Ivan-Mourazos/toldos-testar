export const ANTICA_TUBE_33_VARIANT = 'ENTRADA TUBO Ø33 MM';
export const ANTICA_TUBE_42_VARIANT = 'ENTRADA TUBO Ø42 MM';

export const anticaRoundEntrySpecs = Object.freeze({
  [ANTICA_TUBE_33_VARIANT]: Object.freeze({
    diameterMm: 33,
    cambioDropAllowanceCm: 45,
    cambioSeparateValanceAllowanceCm: 40,
    fullDropAllowanceCm: 38,
    fullFabricWidthDiscountCm: 7.2,
    fullRollTubeDiscountCm: 6.2,
    fullLoadBarDiscountCm: 7.2
  }),
  [ANTICA_TUBE_42_VARIANT]: Object.freeze({
    diameterMm: 42,
    cambioDropAllowanceCm: 60,
    cambioSeparateValanceAllowanceCm: 55,
    fullDropAllowanceCm: 60,
    fullFabricWidthDiscountCm: 10.5,
    fullRollTubeDiscountCm: 11,
    fullLoadBarDiscountCm: 11.5
  })
});

export const ANTICA_RULES = Object.freeze({
  armSwitchWidth: 400, stockLengths: [600, 700],
  seamAllowanceCm: 2.5, seamBaseCm: 6.5, valanceExtraCm: 5,
  separateDropAllowanceCm: 40, fixedDropAllowanceCm: 75,
  noValanceDropAllowanceCm: 70, standardDropAllowanceCm: 76,
  discounts: { MAQUINA: { fabric: 12, roll: 11, load: 12, fixedLoad: 11 }, MOTOR: { fabric: 11, roll: 10, load: 11, fixedLoad: 10 } }
});

// La ficha de consulta y el cálculo usan la misma selección de reglas.
export function getAnticaDropRule(variant, separateValance = false) {
  const round = anticaRoundEntrySpecs[variant];
  if (round) return { base: 'diagonal', allowance: round.fullDropAllowanceCm, includeValance: !separateValance };
  if (separateValance) return { base: 'projection', allowance: ANTICA_RULES.separateDropAllowanceCm, includeValance: false };
  if (variant === 'SOPORTE FIJO 3 AGUJEROS') return { base: 'diagonal', allowance: ANTICA_RULES.fixedDropAllowanceCm, includeValance: true };
  if (variant === 'TUBO 50X30 SIN BAMBA') return { base: 'squareDiagonal', allowance: ANTICA_RULES.noValanceDropAllowanceCm, includeValance: false };
  return { base: 'squareDiagonal', allowance: ANTICA_RULES.standardDropAllowanceCm, includeValance: true };
}

export function getAnticaDiscounts(variant, device) {
  const round = anticaRoundEntrySpecs[variant];
  if (round && device === 'MAQUINA') return { fabric: round.fullFabricWidthDiscountCm, roll: round.fullRollTubeDiscountCm, load: round.fullLoadBarDiscountCm };
  const rule = ANTICA_RULES.discounts[device === 'MOTOR' ? 'MOTOR' : 'MAQUINA'];
  return { fabric: rule.fabric, roll: rule.roll, load: variant === 'SOPORTE FIJO 3 AGUJEROS' ? rule.fixedLoad : rule.load };
}
