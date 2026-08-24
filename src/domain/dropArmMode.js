export const DROP_ARM_MODE_STANDARD = 'STANDARD';
export const DROP_ARM_MODE_VERTICAL_170 = 'VERTICAL_170';
export const DEFAULT_DROP_ARM_VERTICAL_ALLOWANCE_CM = 40;

export const dropArmModeOptions = Object.freeze([
  DROP_ARM_MODE_STANDARD,
  DROP_ARM_MODE_VERTICAL_170
]);

const supportedModels = new Set(['AMBAR BOX', 'PUNTO RECTO']);

export function supportsVerticalDropArm(model) {
  return supportedModels.has(String(model || '').trim().toUpperCase());
}

export function normalizeDropArmMode(value) {
  const clean = String(value || '').trim().toUpperCase().replace(/[\s-]+/g, '_');
  return clean === DROP_ARM_MODE_VERTICAL_170
    ? DROP_ARM_MODE_VERTICAL_170
    : DROP_ARM_MODE_STANDARD;
}

export function normalizeDropArmModeForModel(model, value) {
  return supportsVerticalDropArm(model)
    ? normalizeDropArmMode(value)
    : DROP_ARM_MODE_STANDARD;
}

export function isVerticalDropArmMode(value) {
  return normalizeDropArmMode(value) === DROP_ARM_MODE_VERTICAL_170;
}

export function calculateVerticalDropArmFabricDrop({
  projection,
  allowanceCm = DEFAULT_DROP_ARM_VERTICAL_ALLOWANCE_CM,
  valanceHeight = 0,
  separateValance = false
}) {
  const safeProjection = Math.max(0, Number(projection) || 0);
  const safeAllowance = Math.max(0, Number(allowanceCm) || 0);
  const safeValance = separateValance ? 0 : Math.max(0, Number(valanceHeight) || 0);
  return safeProjection * 2 + safeAllowance + safeValance;
}
