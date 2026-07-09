export type Model = {
  code: string;
  family: string;
  subtype: string;
  ruleSheet: string;
  supportsMultipleArms: boolean;
};

export type Catalog = {
  source: { workbook: string; lastReviewed: string };
  models: Model[];
  fabricStats: { total: number; widths: number[]; materials: string[] };
  referenceStats: { total: number; groups: string[] };
};

export type Awning = {
  id: string;
  of: string;
  model: string;
  units: number;
  width: number;
  projection: number;
  valanceHeight: number;
  armCount: number;
  device: string;
  placement: string;
  wallType: string;
  valance: string;
  tubeLoad: string;
  sensor: string;
  machineSide: string;
  crankHeight: number;
  calculationModelOverride: string;
  supportSystemOverride: string;
  minimumLineOverride: string;
  overrideReason: string;
  notes: string;
};

export type Calculation = {
  orderCode: string;
  ofs: {
    of: string;
    description: string;
    materials: { code: string; description?: string; quantity: number }[];
    calculation?: {
      model: string;
      valid: boolean;
      minimumLine: number;
      fabricWidth: number;
      fabricDrop: number;
      fabricMl: number;
      structureLength: number;
      stockLength: number;
    };
  }[];
  diagnostics: { level: 'error' | 'pending' | 'warn'; awningId?: string; message: string }[];
  totals: { awnings: number; materials: number };
};

export type CalculationState = 'idle' | 'validating' | 'ready' | 'error';

export type DraftState = {
  orderCode: string;
  customer: string;
  technician: string;
  fabric: string;
  structureColor: string;
  notes: string;
  awnings: Awning[];
};

export type HistoryEntry = {
  id: string;
  createdAt: string;
  orderCode: string;
  customer: string;
  ofs: string[];
  models: string[];
  awnings: Awning[];
  diagnostics: number;
  notes: string;
};

export type ActiveTab = 'order' | 'templates' | 'parameters' | 'history';

export type FieldKey = keyof Awning;

export type ParameterOptionGroup = {
  id: string;
  label: string;
  values: string;
};

export type DimensionalRule = {
  id: string;
  label: string;
  minWidth: number;
  maxWidth: number;
  minProjection: number;
  maxProjection: number;
  fabricWidthOffset: number;
  fabricDropOffset: number;
  note: string;
};

export type PartRule = {
  id: string;
  role: string;
  reference: string;
  quantity: string;
  lengthFormula: string;
};

export type FabricRule = {
  id: string;
  label: string;
  formula: string;
  unit: string;
  note: string;
};

export type ModelParameters = {
  model: string;
  sheet: string;
  status: string;
  updatedBy: string;
  dimensionalRules: DimensionalRule[];
  optionGroups: ParameterOptionGroup[];
  partRules: PartRule[];
  fabricRules: FabricRule[];
  notes: string;
};

export type ModelProfile = {
  model: string;
  title: string;
  summary: string;
  sections: FormSection[];
  printFamily: 'arms' | 'fabric-change' | 'screen' | 'box';
};

export type FormSection = {
  id: string;
  title: string;
  description?: string;
  className?: string;
  fields: FieldKey[];
};

export type TechnicalMatrix = {
  title: string;
  subtitle: string;
  columns: string[];
  rows: Array<Array<string | number>>;
};
