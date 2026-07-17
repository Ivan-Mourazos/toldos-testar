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

function defaultDraft(): DraftState {
  return {
    orderCode: '',
    customer: '',
    orderDate: todayIso(),
    technician: '',
    reviewer: '',
    fabric: '',
    sameFabric: true,
    remate: 'COMO TELA',
    remateColor: '',
    curvaBamba: 'RECTA',
    bambaDistinta: false,
    telaBamba: '',
    structureColor: '',
    rotTela: 'NO',
    rotBamba: 'NO',
    notes: '',
    awnings: [createAwning()]
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
  base.curtainHasWindow = Boolean(old.curtainHasWindow);
  base.curtainFinish = ['NORMAL', 'VELCRO', 'TUBO'].includes(String(old.curtainFinish))
    ? old.curtainFinish as Awning['curtainFinish']
    : 'NORMAL';
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
    curvaBamba: (saved.curvaBamba as string) || fallback.curvaBamba,
    bambaDistinta: typeof saved.bambaDistinta === 'boolean' ? saved.bambaDistinta : fallback.bambaDistinta,
    telaBamba: (saved.telaBamba as string) || fallback.telaBamba,
    structureColor: (saved.structureColor as string) || fallback.structureColor,
    rotTela: (saved.rotTela as string) || fallback.rotTela,
    rotBamba: (saved.rotBamba as string) || fallback.rotBamba,
    notes: (saved.notes as string) || fallback.notes,
    awnings: awnings.length
      ? awnings.map((awning) => ({ ...sanitizeAwning(awning), id: (awning.id as string) || uid() }))
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
  const [curvaBamba, setCurvaBamba] = useState(initialDraft.curvaBamba);
  const [bambaDistinta, setBambaDistinta] = useState(initialDraft.bambaDistinta);
  const [telaBamba, setTelaBamba] = useState(initialDraft.telaBamba);
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
          const fresh = createAwning(getModelWorkType(patch.model));
          return {
            ...fresh, id: awning.id, of: awning.of, model: patch.model, units: awning.units,
            width: awning.width, projection: awning.projection, valanceHeight: awning.valanceHeight,
            armCount: patch.armCount ?? (patch.model === 'ARZUA PRO' || patch.model === 'GALICIA' ? 2 : fresh.armCount),
            curtainHasWindow: patch.model.includes('CORTINA') ? awning.curtainHasWindow : false,
            curtainFinish: patch.model.includes('CORTINA') ? awning.curtainFinish : 'NORMAL',
            curtainWindowExit: patch.model.includes('CORTINA') ? awning.curtainWindowExit : null,
            curtainWindowCorner: patch.model.includes('CORTINA') ? awning.curtainWindowCorner : null,
            curtainWindowFloorHeight: patch.model.includes('CORTINA') ? awning.curtainWindowFloorHeight : null,
            curtainWindowHeight: patch.model.includes('CORTINA') ? awning.curtainWindowHeight : null
          };
        }
        return next;
      })
    );
  }

  function addAwning(workType: Awning['workType'] = 'FULL_AWNING') {
    setAwnings((current) => {
      if (current.length === 1 && isPristineAwning(current[0]) && current[0].workType !== workType) {
        return [createAwning(workType)];
      }
      return [...current, createAwning(workType)];
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
    setAwnings((current) => {
      const removed = current.find((awning) => awning.id === id);
      const next = current.filter((awning) => awning.id !== id);
      return next.length ? next : [createAwning(removed?.workType || 'FULL_AWNING')];
    });
  }

  function reuseHistory(entry: HistoryEntry) {
    const fallback = defaultDraft();
    setOrderCode(entry.orderCode);
    setCustomer(entry.customer);
    setOrderDate(entry.orderDate || fallback.orderDate);
    setTechnician(entry.technician || '');
    setReviewer(entry.reviewer || '');
    setFabric(entry.fabric || '');
    setSameFabric(typeof entry.sameFabric === 'boolean' ? entry.sameFabric : true);
    setRemate(entry.remate || fallback.remate);
    setRemateColor(entry.remateColor || '');
    setCurvaBamba(entry.curvaBamba || fallback.curvaBamba);
    setBambaDistinta(typeof entry.bambaDistinta === 'boolean' ? entry.bambaDistinta : fallback.bambaDistinta);
    setTelaBamba(entry.telaBamba || '');
    setStructureColor(entry.structureColor || fallback.structureColor);
    setRotTela(entry.rotTela || fallback.rotTela);
    setRotBamba(entry.rotBamba || fallback.rotBamba);
    setAwnings(entry.awnings.length
      ? entry.awnings.map((awning) => ({ ...sanitizeAwning(awning as unknown as Record<string, unknown>), id: awning.id }))
      : [createAwning()]);
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
    setCurvaBamba(clean.curvaBamba);
    setBambaDistinta(clean.bambaDistinta);
    setTelaBamba(clean.telaBamba);
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
    curvaBamba, setCurvaBamba,
    bambaDistinta, setBambaDistinta,
    telaBamba, setTelaBamba,
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

function isPristineAwning(awning: Awning) {
  return !awning.model && !awning.of && !awning.width && !awning.projection && !awning.valanceHeight;
}
