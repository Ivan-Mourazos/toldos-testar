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
