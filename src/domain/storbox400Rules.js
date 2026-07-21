import { formatNumber } from './math.js';
import { resolveFabric } from './fabricCatalog.js';
import { calculateFabricUsage } from './fabricMath.js';
import { crankSuffix, resolveLacado } from './lacados.js';
import behaviorData from './data/modelBehavior.json' with { type: 'json' };
import { resolveMotorRemote } from './motorAccessories.js';
import {
  normalizeCoralBoxParameters,
  normalizePerlaBoxParameters,
  resolveBoxMotorPower
} from './storbox400Parameters.js';

const configs = {
  perla: {
    model: 'PERLA BOX', parameterKey: 'perlaBox', normalize: normalizePerlaBoxParameters,
    supportPrefix: 'SOSTORBS300', profilePrefix: 'PRBOXS300', capPrefix: 'TAPBS300',
    pieceName: 'STORBOX S-300', reserveKitParts: false, motorWheelUnits: 2,
    sharedMotorAccessories: false, rollTubeUnits: 2, reserveTipBushing: false
  },
  coral: {
    model: 'CORAL BOX', parameterKey: 'coralBox', normalize: normalizeCoralBoxParameters,
    supportPrefix: 'SOSTORB400', profilePrefix: 'PRBOX400',
    capPrefix: { MOTOR: 'TAPAMOBOX400', MAQUINA: 'TAPAMAEBOX400' },
    pieceName: 'STORBOX 400', reserveKitParts: true, motorWheelUnits: 1,
    sharedMotorAccessories: true, rollTubeUnits: 1, reserveTipBushing: true
  }
};

export function calculatePerlaBox(input) {
  return calculateBox(input, configs.perla);
}

export function calculateCoralBox(input) {
  return calculateBox(input, configs.coral);
}

function calculateBox({ order, awning }, config) {
  const parameters = config.normalize(order.parameters?.[config.parameterKey]);
  const structureColor = awning.structureColor || order.structureColor;
  const lacado = resolveLacado(structureColor);
  const device = normalizeDevice(awning.device);
  const fabricSelection = order.sameFabric !== false ? order.fabric : awning.fabric;
  const fabric = fabricSelection ? resolveFabric(fabricSelection) : null;
  const missingFields = [];
  const diagnostics = [];

  if (!structureColor) missingFields.push('lacado');
  if (!fabricSelection) missingFields.push('tela');
  if (!device) missingFields.push('dispositivo válido');
  if (device === 'MAQUINA' && !awning.crankHeight) missingFields.push('altura de manivela');

  const standardMinimumLine = lookupMinimumLine(parameters.minimumLineByProjection, awning.projection, device);
  const minimumLine = effectiveNumber(awning, 'boxMinimumLineCm', standardMinimumLine);
  const belowMinimum = Number(awning.width) < minimumLine;
  const overMaximum = Number(awning.width) > parameters.standardMaxWidth;
  const modified = Boolean(awning.reglasModificadas);
  const profileDiscount = effectiveNumber(awning, 'boxProfileDiscountCm', parameters.profileDiscountCm[device || 'MOTOR']);
  const rollDiscount = effectiveNumber(awning, 'boxRollDiscountCm', parameters.rollDiscountCm[device || 'MOTOR']);
  const fabricWidthDiscount = effectiveNumber(awning, 'boxFabricWidthDiscountCm', parameters.fabricWidthDiscountCm[device || 'MOTOR']);
  const protectorDiscount = effectiveNumber(awning, 'boxProtectorDiscountCm', parameters.protectorDiscountCm[device || 'MOTOR']);
  const structureLength = round1(awning.width - profileDiscount);
  const rollTubeLength = round1(awning.width - rollDiscount);
  const fabricWidth = round1(awning.width - fabricWidthDiscount);
  const protectorLength = round1(awning.width - protectorDiscount);
  const valance = Math.max(0, Number(awning.valanceHeight) || 0);
  const fabricDrop = round1(awning.projection + parameters.fabricDropAllowanceCm + valance);
  const fabricUsage = calculateFabricUsage({
    width: fabricWidth,
    drop: fabricDrop,
    units: awning.units,
    rollWidth: fabric?.width || 120,
    seamAllowanceCm: parameters.seamAllowanceCm,
    seamBaseCm: parameters.seamBaseCm
  });
  const stockLength = chooseStockLength(Math.max(structureLength, rollTubeLength, protectorLength), parameters.stockLengths);
  const automaticMotorPower = resolveBoxMotorPower(awning.projection, parameters);
  const motorPower = effectiveMotorPower(awning, automaticMotorPower);
  const valid = missingFields.length === 0
    && Boolean(fabric)
    && !belowMinimum
    && Boolean(stockLength)
    && (!overMaximum || modified);

  if (fabricSelection && !fabric) {
    diagnostics.push({ level: 'error', awningId: awning.id, message: `Tela no encontrada en el catálogo: "${fabricSelection}".` });
  }
  if (missingFields.length) {
    diagnostics.push({ level: 'error', awningId: awning.id, message: `${config.model} incompleto en OF ${awning.of}: falta ${missingFields.join(' y ')}.` });
  } else if (belowMinimum) {
    diagnostics.push({ level: 'error', awningId: awning.id, message: `${config.model} no válido: frente ${awning.width} cm, mínimo ${minimumLine} cm para salida ${awning.projection} y ${device}.` });
  } else if (overMaximum && !modified) {
    diagnostics.push({ level: 'error', awningId: awning.id, message: `${config.model} no válido: frente ${awning.width} cm supera el máximo estándar de ${parameters.standardMaxWidth} cm.` });
  } else if (!stockLength) {
    diagnostics.push({ level: 'error', awningId: awning.id, message: `${config.model} no válido: ningún largo de stock configurado admite ${Math.max(structureLength, rollTubeLength, protectorLength)} cm.` });
  } else if (modified) {
    diagnostics.push({ level: 'warn', awningId: awning.id, message: `Excepción técnica en OF ${awning.of}: reglas de ${config.model} modificadas.` });
  }

  const context = {
    awning, lacado, device, fabric, stockLength, structureLength, rollTubeLength, protectorLength, config,
    motorPower, fabricMl: fabricUsage.ml
  };
  return {
    of: awning.of,
    description: buildDescription(awning, { fabricWidth, fabricDrop, fabricMl: fabricUsage.ml }, config.model),
    materials: valid ? buildMaterials(context) : [],
    despiece: valid ? buildDespiece(context) : null,
    diagnostics,
    calculation: {
      model: config.model, valid, minimumLine,
      width: awning.width, projection: awning.projection,
      fabricWidth, fabricDrop, fabricMl: fabricUsage.ml, fabricPanels: fabricUsage.panels,
      fabricCode: fabric?.code || '', fabricDescription: fabric?.description || '',
      fabricRollWidth: fabric?.width || 120,
      structureLength, rollTubeLength, stockLength,
      motorPower: device === 'MOTOR' ? `${motorPower}/17` : '', armCount: 1,
      boxMinimumLineCm: minimumLine,
      boxProfileDiscountCm: profileDiscount,
      boxRollDiscountCm: rollDiscount,
      boxFabricWidthDiscountCm: fabricWidthDiscount,
      boxProtectorDiscountCm: protectorDiscount
    }
  };
}

const refSupport = (config, suffix) => `${config.supportPrefix}${suffix}`;
const refRollTube = (stockLength) => `TURA80HG${stockLength}C`;
const refProfiles = (config, suffix, stockLength) => `${config.profilePrefix}${suffix}${stockLength}C`;
const refCaps = (config, device, suffix) => `${typeof config.capPrefix === 'string' ? config.capPrefix : config.capPrefix[device]}${suffix}`;
const refArm = (suffix, projection) => `BONYX${suffix}${projection}C`;
const refCrank = (lacado, height) => `MANIVE${crankSuffix(lacado)}${height}C`;
const machineCode = (lacado) => lacado.crank === 'BLANCA' ? 'MAQMB9L13BLAN' : 'MAQMB9L13NEGR';

function buildMaterials(context) {
  const { awning, lacado, device, fabric, stockLength, motorPower, fabricMl, config } = context;
  const units = Math.max(1, Number(awning.units) || 1);
  const suffix = lacado.suffix;
  const materials = [];
  if (config.reserveKitParts) materials.push({ code: refSupport(config, suffix), quantity: units, description: `JUEGO SOPORTE ${config.pieceName}` });
  materials.push({ code: refRollTube(stockLength), quantity: config.rollTubeUnits * units, description: 'TUBO DE ENROLLE P801' });
  if (config.reserveTipBushing) materials.push({ code: 'CASPUNCE', quantity: units, description: 'CASQUILLO PUNTA' });
  if (config.reserveKitParts) {
    materials.push(
      { code: refProfiles(config, suffix, stockLength), quantity: units, description: `KIT PERFILES ${config.pieceName}` },
      { code: refCaps(config, device, suffix), quantity: units, description: `KIT TAPAS ${device} ${config.pieceName}` }
    );
  }
  materials.push({ code: refArm(suffix, awning.projection), quantity: units, description: 'JUEGO DE BRAZOS ONYX' });

  if (device === 'MOTOR') {
    const remote = resolveMotorRemote(awning.sensor);
    const sharedAccessory = config.sharedMotorAccessories ? { aggregation: 'max' } : {};
    materials.push(
      { code: 'RUEDAMOT78', quantity: config.motorWheelUnits * units, description: 'RUEDA MOTRIZ Ø 78' },
      { code: `SUNEAIO${motorPower}//17`, quantity: units, description: `MOTOR SOMFY SUNEA ${motorPower}/17 IO` },
      { code: 'CORONALT6078', quantity: units, description: 'CORONA LT 60 ADAPTADA Ø 78' },
      { code: 'SOPORTEUNVHIPRO', quantity: units, description: 'SOPORTE UNIVERSAL HIPRO' },
      { code: remote.code, quantity: units, description: remote.description, ...sharedAccessory }
    );
    const sensor = sensorMaterial(awning.sensor);
    if (sensor) materials.push({ ...sensor, quantity: units, ...sharedAccessory });
  } else {
    const crankHeight = Math.max(0, Number(awning.crankHeight) || 0);
    materials.push(
      { code: 'CASTRAEX80', quantity: units, description: 'CASQUILLO EJE 81MM' },
      { code: machineCode(lacado), quantity: units, description: `MAQUINA MB-99L130 ${lacado.crank}` },
      { code: refCrank(lacado, crankHeight), quantity: units, description: `MANIVELA LUXE ${lacado.crank} ${crankHeight}` },
      { code: 'CASPLAS', quantity: units, description: 'TACO NAYLON MAQUINA' }
    );
  }
  materials.push({ code: 'PRPROMA13600C', quantity: units, description: 'PERFIL PROTECTOR LONA' });
  if (fabric) materials.push({ code: fabric.code, quantity: fabricMl, description: fabric.description });

  const wallEntry = behaviorData.options.tiposPared.find((item) => item.pared === awning.wallType);
  if (wallEntry?.referencia) materials.push({ code: wallEntry.referencia, quantity: wallEntry.unidades * units, description: wallEntry.tornilleria });
  return materials;
}

function buildDespiece(context) {
  const { awning, lacado, device, stockLength, structureLength, rollTubeLength, protectorLength, motorPower, config } = context;
  const units = Math.max(1, Number(awning.units) || 1);
  const suffix = lacado.suffix;
  const rows = [];
  const push = (num, name, reference, rowUnits, length = null) => rows.push({ num, name, reference, units: rowUnits, length });

  push(1, `JUEGO SOPORTE ${config.pieceName}`, refSupport(config, suffix), units);
  push(2, 'TUBO DE ENROLLE P801', refRollTube(stockLength), units, rollTubeLength);
  push(3, 'CASQUILLO PUNTA', 'CASPUNCE', units);
  push(4, device === 'MOTOR' ? 'RUEDA MOTRIZ Ø 78' : 'CASQUILLO EJE 81MM', device === 'MOTOR' ? 'RUEDAMOT78' : 'CASTRAEX80', units);
  push(5, `KIT PERFILES ${config.pieceName}`, refProfiles(config, suffix, stockLength), units, structureLength);
  push(6, `KIT TAPAS ${device} ${config.pieceName}`, refCaps(config, device, suffix), units);
  push(7, 'JUEGO DE BRAZOS ONYX', refArm(suffix, awning.projection), units, awning.projection);
  push(8, 'JUEGO DE TERMINALES', null, units);
  if (device === 'MOTOR') {
    const remote = resolveMotorRemote(awning.sensor);
    push(9, 'RUEDA MOTRIZ Ø 78', 'RUEDAMOT78', units);
    push(10, `MOTOR SOMFY SUNEA ${motorPower}/17 IO`, `SUNEAIO${motorPower}//17`, units);
    push(11, 'CORONA LT 60 ADAPTADA Ø 78', 'CORONALT6078', units);
    push(12, 'SOPORTE UNIVERSAL HIPRO', 'SOPORTEUNVHIPRO', units);
    push(21, remote.description, remote.code, units);
    const sensor = sensorMaterial(awning.sensor);
    if (sensor) push(22, sensor.description, sensor.code, units);
  } else {
    const height = Math.max(0, Number(awning.crankHeight) || 0);
    push(9, `MAQUINA MB-99L130 ${lacado.crank}`, machineCode(lacado), units);
    push(10, `MANIVELA LUXE ${lacado.crank} ${height}`, refCrank(lacado, height), units, height);
    push(11, 'TACO NAYLON MAQUINA', 'CASPLAS', units);
    push(12, 'KIT DE TORNILLOS MAQUINA', null, units);
  }
  push(13, 'PERFIL PROTECTOR LONA', 'PRPROMA13600C', units, protectorLength);

  const wallEntry = behaviorData.options.tiposPared.find((item) => item.pared === awning.wallType);
  const anchoring = wallEntry
    ? { name: wallEntry.tornilleria, reference: wallEntry.referencia || null, units: wallEntry.unidades * units }
    : null;
  return { rows, anchoring };
}

function sensorMaterial(value) {
  const sensor = String(value || '').trim().toUpperCase();
  if (sensor === 'MOVIMIENTO') return { code: 'EOLIS3DIO', description: 'EOLIS 3D WIREFREE IO' };
  if (sensor === 'EOLIS IO') return { code: 'EOLISSENSORIO', description: 'EOLIS SENSOR IO' };
  if (sensor === 'SOL') return { code: 'SUNISIIIO', description: 'SUNIS II IO' };
  return null;
}

function lookupMinimumLine(rows, projection, device) {
  const exact = rows.find((item) => item.projection === Number(projection));
  const next = rows.find((item) => item.projection >= Number(projection));
  const row = exact || next || rows[rows.length - 1];
  return row.values[device || 'MOTOR'];
}

function normalizeDevice(value) {
  const clean = String(value || '').trim().toUpperCase();
  if (clean === 'MOTOR') return 'MOTOR';
  if (clean.includes('MAQ')) return 'MAQUINA';
  return '';
}

function effectiveNumber(awning, field, fallback) {
  const override = awning[field];
  return awning.reglasModificadas && override !== null && override !== undefined && Number.isFinite(Number(override))
    ? Math.max(0, Number(override))
    : Number(fallback) || 0;
}

function effectiveMotorPower(awning, fallback) {
  if (!awning.reglasModificadas) return fallback;
  const parsed = Number.parseInt(String(awning.motorPower || ''), 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function chooseStockLength(length, stockLengths) {
  return stockLengths.find((item) => item >= length) || null;
}

function buildDescription(awning, calculation, model) {
  const valance = Math.max(0, Number(awning.valanceHeight) || 0);
  const valanceText = valance > 0 ? ` · bambalina incluida de ${valance + 5} cm, hecha de ${valance} cm` : '';
  return `Toldo ${model} ${awning.width}x${awning.projection} · tela ${formatNumber(calculation.fabricWidth)}x${formatNumber(calculation.fabricDrop)} · paño ${formatNumber(calculation.fabricMl)} ml${valanceText}`;
}

function round1(value) {
  return Math.round(Number(value) * 10) / 10;
}
