import { roundQuantity, formatNumber } from './math.js';
import { resolveFabric } from './fabricCatalog.js';
import { resolveLacado, crankSuffix, machineCode } from './lacados.js';
import behaviorData from './data/modelBehavior.json' with { type: 'json' };
import { arzuaProEstablishedProjections } from './arzuaProConstants.js';
import {
  normalizeArzuaProParameters,
  resolveArzuaMotorPower,
  resolveArzuaSupport,
  suggestedTubeForDestination
} from './arzuaProParameters.js';
import { resolveMotorRemote } from './motorAccessories.js';

export { arzuaProEstablishedProjections };

export function calculateArzuaPro({ order, awning }) {
  const parameters = normalizeArzuaProParameters(order.parameters?.arzuaPro);
  const lacado = resolveLacado(order.structureColor);
  const colorSuffix = lacado.suffix;
  const selectedTube = awning.tubeLoad || suggestedTubeForDestination(awning.destination, parameters);
  const tubeLoad = normalizeTubeLoad(selectedTube);
  const device = normalizeDevice(awning.device);
  const supportSystem = resolveArzuaSupport(awning, parameters);
  const motorPower = resolveArzuaMotorPower(awning, parameters);
  const armCount = supportSystem === 'GALICIA' ? 3 : 1;
  const diagnostics = [];
  const minimumLine = lookupMinimumLine(parameters.minimumLineByArm, awning.projection, device);
  const modified = Boolean(awning.reglasModificadas);
  const belowMinimum = awning.width < minimumLine;
  const overMaximum = supportSystem === 'ARZUA' && awning.width > parameters.standardMaxWidth;
  // El gate de incompletitud de calculateOrder solo cubre OF/modelo/frente/salida;
  // sin estos campos el cálculo asumiría MOTOR/EVO 80 o emitiría MANIVE...0C en silencio.
  const missingFields = [];
  if (!awning.device) missingFields.push('dispositivo');
  else if ((device === 'MAQ. INTERIOR' || device === 'MAQ. EXTERIOR') && !awning.crankHeight) missingFields.push('altura de manivela');
  if (!selectedTube) missingFields.push('destino o tubo de carga');
  const valid = missingFields.length === 0 && !belowMinimum && (!overMaximum || modified);
  const fabricWidth = round1(awning.width - lookupDiscount(parameters.fabricWidthDiscounts, tubeLoad, device, 11));
  const valance = Math.max(0, Number(awning.valanceHeight) || 0);
  const fabricDrop = round1(awning.projection + valance + 45);
  const fabricMl = roundQuantity(Math.ceil(fabricWidth / 120) * (fabricDrop / 100) * awning.units);
  const length = round1(awning.width - lookupDiscount(parameters.widthDiscounts, tubeLoad, device, 9.8));
  const rollTubeLength = round1(awning.width - lookupDiscount(parameters.rollTubeDiscounts, tubeLoad, device, 9.8));
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
    ? buildMaterials({ awning, lacado, colorSuffix, tubeLoad, device, supportSystem, motorPower, armCount, stockLength, fabricMl, fabric })
    : [];

  const despiece = valid
    ? buildDespiece({ awning, device, tubeLoad, lacado, colorSuffix, supportSystem, motorPower, armCount, stockLength, length, rollTubeLength })
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
      message: `ARZUA PRO no válido: frente ${awning.width} cm supera el máximo estándar de ${parameters.standardMaxWidth} cm con soporte ARZUA.`
    });
  } else if (overMaximum && modified) {
    diagnostics.push({
      level: 'warn',
      awningId: awning.id,
      message: `Reglas modificadas en OF ${awning.of}: frente ${awning.width} cm supera el máximo estándar de ${parameters.standardMaxWidth} cm con soporte ARZUA.`
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
      rollTubeLength,
      stockLength,
      tubeLoad,
      supportSystem,
      motorPower: device === 'MOTOR' ? motorPower : '',
      armCount
    }
  };
}

// Referencias compartidas entre RPS (buildMaterials) y despiece (buildDespiece):
// mismo cálculo de código, una sola vez, para que ambos no puedan divergir por error.
const refSoporte = (supportSystem, colorSuffix) => supportSystem === 'GALICIA' ? `SOPARTGL${colorSuffix}` : `SOPAR350${colorSuffix}`;
const refTuboEnrolle = (stockLength) => `TURA80HG${stockLength}C`;
const refTuboCargaEvo = (colorSuffix, stockLength) => `PEVO80${colorSuffix}${stockLength}C`;
const refTuboCargaUnivers = (colorSuffix, stockLength) => `PUNI280${colorSuffix}${stockLength}C`;
const refTaponesUnivers = (colorSuffix) => `TAPOPLUN280${colorSuffix}`;
const refBrazosOnyx = (colorSuffix, projection) => `BONYX${colorSuffix}${projection}C`;
const refCasquilloMaquina = (device) => (device === 'MAQ. INTERIOR' ? 'CASMAQEJE5078MM' : 'CASMAQEJE6378MM');
const descCasquilloMaquina = (device) => (device === 'MAQ. INTERIOR' ? 'CASQUILLO MAQUINA EJE 50MM Ø78' : 'CASQUILLO EJE 63MM Ø78');
const refManivela = (lacado, crankHeight) => `MANIVE${crankSuffix(lacado)}${crankHeight}C`;

function buildMaterials({ awning, lacado, colorSuffix, tubeLoad, device, supportSystem, motorPower, armCount, stockLength, fabricMl, fabric }) {
  const materials = [
    { code: refSoporte(supportSystem, colorSuffix), quantity: 1, description: supportSystem === 'GALICIA' ? 'JUEGO SOPORTE GALICIA' : 'JUEGO SOPORTE AROND' },
    { code: refTuboEnrolle(stockLength), quantity: 2, description: 'TUBO DE ENROLLE P801' }
  ];

  if (tubeLoad === 'TUBO DE CARGA EVO 80') {
    materials.push(
      { code: refTuboCargaEvo(colorSuffix, stockLength), quantity: 1, description: 'TUBO DE CARGA EVO 80' },
      { code: refBrazosOnyx(colorSuffix, awning.projection), quantity: armCount, description: supportSystem === 'GALICIA' ? 'BRAZO ONYX' : 'JUEGO DE BRAZOS ONYX' }
    );
  } else {
    materials.push(
      { code: refTuboCargaUnivers(colorSuffix, stockLength), quantity: 1, description: 'TUBO DE CARGA UNIVERS 280' },
      { code: refTaponesUnivers(colorSuffix), quantity: 1, description: 'KIT TAPONES UNIVERS 280' },
      { code: refBrazosOnyx(colorSuffix, awning.projection), quantity: armCount, description: supportSystem === 'GALICIA' ? 'BRAZO ONYX' : 'JUEGO DE BRAZOS ONYX' }
    );
  }

  if (device === 'MAQ. INTERIOR' || device === 'MAQ. EXTERIOR') {
    const crankHeight = Math.max(0, Number(awning.crankHeight) || 0);
    materials.push(
      { code: refCasquilloMaquina(device), quantity: 1, description: descCasquilloMaquina(device) },
      { code: refManivela(lacado, crankHeight), quantity: 1, description: `MANIVELA LUXE ${lacado.crank} ${crankHeight}` },
      { code: 'CASPLAS', quantity: 1, description: 'CASQUILLO PLASTICO' }
    );
  }

  if (device === 'MOTOR') {
    const motorCode = motorPower === '70/17' ? 'SUNILUSIO70//17' : 'SUNILUSIO55//17';
    const remote = resolveMotorRemote(awning.sensor);
    materials.push(
      { code: 'RUEDAMOT78', quantity: 1, description: 'RUEDA MOTRIZ Ø 78' },
      { code: motorCode, quantity: 1, description: `MOTOR SOMFY SUNILUS ${motorPower} IO` },
      { code: 'CORONALT6078', quantity: 1, description: 'CORONA LT 60 ADAPTADA Ø 78' },
      { code: 'SOPORTEUNVHIPRO', quantity: 1, description: 'SOPORTE UNIVERSAL HIPRO' },
      { code: remote.code, quantity: 1, description: remote.description }
    );
  }

  if (fabric) {
    materials.push({ code: fabric.code, quantity: fabricMl, description: fabric.description });
  }

  return materials;
}

function buildDespiece({ awning, device, tubeLoad, lacado, colorSuffix, supportSystem, motorPower, armCount, stockLength, length, rollTubeLength }) {
  const rows = [];
  let num = 1;
  const push = (name, reference, units, rowLength = null) => {
    rows.push({ num: num++, name, reference, units, length: rowLength });
  };

  push(supportSystem === 'GALICIA' ? 'JUEGO SOPORTE GALICIA' : 'JUEGO SOPORTE AROND', refSoporte(supportSystem, colorSuffix), 1);
  push('TUBO DE ENROLLE P801', refTuboEnrolle(stockLength), 1, rollTubeLength);
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

  push(supportSystem === 'GALICIA' ? 'BRAZO ONYX' : 'JUEGO DE BRAZOS ONYX', refBrazosOnyx(colorSuffix, awning.projection), armCount, awning.projection);
  push('JUEGO DE TERMINALES', null, 1);

  if (device === 'MAQ. INTERIOR' || device === 'MAQ. EXTERIOR') {
    const crankHeight = Math.max(0, Number(awning.crankHeight) || 0);
    push(`MAQUINA ZNP 10 L170 ${lacado.crank}`, machineCode(lacado), 1);
    push(`MANIVELA LUXE ${lacado.crank} ${crankHeight}`, refManivela(lacado, crankHeight), 1, crankHeight);
    push('TACO NAYLON MAQUINA', 'CASPLAS', 1);
    push('KIT DE TORNILLOS MAQUINA', null, 1);
  }

  if (device === 'MOTOR') {
    const motorCode = motorPower === '70/17' ? 'SUNILUSIO70//17' : 'SUNILUSIO55//17';
    const remote = resolveMotorRemote(awning.sensor);
    push('RUEDA MOTRIZ Ø 78', 'RUEDAMOT78', 1);
    push(`MOTOR SOMFY SUNILUS ${motorPower} IO`, motorCode, 1);
    push('CORONA LT 60 ADAPTADA Ø 78', 'CORONALT6078', 1);
    push('SOPORTE UNIVERSAL HIPRO', 'SOPORTEUNVHIPRO', 1);
    push(remote.description, remote.code, 1);
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

function lookupMinimumLine(minimumLines, arm, device) {
  const exact = minimumLines.find((item) => item.arm === arm);
  if (exact) return exact.values[device];

  const next = minimumLines.find((item) => item.arm >= arm);
  return (next || minimumLines[minimumLines.length - 1]).values[device];
}

function lookupDiscount(matrix, tubeLoad, device, fallback) {
  return matrix[tubeLoad]?.[device] ?? fallback;
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

