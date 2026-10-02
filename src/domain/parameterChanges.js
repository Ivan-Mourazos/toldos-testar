/**
 * Qué cambió de un modelo, en frases cortas (Iván, 02/10/2026: el motivo es opcional y el
 * historial cuenta solo lo que cambió). Los nombres son los que tienen los valores en su ficha.
 */
import { drawingConditionsText } from './drawingCatalog.js';
import { formatNumber } from './math.js';
import { fabricJobScopes, scopeParts } from './parameterScopes.js';
import { sameParameterValue } from './ruleParameters.js';

export const PARAMETER_LABELS = {
  standardMaxWidth: 'Frente máximo',
  motor70WidthFrom: 'Motor 70/17 desde',
  fabricDropAllowanceCm: 'Margen de caída',
  seamAllowanceCm: 'Costura entre paños',
  seamBaseCm: 'Margen base de paño',
  stockLengths: 'Largos de barra',
  privateTube: 'Tubo · particular',
  businessTube: 'Tubo · empresa u hostelería',
  widthDiscounts: 'Descuentos del tubo de carga',
  rollTubeDiscounts: 'Descuentos del tubo de enrollamiento',
  fabricWidthDiscounts: 'Descuentos de la tela',
  minimumLineByArm: 'Línea mínima por brazos',
  armSwitchWidth: '3 brazos desde',
  minimumLineByProjection: 'Línea mínima por salida',
  motorPowerByProjection: 'Motor por salida',
  profileDiscountCm: 'Descuentos del perfil',
  rollDiscountCm: 'Descuentos del enrollamiento',
  fabricWidthDiscountCm: 'Descuentos de la tela',
  protectorDiscountCm: 'Descuentos del protector',
  standardMaxDrop: 'Caída máxima estándar',
  bottomDeductionCm: 'Descuento inferior',
  loadProfileDiscounts: 'Descuentos del perfil de carga',
  maxWidthByProjection: 'Frente máximo por salida',
  loadBarDiscounts: 'Descuentos de la barra de carga',
  fabricDropMultiplier: 'Multiplicador de la salida',
  verticalFabricDropAllowanceCm: 'Margen bajada vertical',
  motorPowerByArm: 'Motor por brazos',
  valanceExtraCm: 'Remate de bambalina',
  squareBarStockLength: 'Stock barra 40×40',
  supportGapThresholdCm: 'Luz máxima entre apoyos',
  supportEdgeOffsetCm: 'Margen lateral soportes',
  curronStartWidthCm: 'Primer currón desde',
  curronSecondWidthCm: 'Segundo currón desde',
  discounts: 'Descuentos',
  dimensionalRules: 'Reglas de medidas',
  rollStockLengths: 'Largos del tubo de enrollamiento',
  profileStockLengths: 'Largos del perfil',
  guideDiscountCm: 'Ajuste guía',
  guideStockLengths: 'Largos de la guía',
  supportDiscounts: 'Descuentos por soporte',
  cofreDiscounts: 'Descuentos del cofre',
  profileDiscounts: 'Descuentos del perfil',
  motorPower: 'Motor',
  maxWidthByArms: 'Frente máximo por brazos',
  profileStockLength: 'Largo del perfil',
  supportBaseStartWidth: 'Inicio de soportes',
  supportBaseStepWidth: 'Paso entre soportes',
  anticaSeparateValanceAllowanceCm: 'Margen de la bamba separada de Antica',
  dropAllowanceByModel: 'Margen de caída'
};

function plain(value) {
  if (typeof value === 'number') return formatNumber(value);
  if (typeof value === 'string') return value || '—';
  if (typeof value === 'boolean') return value ? 'Sí' : 'No';
  if (Array.isArray(value) && value.every((item) => typeof item === 'number')) return value.map(formatNumber).join(', ');
  return null;
}

function valueLines(before, after) {
  if (sameParameterValue(before, after)) return [];
  if (!before || !after || typeof before !== 'object' || typeof after !== 'object') {
    return [`Margen de caída: ${plain(before) ?? '—'} → ${plain(after) ?? '—'}`];
  }
  const keys = [...new Set([...Object.keys(before), ...Object.keys(after)])];
  return keys.filter((key) => !sameParameterValue(before[key], after[key])).map((key) => {
    const label = PARAMETER_LABELS[key] ?? key;
    const left = plain(before[key]);
    const right = plain(after[key]);
    return left !== null && right !== null ? `${label}: ${left} → ${right}` : `${label}: cambiados`;
  });
}

const usageText = (drawing) => (drawing.usage === 'manual'
  ? 'Solo a mano'
  : drawing.conditions.length ? `Automático cuando ${drawingConditionsText(drawing.conditions)}` : 'Automático (siempre)');

function drawingLines(before, after) {
  const lines = [];
  const previous = new Map(before.map((drawing) => [drawing.id, drawing]));
  for (const drawing of after) {
    const old = previous.get(drawing.id);
    previous.delete(drawing.id);
    if (!old) {
      lines.push(`Dibujo «${drawing.name}» añadido`);
      continue;
    }
    const parts = [];
    if (old.name !== drawing.name) parts.push(`nombre «${old.name}» → «${drawing.name}»`);
    if (old.image !== drawing.image) parts.push(!old.image ? 'imagen puesta' : drawing.image ? 'imagen cambiada' : 'imagen quitada');
    if (old.enabled !== drawing.enabled) parts.push(drawing.enabled ? 'activado' : 'desactivado');
    if (usageText(old) !== usageText(drawing)) parts.push(`${usageText(old)} → ${usageText(drawing)}`);
    if (parts.length) lines.push(`Dibujo «${drawing.name}»: ${parts.join('; ')}`);
  }
  for (const removed of previous.values()) lines.push(`Dibujo «${removed.name}» quitado`);
  if (!lines.length && !sameParameterValue(before.map((d) => d.id), after.map((d) => d.id))) lines.push('Orden de los dibujos cambiado');
  return lines;
}

/** Lo que cambió del ámbito `scope` entre `before` y `after` (RuleParameters normalizados). Vacío si nada. */
export function scopeChangeSummary(before, after, scope) {
  const a = scopeParts(before, scope);
  const b = scopeParts(after, scope);
  if (sameParameterValue(a, b)) return [];
  const lines = fabricJobScopes.includes(scope) && !sameParameterValue(a.values, b.values)
    ? [`Margen de caída: ${plain(a.values) ?? '—'} → ${plain(b.values) ?? '—'}`]
    : valueLines(a.values, b.values);
  lines.push(...drawingLines(a.drawings, b.drawings));
  return lines.length ? lines : ['Valores cambiados'];
}
