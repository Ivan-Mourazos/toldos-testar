import { roundQuantity, formatNumber } from './math.js';
import { resolveFabric } from './fabricCatalog.js';
import { resolveLacado, crankSuffix, machineCode } from './lacados.js';
import behaviorData from './data/modelBehavior.json' with { type: 'json' };
import { galiciaEstablishedProjections } from './galiciaConstants.js';
import {
  normalizeGaliciaParameters,
  resolveGaliciaMotorPower,
  suggestedGaliciaArmCount,
  suggestedGaliciaTube
} from './galiciaParameters.js';
import { resolveMotorRemote } from './motorAccessories.js';

export { galiciaEstablishedProjections };

export function calculateGalicia({ order, awning }) {
  const parameters = normalizeGaliciaParameters(order.parameters?.galicia);
  const lacado = resolveLacado(order.structureColor);
  const colorSuffix = lacado.suffix;
  const selectedTube = awning.tubeLoad || suggestedGaliciaTube(awning.destination, parameters);
  const tubeLoad = normalizeTubeLoad(selectedTube);
  const device = normalizeDevice(awning.device);
  const requiredArmCount = suggestedGaliciaArmCount(awning.width, parameters);
  const suppliedArmCount = Number(awning.armCount);
  const armCount = [2, 3].includes(suppliedArmCount) ? suppliedArmCount : requiredArmCount;
  const motorPower = resolveGaliciaMotorPower({ ...awning, armCount }, parameters);
  const minimumLine = lookupMinimumLine(parameters.minimumLineByProjection, awning.projection, armCount, device);
  const diagnostics = [];
  const missingFields = [];
  const invalidArmCount = suppliedArmCount > 0 && ![2, 3].includes(suppliedArmCount);
  const belowMinimum = Number(awning.width) < minimumLine;
  const belowRequiredArms = armCount < requiredArmCount;
  const overMaximum = Number(awning.width) > parameters.standardMaxWidth;
  const modified = Boolean(awning.reglasModificadas);

  if (!awning.device) missingFields.push('dispositivo');
  else if (device !== 'MOTOR' && !awning.crankHeight) missingFields.push('altura de manivela');
  if (!selectedTube) missingFields.push('destino o tubo de carga');

  const valid = missingFields.length === 0
    && !invalidArmCount
    && !belowMinimum
    && !belowRequiredArms
    && (!overMaximum || modified);

  const fabricWidth = round1(awning.width - lookupDiscount(parameters.fabricWidthDiscounts, tubeLoad, device, 11));
  const valance = Math.max(0, Number(awning.valanceHeight) || 0);
  const fabricDrop = round1(awning.projection + valance + 45);
  const fabricMl = roundQuantity(Math.ceil(fabricWidth / 120) * (fabricDrop / 100) * awning.units);
  const structureLength = round1(awning.width - lookupDiscount(parameters.widthDiscounts, tubeLoad, device, 10));
  const rollTubeLength = round1(awning.width - lookupDiscount(parameters.rollTubeDiscounts, tubeLoad, device, 10));
  const stockLength = chooseStockLength(Math.max(structureLength, rollTubeLength));
  const fabric = order.fabric ? resolveFabric(order.fabric) : null;

  if (order.fabric && !fabric) {
    diagnostics.push({
      level: 'error',
      awningId: awning.id,
      message: `Tela no encontrada en el catálogo: "${order.fabric}".`
    });
  }

  const context = {
    awning, lacado, colorSuffix, tubeLoad, device, armCount, motorPower,
    stockLength, structureLength, rollTubeLength, fabricMl, fabric
  };
  const materials = valid ? buildMaterials(context) : [];
  const despiece = valid ? buildDespiece(context) : null;

  if (missingFields.length > 0) {
    diagnostics.push({
      level: 'error', awningId: awning.id,
      message: `GALICIA incompleto en OF ${awning.of}: falta ${missingFields.join(' y ')}.`
    });
  } else if (invalidArmCount) {
    diagnostics.push({
      level: 'error', awningId: awning.id,
      message: 'GALICIA admite 2 o 3 brazos.'
    });
  } else if (belowRequiredArms) {
    diagnostics.push({
      level: 'error', awningId: awning.id,
      message: `GALICIA necesita 3 brazos a partir de ${parameters.armSwitchWidth + 1} cm de frente.`
    });
  } else if (belowMinimum) {
    diagnostics.push({
      level: 'error', awningId: awning.id,
      message: `GALICIA no válido: frente ${awning.width} cm, mínimo ${minimumLine} cm para salida ${awning.projection}, ${armCount} brazos y ${device}.`
    });
  } else if (overMaximum && !modified) {
    diagnostics.push({
      level: 'error', awningId: awning.id,
      message: `GALICIA no válido: frente ${awning.width} cm supera el máximo estándar de ${parameters.standardMaxWidth} cm.`
    });
  } else if (overMaximum && modified) {
    diagnostics.push({
      level: 'warn', awningId: awning.id,
      message: `Excepción técnica en OF ${awning.of}: frente ${awning.width} cm supera el máximo estándar de ${parameters.standardMaxWidth} cm.`
    });
  }

  return {
    of: awning.of,
    description: buildDescription(awning, { fabricWidth, fabricDrop, fabricMl }),
    materials,
    despiece,
    diagnostics,
    calculation: {
      model: 'GALICIA',
      valid,
      minimumLine,
      width: awning.width,
      projection: awning.projection,
      fabricWidth,
      fabricDrop,
      fabricMl,
      structureLength,
      rollTubeLength,
      stockLength,
      tubeLoad,
      supportSystem: 'GALICIA',
      motorPower: device === 'MOTOR' ? motorPower : '',
      armCount,
      requiredArmCount
    }
  };
}

const refSupport = (suffix) => `SOPARTGL${suffix}`;
const refRollTube = (stockLength) => `TURA80HG${stockLength}C`;
const refEvoTube = (suffix, stockLength) => `PEVO80${suffix}${stockLength}C`;
const refUniversTube = (suffix, stockLength) => `PUNI280${suffix}${stockLength}C`;
const refUniversCaps = (suffix) => `TAPOPLUN280${suffix}`;
const refArm = (suffix, projection) => `BONYX${suffix}${projection}C`;
const refMachineBush = (device) => device === 'MAQ. INTERIOR' ? 'CASMAQEJE5078MM' : 'CASMAQEJE6378MM';
const descMachineBush = (device) => device === 'MAQ. INTERIOR' ? 'CASQUILLO MAQUINA EJE 50MM Ø78' : 'CASQUILLO EJE 63MM Ø78';
const refCrank = (lacado, height) => `MANIVE${crankSuffix(lacado)}${height}C`;

function buildMaterials({ awning, lacado, colorSuffix, tubeLoad, device, armCount, motorPower, stockLength, fabricMl, fabric }) {
  const materials = [
    { code: refSupport(colorSuffix), quantity: 1, description: 'JUEGO SOPORTE GALICIA' },
    { code: refRollTube(stockLength), quantity: 2, description: 'TUBO DE ENROLLE P801' }
  ];

  if (tubeLoad === 'TUBO DE CARGA EVO 80') {
    materials.push({ code: refEvoTube(colorSuffix, stockLength), quantity: 1, description: 'TUBO DE CARGA EVO 80' });
  } else {
    materials.push(
      { code: refUniversTube(colorSuffix, stockLength), quantity: 1, description: 'TUBO DE CARGA UNIVERS 280' },
      { code: refUniversCaps(colorSuffix), quantity: 1, description: 'KIT TAPONES UNIVERS 280' }
    );
  }
  materials.push({ code: refArm(colorSuffix, awning.projection), quantity: armCount, description: 'BRAZO ONYX' });

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
  } else {
    const crankHeight = Math.max(0, Number(awning.crankHeight) || 0);
    materials.push(
      { code: refMachineBush(device), quantity: 1, description: descMachineBush(device) },
      { code: refCrank(lacado, crankHeight), quantity: 1, description: `MANIVELA LUXE ${lacado.crank} ${crankHeight}` },
      { code: 'CASPLAS', quantity: 1, description: 'CASQUILLO PLASTICO' }
    );
  }

  const wallEntry = behaviorData.options.tiposPared.find((item) => item.pared === awning.wallType);
  if (wallEntry?.referencia) {
    materials.push({ code: wallEntry.referencia, quantity: wallEntry.unidades, description: wallEntry.tornilleria });
  }
  if (fabric) materials.push({ code: fabric.code, quantity: fabricMl, description: fabric.description });
  return materials;
}

function buildDespiece({ awning, lacado, colorSuffix, tubeLoad, device, armCount, motorPower, stockLength, structureLength, rollTubeLength }) {
  const rows = [];
  let num = 1;
  const push = (name, reference, units, length = null) => rows.push({ num: num++, name, reference, units, length });

  push('JUEGO SOPORTE GALICIA', refSupport(colorSuffix), 1);
  push('TUBO DE ENROLLE P801', refRollTube(stockLength), 1, rollTubeLength);
  push('CASQUILLO PUNTA', 'CASPUNCE', 1);
  if (device === 'MOTOR') push('RUEDA MOTRIZ Ø 78', 'RUEDAMOT78', 1);
  else push(descMachineBush(device), refMachineBush(device), 1);

  if (tubeLoad === 'TUBO DE CARGA EVO 80') {
    push('TUBO DE CARGA EVO 80', refEvoTube(colorSuffix, stockLength), 1, structureLength);
    push('KIT TAPONES EVO 80', null, 1);
  } else {
    push('TUBO DE CARGA UNIVERS 280', refUniversTube(colorSuffix, stockLength), 1, structureLength);
    push('KIT TAPONES UNIVERS 280', refUniversCaps(colorSuffix), 1);
  }
  push('BRAZO ONYX', refArm(colorSuffix, awning.projection), armCount, awning.projection);
  push('JUEGO DE TERMINALES', null, 1);

  if (device === 'MOTOR') {
    const motorCode = motorPower === '70/17' ? 'SUNILUSIO70//17' : 'SUNILUSIO55//17';
    const remote = resolveMotorRemote(awning.sensor);
    push('SOPORTE UNIVERSAL HIPRO', 'SOPORTEUNVHIPRO', 1);
    push(`MOTOR SOMFY SUNILUS ${motorPower} IO`, motorCode, 1);
    push('CORONA LT 60 ADAPTADA Ø 78', 'CORONALT6078', 1);
    push(remote.description, remote.code, 1);
  } else {
    const crankHeight = Math.max(0, Number(awning.crankHeight) || 0);
    push(`MAQUINA ZNP 10 L170 ${lacado.crank}`, machineCode(lacado), 1);
    push(`MANIVELA LUXE ${lacado.crank} ${crankHeight}`, refCrank(lacado, crankHeight), 1, crankHeight);
    push('TACO NAYLON MAQUINA', 'CASPLAS', 1);
    push('KIT DE TORNILLOS MAQUINA', null, 1);
  }

  const wallEntry = behaviorData.options.tiposPared.find((item) => item.pared === awning.wallType);
  const anchoring = wallEntry
    ? { name: wallEntry.tornilleria, reference: wallEntry.referencia || null, units: wallEntry.unidades }
    : null;
  return { rows, anchoring };
}

function buildDescription(awning, calculation) {
  const valance = Math.max(0, Number(awning.valanceHeight) || 0);
  const valanceText = valance > 0
    ? ` · bambalina incluida de ${valance + 5} cm, hecha de ${valance} cm`
    : '';
  return `Toldo GALICIA ${awning.width}x${awning.projection} · tela ${formatNumber(calculation.fabricWidth)}x${formatNumber(calculation.fabricDrop)} · paño ${formatNumber(calculation.fabricMl)} ml${valanceText}`;
}

function lookupMinimumLine(rows, projection, armCount, device) {
  const exact = rows.find((item) => item.projection === Number(projection));
  const next = rows.find((item) => item.projection >= Number(projection));
  const row = exact || next || rows[rows.length - 1];
  return row.values[armCount][device];
}

function lookupDiscount(matrix, tubeLoad, device, fallback) {
  return matrix[tubeLoad]?.[device] ?? fallback;
}

function chooseStockLength(length) {
  return [600, 700].find((item) => item >= length) || Math.ceil(length / 100) * 100;
}

function normalizeTubeLoad(value) {
  return String(value || '').toUpperCase().includes('UNIVERS')
    ? 'TUBO DE CARGA UNIVERS 280'
    : 'TUBO DE CARGA EVO 80';
}

function normalizeDevice(value) {
  const clean = String(value || '').toUpperCase();
  if (clean.includes('INTERIOR')) return 'MAQ. INTERIOR';
  if (clean.includes('EXTERIOR')) return 'MAQ. EXTERIOR';
  return 'MOTOR';
}

function round1(value) {
  return Math.round(value * 10) / 10;
}
