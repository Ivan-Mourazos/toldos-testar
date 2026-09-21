import { tipBushing } from './tipBushing.js';
import { formatNumber } from './math.js';
import { resolveFabric } from './fabricCatalog.js';
import { calculateFabricUsage } from './fabricMath.js';
import { resolveLacado, crankSuffix, machineCode, plasticCapSuffix, universProfileSuffix } from './lacados.js';
import behaviorData from './data/modelBehavior.json' with { type: 'json' };
import { arzuaProEstablishedProjections } from './arzuaProConstants.js';
import {
  normalizeArzuaProParameters,
  resolveArzuaMotorPower,
  resolveArzuaRequiredTorque,
  resolveArzuaSupport,
  suggestedTubeForDestination
} from './arzuaProParameters.js';
import { resolveMotorRemote } from './motorAccessories.js';
import { crossedMinimumLines, resolveCrossedKit, crossedFabricLimits, crossedProfileByFinish } from './arzuaCrossed.js';

export { arzuaProEstablishedProjections };

export function calculateArzuaPro({ order, awning }) {
  const parameters = normalizeArzuaProParameters(order.parameters?.arzuaPro);
  const structureColor = awning.structureColor || order.structureColor;
  const lacado = resolveLacado(structureColor);
  const colorSuffix = lacado.suffix;
  const crossed = awning.armConfiguration === 'CROSSED';
  const crossedKit = crossed ? resolveCrossedKit(structureColor) : null;
  const selectedTube = awning.tubeLoad || suggestedTubeForDestination(awning.destination, parameters);
  const tubeLoad = normalizeTubeLoad(selectedTube);
  const device = normalizeDevice(awning.device);
  const supportSystem = resolveArzuaSupport(awning, parameters);
  const motorPower = resolveArzuaMotorPower(awning, parameters);
  const requiredMotorTorqueNm = device === 'MOTOR' && !crossed
    ? resolveArzuaRequiredTorque(awning.width, awning.projection)
    : null;
  const armCount = supportSystem === 'GALICIA' ? 3 : 1;
  const diagnostics = [];
  const minimumLine = lookupMinimumLine(crossed ? crossedMinimumLines : parameters.minimumLineByArm, awning.projection, device);
  const maximumLine = crossed ? (device === 'MAQ. EXTERIOR' ? 400 : 395) : parameters.standardMaxWidth;
  const modified = Boolean(awning.reglasModificadas);
  const belowMinimum = awning.width < minimumLine;
  const overMaximum = supportSystem === 'ARZUA' && awning.width > maximumLine;
  const fabricSelection = order.sameFabric !== false ? order.fabric : awning.fabric;
  const fabric = fabricSelection ? resolveFabric(fabricSelection) : null;
  const valance = Math.max(0, Number(awning.valanceHeight) || 0);
  const valanceFabricSelection = valance > 0 ? String(awning.valanceFabric || '').trim() : '';
  const valanceFabric = valanceFabricSelection ? resolveFabric(valanceFabricSelection) : null;
  // El gate de incompletitud de calculateOrder solo cubre OF/modelo/frente/salida;
  // sin estos campos el cálculo asumiría MOTOR/EVO 80 o emitiría MANIVE...0C en silencio.
  const missingFields = [];
  if (crossed) {
    const issue = (message, level = 'error') => diagnostics.push({ level, awningId: awning.id, message });
    if (!crossedKit) issue(`Brazo cruzado: falta equivalencia ERP confirmada del kit para ${structureColor || 'el lacado elegido'}.`);
    if (typeof awning.crossedAdditionalTerminals !== 'boolean') issue('Brazo cruzado: confirmar si se necesita un juego adicional de terminales. La tarifa los muestra dentro del kit, pero el pedido 091076 incluye ambos.');
    if (supportSystem !== 'ARZUA' || (Number(awning.armCount) && Number(awning.armCount) !== 2)) issue('Brazo cruzado AROND: requiere soporte ARZUA y dos brazos.');
    if (!crossedMinimumLines.some((row) => row.arm === Number(awning.projection))) issue('Brazo cruzado: salida admitida entre 150 y 350 cm, en pasos de 25 cm.');
    if (overMaximum) issue(`Brazo cruzado: frente máximo ${maximumLine} cm para ${device}.`);
    // El kit inferior confirmado no se sustituye por el kit posterior de UNIVERS.
    if (tubeLoad !== 'TUBO DE CARGA EVO 80') issue('Brazo cruzado: kit inferior confirmado para EVO 80. La variante de sujeción posterior requiere verificar su referencia ERP.');
    if (device === 'MOTOR' && !['55/17', '70/17'].includes(awning.motorPower)) issue('Brazo cruzado: seleccionar y confirmar el motor; la tabla de par estándar no cubre esta configuración.');
    const limits = crossedFabricLimits(fabric);
    if (limits && (awning.width > limits.width || awning.projection > limits.projection)) issue(`Brazo cruzado: esta familia de lona admite como máximo ${limits.width} × ${limits.projection} cm.`);
    if (fabric && !limits) issue('Brazo cruzado: comprobar el límite de la lona; su familia no está identificada en la tabla Llaza 2026.', 'warn');
    issue('BRAZOS CRUZADOS: kit en soporte izquierdo, dos brazos e inclinación máxima 30°.', 'warn');
    if (Number(awning.projection) >= 300 && device !== 'MOTOR') issue('Llaza recomienda motor a partir de 300 cm de salida con brazos cruzados.', 'warn');
  }
  if (!structureColor) missingFields.push('lacado');
  if (!fabricSelection) missingFields.push('tela');
  if (!device) missingFields.push('dispositivo válido');
  else if ((device === 'MAQ. INTERIOR' || device === 'MAQ. EXTERIOR') && !awning.crankHeight) missingFields.push('altura de manivela');
  if (!tubeLoad) missingFields.push('tubo de carga válido');
  const fabricWidth = round1(awning.width - lookupDiscount(parameters.fabricWidthDiscounts, tubeLoad, device, 11));
  const valanceExtraCm = 5;
  const mainDropAllowance = valanceFabricSelection
    ? Math.max(0, parameters.fabricDropAllowanceCm - valanceExtraCm)
    : parameters.fabricDropAllowanceCm;
  const fabricDrop = round1(awning.projection + mainDropAllowance + (valanceFabricSelection ? 0 : valance));
  const fabricUsage = calculateFabricUsage({
    width: fabricWidth,
    drop: fabricDrop,
    units: awning.units,
    rollWidth: fabric?.width || 120,
    seamAllowanceCm: parameters.seamAllowanceCm,
    seamBaseCm: parameters.seamBaseCm
  });
  const fabricMl = fabricUsage.ml;
  const valanceUsage = valanceFabric && valance > 0 ? calculateFabricUsage({
    width: Number(awning.width),
    drop: valance + valanceExtraCm,
    units: awning.units,
    rollWidth: valanceFabric.width || 120,
    seamAllowanceCm: parameters.seamAllowanceCm,
    seamBaseCm: parameters.seamBaseCm
  }) : null;
  const length = round1(awning.width - lookupDiscount(parameters.widthDiscounts, tubeLoad, device, 9.8));
  if (crossed && (length <= 0 || length > 500)) diagnostics.push({ level: 'error', awningId: awning.id, message: 'Brazo cruzado: el corte de la barra de carga debe caber en el perfil de 500 cm.' });
  const rollTubeLength = round1(awning.width - lookupDiscount(parameters.rollTubeDiscounts, tubeLoad, device, 9.8));
  const stockLength = chooseStockLength(length, parameters.stockLengths);
  const fabricInvalid = Boolean(fabricSelection && !fabric);
  const stockUnavailable = stockLength === null;
  const valid = missingFields.length === 0
    && !diagnostics.some((item) => item.level === 'error')
    && !fabricInvalid
    && (!valanceFabricSelection || valance === 0 || Boolean(valanceFabric))
    && !stockUnavailable
    && !belowMinimum
    && (!overMaximum || modified);
  if (fabricSelection && !fabric) {
    diagnostics.push({
      level: 'error',
      awningId: awning.id,
      message: `Tela no encontrada en el catálogo: "${fabricSelection}".`
    });
  }
  if (valanceFabricSelection && valance > 0 && !valanceFabric) {
    diagnostics.push({
      level: 'error',
      awningId: awning.id,
      message: `Tela de bamba no encontrada en el catálogo: "${valanceFabricSelection}".`
    });
  }
  if (stockUnavailable) {
    diagnostics.push({
      level: 'error',
      awningId: awning.id,
      message: `ARZUA PRO no válido: ningún largo de stock configurado admite ${length} cm.`
    });
  }

  const materials = valid
    ? buildMaterials({
      awning, lacado, colorSuffix, tubeLoad, device, supportSystem, motorPower, armCount, crossedKit,
      stockLength, length, fabricMl, fabric, valanceFabric, valanceFabricMl: valanceUsage?.ml || 0
    })
    : [];

  const despiece = valid
    ? buildDespiece({ awning, device, tubeLoad, lacado, colorSuffix, supportSystem, motorPower, armCount, crossedKit, stockLength, length, rollTubeLength })
    : null;

  if (missingFields.length > 0) {
    diagnostics.push({
      level: 'error',
      awningId: awning.id,
      message: `ARZUA PRO incompleto en OF ${awning.of}: falta ${missingFields.join(' y ')}.`
    });
  } else if (belowMinimum) {
    diagnostics.push({
      level: 'error',
      awningId: awning.id,
      message: `ARZUA PRO no válido: frente ${awning.width} cm, mínimo ${minimumLine} cm para salida ${awning.projection} y ${device}.`
    });
  } else if (!crossed && overMaximum && !modified) {
    diagnostics.push({
      level: 'error',
      awningId: awning.id,
      message: `ARZUA PRO no válido: frente ${awning.width} cm supera el máximo estándar de ${parameters.standardMaxWidth} cm con soporte ARZUA.`
    });
  } else if (!crossed && overMaximum && modified) {
    diagnostics.push({
      level: 'warn',
      awningId: awning.id,
      message: `Reglas modificadas en OF ${awning.of}: frente ${awning.width} cm supera el máximo estándar de ${parameters.standardMaxWidth} cm con soporte ARZUA.`
    });
  }

  return {
    of: awning.of,
    description: buildDescription(awning, { fabricWidth, fabricDrop, fabricMl, minimumLine, valid }),
    materials,
    despiece,
    diagnostics,
    calculation: {
      model: 'ARZUA PRO',
      valid,
      minimumLine,
      maximumLine,
      armConfiguration: crossed ? 'CROSSED' : 'STANDARD',
      physicalArmCount: crossed ? 2 : supportSystem === 'GALICIA' ? 3 : 2,
      crossedKit: crossedKit || '',
      loadProfileStockLength: crossed ? 500 : stockLength,
      width: awning.width,
      projection: awning.projection,
      fabricWidth,
      fabricDrop,
      fabricMl,
      fabricPanels: fabricUsage.panels,
      mainFabricMl: fabricMl,
      mainFabricPanels: fabricUsage.panels,
      fabricCode: fabric?.code || '',
      fabricDescription: fabric?.description || '',
      fabricRollWidth: fabric?.width || 120,
      valanceFabricCode: valanceFabric?.code || '',
      valanceFabricDescription: valanceFabric?.description || '',
      valanceFabricWidth: valanceUsage ? Number(awning.width) : 0,
      valanceFabricMl: valanceUsage?.ml || 0,
      valanceFabricPanels: valanceUsage?.panels || 0,
      valanceDrop: valanceUsage ? valance + valanceExtraCm : 0,
      structureLength: length,
      rollTubeLength,
      stockLength,
      tubeLoad,
      supportSystem,
      motorPower: device === 'MOTOR' ? motorPower : '',
      requiredMotorTorqueNm,
      armCount
    }
  };
}

// Referencias compartidas entre RPS (buildMaterials) y despiece (buildDespiece):
// mismo cálculo de código, una sola vez, para que ambos no puedan divergir por error.
const refSoporte = (supportSystem, colorSuffix) => supportSystem === 'GALICIA' ? `SOPARTGL${colorSuffix}` : `SOPAR350${colorSuffix}`;
const refTuboEnrolle = (stockLength) => `TURA80HG${stockLength}C`;
const refTuboCargaEvo = (colorSuffix, stockLength) => `PEVO80${colorSuffix}${stockLength}C`;
const refTuboCargaUnivers = (colorSuffix, stockLength) => `PUNI280${universProfileSuffix(colorSuffix)}${stockLength}C`;
const refCasquilloPunta = tipBushing('P801').code;
const refTaponesUnivers = (lacado) => `TAPOPLUN280${plasticCapSuffix(lacado)}`;
const refTaponesEvo = (lacado) => `TAPONEVO8${plasticCapSuffix(lacado)}`;
const refTerminales = (colorSuffix) => `TERMINEVO${colorSuffix}`;
const refBrazosOnyx = (colorSuffix, projection) => `BONYX${colorSuffix}${projection}C`;
const refCasquilloMaquina = (device) => (device === 'MAQ. INTERIOR' ? 'CASMAQEJE5078MM' : 'CASMAQEJE6378MM');
const descCasquilloMaquina = (device) => (device === 'MAQ. INTERIOR' ? 'CASQUILLO MAQUINA EJE 50MM Ø78' : 'CASQUILLO EJE 63MM Ø78');
const refManivela = (lacado, crankHeight) => `MANIVE${crankSuffix(lacado)}${crankHeight}C`;

function buildMaterials({ awning, lacado, colorSuffix, tubeLoad, device, supportSystem, motorPower, armCount, crossedKit, stockLength, length, fabricMl, fabric, valanceFabric, valanceFabricMl }) {
  const units = Math.max(1, Number(awning.units) || 1);
  // Las dos varillas de vaina se cortan al largo de la barra de carga, y de la
  // rígida blanca entra el doble que de la negra: se cumple exacto en 243 de las
  // 282 OF con imputación desde 2025. Contrastado al centímetro en las OF
  // 0230194 (barra 327,2 · varilla 3,29 m) y 0230330 (489,6 · 4,90 m).
  const varillaMl = Math.ceil(Number(length) || 0) / 100;
  const materials = [
    { code: refSoporte(supportSystem, colorSuffix), quantity: units, description: supportSystem === 'GALICIA' ? 'JUEGO SOPORTE GALICIA' : 'JUEGO SOPORTE AROND' },
    { code: refTuboEnrolle(stockLength), quantity: 2 * units, description: 'TUBO DE ENROLLE P801' },
    { code: refCasquilloPunta, quantity: units, description: 'CASQUILLO PUNTA CON EJE Ø78' },
    { code: crossedKit || refTerminales(colorSuffix), quantity: units, description: crossedKit ? 'KIT BRAZO CRUZADO AROND INFERIOR CON TERMINALES' : 'JGO TERMINAL INFERIOR EVO 70-80' },
    { code: 'VARILLAVAINANEG5', quantity: round1(varillaMl * units), description: 'VARILLA VAINA NEGRA 4,5MM' },
    { code: 'VARILLAVAINARBLA', quantity: round1(2 * varillaMl * units), description: 'VARILLA VAINA RIGIDA 5,5 BLANCA' }
  ];

  if (tubeLoad === 'TUBO DE CARGA EVO 80') {
    materials.push(
      { code: crossedKit ? crossedProfileByFinish[colorSuffix] : refTuboCargaEvo(colorSuffix, stockLength), quantity: units, description: 'TUBO DE CARGA EVO 80' },
      { code: refTaponesEvo(lacado), quantity: units, description: 'KIT TAPONES EVO 80' },
      { code: refBrazosOnyx(colorSuffix, awning.projection), quantity: armCount * units, description: supportSystem === 'GALICIA' ? 'BRAZO ONYX' : 'JUEGO DE BRAZOS ONYX' }
    );
  } else {
    materials.push(
      { code: refTuboCargaUnivers(colorSuffix, stockLength), quantity: units, description: 'TUBO DE CARGA UNIVERS 280' },
      { code: refTaponesUnivers(lacado), quantity: units, description: 'KIT TAPONES UNIVERS 280' },
      { code: refBrazosOnyx(colorSuffix, awning.projection), quantity: armCount * units, description: supportSystem === 'GALICIA' ? 'BRAZO ONYX' : 'JUEGO DE BRAZOS ONYX' }
    );
  }

  if (device === 'MAQ. INTERIOR' || device === 'MAQ. EXTERIOR') {
    const crankHeight = Math.max(0, Number(awning.crankHeight) || 0);
    materials.push(
      { code: machineCode(lacado), quantity: units, description: `MAQUINA MB-11 L-120 ${lacado.crank}` },
      { code: refCasquilloMaquina(device), quantity: units, description: descCasquilloMaquina(device) },
      { code: refManivela(lacado, crankHeight), quantity: units, description: `MANIVELA LUXE ${lacado.crank} ${crankHeight}` }
    );
  }

  if (device === 'MOTOR') {
    const motorCode = motorPower === '70/17' ? 'SUNILUSIO70//17' : 'SUNILUSIO55//17';
    const remote = resolveMotorRemote(awning.sensor);
    materials.push(
      { code: 'RUEDAMOT801MEC', quantity: units, description: 'RUEDA MOTRIZ A P-801 MECANIZADA' },
      { code: motorCode, quantity: units, description: `MOTOR SOMFY SUNILUS ${motorPower} IO` },
      { code: 'CORONALT60', quantity: units, description: 'CORONA ADAPTADA LT60 P-801' },
      { code: 'SOPORTEUNVHIPRO', quantity: units, description: 'SOPORTE UNIVERSAL HIPRO' },
      { code: remote.code, quantity: units, description: remote.description }
    );
  }

  if (fabric) {
    materials.push({ code: fabric.code, quantity: fabricMl, description: fabric.description });
  }
  if (crossedKit && awning.crossedAdditionalTerminals === true) {
    materials.push({ code: refTerminales(colorSuffix), quantity: units, description: 'JUEGO TERMINALES ADICIONAL CONFIRMADO' });
  }
  if (valanceFabric && valanceFabricMl > 0) {
    materials.push({ code: valanceFabric.code, quantity: valanceFabricMl, description: `${valanceFabric.description} · BAMBA` });
  }

  return materials;
}

function buildDespiece({ awning, device, tubeLoad, lacado, colorSuffix, supportSystem, motorPower, armCount, crossedKit, stockLength, length, rollTubeLength }) {
  const rows = [];
  const awningUnits = Math.max(1, Number(awning.units) || 1);
  const push = (num, name, reference, units, rowLength = null) => {
    rows.push({ num, name, reference, units, length: rowLength });
  };

  push(1, supportSystem === 'GALICIA' ? 'JUEGO SOPORTE GALICIA' : 'JUEGO SOPORTE AROND', refSoporte(supportSystem, colorSuffix), awningUnits);
  push(2, 'TUBO DE ENROLLE P801', refTuboEnrolle(stockLength), awningUnits, rollTubeLength);
  push(3, 'CASQUILLO PUNTA', refCasquilloPunta, awningUnits);

  if (device === 'MAQ. INTERIOR' || device === 'MAQ. EXTERIOR') {
    push(4, descCasquilloMaquina(device), refCasquilloMaquina(device), awningUnits);
  }

  if (tubeLoad === 'TUBO DE CARGA EVO 80') {
    push(5, 'TUBO DE CARGA EVO 80', crossedKit ? crossedProfileByFinish[colorSuffix] : refTuboCargaEvo(colorSuffix, stockLength), awningUnits, length);
    push(6, 'KIT TAPONES EVO 80', refTaponesEvo(lacado), awningUnits);
  } else {
    push(5, 'TUBO DE CARGA UNIVERS 280', refTuboCargaUnivers(colorSuffix, stockLength), awningUnits, length);
    push(6, 'KIT TAPONES UNIVERS 280', refTaponesUnivers(lacado), awningUnits);
  }

  push(7, supportSystem === 'GALICIA' ? 'BRAZO ONYX' : 'JUEGO DE BRAZOS ONYX', refBrazosOnyx(colorSuffix, awning.projection), armCount * awningUnits, awning.projection);
  push(8, crossedKit ? 'KIT CRUZADO AROND + TERMINALES' : 'JUEGO DE TERMINALES', crossedKit || refTerminales(colorSuffix), awningUnits);

  if (device === 'MAQ. INTERIOR' || device === 'MAQ. EXTERIOR') {
    const crankHeight = Math.max(0, Number(awning.crankHeight) || 0);
    push(9, `MÁQUINA MB-11 L-120 ${lacado.crank}`, machineCode(lacado), awningUnits);
    push(10, `MANIVELA LUXE ${lacado.crank} ${crankHeight}`, refManivela(lacado, crankHeight), awningUnits, crankHeight);
    push(11, 'KIT DE TORNILLOS MAQUINA', null, awningUnits);
  }

  if (device === 'MOTOR') {
    const motorCode = motorPower === '70/17' ? 'SUNILUSIO70//17' : 'SUNILUSIO55//17';
    const remote = resolveMotorRemote(awning.sensor);
    push(9, 'RUEDA MOTRIZ A P-801 MECANIZADA', 'RUEDAMOT801MEC', awningUnits);
    push(10, `MOTOR SOMFY SUNILUS ${motorPower} IO`, motorCode, awningUnits);
    push(11, 'CORONA ADAPTADA LT60 P-801', 'CORONALT60', awningUnits);
    push(12, 'SOPORTE UNIVERSAL HIPRO', 'SOPORTEUNVHIPRO', awningUnits);
    push(21, remote.description, remote.code, awningUnits);
  }

  const wallEntry = behaviorData.options.tiposPared.find((item) => item.pared === awning.wallType);
  if (crossedKit && awning.crossedAdditionalTerminals === true) push(13, 'JUEGO TERMINALES ADICIONAL CONFIRMADO', refTerminales(colorSuffix), awningUnits);
  const anchoring = wallEntry
    ? { name: wallEntry.tornilleria, reference: wallEntry.referencia || null, units: wallEntry.unidades * awningUnits }
    : null;

  return { rows, anchoring };
}

function buildDescription(awning, calc) {
  const valance = Math.max(0, Number(awning.valanceHeight) || 0);
  const bambaText = valance > 0
    ? ` · bambalina incluida de ${valance + 5} cm, hecha de ${valance} cm`
    : '';
  return `Toldo ARZUA PRO${awning.armConfiguration === 'CROSSED' ? ' BRAZOS CRUZADOS · kit izquierdo · inclinación máx. 30°' : ''} ${awning.width}x${awning.projection} · tela ${formatNumber(calc.fabricWidth)}x${formatNumber(calc.fabricDrop)} · paño ${formatNumber(calc.fabricMl)} ml${bambaText}`;
}

function lookupMinimumLine(minimumLines, arm, device) {
  const exact = minimumLines.find((item) => item.arm === arm);
  if (exact) return exact.values[device];

  const next = minimumLines.find((item) => item.arm >= arm);
  return (next || minimumLines[minimumLines.length - 1]).values[device];
}

function lookupDiscount(matrix, tubeLoad, device, fallback) {
  return matrix[tubeLoad]?.[device] ?? fallback;
}

function chooseStockLength(length, stockLengths) {
  return stockLengths.find((item) => item >= length) || null;
}

function normalizeTubeLoad(value) {
  const cleanValue = String(value || '').trim().toUpperCase();
  if (cleanValue.includes('UNIVERS')) return 'TUBO DE CARGA UNIVERS 280';
  if (cleanValue.includes('EVO 80')) return 'TUBO DE CARGA EVO 80';
  return '';
}

function normalizeDevice(value) {
  const cleanValue = String(value || '').trim().toUpperCase();
  if (cleanValue.includes('INTERIOR')) return 'MAQ. INTERIOR';
  if (cleanValue.includes('EXTERIOR')) return 'MAQ. EXTERIOR';
  if (cleanValue === 'MOTOR') return 'MOTOR';
  return '';
}

function round1(value) {
  return Math.round(value * 10) / 10;
}
