// Qué ha cambiado una excepción técnica y por qué hace falta (Iván, 25/09/2026): el aviso
// y la ficha plegada decían «reglas modificadas» y enseñaban todos los valores del
// candado, también los que nadie tocó. Mientras se calcula un toldo se apunta cada valor
// de la excepción que difiere del normal; rules.js lo recoge y compone un aviso único.

let current = null;

export function beginRuleOverrides() {
  current = [];
}

export function finishRuleOverrides() {
  const changes = current || [];
  current = null;
  return changes;
}

// Mismo criterio que tenían los effectiveNumber de cada modelo: con el candado y un
// número válido manda el de la tarjeta; si no, el normal.
export function effectiveOverride(awning, field, fallback) {
  const value = awning?.[field];
  const standard = Number(fallback) || 0;
  if (!awning?.reglasModificadas || value === null || value === undefined || !Number.isFinite(Number(value))) return standard;
  const chosen = Math.max(0, Number(value));
  noteOverride(field, chosen, standard);
  return chosen;
}

export function noteOverride(field, value, standard) {
  if (!current) return;
  const differs = typeof value === 'number' && typeof standard === 'number'
    ? Math.abs(value - standard) > 1e-9
    : String(value ?? '') !== String(standard ?? '');
  if (!differs || current.some((item) => item.field === field)) return;
  current.push({ field, label: overrideLabel(field), value, standard });
}

export function overrideLabel(field) {
  return labels[field] || field;
}

// Nombres de la tarjeta (AwningColumn), sin «(cm)».
const labels = {
  curtainFabricWidthDiscountCm: "Descuento frente tela",
  curtainRollTubeDiscountCm: "Descuento tubo enrollamiento",
  curtainLoadProfileDiscountCm: "Descuento Univers 280",
  boxMinimumLineCm: "Frente mínimo",
  boxProfileDiscountCm: "Descuento kit perfiles",
  boxRollDiscountCm: "Descuento tubo enrollamiento",
  boxFabricWidthDiscountCm: "Descuento frente tela",
  boxProtectorDiscountCm: "Descuento protector lona",
  xacMinimumLineCm: "Frente mínimo",
  xacFabricWidthDiscountCm: "Descuento frente tela",
  xacRollDiscountCm: "Descuento tubo enrollamiento",
  xacLoadBarDiscountCm: "Descuento tubo de carga",
  armCount: "Nº de brazos manual",
  pointFabricWidthDiscountCm: "Descuento frente tela",
  pointRollDiscountCm: "Descuento tubo enrollamiento",
  pointLoadBarDiscountCm: "Descuento Univers 270",
  dropArmVerticalAllowanceCm: "Margen bajada vertical",
  pointFabricDropMultiplier: "Factor diagonal de paño",
  pointFabricDropAllowanceCm: "Margen fijo de paño",
  monoblockMinimumLineCm: "Frente mínimo",
  monoblockMaximumLineCm: "Frente máximo",
  monoblockSupportCount: "Nº de soportes",
  monoblockFabricWidthDiscountCm: "Descuento frente tela",
  monoblockRollDiscountCm: "Descuento P801",
  monoblockLoadBarDiscountCm: "Descuento barra de carga",
  monoblockSquareBarDiscountCm: "Descuento barra 40×40",
  monoblockFabricDropAllowanceCm: "Margen caída tela",
  maxisFabricWidthDiscountCm: "Descuento frente tela",
  maxisRollDiscountCm: "Descuento tubo P801",
  maxisLoadBarDiscountCm: "Descuento perfil de carga",
  maxisBoxProfileDiscountCm: "Descuento perfil de cofre",
  maxisFabricDropAllowanceCm: "Margen caída tela",
  electraFabricWidthDiscountCm: "Descuento frente tela",
  electraRollDiscountCm: "Descuento tubo P801",
  electraLoadBarDiscountCm: "Descuento perfil de carga",
  electraBoxProfileDiscountCm: "Descuento perfil de cofre",
  electraGuideDiscountCm: "Descuento guía sobre caída",
  electraFabricDropAllowanceCm: "Margen caída tela",
  ambarFabricWidthDiscountCm: "Descuento frente tela",
  ambarRollDiscountCm: "Descuento tubo enrollamiento",
  ambarProfileDiscountCm: "Descuento kit perfiles",
  ambarFabricDropMultiplier: "Factor diagonal de paño",
  ambarFabricDropAllowanceCm: "Margen fijo de paño",
  agataMinimumLineCm: "Frente mínimo",
  agataSupportCount: "Nº de soportes",
  agataFabricWidthDiscountCm: "Descuento frente tela",
  agataRollDiscountCm: "Descuento tubo enrollamiento",
  agataFabricDropAllowanceCm: "Margen caída tela",
  fabricJobWidthAdjustmentCm: "Ajuste de frente",
  fabricJobDropAllowanceCm: "Margen de caída",
  fabricJobValanceExtraCm: "Remate de bamba",
  motorPower: "Motor",
  curtainFabricDeductionCm: "Descuento inferior tela"
};
