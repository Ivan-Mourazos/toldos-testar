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
  workType: 'FULL_AWNING' | 'FABRIC_ONLY';
  of: string;
  model: string;
  units: number | null;
  width: number | null;
  projection: number | null;
  hasValance: boolean | null;
  valanceHeight: number | null;
  valanceCurve: string;
  valanceFabric: string;
  remate: string;
  remateColor: string;
  structureColor: string;
  rotFabric: string;
  rotValance: string;
  armCount: number | null;
  device: string;
  placement: string;
  wallType: string;
  tubeLoad: string;
  destination: string;
  supportSystem: string;
  motorPower: string;
  submodel: string;
  sensor: string;
  machineSide: string;
  crankHeight: number | null;
  curtainHasWindow: boolean | null;
  curtainFinish: '' | 'NORMAL' | 'VELCRO' | 'TUBO';
  curtainWindowExit: number | null;
  curtainWindowCorner: number | null;
  curtainWindowFloorHeight: number | null;
  curtainWindowHeight: number | null;
  curtainFabricDeductionCm: number | null;
  curtainFabricWidthDiscountCm: number | null;
  curtainRollTubeDiscountCm: number | null;
  curtainLoadProfileDiscountCm: number | null;
  boxMinimumLineCm: number | null;
  boxProfileDiscountCm: number | null;
  boxRollDiscountCm: number | null;
  boxFabricWidthDiscountCm: number | null;
  boxProtectorDiscountCm: number | null;
  xacMinimumLineCm: number | null;
  xacFabricWidthDiscountCm: number | null;
  xacRollDiscountCm: number | null;
  xacLoadBarDiscountCm: number | null;
  pointFabricWidthDiscountCm: number | null;
  pointRollDiscountCm: number | null;
  pointLoadBarDiscountCm: number | null;
  pointFabricDropMultiplier: number | null;
  pointFabricDropAllowanceCm: number | null;
  monoblockMinimumLineCm: number | null;
  monoblockMaximumLineCm: number | null;
  monoblockSupportCount: number | null;
  monoblockFabricWidthDiscountCm: number | null;
  monoblockRollDiscountCm: number | null;
  monoblockLoadBarDiscountCm: number | null;
  monoblockSquareBarDiscountCm: number | null;
  monoblockFabricDropAllowanceCm: number | null;
  maxisFabricWidthDiscountCm: number | null;
  maxisRollDiscountCm: number | null;
  maxisLoadBarDiscountCm: number | null;
  maxisBoxProfileDiscountCm: number | null;
  maxisFabricDropAllowanceCm: number | null;
  ambarFabricWidthDiscountCm: number | null;
  ambarRollDiscountCm: number | null;
  ambarProfileDiscountCm: number | null;
  ambarFabricDropMultiplier: number | null;
  ambarFabricDropAllowanceCm: number | null;
  agataMinimumLineCm: number | null;
  agataSupportCount: number | null;
  agataFabricWidthDiscountCm: number | null;
  agataRollDiscountCm: number | null;
  agataFabricDropAllowanceCm: number | null;
  fabricJobWidthAdjustmentCm: number | null;
  fabricJobDropAllowanceCm: number | null;
  fabricJobValanceExtraCm: number | null;
  reglasModificadas: boolean;
  fabric: string;
  structureNotes: string;
  fabricNotes: string;
};

export type Device = 'MOTOR' | 'MAQ. INTERIOR' | 'MAQ. EXTERIOR';
type DiscountMatrix = Record<string, Record<Device, number>>;

type SharedModelParameters = {
  standardMaxWidth: number;
  privateTube: string;
  businessTube: string;
  fabricDropAllowanceCm: number;
  seamAllowanceCm: number;
  seamBaseCm: number;
  stockLengths: number[];
  widthDiscounts: DiscountMatrix;
  rollTubeDiscounts: DiscountMatrix;
  fabricWidthDiscounts: DiscountMatrix;
};

export type ArzuaProParameters = SharedModelParameters & {
  motor70WidthFrom: number;
  minimumLineByArm: { arm: number; values: Record<Device, number> }[];
};

export type GaliciaParameters = SharedModelParameters & {
  armSwitchWidth: number;
  minimumLineByProjection: {
    projection: number;
    values: Record<2 | 3, Record<Device, number>>;
  }[];
};

export type BoxDevice = 'MAQUINA' | 'MOTOR';

export type BoxParameters = {
  standardMaxWidth: number;
  fabricDropAllowanceCm: number;
  seamAllowanceCm: number;
  seamBaseCm: number;
  stockLengths: number[];
  profileDiscountCm: Record<BoxDevice, number>;
  rollDiscountCm: Record<BoxDevice, number>;
  fabricWidthDiscountCm: Record<BoxDevice, number>;
  protectorDiscountCm: Record<BoxDevice, number>;
  minimumLineByProjection: {
    projection: number;
    values: Record<BoxDevice, number>;
  }[];
  motorPowerByProjection: { projection: number; power: number }[];
};

export type CortinaDevice = 'MAQ. INTERIOR' | 'MAQ. EXTERIOR' | 'MOTOR';

export type CortinaParameters = {
  standardMaxWidth: number;
  standardMaxDrop: number;
  fabricDropAllowanceCm: number;
  seamAllowanceCm: number;
  seamBaseCm: number;
  stockLengths: number[];
  fabricWidthDiscounts: Record<CortinaDevice, number>;
  rollTubeDiscounts: Record<CortinaDevice, number>;
  loadProfileDiscounts: Record<CortinaDevice, number>;
};

export type CambioCortinaParameters = {
  fabricDropAllowanceCm: number;
  bottomDeductionCm: number;
  seamAllowanceCm: number;
  seamBaseCm: number;
};

export type XacobeoParameters = {
  standardMaxWidth: number;
  fabricDropAllowanceCm: number;
  seamAllowanceCm: number;
  seamBaseCm: number;
  stockLengths: number[];
  fabricWidthDiscounts: Record<Device, number>;
  rollTubeDiscounts: Record<Device, number>;
  loadBarDiscounts: Record<Device, number>;
  minimumLineByProjection: {
    projection: number;
    values: Record<Device, number>;
  }[];
};

export type PuntoRectoParameters = {
  standardMaxWidth: number;
  armSwitchWidth: number;
  fabricDropMultiplier: number;
  fabricDropAllowanceCm: number;
  seamAllowanceCm: number;
  seamBaseCm: number;
  stockLengths: number[];
  fabricWidthDiscounts: Record<BoxDevice, number>;
  rollTubeDiscounts: Record<BoxDevice, number>;
  loadBarDiscounts: Record<BoxDevice, number>;
  motorPowerByArm: Record<2 | 3 | 4, string>;
};

export type Monoblock350Device = 'MAQUINA' | 'MOTOR';
export type Monoblock350Parameters = {
  fabricDropAllowanceCm: number;
  valanceExtraCm: number;
  seamAllowanceCm: number;
  seamBaseCm: number;
  stockLengths: number[];
  squareBarStockLength: number;
  supportGapThresholdCm: number;
  supportEdgeOffsetCm: number;
  curronStartWidthCm: number;
  curronSecondWidthCm: number;
  discounts: Record<Monoblock350Device, {
    fabric: number;
    roll: number;
    loadBar: number;
    squareBar: number;
  }>;
  dimensionalRules: {
    projection: number;
    values: Record<2 | 3 | 4, {
      minimum: number;
      maximum: number;
      motorPower: string;
    }>;
  }[];
};

export type MaxiscreemVariantGroup = 'COFRE' | 'SIN_COFRE';
export type MaxiscreemParameters = {
  standardMaxWidth: number;
  standardMaxDrop: number;
  fabricDropAllowanceCm: number;
  valanceExtraCm: number;
  seamAllowanceCm: number;
  seamBaseCm: number;
  rollStockLengths: number[];
  profileStockLengths: number[];
  guideDiscountCm: number;
  discounts: Record<MaxiscreemVariantGroup, Record<BoxDevice, {
    fabric: number;
    roll: number;
    loadBar: number;
    boxProfile: number;
  }>>;
};

export type AmbarPlacementGroup = 'FRONTAL_TECHO' | 'ENTRE_PAREDES';

export type AmbarBoxParameters = {
  standardMaxWidth: number;
  fabricDropMultiplier: number;
  fabricDropAllowanceCm: number;
  seamAllowanceCm: number;
  seamBaseCm: number;
  profileStockLengths: number[];
  rollStockLengths: number[];
  fabricWidthDiscounts: Record<AmbarPlacementGroup, Record<BoxDevice, number>>;
  rollTubeDiscounts: Record<AmbarPlacementGroup, Record<BoxDevice, number>>;
  profileDiscounts: Record<AmbarPlacementGroup, Record<BoxDevice, number>>;
  motorPower: string;
};

export type AgataDevice = 'MAQUINA' | 'MOTOR';
export type AgataRuleVariant = 'OPEN' | 'SEMI' | 'COFRE';
export type AgataPieceDiscounts = {
  squareBar: number;
  loadBar: number;
  diffuser: number;
  lira: number;
  protector: number;
  enclosure: number;
  roll: number;
  fabric: number;
};

export type AgataBoxParameters = {
  standardMaxWidth: number;
  maxWidthByArms: Record<2 | 3 | 4, number>;
  fabricDropAllowanceCm: number;
  seamAllowanceCm: number;
  seamBaseCm: number;
  rollStockLengths: number[];
  profileStockLength: number;
  supportBaseStartWidth: number;
  supportBaseStepWidth: number;
  minimumLineByProjection: {
    projection: number;
    values: Record<AgataDevice, Record<2 | 3 | 4, number>>;
  }[];
  motorPowerByProjection: {
    projection: number;
    values: Record<2 | 3 | 4, number>;
  }[];
  discounts: Record<AgataRuleVariant, Record<AgataDevice, AgataPieceDiscounts>>;
};

export type FabricJobModel = 'CAMBIO TELA' | 'ENROLLABLE' | 'BAMBALINA' | 'CAMBIO ANTICA';
export type FabricJobParameters = {
  dropAllowanceByModel: Record<FabricJobModel, number>;
  anticaSeparateValanceAllowanceCm: number;
  valanceExtraCm: number;
  seamAllowanceCm: number;
  seamBaseCm: number;
};

export type RuleParameters = {
  arzuaPro: ArzuaProParameters;
  galicia: GaliciaParameters;
  perlaBox: BoxParameters;
  coralBox: BoxParameters;
  cuarzoBox: BoxParameters;
  cortina: CortinaParameters;
  cambioCortina: CambioCortinaParameters;
  xacobeo: XacobeoParameters;
  puntoRecto: PuntoRectoParameters;
  monoblock350: Monoblock350Parameters;
  maxiscreem: MaxiscreemParameters;
  ambarBox: AmbarBoxParameters;
  agataBox: AgataBoxParameters;
  fabricJobs: FabricJobParameters;
};

export type Calculation = {
  orderCode: string;
  ofs: {
    awningId?: string;
    awningIndex?: number;
    of: string;
    description: string;
    materials: { code: string; description?: string; quantity: number; aggregation?: 'sum' | 'max' }[];
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
      fabricPanels?: number;
      fabricCode?: string;
      fabricDescription?: string;
      fabricRollWidth?: number;
      structureLength: number;
      rollTubeLength?: number;
      stockLength: number | null;
      supportSystem?: string;
      motorPower?: string;
      armCount?: number;
      requiredArmCount?: number;
      maximumLine?: number;
      curronCount?: number;
      tubeLoad?: string;
      curtainFabricDeductionCm?: number;
      curtainFabricWidthDiscountCm?: number;
      curtainRollTubeDiscountCm?: number;
      curtainLoadProfileDiscountCm?: number;
      boxMinimumLineCm?: number;
      boxProfileDiscountCm?: number;
      boxRollDiscountCm?: number;
      boxFabricWidthDiscountCm?: number;
      boxProtectorDiscountCm?: number;
      xacMinimumLineCm?: number;
      xacFabricWidthDiscountCm?: number;
      xacRollDiscountCm?: number;
      xacLoadBarDiscountCm?: number;
      ambarFabricWidthDiscountCm?: number;
      ambarRollDiscountCm?: number;
      ambarProfileDiscountCm?: number;
      ambarFabricDropMultiplier?: number;
      ambarFabricDropAllowanceCm?: number;
      agataMinimumLineCm?: number;
      agataSupportCount?: number;
      agataFabricWidthDiscountCm?: number;
      agataRollDiscountCm?: number;
      agataFabricDropAllowanceCm?: number;
      supportCount?: number;
      profileSupportCount?: number;
      submodel?: string;
      squareBarLength?: number;
      loadBarLength?: number;
      diffuserLength?: number;
      liraLength?: number;
      protectorLength?: number;
      enclosureLength?: number;
      mainFabricMl?: number;
      mainFabricPanels?: number;
      valanceFabricCode?: string;
      valanceFabricDescription?: string;
      valanceFabricMl?: number;
      valanceFabricPanels?: number;
      valanceDrop?: number;
      fabricJobWidthAdjustmentCm?: number;
      fabricJobDropAllowanceCm?: number;
      fabricJobValanceExtraCm?: number;
      monoblockMinimumLineCm?: number;
      monoblockMaximumLineCm?: number;
      monoblockSupportCount?: number;
      monoblockFabricWidthDiscountCm?: number;
      monoblockRollDiscountCm?: number;
      monoblockLoadBarDiscountCm?: number;
      monoblockSquareBarDiscountCm?: number;
      monoblockFabricDropAllowanceCm?: number;
      guideType?: string;
      guideLength?: number;
      boxProfileLength?: number;
      rollStockLength?: number;
      profileStockLength?: number;
      maxisFabricWidthDiscountCm?: number;
      maxisRollDiscountCm?: number;
      maxisLoadBarDiscountCm?: number;
      maxisBoxProfileDiscountCm?: number;
      maxisFabricDropAllowanceCm?: number;
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
  sameFabric: boolean;
  remate: string;
  remateColor: string;
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
  sameFabric: boolean;
  remate: string;
  remateColor: string;
  structureColor: string;
  rotTela: string;
  rotBamba: string;
  ofs: string[];
  models: string[];
  awnings: Awning[];
  diagnostics: number;
  notes: string;
};

export type ActiveTab = 'order' | 'parameters' | 'history';
