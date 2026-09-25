import { effectiveOverride } from './ruleOverrides.js';
import { tipBushing } from './tipBushing.js';
import { formatNumber } from './math.js';
import { resolveFabric } from './fabricCatalog.js';
import { calculateFabricUsage } from './fabricMath.js';
import { crankSuffix, machineCode, plasticCapSuffix, resolveLacado, universProfileSuffix } from './lacados.js';
import { evo80StockLengths, onyxArmExists } from './arzuaAvailability.js';
import { galiciaSingleArmExists } from './galiciaSupportPieces.js';
import { universProfileStockLengths } from './universProfileLengths.js';
import {
  curronSupportCode, groupBars, monoblockArmLines, monoblockArmSupportLines, monoblockPlacementLines,
  rollTubeLengths, splitIntoBars, squareBarCapCode, squareBarColor, squareBarLengths
} from './monoblock350Pieces.js';
import behaviorData from './data/modelBehavior.json' with { type: 'json' };
import { resolveMotorRemote } from './motorAccessories.js';
import {
  normalizeMonoblock350Parameters,
  resolveMonoblockCurronCount,
  resolveMonoblockRule,
  resolveMonoblockSupportCount,
  monoblockLoadBarDiscount,
  suggestedMonoblockArmCount
} from './monoblock350Parameters.js';

export function calculateMonoblock350({ order, awning }) {
  const parameters = normalizeMonoblock350Parameters(order.parameters?.monoblock350);
  const structureColor = awning.structureColor || order.structureColor;
  const lacado = resolveLacado(structureColor);
  const device = normalizeDevice(awning.device);
  const fabricSelection = order.sameFabric !== false ? order.fabric : awning.fabric;
  const fabric = fabricSelection ? resolveFabric(fabricSelection) : null;
  const valance = Math.max(0, Number(awning.valanceHeight) || 0);
  const valanceFabricSelection = valance > 0 ? String(awning.valanceFabric || '').trim() : '';
  const valanceFabric = valanceFabricSelection ? resolveFabric(valanceFabricSelection) : null;
  const suggestedArms = suggestedMonoblockArmCount(awning.width, awning.projection, parameters);
  const armCount = Number(awning.armCount) || suggestedArms;
  const baseRule = resolveMonoblockRule(awning.projection, armCount, parameters);
  const modified = Boolean(awning.reglasModificadas);
  const diagnostics = [];
  const missingFields = [];

  if (!structureColor) missingFields.push('lacado');
  if (!fabricSelection) missingFields.push('tela');
  if (!device) missingFields.push('dispositivo válido');
  if (![2, 3, 4].includes(armCount)) missingFields.push('número de brazos válido');
  if (!awning.placement) missingFields.push('colocación');
  if (device === 'MAQUINA' && !awning.crankHeight) missingFields.push('altura de manivela');
  // El almacén imputa Univers 280 en 31 de 59 OF: la barra de carga se elige como en
  // el Arzúa. Sin elegir, EVO 80, que es lo que dicen el manual y los libros.
  const tubeLoad = String(awning.tubeLoad || '').toUpperCase().includes('UNIVERS') ? 'TUBO DE CARGA UNIVERS 280' : 'TUBO DE CARGA EVO 80';

  const discounts = parameters.discounts[device || 'MAQUINA'];
  const minimumLine = effectiveNumber(awning, 'monoblockMinimumLineCm', baseRule?.minimum || 0);
  const maximumLine = effectiveNumber(awning, 'monoblockMaximumLineCm', baseRule?.maximum || 0);
  const fabricDiscount = effectiveNumber(awning, 'monoblockFabricWidthDiscountCm', discounts.fabric);
  const rollDiscount = effectiveNumber(awning, 'monoblockRollDiscountCm', discounts.roll);
  const loadBarDiscount = effectiveNumber(awning, 'monoblockLoadBarDiscountCm', monoblockLoadBarDiscount(discounts.loadBar, tubeLoad));
  const squareBarDiscount = effectiveNumber(awning, 'monoblockSquareBarDiscountCm', discounts.squareBar);
  const dropAllowance = effectiveNumber(awning, 'monoblockFabricDropAllowanceCm', parameters.fabricDropAllowanceCm);
  const supportCount = effectiveNumber(
    awning,
    'monoblockSupportCount',
    resolveMonoblockSupportCount(awning.width, awning.projection, armCount, parameters)
  );
  const fabricWidth = round1(awning.width - fabricDiscount);
  const rawFabricDrop = awning.projection + dropAllowance
    + (valanceFabricSelection ? 0 : valance + parameters.valanceExtraCm);
  const fabricDrop = round1(rawFabricDrop);
  const rollTubeLength = round1(awning.width - rollDiscount);
  const loadBarLength = round1(awning.width - loadBarDiscount);
  const squareBarLength = round1(awning.width - squareBarDiscount);
  // Hasta 700, la barra de siempre: 600 si el tubo cabe, si no 700 (Q-A06). Por encima,
  // el Monoblock empalma (splitIntoBars). El tubo de enrolle llega a 800.
  const usualLength = (length) => (sorted) => sorted.find((item) => [600, 700].includes(item) && item >= length)
    || sorted.find((item) => item >= length);
  const rollBars = splitIntoBars(rollTubeLength, rollTubeLengths, (sorted) => (rollTubeLength < parameters.stockLengths[0]
    ? parameters.stockLengths[0]
    : rollTubeLength <= parameters.stockLengths.at(-1) ? parameters.stockLengths.at(-1) : sorted.find((item) => item >= rollTubeLength)));
  const loadBarAvailable = tubeLoad === 'TUBO DE CARGA EVO 80'
    ? evo80StockLengths(lacado.suffix, [400, 500, 600, 700])
    : universProfileStockLengths(universProfileSuffix(lacado.suffix), [400, 500, 600, 700]);
  const loadBars = splitIntoBars(loadBarLength, loadBarAvailable, usualLength(loadBarLength), 25);
  const squareBars = splitIntoBars(squareBarLength, squareBarLengths[squareBarColor(lacado)], (sorted) => sorted.at(-1), 25);
  const stockLength = rollBars.length === 1 ? rollBars[0] : Math.max(0, ...rollBars);
  const stockUnavailable = !rollBars.length || !loadBars.length || !squareBars.length;
  // Con tres brazos va uno suelto: tampoco existe en todos los lacados y salidas.
  const armMissing = !onyxArmExists(lacado.suffix, awning.projection)
    || (armCount % 2 === 1 && !galiciaSingleArmExists(lacado.suffix, awning.projection));
  // Motor del parámetro por salida y brazos (por defecto, el que se consume:
  // monoblock350MotorByArms). Se puede cambiar a mano en el toldo.
  const motorPower = awning.motorPower && awning.motorPower !== 'AUTOMÁTICO'
    ? awning.motorPower
    : baseRule?.motorPower || '';
  const curronCount = resolveMonoblockCurronCount(awning.width, parameters);
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
  const standardRuleMissing = !baseRule;
  const outsideLine = !standardRuleMissing && (Number(awning.width) < minimumLine || Number(awning.width) > maximumLine);
  const valid = missingFields.length === 0
    && Boolean(fabric)
    && (!valanceFabricSelection || valance === 0 || Boolean(valanceFabric))
    && (!standardRuleMissing || modified)
    && (!outsideLine || modified)
    && !stockUnavailable
    && !armMissing
    && supportCount > 0;

  if (fabricSelection && !fabric) diagnostics.push({ level: 'error', awningId: awning.id, message: `Tela no encontrada en el catálogo: "${fabricSelection}".` });
  if (valanceFabricSelection && valance > 0 && !valanceFabric) diagnostics.push({ level: 'error', awningId: awning.id, message: `Tela de bamba no encontrada en el catálogo: "${valanceFabricSelection}".` });
  if (armMissing) diagnostics.push({ level: 'error', awningId: awning.id, message: `MONOBLOCK 350 no válido: no hay brazo Onyx de ${formatNumber(awning.projection)} cm${armCount % 2 === 1 ? ' suelto' : ''} en ${lacado.name}.` });
  if (stockUnavailable) diagnostics.push({ level: 'error', awningId: awning.id, message: `MONOBLOCK 350 no válido: no hay barra de carga en ${lacado.name} para ${formatNumber(loadBarLength)} cm.` });
  if (missingFields.length) {
    diagnostics.push({ level: 'error', awningId: awning.id, message: `MONOBLOCK 350 incompleto en OF ${awning.of}: falta ${missingFields.join(' y ')}.` });
  } else if (standardRuleMissing && !modified) {
    diagnostics.push({ level: 'error', awningId: awning.id, message: `MONOBLOCK 350 no admite la salida ${awning.projection} cm sin excepción técnica.` });
  } else if (outsideLine && !modified) {
    diagnostics.push({ level: 'error', awningId: awning.id, message: `MONOBLOCK 350 con ${armCount} brazos y salida ${awning.projection}: frente válido entre ${minimumLine} y ${maximumLine} cm.` });
  } else if (modified) {
    diagnostics.push({ level: 'warn', awningId: awning.id, message: `Excepción técnica en OF ${awning.of}: reglas de MONOBLOCK 350 modificadas.` });
  }

  const context = {
    awning, device, lacado, fabric, stockLength, armCount, motorPower, tubeLoad, rollBars, loadBars, squareBars,
    supportCount, curronCount, rollTubeLength, loadBarLength, squareBarLength,
    fabricMl: fabricUsage.ml, valanceFabric, valanceFabricMl: valanceUsage?.ml || 0, parameters
  };
  return {
    of: awning.of,
    description: buildDescription(awning, { fabricWidth, fabricDrop, fabricMl: fabricUsage.ml }),
    materials: valid ? buildMaterials(context) : [],
    despiece: valid ? buildDespiece(context) : null,
    diagnostics,
    calculation: {
      model: 'MONOBLOCK 350', valid, minimumLine, maximumLine,
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
      structureLength: loadBarLength, rollTubeLength, squareBarLength, stockLength, tubeLoad,
      rollTubeBars: rollBars, loadBarBars: loadBars, squareBarBars: squareBars,
      armCount, requiredArmCount: suggestedArms, supportCount, curronCount,
      motorPower: device === 'MOTOR' ? motorPower : '',
      monoblockMinimumLineCm: minimumLine,
      monoblockMaximumLineCm: maximumLine,
      monoblockSupportCount: supportCount,
      monoblockFabricWidthDiscountCm: fabricDiscount,
      monoblockRollDiscountCm: rollDiscount,
      monoblockLoadBarDiscountCm: loadBarDiscount,
      monoblockSquareBarDiscountCm: squareBarDiscount,
      monoblockFabricDropAllowanceCm: dropAllowance
    }
  };
}

// Una sola lista de piezas para la reserva y el despiece, contrastada con el consumo
// real de 59 OF de MONOB desde 2024:
// - Brazos, soportes de brazo y soportes a pared o techo van en JUEGOS de dos, con un
//   suelto si el número es impar. Se reservaban por unidades (el doble de brazos).
// - Barra de carga EVO 80 o Univers 280 con sus tapones (se reservaban tapones de
//   EVO 70), terminales (y el indiferente con tres brazos), varillas y tapones de la
//   barra 40×40, que no se reservaban.
// - Por encima de 700 cm se empalma: dos barras (o tubos) donde antes se reservaba una.
// - El currón que se consume es el apoyo intermedio APOIN40; el CURRONMOPL no.
// - Motor con el kit del Arzúa (rueda P-801 mecanizada y corona LT60).
function monoblockPieces(context) {
  const { awning, device, lacado, armCount, motorPower, supportCount, curronCount, rollTubeLength, loadBarLength, squareBarLength, tubeLoad, rollBars, loadBars, squareBars } = context;
  const units = Math.max(1, Number(awning.units) || 1);
  const suffix = lacado.suffix;
  const evo = tubeLoad === 'TUBO DE CARGA EVO 80';
  const varillaMl = Math.ceil(Number(loadBarLength) || 0) / 100;
  const pieces = [
    ...monoblockArmSupportLines(suffix, armCount, units, awning.looseSide),
    ...groupBars(rollBars).map(({ length, count }) => ({ code: `TURA80HG${length}C`, quantity: count * units, description: 'TUBO DE ENROLLE P801', length: rollTubeLength })),
    { code: tipBushing('P801').code, quantity: units, description: tipBushing('P801').description },
    ...groupBars(loadBars).map(({ length, count }) => evo
      ? { code: `PEVO80${suffix}${length}C`, quantity: count * units, description: 'TUBO DE CARGA EVO 80', length: loadBarLength }
      : { code: `PUNI280${universProfileSuffix(suffix)}${length}C`, quantity: count * units, description: 'TUBO DE CARGA UNIVERS 280', length: loadBarLength }),
    evo
      ? { code: `TAPONEVO8${plasticCapSuffix(lacado)}`, quantity: units, description: 'KIT TAPONES EVO 80' }
      : { code: `TAPOPLUN280${plasticCapSuffix(lacado)}`, quantity: units, description: 'KIT TAPONES UNIVERS 280' },
    ...monoblockArmLines(suffix, awning.projection, armCount, units, awning.looseSide),
    { code: `TERMINEVO${suffix}`, quantity: Math.floor(armCount / 2) * units, description: 'JGO TERMINAL INFERIOR EVO 70-80' },
    ...(armCount % 2 ? [{ code: `TERMINEVOUND${suffix}`, quantity: units, description: 'TERMINAL INFERIOR INDIFERENTE EVO 70-80' }] : []),
    { code: 'VARILLAVAINANEG5', quantity: round1(varillaMl * units), description: 'VARILLA VAINA NEGRA 4,5MM', despiece: false },
    { code: 'VARILLAVAINARBLA', quantity: round1(2 * varillaMl * units), description: 'VARILLA VAINA RIGIDA 5,5 BLANCA', despiece: false },
    ...groupBars(squareBars).map(({ length, count }) => ({ code: `${squareBarColor(lacado) === 'NEGRO' ? 'TA3NEGR4X4' : 'TA3BLAN4X4'}${length}C`, quantity: count * units, description: `BARRA CUADRADA 40X40 ${squareBarColor(lacado)}`, length: squareBarLength })),
    { code: squareBarCapCode(lacado), quantity: 2 * units, description: 'TAPON PLASTICO TUBO 40X40' },
    ...monoblockPlacementLines(awning.placement, suffix, supportCount, units),
    { code: `SOPMAPUMONO${suffix}`, quantity: units, description: 'JUEGO SOPORTE MAQ.-PUNTA MONOBLOCK350' },
    ...(curronCount ? [{ code: curronSupportCode(lacado), quantity: curronCount * units, description: 'APOYO CURRON INTERMEDIO MONOBLOC 40X40' }] : [])
  ];

  if (device === 'MOTOR') {
    const remote = resolveMotorRemote(awning.sensor);
    const sensor = sensorMaterial(awning.sensor);
    pieces.push(
      { code: 'RUEDAMOT801MEC', quantity: units, description: 'RUEDA MOTRIZ A P-801 MECANIZADA' },
      { code: 'SOPORTEUNVHIPRO', quantity: units, description: 'SOPORTE UNIVERSAL HIPRO' },
      { code: `SUNILUSIO${motorPower.replace('/', '//')}`, quantity: units, description: `MOTOR SOMFY SUNILUS ${motorPower} IO` },
      { code: 'CORONALT60', quantity: units, description: 'CORONA ADAPTADA LT60 P-801' },
      { code: remote.code, quantity: units, description: remote.description, aggregation: 'max' },
      ...(sensor ? [{ ...sensor, quantity: units, aggregation: 'max' }] : [])
    );
  } else {
    pieces.push(
      { code: 'CASMAQEJE5078MM', quantity: units, description: 'CASQUILLO MAQUINA EJE 50MM Ø78' },
      { code: machineCode(lacado), quantity: units, description: `MÁQUINA MB-11 L-120 ${lacado.crank}` },
      { code: `MANIVE${crankSuffix(lacado)}${awning.crankHeight}C`, quantity: units, description: `MANIVELA LUXE ${lacado.crank} ${awning.crankHeight}`, length: awning.crankHeight }
    );
  }
  return pieces;
}

function buildMaterials(context) {
  const { awning, fabric, valanceFabric, armCount, fabricMl, valanceFabricMl } = context;
  const units = Math.max(1, Number(awning.units) || 1);
  const materials = monoblockPieces(context).map(({ code, quantity, description, aggregation }) => (
    aggregation ? { ...line(code, quantity, description), aggregation } : line(code, quantity, description)
  )).filter(Boolean);
  if (fabric) materials.push(line(fabric.code, fabricMl, fabric.description));
  if (valanceFabric && valanceFabricMl > 0) materials.push(line(valanceFabric.code, valanceFabricMl, `${valanceFabric.description} · BAMBA`));
  const wall = wallMaterial(awning.wallType, armCount * units);
  if (wall) materials.push(wall);
  return materials;
}

function buildDespiece(context) {
  const { awning, armCount } = context;
  const units = Math.max(1, Number(awning.units) || 1);
  const rows = monoblockPieces(context)
    .filter((piece) => piece.despiece !== false)
    .map((piece, index) => ({ num: index + 1, name: piece.description, reference: piece.code || null, units: piece.quantity, length: piece.length ?? null }));
  const wallEntry = behaviorData.options.tiposPared.find((item) => item.pared === awning.wallType);
  const anchoring = wallEntry ? { name: wallEntry.tornilleria, reference: wallEntry.referencia || null, units: wallEntry.unidades * armCount * units } : null;
  return { rows, anchoring };
}

function line(code, quantity, description) { return code ? { code, quantity, description } : null; }
function normalizeDevice(value) { const clean = String(value || '').trim().toUpperCase(); if (clean === 'MOTOR') return 'MOTOR'; if (clean.includes('MAQ')) return 'MAQUINA'; return ''; }
function effectiveNumber(awning, field, fallback) { return effectiveOverride(awning, field, fallback); }
function wallMaterial(wallType, armUnits) { const entry = behaviorData.options.tiposPared.find((item) => item.pared === wallType); return entry?.referencia ? line(entry.referencia, entry.unidades * armUnits, entry.tornilleria) : null; }
function sensorMaterial(value) { const sensor = String(value || '').trim().toUpperCase(); if (sensor === 'MOVIMIENTO') return { code: 'EOLIS3DIO', description: 'EOLIS 3D WIREFREE IO' }; if (sensor === 'EOLIS IO') return { code: 'EOLISSENSORIO', description: 'EOLIS SENSOR IO' }; if (sensor === 'SOL') return { code: 'SUNISIIIO', description: 'SUNIS II IO' }; return null; }
function buildDescription(awning, calculation) { const valance = Math.max(0, Number(awning.valanceHeight) || 0); const valanceText = valance > 0 ? ` · bambalina incluida de ${valance + 5} cm, hecha de ${valance} cm` : ''; return `Toldo MONOBLOCK 350 ${awning.width}x${awning.projection} · tela ${formatNumber(calculation.fabricWidth)}x${formatNumber(calculation.fabricDrop)} · paño ${formatNumber(calculation.fabricMl)} ml${valanceText}`; }
function round1(value) { return Math.round(Number(value) * 10) / 10; }
