import { effectiveOverride } from './ruleOverrides.js';
import { tipBushing } from './tipBushing.js';
import { P801_TUBE_LENGTHS, PRVMODUL_LENGTHS, barsForCut, profileLengthsOrWhite } from './barLengths.js';
import { formatNumber } from './math.js';
import { resolveFabric } from './fabricCatalog.js';
import { calculateFabricUsage } from './fabricMath.js';
import { crankSuffix, machineCode, resolveLacado } from './lacados.js';
import behaviorData from './data/modelBehavior.json' with { type: 'json' };
import { resolveMotorRemote } from './motorAccessories.js';
import { galiciaSingleArmExists, looseSideLetter, looseSideName, onyxArmLines } from './galiciaSupportPieces.js';
import { onyxArmExists } from './arzuaAvailability.js';
import { agataLacadoIssue } from './boxAvailability.js';
import {
  agataBoxEstablishedProjections,
  normalizeAgataBoxParameters,
  normalizeAgataSubmodel,
  resolveAgataMinimumLine,
  resolveAgataMotorPower,
  suggestedAgataArmCount
} from './agataBoxParameters.js';
import {
  appendSeparateValanceDiagnostic,
  appendSeparateValanceMaterial,
  calculateSeparateValance,
  separateValanceCalculation
} from './separateValance.js';

export function calculateAgataBox({ order, awning }) {
  const parameters = normalizeAgataBoxParameters(order.parameters?.agataBox);
  const structureColor = awning.structureColor || order.structureColor;
  const lacado = resolveLacado(structureColor);
  const device = normalizeDevice(awning.device);
  const placement = normalizePlacement(awning.placement);
  const submodel = normalizeAgataSubmodel(awning.submodel);
  const fabricSelection = order.sameFabric !== false ? order.fabric : awning.fabric;
  const fabric = fabricSelection ? resolveFabric(fabricSelection) : null;
  const requiredArmCount = suggestedAgataArmCount(awning.width);
  const selectedArmCount = Number(awning.armCount) || requiredArmCount;
  const armCount = Math.max(2, Math.min(4, selectedArmCount));
  const modified = Boolean(awning.reglasModificadas);
  const standardMinimumLine = resolveAgataMinimumLine(awning.projection, device, armCount, parameters);
  const minimumLine = effectiveNumber(awning, 'agataMinimumLineCm', standardMinimumLine);
  const standardSupportCount = calculateAgataSupportCount({ width: awning.width, minimumLine, armCount, parameters });
  const supportCount = Math.max(1, Math.round(effectiveNumber(awning, 'agataSupportCount', standardSupportCount)));
  const diagnostics = [];
  const missingFields = [];

  if (!submodel) missingFields.push('variante');
  if (!structureColor) missingFields.push('lacado');
  if (!fabricSelection) missingFields.push('tela');
  if (!device) missingFields.push('dispositivo válido');
  if (!placement) missingFields.push('colocación');
  if (device === 'MAQUINA' && !awning.crankHeight) missingFields.push('altura de manivela');

  const discountSet = parameters.discounts[submodel || 'OPEN']?.[device || 'MOTOR'] || parameters.discounts.OPEN.MOTOR;
  const discounts = {
    ...discountSet,
    fabric: effectiveNumber(awning, 'agataFabricWidthDiscountCm', discountSet.fabric),
    roll: effectiveNumber(awning, 'agataRollDiscountCm', discountSet.roll)
  };
  const dropAllowance = effectiveNumber(awning, 'agataFabricDropAllowanceCm', parameters.fabricDropAllowanceCm);
  const valance = Math.max(0, Number(awning.valanceHeight) || 0);
  const fabricWidth = round1(Number(awning.width) - discounts.fabric);
  const separateValance = calculateSeparateValance({ awning, seamAllowanceCm: parameters.seamAllowanceCm, seamBaseCm: parameters.seamBaseCm });
  const mainDropAllowance = separateValance.requested ? Math.max(0, dropAllowance - 5) : dropAllowance;
  const fabricDropRaw = Number(awning.projection) + mainDropAllowance + (separateValance.requested ? 0 : valance);
  const fabricDrop = round1(fabricDropRaw);
  const rollTubeLength = round1(Number(awning.width) - discounts.roll);
  const squareBarLength = round1(Number(awning.width) - discounts.squareBar);
  const loadBarLength = round1(Number(awning.width) - discounts.loadBar);
  const diffuserLength = round1(Number(awning.width) - discounts.diffuser);
  const liraLength = round1(Number(awning.width) - discounts.lira);
  const protectorLength = round1(Number(awning.width) - discounts.protector);
  const enclosureLength = submodel === 'OPEN' ? 0 : round1(Number(awning.width) - discounts.enclosure);
  // Taller, 30/09/2026 (Q-A06): cada barra, la más corta que llegue a su corte entre las
  // que existen en RPS en ese lacado; por encima de la más larga, barras iguales que
  // juntas llegan (con más de 7 m va el kit de unión). Antes el tubo era de 600 o 700 y
  // todos los perfiles, de 700, también con 11 m de frente.
  const bars = agataBars(lacado.suffix, { rollTubeLength, squareBarLength, loadBarLength, liraLength, protectorLength, enclosureLength }, submodel);
  const rollStockLength = bars.roll[0] || null;
  const profileStockLength = bars.load[0] || null;
  const availabilityIssue = structureColor && submodel
    ? agataLacadoIssue(submodel, lacado.suffix, lacado.name)
      || (!onyxArmExists(lacado.suffix, awning.projection) || (armCount % 2 === 1 && !galiciaSingleArmExists(lacado.suffix, awning.projection))
        ? `ÁGATA BOX no válido: no hay brazo Onyx de ${awning.projection} cm${armCount % 2 === 1 ? ' suelto' : ''} en ${lacado.name}.` : null)
    : null;
  const profileSupportCount = calculateAgataProfileSupportCount(awning.width);
  const automaticMotorPower = resolveAgataMotorPower(awning.projection, armCount, parameters);
  const motorPower = resolveMotorPower(awning.motorPower, automaticMotorPower);
  const fabricUsage = calculateFabricUsage({
    width: fabricWidth,
    drop: fabricDropRaw,
    units: awning.units,
    rollWidth: fabric?.width || 120,
    seamAllowanceCm: parameters.seamAllowanceCm,
    seamBaseCm: parameters.seamBaseCm
  });
  const belowMinimum = Number(awning.width) < minimumLine;
  const belowRequiredArms = selectedArmCount < requiredArmCount;
  const overMaximum = Number(awning.width) > parameters.standardMaxWidth;
  const unsupportedProjection = !agataBoxEstablishedProjections.includes(Number(awning.projection));
  const unsupportedMachineCofre = submodel === 'COFRE' && device === 'MAQUINA';
  if (availabilityIssue) diagnostics.push({ level: 'error', awningId: awning.id, message: availabilityIssue });
  const valid = !availabilityIssue && missingFields.length === 0
    && Boolean(fabric)
    && separateValance.valid
    && Boolean(rollStockLength)
    && Boolean(motorPower || device === 'MAQUINA')
    && !belowMinimum
    && !belowRequiredArms
    && !unsupportedMachineCofre
    && (!overMaximum || modified)
    && (!unsupportedProjection || modified);

  if (fabricSelection && !fabric) diagnostics.push({ level: 'error', awningId: awning.id, message: `Tela no encontrada en el catálogo: "${fabricSelection}".` });
  appendSeparateValanceDiagnostic(diagnostics, awning, separateValance);
  if (missingFields.length) {
    diagnostics.push({ level: 'error', awningId: awning.id, message: `ÁGATA BOX incompleto en OF ${awning.of}: falta ${missingFields.join(' y ')}.` });
  } else if (unsupportedMachineCofre) {
    diagnostics.push({ level: 'error', awningId: awning.id, message: 'ÁGATA BOX COFRE solo admite accionamiento por motor.' });
  } else if (belowRequiredArms) {
    diagnostics.push({ level: 'error', awningId: awning.id, message: `ÁGATA BOX necesita ${requiredArmCount} brazos para un frente de ${awning.width} cm.` });
  } else if (belowMinimum) {
    diagnostics.push({ level: 'error', awningId: awning.id, message: `ÁGATA BOX no válido: frente ${awning.width} cm, mínimo ${minimumLine} cm para salida ${awning.projection}, ${armCount} brazos y ${device}.` });
  } else if (overMaximum && !modified) {
    diagnostics.push({ level: 'error', awningId: awning.id, message: `ÁGATA BOX no válido: frente ${awning.width} cm supera el máximo estándar de ${parameters.standardMaxWidth} cm.` });
  } else if (unsupportedProjection && !modified) {
    diagnostics.push({ level: 'error', awningId: awning.id, message: `ÁGATA BOX no válido: salida ${awning.projection} cm fuera de la serie 150–400 cm.` });
  } else if (!rollStockLength) {
    diagnostics.push({ level: 'error', awningId: awning.id, message: 'ÁGATA BOX no válido: ningún tubo de stock admite el largo calculado.' });
  } else if (modified) {
    diagnostics.push({ level: 'warn', awningId: awning.id, message: `Excepción técnica en OF ${awning.of}: reglas de ÁGATA BOX modificadas.` });
  }

  const context = {
    awning, device, placement, submodel, lacado, fabric, separateValance, armCount, supportCount, profileSupportCount,
    rollStockLength, profileStockLength, bars, motorPower, fabricMl: fabricUsage.ml,
    lengths: { rollTubeLength, squareBarLength, loadBarLength, diffuserLength, liraLength, protectorLength, enclosureLength }
  };
  return {
    of: awning.of,
    description: buildDescription(awning, submodel, { fabricWidth, fabricDrop, fabricMl: fabricUsage.ml }),
    materials: valid ? buildMaterials(context) : [],
    despiece: valid ? buildDespiece(context) : null,
    diagnostics,
    calculation: {
      model: 'AGATA BOX', valid, minimumLine,
      width: awning.width, projection: awning.projection,
      fabricWidth, fabricDrop, fabricUsageDrop: fabricDropRaw, fabricMl: fabricUsage.ml, fabricPanels: fabricUsage.panels,
      mainFabricMl: fabricUsage.ml, mainFabricPanels: fabricUsage.panels,
      fabricCode: fabric?.code || '', fabricDescription: fabric?.description || '', fabricRollWidth: fabric?.width || 120,
      ...separateValanceCalculation(separateValance),
      structureLength: loadBarLength, rollTubeLength, stockLength: profileStockLength,
      profileStockLength, rollStockLength, motorPower: device === 'MOTOR' ? motorLabel(motorPower) : '',
      armCount, requiredArmCount, supportCount, profileSupportCount, submodel,
      squareBarLength, loadBarLength, diffuserLength, liraLength, protectorLength, enclosureLength,
      agataMinimumLineCm: minimumLine,
      agataSupportCount: supportCount,
      agataFabricWidthDiscountCm: discounts.fabric,
      agataRollDiscountCm: discounts.roll,
      agataFabricDropAllowanceCm: dropAllowance
    }
  };
}

export function calculateAgataProfileSupportCount(width) {
  return Math.max(1, Math.min(7, Math.ceil((Math.max(0, Number(width) || 0) - 300) / 150) + 1));
}

export function calculateAgataSupportCount({ width, minimumLine, armCount, parameters }) {
  const front = Math.max(0, Number(width) || 0);
  const arms = Math.max(2, Math.min(4, Number(armCount) || 2));
  const base = Math.max(1, Math.ceil((front - parameters.supportBaseStartWidth) / parameters.supportBaseStepWidth));
  const corner = front > Number(minimumLine || 0) + 30 ? 1 : 0;
  const armSupports = (arms - 2) * 2;
  const clearSpan = front - (arms - 2) * (Number(minimumLine || 0) / arms);
  const intermediate = clearSpan < 400 ? 1 : 2;
  return base + corner + armSupports + intermediate;
}

function buildMaterials(context) {
  const { awning, device, placement, submodel, lacado, fabric, separateValance, armCount, supportCount, profileSupportCount, bars, motorPower, fabricMl } = context;
  const units = Math.max(1, Number(awning.units) || 1);
  const suffix = lacado.suffix;
  // Consumo real de 24 OF desde 2024: soportes y brazos van por JUEGOS (un juego por
  // cada dos brazos y un suelto si son tres), los soportes a pared o techo son los
  // frontales SOFTMODUL (se reservaban como soportes de brazo) y el cofre lleva tapas.
  const armSets = Math.floor(armCount / 2);
  const varillaMl = Math.ceil(Number(context.lengths.loadBarLength) || 0) / 100;
  const materials = [
    line(colored('SOBMODUL', suffix), armSets * units, 'JUEGO SOPORTES DE BRAZO ÁGATA BOX'),
    armCount % 2 ? line(colored(`SOB${looseSideLetter(awning.looseSide) || 'D'}MODUL`, suffix), units, looseSideName('SOPORTE BRAZO ÁGATA BOX', looseSideLetter(awning.looseSide) || 'D', looseSideLetter(awning.looseSide))) : null,
    line(colored(placement === 'TECHO' ? 'SOTEMODUL' : 'SOFTMODUL', suffix), supportCount * units, placement === 'TECHO' ? 'SOPORTE TECHO ÁGATA BOX' : 'SOPORTE FRONTAL ÁGATA BOX'),
    ...barLines(bars.roll, (length) => `TURA80HG${length}C`, units, 'TUBO DE ENROLLE P801'),
    line(tipBushing('P801').code, units, tipBushing('P801').description),
    ...barLines(bars.load, (length) => coloredStock(loadBarPrefix(submodel), suffix, length), units, `BARRA DE CARGA ÁGATA ${submodel}`),
    line(colored(submodel === 'COFRE' ? 'TAPAPFMODUL' : 'TARONDMOD', suffix), units, 'TAPAS BARRA DE CARGA ÁGATA BOX'),
    line(colored(boxCapPrefix(submodel), suffix), units, 'TAPAS ÁGATA BOX'),
    ...barLines(bars.square, (length) => coloredStock('TUBHI442', suffix, length), units, 'BARRA CUADRADA 40x40x2'),
    ...onyxArmLines(suffix, awning.projection, armCount, units, awning.looseSide).map((item) => line(item.code, item.quantity, item.description)),
    line(colored('TERMIMODUL', suffix), armSets * units, 'JUEGO TERMINAL ÁGATA BOX'),
    // Varillas al largo de la barra: con la variante abierta la blanca va doble.
    line('VARILLAVAINANEG5', round1(varillaMl * units), 'VARILLA VAINA NEGRA 4,5MM'),
    line('VARILLAVAINARBLA', round1((submodel === 'OPEN' ? 2 : 1) * varillaMl * units), 'VARILLA VAINA RIGIDA 5,5 BLANCA'),
    ...barLines(bars.lira, (length) => coloredStock('PRLMODUL', suffix, length), units, 'PERFIL LIRA ÁGATA BOX'),
    ...barLines(bars.protector, (length) => `PRVMODUL${length}C`, units, 'PERFIL PROTECTOR DE LONA'),
    line(colored('SOMPMODUL', suffix), units, 'JUEGO SOPORTE PUNTA MÁQUINA ÁGATA BOX'),
    ...patinLines(suffix, units).map((item) => line(item.code, item.quantity, item.description)),
    ...joinKitLines(awning.width, units).map((item) => line(item.code, item.quantity, item.description))
  ];

  if (submodel !== 'OPEN') {
    materials.push(
      ...barLines(bars.roof, (length) => coloredStock('PRTMODUL', suffix, length), units, 'PERFIL TEJADILLO ÁGATA BOX'),
      ...barLines(bars.roofProtector, (length) => coloredStock('PRPLMODUL', suffix, length), units, 'PROTECTOR LONA TEJADILLO'),
      ...barLines(bars.back, (length) => coloredStock('PRPMODUL', suffix, length), 2 * units, 'PERFIL POSTERIOR Y SELLADOR ÁGATA BOX'),
      line(colored(submodel === 'COFRE' ? 'SOTLMODUL' : 'SOINMODU', suffix), profileSupportCount * units, 'SOPORTES DE CIERRE ÁGATA BOX')
    );
  }
  if (submodel === 'COFRE') materials.push(...barLines(bars.bottom, (length) => coloredStock('PRIMODUL', suffix, length), 2 * units, 'PERFIL INFERIOR ÁGATA BOX'));

  if (device === 'MOTOR') {
    const remote = resolveMotorRemote(awning.sensor);
    // Se consume Sunilus en todas las variantes (también con cofre), con la rueda Ø78 y
    // la corona LT60 a Ø78 (11 OF) y el kit de tornillos del motor (10 OF).
    materials.push(
      line(motorCode(motorPower), units, `MOTOR SOMFY SUNILUS ${motorLabel(motorPower)} IO`),
      line('RUEDAMOT78', units, 'RUEDA MOTRIZ Ø78'),
      line('CORONALT60DESC', units, 'CORONA ADAPTADA LT60 A Ø78'),
      line('SOPORTEUNVHIPRO', units, 'SOPORTE UNIVERSAL HIPRO'),
      line('KITTORMODUL', units, 'KIT TORNILLOS FIJACION MOTOR MODULBOX'),
      { ...line(remote.code, units, remote.description), aggregation: 'max' }
    );
    const sensor = sensorMaterial(awning.sensor);
    if (sensor) materials.push({ ...sensor, quantity: units, aggregation: 'max' });
  } else {
    const height = Math.max(0, Number(awning.crankHeight) || 0);
    materials.push(
      line(machineCode(lacado), units, `MÁQUINA MB-11 L-120 ${lacado.crank}`),
      line(`MANIVE${crankSuffix(lacado)}${height}C`, units, `MANIVELA LUXE ${lacado.crank} ${height}`),
      line('CASMAQEJE6378MM', units, 'CASQUILLO EJE 63MM Ø78')
    );
  }
  if (fabric) materials.push(line(fabric.code, fabricMl, fabric.description));
  appendSeparateValanceMaterial(materials, separateValance);
  const wall = wallMaterial(awning.wallType, units);
  if (wall) materials.push(wall);
  return materials.filter(Boolean);
}

function buildDespiece(context) {
  const { awning, device, placement, submodel, lacado, armCount, supportCount, profileSupportCount, bars, motorPower, lengths } = context;
  const units = Math.max(1, Number(awning.units) || 1);
  const suffix = lacado.suffix;
  const rows = [];
  // Numeración correlativa y las mismas piezas que la reserva.
  const push = (_num, name, reference, rowUnits, length = null) => rows.push({ num: rows.length + 1, name, reference: reference || null, units: rowUnits, length });
  const pushBars = (num, name, list, code, perAwning, length) => barLines(list, code, perAwning, name).forEach((item) => push(num, name, item.code, item.quantity, length));
  push(1, 'JUEGO SOPORTES DE BRAZO ÁGATA BOX', colored('SOBMODUL', suffix), Math.floor(armCount / 2) * units);
  if (armCount % 2) push(1, looseSideName('SOPORTE BRAZO ÁGATA BOX', looseSideLetter(awning.looseSide) || 'D', looseSideLetter(awning.looseSide)), colored(`SOB${looseSideLetter(awning.looseSide) || 'D'}MODUL`, suffix), units);
  push(1, placement === 'TECHO' ? 'SOPORTE TECHO ÁGATA BOX' : 'SOPORTE FRONTAL ÁGATA BOX', colored(placement === 'TECHO' ? 'SOTEMODUL' : 'SOFTMODUL', suffix), supportCount * units);
  pushBars(2, 'TUBO DE ENROLLE P801', bars.roll, (length) => `TURA80HG${length}C`, units, lengths.rollTubeLength);
  push(3, 'CASQUILLO PUNTA', tipBushing('P801').code, units);
  push(4, device === 'MAQUINA' ? 'CASQUILLO EJE 63MM Ø78' : 'SOPORTE UNIVERSAL HIPRO', device === 'MAQUINA' ? 'CASMAQEJE6378MM' : 'SOPORTEUNVHIPRO', units);
  pushBars(5, `BARRA DE CARGA ÁGATA ${submodel}`, bars.load, (length) => coloredStock(loadBarPrefix(submodel), suffix, length), units, lengths.loadBarLength);
  pushBars(6, 'BARRA CUADRADA 40x40x2', bars.square, (length) => coloredStock('TUBHI442', suffix, length), units, lengths.squareBarLength);
  push(5, 'TAPAS BARRA DE CARGA ÁGATA BOX', colored(submodel === 'COFRE' ? 'TAPAPFMODUL' : 'TARONDMOD', suffix), units);
  push(5, 'TAPAS ÁGATA BOX', colored(boxCapPrefix(submodel), suffix), units);
  onyxArmLines(suffix, awning.projection, armCount, units, awning.looseSide).forEach((item) => push(7, item.description, item.code, item.quantity, awning.projection));
  push(7, 'JUEGO TERMINAL ÁGATA BOX', colored('TERMIMODUL', suffix), Math.floor(armCount / 2) * units);
  if (device === 'MOTOR') {
    push(9, 'RUEDA MOTRIZ Ø78', 'RUEDAMOT78', units);
    push(10, `MOTOR SOMFY SUNILUS ${motorLabel(motorPower)} IO`, motorCode(motorPower), units);
    push(11, 'CORONA ADAPTADA LT60 A Ø78', 'CORONALT60DESC', units);
    push(11, 'KIT TORNILLOS FIJACION MOTOR MODULBOX', 'KITTORMODUL', units);
  } else {
    const height = Math.max(0, Number(awning.crankHeight) || 0);
    push(9, `MÁQUINA MB-11 L-120 ${lacado.crank}`, machineCode(lacado), units);
    push(10, `MANIVELA LUXE ${lacado.crank} ${height}`, `MANIVE${crankSuffix(lacado)}${height}C`, units, height);
  }
  pushBars(12, 'PERFIL LIRA ÁGATA BOX', bars.lira, (length) => coloredStock('PRLMODUL', suffix, length), units, lengths.liraLength);
  pushBars(13, 'PERFIL PROTECTOR DE LONA', bars.protector, (length) => `PRVMODUL${length}C`, units, lengths.protectorLength);
  if (submodel !== 'OPEN') {
    pushBars(14, 'PERFIL TEJADILLO ÁGATA BOX', bars.roof, (length) => coloredStock('PRTMODUL', suffix, length), units, lengths.enclosureLength);
    pushBars(15, 'PROTECTOR LONA TEJADILLO', bars.roofProtector, (length) => coloredStock('PRPLMODUL', suffix, length), units, lengths.enclosureLength);
    pushBars(16, 'PERFIL POSTERIOR ÁGATA BOX', bars.back, (length) => coloredStock('PRPMODUL', suffix, length), units, lengths.enclosureLength);
    pushBars(17, 'PERFIL SELLADOR ÁGATA BOX', bars.back, (length) => coloredStock('PRPMODUL', suffix, length), units, lengths.enclosureLength);
    push(18, 'SOPORTES DE CIERRE ÁGATA BOX', colored(submodel === 'COFRE' ? 'SOTLMODUL' : 'SOINMODU', suffix), profileSupportCount * units);
  }
  push(19, 'JUEGO SOPORTE PUNTA MÁQUINA ÁGATA BOX', colored('SOMPMODUL', suffix), units);
  if (submodel === 'COFRE') pushBars(20, 'PERFIL INFERIOR ÁGATA BOX', bars.bottom, (length) => coloredStock('PRIMODUL', suffix, length), 2 * units, lengths.enclosureLength);
  const wallEntry = behaviorData.options.tiposPared.find((item) => item.pared === awning.wallType);
  const anchoring = wallEntry ? { name: wallEntry.tornilleria, reference: wallEntry.referencia || null, units: wallEntry.unidades * units } : null;
  return { rows, anchoring };
}

// Barra de carga: con cofre, el perfil frontal PRMODUL; el resto, la redonda ROND-80.
// PRCOMODUL y PRSCMODUL no se consumen nunca.
function loadBarPrefix(submodel) {
  return submodel === 'COFRE' ? 'PRMODUL' : 'PRROMODUL';
}

function boxCapPrefix(submodel) {
  if (submodel === 'COFRE') return 'TAPAMODUL';
  if (submodel === 'OPEN') return 'TAPAOMODUL';
  return 'TAPSMODUL';
}

function colored(prefix, suffix, measurement = '', tail = '') {
  return suffix ? `${prefix}${suffix}${measurement}${tail}` : prefix;
}

function coloredStock(prefix, suffix, stockLength) {
  return suffix ? `${prefix}${suffix}${stockLength}C` : prefix;
}

// Barras de cada perfil del Ágata para su corte (Q-A06). Con un color sin ese perfil se
// toman los largos del blanco, que va a lacar.
function agataBars(suffix, lengths, submodel) {
  const colored = (prefix, cut) => barsForCut(profileLengthsOrWhite(prefix, suffix), cut);
  const closed = submodel !== 'OPEN';
  return {
    roll: barsForCut(P801_TUBE_LENGTHS, lengths.rollTubeLength),
    load: colored(loadBarPrefix(submodel), lengths.loadBarLength),
    square: colored('TUBHI442', lengths.squareBarLength),
    lira: colored('PRLMODUL', lengths.liraLength),
    protector: barsForCut(PRVMODUL_LENGTHS, lengths.protectorLength),
    roof: closed ? colored('PRTMODUL', lengths.enclosureLength) : [],
    roofProtector: closed ? colored('PRPLMODUL', lengths.enclosureLength) : [],
    back: closed ? colored('PRPMODUL', lengths.enclosureLength) : [],
    bottom: submodel === 'COFRE' ? colored('PRIMODUL', lengths.enclosureLength) : []
  };
}

// Una línea por largo de barra; con empalme, las barras que hagan falta por toldo.
function barLines(list, code, perAwning, description) {
  const counts = new Map();
  for (const length of list) counts.set(length, (counts.get(length) || 0) + 1);
  return [...counts].map(([length, count]) => ({ code: code(length), quantity: count * perAwning, description }));
}

// Taller, 30/09/2026 (Q-AG01): patines siempre, de codo (KIT PATINES BRAZO) y de horquilla
// (KIT PATINES SOPORTE BRAZO). Se consumen dos juegos de cada por toldo (9 de las 11 OF
// con patines desde 2023). En RPS solo siguen vivos el blanco y el negro (el de codo negro
// es PABMODULNEGR); los demás colores están de baja desde 2023 y van en blanco a lacar.
function patinLines(suffix, units) {
  const elbow = suffix === 'NE11' ? 'PABMODULNEGR' : colored('PABMODUL', suffix);
  return [
    { code: elbow, quantity: 2 * units, description: 'KIT PATINES BRAZO (CODO) ÁGATA BOX' },
    { code: colored('PASBMODUL', suffix), quantity: 2 * units, description: 'KIT PATINES SOPORTE BRAZO (HORQUILLA) ÁGATA BOX' }
  ];
}

// Kit de unión con más de 7 m de frente (Q-AG01): la regleta de unión de los perfiles y
// una bolsa de pasadores. Es lo que se consume en las 12 OF de más de 700 desde 2024.
// Patines y kit de unión van a la reserva, no al despiece (como las varillas): la hoja
// del Ágata ya llega a 26 filas y caben 28.
function joinKitLines(width, units) {
  if (!(Number(width) > 700)) return [];
  return [
    { code: 'KUNIONMODUL', quantity: units, description: 'KIT REGLETA UNIÓN PERFILES ÁGATA BOX' },
    { code: 'PASADORMODUL', quantity: units, description: 'BOLSA PASADORES ELÁSTICOS Ø4X40' }
  ];
}

// El Sunilus de 50, 100 y 120 solo existe a 12 rpm: SUNILUSIO100//17 no está en RPS.
const motorSpeedByPower = Object.freeze({ 50: 12, 100: 12, 120: 12 });
function motorLabel(power) { return `${power}/${motorSpeedByPower[power] || 17}`; }
function motorCode(power) { return `SUNILUSIO${motorLabel(power).replace('/', '//')}`; }

function resolveMotorPower(value, fallback) {
  const parsed = Number(String(value || '').match(/\d+/)?.[0]);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function normalizeDevice(value) {
  const clean = String(value || '').trim().toUpperCase();
  if (clean === 'MOTOR') return 'MOTOR';
  if (clean.includes('MAQ')) return 'MAQUINA';
  return '';
}

function normalizePlacement(value) {
  const clean = String(value || '').trim().toUpperCase();
  return ['FRONTAL', 'TECHO', 'ENTRE PAREDES'].includes(clean) ? clean : '';
}

function effectiveNumber(awning, field, fallback) { return effectiveOverride(awning, field, fallback); }

function sensorMaterial(value) {
  const sensor = String(value || '').trim().toUpperCase();
  if (sensor === 'MOVIMIENTO') return { code: 'EOLIS3DIO', description: 'EOLIS 3D WIREFREE IO' };
  if (sensor === 'EOLIS IO') return { code: 'EOLISSENSORIO', description: 'EOLIS SENSOR IO' };
  if (sensor === 'SOL') return { code: 'SUNISIIIO', description: 'SUNIS II IO' };
  return null;
}

function wallMaterial(wallType, units) {
  const wall = behaviorData.options.tiposPared.find((item) => item.pared === wallType);
  return wall?.referencia ? line(wall.referencia, wall.unidades * units, wall.tornilleria) : null;
}

function line(code, quantity, description) {
  return code ? { code, quantity, description } : null;
}

function buildDescription(awning, submodel, calculation) {
  const valance = Math.max(0, Number(awning.valanceHeight) || 0);
  const valanceText = valance > 0 ? ` · bambalina incluida de ${valance + 5} cm, hecha de ${valance} cm` : '';
  return `Toldo ÁGATA BOX ${submodel} ${awning.width}x${awning.projection} · tela ${formatNumber(calculation.fabricWidth)}x${formatNumber(calculation.fabricDrop)} · paño ${formatNumber(calculation.fabricMl)} ml${valanceText}`;
}

function round1(value) {
  return Math.round((Number(value) + Number.EPSILON) * 10) / 10;
}
