import { effectiveOverride } from './ruleOverrides.js';
import { tipBushing } from './tipBushing.js';
import { formatNumber } from './math.js';
import { resolveFabric } from './fabricCatalog.js';
import { calculateFabricUsage } from './fabricMath.js';
import { crankSuffix, machineCode, resolveLacado } from './lacados.js';
import behaviorData from './data/modelBehavior.json' with { type: 'json' };
import { resolveMotorRemote } from './motorAccessories.js';
import { normalizeCuarzoBoxParameters } from './storbox250Parameters.js';
import { art250ArmExists, boxProfileIssue, pickBoxProfileLength } from './boxAvailability.js';
import {
  appendSeparateValanceDiagnostic,
  appendSeparateValanceMaterial,
  calculateSeparateValance,
  separateValanceCalculation
} from './separateValance.js';

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
  const separateValance = calculateSeparateValance({ awning, seamAllowanceCm: parameters.seamAllowanceCm, seamBaseCm: parameters.seamBaseCm });
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
  const neededLength = Math.max(structureLength, loadBarLength);
  const stockLength = pickBoxProfileLength('CUARZO BOX', lacado.suffix, parameters.stockLengths, neededLength);
  const availabilityIssue = structureColor
    ? boxProfileIssue('CUARZO BOX', lacado.suffix, lacado.name, neededLength)
      || (!art250ArmExists(lacado.suffix, awning.projection) ? `CUARZO BOX no válido: no hay brazo ART 250 de ${awning.projection} cm en ${lacado.name}.` : null)
    : null;
  const belowMinimum = Number(awning.width) < minimumLine;
  const overMaximum = Number(awning.width) > parameters.standardMaxWidth;
  const modified = Boolean(awning.reglasModificadas);
  if (availabilityIssue) diagnostics.push({ level: 'error', awningId: awning.id, message: availabilityIssue });
  const valid = !availabilityIssue && missingFields.length === 0
    && Boolean(fabric)
    && separateValance.valid
    && !belowMinimum
    && Boolean(stockLength)
    && (!overMaximum || modified);

  if (fabricSelection && !fabric) {
    diagnostics.push({ level: 'error', awningId: awning.id, message: `Tela no encontrada en el catálogo: "${fabricSelection}".` });
  }
  appendSeparateValanceDiagnostic(diagnostics, awning, separateValance);
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
    awning, lacado, device, fabric, separateValance, stockLength, structureLength, rollTubeLength,
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
      mainFabricMl: fabricUsage.ml, mainFabricPanels: fabricUsage.panels,
      fabricCode: fabric?.code || '', fabricDescription: fabric?.description || '',
      fabricRollWidth: fabric?.width || 120,
      ...separateValanceCalculation(separateValance),
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

// Piezas del Cuarzo Box contrastadas con el consumo real de 38 OF desde 2024:
// - Conjunto de soportes STORBOX 250 (31 OF), que no se reservaba.
// - Motor Sunea 35/17 con el kit del tubo Ø70: rueda centrada Hi68 y corona centrada
//   mecanizada (11-12 OF). Se reservaba la corona LT50 Ø70, que no se consume, y no
//   se reservaban ni el motor ni la rueda.
// - Máquina con casquillo de eje 50 Ø70 (16 OF; el de 63 en 9, Q-PR02) y sin CASPLAS.
// - Varilla blanca al largo del perfil (29 OF; la negra solo en 5).
function cuarzoPieces(context) {
  const { awning, lacado, device, stockLength, structureLength, rollTubeLength, loadBarLength, motorPower } = context;
  const units = Math.max(1, Number(awning.units) || 1);
  const pieces = [
    { code: `SOSTORBOX25${lacado.suffix}`, quantity: units, description: 'CONJUNTO SOPORTES STORBOX 250' },
    { code: 'TURA70HG600C', quantity: units, description: 'TUBO DE ENROLLE P701', length: rollTubeLength },
    { code: tipBushing('P701').code, quantity: units, description: tipBushing('P701').description },
    { code: `PSBOX250${lacado.suffix}${stockLength}C`, quantity: units, description: 'KIT PERFILES ALUMINIO STORBOX250', length: structureLength },
    { code: null, quantity: units, description: 'BARRA DE CARGA STORBOX 250', length: loadBarLength, reserve: false },
    { code: `BART25${lacado.suffix}${awning.projection}C`, quantity: units, description: 'JUEGO DE BRAZOS ART250', length: awning.projection },
    { code: 'VARILLAVAINARBLA', quantity: round1(Math.ceil(Number(structureLength) || 0) / 100 * units), description: 'VARILLA VAINA RIGIDA 5,5 BLANCA', despiece: false }
  ];
  if (device === 'MOTOR') {
    const remote = resolveMotorRemote(awning.sensor);
    const sensor = sensorMaterial(awning.sensor);
    pieces.push(
      { code: 'RUEDAMOTHI68', quantity: units, description: 'RUEDA MOTRIZ CENTRADA HIPRO Ø68' },
      { code: `SUNEAIO${motorPower}//17`, quantity: units, description: `MOTOR SOMFY SUNEA ${motorPower}/17 IO` },
      { code: 'CORONACENMEC70', quantity: units, description: 'CORONA CENTRADA MECANIZADA TUBO Ø70' },
      { code: 'SOPORTEUNVHIPRO', quantity: units, description: 'SOPORTE UNIVERSAL HIPRO' },
      { code: remote.code, quantity: units, description: remote.description },
      ...(sensor ? [{ ...sensor, quantity: units }] : [])
    );
  } else {
    const crankHeight = Math.max(0, Number(awning.crankHeight) || 0);
    pieces.push(
      { code: 'CASMAQEJE5070MM', quantity: units, description: 'CASQUILLO MAQUINA EJE 50MM Ø70' },
      { code: machineCode(lacado), quantity: units, description: `MÁQUINA MB-11 L-120 ${lacado.crank}` },
      { code: `MANIVE${crankSuffix(lacado)}${crankHeight}C`, quantity: units, description: `MANIVELA LUXE ${lacado.crank} ${crankHeight}`, length: crankHeight }
    );
  }
  return pieces;
}

function buildMaterials(context) {
  const { awning, fabric, separateValance, fabricMl } = context;
  const units = Math.max(1, Number(awning.units) || 1);
  const materials = cuarzoPieces(context)
    .filter((piece) => piece.code && piece.reserve !== false)
    .map(({ code, quantity, description }) => ({ code, quantity, description }));
  if (fabric) materials.push({ code: fabric.code, quantity: fabricMl, description: fabric.description });
  appendSeparateValanceMaterial(materials, separateValance);
  const wallEntry = behaviorData.options.tiposPared.find((item) => item.pared === awning.wallType);
  if (wallEntry?.referencia) materials.push({ code: wallEntry.referencia, quantity: wallEntry.unidades * units, description: wallEntry.tornilleria });
  return materials;
}

function buildDespiece(context) {
  const { awning } = context;
  const units = Math.max(1, Number(awning.units) || 1);
  const rows = cuarzoPieces(context)
    .filter((piece) => piece.despiece !== false)
    .map((piece, index) => ({ num: index + 1, name: piece.description, reference: piece.code || null, units: piece.quantity, length: piece.length ?? null }));
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

function effectiveNumber(awning, field, fallback) { return effectiveOverride(awning, field, fallback); }

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
