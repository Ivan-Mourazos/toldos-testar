// Los brazos Stor-21 (BRASTOR{lacado}) solo existen en estos colores en RPS,
// consultado el 22/09/2026. En los demás lacados no se puede fabricar Selena:
// mejor decirlo que reservar una referencia que no existe.
const armSuffixes = new Set(['BL06', 'BL16', 'BU05', 'GR16', 'NE11', 'NEM1', 'VE05']);

export function selenaArmCode(lacadoSuffix) {
  const suffix = String(lacadoSuffix || '');
  return armSuffixes.has(suffix) ? `BRASTOR${suffix}` : '';
}
