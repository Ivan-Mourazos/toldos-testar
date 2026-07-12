import { useEffect, useState } from 'react';
import type { Awning, DraftState, HistoryEntry } from '../types';
import { createAwning, storageKey, historyStorageKey, todayIso, uid } from '../constants';

const legacyStorageKeyV4 = 'toldos-testar-draft-v4';
const legacyStorageKeyV3 = 'toldos-testar-draft-v3';

function defaultDraft(): DraftState {
  return {
    orderCode: '',
    customer: '',
    orderDate: todayIso(),
    technician: '',
    reviewer: '',
    fabric: '',
    remate: 'COMO TELA',
    curvaBamba: 'RECTA',
    bambaDistinta: false,
    telaBamba: '',
    structureColor: 'BLANCO',
    rotTela: 'NO',
    rotBamba: 'NO',
    notes: '',
    awnings: [createAwning()]
  };
}

function sanitizeAwning(old: Record<string, unknown>): Awning {
  const base = { ...createAwning(), ...old } as Awning & Record<string, unknown>;
  if (old.machineSide === 'DERECHA') base.machineSide = 'M.F.DER';
  if (old.machineSide === 'IZQUIERDA') base.machineSide = 'M.F IZQ';
  base.reglasModificadas = typeof old.reglasModificadas === 'boolean' ? old.reglasModificadas : false;
  delete base.valance;
  delete base.calculationModelOverride;
  delete base.supportSystemOverride;
  delete base.minimumLineOverride;
  delete base.overrideReason;
  return base as Awning;
}

function migrateLegacyDraft(saved: Record<string, unknown> | null): DraftState | null {
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
    remate: (saved.remate as string) || fallback.remate,
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

function migrateFromLegacyStorage(): DraftState | null {
  if (typeof localStorage === 'undefined') return null;

  for (const key of [legacyStorageKeyV4, legacyStorageKeyV3]) {
    try {
      const saved = JSON.parse(localStorage.getItem(key) || 'null');
      const migrated = migrateLegacyDraft(saved);
      if (migrated) return migrated;
    } catch {
      continue;
    }
  }
  return null;
}

function getInitialDraft(): DraftState {
  if (typeof localStorage === 'undefined') return defaultDraft();

  try {
    const saved = JSON.parse(localStorage.getItem(storageKey) || 'null');
    if (!saved) {
      return migrateFromLegacyStorage() || defaultDraft();
    }
    return migrateLegacyDraft(saved) || defaultDraft();
  } catch {
    localStorage.removeItem(storageKey);
    return defaultDraft();
  }
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
  const [initialDraft] = useState(() => getInitialDraft());
  const [orderCode, setOrderCode] = useState(initialDraft.orderCode);
  const [customer, setCustomer] = useState(initialDraft.customer);
  const [orderDate, setOrderDate] = useState(initialDraft.orderDate);
  const [technician, setTechnician] = useState(initialDraft.technician);
  const [reviewer, setReviewer] = useState(initialDraft.reviewer);
  const [fabric, setFabric] = useState(initialDraft.fabric);
  const [remate, setRemate] = useState(initialDraft.remate);
  const [curvaBamba, setCurvaBamba] = useState(initialDraft.curvaBamba);
  const [bambaDistinta, setBambaDistinta] = useState(initialDraft.bambaDistinta);
  const [telaBamba, setTelaBamba] = useState(initialDraft.telaBamba);
  const [structureColor, setStructureColor] = useState(initialDraft.structureColor);
  const [rotTela, setRotTela] = useState(initialDraft.rotTela);
  const [rotBamba, setRotBamba] = useState(initialDraft.rotBamba);
  const [notes, setNotes] = useState(initialDraft.notes);
  const [awnings, setAwnings] = useState<Awning[]>(initialDraft.awnings);
  const [historyEntries, setHistoryEntries] = useState<HistoryEntry[]>(() => getInitialHistory());

  useEffect(() => {
    localStorage.setItem(storageKey, JSON.stringify({
      orderCode,
      customer,
      orderDate,
      technician,
      reviewer,
      fabric,
      remate,
      curvaBamba,
      bambaDistinta,
      telaBamba,
      structureColor,
      rotTela,
      rotBamba,
      notes,
      awnings
    }));
  }, [orderCode, customer, orderDate, technician, reviewer, fabric, remate, curvaBamba, bambaDistinta, telaBamba, structureColor, rotTela, rotBamba, notes, awnings]);

  useEffect(() => {
    localStorage.setItem(historyStorageKey, JSON.stringify(historyEntries.slice(0, 80)));
  }, [historyEntries]);

  function updateAwning(id: string, patch: Partial<Awning>) {
    setAwnings((current) =>
      current.map((awning) => {
        if (awning.id !== id) return awning;
        const next = { ...awning, ...patch };
        if (patch.model && patch.model !== awning.model) {
          const fresh = createAwning();
          return {
            ...fresh, id: awning.id, of: awning.of, model: patch.model, units: awning.units,
            width: awning.width, projection: awning.projection, valanceHeight: awning.valanceHeight
          };
        }
        return next;
      })
    );
  }

  function addAwning() {
    setAwnings((current) => [...current, createAwning()]);
  }

  function duplicateAwning(id: string) {
    setAwnings((current) => {
      const source = current.find((awning) => awning.id === id);
      if (!source) return current;
      return [...current, { ...source, id: uid(), of: '', notes: '' }];
    });
  }

  function removeAwning(id: string) {
    setAwnings((current) => {
      const next = current.filter((awning) => awning.id !== id);
      return next.length ? next : [createAwning()];
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
    setRemate(entry.remate || fallback.remate);
    setCurvaBamba(entry.curvaBamba || fallback.curvaBamba);
    setBambaDistinta(typeof entry.bambaDistinta === 'boolean' ? entry.bambaDistinta : fallback.bambaDistinta);
    setTelaBamba(entry.telaBamba || '');
    setStructureColor(entry.structureColor || fallback.structureColor);
    setRotTela(entry.rotTela || fallback.rotTela);
    setRotBamba(entry.rotBamba || fallback.rotBamba);
    setAwnings(entry.awnings.length
      ? entry.awnings.map((awning) => ({ ...sanitizeAwning(awning as unknown as Record<string, unknown>), id: awning.id }))
      : [createAwning()]);
    setNotes(entry.notes || '');
  }

  return {
    orderCode, setOrderCode,
    customer, setCustomer,
    orderDate, setOrderDate,
    technician, setTechnician,
    reviewer, setReviewer,
    fabric, setFabric,
    remate, setRemate,
    curvaBamba, setCurvaBamba,
    bambaDistinta, setBambaDistinta,
    telaBamba, setTelaBamba,
    structureColor, setStructureColor,
    rotTela, setRotTela,
    rotBamba, setRotBamba,
    notes, setNotes,
    awnings,
    historyEntries, setHistoryEntries,
    updateAwning,
    addAwning,
    duplicateAwning,
    removeAwning,
    reuseHistory
  };
}
