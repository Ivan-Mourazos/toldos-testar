// Llaza Tarifa Nacional 2026, páginas impresas 264–266 (PDF 266–268).
export const crossedMinimumLines = [
  [150, 140, 145], [175, 153, 158], [200, 165, 170],
  [225, 178, 183], [250, 190, 195], [275, 203, 208],
  [300, 215, 220], [325, 228, 233], [350, 240, 245]
].map(([arm, interior, exterior]) => ({
  arm, values: { MOTOR: interior, 'MAQ. INTERIOR': interior, 'MAQ. EXTERIOR': exterior }
}));

// Referencias completas verificadas en compras RPS; nunca construir por sufijo.
// Blanco: 089975; negro: 089152; burdeos: 086167; gris 7012: 087519;
// gris 7016: 091076, OF 0232215 (16/09/2026).
export const crossedKitByFinish = Object.freeze({
  BL16: 'KITBRCRUARONIBL16',
  NE11: 'KITBRCRUARONINE11',
  BU05: 'KITBRCRUARONIBU05',
  GR12: 'KITBRCRUARONIGR12',
  GR16: 'KITBRCRUARONIGR16'
});

// Maestro RPS contrastado el 18/09/2026; unidad de almacén BARRA.
export const crossedProfileByFinish = Object.freeze({
  BL16: 'PEVO80BL16500C', NE11: 'PEVO80NE11500C',
  BU05: 'PEVO80BU05500C', GR12: 'PEVO80GR12500C', GR16: 'PEVO80GR16500C'
});

export function resolveCrossedKit(color) {
  const finish = {
    BLANCO: 'BL16',
    'NEGRO (R-09011)': 'NE11', NEGRO: 'NE11',
    'BURDEOS (R-03005)': 'BU05', BURDEOS: 'BU05',
    'GRIS 7012': 'GR12', 'GRIS 7016': 'GR16', 'ANTRACITA (RAL 7016)': 'GR16'
  }[String(color || '').trim().toUpperCase().replace(/\s+/g, ' ')];
  return crossedKitByFinish[finish] || null;
}

// Solo reconocer nombres de producto inequívocos. Acrílica o PVC genéricos
// no identifican una familia de la tabla del fabricante.
export function crossedFabricLimits(fabric) {
  const text = `${fabric?.material || ''} ${fabric?.description || ''}`.toUpperCase();
  if (/\bRECACRIL\b|\bRECSYSTEM\b/.test(text)) return { width: 400, projection: 350 };
  if (/\bRECWATER\b|\bRECAFLEX\s+PRO\b/.test(text)) return { width: 275, projection: 275 };
  if (/\bRECSCREEN\s*4000\s*P\b|\bRECSCREEN\s*7000\b/.test(text)) return { width: 325, projection: 300 };
  if (/\bRECSCREEN\s*6000\b/.test(text)) return { width: 275, projection: 250 };
  return null;
}
