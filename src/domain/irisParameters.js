/**
 * Parámetros del modelo IRIS (línea Screeny de BAT Ibérica).
 *
 * La matriz de descuentos es la hoja `Descontos` de Y:\PROGRAMAS CALCULO\IRIS.xlsx,
 * que a su vez transcribe las tablas de corte de los manuales de ensamblaje de BAT.
 * Las claves son el código de cinco dígitos del propio libro:
 *
 *   1 modelo      110 = 0, 130 = 1, 150 = 2
 *   2 cofre       sí = 0, no = 1
 *   3 guía        estándar = 0, pequeña = 1, compensadora = 2
 *   4 mecanismo   máquina = 0, motor = 1
 *   5 SWBS        no = 0, sí = 1
 *
 * Las combinaciones ausentes son las que el libro marca como `Non existe` o
 * `Sen uso`, y las que no tienen ni tabla ni pedido conservado.
 */

export const irisSubmodels = [
  'IRIS 110 CON COFRE',
  'IRIS 110 SIN COFRE',
  'IRIS 130 CON COFRE',
  'IRIS 130 SIN COFRE',
  'IRIS 150 CON COFRE'
];

export const irisGuideTypes = ['ESTÁNDAR', 'PEQUEÑA', 'COMPENSADORA'];
export const irisGuideFixings = ['PARED', 'TECHO'];
export const irisDevices = ['MAQUINA', 'MOTOR'];
export const irisGlassSizes = [200, 250, 300, 350, 400, 450, 500, 550, 600, 650, 700];

export const irisLimits = {
  110: { maxWidth: 400, maxDrop: 300, minWidth: 82.5, minDrop: 60 },
  130: { maxWidth: 500, maxDrop: 500, minWidth: 83, minDrop: 60 },
  150: { maxWidth: 800, maxDrop: 500, minWidth: 87.5, minDrop: 60 }
};

const discountTable = {
  // 110 con cofre, guía estándar
  '00000': { fabric: 9, box: 1.4, roll: 15.8, loadBar: 13.2, ballast: 26.2, guideWall: 12, guideCeiling: 12.2 },
  '00010': { fabric: 9, box: 1.4, roll: 14.8, loadBar: 13.2, ballast: 26.2, guideWall: 12, guideCeiling: 12.2 },
  // 110 con cofre, guía pequeña. A máquina no existe: molinete 9:1 vacío en la tabla.
  '00110': { fabric: 5.2, box: 1.4, roll: 14.6, loadBar: 9.4, ballast: 22.4, guideWall: 12, guideCeiling: 12.2 },
  // 110 con guía compensadora. Misma tabla lleve cofre o no: lo confirma AR2501385,
  // que en RPS es un IRIS110S/CO y cuadra pieza a pieza con SCREENY 110 GPZ C.
  '00200': {
    fabric: 9.7, box: 1.4, roll: 15.5, loadBar: 14.6, ballast: 27.6,
    guideWall: 12, guideCeiling: 12.2, zipWall: 12, zipCeiling: 12.2,
    compensatorWall: 11.2, compensatorCeiling: 11.4
  },
  '00210': {
    fabric: 8.5, box: 1.4, roll: 14.8, loadBar: 13.4, ballast: 26.4,
    guideWall: 12, guideCeiling: 12.2, zipWall: 12, zipCeiling: 12.2,
    compensatorWall: 11.2, compensatorCeiling: 11.4
  },
  '00201': {
    fabric: 10.6, box: 1.4, roll: 15.5, loadBar: 14.6, ballast: 44.6,
    guideWall: 12, guideCeiling: 12.2, zipWall: 18.1, zipCeiling: 18.3,
    compensatorWall: 11.2, compensatorCeiling: 11.4, windBlockTerminal: 14.8
  },
  '00211': {
    fabric: 9.4, box: 1.4, roll: 14.8, loadBar: 13.4, ballast: 33.4,
    guideWall: 12, guideCeiling: 12.2, zipWall: 18.1, zipCeiling: 18.3,
    compensatorWall: 11.2, compensatorCeiling: 11.4, windBlockTerminal: 13.6
  },
  // 110 sin cofre (Cabrio, módulo simple)
  '01000': { fabric: 9, roll: 15.8, loadBar: 13.2, ballast: 26.2, guideWall: 11.3, guideCeiling: 12.8 },
  '01010': { fabric: 9, roll: 14.8, loadBar: 13.2, ballast: 26.2, guideWall: 11.3, guideCeiling: 12.8 },
  // 130 con cofre, guía estándar
  '10000': { fabric: 9, box: 1.4, roll: 15.8, loadBar: 13.2, ballast: 26.2, guideWall: 13.7, guideCeiling: 13.9, zipWall: 13.7, zipCeiling: 13.9 },
  '10010': { fabric: 9, box: 1.4, roll: 14.8, loadBar: 13.2, ballast: 26.2, guideWall: 13.7, guideCeiling: 13.9, zipWall: 13.7, zipCeiling: 13.9 },
  '10001': { fabric: 9.4, box: 1.4, roll: 15.8, loadBar: 13.2, ballast: 33.2, guideWall: 13.7, guideCeiling: 13.9, zipWall: 19.8, zipCeiling: 20, windBlockTerminal: 13.4 },
  '10011': { fabric: 9.4, box: 1.4, roll: 14.8, loadBar: 13.2, ballast: 33.2, guideWall: 13.7, guideCeiling: 13.9, zipWall: 19.8, zipCeiling: 20, windBlockTerminal: 13.4 },
  // 130 con cofre, guía pequeña. A máquina no existe.
  '10110': { fabric: 5.2, box: 1.4, roll: 14.6, loadBar: 9.4, ballast: 22.4, guideWall: 13.7, guideCeiling: 13.9, zipWall: 13.7, zipCeiling: 13.9 },
  '10111': { fabric: 5.2, box: 1.4, roll: 14.6, loadBar: 8.8, ballast: 28.8, guideWall: 13.7, guideCeiling: 13.9, zipWall: 19.8, zipCeiling: 20, windBlockTerminal: 9 },
  // 130 sin cofre: sin tabla del fabricante. Descuentos horizontales del 130 con
  // cofre y guías de 15,5, que es lo que usan AR2503239 y AR2604033. Solo a
  // máquina: no hay ningún pedido conservado a motor.
  '11000': { fabric: 9, roll: 15.8, loadBar: 13.2, ballast: 26.2, guideWall: 15.5, guideCeiling: 15.5, unverified: true },
  // 150 con cofre: siempre a motor
  '20010': { fabric: 9, box: 0.6, roll: 16.8, loadBar: 13.2, ballast: 27.8, guideWall: 15.5, guideCeiling: 15.5 }
};

export const defaultIrisParameters = {
  // Margen que se suma a la altura del hueco para obtener la caída de la lona.
  // La fila `Caída` de la hoja Descontos está vacía y BAT no lo define: es una
  // decisión de taller. Estos valores salen de los 55 toldos reales de 2025-2026
  // y están PENDIENTES DE RATIFICAR por Oficina Técnica.
  fabricDropAllowanceCm: {
    110: { MAQUINA: 40, MOTOR: 30 },
    130: { MAQUINA: 40, MOTOR: 40 },
    150: { MAQUINA: 49.8, MOTOR: 49.8 }
  },
  // Descuento extra por pieza horizontal cuando el toldo va entre paredes.
  // Acuerdo de la reunión del 09/10/2025 en Raído.
  betweenWallsDiscountCm: 0.6,
  // Absorción de los perfiles compensadores: BAT fija 2,5 cm por guía como
  // máximo del perfil; Oficina Técnica tolera hasta 3.
  compensatorWarnCm: 2.5,
  compensatorMaxCm: 3,
  // Diferencia entre frentes que obliga a avisar a comercial si no hay compensadora.
  frontDifferenceWarnCm: 0.5,
  // Metros de lona que ahorra cada paño cuando el toldo lleva ventana de cristal.
  glassFabricSavingM: 1.4
};

export function irisSeriesOf(submodel) {
  const match = normalizeIrisSubmodel(submodel).match(/\b(110|130|150)\b/);
  return match ? match[1] : '';
}

export function irisHasBox(submodel) {
  return normalizeIrisSubmodel(submodel).includes('CON COFRE');
}

export function normalizeIrisSubmodel(value) {
  const clean = normalizeText(value);
  return irisSubmodels.includes(clean) ? clean : '';
}

export function normalizeIrisGuideType(value) {
  const clean = normalizeText(value);
  if (!clean) return '';
  if (clean.includes('COMPENSA')) return 'COMPENSADORA';
  if (clean.includes('PEQUEN')) return 'PEQUEÑA';
  if (clean.includes('ESTANDAR') || clean.includes('ESTÁNDAR') || clean === 'NORMAL') return 'ESTÁNDAR';
  return '';
}

export function normalizeIrisGuideFixing(value) {
  const clean = normalizeText(value);
  if (clean.includes('TECHO')) return 'TECHO';
  if (clean.includes('PARED') || clean.includes('NICHO')) return 'PARED';
  return '';
}

export function normalizeIrisDevice(value) {
  const clean = normalizeText(value);
  if (clean === 'MOTOR') return 'MOTOR';
  if (clean.startsWith('MAQ')) return 'MAQUINA';
  return '';
}

export function irisConfigCode({ submodel, guideType, device, windBlock } = {}) {
  const series = irisSeriesOf(submodel);
  const guide = normalizeIrisGuideType(guideType);
  const cleanDevice = normalizeIrisDevice(device);
  if (!series || !guide || !cleanDevice) return '';

  const seriesDigit = { 110: '0', 130: '1', 150: '2' }[series];
  const boxDigit = irisHasBox(submodel) ? '0' : '1';
  const guideDigit = { 'ESTÁNDAR': '0', 'PEQUEÑA': '1', 'COMPENSADORA': '2' }[guide];
  const deviceDigit = cleanDevice === 'MOTOR' ? '1' : '0';
  const windDigit = windBlock ? '1' : '0';
  return `${seriesDigit}${boxDigit}${guideDigit}${deviceDigit}${windDigit}`;
}

export function normalizeIrisParameters(value = {}) {
  const defaults = defaultIrisParameters;
  return {
    fabricDropAllowanceCm: Object.fromEntries(['110', '130', '150'].map((series) => [
      series,
      {
        MAQUINA: nonNegative(value.fabricDropAllowanceCm?.[series]?.MAQUINA, defaults.fabricDropAllowanceCm[series].MAQUINA),
        MOTOR: nonNegative(value.fabricDropAllowanceCm?.[series]?.MOTOR, defaults.fabricDropAllowanceCm[series].MOTOR)
      }
    ])),
    betweenWallsDiscountCm: nonNegative(value.betweenWallsDiscountCm, defaults.betweenWallsDiscountCm),
    compensatorWarnCm: nonNegative(value.compensatorWarnCm, defaults.compensatorWarnCm),
    compensatorMaxCm: nonNegative(value.compensatorMaxCm, defaults.compensatorMaxCm),
    frontDifferenceWarnCm: nonNegative(value.frontDifferenceWarnCm, defaults.frontDifferenceWarnCm),
    glassFabricSavingM: nonNegative(value.glassFabricSavingM, defaults.glassFabricSavingM)
  };
}

export function getIrisDiscounts(_parameters, config) {
  const code = irisConfigCode(config);
  return code && discountTable[code] ? { ...discountTable[code] } : null;
}

export function getIrisLimits(series) {
  return irisLimits[series] ? { ...irisLimits[series] } : null;
}

export function getIrisFabricDropAllowance(parameters, series, device) {
  const normalized = normalizeIrisParameters(parameters);
  const cleanDevice = normalizeIrisDevice(device) || 'MAQUINA';
  return normalized.fabricDropAllowanceCm[series]?.[cleanDevice] ?? 0;
}

export function resolveIrisGlassSize(fabricWidth) {
  const width = Number(fabricWidth);
  if (!Number.isFinite(width) || width <= 0) return 0;
  return irisGlassSizes.find((size) => size > width) || 0;
}

// Quita los diacríticos para que "MÁQUINA", "maquina" y "Máquina" normalicen igual:
// los técnicos escriben el pedido a mano y los libros de la oficina usan tilde.
function normalizeText(value) {
  return String(value || '')
    .trim()
    .toUpperCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ');
}

function nonNegative(value, fallback) {
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 ? number : fallback;
}
