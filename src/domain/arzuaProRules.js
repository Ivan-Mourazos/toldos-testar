import { roundQuantity, formatNumber } from './math.js';
import { resolveFabric } from './fabricCatalog.js';
import { resolveLacado, crankSuffix, machineCode } from './lacados.js';
import behaviorData from './data/modelBehavior.json' with { type: 'json' };
import { minimumLineByArm, arzuaProEstablishedProjections } from './arzuaProConstants.js';

export { arzuaProEstablishedProjections };

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
  const minimumLine = lookupMinimumLine(awning.projection, device);
  const modified = Boolean(awning.reglasModificadas);
  const belowMinimum = awning.width < minimumLine;
  const overMaximum = awning.width > 600;
  // El gate de incompletitud de calculateOrder solo cubre OF/modelo/frente/salida;
  // sin estos campos el cálculo asumiría MOTOR/EVO 80 o emitiría MANIVE...0C en silencio.
  const missingFields = [];
  if (!awning.device) missingFields.push('dispositivo');
  else if ((device === 'MAQ. INTERIOR' || device === 'MAQ. EXTERIOR') && !awning.crankHeight) missingFields.push('altura de manivela');
  if (!awning.tubeLoad) missingFields.push('tubo de carga');
  const valid = missingFields.length === 0 && !belowMinimum && (!overMaximum || modified);
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

  const despiece = valid
    ? buildDespiece({ awning, device, tubeLoad, lacado, colorSuffix, stockLength, length })
    : null;

  if (missingFields.length > 0) {
    diagnostics.push({
      level: 'error',
      awningId: awning.id,
      message: `ARZUA PRO incompleto en OF ${awning.of}: falta ${missingFields.join(' y ')}.`
    });
  } else if (belowMinimum) {
    diagnostics.push({
      level: 'error',
      awningId: awning.id,
      message: `ARZUA PRO no válido: frente ${awning.width} cm, mínimo ${minimumLine} cm para salida ${awning.projection} y ${device}.`
    });
  } else if (overMaximum && !modified) {
    diagnostics.push({
      level: 'error',
      awningId: awning.id,
      message: `ARZUA PRO no válido: frente ${awning.width} cm supera el máximo estándar de 600 cm.`
    });
  } else if (overMaximum && modified) {
    diagnostics.push({
      level: 'warn',
      awningId: awning.id,
      message: `Reglas modificadas en OF ${awning.of}: frente ${awning.width} cm supera el máximo estándar de 600 cm.`
    });
  }

  return {
    of: awning.of,
    description: buildDescription(awning, { fabricWidth, fabricDrop, fabricMl, minimumLine, valid }),
    materials,
    despiece,
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

// Referencias compartidas entre RPS (buildMaterials) y despiece (buildDespiece):
// mismo cálculo de código, una sola vez, para que ambos no puedan divergir por error.
const refSoporte = (colorSuffix) => `SOPAR350${colorSuffix}`;
const refTuboEnrolle = (stockLength) => `TURA80HG${stockLength}C`;
const refTuboCargaEvo = (colorSuffix, stockLength) => `PEVO80${colorSuffix}${stockLength}C`;
const refTuboCargaUnivers = (colorSuffix, stockLength) => `PUNI280${colorSuffix}${stockLength}C`;
const refTaponesUnivers = (colorSuffix) => `TAPOPLUN280${colorSuffix}`;
const refBrazosOnyx = (colorSuffix, projection) => `BONYX${colorSuffix}${projection}C`;
const refCasquilloMaquina = (device) => (device === 'MAQ. INTERIOR' ? 'CASMAQEJE5078MM' : 'CASMAQEJE6378MM');
const descCasquilloMaquina = (device) => (device === 'MAQ. INTERIOR' ? 'CASQUILLO MAQUINA EJE 50MM Ø78' : 'CASQUILLO EJE 63MM Ø78');
const refManivela = (lacado, crankHeight) => `MANIVE${crankSuffix(lacado)}${crankHeight}C`;

function buildMaterials({ _order, awning, lacado, colorSuffix, tubeLoad, device, stockLength, fabricMl, fabric }) {
  const materials = [
    { code: refSoporte(colorSuffix), quantity: 1, description: 'JUEGO SOPORTE AROND' },
    { code: refTuboEnrolle(stockLength), quantity: 1, description: 'TUBO DE ENROLLE P801' },
    { code: 'CASPUNCE', quantity: 1, description: 'CASQUILLO PUNTA' }
  ];

  if (tubeLoad === 'TUBO DE CARGA EVO 80') {
    materials.push(
      { code: refTuboCargaEvo(colorSuffix, stockLength), quantity: 1, description: 'TUBO DE CARGA EVO 80' },
      { code: refBrazosOnyx(colorSuffix, awning.projection), quantity: 1, description: 'JUEGO DE BRAZOS ONYX' }
    );
  } else {
    materials.push(
      { code: refTuboCargaUnivers(colorSuffix, stockLength), quantity: 1, description: 'TUBO DE CARGA UNIVERS 280' },
      { code: refTaponesUnivers(colorSuffix), quantity: 1, description: 'KIT TAPONES UNIVERS 280' },
      { code: refBrazosOnyx(colorSuffix, awning.projection), quantity: 1, description: 'JUEGO DE BRAZOS ONYX' }
    );
  }

  if (device === 'MAQ. INTERIOR' || device === 'MAQ. EXTERIOR') {
    const crankHeight = Math.max(0, Number(awning.crankHeight) || 0);
    materials.push(
      { code: refCasquilloMaquina(device), quantity: 1, description: descCasquilloMaquina(device) },
      { code: machineCode(lacado), quantity: 1, description: `MAQUINA ZNP 10 L170 ${lacado.crank}` },
      { code: refManivela(lacado, crankHeight), quantity: 1, description: `MANIVELA LUXE ${lacado.crank} ${crankHeight}` },
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

function buildDespiece({ awning, device, tubeLoad, lacado, colorSuffix, stockLength, length }) {
  const rows = [];
  let num = 1;
  const push = (name, reference, units, rowLength = null) => {
    rows.push({ num: num++, name, reference, units, length: rowLength });
  };

  push('JUEGO SOPORTE AROND', refSoporte(colorSuffix), 1);
  push('TUBO DE ENROLLE P801', refTuboEnrolle(stockLength), 1, length);
  push('CASQUILLO PUNTA', 'CASPUNCE', 1);

  if (device === 'MAQ. INTERIOR' || device === 'MAQ. EXTERIOR') {
    push(descCasquilloMaquina(device), refCasquilloMaquina(device), 1);
  }

  if (tubeLoad === 'TUBO DE CARGA EVO 80') {
    push('TUBO DE CARGA EVO 80', refTuboCargaEvo(colorSuffix, stockLength), 1, length);
  } else {
    push('TUBO DE CARGA UNIVERS 280', refTuboCargaUnivers(colorSuffix, stockLength), 1, length);
    push('KIT TAPONES UNIVERS 280', refTaponesUnivers(colorSuffix), 1);
  }

  push('JUEGO DE BRAZOS ONYX', refBrazosOnyx(colorSuffix, awning.projection), 1, awning.projection);
  push('JUEGO DE TERMINALES', null, 1);

  if (device === 'MAQ. INTERIOR' || device === 'MAQ. EXTERIOR') {
    const crankHeight = Math.max(0, Number(awning.crankHeight) || 0);
    push(`MAQUINA ZNP 10 L170 ${lacado.crank}`, machineCode(lacado), 1);
    push(`MANIVELA LUXE ${lacado.crank} ${crankHeight}`, refManivela(lacado, crankHeight), 1, crankHeight);
    push('TACO NAYLON MAQUINA', 'CASPLAS', 1);
    push('KIT DE TORNILLOS MAQUINA', null, 1);
  }

  if (device === 'MOTOR') {
    push('RUEDA MOTRIZ Ø 78', 'RUEDAMOT78', 1);
    push('MOTOR SOMFY SUNILUS 55/17 IO', 'SUNILUSIO55//17', 1);
    push('CORONA LT 60 ADAPTADA Ø 78', 'CORONALT6078', 1);
    push('SOPORTE UNIVERSAL HIPRO', 'SOPORTEUNVHIPRO', 1);
    push('MANDO SITUO 1 IO PURE', 'SITUOIO1PURE', 1);
  }

  const wallEntry = behaviorData.options.tiposPared.find((item) => item.pared === awning.wallType);
  const anchoring = wallEntry
    ? { name: wallEntry.tornilleria, reference: wallEntry.referencia || null, units: wallEntry.unidades }
    : null;

  return { rows, anchoring };
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

