import type { Awning, ModelProfile } from './types';

export const storageKey = 'toldos-testar-draft-v4';
export const historyStorageKey = 'toldos-testar-history-v1';

export const modelProfiles: Record<string, ModelProfile> = {
  'ARZUA PRO': {
    model: 'ARZUA PRO',
    title: 'Brazos invisibles · tubo de carga',
    summary: 'Modelo principal. Campos optimizados desde hoja PRO.',
    sections: [
      {
        id: 'identity',
        title: 'Identificación',
        className: 'identity-group',
        fields: ['of', 'model', 'units']
      },
      {
        id: 'measures',
        title: 'Medidas ARZUA',
        description: 'Frente máximo 600. La salida cruza contra PRO.MIN.',
        className: 'measures-group',
        fields: ['width', 'projection']
      },
      {
        id: 'configuration',
        title: 'Configuración ARZUA',
        description: 'Opciones reales detectadas en hoja PRO.',
        className: 'config-group',
        fields: ['device', 'tubeLoad', 'placement', 'wallType', 'machineSide', 'crankHeight', 'sensor']
      }
    ],
    printFamily: 'arms'
  },
  'CAMBIO TELA': {
    model: 'CAMBIO TELA',
    title: 'Cambio de tela',
    summary: 'Sustitución de lona sobre estructura existente. Frente y salida son ya las medidas definitivas de la tela, sin descuentos.',
    sections: [
      {
        id: 'identity',
        title: 'Identificación',
        className: 'identity-group',
        fields: ['of', 'model', 'units']
      },
      {
        id: 'measures',
        title: 'Medidas de tela',
        description: 'Altura de bambalina en cm (0 si no lleva).',
        className: 'measures-group',
        fields: ['width', 'projection', 'valanceHeight']
      }
    ],
    printFamily: 'fabric-change'
  }
};

export const defaultProfile: ModelProfile = {
  model: 'GENERAL',
  title: 'Configuración general',
  summary: 'Pendiente de perfilar con reglas específicas del modelo.',
  sections: [
    {
      id: 'identity',
      title: 'Identificación',
      className: 'identity-group',
      fields: ['of', 'model', 'units']
    },
    {
      id: 'measures',
      title: 'Medidas',
      className: 'measures-group',
      fields: ['width', 'projection']
    }
  ],
  printFamily: 'arms'
};

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

export function getModelProfile(model: string) {
  return modelProfiles[model] || defaultProfile;
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
