import type { Awning } from './types';

export const storageKey = 'toldos-testar-draft-v6';
export const historyStorageKey = 'toldos-testar-history-v1';

export function uid() {
  if (typeof globalThis.crypto?.randomUUID === 'function') {
    return globalThis.crypto.randomUUID();
  }

  const bytes = new Uint8Array(16);
  globalThis.crypto.getRandomValues(bytes);
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;

  const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0'));
  return `${hex.slice(0, 4).join('')}-${hex.slice(4, 6).join('')}-${hex.slice(6, 8).join('')}-${hex.slice(8, 10).join('')}-${hex.slice(10).join('')}`;
}

export function createAwning(workType: Awning['workType'] = 'FULL_AWNING'): Awning {
  return {
    id: uid(),
    workType,
    of: '',
    model: '',
    units: 1,
    width: null,
    projection: null,
    height: null,
    heraJoin: '',
    heraTopFinish: '',
    heraBottomFinish: '',
    heraInteriorFace: '',
    hasValance: null,
    valanceHeight: null,
    valanceCurve: '',
    valanceFabric: '',
    fabricDiagramOverride: '',
    remate: '',
    remateColor: '',
    structureColor: '',
    rotFabric: '',
    rotValance: '',
    armCount: null,
    device: '',
    placement: '',
    wallType: '',
    tubeLoad: '',
    destination: '',
    supportSystem: '',
    motorPower: '',
    submodel: '',
    sensor: '',
    machineSide: '',
    crankHeight: null,
    curtainHasWindow: null,
    curtainFinish: '',
    curtainSupport: '',
    curtainWindowExit: null,
    curtainWindowCorner: null,
    curtainWindowFloorHeight: null,
    curtainWindowHeight: null,
    curtainFabricDeductionCm: null,
    curtainFabricWidthDiscountCm: null,
    curtainRollTubeDiscountCm: null,
    curtainLoadProfileDiscountCm: null,
    boxMinimumLineCm: null,
    boxProfileDiscountCm: null,
    boxRollDiscountCm: null,
    boxFabricWidthDiscountCm: null,
    boxProtectorDiscountCm: null,
    xacMinimumLineCm: null,
    xacFabricWidthDiscountCm: null,
    xacRollDiscountCm: null,
    xacLoadBarDiscountCm: null,
    pointFabricWidthDiscountCm: null,
    pointRollDiscountCm: null,
    pointLoadBarDiscountCm: null,
    pointFabricDropMultiplier: null,
    pointFabricDropAllowanceCm: null,
    monoblockMinimumLineCm: null,
    monoblockMaximumLineCm: null,
    monoblockSupportCount: null,
    monoblockFabricWidthDiscountCm: null,
    monoblockRollDiscountCm: null,
    monoblockLoadBarDiscountCm: null,
    monoblockSquareBarDiscountCm: null,
    monoblockFabricDropAllowanceCm: null,
    maxisFabricWidthDiscountCm: null,
    maxisRollDiscountCm: null,
    maxisLoadBarDiscountCm: null,
    maxisBoxProfileDiscountCm: null,
    maxisFabricDropAllowanceCm: null,
    ambarFabricWidthDiscountCm: null,
    ambarRollDiscountCm: null,
    ambarProfileDiscountCm: null,
    ambarFabricDropMultiplier: null,
    ambarFabricDropAllowanceCm: null,
    agataMinimumLineCm: null,
    agataSupportCount: null,
    agataFabricWidthDiscountCm: null,
    agataRollDiscountCm: null,
    agataFabricDropAllowanceCm: null,
    fabricJobWidthAdjustmentCm: null,
    fabricJobDropAllowanceCm: null,
    fabricJobValanceExtraCm: null,
    anticaVariant: '',
    anticaMeasurementMode: '',
    anticaSupportHeight: null,
    reglasModificadas: false,
    fabric: '',
    structureNotes: '',
    fabricNotes: ''
  };
}

export function todayIso() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function formatDecimal(value: number | undefined) {
  return new Intl.NumberFormat('es-ES', { maximumFractionDigits: 2 }).format(value || 0);
}

export function fileNameFromDisposition(value: string | null) {
  const match = /filename="([^"]+)"/.exec(value || '');
  return match?.[1] || '';
}
