import { roundQuantity, formatNumber } from './math.js';
import { resolveFabric } from './fabricCatalog.js';
import { resolveLacado, crankSuffix, machineCode } from './lacados.js';

const minimumLineByArm = [
  { arm: 150, values: { 'MAQ. EXTERIOR': 200, 'MAQ. INTERIOR': 195, MOTOR: 195 } },
  { arm: 175, values: { 'MAQ. EXTERIOR': 225, 'MAQ. INTERIOR': 220, MOTOR: 220 } },
  { arm: 200, values: { 'MAQ. EXTERIOR': 250, 'MAQ. INTERIOR': 245, MOTOR: 245 } },
  { arm: 225, values: { 'MAQ. EXTERIOR': 275, 'MAQ. INTERIOR': 270, MOTOR: 270 } },
  { arm: 250, values: { 'MAQ. EXTERIOR': 300, 'MAQ. INTERIOR': 295, MOTOR: 295 } },
  { arm: 275, values: { 'MAQ. EXTERIOR': 325, 'MAQ. INTERIOR': 320, MOTOR: 320 } },
  { arm: 300, values: { 'MAQ. EXTERIOR': 345, 'MAQ. INTERIOR': 350, MOTOR: 350 } },
  { arm: 325, values: { 'MAQ. EXTERIOR': 375, 'MAQ. INTERIOR': 375, MOTOR: 375 } },
  { arm: 350, values: { 'MAQ. EXTERIOR': 395, 'MAQ. INTERIOR': 400, MOTOR: 400 } }
];

const widthDiscounts = {
  'TUBO DE CARGA EVO 80': { MOTOR: 9.8, 'MAQ. INTERIOR': 10.2, 'MAQ. EXTERIOR': 10.4 },
  'TUBO DE CARGA UNIVERS 280': { MOTOR: 9.8, 'MAQ. INTERIOR': 11.2, 'MAQ. EXTERIOR': 11.4 }
};

const fabricWidthDiscounts = {
  'TUBO DE CARGA EVO 80': { MOTOR: 11, 'MAQ. INTERIOR': 13, 'MAQ. EXTERIOR': 13 },
  'TUBO DE CARGA UNIVERS 280': { MOTOR: 11, 'MAQ. INTERIOR': 13, 'MAQ. EXTERIOR': 13 }
};

export function calculateArzuaPro({ order, awning }) {
  const lacado = resolveLacado(order.structureColor);
  const colorSuffix = lacado.suffix;
  const tubeLoad = normalizeTubeLoad(awning.tubeLoad);
  const device = normalizeDevice(awning.device);
  const diagnostics = [];
  const minimumLine = awning.minimumLineOverride ?? lookupMinimumLine(awning.projection, device);
  const valid = awning.width <= 600 && awning.width >= minimumLine;
  const fabricWidth = round1(awning.width - lookupFabricWidthDiscount(tubeLoad, device));
  const valance = Math.max(0, Number(awning.valanceHeight) || 0);
  const fabricDrop = round1(awning.projection + valance + 45);
  const fabricMl = roundQuantity(Math.ceil(fabricWidth / 120) * (fabricDrop / 100) * awning.units);
  const length = round1(awning.width - lookupWidthDiscount(tubeLoad, device));
  const stockLength = chooseStockLength(length);
  const fabric = order.fabric ? resolveFabric(order.fabric) : null;
  if (order.fabric && !fabric) {
    diagnostics.push({
      level: 'error',
      awningId: awning.id,
      message: `Tela no encontrada en el catálogo: "${order.fabric}".`
    });
  }

  const materials = valid
    ? buildMaterials({ order, awning, lacado, colorSuffix, tubeLoad, device, stockLength, fabricMl, fabric })
    : [];

  if (!valid) {
    diagnostics.push({
      level: 'error',
      awningId: awning.id,
      message: `ARZUA PRO no válido: frente ${awning.width} cm, mínimo ${minimumLine} cm para salida ${awning.projection} y ${device}.`
    });
  }

  return {
    of: awning.of,
    description: buildDescription(awning, { fabricWidth, fabricDrop, fabricMl, minimumLine, valid }),
    materials,
    diagnostics,
    calculation: {
      model: 'ARZUA PRO',
      valid,
      minimumLine,
      width: awning.width,
      projection: awning.projection,
      fabricWidth,
      fabricDrop,
      fabricMl,
      structureLength: length,
      stockLength
    }
  };
}

function buildMaterials({ _order, awning, lacado, colorSuffix, tubeLoad, device, stockLength, fabricMl, fabric }) {
  const materials = [
    { code: `SOPAR350${colorSuffix}`, quantity: 1, description: 'JUEGO SOPORTE AROND' },
    { code: `TURA80HG${stockLength}C`, quantity: 1, description: 'TUBO DE ENROLLE P801' },
    { code: 'CASPUNCE', quantity: 1, description: 'CASQUILLO PUNTA' }
  ];

  if (tubeLoad === 'TUBO DE CARGA EVO 80') {
    materials.push(
      { code: `PEVO80${colorSuffix}${stockLength}C`, quantity: 1, description: 'TUBO DE CARGA EVO 80' },
      { code: `BONYX${colorSuffix}${awning.projection}C`, quantity: 1, description: 'JUEGO DE BRAZOS ONYX' }
    );
  } else {
    materials.push(
      { code: `PUNI280${colorSuffix}${stockLength}C`, quantity: 1, description: 'TUBO DE CARGA UNIVERS 280' },
      { code: `TAPOPLUN280${colorSuffix}`, quantity: 1, description: 'KIT TAPONES UNIVERS 280' },
      { code: `BONYX${colorSuffix}${awning.projection}C`, quantity: 1, description: 'JUEGO DE BRAZOS ONYX' }
    );
  }

  if (device === 'MAQ. INTERIOR' || device === 'MAQ. EXTERIOR') {
    const casquillo = device === 'MAQ. INTERIOR' ? 'CASMAQEJE5078MM' : 'CASMAQEJE6378MM';
    const casquilloDesc = device === 'MAQ. INTERIOR' ? 'CASQUILLO MAQUINA EJE 50MM Ø78' : 'CASQUILLO EJE 63MM Ø78';
    const crankHeight = Math.max(0, Number(awning.crankHeight) || 0);
    materials.push(
      { code: casquillo, quantity: 1, description: casquilloDesc },
      { code: machineCode(lacado), quantity: 1, description: `MAQUINA ZNP 10 L170 ${lacado.crank}` },
      { code: `MANIVE${crankSuffix(lacado)}${crankHeight}C`, quantity: 1, description: `MANIVELA LUXE ${lacado.crank} ${crankHeight}` },
      { code: 'CASPLAS', quantity: 1, description: 'CASQUILLO PLASTICO' }
    );
  }

  if (device === 'MOTOR') {
    materials.push(
      { code: 'RUEDAMOT78', quantity: 1, description: 'RUEDA MOTRIZ Ø 78' },
      { code: 'SUNILUSIO55//17', quantity: 1, description: 'MOTOR SOMFY SUNILUS 55/17 IO' },
      { code: 'CORONALT6078', quantity: 1, description: 'CORONA LT 60 ADAPTADA Ø 78' },
      { code: 'SOPORTEUNVHIPRO', quantity: 1, description: 'SOPORTE UNIVERSAL HIPRO' },
      { code: 'SITUOIO1PURE', quantity: 1, description: 'MANDO SITUO 1 IO PURE' }
    );
  }

  if (fabric) {
    materials.push({ code: fabric.code, quantity: fabricMl, description: fabric.description });
  }

  return materials;
}

function buildDescription(awning, calc) {
  const valance = Math.max(0, Number(awning.valanceHeight) || 0);
  const bambaText = valance > 0
    ? ` · bambalina incluida de ${valance + 5} cm, hecha de ${valance} cm`
    : '';
  return `Toldo ARZUA PRO ${awning.width}x${awning.projection} · tela ${formatNumber(calc.fabricWidth)}x${formatNumber(calc.fabricDrop)} · paño ${formatNumber(calc.fabricMl)} ml${bambaText}`;
}

function lookupMinimumLine(arm, device) {
  const exact = minimumLineByArm.find((item) => item.arm === arm);
  if (exact) return exact.values[device];

  const next = minimumLineByArm.find((item) => item.arm >= arm);
  return (next || minimumLineByArm[minimumLineByArm.length - 1]).values[device];
}

function lookupWidthDiscount(tubeLoad, device) {
  return widthDiscounts[tubeLoad]?.[device] ?? 9.8;
}

function lookupFabricWidthDiscount(tubeLoad, device) {
  return fabricWidthDiscounts[tubeLoad]?.[device] ?? 11;
}

function chooseStockLength(length) {
  const stockLengths = [600, 650, 700];
  return stockLengths.find((item) => item >= length) || Math.ceil(length / 50) * 50;
}

function normalizeTubeLoad(value) {
  const cleanValue = String(value || '').trim().toUpperCase();
  return cleanValue.includes('UNIVERS') ? 'TUBO DE CARGA UNIVERS 280' : 'TUBO DE CARGA EVO 80';
}

function normalizeDevice(value) {
  const cleanValue = String(value || '').trim().toUpperCase();
  if (cleanValue.includes('INTERIOR')) return 'MAQ. INTERIOR';
  if (cleanValue.includes('EXTERIOR')) return 'MAQ. EXTERIOR';
  return 'MOTOR';
}

function round1(value) {
  return Math.round(value * 10) / 10;
}

