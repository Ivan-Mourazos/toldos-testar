import { formatNumber } from './math.js';
import { resolveFabric } from './fabricCatalog.js';
import { calculateFabricUsage } from './fabricMath.js';
import { crankSuffix, machineCode, resolveLacado } from './lacados.js';
import behaviorData from './data/modelBehavior.json' with { type: 'json' };
import { resolveMotorRemote } from './motorAccessories.js';
import { normalizeXacobeoParameters } from './xacobeoParameters.js';

export function calculateXacobeo({ order, awning }) {
  const parameters = normalizeXacobeoParameters(order.parameters?.xacobeo);
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
  if (device !== 'MOTOR' && !awning.crankHeight) missingFields.push('altura de manivela');

  const minimumLine = effectiveNumber(awning, 'xacMinimumLineCm', lookupMinimumLine(parameters.minimumLineByProjection, awning.projection, device));
  const fabricDiscount = effectiveNumber(awning, 'xacFabricWidthDiscountCm', parameters.fabricWidthDiscounts[device || 'MOTOR']);
  const rollDiscount = effectiveNumber(awning, 'xacRollDiscountCm', parameters.rollTubeDiscounts[device || 'MOTOR']);
  const loadBarDiscount = effectiveNumber(awning, 'xacLoadBarDiscountCm', parameters.loadBarDiscounts[device || 'MOTOR']);
  const fabricWidth = round1(awning.width - fabricDiscount);
  const rollTubeLength = round1(awning.width - rollDiscount);
  const loadBarLength = round1(awning.width - loadBarDiscount);
  const valance = Math.max(0, Number(awning.valanceHeight) || 0);
  const fabricDrop = round1(awning.projection + valance + parameters.fabricDropAllowanceCm);
  const fabricUsage = calculateFabricUsage({
    width: fabricWidth,
    drop: fabricDrop,
    units: awning.units,
    rollWidth: fabric?.width || 120,
    seamAllowanceCm: parameters.seamAllowanceCm,
    seamBaseCm: parameters.seamBaseCm
  });
  const stockLength = parameters.stockLengths.find((item) => item >= Math.max(rollTubeLength, loadBarLength)) || null;
  const belowMinimum = Number(awning.width) < minimumLine;
  const overMaximum = Number(awning.width) > parameters.standardMaxWidth;
  const modified = Boolean(awning.reglasModificadas);
  const valid = missingFields.length === 0
    && Boolean(fabric)
    && !belowMinimum
    && Boolean(stockLength)
    && (!overMaximum || modified);

  if (fabricSelection && !fabric) diagnostics.push({ level: 'error', awningId: awning.id, message: `Tela no encontrada en el catálogo: "${fabricSelection}".` });
  if (missingFields.length) {
    diagnostics.push({ level: 'error', awningId: awning.id, message: `XACOBEO incompleto en OF ${awning.of}: falta ${missingFields.join(' y ')}.` });
  } else if (belowMinimum) {
    diagnostics.push({ level: 'error', awningId: awning.id, message: `XACOBEO no válido: frente ${awning.width} cm, mínimo ${minimumLine} cm para salida ${awning.projection} y ${device}.` });
  } else if (overMaximum && !modified) {
    diagnostics.push({ level: 'error', awningId: awning.id, message: `XACOBEO no válido: frente ${awning.width} cm supera el máximo estándar de ${parameters.standardMaxWidth} cm.` });
  } else if (!stockLength) {
    diagnostics.push({ level: 'error', awningId: awning.id, message: `XACOBEO no válido: ningún largo de stock admite ${Math.max(rollTubeLength, loadBarLength)} cm.` });
  } else if (modified) {
    diagnostics.push({ level: 'warn', awningId: awning.id, message: `Excepción técnica en OF ${awning.of}: reglas de XACOBEO modificadas.` });
  }

  const context = { awning, device, lacado, fabric, stockLength, rollTubeLength, loadBarLength, fabricMl: fabricUsage.ml };
  return {
    of: awning.of,
    description: buildDescription(awning, { fabricWidth, fabricDrop, fabricMl: fabricUsage.ml }),
    materials: valid ? buildMaterials(context) : [],
    despiece: valid ? buildDespiece(context) : null,
    diagnostics,
    calculation: {
      model: 'XACOBEO', valid, minimumLine,
      width: awning.width, projection: awning.projection,
      fabricWidth, fabricDrop, fabricMl: fabricUsage.ml, fabricPanels: fabricUsage.panels,
      fabricCode: fabric?.code || '', fabricDescription: fabric?.description || '',
      fabricRollWidth: fabric?.width || 120,
      structureLength: loadBarLength, rollTubeLength, stockLength,
      motorPower: device === 'MOTOR' ? '35/17' : '', armCount: 1,
      xacMinimumLineCm: minimumLine,
      xacFabricWidthDiscountCm: fabricDiscount,
      xacRollDiscountCm: rollDiscount,
      xacLoadBarDiscountCm: loadBarDiscount
    }
  };
}

function buildMaterials({ awning, device, lacado, fabric, stockLength, fabricMl }) {
  const units = Math.max(1, Number(awning.units) || 1);
  const materials = [
    { code: `SOPART250${lacado.suffix}`, quantity: units, description: 'JUEGO SOPORTE ART250' },
    { code: `TURA70HG${stockLength}C`, quantity: units, description: 'TUBO DE ENROLLE P701' },
    { code: 'CASPUNCE', quantity: units, description: 'CASQUILLO PUNTA' },
    { code: `PEVO702R${lacado.suffix}${stockLength}C`, quantity: units, description: 'TUBO DE CARGA EVO 70' },
    { code: `BART25${lacado.suffix}${awning.projection}C`, quantity: units, description: 'JUEGO DE BRAZOS ART250' }
  ];

  if (device === 'MOTOR') {
    const remote = resolveMotorRemote(awning.sensor);
    materials.push(
      { code: 'SOPORTEUNVHIPRO', quantity: units, description: 'SOPORTE UNIVERSAL HIPRO' },
      { code: 'SUNILUSIO35//17', quantity: units, description: 'MOTOR SOMFY SUNILUS 35/17 IO' },
      { code: 'CORONA LT5070', quantity: units, description: 'CORONA LT50 ADAPTADA Ø70' },
      { code: remote.code, quantity: units, description: remote.description, aggregation: 'max' }
    );
    const sensor = sensorMaterial(awning.sensor);
    if (sensor) materials.push({ ...sensor, quantity: units, aggregation: 'max' });
  } else {
    const crankHeight = Math.max(0, Number(awning.crankHeight) || 0);
    materials.push(
      { code: device === 'MAQ. INTERIOR' ? 'CASMAQEJE5070MM' : 'CASMAQEJE6370MM', quantity: units, description: device === 'MAQ. INTERIOR' ? 'CASQUILLO MAQUINA EJE 50MM Ø70' : 'CASQUILLO EJE 63MM Ø70' },
      { code: machineCode(lacado), quantity: units, description: `MAQUINA ZNP 10 L170 ${lacado.crank}` },
      { code: `MANIVE${crankSuffix(lacado)}${crankHeight}C`, quantity: units, description: `MANIVELA LUXE ${lacado.crank} ${crankHeight}` }
    );
  }
  if (fabric) materials.push({ code: fabric.code, quantity: fabricMl, description: fabric.description });

  const wallEntry = behaviorData.options.tiposPared.find((item) => item.pared === awning.wallType);
  if (wallEntry?.referencia) materials.push({ code: wallEntry.referencia, quantity: wallEntry.unidades * units, description: wallEntry.tornilleria });
  return materials;
}

function buildDespiece({ awning, device, lacado, stockLength, rollTubeLength, loadBarLength }) {
  const units = Math.max(1, Number(awning.units) || 1);
  const rows = [];
  const push = (num, name, reference, rowUnits, length = null) => rows.push({ num, name, reference, units: rowUnits, length });
  push(1, 'JUEGO SOPORTE ART250', `SOPART250${lacado.suffix}`, units);
  push(2, 'TUBO DE ENROLLE P701', `TURA70HG${stockLength}C`, units, rollTubeLength);
  push(3, 'CASQUILLO PUNTA', 'CASPUNCE', units);
  if (device !== 'MOTOR') push(4, device === 'MAQ. INTERIOR' ? 'CASQUILLO MAQUINA EJE 50MM Ø70' : 'CASQUILLO EJE 63MM Ø70', device === 'MAQ. INTERIOR' ? 'CASMAQEJE5070MM' : 'CASMAQEJE6370MM', units);
  push(5, 'TUBO DE CARGA EVO 70', `PEVO702R${lacado.suffix}${stockLength}C`, units, loadBarLength);
  push(6, 'KIT TAPONES EVO 70', null, units);
  push(7, 'JUEGO DE BRAZOS ART250', `BART25${lacado.suffix}${awning.projection}C`, units, awning.projection);
  push(8, 'JUEGO DE TERMINALES', null, units);
  if (device === 'MOTOR') {
    const remote = resolveMotorRemote(awning.sensor);
    push(9, 'SOPORTE UNIVERSAL HIPRO', 'SOPORTEUNVHIPRO', units);
    push(10, 'MOTOR SOMFY SUNILUS 35/17 IO', 'SUNILUSIO35//17', units);
    push(11, 'CORONA LT50 ADAPTADA Ø70', 'CORONA LT5070', units);
    push(12, 'RUEDA MOTRIZ LT50', 'ADAPTADORESTUBO70', 0);
    push(21, remote.description, remote.code, units);
    const sensor = sensorMaterial(awning.sensor);
    if (sensor) push(22, sensor.description, sensor.code, units);
  } else {
    const crankHeight = Math.max(0, Number(awning.crankHeight) || 0);
    push(9, `MAQUINA ZNP 10 L170 ${lacado.crank}`, machineCode(lacado), units);
    push(10, `MANIVELA LUXE ${lacado.crank} ${crankHeight}`, `MANIVE${crankSuffix(lacado)}${crankHeight}C`, units, crankHeight);
    push(11, 'TACO NAYLON MAQUINA', null, units);
    push(12, 'KIT DE TORNILLOS MAQUINA', null, units);
  }
  const wallEntry = behaviorData.options.tiposPared.find((item) => item.pared === awning.wallType);
  const anchoring = wallEntry ? { name: wallEntry.tornilleria, reference: wallEntry.referencia || null, units: wallEntry.unidades * units } : null;
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
  return (exact || next || rows[rows.length - 1]).values[device || 'MOTOR'];
}

function normalizeDevice(value) {
  const clean = String(value || '').trim().toUpperCase();
  if (clean.includes('INTERIOR')) return 'MAQ. INTERIOR';
  if (clean.includes('EXTERIOR')) return 'MAQ. EXTERIOR';
  if (clean === 'MOTOR') return 'MOTOR';
  return '';
}

function effectiveNumber(awning, field, fallback) {
  const override = awning[field];
  return awning.reglasModificadas && override !== null && override !== undefined && Number.isFinite(Number(override))
    ? Math.max(0, Number(override))
    : Number(fallback) || 0;
}

function buildDescription(awning, calculation) {
  const valance = Math.max(0, Number(awning.valanceHeight) || 0);
  const valanceText = valance > 0 ? ` · bambalina incluida de ${valance + 5} cm, hecha de ${valance} cm` : '';
  return `Toldo XACOBEO ${awning.width}x${awning.projection} · tela ${formatNumber(calculation.fabricWidth)}x${formatNumber(calculation.fabricDrop)} · paño ${formatNumber(calculation.fabricMl)} ml${valanceText}`;
}

function round1(value) {
  return Math.round(Number(value) * 10) / 10;
}
