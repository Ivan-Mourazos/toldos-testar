// Ajuste de la caída de tela en la tarjeta (Iván, 09/10/2026, AR2604955): centímetros que el
// técnico suma o quita a la caída sin abrir el candado, como el «ajuste de salida» de la Cortina.
// Por ejemplo, una bambalina pisada doble lleva más tela. Vale para los toldos completos; la
// Cortina y los trabajos de tela ya tienen su propia casilla.
const ownAdjustment = new Set(['CORTINA', 'CAMBIO CORTINA', 'CAMBIO TELA', 'CAMBIO ANTICA', 'BAMBALINA', 'ENROLLABLE']);

export function supportsFabricDropAdjustment(model) {
  const clean = String(model || '').trim().toUpperCase();
  return Boolean(clean) && !ownAdjustment.has(clean);
}

/** Centímetros que se suman (o, en negativo, se quitan) a la caída de tela de ese toldo. */
export function fabricDropAdjustmentCm(awning = {}) {
  const value = awning?.fabricDropAdjustmentCm;
  if (typeof value !== 'number' || !Number.isFinite(value) || !supportsFabricDropAdjustment(awning.model)) return 0;
  return Math.round(value * 10) / 10;
}

const noValanceInBody = new Set(['IRIS', 'HERA']);
const round1 = (value) => Math.round(value * 10) / 10;
const es = (value) => round1(value).toLocaleString('es-ES', { maximumFractionDigits: 1 });

/**
 * Resumen de aumentos de la caída de tela, para verlo en la tarjeta: de dónde sale cada
 * centímetro. Las partes suman siempre la caída calculada; el «aumento» es lo que queda al quitar
 * la salida, la bamba y el ajuste, así que dice lo que el cálculo ha sumado de verdad.
 * @returns {{ total: number, parts: { label: string, cm: number }[], text: string } | null}
 */
export function fabricDropSummary(awning = {}, calculation = {}) {
  const total = round1(Number(calculation?.fabricDrop));
  if (!supportsFabricDropAdjustment(awning.model) || !Number.isFinite(total) || total <= 0) return null;
  const model = String(awning.model).trim().toUpperCase();
  const adjustment = fabricDropAdjustmentCm(awning);
  const valanceHeight = Number(awning.valanceHeight) || 0;
  const valance = valanceHeight > 0 && !(Number(calculation.valanceDrop) > 0) && !noValanceInBody.has(model) ? valanceHeight : 0;
  const parts = [];
  if (model === 'ANTICA') {
    // La Antica no parte de la salida: el cuerpo sale de su configuración (soporte, brazo…).
    parts.push({ label: 'cuerpo de la Antica', cm: round1(total - valance - adjustment) });
  } else if (model === 'IRIS') {
    const allowance = Number(calculation.irisFabricDropAllowanceCm) || 0;
    parts.push({ label: 'caída menor del hueco', cm: round1(total - allowance - adjustment) });
    parts.push({ label: 'aumento para el enrolle', cm: allowance });
  } else {
    const projection = Number(awning.projection) || 0;
    const multiplierKey = Object.keys(calculation).find((key) => key.endsWith('FabricDropMultiplier'));
    const multiplier = multiplierKey ? Number(calculation[multiplierKey]) || 1 : 1;
    const base = round1(projection * multiplier);
    parts.push({ label: multiplier === 1 ? 'salida' : `salida ${es(projection)} × ${multiplier.toLocaleString('es-ES', { maximumFractionDigits: 2 })}`, cm: base });
    parts.push({ label: 'aumento', cm: round1(total - base - valance - adjustment) });
  }
  if (valance) parts.push({ label: 'bamba', cm: valance });
  if (adjustment) parts.push({ label: 'ajuste', cm: adjustment });
  const text = parts.map((part, index) => `${index === 0 ? '' : part.cm < 0 ? '− ' : '+ '}${part.label} ${es(Math.abs(part.cm))}`).join(' ');
  return { total, parts, text: `Caída de tela ${es(total)} cm = ${text}` };
}
