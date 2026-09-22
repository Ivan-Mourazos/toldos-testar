import { tipBushing } from './tipBushing.js';
import { formatNumber } from './math.js';
import { findNegativeCuts, negativeCutMessage } from './cutGuards.js';
import { resolveFabric } from './fabricCatalog.js';
import { calculateFabricUsage } from './fabricMath.js';
import { crankSuffix, machineCode, plasticCapSuffix, resolveLacado, universProfileSuffix } from './lacados.js';
import behaviorData from './data/modelBehavior.json' with { type: 'json' };
import { normalizeCortinaParameters } from './cortinaParameters.js';
import { universProfileStockLengths } from './universProfileLengths.js';
import {
  appendSeparateValanceDiagnostic,
  appendSeparateValanceMaterial,
  calculateSeparateValance,
  separateValanceCalculation
} from './separateValance.js';

export function calculateCortina({ order, awning }) {
  const parameters = normalizeCortinaParameters(order.parameters?.cortina);
  const structureColor = awning.structureColor || order.structureColor;
  const lacado = resolveLacado(structureColor);
  const device = normalizeDevice(awning.device);
  const curtainSupport = normalizeCurtainSupport(awning.curtainSupport);
  const fabricSelection = order.sameFabric !== false ? order.fabric : awning.fabric;
  const fabric = fabricSelection ? resolveFabric(fabricSelection) : null;
  // Con el candado manda el valor escrito; sin él, 18 cm salvo que el técnico
  // elija no restarlos (Iván, 22/09/2026).
  const deduction = awning.reglasModificadas && awning.curtainFabricDeductionCm !== null && awning.curtainFabricDeductionCm !== undefined
    ? Math.max(0, Number(awning.curtainFabricDeductionCm) || 0)
    : awning.curtainSkipBottomDeduction ? 0 : parameters.bottomDeductionCm;
  const motorPower = device === 'MOTOR'
    ? !(parameters.legacyReservation === true) && awning.reglasModificadas && ['35/17', '55/17'].includes(String(awning.motorPower)) ? String(awning.motorPower) : '15/17'
    : '';
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

  const fabricWidthDiscount = effectiveDiscount(awning, 'curtainFabricWidthDiscountCm', parameters.fabricWidthDiscounts, device);
  const rollTubeDiscount = effectiveDiscount(awning, 'curtainRollTubeDiscountCm', parameters.rollTubeDiscounts, device);
  const loadProfileDiscount = effectiveDiscount(awning, 'curtainLoadProfileDiscountCm', parameters.loadProfileDiscounts, device);
  const fabricWidth = round1(awning.width - fabricWidthDiscount);
  const rollTubeLength = round1(awning.width - rollTubeDiscount);
  const structureLength = round1(awning.width - loadProfileDiscount);
  const valance = Math.max(0, Number(awning.valanceHeight) || 0);
  const separateValance = calculateSeparateValance({ awning, seamAllowanceCm: parameters.seamAllowanceCm, seamBaseCm: parameters.seamBaseCm });
  // El margen de 45 lleva el remate de 5 de la bamba: sin bamba de la misma tela
  // no se suma (Iván, 22/09/2026).
  // Selena reutiliza este cálculo con sus propios márgenes y reserva, pendiente
  // de su revisión: legacyReservation conserva lo anterior al 22/09/2026.
  const legacy = parameters.legacyReservation === true;
  const integratedValance = !separateValance.requested && valance > 0;
  const mainDropAllowance = integratedValance || (legacy && !separateValance.requested)
    ? parameters.fabricDropAllowanceCm
    : Math.max(0, parameters.fabricDropAllowanceCm - 5);
  const fabricDrop = round1(awning.projection + mainDropAllowance + (separateValance.requested ? 0 : valance) - deduction);
  const fabricUsage = calculateFabricUsage({
    width: fabricWidth,
    drop: fabricDrop,
    units: awning.units,
    rollWidth: fabric?.width || 120,
    seamAllowanceCm: parameters.seamAllowanceCm,
    seamBaseCm: parameters.seamBaseCm
  });
  const stockLength = legacy
    ? chooseStockLength(Math.max(rollTubeLength, structureLength), parameters.stockLengths)
    : chooseStockLength(rollTubeLength, parameters.stockLengths);
  const profileStockLength = legacy
    ? stockLength
    : chooseStockLength(structureLength, universProfileStockLengths(universProfileSuffix(lacado.suffix), parameters.stockLengths));
  const overWidth = Number(awning.width) > parameters.standardMaxWidth;
  const overDrop = Number(awning.projection) > parameters.standardMaxDrop;
  const modified = Boolean(awning.reglasModificadas);
  const negativeCuts = missingFields.length === 0
    ? findNegativeCuts([
      { name: 'TELÓN', length: fabricWidth },
      { name: 'TUBO DE ENROLLE', length: rollTubeLength },
      { name: 'PERFIL DE CARGA', length: structureLength }
    ])
    : [];
  const valid = missingFields.length === 0
    && Boolean(fabric)
    && separateValance.valid
    && Boolean(stockLength) && Boolean(profileStockLength)
    && negativeCuts.length === 0
    && (!(overWidth || overDrop) || modified);

  if (negativeCuts.length) {
    diagnostics.push({ level: 'error', awningId: awning.id, message: negativeCutMessage('CORTINA', awning.of, negativeCuts) });
  }

  if (fabricSelection && !fabric) {
    diagnostics.push({ level: 'error', awningId: awning.id, message: `Tela no encontrada en el catálogo: "${fabricSelection}".` });
  }
  appendSeparateValanceDiagnostic(diagnostics, awning, separateValance);
  if (missingFields.length) {
    diagnostics.push({ level: 'error', awningId: awning.id, message: `CORTINA incompleta en OF ${awning.of}: falta ${missingFields.join(' y ')}.` });
  } else if (!stockLength || !profileStockLength) {
    const piece = !stockLength ? `el tubo de ${rollTubeLength}` : `el perfil de ${structureLength}`;
    diagnostics.push({ level: 'error', awningId: awning.id, message: `CORTINA no válida: ningún largo de stock admite ${piece} cm en este lacado.` });
  } else if ((overWidth || overDrop) && !modified) {
    diagnostics.push({ level: 'error', awningId: awning.id, message: `CORTINA fuera de estándar: máximo ${parameters.standardMaxWidth}x${parameters.standardMaxDrop} cm.` });
  } else if (overWidth || overDrop || hasDimensionalOverrides(awning) || (modified && deduction !== parameters.bottomDeductionCm)) {
    diagnostics.push({ level: 'warn', awningId: awning.id, message: `Excepción técnica en OF ${awning.of}: reglas de Cortina modificadas.` });
  }

  const context = { awning, lacado, device, curtainSupport, fabric, separateValance, stockLength, profileStockLength, structureLength, rollTubeLength, fabricWidth, valance, motorPower, fabricMl: fabricUsage.ml };
  return {
    of: awning.of,
    description: buildDescription(awning, { fabricWidth, fabricDrop, fabricMl: fabricUsage.ml }),
    materials: valid ? (legacy ? buildLegacyMaterials(context) : buildMaterials(context)) : [],
    despiece: valid ? (legacy ? buildLegacyDespiece(context) : buildDespiece(context)) : null,
    diagnostics,
    calculation: {
      model: 'CORTINA', valid, minimumLine: 0,
      width: awning.width, projection: awning.projection,
      fabricWidth, fabricDrop, fabricMl: fabricUsage.ml, fabricPanels: fabricUsage.panels,
      mainFabricMl: fabricUsage.ml, mainFabricPanels: fabricUsage.panels,
      fabricCode: fabric?.code || '', fabricDescription: fabric?.description || '',
      fabricRollWidth: fabric?.width || 120,
      ...separateValanceCalculation(separateValance),
      structureLength, rollTubeLength, stockLength, loadProfileStockLength: profileStockLength,
      motorPower, armCount: 0,
      curtainSupport,
      curtainFabricDeductionCm: deduction,
      curtainFabricWidthDiscountCm: fabricWidthDiscount,
      curtainRollTubeDiscountCm: rollTubeDiscount,
      curtainLoadProfileDiscountCm: loadProfileDiscount
    }
  };
}

// Reserva contrastada con el consumo real de 184 OF desde 2025 (CPRImputationMaterialMO),
// 22/09/2026: puente abatible, regleta, máquina, casquillo de punta, varillas y cristal
// se consumían y no se reservaban; el taco de nailon se reservaba y no se consume.
function buildMaterials(context) {
  const { awning, lacado, device, curtainSupport, fabric, separateValance, stockLength, profileStockLength, fabricWidth, valance, motorPower, fabricMl } = context;
  const units = Math.max(1, Number(awning.units) || 1);
  const suffix = lacado.suffix;
  const materials = [
    supportMaterial(curtainSupport, suffix, units),
    material(`TURA80HG${stockLength}C`, units, 'TUBO DE ENROLLE P801'),
    material(tipBushing('P801').code, units, 'CASQUILLO PUNTA CON EJE Ø78'),
    material(`PUNI280${universProfileSuffix(suffix)}${profileStockLength}C`, units, 'TUBO DE CARGA UNIVERS 280'),
    material(`TAPOPLUN280${plasticCapSuffix(lacado)}`, units, 'KIT TAPONES UNIVERS 280')
  ];

  if (device === 'MOTOR') {
    materials.push(
      material('SOPORTEUNVHIPRO', units, 'SOPORTE UNIVERSAL HIPRO'),
      material('CORONALT5078', units, 'CORONA ADAPTADA LT50 TUBO Ø78'),
      material('RUEDAMOT801MEC', units, 'RUEDA MOTRIZ A P-801 MECANIZADA'),
      material(motorCode(motorPower), units, `MOTOR SOMFY SUNILUS ${motorPower} IO`)
    );
  } else {
    const height = Math.max(0, Number(awning.crankHeight) || 0);
    materials.push(
      material(machineCode(lacado), units, `MÁQUINA MB-11 L-120 ${lacado.crank}`),
      material(machineBushing(device).code, units, machineBushing(device).description),
      material(`MANIVE${crankSuffix(lacado)}${height}C`, units, `MANIVELA LUXE ${height} ${lacado.crank}`)
    );
  }
  // Varillas de vaina al frente de tela: negra arriba; blanca abajo y otra en la
  // bamba (el dibujo CORTINA-* del maestro lleva dos varillas blancas).
  const rodMl = Math.ceil(Number(fabricWidth) || 0) / 100;
  materials.push(
    material('PLEACIN', 2 * units, 'PLETINA PUENTE ABATIBLE ACERO INOX'),
    material('ANIACIN', 2 * units, 'ANILLA PUENTE ABATIBLE ACERO INOX'),
    material('KITREGLETAZAMAK', units, 'KIT REGLETA ZAMAK PRT T20 NX'),
    material('MOSQBOACIN60MM', 2 * units, 'MOSQUETONES INOX 60'),
    material('VARILLAVAINANEG5', round1(rodMl * units), 'VARILLA VAINA NEGRA 4,5MM'),
    material('VARILLAVAINARBLA', round1(rodMl * (valance > 0 ? 2 : 1) * units), 'VARILLA VAINA RIGIDA 5,5 BLANCA')
  );
  if (awning.curtainHasWindow) {
    // Cristal de 140 de ancho: frente de tela menos las dos esquinas y 10 cm de
    // margen. Coincide con lo consumido en las OF con ventana (0212718: 3,90 m).
    const glassCm = Number(fabricWidth) - 2 * (Number(awning.curtainWindowCorner) || 0) + 10;
    if (glassCm > 0) materials.push(material('CRISTATP140650', round2(glassCm / 100 * units), 'CRISTAL UV ALTA TRANSPARENCIA 140 AN'));
  }
  if (fabric) materials.push(material(fabric.code, fabricMl, fabric.description));
  appendSeparateValanceMaterial(materials, separateValance);

  const wall = behaviorData.options.tiposPared.find((item) => item.pared === awning.wallType);
  if (wall?.referencia) materials.push(material(wall.referencia, wall.unidades * units, wall.tornilleria));
  return materials;
}

function buildDespiece(context) {
  const { awning, lacado, device, curtainSupport, stockLength, profileStockLength, structureLength, rollTubeLength, motorPower } = context;
  const units = Math.max(1, Number(awning.units) || 1);
  const suffix = lacado.suffix;
  const rows = [];
  // Numeración seguida: con máquina hay una fila menos que con motor.
  const push = (_num, name, reference, rowUnits, length = null) => rows.push({ num: rows.length + 1, name, reference, units: rowUnits, length });

  const support = supportMaterial(curtainSupport, suffix, units);
  push(1, support.description, support.code, units);
  push(2, 'TUBO DE ENROLLE P801', `TURA80HG${stockLength}C`, units, rollTubeLength);
  push(3, 'CASQUILLO PUNTA', tipBushing('P801').code, units);
  push(4, device === 'MOTOR' ? 'SOPORTE UNIVERSAL HIPRO' : machineBushing(device).description, device === 'MOTOR' ? 'SOPORTEUNVHIPRO' : machineBushing(device).code, units);
  push(5, 'TUBO DE CARGA UNIVERS 280', `PUNI280${universProfileSuffix(suffix)}${profileStockLength}C`, units, structureLength);
  push(6, 'KIT TAPONES UNIVERS 280', `TAPOPLUN280${plasticCapSuffix(lacado)}`, units);
  if (device === 'MOTOR') {
    push(7, 'CORONA ADAPTADA LT50 TUBO Ø78', 'CORONALT5078', units);
    push(8, 'RUEDA MOTRIZ A P-801 MECANIZADA', 'RUEDAMOT801MEC', units);
    push(9, `MOTOR SOMFY SUNILUS ${motorPower} IO`, motorCode(motorPower), units);
  } else {
    const height = Math.max(0, Number(awning.crankHeight) || 0);
    push(7, `MÁQUINA MB-11 L-120 ${lacado.crank}`, machineCode(lacado), units);
    push(8, `MANIVELA LUXE ${height} ${lacado.crank}`, `MANIVE${crankSuffix(lacado)}${height}C`, units, height);
  }
  push(10, 'CADENILLAS INOX', null, 2 * units);
  push(11, 'PUENTE ABATIBLE: PLETINA', 'PLEACIN', 2 * units);
  push(12, 'PUENTE ABATIBLE: ANILLA', 'ANIACIN', 2 * units);
  push(13, 'MOSQUETONES INOX 60', 'MOSQBOACIN60MM', 2 * units);
  push(14, 'KIT REGLETA ZAMAK', 'KITREGLETAZAMAK', units);

  const wall = behaviorData.options.tiposPared.find((item) => item.pared === awning.wallType);
  const anchoring = wall ? { name: wall.tornilleria, reference: wall.referencia || null, units: wall.unidades * units } : null;
  return { rows, anchoring };
}

// Reserva y despiece anteriores al 22/09/2026. Solo los usa Selena hasta su revisión.
function buildLegacyMaterials(context) {
  const { awning, lacado, device, curtainSupport, fabric, separateValance, stockLength, fabricMl } = context;
  const units = Math.max(1, Number(awning.units) || 1);
  const suffix = lacado.suffix;
  const materials = [
    supportMaterial(curtainSupport, suffix, units),
    material(`TURA80HG${stockLength}C`, units, 'TUBO DE ENROLLE P801'),
    material(`PUNI280${universProfileSuffix(suffix)}${stockLength}C`, units, 'TUBO DE CARGA UNIVERS 280'),
    material(`TAPOPLUN280${plasticCapSuffix(lacado)}`, units, 'KIT TAPONES UNIVERS 280')
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
  appendSeparateValanceMaterial(materials, separateValance);

  const wall = behaviorData.options.tiposPared.find((item) => item.pared === awning.wallType);
  if (wall?.referencia) materials.push(material(wall.referencia, wall.unidades * units, wall.tornilleria));
  return materials;
}

function buildLegacyDespiece(context) {
  const { awning, lacado, device, curtainSupport, stockLength, structureLength, rollTubeLength } = context;
  const units = Math.max(1, Number(awning.units) || 1);
  const suffix = lacado.suffix;
  const rows = [];
  const push = (num, name, reference, rowUnits, length = null) => rows.push({ num, name, reference, units: rowUnits, length });

  const support = supportMaterial(curtainSupport, suffix, units);
  push(1, support.description, support.code, units);
  push(2, 'TUBO DE ENROLLE P801', `TURA80HG${stockLength}C`, units, rollTubeLength);
  push(3, 'CASQUILLO PUNTA', tipBushing('P801').code, units);
  push(4, device === 'MOTOR' ? 'SOPORTE UNIVERSAL HIPRO' : 'CASQUILLO MAQUINA EJE 50MM Ø78', device === 'MOTOR' ? 'SOPORTEUNVHIPRO' : 'CASMAQEJE5078MM', units);
  push(5, 'TUBO DE CARGA UNIVERS 280', `PUNI280${universProfileSuffix(suffix)}${stockLength}C`, units, structureLength);
  push(6, 'KIT TAPONES UNIVERS 280', `TAPOPLUN280${plasticCapSuffix(lacado)}`, units);
  if (device === 'MOTOR') {
    push(8, 'CORONA LT 60 ADAPTADA Ø 78', 'CORONALT6078', units);
    push(9, 'RUEDA MOTRIZ Ø 78', 'RUEDAMOT78', units);
    push(10, 'MOTOR SOMFY SUNILUS 15/17 IO', 'SUNILUSIO15//17', units);
  } else {
    const height = Math.max(0, Number(awning.crankHeight) || 0);
    push(8, `MÁQUINA MB-11 L-120 ${lacado.crank}`, machineCode(lacado), units);
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

function supportMaterial(curtainSupport, suffix, units) {
  return curtainSupport === 'MAXISCREEM'
    ? material(`SOPMAXSCR${suffix}`, units, 'JGO. SOPORTE MAXISCREEM')
    : material(`SOPUNI3AGU${suffix}`, units, 'JGO. SOPORTE UNIVERSAL 3 AGUJEROS');
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

function normalizeCurtainSupport(value) {
  return String(value || '').trim().toUpperCase() === 'MAXISCREEM'
    ? 'MAXISCREEM'
    : 'UNIVERSAL 3 AGUJEROS';
}

function effectiveDiscount(awning, field, table, device) {
  const override = awning[field];
  return awning.reglasModificadas && override !== null && override !== undefined && Number.isFinite(Number(override))
    ? Math.max(0, Number(override))
    : discount(table, device);
}

function hasDimensionalOverrides(awning) {
  return Boolean(awning.reglasModificadas) && ['curtainFabricWidthDiscountCm', 'curtainRollTubeDiscountCm', 'curtainLoadProfileDiscountCm']
    .some((field) => awning[field] !== null && awning[field] !== undefined);
}

function chooseStockLength(length, stockLengths) {
  return stockLengths.find((item) => item >= length) || null;
}

function buildDescription(awning, calculation) {
  const window = awning.curtainHasWindow ? 'con ventana' : 'sin ventana';
  const support = normalizeCurtainSupport(awning.curtainSupport) === 'MAXISCREEM' ? ' · soporte Maxiscreem' : '';
  return `Toldo CORTINA ${formatNumber(awning.width)}x${formatNumber(awning.projection)} · ${window}${support} · tela ${formatNumber(calculation.fabricWidth)}x${formatNumber(calculation.fabricDrop)} · ${formatNumber(calculation.fabricMl)} ml`;
}

// Como en Arzúa: máquina interior con eje 50, exterior con eje 63. En Cortina el
// consumo real va igual (exterior: 15 de 21 OF con eje 63).
function machineBushing(device) {
  return device === 'MAQ. EXTERIOR'
    ? { code: 'CASMAQEJE6378MM', description: 'CASQUILLO MAQUINA EJE 63MM Ø78' }
    : { code: 'CASMAQEJE5078MM', description: 'CASQUILLO MAQUINA EJE 50MM Ø78' };
}

function motorCode(motorPower) {
  return `SUNILUSIO${String(motorPower).replace('/', '//')}`;
}

function round2(value) {
  return Math.round((Number(value) + Number.EPSILON) * 100) / 100;
}

function round1(value) {
  return Math.round((Number(value) + Number.EPSILON) * 10) / 10;
}
