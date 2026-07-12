import type { Awning } from './types';

export const storageKey = 'toldos-testar-draft-v5';
export const historyStorageKey = 'toldos-testar-history-v1';

export function uid() {
  return crypto.randomUUID();
}

export function createAwning(): Awning {
  return {
    id: uid(),
    of: '',
    model: '',
    units: null,
    width: null,
    projection: null,
    valanceHeight: null,
    armCount: null,
    device: '',
    placement: '',
    wallType: '',
    tubeLoad: '',
    submodel: '',
    sensor: '',
    machineSide: '',
    crankHeight: null,
    reglasModificadas: false,
    notes: ''
  };
}

export function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

export function formatDecimal(value: number | undefined) {
  return new Intl.NumberFormat('es-ES', { maximumFractionDigits: 2 }).format(value || 0);
}

export function fileNameFromDisposition(value: string | null) {
  const match = /filename="([^"]+)"/.exec(value || '');
  return match?.[1] || '';
}
