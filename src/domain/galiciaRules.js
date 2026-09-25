import { tipBushing } from './tipBushing.js';
import { formatNumber } from './math.js';
import { resolveFabric } from './fabricCatalog.js';
import { calculateFabricUsage } from './fabricMath.js';
import { resolveLacado, crankSuffix, machineCode, plasticCapSuffix, universProfileSuffix } from './lacados.js';
import behaviorData from './data/modelBehavior.json' with { type: 'json' };
import { galiciaEstablishedProjections } from './galiciaConstants.js';
import {
  normalizeGaliciaParameters,
  resolveGaliciaMotorPower,
  suggestedGaliciaArmCount,
  suggestedGaliciaTube
} from './galiciaParameters.js';
import { resolveMotorRemote } from './motorAccessories.js';
import { evo80StockLengths, onyxArmExists } from './arzuaAvailability.js';
import { galiciaArmLines, galiciaSingleArmExists, galiciaSupportLines } from './galiciaSupportPieces.js';
import { groupBars, rollTubeLengths, splitIntoBars } from './monoblock350Pieces.js';
import { universProfileStockLengths } from './universProfileLengths.js';
import {
  appendSeparateValanceDiagnostic,
  appendSeparateValanceMaterial,
  calculateSeparateValance,
  separateValanceCalculation
} from './separateValance.js';

export { galiciaEstablishedProjections };

export function calculateGalicia({ order, awning }) {
  const parameters = normalizeGaliciaParameters(order.parameters?.galicia);
  const structureColor = awning.structureColor || order.structureColor;
  const lacado = resolveLacado(structureColor);
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
  const fabricSelection = order.sameFabric !== false ? order.fabric : awning.fabric;
  const fabric = fabricSelection ? resolveFabric(fabricSelection) : null;

  if (!structureColor) missingFields.push('lacado');
  if (!fabricSelection) missingFields.push('tela');
  if (!device) missingFields.push('dispositivo válido');
  else if (device !== 'MOTOR' && !awning.crankHeight) missingFields.push('altura de manivela');
  if (!tubeLoad) missingFields.push('tubo de carga válido');

  const fabricWidth = round1(awning.width - lookupDiscount(parameters.fabricWidthDiscounts, tubeLoad, device, 11));
  const valance = Math.max(0, Number(awning.valanceHeight) || 0);
  const separateValance = calculateSeparateValance({
    awning,
    seamAllowanceCm: parameters.seamAllowanceCm,
    seamBaseCm: parameters.seamBaseCm
  });
  const mainDropAllowance = separateValance.requested
    ? Math.max(0, parameters.fabricDropAllowanceCm - 5)
    : parameters.fabricDropAllowanceCm;
  const fabricDrop = round1(awning.projection + mainDropAllowance + (separateValance.requested ? 0 : valance));
  const fabricUsage = calculateFabricUsage({
    width: fabricWidth,
    drop: fabricDrop,
    units: awning.units,
    rollWidth: fabric?.width || 120,
    seamAllowanceCm: parameters.seamAllowanceCm,
    seamBaseCm: parameters.seamBaseCm
  });
  const fabricMl = fabricUsage.ml;
  const structureLength = round1(awning.width - lookupDiscount(parameters.widthDiscounts, tubeLoad, device, 10));
  const rollTubeLength = round1(awning.width - lookupDiscount(parameters.rollTubeDiscounts, tubeLoad, device, 10));
  // El EVO 80 no existe en todos los largos de cada lacado (en negro, el de 600 está
  // de baja desde 2023): se elige entre los que hay, como en el Arzúa.
  const profileLengths = tubeLoad === 'TUBO DE CARGA EVO 80' ? evo80StockLengths(colorSuffix, parameters.stockLengths) : parameters.stockLengths;
  const singleStock = chooseStockLength(Math.max(structureLength, rollTubeLength), profileLengths);
  // Por encima de la barra más larga (Iván, 25/09/2026, Q-G03): el tubo de enrolle va de
  // 800 y la barra de carga se empalma en barras iguales, como en el Monoblock 350.
  const loadAvailable = tubeLoad === 'TUBO DE CARGA EVO 80'
    ? evo80StockLengths(colorSuffix, [400, 500, 600, 700])
    : universProfileStockLengths(universProfileSuffix(colorSuffix), [400, 500, 600, 700]);
  const firstThatFits = (length) => (sorted) => sorted.find((item) => item >= length);
  const rollBars = singleStock ? [singleStock] : splitIntoBars(rollTubeLength, rollTubeLengths, firstThatFits(rollTubeLength));
  const loadBars = singleStock ? [singleStock] : splitIntoBars(structureLength, loadAvailable, firstThatFits(structureLength));
  const stockLength = singleStock ?? (rollBars.length ? Math.max(...rollBars) : null);
  // Con tres brazos va además un brazo suelto: si no existe en ese lacado y salida, no
  // se reserva un código que RPS no tiene.
  const armMissing = !onyxArmExists(colorSuffix, awning.projection)
    || (armCount === 3 && !galiciaSingleArmExists(colorSuffix, awning.projection));
  const stockUnavailable = !rollBars.length || !loadBars.length;
  const fabricInvalid = Boolean(fabricSelection && !fabric);
  const valid = missingFields.length === 0
    && !fabricInvalid
    && separateValance.valid
    && !invalidArmCount
    && !belowMinimum
    && !belowRequiredArms
    && !stockUnavailable
    && !armMissing
    && (!overMaximum || modified);

  if (fabricSelection && !fabric) {
    diagnostics.push({
      level: 'error',
      awningId: awning.id,
      message: `Tela no encontrada en el catálogo: "${fabricSelection}".`
    });
  }
  appendSeparateValanceDiagnostic(diagnostics, awning, separateValance);
  if (armMissing) {
    diagnostics.push({
      level: 'error', awningId: awning.id,
      message: `GALICIA no válido: no hay brazo Onyx de ${formatNumber(awning.projection)} cm${armCount === 3 ? ' suelto' : ''} en ${lacado.name}.`
    });
  }

  const context = {
    awning, lacado, colorSuffix, tubeLoad, device, armCount, motorPower,
    stockLength, rollBars, loadBars, structureLength, rollTubeLength, fabricMl, fabric, separateValance
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
  } else if (stockUnavailable) {
    diagnostics.push({
      level: 'error', awningId: awning.id,
      message: `GALICIA no válido: ningún largo de stock configurado admite ${Math.max(structureLength, rollTubeLength)} cm.`
    });
  } else if (overMaximum && modified) {
    diagnostics.push({
      level: 'warn', awningId: awning.id,
      message: `Excepción técnica en OF ${awning.of}: frente ${awning.width} cm supera el máximo estándar de ${parameters.standardMaxWidth} cm.`
    });
  }
  if (valid && loadBars.length > 1) {
    diagnostics.push({
      level: 'warn', awningId: awning.id,
      message: `GALICIA de ${formatNumber(awning.width)} cm: la barra de carga va empalmada en ${loadBars.length} barras de ${loadBars[0]} cm.`
    });
  }
  // Ficha técnica TGM (intranet, 21/09/2026): con tres brazos la salida máxima es 3,25 m.
  // Se avisa sin bloquear: desde 2024 hay 3 OF de tres brazos con salida 350 (Q-G03).
  if (valid && armCount === 3 && Number(awning.projection) > 325) {
    diagnostics.push({
      level: 'warn', awningId: awning.id,
      message: `GALICIA con tres brazos: la ficha técnica admite hasta 325 cm de salida y este lleva ${awning.projection}.`
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
      fabricPanels: fabricUsage.panels,
      mainFabricMl: fabricMl,
      mainFabricPanels: fabricUsage.panels,
      fabricCode: fabric?.code || '',
      fabricDescription: fabric?.description || '',
      fabricRollWidth: fabric?.width || 120,
      ...separateValanceCalculation(separateValance),
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

const refRollTube = (stockLength) => `TURA80HG${stockLength}C`;
const refEvoTube = (suffix, stockLength) => `PEVO80${suffix}${stockLength}C`;
const refEvoCaps = (lacado) => `TAPONEVO8${plasticCapSuffix(lacado)}`;
const refUniversTube = (suffix, stockLength) => `PUNI280${universProfileSuffix(suffix)}${stockLength}C`;
const refUniversCaps = (lacado) => `TAPOPLUN280${plasticCapSuffix(lacado)}`;
const refTerminals = (suffix) => `TERMINEVO${suffix}`;
const refMiddleTerminal = (suffix) => `TERMINEVOUND${suffix}`;
const refMachineBush = (device) => device === 'MAQ. INTERIOR' ? 'CASMAQEJE5078MM' : 'CASMAQEJE6378MM';
const descMachineBush = (device) => device === 'MAQ. INTERIOR' ? 'CASQUILLO MAQUINA EJE 50MM Ø78' : 'CASQUILLO EJE 63MM Ø78';
const refCrank = (lacado, height) => `MANIVE${crankSuffix(lacado)}${height}C`;

// Piezas de un Galicia, contrastadas con el consumo real de 90 OF desde 2025 (las
// que en RPS se venden como ARZUA y llevan SOPARTGL). Lo mismo alimenta la reserva
// y el despiece:
// - Brazos y soportes: en RPS BONYX y SOPARTGL son juegos. Con tres brazos se
//   añade uno suelto de cada (galiciaSupportPieces.js); antes se reservaban tres
//   juegos de brazos (seis brazos) y un solo juego de soportes.
// - Tubo de enrolle: uno por toldo (84 de 90 OF); se reservaban dos.
// - Terminales: un juego y, con tres brazos, uno indiferente para el del medio (56 OF).
// - Casquillo de punta, varillas, tapones EVO, máquina MB-11 y manivela se consumían
//   y no se reservaban. El CASPLAS y la corona LT60 Ø78 no se consumen.
// - Motor: el mismo kit que el Arzúa (rueda P-801 mecanizada y corona LT60).
function galiciaPieces({ awning, lacado, colorSuffix, tubeLoad, device, armCount, motorPower, rollBars, loadBars, structureLength, rollTubeLength }) {
  const units = Math.max(1, Number(awning.units) || 1);
  // Las varillas de vaina se cortan al largo de la barra de carga; de la blanca
  // entra el doble, como en el Arzúa (mismo tubo y misma barra).
  const varillaMl = Math.ceil(Number(structureLength) || 0) / 100;
  const pieces = [
    ...galiciaSupportLines(colorSuffix, armCount, units),
    ...groupBars(rollBars).map(({ length, count }) => ({ code: refRollTube(length), quantity: count * units, description: 'TUBO DE ENROLLE P801', length: rollTubeLength })),
    { code: tipBushing('P801').code, quantity: units, description: 'CASQUILLO PUNTA CON EJE Ø78' },
    ...groupBars(loadBars).map(({ length, count }) => (tubeLoad === 'TUBO DE CARGA EVO 80'
      ? { code: refEvoTube(colorSuffix, length), quantity: count * units, description: 'TUBO DE CARGA EVO 80', length: structureLength }
      : { code: refUniversTube(colorSuffix, length), quantity: count * units, description: 'TUBO DE CARGA UNIVERS 280', length: structureLength })),
    tubeLoad === 'TUBO DE CARGA EVO 80'
      ? { code: refEvoCaps(lacado), quantity: units, description: 'KIT TAPONES EVO 80' }
      : { code: refUniversCaps(lacado), quantity: units, description: 'KIT TAPONES UNIVERS 280' },
    ...galiciaArmLines(colorSuffix, awning.projection, armCount, units).map((line) => ({ ...line, length: awning.projection })),
    { code: refTerminals(colorSuffix), quantity: units, description: 'JGO TERMINAL INFERIOR EVO 70-80' },
    ...(armCount === 3 ? [{ code: refMiddleTerminal(colorSuffix), quantity: units, description: 'TERMINAL INFERIOR INDIFERENTE EVO 70-80' }] : []),
    { code: 'VARILLAVAINANEG5', quantity: round1(varillaMl * units), description: 'VARILLA VAINA NEGRA 4,5MM', despiece: false },
    { code: 'VARILLAVAINARBLA', quantity: round1(2 * varillaMl * units), description: 'VARILLA VAINA RIGIDA 5,5 BLANCA', despiece: false }
  ];

  if (device === 'MOTOR') {
    const motorCode = motorPower === '70/17' ? 'SUNILUSIO70//17' : 'SUNILUSIO55//17';
    const remote = resolveMotorRemote(awning.sensor);
    pieces.push(
      { code: 'RUEDAMOT801MEC', quantity: units, description: 'RUEDA MOTRIZ A P-801 MECANIZADA' },
      { code: motorCode, quantity: units, description: `MOTOR SOMFY SUNILUS ${motorPower} IO` },
      { code: 'CORONALT60', quantity: units, description: 'CORONA ADAPTADA LT60 P-801' },
      { code: 'SOPORTEUNVHIPRO', quantity: units, description: 'SOPORTE UNIVERSAL HIPRO' },
      { code: remote.code, quantity: units, description: remote.description }
    );
  } else {
    const crankHeight = Math.max(0, Number(awning.crankHeight) || 0);
    pieces.push(
      { code: machineCode(lacado), quantity: units, description: `MAQUINA MB-11 L-120 ${lacado.crank}` },
      { code: refMachineBush(device), quantity: units, description: descMachineBush(device) },
      { code: refCrank(lacado, crankHeight), quantity: units, description: `MANIVELA LUXE ${lacado.crank} ${crankHeight}`, length: crankHeight },
      { code: null, quantity: units, description: 'KIT DE TORNILLOS MAQUINA', reserve: false }
    );
  }
  return pieces;
}

function buildMaterials(context) {
  const { awning, fabricMl, fabric, separateValance } = context;
  const units = Math.max(1, Number(awning.units) || 1);
  const materials = galiciaPieces(context)
    .filter((piece) => piece.code && piece.reserve !== false)
    .map(({ code, quantity, description }) => ({ code, quantity, description }));
  const wallEntry = behaviorData.options.tiposPared.find((item) => item.pared === awning.wallType);
  if (wallEntry?.referencia) {
    materials.push({ code: wallEntry.referencia, quantity: wallEntry.unidades * units, description: wallEntry.tornilleria });
  }
  if (fabric) materials.push({ code: fabric.code, quantity: fabricMl, description: fabric.description });
  appendSeparateValanceMaterial(materials, separateValance);
  return materials;
}

function buildDespiece(context) {
  const { awning } = context;
  const awningUnits = Math.max(1, Number(awning.units) || 1);
  const rows = galiciaPieces(context)
    .filter((piece) => piece.despiece !== false)
    .map((piece, index) => ({ num: index + 1, name: piece.description, reference: piece.code, units: piece.quantity, length: piece.length ?? null }));
  const wallEntry = behaviorData.options.tiposPared.find((item) => item.pared === awning.wallType);
  const anchoring = wallEntry
    ? { name: wallEntry.tornilleria, reference: wallEntry.referencia || null, units: wallEntry.unidades * awningUnits }
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

function chooseStockLength(length, stockLengths) {
  return stockLengths.find((item) => item >= length) || null;
}

function normalizeTubeLoad(value) {
  const clean = String(value || '').toUpperCase();
  if (clean.includes('UNIVERS')) return 'TUBO DE CARGA UNIVERS 280';
  if (clean.includes('EVO 80')) return 'TUBO DE CARGA EVO 80';
  return '';
}

function normalizeDevice(value) {
  const clean = String(value || '').toUpperCase();
  if (clean.includes('INTERIOR')) return 'MAQ. INTERIOR';
  if (clean.includes('EXTERIOR')) return 'MAQ. EXTERIOR';
  if (clean === 'MOTOR') return 'MOTOR';
  return '';
}

function round1(value) {
  return Math.round(value * 10) / 10;
}
