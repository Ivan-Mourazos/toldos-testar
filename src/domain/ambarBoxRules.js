import { formatNumber } from './math.js';
import { resolveFabric } from './fabricCatalog.js';
import { calculateFabricUsage } from './fabricMath.js';
import { crankSuffix, machineCode, resolveLacado } from './lacados.js';
import behaviorData from './data/modelBehavior.json' with { type: 'json' };
import { resolveMotorRemote } from './motorAccessories.js';
import { ambarPlacementGroup, normalizeAmbarBoxParameters } from './ambarBoxParameters.js';

export function calculateAmbarBox({ order, awning }) {
  const parameters = normalizeAmbarBoxParameters(order.parameters?.ambarBox);
  const structureColor = awning.structureColor || order.structureColor;
  const lacado = resolveLacado(structureColor);
  const device = normalizeDevice(awning.device);
  const placement = normalizePlacement(awning.placement);
  const placementGroup = ambarPlacementGroup(placement);
  const fabricSelection = order.sameFabric !== false ? order.fabric : awning.fabric;
  const fabric = fabricSelection ? resolveFabric(fabricSelection) : null;
  const modified = Boolean(awning.reglasModificadas);
  const diagnostics = [];
  const missingFields = [];

  if (!structureColor) missingFields.push('lacado');
  if (!fabricSelection) missingFields.push('tela');
  if (!device) missingFields.push('dispositivo válido');
  if (!placement) missingFields.push('colocación');
  if (device === 'MAQUINA' && !awning.crankHeight) missingFields.push('altura de manivela');

  const discounts = {
    fabric: effectiveNumber(awning, 'ambarFabricWidthDiscountCm', parameters.fabricWidthDiscounts[placementGroup][device || 'MAQUINA']),
    roll: effectiveNumber(awning, 'ambarRollDiscountCm', parameters.rollTubeDiscounts[placementGroup][device || 'MAQUINA']),
    profile: effectiveNumber(awning, 'ambarProfileDiscountCm', parameters.profileDiscounts[placementGroup][device || 'MAQUINA'])
  };
  const dropMultiplier = effectiveNumber(awning, 'ambarFabricDropMultiplier', parameters.fabricDropMultiplier);
  const dropAllowance = effectiveNumber(awning, 'ambarFabricDropAllowanceCm', parameters.fabricDropAllowanceCm);
  const valance = Math.max(0, Number(awning.valanceHeight) || 0);
  const fabricWidth = round1(Number(awning.width) - discounts.fabric);
  const fabricDropRaw = Number(awning.projection) * dropMultiplier + dropAllowance + valance;
  const fabricDrop = round1(fabricDropRaw);
  const rollTubeLength = round1(Number(awning.width) - discounts.roll);
  const structureLength = round1(Number(awning.width) - discounts.profile);
  const profileStockLength = chooseStock(structureLength, parameters.profileStockLengths);
  const rollStockLength = chooseStock(rollTubeLength, parameters.rollStockLengths);
  const fabricUsage = calculateFabricUsage({
    width: fabricWidth,
    drop: fabricDropRaw,
    units: awning.units,
    rollWidth: fabric?.width || 120,
    seamAllowanceCm: parameters.seamAllowanceCm,
    seamBaseCm: parameters.seamBaseCm
  });
  const overMaximum = Number(awning.width) > parameters.standardMaxWidth;
  const unsupportedProjection = ![80, 90, 100, 110, 120, 130, 140].includes(Number(awning.projection));
  const valid = missingFields.length === 0
    && Boolean(fabric)
    && Boolean(profileStockLength)
    && Boolean(rollStockLength)
    && (!overMaximum || modified)
    && (!unsupportedProjection || modified);

  if (fabricSelection && !fabric) diagnostics.push({ level: 'error', awningId: awning.id, message: `Tela no encontrada en el catálogo: "${fabricSelection}".` });
  if (missingFields.length) {
    diagnostics.push({ level: 'error', awningId: awning.id, message: `ÁMBAR BOX incompleto en OF ${awning.of}: falta ${missingFields.join(' y ')}.` });
  } else if (overMaximum && !modified) {
    diagnostics.push({ level: 'error', awningId: awning.id, message: `ÁMBAR BOX no válido: frente ${awning.width} cm supera el máximo estándar de ${parameters.standardMaxWidth} cm.` });
  } else if (unsupportedProjection && !modified) {
    diagnostics.push({ level: 'error', awningId: awning.id, message: `ÁMBAR BOX no válido: salida ${awning.projection} cm no está en la serie 80–140 cm.` });
  } else if (!profileStockLength || !rollStockLength) {
    diagnostics.push({ level: 'error', awningId: awning.id, message: `ÁMBAR BOX no válido: ningún largo de stock admite las piezas calculadas.` });
  } else if (modified) {
    diagnostics.push({ level: 'warn', awningId: awning.id, message: `Excepción técnica en OF ${awning.of}: reglas de ÁMBAR BOX modificadas.` });
  }

  const context = {
    awning, device, placement, lacado, fabric, profileStockLength, rollStockLength,
    structureLength, rollTubeLength, fabricMl: fabricUsage.ml, motorPower: parameters.motorPower
  };
  return {
    of: awning.of,
    description: buildDescription(awning, { fabricWidth, fabricDrop, fabricMl: fabricUsage.ml }),
    materials: valid ? buildMaterials(context) : [],
    despiece: valid ? buildDespiece(context) : null,
    diagnostics,
    calculation: {
      model: 'AMBAR BOX', valid, minimumLine: 0,
      width: awning.width, projection: awning.projection,
      fabricWidth, fabricDrop, fabricMl: fabricUsage.ml, fabricPanels: fabricUsage.panels,
      fabricCode: fabric?.code || '', fabricDescription: fabric?.description || '',
      fabricRollWidth: fabric?.width || 120,
      structureLength, rollTubeLength, stockLength: profileStockLength,
      profileStockLength, rollStockLength, placementGroup,
      motorPower: device === 'MOTOR' ? parameters.motorPower : '', armCount: 2,
      ambarFabricWidthDiscountCm: discounts.fabric,
      ambarRollDiscountCm: discounts.roll,
      ambarProfileDiscountCm: discounts.profile,
      ambarFabricDropMultiplier: dropMultiplier,
      ambarFabricDropAllowanceCm: dropAllowance
    }
  };
}

function buildMaterials(context) {
  const { awning, device, placement, lacado, fabric, profileStockLength, rollStockLength, fabricMl, motorPower } = context;
  const units = Math.max(1, Number(awning.units) || 1);
  const suffix = lacado.suffix;
  const materials = [
    line(supportReference(placement, suffix), units, supportName(placement)),
    line(`TURA70HG${rollStockLength}C`, units, 'TUBO DE ENROLLE P701'),
    line('CASPUNCE', units, 'CASQUILLO PUNTA'),
    line(suffix ? `PMICRB30${suffix}${profileStockLength}C` : '', units, 'KIT DE PERFILES ÁMBAR BOX'),
    line(suffix ? `TAPMICB300${suffix}` : '', units, 'KIT TAPAS ÁMBAR BOX'),
    line(suffix ? `BPRT07${suffix}${awning.projection}C` : '', units, 'JUEGO DE BRAZOS PRT07')
  ].filter(Boolean);

  if (device === 'MOTOR') {
    const remote = resolveMotorRemote(awning.sensor);
    materials.push(
      line(`SUNILUSIO${motorPower.replace('/', '//')}`, units, `MOTOR SOMFY SUNILUS ${motorPower} IO`),
      line('SOPORTEUNVHIPRO', units, 'SOPORTE UNIVERSAL HIPRO'),
      line('CORONA LT5070', units, 'CORONA LT50 ADAPTADA Ø70'),
      line('ADAPTADORESTUBO70', units, 'RUEDA MOTRIZ LT50'),
      { ...line(remote.code, units, remote.description), aggregation: 'max' }
    );
    const sensor = sensorMaterial(awning.sensor);
    if (sensor) materials.push({ ...sensor, quantity: units, aggregation: 'max' });
  } else {
    const height = Math.max(0, Number(awning.crankHeight) || 0);
    materials.push(
      line(`MANIVE${crankSuffix(lacado)}${height}C`, units, `MANIVELA LUXE ${lacado.crank} ${height}`),
      line(machineCode(lacado), units, `MAQUINA ZNP 10 L170 ${lacado.crank}`),
      line('CASPLAS', units, 'TACO NAYLON MAQUINA'),
      line('CASMAQEJE6378MM', units, 'CASQUILLO EJE 63MM Ø78')
    );
  }
  if (fabric) materials.push(line(fabric.code, fabricMl, fabric.description));
  const wall = wallMaterial(awning.wallType, units);
  if (wall) materials.push(wall);
  return materials;
}

function buildDespiece(context) {
  const { awning, device, placement, lacado, profileStockLength, rollStockLength, structureLength, rollTubeLength, motorPower } = context;
  const units = Math.max(1, Number(awning.units) || 1);
  const suffix = lacado.suffix;
  const rows = [];
  const push = (num, name, reference, rowUnits, length = null) => rows.push({ num, name, reference: reference || null, units: rowUnits, length });
  push(1, supportName(placement), supportReference(placement, suffix), units);
  push(2, 'TUBO DE ENROLLE P701', `TURA70HG${rollStockLength}C`, units, rollTubeLength);
  push(3, 'CASQUILLO PUNTA', 'CASPUNCE', units);
  push(4, device === 'MAQUINA' ? 'KIT TORNILLOS FIJ. MAQ.' : 'KIT FIJACIÓN MOTOR', null, units);
  push(5, 'KIT DE PERFILES ÁMBAR BOX', suffix ? `PMICRB30${suffix}${profileStockLength}C` : null, units, structureLength);
  push(6, 'KIT TAPAS ÁMBAR BOX', suffix ? `TAPMICB300${suffix}` : null, units);
  push(7, 'JUEGO DE BRAZOS PRT07', suffix ? `BPRT07${suffix}${awning.projection}C` : null, units, awning.projection);
  push(9, 'JUEGO DE TERMINALES', null, units);
  if (device === 'MOTOR') {
    const remote = resolveMotorRemote(awning.sensor);
    push(10, `MOTOR SOMFY SUNILUS ${motorPower} IO`, `SUNILUSIO${motorPower.replace('/', '//')}`, units);
    push(11, 'SOPORTE UNIVERSAL HIPRO', 'SOPORTEUNVHIPRO', units);
    push(12, 'CORONA LT50 ADAPTADA Ø70', 'CORONA LT5070', units);
    push(13, 'RUEDA MOTRIZ LT50', 'ADAPTADORESTUBO70', units);
    push(21, remote.description, remote.code, units);
    const sensor = sensorMaterial(awning.sensor);
    if (sensor) push(22, sensor.description, sensor.code, units);
  } else {
    const height = Math.max(0, Number(awning.crankHeight) || 0);
    push(10, `MANIVELA LUXE ${lacado.crank} ${height}`, `MANIVE${crankSuffix(lacado)}${height}C`, units, height);
    push(11, `MAQUINA ZNP 10 L170 ${lacado.crank}`, machineCode(lacado), units);
    push(12, 'TACO NAYLON MAQUINA', 'CASPLAS', units);
    push(13, 'CASQUILLO EJE 63MM Ø78', 'CASMAQEJE6378MM', units);
  }
  const wallEntry = behaviorData.options.tiposPared.find((item) => item.pared === awning.wallType);
  const anchoring = wallEntry
    ? { name: wallEntry.tornilleria, reference: wallEntry.referencia || null, units: wallEntry.unidades * units }
    : null;
  return { rows, anchoring };
}

function supportReference(placement, suffix) {
  if (!suffix) return '';
  return placement === 'ENTRE PAREDES' ? `SOPENPAMB300${suffix}` : `SOPMICROBF/T${suffix}`;
}

function supportName(placement) {
  return placement === 'ENTRE PAREDES'
    ? 'JUEGO SOPORTES ÁMBAR BOX ENTRE PAREDES'
    : 'JUEGO SOPORTE ÁMBAR BOX FRONTAL-TECHO';
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

function chooseStock(length, stockLengths) {
  return stockLengths.find((stock) => stock >= length) || null;
}

function buildDescription(awning, calculation) {
  const valance = Math.max(0, Number(awning.valanceHeight) || 0);
  const valanceText = valance > 0 ? ` · bambalina incluida de ${valance + 5} cm, hecha de ${valance} cm` : '';
  return `Toldo ÁMBAR BOX ${awning.width}x${awning.projection} · tela ${formatNumber(calculation.fabricWidth)}x${formatNumber(calculation.fabricDrop)} · paño ${formatNumber(calculation.fabricMl)} ml${valanceText}`;
}

function round1(value) {
  return Math.round((Number(value) + Number.EPSILON) * 10) / 10;
}
