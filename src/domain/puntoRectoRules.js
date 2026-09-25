import { effectiveOverride } from './ruleOverrides.js';
import { tipBushing } from './tipBushing.js';
import { formatNumber } from './math.js';
import { findNegativeCuts, negativeCutMessage } from './cutGuards.js';
import { resolveFabric } from './fabricCatalog.js';
import { calculateFabricUsage } from './fabricMath.js';
import { crankSuffix, machineCode, plasticCapSuffix, resolveLacado, universProfileSuffix } from './lacados.js';
import { universProfileStockLengths } from './universProfileLengths.js';
import { puntoRectoArmCode } from './puntoRectoArms.js';
import behaviorData from './data/modelBehavior.json' with { type: 'json' };
import { resolveMotorRemote } from './motorAccessories.js';
import {
  normalizePuntoRectoParameters,
  resolvePuntoRectoMotorPower,
  suggestedPuntoRectoArmCount
} from './puntoRectoParameters.js';
import {
  calculateVerticalDropArmFabricDrop,
  isVerticalDropArmMode,
  normalizeDropArmMode
} from './dropArmMode.js';
import {
  appendSeparateValanceDiagnostic,
  appendSeparateValanceMaterial,
  calculateSeparateValance,
  separateValanceCalculation
} from './separateValance.js';

export function calculatePuntoRecto({ order, awning }) {
  const parameters = normalizePuntoRectoParameters(order.parameters?.puntoRecto);
  const structureColor = awning.structureColor || order.structureColor;
  const lacado = resolveLacado(structureColor);
  const device = normalizeDevice(awning.device);
  const fabricSelection = order.sameFabric !== false ? order.fabric : awning.fabric;
  const fabric = fabricSelection ? resolveFabric(fabricSelection) : null;
  const requiredArmCount = suggestedPuntoRectoArmCount(awning.width, parameters);
  const armCount = Number(awning.armCount) || requiredArmCount;
  const modified = Boolean(awning.reglasModificadas);
  const dropArmMode = normalizeDropArmMode(awning.dropArmMode);
  const verticalDrop = isVerticalDropArmMode(dropArmMode);
  const diagnostics = [];
  const missingFields = [];

  if (!structureColor) missingFields.push('lacado');
  if (!fabricSelection) missingFields.push('tela');
  if (!device) missingFields.push('dispositivo válido');
  if (![1, 2, 3, 4].includes(armCount)) missingFields.push('número de brazos válido');
  if (device === 'MAQUINA' && !awning.crankHeight) missingFields.push('altura de manivela');

  const fabricDiscount = effectiveNumber(awning, 'pointFabricWidthDiscountCm', parameters.fabricWidthDiscounts[device || 'MAQUINA']);
  const rollDiscount = effectiveNumber(awning, 'pointRollDiscountCm', parameters.rollTubeDiscounts[device || 'MAQUINA']);
  const loadBarDiscount = effectiveNumber(awning, 'pointLoadBarDiscountCm', parameters.loadBarDiscounts[device || 'MAQUINA']);
  const dropMultiplier = effectiveNumber(awning, 'pointFabricDropMultiplier', parameters.fabricDropMultiplier);
  const dropAllowance = effectiveNumber(awning, 'pointFabricDropAllowanceCm', parameters.fabricDropAllowanceCm);
  const verticalDropAllowance = effectiveNumber(awning, 'dropArmVerticalAllowanceCm', parameters.verticalFabricDropAllowanceCm);
  const valance = Math.max(0, Number(awning.valanceHeight) || 0);
  const fabricWidth = round1(awning.width - fabricDiscount);
  const separateValance = calculateSeparateValance({ awning, seamAllowanceCm: parameters.seamAllowanceCm, seamBaseCm: parameters.seamBaseCm });
  // La hoja PUNTO RECTO del libro antiguo usa salida + 40 cuando la bamba va en otra tela.
  const rawFabricDrop = verticalDrop
    ? calculateVerticalDropArmFabricDrop({
        projection: awning.projection,
        allowanceCm: verticalDropAllowance,
        valanceHeight: valance,
        separateValance: separateValance.requested
      })
    : separateValance.requested
      ? Number(awning.projection) + 40
      : Number(awning.projection) * dropMultiplier + dropAllowance + valance;
  const fabricDrop = round1(rawFabricDrop);
  const rollTubeLength = round1(awning.width - rollDiscount);
  const loadBarLength = round1(awning.width - loadBarDiscount);
  const rollSystem = Number(awning.width) > parameters.armSwitchWidth ? 'P801' : 'P701';
  // El tubo Ø70 no tiene barra de 400: está de baja desde 2021. El Ø80 sí.
  const tubeLengths = parameters.stockLengths.filter((length) => rollSystem === 'P801' || length >= 500);
  const stockLength = tubeLengths.find((length) => length >= rollTubeLength) || null;
  // El perfil es el Univers 280, como en Cortina: el 270 solo existe en blanco de
  // 700 y no se consume desde 2025 (22/09/2026).
  const profileLengths = universProfileStockLengths(universProfileSuffix(lacado.suffix), parameters.stockLengths);
  const profileStockLength = profileLengths.find((length) => length >= loadBarLength) || null;
  const armCode = puntoRectoArmCode(lacado.suffix, awning.projection);
  const motorPower = resolvePuntoRectoMotorPower(armCount, parameters);
  const fabricUsage = calculateFabricUsage({
    width: fabricWidth,
    drop: rawFabricDrop,
    units: awning.units,
    rollWidth: fabric?.width || 120,
    seamAllowanceCm: parameters.seamAllowanceCm,
    seamBaseCm: parameters.seamBaseCm
  });
  const invalidArms = ![1, 2, 3, 4].includes(armCount) || (armCount < requiredArmCount && !modified);
  const overMaximum = Number(awning.width) > parameters.standardMaxWidth;
  const negativeCuts = missingFields.length === 0
    ? findNegativeCuts([
      { name: 'TELÓN', length: fabricWidth },
      { name: 'TUBO DE ENROLLE', length: rollTubeLength },
      { name: 'BARRA DE CARGA', length: loadBarLength }
    ])
    : [];
  const valid = missingFields.length === 0
    && Boolean(fabric)
    && separateValance.valid
    && !invalidArms
    && Boolean(stockLength) && Boolean(profileStockLength)
    && Boolean(armCode)
    && negativeCuts.length === 0
    && (!overMaximum || modified);

  if (negativeCuts.length) {
    diagnostics.push({ level: 'error', awningId: awning.id, message: negativeCutMessage('PUNTO RECTO', awning.of, negativeCuts) });
  }

  if (fabricSelection && !fabric) diagnostics.push({ level: 'error', awningId: awning.id, message: `Tela no encontrada en el catálogo: "${fabricSelection}".` });
  appendSeparateValanceDiagnostic(diagnostics, awning, separateValance);
  if (missingFields.length) {
    diagnostics.push({ level: 'error', awningId: awning.id, message: `PUNTO RECTO incompleto en OF ${awning.of}: falta ${missingFields.join(' y ')}.` });
  } else if (invalidArms) {
    diagnostics.push({ level: 'error', awningId: awning.id, message: `PUNTO RECTO necesita al menos ${requiredArmCount} brazos para ${awning.width} cm de frente.` });
  } else if (overMaximum && !modified) {
    diagnostics.push({ level: 'error', awningId: awning.id, message: `PUNTO RECTO no válido: frente ${awning.width} cm supera el máximo estándar de ${parameters.standardMaxWidth} cm.` });
  } else if (!armCode) {
    diagnostics.push({ level: 'error', awningId: awning.id, message: `PUNTO RECTO no válido: no hay brazo PRT-07 de ${formatNumber(awning.projection)} cm en ${lacado.name}.` });
  } else if (!stockLength || !profileStockLength) {
    const piece = !stockLength ? `el tubo de ${rollTubeLength}` : `el perfil de ${loadBarLength}`;
    diagnostics.push({ level: 'error', awningId: awning.id, message: `PUNTO RECTO no válido: ningún largo de stock admite ${piece} cm en este lacado.` });
  } else if (modified) {
    diagnostics.push({ level: 'warn', awningId: awning.id, message: `Excepción técnica en OF ${awning.of}: reglas de PUNTO RECTO modificadas.` });
  }
  if (verticalDrop) {
    diagnostics.push({
      level: 'warn',
      awningId: awning.id,
      message: `Bajada vertical 170° en OF ${awning.of}: corte de paño ${formatNumber(fabricDrop)} cm. Confirmar el límite de giro y el montaje antes de fabricar.`
    });
  }

  const context = { awning, device, lacado, fabric, separateValance, stockLength, profileStockLength, rollSystem, armCount, armCode, motorPower, rollTubeLength, loadBarLength, fabricWidth, valance, fabricMl: fabricUsage.ml };
  return {
    of: awning.of,
    description: buildDescription(awning, {
      fabricWidth,
      fabricDrop,
      fabricMl: fabricUsage.ml,
      dropArmMode,
      separateValance: separateValance.requested
    }),
    materials: valid ? buildMaterials(context) : [],
    despiece: valid ? buildDespiece(context) : null,
    diagnostics,
    calculation: {
      model: 'PUNTO RECTO', valid, minimumLine: 0,
      width: awning.width, projection: awning.projection,
      fabricWidth, fabricDrop, fabricUsageDrop: rawFabricDrop, fabricMl: fabricUsage.ml, fabricPanels: fabricUsage.panels,
      mainFabricMl: fabricUsage.ml, mainFabricPanels: fabricUsage.panels,
      fabricCode: fabric?.code || '', fabricDescription: fabric?.description || '',
      fabricRollWidth: fabric?.width || 120,
      ...separateValanceCalculation(separateValance),
      structureLength: loadBarLength, rollTubeLength, stockLength, loadProfileStockLength: profileStockLength,
      armCount, requiredArmCount, rollSystem,
      motorPower: device === 'MOTOR' ? motorPower : '',
      pointFabricWidthDiscountCm: fabricDiscount,
      pointRollDiscountCm: rollDiscount,
      pointLoadBarDiscountCm: loadBarDiscount,
      pointFabricDropMultiplier: verticalDrop ? 2 : dropMultiplier,
      pointFabricDropAllowanceCm: verticalDrop ? verticalDropAllowance : dropAllowance,
      dropArmMode,
      dropArmAngle: verticalDrop ? 170 : null,
      dropArmVerticalAllowanceCm: verticalDropAllowance
    }
  };
}

function buildMaterials(context) {
  const { awning, device, lacado, fabric, separateValance, stockLength, profileStockLength, rollSystem, armCount, armCode, motorPower, fabricWidth, valance, fabricMl } = context;
  const units = Math.max(1, Number(awning.units) || 1);
  const materials = [
    line(`SOPUNI3AGU${lacado.suffix}`, units, 'JGO.SOPORTE UNIVERSAL 3 FUROS'),
    line(`${rollSystem === 'P801' ? 'TURA80HG' : 'TURA70HG'}${stockLength}C`, units, `TUBO DE ENROLLE ${rollSystem}`),
    line(tipBushing(rollSystem).code, units, tipBushing(rollSystem).description),
    line(`PUNI280${universProfileSuffix(lacado.suffix)}${profileStockLength}C`, units, 'TUBO DE CARGA UNIVERS 280'),
    line(`TAPOPLUN280${plasticCapSuffix(lacado)}`, units, 'KIT TAPONES UNIVERS 280'),
    line(armCode, armCount * units, 'JGO BRAZOS PRT 07')
  ].filter(Boolean);

  if (device === 'MOTOR') {
    const remote = resolveMotorRemote(awning.sensor);
    materials.push(
      line(rollSystem === 'P801' ? 'RUEDAMOT801MEC' : 'ADAPTADORESTUBO70', units, rollSystem === 'P801' ? 'RUEDA MOTRIZ A P-801 MECANIZADA' : 'RUEDA MOTRIZ LT50'),
      line(rollSystem === 'P801' ? 'CORONALT5078' : 'CORONA LT5070', units, rollSystem === 'P801' ? 'CORONA ADAPTADA LT50 TUBO Ø78' : 'CORONA LT50 ADAPTADA Ø70'),
      line(`SUNILUSIO${motorPower.split('/')[0]}//17`, units, `MOTOR SOMFY SUNILUS ${motorPower} IO`),
      line('SOPORTEUNVHIPRO', units, 'SOPORTE UNIVERSAL HIPRO'),
      { ...line(remote.code, units, remote.description), aggregation: 'max' }
    );
    const sensor = sensorMaterial(awning.sensor);
    if (sensor) materials.push({ ...sensor, quantity: units, aggregation: 'max' });
  } else {
    materials.push(
      // Eje 50, como se consume (10 OF frente a 6 con eje 63).
      line(rollSystem === 'P801' ? 'CASMAQEJE5078MM' : 'CASMAQEJE5070MM', units, rollSystem === 'P801' ? 'CASQUILLO MAQUINA EJE 50MM Ø78' : 'CASQUILLO MAQUINA EJE 50MM Ø70'),
      line(machineCode(lacado), units, `MÁQUINA MB-11 L-120 ${lacado.crank}`),
      line(`MANIVE${crankSuffix(lacado)}${Math.max(0, Number(awning.crankHeight) || 0)}C`, units, `MANIVELA LUXE ${Math.max(0, Number(awning.crankHeight) || 0)} ${lacado.crank}`)
    );
  }
  // Varillas de vaina al frente de tela: negra arriba; blanca abajo y en la bamba.
  const rodMl = Math.ceil(Number(fabricWidth) || 0) / 100;
  materials.push(
    line('VARILLAVAINANEG5', round2(rodMl * units), 'VARILLA VAINA NEGRA 4,5MM'),
    line('VARILLAVAINARBLA', round2(rodMl * (valance > 0 ? 2 : 1) * units), 'VARILLA VAINA RIGIDA 5,5 BLANCA')
  );
  if (fabric) materials.push(line(fabric.code, fabricMl, fabric.description));
  appendSeparateValanceMaterial(materials, separateValance);
  const wall = wallMaterial(awning.wallType, units);
  if (wall) materials.push(wall);
  return materials;
}

function buildDespiece(context) {
  const { awning, device, lacado, stockLength, profileStockLength, rollSystem, armCount, armCode, motorPower, rollTubeLength, loadBarLength } = context;
  const units = Math.max(1, Number(awning.units) || 1);
  const rows = [];
  // Numeración seguida: con motor hay una fila menos que con máquina.
  const push = (_num, name, reference, rowUnits, length = null) => rows.push({ num: rows.length + 1, name, reference: reference || null, units: rowUnits, length });
  push(1, 'JGO.SOPORTE UNIVERSAL 3 FUROS', `SOPUNI3AGU${lacado.suffix}`, units);
  push(2, `TUBO DE ENROLLE ${rollSystem}`, `${rollSystem === 'P801' ? 'TURA80HG' : 'TURA70HG'}${stockLength}C`, units, rollTubeLength);
  push(3, 'CASQUILLO PUNTA', tipBushing(rollSystem).code, units);
  if (device === 'MAQUINA') push(4, 'KIT DE TORNILLOS MAQUINA', null, units);
  push(5, 'TUBO DE CARGA UNIVERS 280', `PUNI280${universProfileSuffix(lacado.suffix)}${profileStockLength}C`, units, loadBarLength);
  push(6, 'KIT TAPONES UNIVERS 280', `TAPOPLUN280${plasticCapSuffix(lacado)}`, units);
  push(7, 'JGO BRAZOS PRT 07', armCode, armCount * units, awning.projection);
  if (device === 'MOTOR') {
    const remote = resolveMotorRemote(awning.sensor);
    push(8, rollSystem === 'P801' ? 'RUEDA MOTRIZ A P-801 MECANIZADA' : 'RUEDA MOTRIZ LT50', rollSystem === 'P801' ? 'RUEDAMOT801MEC' : 'ADAPTADORESTUBO70', units);
    push(9, rollSystem === 'P801' ? 'CORONA ADAPTADA LT50 TUBO Ø78' : 'CORONA LT50 ADAPTADA Ø70', rollSystem === 'P801' ? 'CORONALT5078' : 'CORONA LT5070', units);
    push(10, `MOTOR SOMFY SUNILUS ${motorPower} IO`, `SUNILUSIO${motorPower.split('/')[0]}//17`, units);
    push(11, 'SOPORTE UNIVERSAL HIPRO', 'SOPORTEUNVHIPRO', units);
    push(21, remote.description, remote.code, units);
    const sensor = sensorMaterial(awning.sensor);
    if (sensor) push(22, sensor.description, sensor.code, units);
  } else {
    const crankHeight = Math.max(0, Number(awning.crankHeight) || 0);
    push(8, rollSystem === 'P801' ? 'CASQUILLO MAQUINA EJE 50MM Ø78' : 'CASQUILLO MAQUINA EJE 50MM Ø70', rollSystem === 'P801' ? 'CASMAQEJE5078MM' : 'CASMAQEJE5070MM', units);
    push(10, `MANIVELA LUXE ${lacado.crank} ${crankHeight}`, `MANIVE${crankSuffix(lacado)}${crankHeight}C`, units, crankHeight);
    push(11, `MÁQUINA MB-11 L-120 ${lacado.crank}`, machineCode(lacado), units);
  }
  const wallEntry = behaviorData.options.tiposPared.find((item) => item.pared === awning.wallType);
  const anchoring = wallEntry ? { name: wallEntry.tornilleria, reference: wallEntry.referencia || null, units: wallEntry.unidades * units } : null;
  return { rows, anchoring };
}

function line(code, quantity, description) {
  return code ? { code, quantity, description } : null;
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

function normalizeDevice(value) {
  const clean = String(value || '').trim().toUpperCase();
  if (clean === 'MOTOR') return 'MOTOR';
  if (clean.includes('MAQ')) return 'MAQUINA';
  return '';
}

function effectiveNumber(awning, field, fallback) { return effectiveOverride(awning, field, fallback); }

function buildDescription(awning, calculation) {
  const valance = Math.max(0, Number(awning.valanceHeight) || 0);
  const valanceText = valance > 0
    ? calculation.separateValance
      ? ` · bambalina separada de ${valance + 5} cm, hecha de ${valance} cm`
      : ` · bambalina incluida de ${valance + 5} cm, hecha de ${valance} cm`
    : '';
  const verticalText = isVerticalDropArmMode(calculation.dropArmMode)
    ? ` · BAJADA VERTICAL 170° · corte ${formatNumber(calculation.fabricDrop)} cm`
    : '';
  return `Toldo PUNTO RECTO ${awning.width}x${awning.projection} · tela ${formatNumber(calculation.fabricWidth)}x${formatNumber(calculation.fabricDrop)} · paño ${formatNumber(calculation.fabricMl)} ml${verticalText}${valanceText}`;
}

function round2(value) {
  return Math.round((Number(value) + Number.EPSILON) * 100) / 100;
}

function round1(value) {
  return Math.round(Number(value) * 10) / 10;
}
