import { formatNumber } from './math.js';
import { resolveFabric } from './fabricCatalog.js';
import { calculateFabricUsage } from './fabricMath.js';
import { crankSuffix, machineCode, resolveLacado } from './lacados.js';
import behaviorData from './data/modelBehavior.json' with { type: 'json' };
import { resolveMotorRemote } from './motorAccessories.js';
import { normalizeCuarzoBoxParameters } from './storbox250Parameters.js';

export function calculateCuarzoBox({ order, awning }) {
  const parameters = normalizeCuarzoBoxParameters(order.parameters?.cuarzoBox);
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

  const minimumLine = effectiveNumber(
    awning,
    'boxMinimumLineCm',
    lookupMinimumLine(parameters.minimumLineByProjection, awning.projection, device)
  );
  const profileDiscount = effectiveNumber(awning, 'boxProfileDiscountCm', parameters.profileDiscountCm[device || 'MOTOR']);
  const rollDiscount = effectiveNumber(awning, 'boxRollDiscountCm', parameters.rollDiscountCm[device || 'MOTOR']);
  const fabricWidthDiscount = effectiveNumber(awning, 'boxFabricWidthDiscountCm', parameters.fabricWidthDiscountCm[device || 'MOTOR']);
  const loadBarDiscount = effectiveNumber(awning, 'boxProtectorDiscountCm', parameters.protectorDiscountCm[device || 'MOTOR']);
  const structureLength = round1(awning.width - profileDiscount);
  const rollTubeLength = round1(awning.width - rollDiscount);
  const fabricWidth = round1(awning.width - fabricWidthDiscount);
  const loadBarLength = round1(awning.width - loadBarDiscount);
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
  const stockLength = parameters.stockLengths.find((item) => item >= Math.max(structureLength, loadBarLength)) || null;
  const belowMinimum = Number(awning.width) < minimumLine;
  const overMaximum = Number(awning.width) > parameters.standardMaxWidth;
  const modified = Boolean(awning.reglasModificadas);
  const valid = missingFields.length === 0
    && Boolean(fabric)
    && !belowMinimum
    && Boolean(stockLength)
    && (!overMaximum || modified);

  if (fabricSelection && !fabric) {
    diagnostics.push({ level: 'error', awningId: awning.id, message: `Tela no encontrada en el catálogo: "${fabricSelection}".` });
  }
  if (missingFields.length) {
    diagnostics.push({ level: 'error', awningId: awning.id, message: `CUARZO BOX incompleto en OF ${awning.of}: falta ${missingFields.join(' y ')}.` });
  } else if (belowMinimum) {
    diagnostics.push({ level: 'error', awningId: awning.id, message: `CUARZO BOX no válido: frente ${awning.width} cm, mínimo ${minimumLine} cm para salida ${awning.projection}.` });
  } else if (overMaximum && !modified) {
    diagnostics.push({ level: 'error', awningId: awning.id, message: `CUARZO BOX no válido: frente ${awning.width} cm supera el máximo estándar de ${parameters.standardMaxWidth} cm.` });
  } else if (!stockLength) {
    diagnostics.push({ level: 'error', awningId: awning.id, message: `CUARZO BOX no válido: ningún perfil configurado admite ${Math.max(structureLength, loadBarLength)} cm.` });
  } else if (modified) {
    diagnostics.push({ level: 'warn', awningId: awning.id, message: `Excepción técnica en OF ${awning.of}: reglas de CUARZO BOX modificadas.` });
  }

  const motorPower = effectiveMotorPower(awning, 35);
  const context = {
    awning, lacado, device, fabric, stockLength, structureLength, rollTubeLength,
    loadBarLength, motorPower, fabricMl: fabricUsage.ml
  };
  return {
    of: awning.of,
    description: buildDescription(awning, { fabricWidth, fabricDrop, fabricMl: fabricUsage.ml }),
    materials: valid ? buildMaterials(context) : [],
    despiece: valid ? buildDespiece(context) : null,
    diagnostics,
    calculation: {
      model: 'CUARZO BOX', valid, minimumLine,
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
      boxProtectorDiscountCm: loadBarDiscount
    }
  };
}

function buildMaterials(context) {
  const { awning, lacado, device, fabric, stockLength, fabricMl } = context;
  const units = Math.max(1, Number(awning.units) || 1);
  const materials = [
    { code: 'TURA70HG600C', quantity: units, description: 'TUBO DE ENROLLE P701' },
    { code: 'CASPUNCE', quantity: units, description: 'CASQUILLO PUNTA' },
    { code: `PSBOX250${lacado.suffix}${stockLength}C`, quantity: units, description: 'KIT PERFILES ALUMINIO STORBOX250' },
    { code: `BART25${lacado.suffix}${awning.projection}C`, quantity: units, description: 'JUEGO DE BRAZOS ART250' }
  ];

  if (device === 'MOTOR') {
    const remote = resolveMotorRemote(awning.sensor);
    materials.push(
      { code: 'SOPORTEUNVHIPRO', quantity: units, description: 'SOPORTE UNIVERSAL HIPRO' },
      { code: 'CORONA LT5070', quantity: units, description: 'CORONA LT50 ADAPTADA Ø70' },
      { code: remote.code, quantity: units, description: remote.description }
    );
    const sensor = sensorMaterial(awning.sensor);
    if (sensor) materials.push({ ...sensor, quantity: units });
  } else {
    const crankHeight = Math.max(0, Number(awning.crankHeight) || 0);
    materials.push(
      { code: `MANIVE${crankSuffix(lacado)}${crankHeight}C`, quantity: units, description: `MANIVELA LUXE ${lacado.crank} ${crankHeight}` },
      { code: machineCode(lacado), quantity: units, description: `MAQUINA ZNP 10 L170 ${lacado.crank}` },
      { code: 'CASPLAS', quantity: units, description: 'TACO NAYLON MAQUINA' }
    );
  }
  if (fabric) materials.push({ code: fabric.code, quantity: fabricMl, description: fabric.description });

  const wallEntry = behaviorData.options.tiposPared.find((item) => item.pared === awning.wallType);
  if (wallEntry?.referencia) materials.push({ code: wallEntry.referencia, quantity: wallEntry.unidades * units, description: wallEntry.tornilleria });
  return materials;
}

function buildDespiece(context) {
  const { awning, lacado, device, stockLength, structureLength, rollTubeLength, loadBarLength, motorPower } = context;
  const units = Math.max(1, Number(awning.units) || 1);
  const rows = [];
  const push = (num, name, reference, rowUnits, length = null) => rows.push({ num, name, reference, units: rowUnits, length });

  push(1, 'JUEGO SOPORTE STORBOX250', null, units);
  push(2, 'TUBO DE ENROLLE P701', 'TURA70HG600C', units, rollTubeLength);
  push(3, 'CASQUILLO PUNTA', 'CASPUNCE', units);
  push(5, 'KIT PERFILES ALUMINIO STORBOX250', `PSBOX250${lacado.suffix}${stockLength}C`, units, structureLength);
  push(6, 'TAPAS DE ALUMINIO', null, units);
  push(7, 'JUEGO DE BRAZOS ART250', `BART25${lacado.suffix}${awning.projection}C`, units, awning.projection);
  push(8, 'BARRA DE CARGA STORBOX 250', null, units, loadBarLength);
  push(9, 'JUEGO DE TERMINALES', null, units);
  if (device === 'MOTOR') {
    const remote = resolveMotorRemote(awning.sensor);
    push(10, `MOTOR SOMFY SUNEA ${motorPower}/17 IO`, null, units);
    push(11, 'SOPORTE UNIVERSAL HIPRO', 'SOPORTEUNVHIPRO', units);
    push(12, 'CORONA LT50 ADAPTADA Ø70', 'CORONA LT5070', units);
    push(13, 'RUEDA MOTRIZ LT50', 'ADAPTADORESTUBO70', 0);
    push(21, remote.description, remote.code, units);
    const sensor = sensorMaterial(awning.sensor);
    if (sensor) push(22, sensor.description, sensor.code, units);
  } else {
    const crankHeight = Math.max(0, Number(awning.crankHeight) || 0);
    push(10, `MANIVELA LUXE ${lacado.crank} ${crankHeight}`, `MANIVE${crankSuffix(lacado)}${crankHeight}C`, units, crankHeight);
    push(11, `MAQUINA ZNP 10 L170 ${lacado.crank}`, machineCode(lacado), units);
    push(12, 'TACO NAYLON MAQUINA', 'CASPLAS', units);
    push(13, 'CASQUILLO EJE 63MM Ø70', 'CASMAQEJE6370MM', 0);
  }

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

function buildDescription(awning, calculation) {
  const valance = Math.max(0, Number(awning.valanceHeight) || 0);
  const valanceText = valance > 0 ? ` · bambalina incluida de ${valance + 5} cm, hecha de ${valance} cm` : '';
  return `Toldo CUARZO BOX ${awning.width}x${awning.projection} · tela ${formatNumber(calculation.fabricWidth)}x${formatNumber(calculation.fabricDrop)} · paño ${formatNumber(calculation.fabricMl)} ml${valanceText}`;
}

function round1(value) {
  return Math.round(Number(value) * 10) / 10;
}
