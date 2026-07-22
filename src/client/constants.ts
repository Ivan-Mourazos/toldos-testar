import type { Awning } from './types';

export const storageKey = 'toldos-testar-draft-v6';
export const historyStorageKey = 'toldos-testar-history-v1';

export function uid() {
  return crypto.randomUUID();
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
    hasValance: null,
    valanceHeight: null,
    valanceCurve: '',
    valanceFabric: '',
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
