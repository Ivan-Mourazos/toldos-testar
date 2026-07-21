import { formatNumber } from './math.js';
import { resolveFabric } from './fabricCatalog.js';
import { calculateFabricUsage } from './fabricMath.js';
import { crankSuffix, machineCode, resolveLacado } from './lacados.js';
import behaviorData from './data/modelBehavior.json' with { type: 'json' };
import { resolveMotorRemote } from './motorAccessories.js';
import {
  normalizeMonoblock350Parameters,
  resolveMonoblockCurronCount,
  resolveMonoblockRule,
  resolveMonoblockSupportCount,
  suggestedMonoblockArmCount
} from './monoblock350Parameters.js';

export function calculateMonoblock350({ order, awning }) {
  const parameters = normalizeMonoblock350Parameters(order.parameters?.monoblock350);
  const structureColor = awning.structureColor || order.structureColor;
  const lacado = resolveLacado(structureColor);
  const device = normalizeDevice(awning.device);
  const fabricSelection = order.sameFabric !== false ? order.fabric : awning.fabric;
  const fabric = fabricSelection ? resolveFabric(fabricSelection) : null;
  const valanceFabricSelection = String(awning.valanceFabric || '').trim();
  const valanceFabric = valanceFabricSelection ? resolveFabric(valanceFabricSelection) : null;
  const suggestedArms = suggestedMonoblockArmCount(awning.width, awning.projection, parameters);
  const armCount = Number(awning.armCount) || suggestedArms;
  const baseRule = resolveMonoblockRule(awning.projection, armCount, parameters);
  const modified = Boolean(awning.reglasModificadas);
  const diagnostics = [];
  const missingFields = [];

  if (!structureColor) missingFields.push('lacado');
  if (!fabricSelection) missingFields.push('tela');
  if (!device) missingFields.push('dispositivo válido');
  if (![2, 3, 4].includes(armCount)) missingFields.push('número de brazos válido');
  if (!awning.placement) missingFields.push('colocación');
  if (device === 'MAQUINA' && !awning.crankHeight) missingFields.push('altura de manivela');

  const discounts = parameters.discounts[device || 'MAQUINA'];
  const minimumLine = effectiveNumber(awning, 'monoblockMinimumLineCm', baseRule?.minimum || 0);
  const maximumLine = effectiveNumber(awning, 'monoblockMaximumLineCm', baseRule?.maximum || 0);
  const fabricDiscount = effectiveNumber(awning, 'monoblockFabricWidthDiscountCm', discounts.fabric);
  const rollDiscount = effectiveNumber(awning, 'monoblockRollDiscountCm', discounts.roll);
  const loadBarDiscount = effectiveNumber(awning, 'monoblockLoadBarDiscountCm', discounts.loadBar);
  const squareBarDiscount = effectiveNumber(awning, 'monoblockSquareBarDiscountCm', discounts.squareBar);
  const dropAllowance = effectiveNumber(awning, 'monoblockFabricDropAllowanceCm', parameters.fabricDropAllowanceCm);
  const supportCount = effectiveNumber(
    awning,
    'monoblockSupportCount',
    resolveMonoblockSupportCount(awning.width, awning.projection, armCount, parameters)
  );
  const valance = Math.max(0, Number(awning.valanceHeight) || 0);
  const fabricWidth = round1(awning.width - fabricDiscount);
  const rawFabricDrop = awning.projection + dropAllowance
    + (valanceFabricSelection ? 0 : valance + parameters.valanceExtraCm);
  const fabricDrop = round1(rawFabricDrop);
  const rollTubeLength = round1(awning.width - rollDiscount);
  const loadBarLength = round1(awning.width - loadBarDiscount);
  const squareBarLength = round1(awning.width - squareBarDiscount);
  const stockLength = rollTubeLength < parameters.stockLengths[0] ? parameters.stockLengths[0] : parameters.stockLengths.at(-1);
  const motorPower = awning.motorPower && awning.motorPower !== 'AUTOMÁTICO'
    ? awning.motorPower
    : baseRule?.motorPower || '';
  const curronCount = resolveMonoblockCurronCount(awning.width, parameters);
  const fabricUsage = calculateFabricUsage({
    width: fabricWidth,
    drop: rawFabricDrop,
    units: awning.units,
    rollWidth: fabric?.width || 120,
    seamAllowanceCm: parameters.seamAllowanceCm,
    seamBaseCm: parameters.seamBaseCm
  });
  const valanceUsage = valanceFabric && valance > 0 ? calculateFabricUsage({
    width: fabricWidth,
    drop: valance + parameters.valanceExtraCm,
    units: awning.units,
    rollWidth: valanceFabric.width || 120,
    seamAllowanceCm: parameters.seamAllowanceCm,
    seamBaseCm: parameters.seamBaseCm
  }) : null;
  const standardRuleMissing = !baseRule;
  const outsideLine = !standardRuleMissing && (Number(awning.width) < minimumLine || Number(awning.width) > maximumLine);
  const valid = missingFields.length === 0
    && Boolean(fabric)
    && (!valanceFabricSelection || valance === 0 || Boolean(valanceFabric))
    && (!standardRuleMissing || modified)
    && (!outsideLine || modified)
    && supportCount > 0;

  if (fabricSelection && !fabric) diagnostics.push({ level: 'error', awningId: awning.id, message: `Tela no encontrada en el catálogo: "${fabricSelection}".` });
  if (valanceFabricSelection && valance > 0 && !valanceFabric) diagnostics.push({ level: 'error', awningId: awning.id, message: `Tela de bamba no encontrada en el catálogo: "${valanceFabricSelection}".` });
  if (missingFields.length) {
    diagnostics.push({ level: 'error', awningId: awning.id, message: `MONOBLOCK 350 incompleto en OF ${awning.of}: falta ${missingFields.join(' y ')}.` });
  } else if (standardRuleMissing && !modified) {
    diagnostics.push({ level: 'error', awningId: awning.id, message: `MONOBLOCK 350 no admite la salida ${awning.projection} cm sin excepción técnica.` });
  } else if (outsideLine && !modified) {
    diagnostics.push({ level: 'error', awningId: awning.id, message: `MONOBLOCK 350 con ${armCount} brazos y salida ${awning.projection}: frente válido entre ${minimumLine} y ${maximumLine} cm.` });
  } else if (modified) {
    diagnostics.push({ level: 'warn', awningId: awning.id, message: `Excepción técnica en OF ${awning.of}: reglas de MONOBLOCK 350 modificadas.` });
  }

  const context = {
    awning, device, lacado, fabric, stockLength, armCount, motorPower,
    supportCount, curronCount, rollTubeLength, loadBarLength, squareBarLength,
    fabricMl: fabricUsage.ml, valanceFabric, valanceFabricMl: valanceUsage?.ml || 0, parameters
  };
  return {
    of: awning.of,
    description: buildDescription(awning, { fabricWidth, fabricDrop, fabricMl: fabricUsage.ml }),
    materials: valid ? buildMaterials(context) : [],
    despiece: valid ? buildDespiece(context) : null,
    diagnostics,
    calculation: {
      model: 'MONOBLOCK 350', valid, minimumLine, maximumLine,
      width: awning.width, projection: awning.projection,
      fabricWidth, fabricDrop, fabricMl: fabricUsage.ml, fabricPanels: fabricUsage.panels,
      mainFabricMl: fabricUsage.ml, mainFabricPanels: fabricUsage.panels,
      fabricCode: fabric?.code || '', fabricDescription: fabric?.description || '',
      fabricRollWidth: fabric?.width || 120,
      valanceFabricCode: valanceFabric?.code || '',
      valanceFabricDescription: valanceFabric?.description || '',
      valanceFabricMl: valanceUsage?.ml || 0,
      valanceFabricPanels: valanceUsage?.panels || 0,
      valanceDrop: valanceUsage ? valance + parameters.valanceExtraCm : 0,
      structureLength: loadBarLength, rollTubeLength, squareBarLength, stockLength,
      armCount, requiredArmCount: suggestedArms, supportCount, curronCount,
      motorPower: device === 'MOTOR' ? motorPower : '',
      monoblockMinimumLineCm: minimumLine,
      monoblockMaximumLineCm: maximumLine,
      monoblockSupportCount: supportCount,
      monoblockFabricWidthDiscountCm: fabricDiscount,
      monoblockRollDiscountCm: rollDiscount,
      monoblockLoadBarDiscountCm: loadBarDiscount,
      monoblockSquareBarDiscountCm: squareBarDiscount,
      monoblockFabricDropAllowanceCm: dropAllowance
    }
  };
}

function buildMaterials(context) {
  const { awning, device, lacado, fabric, valanceFabric, stockLength, armCount, motorPower, supportCount, curronCount, fabricMl, valanceFabricMl, parameters } = context;
  const units = Math.max(1, Number(awning.units) || 1);
  const suffix = lacado.suffix;
  const materials = [
    line(`SOPBRAMONOB${suffix}`, armCount * units, 'JGO SOPORTE BRAZO MONOBLOC 350'),
    line(`TURA80HG${stockLength}C`, units, 'TUBO DE ENROLLE P801'),
    line('CASPUNCE', units, 'CASQUILLO PUNTA'),
    line(`PEVO80${suffix}${stockLength}C`, units, 'TUBO DE CARGA EVO 80'),
    line(`TAPONEVO7${suffix}`, units, 'KIT TAPONES EVO 80'),
    line(`BONYX${suffix}${awning.projection}C`, armCount * units, 'BRAZO ONYX'),
    line(squareBarCode(lacado, parameters.squareBarStockLength), units, 'BARRA CUADRADA 40X40'),
    line(placementSupportCode(awning.placement, suffix), supportCount * units, `SOPORTE MONOBLOC350 ${awning.placement}`),
    line(`SOPMAPUMONO${suffix}`, units, 'JUEGO SOPORTE MAQ.-PUNTA MONOBLOCK350')
  ].filter(Boolean);

  if (device === 'MOTOR') {
    const remote = resolveMotorRemote(awning.sensor);
    materials.push(
      line('RUEDAMOT78', units, 'RUEDA MOTRIZ Ø 78'),
      line('SOPORTEUNVHIPRO', units, 'SOPORTE UNIVERSAL HIPRO'),
      line(`SUNILUSIO${motorPower.replace('/', '//')}`, units, `MOTOR SOMFY SUNILUS ${motorPower} IO`),
      line('CORONALT6078', units, 'CORONA LT 60 ADAPTADA Ø 78'),
      { ...line(remote.code, units, remote.description), aggregation: 'max' }
    );
    const sensor = sensorMaterial(awning.sensor);
    if (sensor) materials.push({ ...sensor, quantity: units, aggregation: 'max' });
  } else {
    materials.push(
      line('CASMAQEJE5078MM', units, 'CASQUILLO MAQUINA EJE 50MM Ø78'),
      line(machineCode(lacado), units, `MAQUINA ZNP 10 L170 ${lacado.crank}`),
      line(`MANIVE${crankSuffix(lacado)}${awning.crankHeight}C`, units, `MANIVELA LUXE ${lacado.crank} ${awning.crankHeight}`)
    );
  }

  if (fabric) materials.push(line(fabric.code, fabricMl, fabric.description));
  if (valanceFabric && valanceFabricMl > 0) materials.push(line(valanceFabric.code, valanceFabricMl, `${valanceFabric.description} · BAMBA`));
  if (curronCount) materials.push(line(curronCode(lacado), curronCount * units, 'CURRON MONOBLOCK 350'));
  const wall = wallMaterial(awning.wallType, armCount * units);
  if (wall) materials.push(wall);
  return materials;
}

function buildDespiece(context) {
  const { awning, device, lacado, stockLength, armCount, motorPower, supportCount, curronCount, rollTubeLength, loadBarLength, squareBarLength, parameters } = context;
  const units = Math.max(1, Number(awning.units) || 1);
  const suffix = lacado.suffix;
  const rows = [];
  const push = (num, name, reference, rowUnits, length = null) => rows.push({ num, name, reference: reference || null, units: rowUnits, length });
  push(1, 'SOPORTES BRAZOS MONOBLOC350', `SOPBRAMONOB${suffix}`, armCount * units);
  push(2, 'TUBO DE ENROLLE P801', `TURA80HG${stockLength}C`, units, rollTubeLength);
  push(3, 'CASQUILLO PUNTA', 'CASPUNCE', units);
  push(4, device === 'MOTOR' ? 'RUEDA MOTRIZ Ø 78' : 'CASQUILLO MAQUINA EJE 50MM Ø78', device === 'MOTOR' ? 'RUEDAMOT78' : 'CASMAQEJE5078MM', units);
  push(5, 'TUBO DE CARGA EVO 80', `PEVO80${suffix}${stockLength}C`, units, loadBarLength);
  push(6, 'KIT TAPONES EVO 80', `TAPONEVO7${suffix}`, units);
  push(7, 'BRAZO ONYX', `BONYX${suffix}${awning.projection}C`, armCount * units, awning.projection);
  push(8, `BARRA CUADRADA 40X40 ${lacado.crank === 'BLANCA' ? 'BLANCO' : 'NEGRO'}`, squareBarCode(lacado, parameters.squareBarStockLength), units, squareBarLength);
  if (device === 'MOTOR') {
    push(9, 'SOPORTE UNIVERSAL HIPRO', 'SOPORTEUNVHIPRO', units);
    push(10, `MOTOR SOMFY SUNILUS ${motorPower} IO`, `SUNILUSIO${motorPower.replace('/', '//')}`, units);
    push(11, 'CORONA LT 60 ADAPTADA Ø 78', 'CORONALT6078', units);
  } else {
    push(9, `MAQUINA ZNP 10 L170 ${lacado.crank}`, machineCode(lacado), units);
    push(10, `MANIVELA LUXE ${lacado.crank} ${awning.crankHeight}`, `MANIVE${crankSuffix(lacado)}${awning.crankHeight}C`, units, awning.crankHeight);
    push(11, 'TACO NAYLON MAQ.', null, units);
  }
  push(12, `SOPORTE MONOBLOC350 ${awning.placement} ${awning.structureColor}`, placementSupportCode(awning.placement, suffix), supportCount * units);
  push(13, `JUEGO SOPORTE MAQ.-PUNTA MONOBLOCK350 ${awning.structureColor}`, `SOPMAPUMONO${suffix}`, units);
  if (curronCount) push(23, `CURRON MONOBLOCK 350 ${lacado.crank}`, curronCode(lacado), curronCount * units);
  const remote = device === 'MOTOR' ? resolveMotorRemote(awning.sensor) : null;
  if (remote) push(21, remote.description, remote.code, units);
  const sensor = device === 'MOTOR' ? sensorMaterial(awning.sensor) : null;
  if (sensor) push(22, sensor.description, sensor.code, units);
  const wallEntry = behaviorData.options.tiposPared.find((item) => item.pared === awning.wallType);
  const anchoring = wallEntry ? { name: wallEntry.tornilleria, reference: wallEntry.referencia || null, units: wallEntry.unidades * armCount * units } : null;
  return { rows, anchoring };
}

function line(code, quantity, description) { return code ? { code, quantity, description } : null; }
function normalizeDevice(value) { const clean = String(value || '').trim().toUpperCase(); if (clean === 'MOTOR') return 'MOTOR'; if (clean.includes('MAQ')) return 'MAQUINA'; return ''; }
function effectiveNumber(awning, field, fallback) { const value = awning[field]; return awning.reglasModificadas && value !== null && value !== undefined && Number.isFinite(Number(value)) ? Math.max(0, Number(value)) : Number(fallback) || 0; }
function placementSupportCode(placement, suffix) { const clean = String(placement || '').toUpperCase(); if (clean === 'TECHO') return `SOPFTEMONUND${suffix}`; if (clean === 'FRONTAL') return `SOPFRMONOUND${suffix}`; return ''; }
function squareBarCode(lacado, stockLength) { return `${lacado.name === 'NEGRO (R-09011)' ? 'TA3NEGR4X4' : 'TA3BLAN4X4'}${stockLength}C`; }
function curronCode(lacado) { return lacado.crank === 'BLANCA' ? 'CURRONMOPLBLAN' : 'CURRONMOPLNE05'; }
function wallMaterial(wallType, armUnits) { const entry = behaviorData.options.tiposPared.find((item) => item.pared === wallType); return entry?.referencia ? line(entry.referencia, entry.unidades * armUnits, entry.tornilleria) : null; }
function sensorMaterial(value) { const sensor = String(value || '').trim().toUpperCase(); if (sensor === 'MOVIMIENTO') return { code: 'EOLIS3DIO', description: 'EOLIS 3D WIREFREE IO' }; if (sensor === 'EOLIS IO') return { code: 'EOLISSENSORIO', description: 'EOLIS SENSOR IO' }; if (sensor === 'SOL') return { code: 'SUNISIIIO', description: 'SUNIS II IO' }; return null; }
function buildDescription(awning, calculation) { const valance = Math.max(0, Number(awning.valanceHeight) || 0); const valanceText = valance > 0 ? ` · bambalina incluida de ${valance + 5} cm, hecha de ${valance} cm` : ''; return `Toldo MONOBLOCK 350 ${awning.width}x${awning.projection} · tela ${formatNumber(calculation.fabricWidth)}x${formatNumber(calculation.fabricDrop)} · paño ${formatNumber(calculation.fabricMl)} ml${valanceText}`; }
function round1(value) { return Math.round(Number(value) * 10) / 10; }
