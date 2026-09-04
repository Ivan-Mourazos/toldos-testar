import { formatNumber } from './math.js';
import { findNegativeCuts, negativeCutMessage } from './cutGuards.js';
import { resolveFabric } from './fabricCatalog.js';
import behaviorData from './data/modelBehavior.json' with { type: 'json' };
import { squareIrisOpening } from './irisGeometry.js';
import {
  getIrisDiscounts,
  getIrisFabricDropAllowance,
  getIrisLimits,
  irisConfigCode,
  irisHasCassette,
  irisSeriesOf,
  normalizeIrisDevice,
  normalizeIrisGuideFixing,
  normalizeIrisGuideType,
  normalizeIrisParameters,
  normalizeIrisSubmodel,
  resolveIrisGlassSize
} from './irisParameters.js';

export function calculateIris({ order, awning }) {
  const parameters = normalizeIrisParameters(order.parameters?.iris);
  const submodel = normalizeIrisSubmodel(awning.submodel);
  const guideType = normalizeIrisGuideType(awning.irisGuideType);
  const guideFixing = normalizeIrisGuideFixing(awning.irisGuideFixing);
  const device = normalizeIrisDevice(awning.device);
  const windBlock = awning.irisWindBlock === true;
  const series = irisSeriesOf(submodel);
  const hasCompensator = guideType === 'COMPENSADORA';
  const hasBox = irisHasCassette(submodel, guideType);
  const modified = Boolean(awning.reglasModificadas);
  const structureColor = awning.structureColor || order.structureColor;
  const fabricSelection = order.sameFabric !== false ? order.fabric : awning.fabric;
  const fabric = fabricSelection ? resolveFabric(fabricSelection) : null;

  const config = { submodel, guideType, device, windBlock };
  const configCode = irisConfigCode(config);
  const discounts = getIrisDiscounts(parameters, config);
  const cuts = discounts || {};
  const opening = squareIrisOpening({
    frontTop: awning.irisFrontTop,
    frontBottom: awning.irisFrontBottom,
    exitLeft: awning.irisExitLeft,
    exitRight: awning.irisExitRight,
    diagonal1: awning.irisDiagonal1,
    diagonal2: awning.irisDiagonal2,
    assumeSquare: awning.irisAssumeSquare === true
  });

  const extra = String(awning.placement || '').toUpperCase() === 'ENTRE PAREDES'
    ? parameters.betweenWallsDiscountCm
    : 0;
  const onCeiling = guideFixing === 'TECHO';
  const guideDiscount = onCeiling ? cuts.guideCeiling : cuts.guideWall;
  const zipDiscount = onCeiling ? cuts.zipCeiling : cuts.zipWall;
  const compensatorDiscount = onCeiling ? cuts.compensatorCeiling : cuts.compensatorWall;

  // Con compensadora el toldo se hace por la medida menor, salvo el cofre, que
  // va por la mayor siempre que esa mayor esté arriba.
  const boxFront = hasCompensator && opening.frontTop >= opening.frontBottom
    ? opening.frontTop
    : opening.frontToldo;

  const fabricWidth = piece(opening.frontToldo, cuts.fabric, extra);
  const rollTubeLength = piece(opening.frontToldo, cuts.roll, extra);
  const loadBarLength = piece(opening.frontToldo, cuts.loadBar, extra);
  const ballastLength = piece(opening.frontToldo, cuts.ballast, extra);
  const boxProfileLength = hasBox ? piece(boxFront, cuts.box, extra) : 0;
  const guideLeftLength = piece(opening.heightLeft, guideDiscount);
  const guideRightLength = piece(opening.heightRight, guideDiscount);
  const zipLeftLength = piece(opening.heightLeft, zipDiscount);
  const zipRightLength = piece(opening.heightRight, zipDiscount);
  const compensatorLeftLength = hasCompensator ? piece(opening.heightLeft, compensatorDiscount) : 0;
  const compensatorRightLength = hasCompensator ? piece(opening.heightRight, compensatorDiscount) : 0;
  const windBlockTerminalLength = windBlock
    ? piece(opening.frontToldo, cuts.windBlockTerminal, extra)
    : 0;

  const dropAllowance = getIrisFabricDropAllowance(parameters, series, device);
  const fabricDrop = opening.valid ? round1(opening.dropOpening + dropAllowance) : 0;
  const hasGlass = awning.curtainHasWindow === true;
  const glassSize = hasGlass ? resolveIrisGlassSize(fabricWidth) : 0;
  const fabricUsage = calculateIrisFabricUsage({
    fabricWidth,
    fabricDrop,
    rollWidth: fabric?.width || 120,
    units: awning.units,
    hasGlass,
    glassSavingM: parameters.glassFabricSavingM
  });

  const limits = getIrisLimits(series);
  const diagnostics = [];
  const missingFields = [];
  if (!submodel) missingFields.push('submodelo');
  if (!guideType) missingFields.push('tipo de guía');
  if (!guideFixing) missingFields.push('fijación de la guía');
  if (!device) missingFields.push('accionamiento');
  if (!awning.placement) missingFields.push('colocación');
  if (!structureColor) missingFields.push('lacado');
  if (!fabricSelection) missingFields.push('tela');
  if (!opening.valid) missingFields.push('medidas del hueco');
  if (awning.curtainHasWindow === null || awning.curtainHasWindow === undefined) missingFields.push('ventana sí/no');
  if (device && device !== 'MOTOR' && !Number(awning.crankHeight)) missingFields.push('altura de manivela');
  if (device && !awning.machineSide) missingFields.push(device === 'MOTOR' ? 'posición del motor' : 'lado de máquina');

  const motorOnly = series === '150';
  const outOfRange = Boolean(limits) && opening.valid && (
    opening.frontToldo > limits.maxWidth || opening.frontToldo < limits.minWidth
    || opening.dropOpening > limits.maxDrop || opening.dropOpening < limits.minDrop
  );
  const slack = Math.max(opening.slackLeft, opening.slackRight);
  const compensatorOverMax = hasCompensator && slack > parameters.compensatorMaxCm;
  const frontDifference = Math.abs(opening.frontTop - opening.frontBottom);

  // Solo comprobamos piezas cuando la geometría y la configuración ya son
  // válidas: si el hueco está roto o la combinación no existe, ese error ya
  // se ha emitido arriba y no hace falta apilar uno más que diga lo mismo.
  const hasBasicConfig = opening.valid && Boolean(discounts);
  const cutPieces = [
    // Los nombres son los de la hoja de taller, no los del cálculo: este
    // diagnóstico lo lee un técnico de oficina, no quien mantiene el código.
    { name: 'TELÓN', length: fabricWidth },
    { name: 'TUBO DE ENROLLE', length: rollTubeLength },
    { name: 'TUBO DE CARGA', length: loadBarLength },
    { name: 'LASTRE', length: ballastLength },
    ...(hasBox ? [{ name: 'PERFIL COFRE', length: boxProfileLength }] : []),
    ...(guideDiscount !== undefined && guideDiscount !== null
      ? [{ name: 'PERFIL GUÍA MFI', length: guideLeftLength }, { name: 'PERFIL GUÍA MFD', length: guideRightLength }]
      : []),
    ...(zipDiscount !== undefined && zipDiscount !== null
      ? [{ name: 'PERFIL GUÍA INTERIOR ZIP MFI', length: zipLeftLength }, { name: 'PERFIL GUÍA INTERIOR ZIP MFD', length: zipRightLength }]
      : []),
    ...(hasCompensator
      ? [{ name: 'GUÍA DE COMPENSACIÓN MFI', length: compensatorLeftLength }, { name: 'GUÍA DE COMPENSACIÓN MFD', length: compensatorRightLength }]
      : []),
    ...(windBlock ? [{ name: 'TERMINAL COMPENSADOR SWBS', length: windBlockTerminalLength }] : [])
  ];
  const negativePieces = hasBasicConfig ? findNegativeCuts(cutPieces) : [];
  const glassOutOfCatalog = hasBasicConfig && hasGlass && glassSize === 0;

  if (fabricSelection && !fabric) {
    diagnostics.push({ level: 'error', awningId: awning.id, message: `Tela no encontrada en el catálogo: "${fabricSelection}".` });
  }
  if (missingFields.length) {
    diagnostics.push({ level: 'error', awningId: awning.id, message: `IRIS incompleto en OF ${awning.of}: falta ${missingFields.join(' y ')}.` });
  }
  if (!opening.valid && awning.irisFrontTop && awning.irisExitLeft) {
    diagnostics.push({ level: 'error', awningId: awning.id, message: `IRIS en OF ${awning.of}: ${opening.error}` });
  }
  if (motorOnly && device === 'MAQUINA') {
    diagnostics.push({ level: 'error', awningId: awning.id, message: 'IRIS 150: siempre va a motor.' });
  }
  if (!discounts && submodel && guideType && device && !(motorOnly && device === 'MAQUINA')) {
    diagnostics.push({ level: 'error', awningId: awning.id, message: `IRIS ${submodel} con guía ${guideType} a ${device}: esta combinación no está contemplada por el fabricante y no tiene ningún pedido conservado.` });
  }
  if (outOfRange && !modified) {
    diagnostics.push({ level: 'error', awningId: awning.id, message: `IRIS ${series} fuera de medidas: el manual admite de ${formatNumber(limits.minWidth)}x${formatNumber(limits.minDrop)} a ${formatNumber(limits.maxWidth)}x${formatNumber(limits.maxDrop)} cm. Activa una excepción técnica para continuar.` });
  }
  if (compensatorOverMax && !modified) {
    diagnostics.push({ level: 'error', awningId: awning.id, message: `IRIS con compensadora: hay que absorber ${formatNumber(round1(slack))} cm por guía y el máximo tolerado son ${formatNumber(parameters.compensatorMaxCm)} cm. Revisa las medidas del hueco.` });
  }
  if (negativePieces.length) {
    diagnostics.push({ level: 'error', awningId: awning.id, message: negativeCutMessage('IRIS', awning.of, negativePieces) });
  }
  if (glassOutOfCatalog && !modified) {
    diagnostics.push({ level: 'error', awningId: awning.id, message: `IRIS con ventana en OF ${awning.of}: el frente de tela (${formatNumber(fabricWidth)} cm) supera los 700 cm del catálogo de cristal y no hay medida que sirva. Activa una excepción técnica para continuar sin cristal.` });
  }
  if (hasCompensator && slack > parameters.compensatorWarnCm && !compensatorOverMax) {
    diagnostics.push({ level: 'warn', awningId: awning.id, message: `IRIS con compensadora: hay que absorber ${formatNumber(round1(slack))} cm por guía y BAT da 2,5 cm como máximo del perfil. Comprueba el ajuste antes de fabricar.` });
  }
  if (opening.valid && !hasCompensator && frontDifference > parameters.frontDifferenceWarnCm) {
    diagnostics.push({ level: 'warn', awningId: awning.id, message: `IRIS sin compensadora con ${formatNumber(round1(frontDifference))} cm de diferencia entre frentes: avisar a comercial para que el cliente decida.` });
  }
  if (guideLeftLength && guideRightLength && guideLeftLength !== guideRightLength) {
    diagnostics.push({ level: 'warn', awningId: awning.id, message: `IRIS con guías de distinta medida: MFI ${formatNumber(guideLeftLength)} y MFD ${formatNumber(guideRightLength)} cm.` });
  }
  if (cuts.unverified) {
    diagnostics.push({ level: 'warn', awningId: awning.id, message: `IRIS ${submodel}: configuración sin tabla del fabricante, respaldada solo por dos pedidos conservados. Comprueba las medidas de guía.` });
  }
  if (hasGlass && glassSize) {
    diagnostics.push({ level: 'warn', awningId: awning.id, message: 'IRIS con ventana: el cristal estabilizado tarda alrededor de un mes. Pídelo en cuanto entre el pedido.' });
  }
  if (modified) {
    diagnostics.push({ level: 'warn', awningId: awning.id, message: `Excepción técnica en OF ${awning.of}: reglas de IRIS modificadas.` });
  }

  const valid = missingFields.length === 0
    && opening.valid
    && Boolean(discounts)
    && Boolean(fabric)
    && !(motorOnly && device === 'MAQUINA')
    && (!outOfRange || modified)
    && (!compensatorOverMax || modified)
    && negativePieces.length === 0
    && (!glassOutOfCatalog || modified);

  const materials = [];
  if (valid && fabric) materials.push({ code: fabric.code, quantity: fabricUsage.ml, description: fabric.description });
  const glassLine = valid ? glassMaterial(glassSize, awning.units) : null;
  if (glassLine) materials.push(glassLine);

  return {
    of: awning.of,
    description: buildDescription(submodel, guideType, {
      frontToldo: round1(opening.frontToldo),
      fabricWidth,
      fabricDrop,
      fabricMl: fabricUsage.ml
    }),
    materials,
    despiece: valid
      ? buildDespiece({
        awning, hasBox, hasCompensator, fabric,
        boxProfileLength, rollTubeLength, loadBarLength, ballastLength,
        guideLeftLength, guideRightLength, zipLeftLength, zipRightLength,
        compensatorLeftLength, compensatorRightLength, windBlockTerminalLength,
        fabricWidth
      })
      : null,
    diagnostics,
    calculation: {
      model: 'IRIS',
      valid,
      minimumLine: 0,
      width: round1(opening.frontToldo),
      projection: round1(opening.dropOpening),
      submodel,
      irisGuideType: guideType,
      irisGuideFixing: guideFixing,
      irisWindBlock: windBlock,
      irisConfigCode: configCode,
      irisHeightLeft: round1(opening.heightLeft),
      irisHeightRight: round1(opening.heightRight),
      irisSlackLeft: round1(opening.slackLeft),
      irisSlackRight: round1(opening.slackRight),
      irisFabricDropAllowanceCm: dropAllowance,
      fabricWidth,
      fabricDrop,
      fabricUsageDrop: fabricDrop,
      fabricMl: fabricUsage.ml,
      fabricPanels: fabricUsage.panels,
      mainFabricMl: fabricUsage.ml,
      mainFabricPanels: fabricUsage.panels,
      fabricCode: fabric?.code || '',
      fabricDescription: fabric?.description || '',
      fabricRollWidth: fabric?.width || 120,
      structureLength: loadBarLength,
      rollTubeLength,
      loadBarLength,
      ballastLength,
      boxProfileLength,
      guideLeftLength,
      guideRightLength,
      zipLeftLength,
      zipRightLength,
      compensatorLeftLength,
      compensatorRightLength,
      windBlockTerminalLength,
      glassCode: glassLine?.code || '',
      glassSize,
      armCount: 0,
      motorPower: device === 'MOTOR' ? String(awning.motorPower || '') : ''
    }
  };
}

/**
 * Metraje de lona del libro maestro IRIS.xlsx, hoja `Medidas Toldo N`, celda G9:
 *   paños = ROUNDUP(frente / anchoRollo)
 *   ml    = ROUNDUP(paños × caída / 100 − 1,4 × paños si lleva cristal ; 1 decimal)
 * No es la fórmula genérica de fabricMath.js: IRIS no lleva margen de costura
 * porque la medida de la tabla ya es la de la tela confeccionada.
 */
function calculateIrisFabricUsage({ fabricWidth, fabricDrop, rollWidth, units, hasGlass, glassSavingM }) {
  const safeRollWidth = Number(rollWidth) > 0 ? Number(rollWidth) : 120;
  const safeUnits = Math.max(1, Number(units) || 1);
  const panels = fabricWidth > 0 ? Math.ceil(fabricWidth / safeRollWidth) : 0;
  if (!panels || !(fabricDrop > 0)) return { panels: 0, ml: 0 };

  const raw = panels * fabricDrop / 100 - (hasGlass ? glassSavingM * panels : 0);
  // ROUNDUP a 1 decimal, limpiando antes el ruido de coma flotante para que
  // 8,7 no se convierta en 8,8 por un 8.700000000000001.
  const ml = Math.ceil(Math.round(Math.max(0, raw) * 1e6) / 1e5) / 10;
  return { panels, ml: round1(ml * safeUnits) };
}

function glassMaterial(glassSize, units) {
  if (!glassSize) return null;
  return {
    code: `CRISESTP140${glassSize}C`,
    quantity: Math.max(1, Number(units) || 1),
    description: `CRISTAL ESTABILIZADO :140 AN :${glassSize}CM`
  };
}

function buildDespiece(context) {
  const {
    awning, hasBox, hasCompensator, fabric,
    boxProfileLength, rollTubeLength, loadBarLength, ballastLength,
    guideLeftLength, guideRightLength, zipLeftLength, zipRightLength,
    compensatorLeftLength, compensatorRightLength, windBlockTerminalLength,
    fabricWidth
  } = context;
  const units = Math.max(1, Number(awning.units) || 1);
  const rows = [];
  const push = (name, reference, length) => rows.push({
    num: rows.length + 1, name, reference: reference || null, units, length
  });

  if (hasBox) push('PERFIL COFRE', null, boxProfileLength);
  push('TUBO DE ENROLLE', null, rollTubeLength);
  push('TUBO DE CARGA', null, loadBarLength);
  push('LASTRE', null, ballastLength);
  if (hasCompensator) {
    push('GUÍA DE COMPENSACIÓN MFI', null, compensatorLeftLength);
    push('GUÍA DE COMPENSACIÓN MFD', null, compensatorRightLength);
  }
  push('PERFIL GUÍA MFI', null, guideLeftLength);
  push('PERFIL GUÍA MFD', null, guideRightLength);
  if (zipLeftLength) push('PERFIL GUÍA INTERIOR ZIP MFI', null, zipLeftLength);
  if (zipRightLength) push('PERFIL GUÍA INTERIOR ZIP MFD', null, zipRightLength);
  if (windBlockTerminalLength) push('TERMINAL COMPENSADOR SWBS', null, windBlockTerminalLength);
  push('TELÓN', fabric?.code || null, fabricWidth);

  const wall = behaviorData.options.tiposPared.find((item) => item.pared === awning.wallType);
  const anchoring = wall
    ? { name: wall.tornilleria, reference: wall.referencia || null, units: wall.unidades * units }
    : null;
  return { rows, anchoring };
}

function buildDescription(submodel, guideType, calculation) {
  const guide = guideType && guideType !== 'ESTÁNDAR' ? ` · GUÍA ${guideType}` : '';
  return `Toldo ${submodel || 'IRIS'}${guide} · ${formatNumber(calculation.frontToldo)}x${formatNumber(calculation.fabricDrop)}`
    + ` · tela ${formatNumber(calculation.fabricWidth)}x${formatNumber(calculation.fabricDrop)} · ${formatNumber(calculation.fabricMl)} ml`;
}

function piece(base, discount, extra = 0) {
  if (!(base > 0) || discount === undefined || discount === null) return 0;
  return round1(base - (Number(discount) + extra));
}

function round1(value) {
  return Math.round((Number(value) + Number.EPSILON) * 10) / 10;
}
