import type { Awning, Model, ModelParameters, ModelProfile, TechnicalMatrix } from './types';

export const storageKey = 'toldos-testar-draft-v3';
export const historyStorageKey = 'toldos-testar-history-v1';
export const parametersStorageKey = 'toldos-testar-parameters-v2';

export const arzuaTechnicalMatrices: TechnicalMatrix[] = [
  {
    title: 'Línea mínima por salida',
    subtitle: 'PRO.MIN. Validación: frente <= 600 y frente >= mínimo según salida/dispositivo.',
    columns: ['Salida brazo', 'Maq. exterior', 'Maq. interior', 'Motor'],
    rows: [
      [150, 200, 195, 195],
      [175, 225, 220, 220],
      [200, 250, 245, 245],
      [225, 275, 270, 270],
      [250, 300, 295, 295],
      [275, 325, 320, 320],
      [300, 345, 350, 350],
      [325, 375, 375, 375],
      [350, 395, 400, 400]
    ]
  },
  {
    title: 'Descuento estructura',
    subtitle: 'PRO.DES. Se resta al frente para largos de tubo/barra según tubo de carga.',
    columns: ['Dispositivo', 'EVO 80', 'UNIVERS 280'],
    rows: [
      ['Maq. interior', 10.2, 11.2],
      ['Maq. exterior', 10.4, 11.4],
      ['Motor', 9.8, 9.8]
    ]
  },
  {
    title: 'Descuento tela',
    subtitle: 'PRO.DES.TELA. Se resta al frente para calcular ancho final de paño.',
    columns: ['Dispositivo', 'EVO 80', 'UNIVERS 280'],
    rows: [
      ['Maq. interior', 13, 13],
      ['Maq. exterior', 13, 13],
      ['Motor', 11, 11]
    ]
  },
  {
    title: 'Tubo de enrolle',
    subtitle: 'A.ENROLLE. Descuento de longitud para tubo de enrolle P801.',
    columns: ['Dispositivo', 'EVO 80', 'UNIVERS 280'],
    rows: [
      ['Maq. interior', 11.2, 11.2],
      ['Maq. exterior', 11.4, 11.4],
      ['Motor', 9.8, 9.8]
    ]
  }
];

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
        fields: ['device', 'tubeLoad', 'valance', 'placement', 'wallType', 'machineSide', 'crankHeight', 'sensor']
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
    valanceHeight: 0,
    armCount: 2,
    device: 'MOTOR',
    placement: 'FRONTAL',
    wallType: 'DIRECTA A PARED',
    valance: 'BAMBA INCLUIDA',
    tubeLoad: 'TUBO DE CARGA EVO 80',
    sensor: 'SIN SENSOR',
    machineSide: 'DERECHA',
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

export function createModelParameters(model: Model): ModelParameters {
  if (model.code === 'ARZUA PRO') {
    return {
      model: model.code,
      sheet: model.ruleSheet,
      status: 'En mapeo',
      updatedBy: 'Oficina Técnica',
      dimensionalRules: [
        {
          id: uid(),
          label: 'Regla general ARZUA',
          minWidth: 0,
          maxWidth: 600,
          minProjection: 0,
          maxProjection: 400,
          fabricWidthOffset: -13,
          fabricDropOffset: 70,
          note: 'Base inicial desde hoja PRO. Confirmar con casos reales antes de bloquear.'
        }
      ],
      optionGroups: [
        { id: uid(), label: 'Dispositivo', values: 'MOTOR\nMAQ. INTERIOR\nMAQ. EXTERIOR' },
        { id: uid(), label: 'Tubo de carga', values: 'TUBO DE CARGA EVO 80\nTUBO DE CARGA UNIVERS 280' },
        { id: uid(), label: 'Bamba', values: 'BAMBA INCLUIDA\nSIN BAMBA\nMODO DE BAMBA' },
        { id: uid(), label: 'Colocación', values: 'FRONTAL\nTECHO\nENTRE PAREDES' },
        { id: uid(), label: 'Pared', values: 'DIRECTA A PARED\nDIRECTA A HORMIGO ARMADO\nDIRECTA A MADERA\nPARED CON SATE\nPARED TRANSVENTILADA CON AISLANTE\nCON SEPARADORES' },
        { id: uid(), label: 'Sensor', values: 'SIN SENSOR\nVIENTO\nVIENTO -SOL' }
      ],
      partRules: [
        { id: uid(), role: 'Tubo de enrolle', reference: 'TURA80HG700C', quantity: '1', lengthFormula: 'frente - descuento_tubo' },
        { id: uid(), role: 'Barra de carga', reference: 'según color/configuración', quantity: '1', lengthFormula: 'frente - descuento_barra' },
        { id: uid(), role: 'Brazo', reference: 'según salida', quantity: '2', lengthFormula: 'salida' },
        { id: uid(), role: 'Motor o máquina', reference: 'según dispositivo', quantity: '1', lengthFormula: '0' }
      ],
      fabricRules: [
        { id: uid(), label: 'Frente tela', formula: 'frente + descuento_tela', unit: 'cm', note: 'En ejemplo: 717 -> 704' },
        { id: uid(), label: 'Salida paño', formula: 'salida + 70', unit: 'cm', note: 'En ejemplo: 400 -> 470' },
        { id: uid(), label: 'Paño total', formula: 'calcular por ancho de rollo y unidades', unit: 'ml', note: 'Pendiente de clonar lógica M.TELA/TELA' }
      ],
      notes: 'ARZUA PRO sale de la hoja PRO. Pendiente importar tablas PRO.MIN, PRO.DES, PRO.DES.TELA, A.ENROLLE y PRO.PIEZAS.01 con nombres claros.'
    };
  }

  return {
    model: model.code,
    sheet: model.ruleSheet,
    status: 'Pendiente',
    updatedBy: 'Oficina Técnica',
    dimensionalRules: [],
    optionGroups: [],
    partRules: [],
    fabricRules: [],
    notes: `Pendiente de mapear desde la hoja ${model.ruleSheet || 'sin hoja'}.`
  };
}

export function formatDecimal(value: number | undefined) {
  return new Intl.NumberFormat('es-ES', { maximumFractionDigits: 2 }).format(value || 0);
}

export function fileNameFromDisposition(value: string | null) {
  const match = /filename="([^"]+)"/.exec(value || '');
  return match?.[1] || '';
}
