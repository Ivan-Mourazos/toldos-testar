import { tipBushing } from './tipBushing.js';
import { formatNumber } from './math.js';
import { resolveFabric } from './fabricCatalog.js';
import { calculateFabricUsage } from './fabricMath.js';
import { crankSuffix, machineCode, resolveLacado } from './lacados.js';
import behaviorData from './data/modelBehavior.json' with { type: 'json' };
import { resolveMotorRemote } from './motorAccessories.js';
import { pickVerticalProfileLength, verticalProfileCode } from './boxAvailability.js';
import {
  maxiscreemGuide,
  maxiscreemVariantGroup,
  normalizeMaxiscreemParameters,
  normalizeMaxiscreemVariant
} from './maxiscreemParameters.js';

export function calculateMaxiscreem({ order, awning }) {
  const parameters = normalizeMaxiscreemParameters(order.parameters?.maxiscreem);
  const structureColor = awning.structureColor || order.structureColor;
  const lacado = resolveLacado(structureColor);
  const device = normalizeDevice(awning.device);
  const variant = normalizeMaxiscreemVariant(awning.submodel);
  const variantGroup = maxiscreemVariantGroup(variant);
  const guide = maxiscreemGuide(variant);
  const fabricSelection = order.sameFabric !== false ? order.fabric : awning.fabric;
  const fabric = fabricSelection ? resolveFabric(fabricSelection) : null;
  const valance = Math.max(0, Number(awning.valanceHeight) || 0);
  const valanceFabricSelection = valance > 0 ? String(awning.valanceFabric || '').trim() : '';
  const valanceFabric = valanceFabricSelection ? resolveFabric(valanceFabricSelection) : null;
  const modified = Boolean(awning.reglasModificadas);
  const diagnostics = [];
  const missingFields = [];

  if (!variant) missingFields.push('variante');
  if (!structureColor) missingFields.push('lacado');
  if (!fabricSelection) missingFields.push('tela');
  if (!device) missingFields.push('dispositivo válido');
  if (!awning.placement) missingFields.push('colocación');
  if (device === 'MAQUINA' && !awning.crankHeight) missingFields.push('altura de manivela');

  const discounts = parameters.discounts[variantGroup][device || 'MAQUINA'];
  const fabricDiscount = effectiveNumber(awning, 'maxisFabricWidthDiscountCm', discounts.fabric);
  const rollDiscount = effectiveNumber(awning, 'maxisRollDiscountCm', discounts.roll);
  const loadBarDiscount = effectiveNumber(awning, 'maxisLoadBarDiscountCm', discounts.loadBar);
  const boxProfileDiscount = effectiveNumber(awning, 'maxisBoxProfileDiscountCm', discounts.boxProfile);
  const dropAllowance = effectiveNumber(awning, 'maxisFabricDropAllowanceCm', parameters.fabricDropAllowanceCm);
  const fabricWidth = round1(Number(awning.width) - fabricDiscount);
  const rawFabricDrop = Number(awning.projection) + dropAllowance
    + (valanceFabricSelection ? 0 : valance + parameters.valanceExtraCm);
  const fabricDrop = round1(rawFabricDrop);
  const rollTubeLength = round1(Number(awning.width) - rollDiscount);
  const loadBarLength = round1(Number(awning.width) - loadBarDiscount);
  const boxProfileLength = variantGroup === 'COFRE'
    ? round1(Number(awning.width) - boxProfileDiscount)
    : 0;
  const guideLength = guide ? round1(Number(awning.width) - parameters.guideDiscountCm) : 0;
  const rollStockLength = resolveStock(rollTubeLength, parameters.rollStockLengths);
  // Perfil de carga y del cofre, cada uno con su largo entre los que existen en ese
  // lacado (en negro, el del cofre solo de 700: el de 500 está de baja desde 2020).
  const loadStockLength = pickVerticalProfileLength('PECARMAX', lacado.suffix, parameters.profileStockLengths, loadBarLength);
  const boxStockLength = variantGroup === 'COFRE' ? pickVerticalProfileLength('PERPRLON', lacado.suffix, parameters.profileStockLengths, boxProfileLength) : null;
  const profileStockLength = variantGroup === 'COFRE' ? (loadStockLength && boxStockLength ? Math.max(loadStockLength, boxStockLength) : null) : loadStockLength;
  const fabricUsage = calculateFabricUsage({
    width: fabricWidth,
    drop: rawFabricDrop,
    units: awning.units,
    rollWidth: fabric?.width || 120,
    seamAllowanceCm: parameters.seamAllowanceCm,
    seamBaseCm: parameters.seamBaseCm
  });
  const valanceUsage = valanceFabric && valance > 0 ? calculateFabricUsage({
    width: Number(awning.width),
    drop: valance + parameters.valanceExtraCm,
    units: awning.units,
    rollWidth: valanceFabric.width || 120,
    seamAllowanceCm: parameters.seamAllowanceCm,
    seamBaseCm: parameters.seamBaseCm
  }) : null;
  const overWidth = Number(awning.width) > parameters.standardMaxWidth;
  const overDrop = Number(awning.projection) > parameters.standardMaxDrop;
  const valid = missingFields.length === 0
    && Boolean(fabric)
    && (!valanceFabricSelection || valance === 0 || Boolean(valanceFabric))
    && (!overWidth || modified)
    && (!overDrop || modified)
    && Boolean(rollStockLength)
    && Boolean(profileStockLength);

  if (fabricSelection && !fabric) diagnostics.push({ level: 'error', awningId: awning.id, message: `Tela no encontrada en el catálogo: "${fabricSelection}".` });
  if (valanceFabricSelection && valance > 0 && !valanceFabric) diagnostics.push({ level: 'error', awningId: awning.id, message: `Tela de bamba no encontrada en el catálogo: "${valanceFabricSelection}".` });
  if (missingFields.length) {
    diagnostics.push({ level: 'error', awningId: awning.id, message: `MAXISCREEM incompleto en OF ${awning.of}: falta ${missingFields.join(' y ')}.` });
  } else if ((overWidth || overDrop) && !modified) {
    diagnostics.push({ level: 'error', awningId: awning.id, message: `MAXISCREEM no válido: máximo estándar ${parameters.standardMaxWidth} cm de frente y ${parameters.standardMaxDrop} cm de caída.` });
  } else if (!rollStockLength || !profileStockLength) {
    diagnostics.push({ level: 'error', awningId: awning.id, message: 'MAXISCREEM no válido: no hay largo de stock suficiente para las piezas calculadas.' });
  } else if (modified) {
    diagnostics.push({ level: 'warn', awningId: awning.id, message: `Excepción técnica en OF ${awning.of}: reglas de MAXISCREEM modificadas.` });
  }

  const context = {
    awning, device, variant, variantGroup, guide, lacado, fabric, valanceFabric,
    rollStockLength, profileStockLength, loadStockLength, boxStockLength, rollTubeLength, loadBarLength,
    boxProfileLength, guideLength, fabricMl: fabricUsage.ml,
    valanceFabricMl: valanceUsage?.ml || 0
  };
  return {
    of: awning.of,
    description: buildDescription(awning, variant, { fabricWidth, fabricDrop, fabricMl: fabricUsage.ml }),
    materials: valid ? buildMaterials(context) : [],
    despiece: valid ? buildDespiece(context) : null,
    diagnostics,
    calculation: {
      model: 'MAXISCREEM', valid, minimumLine: 0,
      width: awning.width, projection: awning.projection,
      fabricWidth, fabricDrop, fabricUsageDrop: rawFabricDrop, fabricMl: fabricUsage.ml, fabricPanels: fabricUsage.panels,
      mainFabricMl: fabricUsage.ml, mainFabricPanels: fabricUsage.panels,
      fabricCode: fabric?.code || '', fabricDescription: fabric?.description || '',
      fabricRollWidth: fabric?.width || 120,
      valanceFabricCode: valanceFabric?.code || '',
      valanceFabricDescription: valanceFabric?.description || '',
      valanceFabricWidth: valanceUsage ? Number(awning.width) : 0,
      valanceFabricMl: valanceUsage?.ml || 0,
      valanceFabricPanels: valanceUsage?.panels || 0,
      valanceDrop: valanceUsage ? valance + parameters.valanceExtraCm : 0,
      structureLength: loadBarLength, rollTubeLength, stockLength: profileStockLength,
      submodel: variant, guideType: guide, guideLength, boxProfileLength,
      rollStockLength, profileStockLength,
      motorPower: device === 'MOTOR' ? '15/17' : '',
      maxisFabricWidthDiscountCm: fabricDiscount,
      maxisRollDiscountCm: rollDiscount,
      maxisLoadBarDiscountCm: loadBarDiscount,
      maxisBoxProfileDiscountCm: boxProfileDiscount,
      maxisFabricDropAllowanceCm: dropAllowance
    }
  };
}

// Piezas de la Diana vertical, contrastadas con el consumo real (9 OF desde 2024):
// - Tubo de enrolle Ø70 (P701) con su casquillo de punta, en 8 de 9 OF; la web
//   reservaba el P801.
// - Motor Sunilus 15/17 con rueda centrada Hi68 y corona centrada Ø70; con máquina,
//   casquillo de eje 50 Ø70. Sin CASPLAS.
// - Cable de acero del rollo de 200 m, por metros: dos tramos del largo de la guía (se
//   reservaba el rollo de 25 m, que no se consume).
// - Juego de tapas del perfil de carga y varillas negra y blanca al largo del perfil.
function dianaPieces(context) {
  const { awning, device, variantGroup, guide, lacado, rollStockLength, loadStockLength, boxStockLength, rollTubeLength, loadBarLength, boxProfileLength, guideLength } = context;
  const units = Math.max(1, Number(awning.units) || 1);
  const suffix = lacado.suffix;
  const varillaMl = Math.ceil(Number(loadBarLength) || 0) / 100;
  const cofre = variantGroup === 'COFRE';
  const pieces = [
    { code: `${cofre ? 'SOPMAXSCRBOX' : 'SOPMAXSCR'}${suffix}`, quantity: units, description: cofre ? 'SOPORTE MAXISCREEM PARA COFRE' : 'SOPORTE MAXISCREEM SIN COFRE' },
    { code: `TURA70HG${rollStockLength}C`, quantity: units, description: 'TUBO DE ENROLLE P701', length: rollTubeLength },
    { code: tipBushing('P701').code, quantity: units, description: tipBushing('P701').description },
    { code: verticalProfileCode('PECARMAX', suffix, loadStockLength), quantity: units, description: 'PERFIL CARGA MAXISCREEM', length: loadBarLength },
    // El juego de tapas solo existe en blanco, gris 7016 y negro.
    ...(['BL16', 'GR16', 'NE11'].includes(suffix) ? [{ code: `TAPASLAMAXSC${suffix}`, quantity: units, description: 'JGO TAPAS PERFIL CARGA MAXISCREEN' }] : []),
    ...(cofre ? [{ code: verticalProfileCode('PERPRLON', suffix, boxStockLength), quantity: units, description: 'PERFIL COFRE MAXISCREEM', length: boxProfileLength }] : []),
    // Terminal de suelo del cable: uno por toldo (OF 0229970 y 0215897).
    ...(guide ? [{ code: `TERSUMAXSCR${suffix}`, quantity: units, description: 'KIT TERMINAL SUELO MAXISCREEN' }] : []),
    ...(guide === 'CABLE' ? [{ code: 'CABLEMAXIS3MM200', quantity: round1((2 * (Number(guideLength) || 0)) / 100 * units), description: 'CABLE ACERO 3MM MAXISCREEN', length: guideLength }] : []),
    ...(guide === 'VARILLA' ? [{ code: 'VARILLAMAXSCR8MM', quantity: units, description: 'VARILLA DE GUIADO MAXISCREEM', length: guideLength }] : []),
    { code: 'VARILLAVAINANEG5', quantity: round1(varillaMl * units), description: 'VARILLA VAINA NEGRA 4,5MM', despiece: false },
    { code: 'VARILLAVAINARBLA', quantity: round1(varillaMl * units), description: 'VARILLA VAINA RIGIDA 5,5 BLANCA', despiece: false }
  ];
  if (device === 'MOTOR') {
    const remote = resolveMotorRemote(awning.sensor);
    const sensor = sensorMaterial(awning.sensor);
    pieces.push(
      { code: 'SUNILUSIO15//17', quantity: units, description: 'MOTOR SOMFY SUNILUS 15/17 IO' },
      { code: 'RUEDAMOTHI68', quantity: units, description: 'RUEDA MOTRIZ CENTRADA HIPRO Ø68' },
      { code: 'CORONACENMEC70', quantity: units, description: 'CORONA CENTRADA MECANIZADA TUBO Ø70' },
      { code: 'SOPORTEUNVHIPRO', quantity: units, description: 'SOPORTE UNIVERSAL HIPRO' },
      { code: remote.code, quantity: units, description: remote.description, aggregation: 'max' },
      ...(sensor ? [{ ...sensor, quantity: units, aggregation: 'max' }] : [])
    );
  } else {
    pieces.push(
      { code: 'CASMAQEJE5070MM', quantity: units, description: 'CASQUILLO MAQUINA EJE 50MM Ø70' },
      { code: machineCode(lacado), quantity: units, description: `MÁQUINA MB-11 L-120 ${lacado.crank}` },
      { code: `MANIVE${crankSuffix(lacado)}${awning.crankHeight}C`, quantity: units, description: `MANIVELA LUXE ${lacado.crank} ${awning.crankHeight}`, length: awning.crankHeight }
    );
  }
  return pieces;
}

function buildMaterials(context) {
  const { awning, fabric, valanceFabric, fabricMl, valanceFabricMl } = context;
  const units = Math.max(1, Number(awning.units) || 1);
  const materials = dianaPieces(context)
    .filter((piece) => piece.code && piece.reserve !== false)
    .map(({ code, quantity, description, aggregation }) => (aggregation ? { ...line(code, quantity, description), aggregation } : line(code, quantity, description)));
  if (fabric) materials.push(line(fabric.code, fabricMl, fabric.description));
  if (valanceFabric && valanceFabricMl > 0) materials.push(line(valanceFabric.code, valanceFabricMl, `${valanceFabric.description} · BAMBA`));
  const wall = wallMaterial(awning.wallType, units);
  if (wall) materials.push(wall);
  return materials.filter(Boolean);
}

function buildDespiece(context) {
  const { awning } = context;
  const units = Math.max(1, Number(awning.units) || 1);
  const rows = dianaPieces(context)
    .filter((piece) => piece.despiece !== false)
    .map((piece, index) => ({ num: index + 1, name: piece.description, reference: piece.code || null, units: piece.quantity, length: piece.length ?? null }));
  const wallEntry = behaviorData.options.tiposPared.find((item) => item.pared === awning.wallType);
  const anchoring = wallEntry ? { name: wallEntry.tornilleria, reference: wallEntry.referencia || null, units: wallEntry.unidades * units } : null;
  return { rows, anchoring };
}

function line(code, quantity, description) { return code ? { code, quantity, description } : null; }
function normalizeDevice(value) { const clean = String(value || '').trim().toUpperCase(); if (clean === 'MOTOR') return 'MOTOR'; if (clean.includes('MAQ')) return 'MAQUINA'; return ''; }
function resolveStock(length, stocks) { return stocks.find((stock) => stock >= length) || null; }
function effectiveNumber(awning, field, fallback) { const value = awning[field]; return awning.reglasModificadas && value !== null && value !== undefined && Number.isFinite(Number(value)) ? Math.max(0, Number(value)) : Number(fallback) || 0; }
function wallMaterial(wallType, units) { const entry = behaviorData.options.tiposPared.find((item) => item.pared === wallType); return entry?.referencia ? line(entry.referencia, entry.unidades * units, entry.tornilleria) : null; }
function sensorMaterial(value) { const sensor = String(value || '').trim().toUpperCase(); if (sensor === 'MOVIMIENTO') return { code: 'EOLIS3DIO', description: 'EOLIS 3D WIREFREE IO' }; if (sensor === 'EOLIS IO') return { code: 'EOLISSENSORIO', description: 'EOLIS SENSOR IO' }; if (sensor === 'SOL') return { code: 'SUNISIIIO', description: 'SUNIS II IO' }; return null; }
function buildDescription(awning, variant, calculation) { const valance = Math.max(0, Number(awning.valanceHeight) || 0); const valanceText = valance > 0 ? ` · bambalina incluida de ${valance + 5} cm, hecha de ${valance} cm` : ''; return `Diana vertical · ${variant} · ${awning.width}x${awning.projection} · tela ${formatNumber(calculation.fabricWidth)}x${formatNumber(calculation.fabricDrop)} · paño ${formatNumber(calculation.fabricMl)} ml${valanceText}`; }
function round1(value) { return Math.round(Number(value) * 10) / 10; }
