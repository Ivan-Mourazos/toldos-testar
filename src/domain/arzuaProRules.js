import { formatNumber } from './math.js';
import { resolveFabric } from './fabricCatalog.js';
import { calculateFabricUsage } from './fabricMath.js';
import { resolveLacado, crankSuffix, machineCode } from './lacados.js';
import behaviorData from './data/modelBehavior.json' with { type: 'json' };
import { arzuaProEstablishedProjections } from './arzuaProConstants.js';
import {
  normalizeArzuaProParameters,
  resolveArzuaMotorPower,
  resolveArzuaSupport,
  suggestedTubeForDestination
} from './arzuaProParameters.js';
import { resolveMotorRemote } from './motorAccessories.js';

export { arzuaProEstablishedProjections };

export function calculateArzuaPro({ order, awning }) {
  const parameters = normalizeArzuaProParameters(order.parameters?.arzuaPro);
  const structureColor = awning.structureColor || order.structureColor;
  const lacado = resolveLacado(structureColor);
  const colorSuffix = lacado.suffix;
  const selectedTube = awning.tubeLoad || suggestedTubeForDestination(awning.destination, parameters);
  const tubeLoad = normalizeTubeLoad(selectedTube);
  const device = normalizeDevice(awning.device);
  const supportSystem = resolveArzuaSupport(awning, parameters);
  const motorPower = resolveArzuaMotorPower(awning, parameters);
  const armCount = supportSystem === 'GALICIA' ? 3 : 1;
  const diagnostics = [];
  const minimumLine = lookupMinimumLine(parameters.minimumLineByArm, awning.projection, device);
  const modified = Boolean(awning.reglasModificadas);
  const belowMinimum = awning.width < minimumLine;
  const overMaximum = supportSystem === 'ARZUA' && awning.width > parameters.standardMaxWidth;
  const fabricSelection = order.sameFabric !== false ? order.fabric : awning.fabric;
  const fabric = fabricSelection ? resolveFabric(fabricSelection) : null;
  const valanceFabricSelection = String(awning.valanceFabric || '').trim();
  const valanceFabric = valanceFabricSelection ? resolveFabric(valanceFabricSelection) : null;
  // El gate de incompletitud de calculateOrder solo cubre OF/modelo/frente/salida;
  // sin estos campos el cálculo asumiría MOTOR/EVO 80 o emitiría MANIVE...0C en silencio.
  const missingFields = [];
  if (!structureColor) missingFields.push('lacado');
  if (!fabricSelection) missingFields.push('tela');
  if (!device) missingFields.push('dispositivo válido');
  else if ((device === 'MAQ. INTERIOR' || device === 'MAQ. EXTERIOR') && !awning.crankHeight) missingFields.push('altura de manivela');
  if (!tubeLoad) missingFields.push('tubo de carga válido');
  const fabricWidth = round1(awning.width - lookupDiscount(parameters.fabricWidthDiscounts, tubeLoad, device, 11));
  const valance = Math.max(0, Number(awning.valanceHeight) || 0);
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
    width: fabricWidth,
    drop: valance + valanceExtraCm,
    units: awning.units,
    rollWidth: valanceFabric.width || 120,
    seamAllowanceCm: parameters.seamAllowanceCm,
    seamBaseCm: parameters.seamBaseCm
  }) : null;
  const length = round1(awning.width - lookupDiscount(parameters.widthDiscounts, tubeLoad, device, 9.8));
  const rollTubeLength = round1(awning.width - lookupDiscount(parameters.rollTubeDiscounts, tubeLoad, device, 9.8));
  const stockLength = chooseStockLength(length, parameters.stockLengths);
  const fabricInvalid = Boolean(fabricSelection && !fabric);
  const stockUnavailable = stockLength === null;
  const valid = missingFields.length === 0
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
      awning, lacado, colorSuffix, tubeLoad, device, supportSystem, motorPower, armCount,
      stockLength, fabricMl, fabric, valanceFabric, valanceFabricMl: valanceUsage?.ml || 0
    })
    : [];

  const despiece = valid
    ? buildDespiece({ awning, device, tubeLoad, lacado, colorSuffix, supportSystem, motorPower, armCount, stockLength, length, rollTubeLength })
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
  } else if (overMaximum && !modified) {
    diagnostics.push({
      level: 'error',
      awningId: awning.id,
      message: `ARZUA PRO no válido: frente ${awning.width} cm supera el máximo estándar de ${parameters.standardMaxWidth} cm con soporte ARZUA.`
    });
  } else if (overMaximum && modified) {
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
      valanceFabricMl: valanceUsage?.ml || 0,
      valanceFabricPanels: valanceUsage?.panels || 0,
      valanceDrop: valanceUsage ? valance + valanceExtraCm : 0,
      structureLength: length,
      rollTubeLength,
      stockLength,
      tubeLoad,
      supportSystem,
      motorPower: device === 'MOTOR' ? motorPower : '',
      armCount
    }
  };
}

// Referencias compartidas entre RPS (buildMaterials) y despiece (buildDespiece):
// mismo cálculo de código, una sola vez, para que ambos no puedan divergir por error.
const refSoporte = (supportSystem, colorSuffix) => supportSystem === 'GALICIA' ? `SOPARTGL${colorSuffix}` : `SOPAR350${colorSuffix}`;
const refTuboEnrolle = (stockLength) => `TURA80HG${stockLength}C`;
const refTuboCargaEvo = (colorSuffix, stockLength) => `PEVO80${colorSuffix}${stockLength}C`;
const refTuboCargaUnivers = (colorSuffix, stockLength) => `PUNI280${colorSuffix}${stockLength}C`;
const refTaponesUnivers = (colorSuffix) => `TAPOPLUN280${colorSuffix}`;
const refBrazosOnyx = (colorSuffix, projection) => `BONYX${colorSuffix}${projection}C`;
const refCasquilloMaquina = (device) => (device === 'MAQ. INTERIOR' ? 'CASMAQEJE5078MM' : 'CASMAQEJE6378MM');
const descCasquilloMaquina = (device) => (device === 'MAQ. INTERIOR' ? 'CASQUILLO MAQUINA EJE 50MM Ø78' : 'CASQUILLO EJE 63MM Ø78');
const refManivela = (lacado, crankHeight) => `MANIVE${crankSuffix(lacado)}${crankHeight}C`;

function buildMaterials({ awning, lacado, colorSuffix, tubeLoad, device, supportSystem, motorPower, armCount, stockLength, fabricMl, fabric, valanceFabric, valanceFabricMl }) {
  const units = Math.max(1, Number(awning.units) || 1);
  const materials = [
    { code: refSoporte(supportSystem, colorSuffix), quantity: units, description: supportSystem === 'GALICIA' ? 'JUEGO SOPORTE GALICIA' : 'JUEGO SOPORTE AROND' },
    { code: refTuboEnrolle(stockLength), quantity: 2 * units, description: 'TUBO DE ENROLLE P801' }
  ];

  if (tubeLoad === 'TUBO DE CARGA EVO 80') {
    materials.push(
      { code: refTuboCargaEvo(colorSuffix, stockLength), quantity: units, description: 'TUBO DE CARGA EVO 80' },
      { code: refBrazosOnyx(colorSuffix, awning.projection), quantity: armCount * units, description: supportSystem === 'GALICIA' ? 'BRAZO ONYX' : 'JUEGO DE BRAZOS ONYX' }
    );
  } else {
    materials.push(
      { code: refTuboCargaUnivers(colorSuffix, stockLength), quantity: units, description: 'TUBO DE CARGA UNIVERS 280' },
      { code: refTaponesUnivers(colorSuffix), quantity: units, description: 'KIT TAPONES UNIVERS 280' },
      { code: refBrazosOnyx(colorSuffix, awning.projection), quantity: armCount * units, description: supportSystem === 'GALICIA' ? 'BRAZO ONYX' : 'JUEGO DE BRAZOS ONYX' }
    );
  }

  if (device === 'MAQ. INTERIOR' || device === 'MAQ. EXTERIOR') {
    const crankHeight = Math.max(0, Number(awning.crankHeight) || 0);
    materials.push(
      { code: refCasquilloMaquina(device), quantity: units, description: descCasquilloMaquina(device) },
      { code: refManivela(lacado, crankHeight), quantity: units, description: `MANIVELA LUXE ${lacado.crank} ${crankHeight}` },
      { code: 'CASPLAS', quantity: units, description: 'CASQUILLO PLASTICO' }
    );
  }

  if (device === 'MOTOR') {
    const motorCode = motorPower === '70/17' ? 'SUNILUSIO70//17' : 'SUNILUSIO55//17';
    const remote = resolveMotorRemote(awning.sensor);
    materials.push(
      { code: 'RUEDAMOT78', quantity: units, description: 'RUEDA MOTRIZ Ø 78' },
      { code: motorCode, quantity: units, description: `MOTOR SOMFY SUNILUS ${motorPower} IO` },
      { code: 'CORONALT6078', quantity: units, description: 'CORONA LT 60 ADAPTADA Ø 78' },
      { code: 'SOPORTEUNVHIPRO', quantity: units, description: 'SOPORTE UNIVERSAL HIPRO' },
      { code: remote.code, quantity: units, description: remote.description }
    );
  }

  if (fabric) {
    materials.push({ code: fabric.code, quantity: fabricMl, description: fabric.description });
  }
  if (valanceFabric && valanceFabricMl > 0) {
    materials.push({ code: valanceFabric.code, quantity: valanceFabricMl, description: `${valanceFabric.description} · BAMBA` });
  }

  return materials;
}

function buildDespiece({ awning, device, tubeLoad, lacado, colorSuffix, supportSystem, motorPower, armCount, stockLength, length, rollTubeLength }) {
  const rows = [];
  const awningUnits = Math.max(1, Number(awning.units) || 1);
  const push = (num, name, reference, units, rowLength = null) => {
    rows.push({ num, name, reference, units, length: rowLength });
  };

  push(1, supportSystem === 'GALICIA' ? 'JUEGO SOPORTE GALICIA' : 'JUEGO SOPORTE AROND', refSoporte(supportSystem, colorSuffix), awningUnits);
  push(2, 'TUBO DE ENROLLE P801', refTuboEnrolle(stockLength), awningUnits, rollTubeLength);
  push(3, 'CASQUILLO PUNTA', 'CASPUNCE', awningUnits);

  if (device === 'MAQ. INTERIOR' || device === 'MAQ. EXTERIOR') {
    push(4, descCasquilloMaquina(device), refCasquilloMaquina(device), awningUnits);
  }

  if (tubeLoad === 'TUBO DE CARGA EVO 80') {
    push(5, 'TUBO DE CARGA EVO 80', refTuboCargaEvo(colorSuffix, stockLength), awningUnits, length);
    push(6, 'KIT TAPONES EVO 80', null, awningUnits);
  } else {
    push(5, 'TUBO DE CARGA UNIVERS 280', refTuboCargaUnivers(colorSuffix, stockLength), awningUnits, length);
    push(6, 'KIT TAPONES UNIVERS 280', refTaponesUnivers(colorSuffix), awningUnits);
  }

  push(7, supportSystem === 'GALICIA' ? 'BRAZO ONYX' : 'JUEGO DE BRAZOS ONYX', refBrazosOnyx(colorSuffix, awning.projection), armCount * awningUnits, awning.projection);
  push(8, 'JUEGO DE TERMINALES', null, awningUnits);

  if (device === 'MAQ. INTERIOR' || device === 'MAQ. EXTERIOR') {
    const crankHeight = Math.max(0, Number(awning.crankHeight) || 0);
    push(9, `MAQUINA ZNP 10 L170 ${lacado.crank}`, machineCode(lacado), awningUnits);
    push(10, `MANIVELA LUXE ${lacado.crank} ${crankHeight}`, refManivela(lacado, crankHeight), awningUnits, crankHeight);
    push(11, 'TACO NAYLON MAQUINA', 'CASPLAS', awningUnits);
    push(12, 'KIT DE TORNILLOS MAQUINA', null, awningUnits);
  }

  if (device === 'MOTOR') {
    const motorCode = motorPower === '70/17' ? 'SUNILUSIO70//17' : 'SUNILUSIO55//17';
    const remote = resolveMotorRemote(awning.sensor);
    push(9, 'RUEDA MOTRIZ Ø 78', 'RUEDAMOT78', awningUnits);
    push(10, `MOTOR SOMFY SUNILUS ${motorPower} IO`, motorCode, awningUnits);
    push(11, 'CORONA LT 60 ADAPTADA Ø 78', 'CORONALT6078', awningUnits);
    push(12, 'SOPORTE UNIVERSAL HIPRO', 'SOPORTEUNVHIPRO', awningUnits);
    push(21, remote.description, remote.code, awningUnits);
  }

  const wallEntry = behaviorData.options.tiposPared.find((item) => item.pared === awning.wallType);
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
  return `Toldo ARZUA PRO ${awning.width}x${awning.projection} · tela ${formatNumber(calc.fabricWidth)}x${formatNumber(calc.fabricDrop)} · paño ${formatNumber(calc.fabricMl)} ml${bambaText}`;
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

