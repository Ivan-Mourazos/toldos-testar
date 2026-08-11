import { resolveFabric } from './fabricCatalog.js';
import { formatNumber, roundQuantity } from './math.js';
import { roundFabricMeters } from './reservationFabrics.js';
import {
  HERA_FABRIC_ALLOWANCES,
  HERA_SPECIAL_TUBE_FROM_CM,
  heraRuleFor,
  inferHeraVariant,
  normalizeHeraJoin
} from './heraParameters.js';

export function calculateHera({ order, awning }) {
  const variant = inferHeraVariant(awning);
  const rule = heraRuleFor(variant);
  const join = normalizeHeraJoin(awning.heraJoin);
  const fabricSelection = order.sameFabric !== false ? order.fabric : awning.fabric;
  const fabric = fabricSelection ? resolveFabric(fabricSelection) : null;
  const units = Math.max(1, Number(awning.units) || 1);
  const height = Math.max(0, Number(awning.height) || 0);
  const fabricWidth = round1(Number(awning.width) - (rule?.fabricWidthDiscountCm || 0));
  const fabricDrop = round1(Number(awning.projection) + (rule?.fabricDropAllowanceCm || 0));
  const rollTubeLength = round1(Number(awning.width) - (rule?.rollTubeDiscountCm || 0));
  const chainLength = rule && !rule.motor
    ? round1((height - rule.chainHeightDiscountCm) * 2)
    : null;
  const acrylic = isAcrylic(fabric);
  const usage = calculateHeraFabricUsage({
    fabricWidth,
    fabricDrop,
    units,
    rollWidth: fabric?.width || 120,
    join,
    acrylic
  });
  const missing = [];
  const diagnostics = [];

  if (!variant) missing.push('variante');
  if (!fabricSelection) missing.push('tela');
  if (!join) missing.push('empate');
  if (rule && !rule.motor && height <= 0) missing.push('altura');

  if (fabricSelection && !fabric) {
    diagnostics.push({ level: 'error', awningId: awning.id, message: `Tela no encontrada en el catálogo: "${fabricSelection}".` });
  }
  if (missing.length) {
    diagnostics.push({ level: 'error', awningId: awning.id, message: `HERA incompleto en OF ${awning.of}: falta ${missing.join(' y ')}.` });
  }
  if (rule && !rule.motor && height > 0 && chainLength <= 0) {
    diagnostics.push({ level: 'error', awningId: awning.id, message: `HERA no válido en OF ${awning.of}: la altura indicada produce una cadena de ${formatNumber(chainLength)} cm.` });
  }
  const dimensionsValid = Number(awning.width) > 0
    && Number(awning.projection) > 0
    && fabricWidth > 0
    && fabricDrop > 0
    && rollTubeLength > 0;
  if (rule && !dimensionsValid) {
    diagnostics.push({ level: 'error', awningId: awning.id, message: `HERA no válido en OF ${awning.of}: las medidas indicadas no producen tubo y tela positivos.` });
  }
  if (join === 'NINGUNO' && fabric && !usage.fitsRoll) {
    diagnostics.push({
      level: 'error',
      awningId: awning.id,
      message: `HERA no válido en OF ${awning.of}: el frente de corte (${formatNumber(usage.fabricCutWidth)} cm) no cabe en el rollo de ${formatNumber(fabric.width)} cm. El cliente debe indicar el sentido del empate.`
    });
  }

  diagnostics.push({ level: 'warn', awningId: awning.id, message: `HERA en OF ${awning.of}: requiere completar el planteamiento en CAD.` });
  const specialTubeRequired = Number(awning.width) > HERA_SPECIAL_TUBE_FROM_CM;
  if (specialTubeRequired) {
    diagnostics.push({ level: 'warn', awningId: awning.id, message: `HERA en OF ${awning.of}: pedir tubo especial y cambiar el presupuesto.` });
  }

  const valid = Boolean(rule)
    && Boolean(fabric)
    && Boolean(join)
    && dimensionsValid
    && (rule.motor || (height > 0 && chainLength > 0))
    && (join !== 'NINGUNO' || usage.fitsRoll);
  const fabricMl = usage.ml;

  return {
    of: awning.of,
    description: buildDescription(awning, { variant, fabricWidth, fabricDrop, fabricMl, join }),
    materials: valid ? [{ code: fabric.code, quantity: fabricMl, description: fabric.description }] : [],
    despiece: null,
    diagnostics,
    calculation: {
      model: 'HERA',
      valid,
      minimumLine: 0,
      width: awning.width,
      projection: awning.projection,
      height,
      structureLength: 0,
      rollTubeLength,
      stockLength: null,
      fabricWidth,
      fabricDrop,
      fabricCutWidth: usage.fabricCutWidth,
      fabricCutDrop: usage.fabricCutDrop,
      fabricPanelLength: usage.panelLength,
      fabricMl,
      reservedFabricMl: roundFabricMeters(fabricMl),
      fabricPanels: usage.panels,
      fabricCode: fabric?.code || '',
      fabricDescription: fabric?.description || '',
      fabricRollWidth: fabric?.width || 120,
      submodel: variant,
      heraVariant: variant,
      heraJoin: join,
      chainLength,
      seamCount: usage.seams,
      seamAllowanceCm: usage.seams * HERA_FABRIC_ALLOWANCES.joinCm,
      squaringAllowanceCm: join && join !== 'NINGUNO' ? HERA_FABRIC_ALLOWANCES.squaringEachEndCm * 2 : 0,
      acrylicHemAllowanceCm: acrylic ? HERA_FABRIC_ALLOWANCES.acrylicSideHemCm * 2 : 0,
      specialTubeRequired,
      requiresCad: true
    }
  };
}

export function calculateHeraFabricUsage({ fabricWidth, fabricDrop, units = 1, rollWidth = 120, join, acrylic = false }) {
  const safeWidth = Math.max(0, Number(fabricWidth) || 0);
  const safeDrop = Math.max(0, Number(fabricDrop) || 0);
  const safeRollWidth = Math.max(1, Number(rollWidth) || 120);
  const safeUnits = Math.max(1, Number(units) || 1);
  const normalizedJoin = normalizeHeraJoin(join);
  const hemAllowance = acrylic ? HERA_FABRIC_ALLOWANCES.acrylicSideHemCm * 2 : 0;
  const baseCutWidth = safeWidth + hemAllowance;

  if (normalizedJoin === 'VERTICAL') {
    const panels = joinedPanelCount(baseCutWidth, safeRollWidth);
    const seams = panels - 1;
    const fabricCutWidth = baseCutWidth + seams * HERA_FABRIC_ALLOWANCES.joinCm;
    const panelLength = safeDrop + HERA_FABRIC_ALLOWANCES.squaringEachEndCm * 2;
    return usageResult({ panels, seams, fabricCutWidth, fabricCutDrop: panelLength, panelLength, units: safeUnits });
  }

  if (normalizedJoin === 'HORIZONTAL') {
    const panels = joinedPanelCount(safeDrop, safeRollWidth);
    const seams = panels - 1;
    const fabricCutDrop = safeDrop + seams * HERA_FABRIC_ALLOWANCES.joinCm;
    const panelLength = baseCutWidth + HERA_FABRIC_ALLOWANCES.squaringEachEndCm * 2;
    return usageResult({ panels, seams, fabricCutWidth: panelLength, fabricCutDrop, panelLength, units: safeUnits });
  }

  return {
    panels: 1,
    seams: 0,
    fabricCutWidth: round1(baseCutWidth),
    fabricCutDrop: round1(safeDrop),
    panelLength: round1(safeDrop),
    ml: roundQuantity(safeUnits * safeDrop / 100),
    fitsRoll: baseCutWidth <= safeRollWidth + 1e-9
  };
}

function joinedPanelCount(dimension, rollWidth) {
  let panels = Math.max(2, Math.ceil(dimension / rollWidth));
  while (dimension + (panels - 1) * HERA_FABRIC_ALLOWANCES.joinCm > panels * rollWidth + 1e-9) panels += 1;
  return panels;
}

function usageResult({ panels, seams, fabricCutWidth, fabricCutDrop, panelLength, units }) {
  return {
    panels,
    seams,
    fabricCutWidth: round1(fabricCutWidth),
    fabricCutDrop: round1(fabricCutDrop),
    panelLength: round1(panelLength),
    ml: roundQuantity(units * panels * panelLength / 100),
    fitsRoll: true
  };
}

function isAcrylic(fabric) {
  const material = String(fabric?.material || '').trim().toUpperCase();
  if (material.startsWith('ACR') || material.includes('ACRIL')) return true;
  return /ACRIL/i.test(`${fabric?.code || ''} ${fabric?.description || ''}`);
}

function buildDescription(awning, calculation) {
  return `Toldo HERA ${calculation.variant || 'sin variante'} ${formatNumber(awning.width)}x${formatNumber(awning.projection)} · tela ${formatNumber(calculation.fabricWidth)}x${formatNumber(calculation.fabricDrop)} · ${calculation.join || 'empate sin indicar'} · ${formatNumber(calculation.fabricMl)} ml`;
}

function round1(value) {
  return Math.round((Number(value) + Number.EPSILON) * 10) / 10;
}
