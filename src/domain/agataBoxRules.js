import { formatNumber } from './math.js';
import { resolveFabric } from './fabricCatalog.js';
import { calculateFabricUsage } from './fabricMath.js';
import { crankSuffix, machineCode, resolveLacado } from './lacados.js';
import behaviorData from './data/modelBehavior.json' with { type: 'json' };
import { resolveMotorRemote } from './motorAccessories.js';
import {
  agataBoxEstablishedProjections,
  normalizeAgataBoxParameters,
  normalizeAgataSubmodel,
  resolveAgataMinimumLine,
  resolveAgataMotorPower,
  suggestedAgataArmCount
} from './agataBoxParameters.js';

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
  const fabricDropRaw = Number(awning.projection) + dropAllowance + valance;
  const fabricDrop = round1(fabricDropRaw);
  const rollTubeLength = round1(Number(awning.width) - discounts.roll);
  const squareBarLength = round1(Number(awning.width) - discounts.squareBar);
  const loadBarLength = round1(Number(awning.width) - discounts.loadBar);
  const diffuserLength = round1(Number(awning.width) - discounts.diffuser);
  const liraLength = round1(Number(awning.width) - discounts.lira);
  const protectorLength = round1(Number(awning.width) - discounts.protector);
  const enclosureLength = submodel === 'OPEN' ? 0 : round1(Number(awning.width) - discounts.enclosure);
  const rollStockLength = chooseRollStock(rollTubeLength, parameters.rollStockLengths);
  const profileStockLength = parameters.profileStockLength;
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
  const valid = missingFields.length === 0
    && Boolean(fabric)
    && Boolean(rollStockLength)
    && Boolean(motorPower || device === 'MAQUINA')
    && !belowMinimum
    && !belowRequiredArms
    && !unsupportedMachineCofre
    && (!overMaximum || modified)
    && (!unsupportedProjection || modified);

  if (fabricSelection && !fabric) diagnostics.push({ level: 'error', awningId: awning.id, message: `Tela no encontrada en el catálogo: "${fabricSelection}".` });
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
    awning, device, placement, submodel, lacado, fabric, armCount, supportCount, profileSupportCount,
    rollStockLength, profileStockLength, motorPower, fabricMl: fabricUsage.ml,
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
      fabricWidth, fabricDrop, fabricMl: fabricUsage.ml, fabricPanels: fabricUsage.panels,
      fabricCode: fabric?.code || '', fabricDescription: fabric?.description || '', fabricRollWidth: fabric?.width || 120,
      structureLength: loadBarLength, rollTubeLength, stockLength: profileStockLength,
      profileStockLength, rollStockLength, motorPower: device === 'MOTOR' ? `${motorPower}/17` : '',
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
  const { awning, device, placement, submodel, lacado, fabric, armCount, supportCount, profileSupportCount, rollStockLength, profileStockLength, motorPower, fabricMl } = context;
  const units = Math.max(1, Number(awning.units) || 1);
  const suffix = lacado.suffix;
  const materials = [
    line(colored('SOBMODUL', suffix), supportCount * units, 'SOPORTES DE BRAZO ÁGATA BOX'),
    line(`TURA80HG${rollStockLength}C`, units, 'TUBO DE ENROLLE P801'),
    line('CASPUNCE', units, 'CASQUILLO PUNTA'),
    line(coloredStock(loadBarPrefix(submodel), suffix, profileStockLength), units, `BARRA DE CARGA ÁGATA ${submodel}`),
    line(coloredStock('TUBHI442', suffix, profileStockLength), units, 'BARRA CUADRADA 40x40x2'),
    line(colored('BONYX', suffix, awning.projection, 'C'), armCount * units, 'BRAZOS ONYX'),
    line(coloredStock('PRDLED', suffix, profileStockLength), units, 'PERFIL DIFUSOR ÁGATA BOX'),
    line(coloredStock('PRLMODUL', suffix, profileStockLength), units, 'PERFIL LIRA ÁGATA BOX'),
    line(`PRVMODUL${profileStockLength}C`, units, 'PERFIL PROTECTOR DE LONA'),
    line(colored('SOMPMODUL', suffix), 2 * units, 'SOPORTES DE PUNTA ÁGATA BOX')
  ];

  if (submodel !== 'OPEN') {
    materials.push(
      line(coloredStock('PRTMODUL', suffix, profileStockLength), units, 'PERFIL TEJADILLO ÁGATA BOX'),
      line(coloredStock('PRPLMODUL', suffix, profileStockLength), units, 'PROTECTOR LONA TEJADILLO'),
      line(coloredStock('PRPMODUL', suffix, profileStockLength), 2 * units, 'PERFIL POSTERIOR Y SELLADOR ÁGATA BOX'),
      line(colored(submodel === 'COFRE' ? 'SOTLMODUL' : 'SOINMODU', suffix), profileSupportCount * units, 'SOPORTES DE CIERRE ÁGATA BOX')
    );
  }
  if (submodel === 'COFRE') materials.push(line(coloredStock('PRIMODUL', suffix, profileStockLength), 2 * units, 'PERFIL INFERIOR ÁGATA BOX'));
  if (placement === 'TECHO') materials.push(line(colored('SOTEMODUL', suffix), supportCount * units, 'SOPORTE TECHO ÁGATA BOX'));

  if (device === 'MOTOR') {
    const remote = resolveMotorRemote(awning.sensor);
    const family = submodel === 'COFRE' ? 'SUNEAIO' : 'SUNILUSIO';
    materials.push(
      line(`${family}${motorPower}//17`, units, `MOTOR SOMFY ${submodel === 'COFRE' ? 'SUNEA' : 'SUNILUS'} ${motorPower}/17 IO`),
      line('RUEDAMOT78', units, 'RUEDA MOTRIZ Ø78'),
      line('CORONALT6078', units, 'CORONA LT60 ADAPTADA Ø78'),
      line('SOPORTEUNVHIPRO', units, 'SOPORTE UNIVERSAL HIPRO'),
      { ...line(remote.code, units, remote.description), aggregation: 'max' }
    );
    const sensor = sensorMaterial(awning.sensor);
    if (sensor) materials.push({ ...sensor, quantity: units, aggregation: 'max' });
  } else {
    const height = Math.max(0, Number(awning.crankHeight) || 0);
    materials.push(
      line(machineCode(lacado), units, `MAQUINA ZNP 10 L170 ${lacado.crank}`),
      line(`MANIVE${crankSuffix(lacado)}${height}C`, units, `MANIVELA LUXE ${lacado.crank} ${height}`),
      line('CASPLAS', units, 'TACO NAYLON MAQUINA'),
      line('CASMAQEJE6378MM', units, 'CASQUILLO EJE 63MM Ø78')
    );
  }
  if (fabric) materials.push(line(fabric.code, fabricMl, fabric.description));
  const wall = wallMaterial(awning.wallType, units);
  if (wall) materials.push(wall);
  return materials.filter(Boolean);
}

function buildDespiece(context) {
  const { awning, device, placement, submodel, lacado, armCount, supportCount, profileSupportCount, rollStockLength, profileStockLength, motorPower, lengths } = context;
  const units = Math.max(1, Number(awning.units) || 1);
  const suffix = lacado.suffix;
  const rows = [];
  const push = (num, name, reference, rowUnits, length = null) => rows.push({ num, name, reference: reference || null, units: rowUnits, length });
  push(1, 'SOPORTES DE BRAZO ÁGATA BOX', colored('SOBMODUL', suffix), supportCount * units);
  push(2, 'TUBO DE ENROLLE P801', `TURA80HG${rollStockLength}C`, units, lengths.rollTubeLength);
  push(3, 'CASQUILLO PUNTA', 'CASPUNCE', units);
  push(4, device === 'MAQUINA' ? 'CASQUILLO EJE 63MM Ø78' : 'SOPORTE UNIVERSAL HIPRO', device === 'MAQUINA' ? 'CASMAQEJE6378MM' : 'SOPORTEUNVHIPRO', units);
  push(5, `BARRA DE CARGA ÁGATA ${submodel}`, coloredStock(loadBarPrefix(submodel), suffix, profileStockLength), units, lengths.loadBarLength);
  push(6, 'BARRA CUADRADA 40x40x2', coloredStock('TUBHI442', suffix, profileStockLength), units, lengths.squareBarLength);
  push(7, 'BRAZOS ONYX', colored('BONYX', suffix, awning.projection, 'C'), armCount * units, awning.projection);
  push(8, 'PERFIL DIFUSOR ÁGATA BOX', coloredStock('PRDLED', suffix, profileStockLength), units, lengths.diffuserLength);
  if (device === 'MOTOR') {
    const family = submodel === 'COFRE' ? 'SUNEAIO' : 'SUNILUSIO';
    push(9, 'RUEDA MOTRIZ Ø78', 'RUEDAMOT78', units);
    push(10, `MOTOR SOMFY ${submodel === 'COFRE' ? 'SUNEA' : 'SUNILUS'} ${motorPower}/17 IO`, `${family}${motorPower}//17`, units);
    push(11, 'CORONA LT60 ADAPTADA Ø78', 'CORONALT6078', units);
  } else {
    const height = Math.max(0, Number(awning.crankHeight) || 0);
    push(9, `MAQUINA ZNP 10 L170 ${lacado.crank}`, machineCode(lacado), units);
    push(10, `MANIVELA LUXE ${lacado.crank} ${height}`, `MANIVE${crankSuffix(lacado)}${height}C`, units, height);
    push(11, 'TACO NAYLON MAQUINA', 'CASPLAS', units);
  }
  push(12, 'PERFIL LIRA ÁGATA BOX', coloredStock('PRLMODUL', suffix, profileStockLength), units, lengths.liraLength);
  push(13, 'PERFIL PROTECTOR DE LONA', `PRVMODUL${profileStockLength}C`, units, lengths.protectorLength);
  if (submodel !== 'OPEN') {
    push(14, 'PERFIL TEJADILLO ÁGATA BOX', coloredStock('PRTMODUL', suffix, profileStockLength), units, lengths.enclosureLength);
    push(15, 'PROTECTOR LONA TEJADILLO', coloredStock('PRPLMODUL', suffix, profileStockLength), units, lengths.enclosureLength);
    push(16, 'PERFIL POSTERIOR ÁGATA BOX', coloredStock('PRPMODUL', suffix, profileStockLength), units, lengths.enclosureLength);
    push(17, 'PERFIL SELLADOR ÁGATA BOX', coloredStock('PRPMODUL', suffix, profileStockLength), units, lengths.enclosureLength);
    push(18, 'SOPORTES DE CIERRE ÁGATA BOX', colored(submodel === 'COFRE' ? 'SOTLMODUL' : 'SOINMODU', suffix), profileSupportCount * units);
  }
  push(19, 'SOPORTES DE PUNTA ÁGATA BOX', colored('SOMPMODUL', suffix), 2 * units);
  if (submodel === 'COFRE') push(20, 'PERFIL INFERIOR ÁGATA BOX', coloredStock('PRIMODUL', suffix, profileStockLength), 2 * units, lengths.enclosureLength);
  if (placement === 'TECHO') push(21, 'SOPORTE TECHO ÁGATA BOX', colored('SOTEMODUL', suffix), supportCount * units);
  const wallEntry = behaviorData.options.tiposPared.find((item) => item.pared === awning.wallType);
  const anchoring = wallEntry ? { name: wallEntry.tornilleria, reference: wallEntry.referencia || null, units: wallEntry.unidades * units } : null;
  return { rows, anchoring };
}

function loadBarPrefix(submodel) {
  if (submodel === 'COFRE') return 'PRCOMODUL';
  if (submodel === 'SEMI') return 'PRSCMODUL';
  return 'PRROMODUL';
}

function colored(prefix, suffix, measurement = '', tail = '') {
  return suffix ? `${prefix}${suffix}${measurement}${tail}` : prefix;
}

function coloredStock(prefix, suffix, stockLength) {
  return suffix ? `${prefix}${suffix}${stockLength}C` : prefix;
}

function chooseRollStock(length, stockLengths) {
  return stockLengths.find((stock) => stock >= length) || stockLengths[stockLengths.length - 1] || null;
}

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

function effectiveNumber(awning, field, fallback) {
  const override = awning[field];
  return awning.reglasModificadas && override !== null && override !== undefined && Number.isFinite(Number(override))
    ? Math.max(0, Number(override))
    : Number(fallback) || 0;
}

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
