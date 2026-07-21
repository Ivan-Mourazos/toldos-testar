import { useEffect, useState } from 'react';
import type { Awning, DraftState, HistoryEntry } from '../types';
import { createAwning, storageKey, historyStorageKey, todayIso, uid } from '../constants';
import { formOptions, getModelBehavior, getModelWorkType } from '../../domain/modelBehavior.js';

const legacyStorageKeyV4 = 'toldos-testar-draft-v4';
const legacyStorageKeyV3 = 'toldos-testar-draft-v3';
const legacyStorageKeyV5 = 'toldos-testar-draft-v5';
const draftStorageKeys = [storageKey, legacyStorageKeyV5, legacyStorageKeyV4, legacyStorageKeyV3];

const sensorNames = formOptions.sensores.map((s) => s.sensor);
const wallTypeNames = formOptions.tiposPared.map((p) => p.pared);

export function defaultDraft(): DraftState {
  return {
    orderCode: '',
    customer: '',
    orderDate: todayIso(),
    technician: '',
    reviewer: '',
    fabric: '',
    sameFabric: true,
    remate: '',
    remateColor: '',
    structureColor: '',
    rotTela: '',
    rotBamba: '',
    notes: '',
    awnings: []
  };
}

export function sanitizeAwning(old: Record<string, unknown>): Awning {
  const base = { ...createAwning(), ...old } as Awning & Record<string, unknown>;
  base.workType = old.workType === 'FABRIC_ONLY' || old.workType === 'FULL_AWNING'
    ? old.workType
    : getModelWorkType(base.model);
  if (old.machineSide === 'DERECHA') base.machineSide = 'M.F.DER';
  if (old.machineSide === 'IZQUIERDA') base.machineSide = 'M.F IZQ';
  base.reglasModificadas = typeof old.reglasModificadas === 'boolean' ? old.reglasModificadas : false;
  base.fabric = typeof old.fabric === 'string' ? old.fabric : '';
  base.hasValance = typeof old.hasValance === 'boolean'
    ? old.hasValance
    : Number(old.valanceHeight) > 0 ? true : null;
  if (base.hasValance === false) base.valanceHeight = 0;
  base.valanceCurve = typeof old.valanceCurve === 'string' ? old.valanceCurve : '';
  base.valanceFabric = typeof old.valanceFabric === 'string' ? old.valanceFabric : '';
  base.remate = typeof old.remate === 'string' ? old.remate : '';
  base.remateColor = typeof old.remateColor === 'string' ? old.remateColor : '';
  base.structureColor = typeof old.structureColor === 'string' ? old.structureColor : '';
  base.rotFabric = typeof old.rotFabric === 'string' ? old.rotFabric : '';
  base.rotValance = typeof old.rotValance === 'string' ? old.rotValance : '';
  base.curtainHasWindow = typeof old.curtainHasWindow === 'boolean' ? old.curtainHasWindow : null;
  base.curtainFinish = ['NORMAL', 'VELCRO', 'TUBO'].includes(String(old.curtainFinish))
    ? old.curtainFinish as Awning['curtainFinish']
    : '';
  base.curtainFabricDeductionCm = Number.isFinite(Number(old.curtainFabricDeductionCm))
    ? Number(old.curtainFabricDeductionCm)
    : null;
  base.curtainFabricWidthDiscountCm = nullableNumber(old.curtainFabricWidthDiscountCm);
  base.curtainRollTubeDiscountCm = nullableNumber(old.curtainRollTubeDiscountCm);
  base.curtainLoadProfileDiscountCm = nullableNumber(old.curtainLoadProfileDiscountCm);
  base.boxMinimumLineCm = nullableNumber(old.boxMinimumLineCm);
  base.boxProfileDiscountCm = nullableNumber(old.boxProfileDiscountCm);
  base.boxRollDiscountCm = nullableNumber(old.boxRollDiscountCm);
  base.boxFabricWidthDiscountCm = nullableNumber(old.boxFabricWidthDiscountCm);
  base.boxProtectorDiscountCm = nullableNumber(old.boxProtectorDiscountCm);
  base.xacMinimumLineCm = nullableNumber(old.xacMinimumLineCm);
  base.xacFabricWidthDiscountCm = nullableNumber(old.xacFabricWidthDiscountCm);
  base.xacRollDiscountCm = nullableNumber(old.xacRollDiscountCm);
  base.xacLoadBarDiscountCm = nullableNumber(old.xacLoadBarDiscountCm);
  base.pointFabricWidthDiscountCm = nullableNumber(old.pointFabricWidthDiscountCm);
  base.pointRollDiscountCm = nullableNumber(old.pointRollDiscountCm);
  base.pointLoadBarDiscountCm = nullableNumber(old.pointLoadBarDiscountCm);
  base.pointFabricDropMultiplier = nullableNumber(old.pointFabricDropMultiplier);
  base.pointFabricDropAllowanceCm = nullableNumber(old.pointFabricDropAllowanceCm);
  base.monoblockMinimumLineCm = nullableNumber(old.monoblockMinimumLineCm);
  base.monoblockMaximumLineCm = nullableNumber(old.monoblockMaximumLineCm);
  base.monoblockSupportCount = nullableNumber(old.monoblockSupportCount);
  base.monoblockFabricWidthDiscountCm = nullableNumber(old.monoblockFabricWidthDiscountCm);
  base.monoblockRollDiscountCm = nullableNumber(old.monoblockRollDiscountCm);
  base.monoblockLoadBarDiscountCm = nullableNumber(old.monoblockLoadBarDiscountCm);
  base.monoblockSquareBarDiscountCm = nullableNumber(old.monoblockSquareBarDiscountCm);
  base.monoblockFabricDropAllowanceCm = nullableNumber(old.monoblockFabricDropAllowanceCm);
  base.maxisFabricWidthDiscountCm = nullableNumber(old.maxisFabricWidthDiscountCm);
  base.maxisRollDiscountCm = nullableNumber(old.maxisRollDiscountCm);
  base.maxisLoadBarDiscountCm = nullableNumber(old.maxisLoadBarDiscountCm);
  base.maxisBoxProfileDiscountCm = nullableNumber(old.maxisBoxProfileDiscountCm);
  base.maxisFabricDropAllowanceCm = nullableNumber(old.maxisFabricDropAllowanceCm);
  base.ambarFabricWidthDiscountCm = nullableNumber(old.ambarFabricWidthDiscountCm);
  base.ambarRollDiscountCm = nullableNumber(old.ambarRollDiscountCm);
  base.ambarProfileDiscountCm = nullableNumber(old.ambarProfileDiscountCm);
  base.ambarFabricDropMultiplier = nullableNumber(old.ambarFabricDropMultiplier);
  base.ambarFabricDropAllowanceCm = nullableNumber(old.ambarFabricDropAllowanceCm);
  base.agataMinimumLineCm = nullableNumber(old.agataMinimumLineCm);
  base.agataSupportCount = nullableNumber(old.agataSupportCount);
  base.agataFabricWidthDiscountCm = nullableNumber(old.agataFabricWidthDiscountCm);
  base.agataRollDiscountCm = nullableNumber(old.agataRollDiscountCm);
  base.agataFabricDropAllowanceCm = nullableNumber(old.agataFabricDropAllowanceCm);
  base.fabricJobWidthAdjustmentCm = nullableNumber(old.fabricJobWidthAdjustmentCm);
  base.fabricJobDropAllowanceCm = nullableNumber(old.fabricJobDropAllowanceCm);
  base.fabricJobValanceExtraCm = nullableNumber(old.fabricJobValanceExtraCm);
  base.structureNotes = typeof old.structureNotes === 'string'
    ? old.structureNotes
    : typeof old.notes === 'string' ? old.notes : '';
  base.fabricNotes = typeof old.fabricNotes === 'string' ? old.fabricNotes : '';
  delete base.valance;
  delete base.calculationModelOverride;
  delete base.supportSystemOverride;
  delete base.minimumLineOverride;
  delete base.overrideReason;
  delete base.notes;

  // Un borrador viejo puede traer valores que ya no existen en las listas actuales
  // (p.ej. sensor "VIENTO" o crankHeight 165): sin este saneo, el select queda en
  // blanco pero el valor viejo se sigue enviando al cálculo, generando referencias
  // inexistentes como MANIVE...165C.
  if (!sensorNames.includes(base.sensor)) base.sensor = '';
  if (!wallTypeNames.includes(base.wallType)) base.wallType = '';
  if (!formOptions.colocaciones.includes(base.placement)) base.placement = '';
  if (!formOptions.localizacionesMaquina.includes(base.machineSide)) base.machineSide = '';
  if (base.crankHeight !== null && !formOptions.alturasManivela.includes(base.crankHeight)) base.crankHeight = null;
  const tubeOptions = getModelBehavior(base.model).tubeOptions || [];
  if (tubeOptions.length > 0 && !tubeOptions.includes(base.tubeLoad)) base.tubeLoad = '';

  return base as Awning;
}

export function migrateLegacyDraft(saved: Record<string, unknown> | null): DraftState | null {
  if (!saved) return null;
  const fallback = defaultDraft();
  const awnings = Array.isArray(saved.awnings) ? (saved.awnings as Record<string, unknown>[]) : [];
  return {
    ...fallback,
    orderCode: (saved.orderCode as string) || fallback.orderCode,
    customer: (saved.customer as string) || fallback.customer,
    orderDate: (saved.orderDate as string) || fallback.orderDate,
    technician: (saved.technician as string) || fallback.technician,
    reviewer: (saved.reviewer as string) || fallback.reviewer,
    fabric: (saved.fabric as string) || fallback.fabric,
    sameFabric: typeof saved.sameFabric === 'boolean' ? saved.sameFabric : fallback.sameFabric,
    remate: (saved.remate as string) || fallback.remate,
    remateColor: (saved.remateColor as string) || fallback.remateColor,
    structureColor: (saved.structureColor as string) || fallback.structureColor,
    rotTela: (saved.rotTela as string) || fallback.rotTela,
    rotBamba: (saved.rotBamba as string) || fallback.rotBamba,
    notes: (saved.notes as string) || fallback.notes,
    awnings: awnings.length
      ? awnings.map((awning) => {
        const sanitized = sanitizeAwning(awning);
        return {
          ...sanitized,
          id: (awning.id as string) || uid(),
          valanceCurve: sanitized.valanceCurve || (saved.curvaBamba as string) || '',
          valanceFabric: sanitized.valanceFabric || (saved.bambaDistinta ? (saved.telaBamba as string) || '' : ''),
          remate: sanitized.remate || (saved.remate as string) || '',
          remateColor: sanitized.remateColor || (saved.remateColor as string) || '',
          structureColor: sanitized.structureColor || (saved.structureColor as string) || '',
          rotFabric: sanitized.rotFabric || (saved.rotTela as string) || '',
          rotValance: sanitized.rotValance || (saved.rotBamba as string) || ''
        };
      })
      : fallback.awnings
  };
}

function clearStoredDrafts() {
  if (typeof localStorage === 'undefined') return;
  draftStorageKeys.forEach((key) => localStorage.removeItem(key));
}

function getInitialHistory(): HistoryEntry[] {
  if (typeof localStorage === 'undefined') return [];

  try {
    const saved = JSON.parse(localStorage.getItem(historyStorageKey) || '[]');
    return Array.isArray(saved) ? saved : [];
  } catch {
    localStorage.removeItem(historyStorageKey);
    return [];
  }
}

export function useDraft() {
  const [initialDraft] = useState(() => {
    clearStoredDrafts();
    return defaultDraft();
  });
  const [orderCode, setOrderCode] = useState(initialDraft.orderCode);
  const [customer, setCustomer] = useState(initialDraft.customer);
  const [orderDate, setOrderDate] = useState(initialDraft.orderDate);
  const [technician, setTechnician] = useState(initialDraft.technician);
  const [reviewer, setReviewer] = useState(initialDraft.reviewer);
  const [fabric, setFabric] = useState(initialDraft.fabric);
  const [sameFabric, setSameFabric] = useState(initialDraft.sameFabric);
  const [remate, setRemate] = useState(initialDraft.remate);
  const [remateColor, setRemateColor] = useState(initialDraft.remateColor);
  const [structureColor, setStructureColor] = useState(initialDraft.structureColor);
  const [rotTela, setRotTela] = useState(initialDraft.rotTela);
  const [rotBamba, setRotBamba] = useState(initialDraft.rotBamba);
  const [awnings, setAwnings] = useState<Awning[]>(initialDraft.awnings);
  const [historyEntries, setHistoryEntries] = useState<HistoryEntry[]>(() => getInitialHistory());

  useEffect(() => {
    localStorage.setItem(historyStorageKey, JSON.stringify(historyEntries.slice(0, 80)));
  }, [historyEntries]);

  function updateAwning(id: string, patch: Partial<Awning>) {
    setAwnings((current) =>
      current.map((awning) => {
        if (awning.id !== id) return awning;
        const next = { ...awning, ...patch };
        if (patch.model && patch.model !== awning.model) {
          return switchAwningModel(awning, patch.model, patch.armCount);
        }
        return next;
      })
    );
  }

  function addAwning(workType: Awning['workType'] = 'FULL_AWNING', model = '') {
    setAwnings((current) => {
      const fresh = createAwning(workType);
      return [...current, model ? switchAwningModel(fresh, model) : fresh];
    });
  }

  function duplicateAwning(id: string) {
    setAwnings((current) => {
      const source = current.find((awning) => awning.id === id);
      if (!source) return current;
      return [...current, { ...source, id: uid(), of: '', structureNotes: '', fabricNotes: '' }];
    });
  }

  function removeAwning(id: string) {
    setAwnings((current) => current.filter((awning) => awning.id !== id));
  }

  function reuseHistory(entry: HistoryEntry) {
    const fallback = defaultDraft();
    setOrderCode(entry.orderCode);
    setCustomer(entry.customer);
    setOrderDate(entry.orderDate || fallback.orderDate);
    setTechnician(entry.technician || '');
    setReviewer(entry.reviewer || '');
    setFabric(entry.fabric || '');
    setSameFabric(typeof entry.sameFabric === 'boolean' ? entry.sameFabric : fallback.sameFabric);
    setRemate(entry.remate || fallback.remate);
    setRemateColor(entry.remateColor || '');
    setStructureColor(entry.structureColor || fallback.structureColor);
    setRotTela(entry.rotTela || fallback.rotTela);
    setRotBamba(entry.rotBamba || fallback.rotBamba);
    setAwnings(entry.awnings.length
      ? entry.awnings.map((awning) => ({ ...sanitizeAwning(awning as unknown as Record<string, unknown>), id: awning.id }))
      : []);
  }

  function resetDraft() {
    const clean = defaultDraft();
    clearStoredDrafts();
    setOrderCode(clean.orderCode);
    setCustomer(clean.customer);
    setOrderDate(clean.orderDate);
    setTechnician(clean.technician);
    setReviewer(clean.reviewer);
    setFabric(clean.fabric);
    setSameFabric(clean.sameFabric);
    setRemate(clean.remate);
    setRemateColor(clean.remateColor);
    setStructureColor(clean.structureColor);
    setRotTela(clean.rotTela);
    setRotBamba(clean.rotBamba);
    setAwnings(clean.awnings);
  }

  return {
    orderCode, setOrderCode,
    customer, setCustomer,
    orderDate, setOrderDate,
    technician, setTechnician,
    reviewer, setReviewer,
    fabric, setFabric,
    sameFabric, setSameFabric,
    remate, setRemate,
    remateColor, setRemateColor,
    structureColor, setStructureColor,
    rotTela, setRotTela,
    rotBamba, setRotBamba,
    awnings,
    historyEntries, setHistoryEntries,
    updateAwning,
    addAwning,
    duplicateAwning,
    removeAwning,
    reuseHistory,
    resetDraft
  };
}

export function switchAwningModel(awning: Awning, model: string, armCount?: number | null): Awning {
  const fresh = createAwning(getModelWorkType(model));
  const isCurtain = model.includes('CORTINA');
  const isBox = model === 'PERLA BOX' || model === 'CORAL BOX' || model === 'CUARZO BOX';
  const isXacobeo = model === 'XACOBEO';
  const isPuntoRecto = model === 'PUNTO RECTO';
  const isMonoblock350 = model === 'MONOBLOCK 350';
  const isMaxiscreem = model === 'MAXISCREEM';
  const supportsValance = (getModelBehavior(model).dimensions || []).includes('valanceHeight');
  return {
    ...fresh,
    id: awning.id,
    of: awning.of,
    model,
    units: awning.units,
    width: awning.width,
    projection: awning.projection,
    hasValance: model === 'BAMBALINA' ? true : supportsValance ? awning.hasValance : null,
    valanceHeight: supportsValance ? awning.valanceHeight : null,
    valanceCurve: supportsValance ? awning.valanceCurve : '',
    valanceFabric: supportsValance ? awning.valanceFabric : '',
    remate: supportsValance ? awning.remate : '',
    remateColor: supportsValance ? awning.remateColor : '',
    structureColor: getModelWorkType(model) === 'FULL_AWNING' ? awning.structureColor : '',
    rotFabric: awning.rotFabric,
    rotValance: supportsValance ? awning.rotValance : '',
    armCount: armCount ?? null,
    placement: awning.placement,
    curtainHasWindow: isCurtain ? awning.curtainHasWindow : null,
    curtainFinish: isCurtain ? awning.curtainFinish : '',
    curtainWindowExit: isCurtain ? awning.curtainWindowExit : null,
    curtainWindowCorner: isCurtain ? awning.curtainWindowCorner : null,
    curtainWindowFloorHeight: isCurtain ? awning.curtainWindowFloorHeight : null,
    curtainWindowHeight: isCurtain ? awning.curtainWindowHeight : null,
    curtainFabricDeductionCm: isCurtain ? awning.curtainFabricDeductionCm : null,
    curtainFabricWidthDiscountCm: isCurtain ? awning.curtainFabricWidthDiscountCm : null,
    curtainRollTubeDiscountCm: isCurtain ? awning.curtainRollTubeDiscountCm : null,
    curtainLoadProfileDiscountCm: isCurtain ? awning.curtainLoadProfileDiscountCm : null,
    boxMinimumLineCm: isBox ? awning.boxMinimumLineCm : null,
    boxProfileDiscountCm: isBox ? awning.boxProfileDiscountCm : null,
    boxRollDiscountCm: isBox ? awning.boxRollDiscountCm : null,
    boxFabricWidthDiscountCm: isBox ? awning.boxFabricWidthDiscountCm : null,
    boxProtectorDiscountCm: isBox ? awning.boxProtectorDiscountCm : null,
    xacMinimumLineCm: isXacobeo ? awning.xacMinimumLineCm : null,
    xacFabricWidthDiscountCm: isXacobeo ? awning.xacFabricWidthDiscountCm : null,
    xacRollDiscountCm: isXacobeo ? awning.xacRollDiscountCm : null,
    xacLoadBarDiscountCm: isXacobeo ? awning.xacLoadBarDiscountCm : null,
    pointFabricWidthDiscountCm: isPuntoRecto ? awning.pointFabricWidthDiscountCm : null,
    pointRollDiscountCm: isPuntoRecto ? awning.pointRollDiscountCm : null,
    pointLoadBarDiscountCm: isPuntoRecto ? awning.pointLoadBarDiscountCm : null,
    pointFabricDropMultiplier: isPuntoRecto ? awning.pointFabricDropMultiplier : null,
    pointFabricDropAllowanceCm: isPuntoRecto ? awning.pointFabricDropAllowanceCm : null,
    monoblockMinimumLineCm: isMonoblock350 ? awning.monoblockMinimumLineCm : null,
    monoblockMaximumLineCm: isMonoblock350 ? awning.monoblockMaximumLineCm : null,
    monoblockSupportCount: isMonoblock350 ? awning.monoblockSupportCount : null,
    monoblockFabricWidthDiscountCm: isMonoblock350 ? awning.monoblockFabricWidthDiscountCm : null,
    monoblockRollDiscountCm: isMonoblock350 ? awning.monoblockRollDiscountCm : null,
    monoblockLoadBarDiscountCm: isMonoblock350 ? awning.monoblockLoadBarDiscountCm : null,
    monoblockSquareBarDiscountCm: isMonoblock350 ? awning.monoblockSquareBarDiscountCm : null,
    monoblockFabricDropAllowanceCm: isMonoblock350 ? awning.monoblockFabricDropAllowanceCm : null,
    maxisFabricWidthDiscountCm: isMaxiscreem ? awning.maxisFabricWidthDiscountCm : null,
    maxisRollDiscountCm: isMaxiscreem ? awning.maxisRollDiscountCm : null,
    maxisLoadBarDiscountCm: isMaxiscreem ? awning.maxisLoadBarDiscountCm : null,
    maxisBoxProfileDiscountCm: isMaxiscreem ? awning.maxisBoxProfileDiscountCm : null,
    maxisFabricDropAllowanceCm: isMaxiscreem ? awning.maxisFabricDropAllowanceCm : null
  };
}

function nullableNumber(value: unknown) {
  return value !== null && value !== undefined && value !== '' && Number.isFinite(Number(value))
    ? Number(value)
    : null;
}
