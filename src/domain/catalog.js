export const models = [
  { code: 'ARZUA PRO', family: 'BRAZOS INVISIBLES', subtype: 'TUBO DE CARGA', ruleSheet: 'PRO', supportsMultipleArms: false },
  { code: 'CAMBIO CORTINA', family: '', subtype: '', ruleSheet: 'CAM.CORT.', supportsMultipleArms: false },
  { code: 'CAMBIO TELA', family: '', subtype: '', ruleSheet: 'CAM. TELA', supportsMultipleArms: false },
  { code: 'CORTINA', family: 'BRAZOS INVISIBLES', subtype: '', ruleSheet: 'CORT', supportsMultipleArms: false },
  { code: 'ELECTRA', family: 'VERTICAL', subtype: 'SUBMODELO', ruleSheet: 'DESCONTOS TOLDOS ELECTRA SEGÚN SOPORTES', supportsMultipleArms: false },
  { code: 'IRIS', family: 'VERTICAL', subtype: 'SUBMODELO', ruleSheet: 'IRIS.xlsx (PROGRAMAS CALCULO)', supportsMultipleArms: false },
  { code: 'SELENA', family: 'VERTICAL', subtype: 'BRAZOS STOR', ruleSheet: 'CORT / SELENA', supportsMultipleArms: false },
  { code: 'ENROLLABLE', family: '', subtype: '', ruleSheet: 'ENROL.', supportsMultipleArms: false },
  { code: 'GALICIA', family: 'BRAZOS INVISIBLES', subtype: 'TUBO DE CARGA', ruleSheet: 'GAL', supportsMultipleArms: true },
  { code: 'HERA', family: 'VERTICAL', subtype: 'SUBMODELO', ruleSheet: 'PLANTEAMIENTOS GUÍA HERAS', supportsMultipleArms: false },
  { code: 'AMBAR BOX', family: 'COFRE', subtype: '', ruleSheet: 'MICRO (legado MICROBOX)', supportsMultipleArms: false },
  { code: 'AGATA BOX', family: 'COFRE', subtype: 'SUBMODELO', ruleSheet: 'MODUL (legado MODULBOX)', supportsMultipleArms: true },
  { code: 'MAXISCREEM', family: 'VERTICAL', subtype: 'SUBMODELO', ruleSheet: 'MAXISCREEM', supportsMultipleArms: false },
  { code: 'MONOBLOCK 350', family: 'BRAZOS INVISIBLES', subtype: '', ruleSheet: 'MON.350', supportsMultipleArms: true },
  { code: 'PUNTO RECTO', family: 'CLÁSICOS', subtype: '', ruleSheet: 'PUNTO RECTO', supportsMultipleArms: true },
  { code: 'ANTICA', family: 'CLÁSICOS', subtype: 'CONFIGURACIÓN', ruleSheet: 'ANTICA (libros históricos)', supportsMultipleArms: false },
  { code: 'CUARZO BOX', family: 'COFRE', subtype: '', ruleSheet: 'ST250 (legado STORBOX 250)', supportsMultipleArms: false },
  { code: 'PERLA BOX', family: 'COFRE', subtype: '', ruleSheet: 'S300 (legado STORBOX S-300)', supportsMultipleArms: false },
  { code: 'CORAL BOX', family: 'COFRE', subtype: '', ruleSheet: 'ST400 (legado STORBOX 400)', supportsMultipleArms: false },
  { code: 'XACOBEO', family: 'BRAZOS INVISIBLES', subtype: '', ruleSheet: 'XAC', supportsMultipleArms: false },
  { code: 'BAMBALINA', family: '', subtype: '', ruleSheet: 'BAMBALINA', supportsMultipleArms: false },
  { code: 'CAMBIO ANTICA', family: '', subtype: '', ruleSheet: 'CAM. ANTICA', supportsMultipleArms: false }
];

// `family` es la categoría comercial con la que la oficina agrupa su catálogo,
// y solo sirve para presentar. NO es lo mismo que el `tipo01` de
// modelBehavior.json, que sí gobierna comportamiento —qué dispositivos se
// ofrecen, si la medida vertical se llama caída o salida— y por eso no se toca
// al recolocar un modelo aquí. Que MAXISCREEM sea vertical de cara al usuario y
// siga siendo COFRE para el formulario es intencionado.
//
// Orden en que se presentan al elegir modelo. No es alfabético: es el de la
// oficina. PLANO existe en su catálogo pero todavía no tiene ningún modelo dado
// de alta, así que hoy no llega a pintarse.
const familyOrder = ['COFRE', 'VERTICAL', 'BRAZOS INVISIBLES', 'CLÁSICOS', 'PLANO'];

/**
 * Agrupa códigos de modelo por familia, respetando `familyOrder`. Los trabajos
 * de tela no tienen familia y caen en un grupo sin título, siempre al final.
 * Un modelo que no esté en el catálogo tampoco se pierde: cae en ese mismo
 * grupo en vez de desaparecer del selector.
 */
export function groupModelsByFamily(codes) {
  const wanted = (codes || []).map((code) => String(code || '').trim().toUpperCase()).filter(Boolean);
  const byCode = new Map(models.map((model) => [model.code, model.family || '']));
  const groups = new Map();

  for (const code of wanted) {
    const family = byCode.has(code) ? byCode.get(code) : '';
    if (!groups.has(family)) groups.set(family, []);
    groups.get(family).push(code);
  }

  const rank = (family) => {
    if (!family) return familyOrder.length + 1;
    const index = familyOrder.indexOf(family);
    return index === -1 ? familyOrder.length : index;
  };

  return [...groups.entries()]
    .sort(([left], [right]) => rank(left) - rank(right) || left.localeCompare(right))
    .map(([family, group]) => ({ family, models: group }));
}

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
      lastReviewed: '2026-08-07'
    },
    models,
    fabricStats,
    referenceStats
  };
}
