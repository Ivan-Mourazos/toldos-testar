import { formatNumber } from './math.js';
import { resolveFabric } from './fabricCatalog.js';
import { calculateFabricUsage } from './fabricMath.js';
import { crankSuffix, machineCode, resolveLacado } from './lacados.js';
import behaviorData from './data/modelBehavior.json' with { type: 'json' };
import { normalizeCortinaParameters } from './cortinaParameters.js';

export function calculateCortina({ order, awning }) {
  const parameters = normalizeCortinaParameters(order.parameters?.cortina);
  const structureColor = awning.structureColor || order.structureColor;
  const lacado = resolveLacado(structureColor);
  const device = normalizeDevice(awning.device);
  const fabricSelection = order.sameFabric !== false ? order.fabric : awning.fabric;
  const fabric = fabricSelection ? resolveFabric(fabricSelection) : null;
  const deduction = awning.reglasModificadas
    ? Math.max(0, Number(awning.curtainFabricDeductionCm) || 0)
    : 0;
  const missingFields = [];
  const diagnostics = [];

  if (!structureColor) missingFields.push('lacado');
  if (!fabricSelection) missingFields.push('tela');
  if (!device) missingFields.push('dispositivo válido');
  if (device !== 'MOTOR' && !awning.crankHeight) missingFields.push('altura de manivela');
  if (awning.curtainHasWindow === null) missingFields.push('ventana');
  if (!awning.curtainFinish) missingFields.push('confección');

  const missingWindowDimensions = awning.curtainHasWindow
    ? ['curtainWindowExit', 'curtainWindowCorner', 'curtainWindowFloorHeight', 'curtainWindowHeight']
      .filter((field) => !Number(awning[field]))
    : [];
  if (missingWindowDimensions.length) missingFields.push('medidas de ventana');

  const fabricWidth = round1(awning.width - discount(parameters.fabricWidthDiscounts, device));
  const rollTubeLength = round1(awning.width - discount(parameters.rollTubeDiscounts, device));
  const structureLength = round1(awning.width - discount(parameters.loadProfileDiscounts, device));
  const valance = Math.max(0, Number(awning.valanceHeight) || 0);
  const fabricDrop = round1(awning.projection + valance + parameters.fabricDropAllowanceCm - deduction);
  const fabricUsage = calculateFabricUsage({
    width: fabricWidth,
    drop: fabricDrop,
    units: awning.units,
    rollWidth: fabric?.width || 120,
    seamAllowanceCm: parameters.seamAllowanceCm,
    seamBaseCm: parameters.seamBaseCm
  });
  const stockLength = chooseStockLength(Math.max(rollTubeLength, structureLength), parameters.stockLengths);
  const overWidth = Number(awning.width) > parameters.standardMaxWidth;
  const overDrop = Number(awning.projection) > parameters.standardMaxDrop;
  const modified = Boolean(awning.reglasModificadas);
  const valid = missingFields.length === 0
    && Boolean(fabric)
    && Boolean(stockLength)
    && (!(overWidth || overDrop) || modified);

  if (fabricSelection && !fabric) {
    diagnostics.push({ level: 'error', awningId: awning.id, message: `Tela no encontrada en el catálogo: "${fabricSelection}".` });
  }
  if (missingFields.length) {
    diagnostics.push({ level: 'error', awningId: awning.id, message: `CORTINA incompleta en OF ${awning.of}: falta ${missingFields.join(' y ')}.` });
  } else if (!stockLength) {
    diagnostics.push({ level: 'error', awningId: awning.id, message: `CORTINA no válida: ningún largo de stock admite ${Math.max(rollTubeLength, structureLength)} cm.` });
  } else if ((overWidth || overDrop) && !modified) {
    diagnostics.push({ level: 'error', awningId: awning.id, message: `CORTINA fuera de estándar: máximo ${parameters.standardMaxWidth}x${parameters.standardMaxDrop} cm.` });
  } else if (overWidth || overDrop || deduction > 0) {
    diagnostics.push({ level: 'warn', awningId: awning.id, message: `Excepción técnica en OF ${awning.of}: reglas de Cortina modificadas.` });
  }

  const context = { awning, lacado, device, fabric, stockLength, structureLength, rollTubeLength, fabricMl: fabricUsage.ml };
  return {
    of: awning.of,
    description: buildDescription(awning, { fabricWidth, fabricDrop, fabricMl: fabricUsage.ml }),
    materials: valid ? buildMaterials(context) : [],
    despiece: valid ? buildDespiece(context) : null,
    diagnostics,
    calculation: {
      model: 'CORTINA', valid, minimumLine: 0,
      width: awning.width, projection: awning.projection,
      fabricWidth, fabricDrop, fabricMl: fabricUsage.ml, fabricPanels: fabricUsage.panels,
      fabricCode: fabric?.code || '', fabricDescription: fabric?.description || '',
      fabricRollWidth: fabric?.width || 120,
      structureLength, rollTubeLength, stockLength,
      motorPower: device === 'MOTOR' ? '15/17' : '', armCount: 0,
      curtainFabricDeductionCm: deduction
    }
  };
}

function buildMaterials(context) {
  const { awning, lacado, device, fabric, stockLength, fabricMl } = context;
  const units = Math.max(1, Number(awning.units) || 1);
  const suffix = lacado.suffix;
  const materials = [
    material(`SOPUNI3AGU${suffix}`, units, 'JGO. SOPORTE UNIVERSAL 3 AGUJEROS'),
    material(`TURA80HG${stockLength}C`, units, 'TUBO DE ENROLLE P801'),
    material(`PUNI280${suffix}${stockLength}C`, units, 'TUBO DE CARGA UNIVERS 280'),
    material(`TAPOPLUN280${suffix}`, units, 'KIT TAPONES UNIVERS 280')
  ];

  if (device === 'MOTOR') {
    materials.push(
      material('SOPORTEUNVHIPRO', units, 'SOPORTE UNIVERSAL HIPRO'),
      material('CORONALT6078', units, 'CORONA LT 60 ADAPTADA Ø 78'),
      material('RUEDAMOT78', units, 'RUEDA MOTRIZ Ø 78'),
      material('SUNILUSIO15//17', units, 'MOTOR SOMFY SUNILUS 15/17 IO')
    );
  } else {
    const height = Math.max(0, Number(awning.crankHeight) || 0);
    materials.push(
      material('CASMAQEJE5078MM', units, 'CASQUILLO MAQUINA EJE 50MM Ø78'),
      material('CASPLAS', units, 'TACO NAYLON MAQUINA'),
      material(`MANIVE${crankSuffix(lacado)}${height}C`, units, `MANIVELA LUXE ${height} ${lacado.crank}`)
    );
  }
  materials.push(material('MOSQBOACIN60MM', 2 * units, 'MOSQUETONES INOX 60'));
  if (fabric) materials.push(material(fabric.code, fabricMl, fabric.description));

  const wall = behaviorData.options.tiposPared.find((item) => item.pared === awning.wallType);
  if (wall?.referencia) materials.push(material(wall.referencia, wall.unidades * units, wall.tornilleria));
  return materials;
}

function buildDespiece(context) {
  const { awning, lacado, device, stockLength, structureLength, rollTubeLength } = context;
  const units = Math.max(1, Number(awning.units) || 1);
  const suffix = lacado.suffix;
  const rows = [];
  const push = (num, name, reference, rowUnits, length = null) => rows.push({ num, name, reference, units: rowUnits, length });

  push(1, 'JGO.SOPORTE UNIVERSAL 3 FUROS', `SOPUNI3AGU${suffix}`, units);
  push(2, 'TUBO DE ENROLLE P801', `TURA80HG${stockLength}C`, units, rollTubeLength);
  push(3, 'CASQUILLO PUNTA', 'CASPUNCE', units);
  push(4, device === 'MOTOR' ? 'SOPORTE UNIVERSAL HIPRO' : 'CASQUILLO MAQUINA EJE 50MM Ø78', device === 'MOTOR' ? 'SOPORTEUNVHIPRO' : 'CASMAQEJE5078MM', units);
  push(5, 'TUBO DE CARGA UNIVERS 280', `PUNI280${suffix}${stockLength}C`, units, structureLength);
  push(6, 'KIT TAPONES UNIVERS 280', `TAPOPLUN280${suffix}`, units);
  if (device === 'MOTOR') {
    push(8, 'CORONA LT 60 ADAPTADA Ø 78', 'CORONALT6078', units);
    push(9, 'RUEDA MOTRIZ Ø 78', 'RUEDAMOT78', units);
    push(10, 'MOTOR SOMFY SUNILUS 15/17 IO', 'SUNILUSIO15//17', units);
  } else {
    const height = Math.max(0, Number(awning.crankHeight) || 0);
    push(8, `MAQUINA ZNP 10 L170 ${lacado.crank}`, machineCode(lacado), units);
    push(9, 'TACO NAYLON MAQUINA', 'CASPLAS', units);
    push(10, `MANIVELA LUXE ${height} ${lacado.crank}`, `MANIVE${crankSuffix(lacado)}${height}C`, units, height);
  }
  push(11, 'CADENILLAS INOX', null, 2 * units);
  push(12, 'PUENTES ABATIBLES', null, 2 * units);
  push(13, 'MOSQUETONES INOX 60', 'MOSQBOACIN60MM', 2 * units);
  push(14, 'REGLETA ZAMACK', null, 2 * units);

  const wall = behaviorData.options.tiposPared.find((item) => item.pared === awning.wallType);
  const anchoring = wall ? { name: wall.tornilleria, reference: wall.referencia || null, units: wall.unidades * units } : null;
  return { rows, anchoring };
}

function material(code, quantity, description) {
  return { code, quantity, description };
}

function normalizeDevice(value) {
  const clean = String(value || '').trim().toUpperCase();
  if (clean === 'MOTOR') return 'MOTOR';
  if (clean === 'MAQ. INTERIOR' || clean === 'MAQUINA') return 'MAQ. INTERIOR';
  if (clean === 'MAQ. EXTERIOR') return 'MAQ. EXTERIOR';
  return '';
}

function discount(table, device) {
  return Number(table[device || 'MOTOR']) || 0;
}

function chooseStockLength(length, stockLengths) {
  return stockLengths.find((item) => item >= length) || null;
}

function buildDescription(awning, calculation) {
  const window = awning.curtainHasWindow ? 'con ventana' : 'sin ventana';
  return `Toldo CORTINA ${formatNumber(awning.width)}x${formatNumber(awning.projection)} · ${window} · tela ${formatNumber(calculation.fabricWidth)}x${formatNumber(calculation.fabricDrop)} · ${formatNumber(calculation.fabricMl)} ml`;
}

function round1(value) {
  return Math.round((Number(value) + Number.EPSILON) * 10) / 10;
}
