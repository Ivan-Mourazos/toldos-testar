export const models = [
  { code: 'ARZUA PRO', family: 'BRAZOS INVISIBLES', subtype: 'TUBO DE CARGA', ruleSheet: 'PRO', supportsMultipleArms: false },
  { code: 'CAMBIO CORTINA', family: '', subtype: '', ruleSheet: 'CAM.CORT.', supportsMultipleArms: false },
  { code: 'CAMBIO TELA', family: '', subtype: '', ruleSheet: 'CAM. TELA', supportsMultipleArms: false },
  { code: 'CORTINA', family: 'BRAZOS INVISIBLES', subtype: '', ruleSheet: 'CORT', supportsMultipleArms: false },
  { code: 'ENROLLABLE', family: '', subtype: '', ruleSheet: 'ENROL.', supportsMultipleArms: false },
  { code: 'GALICIA', family: 'BRAZOS INVISIBLES', subtype: 'TUBO DE CARGA', ruleSheet: 'GAL', supportsMultipleArms: true },
  { code: 'AMBAR BOX', family: 'COFRE', subtype: '', ruleSheet: 'MICRO (legado MICROBOX)', supportsMultipleArms: false },
  { code: 'AGATA BOX', family: 'COFRE', subtype: 'SUBMODELO', ruleSheet: 'MODUL (legado MODULBOX)', supportsMultipleArms: true },
  { code: 'MAXISCREEM', family: 'COFRE', subtype: 'SUBMODELO', ruleSheet: 'MAXISCREEM', supportsMultipleArms: false },
  { code: 'MONOBLOCK 350', family: 'COFRE', subtype: '', ruleSheet: 'MON.350', supportsMultipleArms: true },
  { code: 'PUNTO RECTO', family: 'COFRE', subtype: '', ruleSheet: 'PUNTO RECTO', supportsMultipleArms: true },
  { code: 'CUARZO BOX', family: 'COFRE', subtype: '', ruleSheet: 'ST250 (legado STORBOX 250)', supportsMultipleArms: false },
  { code: 'PERLA BOX', family: 'COFRE', subtype: '', ruleSheet: 'S300 (legado STORBOX S-300)', supportsMultipleArms: false },
  { code: 'CORAL BOX', family: 'COFRE', subtype: '', ruleSheet: 'ST400 (legado STORBOX 400)', supportsMultipleArms: false },
  { code: 'XACOBEO', family: 'BRAZOS INVISIBLES', subtype: '', ruleSheet: 'XAC', supportsMultipleArms: false },
  { code: 'BAMBALINA', family: '', subtype: '', ruleSheet: 'BAMBALINA', supportsMultipleArms: false },
  { code: 'CAMBIO ANTICA', family: '', subtype: '', ruleSheet: 'CAM. ANTICA', supportsMultipleArms: false }
];

export const fabricStats = {
  total: 326,
  widths: [120, 153, 200, 240, 250, 267, 300, 140],
  materials: ['ACR', 'ACR RES', 'PVC 650', 'PVC 580', 'PVC 650 IGN', 'SOLTIS 86', 'SOLTIS 92', 'SOLTIS 96', 'SOLTIS 99']
};

export const referenceStats = {
  total: 1215,
  groups: ['BRAZOS', 'PERFIL', 'SOPORTE', 'TAPA', 'MAXISCREEM', 'MANIVELA', 'MOTOR', 'CASQUILLO', 'MAQUINA', 'ANCLAJE']
};

export function getCatalog() {
  return {
    source: {
      workbook: 'Y:\\PROGRAMAS CALCULO\\TOLDOS TESTAR 10-4.xlsm',
      lastReviewed: '2026-07-08'
    },
    models,
    fabricStats,
    referenceStats
  };
}
