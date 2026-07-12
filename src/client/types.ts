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
  units: number | null;
  width: number | null;
  projection: number | null;
  valanceHeight: number | null;
  armCount: number | null;
  device: string;
  placement: string;
  wallType: string;
  tubeLoad: string;
  submodel: string;
  sensor: string;
  machineSide: string;
  crankHeight: number | null;
  reglasModificadas: boolean;
  notes: string;
};

export type Calculation = {
  orderCode: string;
  ofs: {
    of: string;
    description: string;
    materials: { code: string; description?: string; quantity: number }[];
    despiece?: {
      rows: { num: number; name: string; reference: string | null; units: number; length: number | null }[];
      anchoring: { name: string; reference: string | null; units: number } | null;
    } | null;
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
  orderDate: string;
  technician: string;
  reviewer: string;
  fabric: string;
  remate: string;
  curvaBamba: string;
  bambaDistinta: boolean;
  telaBamba: string;
  structureColor: string;
  rotTela: string;
  rotBamba: string;
  notes: string;
  awnings: Awning[];
};

export type HistoryEntry = {
  id: string;
  createdAt: string;
  orderCode: string;
  customer: string;
  orderDate: string;
  technician: string;
  reviewer: string;
  fabric: string;
  remate: string;
  curvaBamba: string;
  bambaDistinta: boolean;
  telaBamba: string;
  structureColor: string;
  rotTela: string;
  rotBamba: string;
  ofs: string[];
  models: string[];
  awnings: Awning[];
  diagnostics: number;
  notes: string;
};

export type ActiveTab = 'order' | 'history';
