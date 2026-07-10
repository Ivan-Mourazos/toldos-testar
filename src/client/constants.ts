import type { Awning } from './types';

export const storageKey = 'toldos-testar-draft-v4';
export const historyStorageKey = 'toldos-testar-history-v1';

export function uid() {
  return crypto.randomUUID();
}

export function createAwning(): Awning {
  return {
    id: uid(),
    of: '',
    model: 'ARZUA PRO',
    units: 1,
    width: 400,
    projection: 250,
    valanceHeight: 20,
    armCount: 2,
    device: 'MOTOR',
    placement: 'FRONTAL',
    wallType: 'DIRECTA A PARED',
    tubeLoad: 'TUBO DE CARGA EVO 80',
    submodel: '',
    sensor: 'SIN SENSOR',
    machineSide: 'M.F.DER',
    crankHeight: 170,
    calculationModelOverride: 'SEGÚN MODELO',
    supportSystemOverride: 'SEGÚN MODELO',
    minimumLineOverride: '',
    overrideReason: '',
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
