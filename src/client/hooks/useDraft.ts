import { useEffect, useState } from 'react';
import type { Awning, DraftState, HistoryEntry, ModelParameters } from '../types';
import { createAwning, storageKey, historyStorageKey, parametersStorageKey, uid } from '../constants';

function defaultDraft(): DraftState {
  return {
    orderCode: '',
    customer: '',
    technician: '',
    fabric: '',
    structureColor: 'BLANCO',
    notes: '',
    awnings: [createAwning()]
  };
}

function getInitialDraft(): DraftState {
  if (typeof localStorage === 'undefined') return defaultDraft();

  try {
    const saved = JSON.parse(localStorage.getItem(storageKey) || 'null');
    if (!saved) return defaultDraft();

    return {
      orderCode: saved.orderCode || '',
      customer: saved.customer || '',
      technician: saved.technician || '',
      fabric: saved.fabric || '',
      structureColor: saved.structureColor || 'BLANCO',
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

function getInitialParameters(): Record<string, ModelParameters> {
  if (typeof localStorage === 'undefined') return {};

  try {
    const saved = JSON.parse(localStorage.getItem(parametersStorageKey) || '{}');
    return saved && typeof saved === 'object' ? saved : {};
  } catch {
    localStorage.removeItem(parametersStorageKey);
    return {};
  }
}

export function useDraft() {
  const [initialDraft] = useState(() => getInitialDraft());
  const [orderCode, setOrderCode] = useState(initialDraft.orderCode);
  const [customer, setCustomer] = useState(initialDraft.customer);
  const [technician, setTechnician] = useState(initialDraft.technician);
  const [fabric, setFabric] = useState(initialDraft.fabric);
  const [structureColor, setStructureColor] = useState(initialDraft.structureColor);
  const [notes, setNotes] = useState(initialDraft.notes);
  const [awnings, setAwnings] = useState<Awning[]>(initialDraft.awnings);
  const [historyEntries, setHistoryEntries] = useState<HistoryEntry[]>(() => getInitialHistory());
  const [parametersByModel, setParametersByModel] = useState<Record<string, ModelParameters>>(() => getInitialParameters());

  useEffect(() => {
    localStorage.setItem(storageKey, JSON.stringify({
      orderCode,
      customer,
      technician,
      fabric,
      structureColor,
      notes,
      awnings
    }));
  }, [orderCode, customer, technician, fabric, structureColor, notes, awnings]);

  useEffect(() => {
    localStorage.setItem(historyStorageKey, JSON.stringify(historyEntries.slice(0, 80)));
  }, [historyEntries]);

  useEffect(() => {
    localStorage.setItem(parametersStorageKey, JSON.stringify(parametersByModel));
  }, [parametersByModel]);

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
    technician, setTechnician,
    fabric, setFabric,
    structureColor, setStructureColor,
    notes, setNotes,
    awnings,
    historyEntries, setHistoryEntries,
    parametersByModel, setParametersByModel,
    updateAwning,
    addAwning,
    duplicateAwning,
    removeAwning,
    reuseHistory
  };
}
