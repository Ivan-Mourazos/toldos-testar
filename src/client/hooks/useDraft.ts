import { useEffect, useState } from 'react';
import type { Awning, DraftState, HistoryEntry } from '../types';
import { createAwning, storageKey, historyStorageKey, todayIso, uid } from '../constants';

const legacyStorageKey = 'toldos-testar-draft-v3';

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

function migrateAwning(old: Record<string, unknown>): Awning {
  const base = { ...createAwning(), ...old } as Awning & { valance?: string };
  if (old.machineSide === 'DERECHA') base.machineSide = 'M.F.DER';
  if (old.machineSide === 'IZQUIERDA') base.machineSide = 'M.F IZQ';
  delete (base as Record<string, unknown>).valance;
  return base;
}

function migrateFromV3(): DraftState | null {
  if (typeof localStorage === 'undefined') return null;

  try {
    const saved = JSON.parse(localStorage.getItem(legacyStorageKey) || 'null');
    if (!saved) return null;

    const fallback = defaultDraft();
    return {
      ...fallback,
      orderCode: saved.orderCode || fallback.orderCode,
      customer: saved.customer || fallback.customer,
      technician: saved.technician || fallback.technician,
      fabric: saved.fabric || fallback.fabric,
      structureColor: saved.structureColor || fallback.structureColor,
      notes: saved.notes || fallback.notes,
      awnings: saved.awnings?.length
        ? saved.awnings.map((awning: Record<string, unknown>) => ({ ...migrateAwning(awning), id: (awning.id as string) || uid() }))
        : fallback.awnings
    };
  } catch {
    return null;
  }
}

function getInitialDraft(): DraftState {
  if (typeof localStorage === 'undefined') return defaultDraft();

  try {
    const saved = JSON.parse(localStorage.getItem(storageKey) || 'null');
    if (!saved) {
      const migrated = migrateFromV3();
      return migrated || defaultDraft();
    }

    const fallback = defaultDraft();
    return {
      orderCode: saved.orderCode || '',
      customer: saved.customer || '',
      orderDate: saved.orderDate || fallback.orderDate,
      technician: saved.technician || '',
      reviewer: saved.reviewer || '',
      fabric: saved.fabric || '',
      remate: saved.remate || fallback.remate,
      curvaBamba: saved.curvaBamba || fallback.curvaBamba,
      bambaDistinta: typeof saved.bambaDistinta === 'boolean' ? saved.bambaDistinta : fallback.bambaDistinta,
      telaBamba: saved.telaBamba || '',
      structureColor: saved.structureColor || 'BLANCO',
      rotTela: saved.rotTela || fallback.rotTela,
      rotBamba: saved.rotBamba || fallback.rotBamba,
      notes: saved.notes || '',
      awnings: saved.awnings?.length
        ? saved.awnings.map((awning: Partial<Awning>) => ({ ...createAwning(), ...awning, id: awning.id || uid() }))
        : [createAwning()]
    };
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
          return { ...fresh, id: awning.id, of: awning.of, model: patch.model, units: awning.units };
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
    setOrderCode(entry.orderCode);
    setCustomer(entry.customer);
    setAwnings(entry.awnings.length ? entry.awnings : [createAwning()]);
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
