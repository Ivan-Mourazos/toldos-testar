import { formatNumber } from './math.js';
import { resolveFabric } from './fabricCatalog.js';
import { calculateFabricUsage } from './fabricMath.js';
import { machineCode, resolveLacado } from './lacados.js';
import behaviorData from './data/modelBehavior.json' with { type: 'json' };
import { resolveMotorRemote } from './motorAccessories.js';

export const ANTICA_TUBE_33_VARIANT = 'ENTRADA TUBO Ø33 MM';
export const ANTICA_TUBE_42_VARIANT = 'ENTRADA TUBO Ø42 MM';

export const anticaRoundEntrySpecs = Object.freeze({
  [ANTICA_TUBE_33_VARIANT]: Object.freeze({
    diameterMm: 33,
    cambioDropAllowanceCm: 45,
    cambioSeparateValanceAllowanceCm: 40,
    fullDropAllowanceCm: 38,
    fullFabricWidthDiscountCm: 7.2,
    fullRollTubeDiscountCm: 6.2,
    fullLoadBarDiscountCm: 7.2
  }),
  [ANTICA_TUBE_42_VARIANT]: Object.freeze({
    diameterMm: 42,
    cambioDropAllowanceCm: 60,
    cambioSeparateValanceAllowanceCm: 55,
    fullDropAllowanceCm: 60,
    fullFabricWidthDiscountCm: 10.5,
    fullRollTubeDiscountCm: 11,
    fullLoadBarDiscountCm: 11.5
  })
});

export const anticaVariants = Object.freeze([
  'TUBO 50X30 CONTRAPESO',
  'TUBO 50X30 SIN BAMBA',
  'TUBO 30X10 CON BAMBA',
  ANTICA_TUBE_33_VARIANT,
  ANTICA_TUBE_42_VARIANT,
  'SOPORTE FIJO 3 AGUJEROS'
]);

export const cambioAnticaVariants = anticaVariants;

export function normalizeAnticaVariant(value) {
  const clean = String(value || '').trim().toUpperCase().replace(/\s+/g, ' ')
    .replace(/^ENTRADA(?: DE)? TUBO(?: DE)? /, 'ENTRADA TUBO ');
  if (clean === 'TUBO 30X10') return 'TUBO 30X10 CON BAMBA';
  const roundMatch = clean.match(/^(?:ENTRADA TUBO |TUBO )Ø?(30|32|33|40|42)\s*(?:MM|CM)?$/);
  if (roundMatch && ['30', '32', '33'].includes(roundMatch[1])) return ANTICA_TUBE_33_VARIANT;
  if (roundMatch && ['40', '42'].includes(roundMatch[1])) return ANTICA_TUBE_42_VARIANT;
  return cambioAnticaVariants.includes(clean) ? clean : '';
}

export function resolveAnticaRoundEntry(value) {
  return anticaRoundEntrySpecs[normalizeAnticaVariant(value)] || null;
}

export function normalizeAnticaMeasurementMode(value, variant) {
  const normalizedVariant = normalizeAnticaVariant(variant);
  if (!anticaRoundEntrySpecs[normalizedVariant]) return '';
  const clean = String(value || '').trim().toUpperCase();
  if (clean === 'BASE') return 'BASE';
  if (clean === 'FINISHED' || clean === 'TERMINADA' || clean === 'TELA TERMINADA') return 'FINISHED';
  // La variante Ø42 ya se guardaba antes como medida terminada. Conservamos
  // esa lectura para los pedidos antiguos; los nuevos formularios fijan BASE.
  return normalizedVariant === ANTICA_TUBE_42_VARIANT ? 'FINISHED' : 'BASE';
}

export function calculateAntica({ order, awning }) {
  const variant = normalizeAnticaVariant(awning.anticaVariant);
  const structureColor = awning.structureColor || order.structureColor;
  const lacado = resolveLacado(structureColor);
  const device = normalizeDevice(awning.device);
  const fabricSelection = order.sameFabric !== false ? order.fabric : awning.fabric;
  const fabric = fabricSelection ? resolveFabric(fabricSelection) : null;
  const valanceHeight = Math.max(0, Number(awning.valanceHeight) || 0);
  const separateValance = valanceHeight > 0 && Boolean(awning.valanceFabric);
  const valanceFabric = separateValance ? resolveFabric(awning.valanceFabric) : null;
  const supportHeight = Math.max(0, Number(awning.anticaSupportHeight) || 0);
  const units = Math.max(1, Number(awning.units) || 1);
  const armCount = Number(awning.width) > 400 ? 3 : 2;
  const rollSystem = Number(awning.width) > 400 ? 'P801' : 'P701';
  const stockLengths = [600, 700];
  const roundEntry = resolveAnticaRoundEntry(variant);
  const roundMachine = roundEntry && device === 'MAQUINA';
  const fabricDiscount = roundMachine ? roundEntry.fullFabricWidthDiscountCm : device === 'MOTOR' ? 11 : 12;
  const rollDiscount = roundMachine ? roundEntry.fullRollTubeDiscountCm : device === 'MOTOR' ? 10 : 11;
  const loadDiscount = roundMachine
    ? roundEntry.fullLoadBarDiscountCm
    : isFixedVariant(variant) ? (device === 'MOTOR' ? 10 : 11) : (device === 'MOTOR' ? 11 : 12);
  const fabricWidth = round1(Number(awning.width) - fabricDiscount);
  const rollTubeLength = round1(Number(awning.width) - rollDiscount);
  const loadBarLength = round1(Number(awning.width) - loadDiscount);
  const stockLength = stockLengths.find((length) => length >= Math.max(rollTubeLength, loadBarLength)) || null;
  const bodyDrop = calculateAnticaBodyDrop({ awning, variant, supportHeight, valanceHeight, separateValance });
  const fabricDrop = round1(bodyDrop);
  const mainUsage = calculateFabricUsage({
    width: fabricWidth,
    drop: bodyDrop,
    units,
    rollWidth: fabric?.width || 120,
    seamAllowanceCm: 2.5,
    seamBaseCm: 6.5
  });
  const valanceDrop = separateValance ? round1(valanceHeight + 5) : 0;
  const valanceUsage = separateValance ? calculateFabricUsage({
    width: fabricWidth,
    drop: valanceDrop,
    units,
    rollWidth: valanceFabric?.width || 120,
    seamAllowanceCm: 2.5,
    seamBaseCm: 6.5
  }) : { panels: 0, ml: 0 };
  const missingFields = [];

  if (!variant) missingFields.push('configuración Antica');
  if (!structureColor) missingFields.push('lacado');
  if (!fabricSelection) missingFields.push('tela');
  if (!device) missingFields.push('dispositivo válido');
  if (device === 'MAQUINA' && !awning.crankHeight) missingFields.push('altura de manivela');
  if ((isFixedVariant(variant) || roundEntry) && !supportHeight) missingFields.push('altura soporte-brazo');

  const invalidValance = variant === 'TUBO 50X30 SIN BAMBA' && valanceHeight > 0;
  const valid = missingFields.length === 0
    && Boolean(fabric)
    && (!separateValance || Boolean(valanceFabric))
    && !invalidValance
    && Boolean(stockLength)
    && fabricWidth > 0
    && fabricDrop > 0;
  const diagnostics = [];

  if (fabricSelection && !fabric) diagnostics.push({ level: 'error', awningId: awning.id, message: `Tela no encontrada en el catálogo: "${fabricSelection}".` });
  if (separateValance && !valanceFabric) diagnostics.push({ level: 'error', awningId: awning.id, message: `Tela de bamba no encontrada en el catálogo: "${awning.valanceFabric}".` });
  if (missingFields.length) diagnostics.push({ level: 'error', awningId: awning.id, message: `ANTICA incompleto en OF ${awning.of}: falta ${missingFields.join(' y ')}.` });
  if (invalidValance) diagnostics.push({ level: 'error', awningId: awning.id, message: `ANTICA ${variant} no admite bambalina.` });
  if (!stockLength) diagnostics.push({ level: 'error', awningId: awning.id, message: `ANTICA no válido: ningún largo de stock admite ${Math.max(rollTubeLength, loadBarLength)} cm.` });

  const motorPower = armCount === 3 ? '35/17' : '15/17';
  const context = {
    awning, variant, device, lacado, fabric, valanceFabric, stockLength, rollSystem,
    armCount, motorPower, rollTubeLength, loadBarLength, supportHeight,
    mainFabricMl: mainUsage.ml, valanceFabricMl: valanceUsage.ml
  };
  const totalMl = round2(mainUsage.ml + valanceUsage.ml);

  return {
    of: awning.of,
    description: buildDescription(awning, { variant, fabricWidth, fabricDrop, fabricMl: totalMl }),
    materials: valid ? buildMaterials(context) : [],
    despiece: valid ? buildDespiece(context) : null,
    diagnostics,
    calculation: {
      model: 'ANTICA', valid, minimumLine: 0, variant,
      width: awning.width, projection: awning.projection,
      fabricWidth, fabricDrop, fabricMl: totalMl,
      fabricPanels: mainUsage.panels + valanceUsage.panels,
      fabricCode: fabric?.code || '', fabricDescription: fabric?.description || '', fabricRollWidth: fabric?.width || 120,
      mainFabricMl: mainUsage.ml, mainFabricPanels: mainUsage.panels,
      valanceFabricCode: valanceFabric?.code || '', valanceFabricDescription: valanceFabric?.description || '',
      valanceFabricMl: valanceUsage.ml, valanceFabricPanels: valanceUsage.panels, valanceDrop,
      structureLength: loadBarLength, rollTubeLength, stockLength, rollSystem,
      armCount, motorPower: device === 'MOTOR' ? motorPower : '', supportHeight
    }
  };
}

function calculateAnticaBodyDrop({ awning, variant, supportHeight, valanceHeight, separateValance }) {
  const projection = Math.max(0, Number(awning.projection) || 0);
  const roundEntry = resolveAnticaRoundEntry(variant);
  if (roundEntry) {
    return Math.hypot(projection, supportHeight)
      + roundEntry.fullDropAllowanceCm
      + (separateValance ? 0 : valanceHeight);
  }
  if (separateValance) return projection + 40;
  if (variant === 'SOPORTE FIJO 3 AGUJEROS') {
    return Math.hypot(projection, supportHeight) + 75 + valanceHeight;
  }
  if (variant === 'TUBO 50X30 SIN BAMBA') return projection * Math.SQRT2 + 70;
  return projection * Math.SQRT2 + 76 + valanceHeight;
}

function buildMaterials(context) {
  const { awning, device, lacado, fabric, valanceFabric, stockLength, rollSystem, motorPower, mainFabricMl, valanceFabricMl } = context;
  const units = Math.max(1, Number(awning.units) || 1);
  const materials = [
    line(`SOPUNI3AGU${lacado.suffix}`, units, 'JGO.SOPORTE UNIVERSAL 3 FUROS'),
    line(`${rollSystem === 'P801' ? 'TURA80HG' : 'TURA70HG'}${stockLength}C`, units, `TUBO DE ENROLLE ${rollSystem}`),
    line('CASPUNCE', units, 'CASQUILLO PUNTA')
  ];

  if (device === 'MOTOR') {
    const remote = resolveMotorRemote(awning.sensor);
    materials.push(
      line(rollSystem === 'P801' ? 'RUEDAMOT78' : 'ADAPTADORESTUBO70', units, rollSystem === 'P801' ? 'RUEDA MOTRIZ Ø 78' : 'RUEDA MOTRIZ LT50'),
      line(rollSystem === 'P801' ? 'CORONALT6078' : 'CORONA LT5070', units, rollSystem === 'P801' ? 'CORONA LT 60 ADAPTADA Ø 78' : 'CORONA LT50 ADAPTADA Ø70'),
      line(`SUNILUSIO${motorPower.split('/')[0]}//17`, units, `MOTOR SOMFY SUNILUS ${motorPower} IO`),
      line('SOPORTEUNVHIPRO', units, 'SOPORTE UNIVERSAL HIPRO'),
      { ...line(remote.code, units, remote.description), aggregation: 'max' }
    );
    const sensor = sensorMaterial(awning.sensor);
    if (sensor) materials.push({ ...sensor, quantity: units, aggregation: 'max' });
  } else {
    materials.push(
      line(rollSystem === 'P801' ? 'CASMAQEJE6378MM' : 'CASMAQEJE6370MM', units, rollSystem === 'P801' ? 'CASQUILLO EJE 63MM Ø78' : 'CASQUILLO EJE 63MM Ø70'),
      line(machineCode(lacado), units, `MAQUINA ZNP 10 L170 ${lacado.crank}`)
    );
  }
  materials.push(line(fabric.code, mainFabricMl, fabric.description));
  if (valanceFabric && valanceFabricMl > 0) materials.push(line(valanceFabric.code, valanceFabricMl, `${valanceFabric.description} · BAMBA`));
  const wall = wallMaterial(awning.wallType, units);
  if (wall) materials.push(wall);
  return materials.filter(Boolean);
}

function buildDespiece(context) {
  const { awning, variant, device, lacado, stockLength, rollSystem, armCount, motorPower, rollTubeLength, loadBarLength, supportHeight } = context;
  const units = Math.max(1, Number(awning.units) || 1);
  const rows = [];
  const push = (num, name, reference, rowUnits, length = null) => rows.push({ num, name, reference: reference || null, units: rowUnits, length });
  push(1, 'JGO.SOPORTE UNIVERSAL 3 FUROS', `SOPUNI3AGU${lacado.suffix}`, units);
  push(2, `TUBO DE ENROLLE ${rollSystem}`, `${rollSystem === 'P801' ? 'TURA80HG' : 'TURA70HG'}${stockLength}C`, units, rollTubeLength);
  push(3, 'CASQUILLO PUNTA', 'CASPUNCE', units);
  if (device === 'MAQUINA') push(4, 'KIT DE TORNILLOS MAQUINA', null, units);
  push(5, loadPieceName(variant), null, units, loadBarLength);
  push(6, 'KIT DE TAPONES', null, units);
  push(7, 'BRAZO ANTICA', null, armCount * units, awning.projection);
  if (device === 'MOTOR') {
    const remote = resolveMotorRemote(awning.sensor);
    push(8, rollSystem === 'P801' ? 'RUEDA MOTRIZ Ø 78' : 'RUEDA MOTRIZ LT50', rollSystem === 'P801' ? 'RUEDAMOT78' : 'ADAPTADORESTUBO70', units);
    push(9, rollSystem === 'P801' ? 'CORONA LT 60 ADAPTADA Ø 78' : 'CORONA LT50 ADAPTADA Ø70', rollSystem === 'P801' ? 'CORONALT6078' : 'CORONA LT5070', units);
    push(10, `MOTOR SOMFY SUNILUS ${motorPower} IO`, `SUNILUSIO${motorPower.split('/')[0]}//17`, units);
    push(11, 'SOPORTE UNIVERSAL HIPRO', 'SOPORTEUNVHIPRO', units);
    push(21, remote.description, remote.code, units);
    const sensor = sensorMaterial(awning.sensor);
    if (sensor) push(22, sensor.description, sensor.code, units);
  } else {
    const crankHeight = Math.max(0, Number(awning.crankHeight) || 0);
    push(8, rollSystem === 'P801' ? 'CASQUILLO EJE 63MM Ø78' : 'CASQUILLO EJE 63MM Ø70', rollSystem === 'P801' ? 'CASMAQEJE6378MM' : 'CASMAQEJE6370MM', units);
    push(9, 'TACO NAYLON MAQ.', null, units);
    push(10, `MANIVELA LUXE ${lacado.crank} ${crankHeight}`, null, units, crankHeight);
    push(11, `MAQUINA ZNP 10 L170 ${lacado.crank}`, machineCode(lacado), units);
  }
  if (variant === 'SOPORTE FIJO 3 AGUJEROS') push(12, 'PLETINA DE 25 X 4', null, units, supportHeight);
  const wallEntry = behaviorData.options.tiposPared.find((item) => item.pared === awning.wallType);
  const anchoring = wallEntry ? { name: wallEntry.tornilleria, reference: wallEntry.referencia || null, units: wallEntry.unidades * units } : null;
  return { rows, anchoring };
}

function loadPieceName(variant) {
  const roundEntry = resolveAnticaRoundEntry(variant);
  if (roundEntry) return `TUBO ENTRADA Ø${roundEntry.diameterMm} MM`;
  if (variant === 'TUBO 50X30 SIN BAMBA') return 'TUBO CARGA 50 X 30';
  if (variant === 'SOPORTE FIJO 3 AGUJEROS') return 'TUBO DE CARGA P701';
  return 'TUBO CARGA 30 X 10';
}

function buildDescription(awning, calculation) {
  return `Toldo ANTICA · ${calculation.variant} · ${awning.width}x${awning.projection} · tela ${formatNumber(calculation.fabricWidth)}x${formatNumber(calculation.fabricDrop)} · ${formatNumber(calculation.fabricMl)} ml`;
}

function isFixedVariant(variant) { return variant === 'SOPORTE FIJO 3 AGUJEROS'; }
function line(code, quantity, description) { return code ? { code, quantity, description } : null; }
function normalizeDevice(value) {
  const clean = String(value || '').trim().toUpperCase();
  if (clean === 'MOTOR') return 'MOTOR';
  if (clean.includes('MAQ')) return 'MAQUINA';
  return '';
}
function wallMaterial(wallType, units) {
  const entry = behaviorData.options.tiposPared.find((item) => item.pared === wallType);
  return entry?.referencia ? line(entry.referencia, entry.unidades * units, entry.tornilleria) : null;
}
function sensorMaterial(value) {
  const sensor = String(value || '').trim().toUpperCase();
  if (sensor === 'MOVIMIENTO') return { code: 'EOLIS3DIO', description: 'EOLIS 3D WIREFREE IO' };
  if (sensor === 'EOLIS IO') return { code: 'EOLISSENSORIO', description: 'EOLIS SENSOR IO' };
  if (sensor === 'SOL') return { code: 'SUNISIIIO', description: 'SUNIS II IO' };
  return null;
}
function round1(value) { return Math.round((Number(value) + Number.EPSILON) * 10) / 10; }
function round2(value) { return Math.round((Number(value) + Number.EPSILON) * 100) / 100; }
