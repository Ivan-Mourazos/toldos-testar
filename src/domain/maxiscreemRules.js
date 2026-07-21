import { formatNumber } from './math.js';
import { resolveFabric } from './fabricCatalog.js';
import { calculateFabricUsage } from './fabricMath.js';
import { crankSuffix, machineCode, resolveLacado } from './lacados.js';
import behaviorData from './data/modelBehavior.json' with { type: 'json' };
import { resolveMotorRemote } from './motorAccessories.js';
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
  const valanceFabricSelection = String(awning.valanceFabric || '').trim();
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
  const valance = Math.max(0, Number(awning.valanceHeight) || 0);
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
  const profileStockLength = resolveStock(Math.max(loadBarLength, boxProfileLength), parameters.profileStockLengths);
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
    rollStockLength, profileStockLength, rollTubeLength, loadBarLength,
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
      fabricWidth, fabricDrop, fabricMl: fabricUsage.ml, fabricPanels: fabricUsage.panels,
      mainFabricMl: fabricUsage.ml, mainFabricPanels: fabricUsage.panels,
      fabricCode: fabric?.code || '', fabricDescription: fabric?.description || '',
      fabricRollWidth: fabric?.width || 120,
      valanceFabricCode: valanceFabric?.code || '',
      valanceFabricDescription: valanceFabric?.description || '',
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

function buildMaterials(context) {
  const { awning, device, variantGroup, guide, lacado, fabric, valanceFabric, rollStockLength, profileStockLength, fabricMl, valanceFabricMl } = context;
  const units = Math.max(1, Number(awning.units) || 1);
  const suffix = lacado.suffix;
  const materials = [
    line(`${variantGroup === 'COFRE' ? 'SOPMAXSCRBOX' : 'SOPMAXSCR'}${suffix}`, units, variantGroup === 'COFRE' ? 'SOPORTE MAXISCREEM PARA COFRE' : 'SOPORTE MAXISCREEM SIN COFRE'),
    line(`TURA80HG${rollStockLength}C`, units, 'TUBO DE ENROLLE P801'),
    line('CASPUNCE', units, 'CASQUILLO PUNTA'),
    line(profileCode('PECARMAX', suffix, profileStockLength), units, 'PERFIL CARGA MAXISCREEM')
  ];
  if (variantGroup === 'COFRE') materials.push(line(profileCode('PERPRLON', suffix, profileStockLength), units, 'PERFIL COFRE MAXISCREEM'));
  if (guide === 'CABLE') materials.push(line('CABLEMAXIS3MM25M', units, 'CABLE DE ACERO 3 MM MAXISCREEM'));
  if (guide === 'VARILLA') materials.push(line('VARILLAMAXSCR8MM', units, 'VARILLA DE GUIADO MAXISCREEM'));

  if (device === 'MOTOR') {
    const remote = resolveMotorRemote(awning.sensor);
    materials.push(
      line('SUNILUSIO15//17', units, 'MOTOR SOMFY SUNILUS 15/17 IO'),
      line('RUEDAMOT78', units, 'RUEDA MOTRIZ Ø 78'),
      line('CORONALT6078', units, 'CORONA LT 60 ADAPTADA Ø 78'),
      line('SOPORTEUNVHIPRO', units, 'SOPORTE UNIVERSAL HIPRO'),
      { ...line(remote.code, units, remote.description), aggregation: 'max' }
    );
    const sensor = sensorMaterial(awning.sensor);
    if (sensor) materials.push({ ...sensor, quantity: units, aggregation: 'max' });
  } else {
    materials.push(
      line('CASMAQEJE6378MM', units, 'CASQUILLO MAQUINA EJE 63 MM Ø78'),
      line(machineCode(lacado), units, `MAQUINA ZNP 10 L170 ${lacado.crank}`),
      line(`MANIVE${crankSuffix(lacado)}${awning.crankHeight}C`, units, `MANIVELA LUXE ${lacado.crank} ${awning.crankHeight}`),
      line('CASPLAS', units, 'TACO NYLON MAQUINA')
    );
  }
  if (fabric) materials.push(line(fabric.code, fabricMl, fabric.description));
  if (valanceFabric && valanceFabricMl > 0) materials.push(line(valanceFabric.code, valanceFabricMl, `${valanceFabric.description} · BAMBA`));
  const wall = wallMaterial(awning.wallType, units);
  if (wall) materials.push(wall);
  return materials.filter(Boolean);
}

function buildDespiece(context) {
  const { awning, device, variantGroup, guide, lacado, rollStockLength, profileStockLength, rollTubeLength, loadBarLength, boxProfileLength, guideLength } = context;
  const units = Math.max(1, Number(awning.units) || 1);
  const suffix = lacado.suffix;
  const rows = [];
  const push = (num, name, reference, rowUnits, length = null) => rows.push({ num, name, reference: reference || null, units: rowUnits, length });
  push(1, variantGroup === 'COFRE' ? 'SOPORTE MAXISCREEM PARA COFRE' : 'SOPORTE MAXISCREEM SIN COFRE', `${variantGroup === 'COFRE' ? 'SOPMAXSCRBOX' : 'SOPMAXSCR'}${suffix}`, units);
  push(2, 'TUBO DE ENROLLE P801', `TURA80HG${rollStockLength}C`, units, rollTubeLength);
  push(3, 'CASQUILLO PUNTA', 'CASPUNCE', units);
  if (device === 'MAQUINA') push(4, 'CASQUILLO MAQUINA EJE 63 MM Ø78', 'CASMAQEJE6378MM', units);
  push(5, 'PERFIL CARGA MAXISCREEM', profileCode('PECARMAX', suffix, profileStockLength), units, loadBarLength);
  push(6, 'JUEGO DE TAPAS BARRA DE CARGA', null, units);
  if (variantGroup === 'COFRE') push(8, 'PERFIL COFRE MAXISCREEM', profileCode('PERPRLON', suffix, profileStockLength), units, boxProfileLength);
  if (guide) push(9, 'JUEGO DE TERMINALES', null, units);
  if (device === 'MOTOR') {
    push(10, 'MOTOR SOMFY SUNILUS 15/17 IO', 'SUNILUSIO15//17', units);
    push(11, 'RUEDA MOTRIZ Ø 78', 'RUEDAMOT78', units);
    push(12, 'CORONA LT 60 ADAPTADA Ø 78', 'CORONALT6078', units);
    push(13, 'SOPORTE UNIVERSAL HIPRO', 'SOPORTEUNVHIPRO', units);
  } else {
    push(10, `MANIVELA LUXE ${lacado.crank} ${awning.crankHeight}`, `MANIVE${crankSuffix(lacado)}${awning.crankHeight}C`, units, awning.crankHeight);
    push(11, `MAQUINA ZNP 10 L170 ${lacado.crank}`, machineCode(lacado), units);
    push(12, 'TACO NYLON MAQUINA', 'CASPLAS', units);
  }
  if (guide === 'CABLE') push(14, 'CABLE DE ACERO 3 MM MAXISCREEM', 'CABLEMAXIS3MM25M', units, guideLength);
  if (guide === 'VARILLA') push(14, 'VARILLA DE GUIADO MAXISCREEM', 'VARILLAMAXSCR8MM', units, guideLength);
  const wallEntry = behaviorData.options.tiposPared.find((item) => item.pared === awning.wallType);
  const anchoring = wallEntry ? { name: wallEntry.tornilleria, reference: wallEntry.referencia || null, units: wallEntry.unidades * units } : null;
  return { rows, anchoring };
}

function line(code, quantity, description) { return code ? { code, quantity, description } : null; }
function normalizeDevice(value) { const clean = String(value || '').trim().toUpperCase(); if (clean === 'MOTOR') return 'MOTOR'; if (clean.includes('MAQ')) return 'MAQUINA'; return ''; }
function resolveStock(length, stocks) { return stocks.find((stock) => stock >= length) || null; }
function profileCode(base, suffix, stock) { return suffix ? `${base}${suffix}${stock}C` : base; }
function effectiveNumber(awning, field, fallback) { const value = awning[field]; return awning.reglasModificadas && value !== null && value !== undefined && Number.isFinite(Number(value)) ? Math.max(0, Number(value)) : Number(fallback) || 0; }
function wallMaterial(wallType, units) { const entry = behaviorData.options.tiposPared.find((item) => item.pared === wallType); return entry?.referencia ? line(entry.referencia, entry.unidades * units, entry.tornilleria) : null; }
function sensorMaterial(value) { const sensor = String(value || '').trim().toUpperCase(); if (sensor === 'MOVIMIENTO') return { code: 'EOLIS3DIO', description: 'EOLIS 3D WIREFREE IO' }; if (sensor === 'EOLIS IO') return { code: 'EOLISSENSORIO', description: 'EOLIS SENSOR IO' }; if (sensor === 'SOL') return { code: 'SUNISIIIO', description: 'SUNIS II IO' }; return null; }
function buildDescription(awning, variant, calculation) { const valance = Math.max(0, Number(awning.valanceHeight) || 0); const valanceText = valance > 0 ? ` · bambalina incluida de ${valance + 5} cm, hecha de ${valance} cm` : ''; return `Diana vertical · ${variant} · ${awning.width}x${awning.projection} · tela ${formatNumber(calculation.fabricWidth)}x${formatNumber(calculation.fabricDrop)} · paño ${formatNumber(calculation.fabricMl)} ml${valanceText}`; }
function round1(value) { return Math.round(Number(value) * 10) / 10; }
