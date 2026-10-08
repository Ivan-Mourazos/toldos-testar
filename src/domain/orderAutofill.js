import { serializeFabricSelection } from './fabricCatalog.js';
import { getFieldVisibility, getModelBehavior } from './modelBehavior.js';
import { normalizeElectraMotor } from './electraParameters.js';
import { irisAsksBoxShape, irisSubmodels } from './irisParameters.js';
import { irisMotorPowers, motorPowerFromCode } from './screenMotors.js';

const fabricOnlyModels = new Set(['CAMBIO TELA', 'CAMBIO CORTINA', 'CAMBIO ANTICA', 'BAMBALINA', 'ENROLLABLE']);
const electraArticleCodes = new Set(['ELECTR', 'ELECTRCCCG', 'ELECTRCCSG', 'ELECTRSCCG', 'ELECTRSCSG', 'ELITV']);
const blockedElectraArticleCodes = new Set(['ELECTRA', 'ELECTRAZIP', 'ELECTRS/COS/GU']);

// Patrones de accionamiento, compartidos entre inferDevice e
// isManualDeviceUnresolved para no duplicar la detección.
const motorDevicePattern = /\bMOTOR(?:ES|IZADO|IZADA)?\b|ACCIONAMIENTO\s+(?:POR\s+)?MOTOR/;
const exteriorDevicePattern = /MAQ(?:UINA)?\.?\s+EXTERIOR|MAQUINA\s+FUERA/;
const interiorDevicePattern = /MAQ(?:UINA)?\.?\s+INTERIOR|MAQUINA\s+DENTRO/;
// «APERTURA MANUAL» es como lo escriben 32 de 144 líneas de Iris.
const manualDevicePattern = /ACCIONAMIENTO\s+MANUAL|ACCIONAD[OA]\s+MANUAL|APERTURA\s+MANUAL|\bMANUALMENTE\b/;

export function buildOrderAutofill({ header = {}, lines = [], materials = [], purchasedMotors = [] } = {}) {
  const recovered = [];
  const warnings = [];
  const mappedLines = [];

  for (const line of lines) {
    if (isRepairLine(line)) {
      warnings.push(describeRepairWarning(line));
      continue;
    }
    const model = inferOrderModel(line);
    if (!model) continue;
    mappedLines.push({ line, model });
  }

  const orderCode = compactOrderCode(header.orderCode);
  const customer = composeCustomerName(header.customer, header.business);
  record(recovered, orderCode, 'Pedido');
  record(recovered, customer, 'Cliente');

  const materialsByOf = groupMaterialsByOf(materials);
  const editableLines = mappedLines.flatMap(({ line, model }) => expandEditableLine(line, model));
  for (const editableLine of editableLines) {
    if (editableLine.expandedFromQuantity) {
      warnings.push(`${editableLine.model}: RPS agrupa ${editableLine.expandedFromQuantity} unidades sin medidas; se han creado elementos individuales para completar cada estructura.`);
    }
  }
  const awnings = editableLines.map(({ line, model }, index) => {
    const awning = buildAwningSuggestion(line, model, index);
    // Si compras ya pidió el motor para la OF, ese es el motor (Iván, 07/10/2026, AR2604748).
    const purchasedMotor = awning.model === 'IRIS' && awning.device === 'MOTOR'
      ? purchasedMotors.filter((item) => cleanOf(item.of) === cleanOf(awning.of))
        .map((item) => motorPowerFromCode(item.code, irisMotorPowers)).find(Boolean)
      : '';
    if (purchasedMotor) awning.motorPower = purchasedMotor;
    const fabricRows = materialsByOf.get(cleanOf(awning.of)) || [];
    const fabricCandidates = rankFabricSelections(fabricRows);
    if (fabricCandidates[0]) awning.fabric = fabricCandidates[0].selection;
    const canAssignSeparateValance = !['BAMBALINA', 'ENROLLABLE'].includes(awning.model)
      && Number(awning.valanceHeight) > 0;
    if (fabricCandidates[1] && canAssignSeparateValance) {
      awning.valanceFabric = fabricCandidates[1].selection;
      const rankedByQuantity = fabricCandidates[0].hasQuantity
        && fabricCandidates[1].hasQuantity
        && fabricCandidates[0].quantity !== fabricCandidates[1].quantity;
      warnings.push(rankedByQuantity
        ? `OF ${awning.of}: RPS contiene más de una tela; se ha propuesto como principal la de mayor cantidad prevista y la otra para la bambalina.`
        : `OF ${awning.of}: RPS contiene más de una tela pero no permite distinguir con seguridad principal y bambalina; revisa la propuesta.`);
    } else if (fabricCandidates[1]) {
      warnings.push(`OF ${awning.of}: RPS contiene más de una tela, pero falta confirmar la bambalina; solo se ha propuesto la principal y debes revisar la otra referencia.`);
    }
    recovered.push(...describeRecoveredAwning(awning, index));
    if (purchasedMotor) recovered.push(`${letter(index)} · ${awning.model}: motor (pedido de compra)`);
    return awning;
  });

  const selectedFabrics = awnings.map((awning) => awning.fabric).filter(Boolean);
  const uniqueFabrics = [...new Set(selectedFabrics)];
  const sameFabric = uniqueFabrics.length <= 1;
  const fabric = sameFabric ? uniqueFabrics[0] || '' : '';
  if (fabric) recovered.push('Tela común');
  if (uniqueFabrics.length > 1) recovered.push('Tela por elemento');

  const nonRepairLines = lines.filter((line) => !isRepairLine(line));
  if (mappedLines.length === 0 && nonRepairLines.length > 0) {
    warnings.push('RPS no contiene líneas que se puedan asociar con un modelo admitido.');
  }
  const unmappedManufactured = nonRepairLines.filter((line) => clean(line.manufacturingOrder) && !inferOrderModel(line) && !isAuxiliaryLine(line));
  if (unmappedManufactured.length > 0) {
    warnings.push(`${unmappedManufactured.length} línea(s) con OF no corresponden a un toldo o cambio de tela reconocido y no se añadieron.`);
  }

  const pending = awnings.flatMap((awning, index) => describePendingAwning(awning, index));
  // Solo sirve para redactar el pendiente de accionamiento: no forma parte del pedido.
  awnings.forEach((awning) => { delete awning.deviceManualUnresolved; });
  const uniqueWarnings = unique(warnings);
  const lineNotes = new Map(awnings.map((awning) => [awning.id, awning._sourceText]));
  return {
    source: 'RPSNext',
    order: {
      orderCode,
      customer,
      orderDate: '',
      technician: '',
      reviewer: '',
      fabric,
      sameFabric,
      remate: '',
      remateColor: '',
      structureColor: '',
      rotTela: '',
      rotBamba: '',
      notes: '',
      awnings
    },
    recovered: unique(recovered),
    pending: unique(pending),
    warnings: uniqueWarnings,
    summary: summarizeAutofill({ awnings, warnings: uniqueWarnings, lineNotes })
  };
}

// --- Resumen final (Tarea 4): qué se ha rellenado, qué no y por qué (rediseño 4 §10) ---

// Nombres para el resumen, en singular y plural; el dominio no puede importar
// controlLabels.ts (es del cliente), así que se repite aquí en pequeño. Solo los
// nombres comunes (cortina, cambio de tela…) llevan plural en castellano; los
// nombres de producto se quedan como son: «2 Coral Box», «3 Monoblock 350».
const summaryModelNames = {
  CORTINA: ['cortina', 'cortinas'],
  'CAMBIO CORTINA': ['cambio de cortina', 'cambios de cortina'],
  'CAMBIO TELA': ['cambio de tela', 'cambios de tela'],
  'CAMBIO ANTICA': ['cambio de antica', 'cambios de antica'],
  BAMBALINA: ['bambalina', 'bambalinas'],
  ENROLLABLE: ['lona de puerta enrollable', 'lonas de puerta enrollable'],
  'AMBAR BOX': 'Ámbar Box',
  'AGATA BOX': 'Ágata Box',
  'PERLA BOX': 'Perla Box',
  'CORAL BOX': 'Coral Box',
  'CUARZO BOX': 'Cuarzo Box',
  MAXISCREEM: 'Diana vertical',
  IRIS: 'Iris',
  ELECTRA: 'Electra',
  SELENA: 'Selena',
  HERA: 'HERA',
  ANTICA: 'Antica',
  'PUNTO RECTO': 'Punto Recto',
  XACOBEO: 'Xacobeo',
  GALICIA: 'Galicia',
  'MONOBLOCK 350': 'Monoblock 350',
  'ARZUA PRO': 'Arzúa Pro'
};

const structureColorAccents = {
  MARRON: 'marrón',
  NEGRO: 'negro',
  BLANCO: 'blanco',
  GRIS: 'gris',
  VERDE: 'verde',
  BRONCE: 'bronce',
  BURDEOS: 'burdeos',
  MARFIL: 'marfil',
  ANTRACITA: 'antracita'
};

// Cubre el error real de RPS «DIFRERENTES» además de «DIFERENTES».
const differentMeasuresPattern = /\bDIF(?:E|RE)RENTES\s+MEDIDAS\b/;

export function summarizeAutofill({ awnings = [], warnings = [], lineNotes = new Map() } = {}) {
  const groups = new Map();
  for (const awning of awnings) {
    if (!groups.has(awning.model)) groups.set(awning.model, []);
    groups.get(awning.model).push(awning);
  }

  const summary = [...groups.entries()].map(([model, group]) => describeModelGroupSummary(model, group, lineNotes));

  const repairCount = warnings.filter((warning) => warning.startsWith('Reparación o reposición')).length;
  if (repairCount > 0) {
    summary.push(`${repairCount} ${repairCount === 1 ? 'reparación o reposición' : 'reparaciones o reposiciones'} sin toldo`);
  }
  return summary;
}

function describeModelGroupSummary(model, group, lineNotes) {
  const name = summaryModelName(model, group.length);
  const parts = [`${group.length} ${name}`];

  // El lacado solo sale si TODOS los elementos del grupo lo tienen y es el mismo.
  const colors = new Set(group.map((awning) => awning.structureColor || ''));
  if (colors.size === 1 && !colors.has('')) {
    const label = structureColorSummary([...colors][0]);
    if (label) parts.push(`lacado ${label}`);
  }

  const rotulacion = group.some((awning) => awning.rotFabric === 'SI') ? 'sí'
    : group.some((awning) => awning.rotFabric === 'NO') ? 'no'
      : 'no indicada';
  parts.push(`rotulación ${rotulacion}`);

  const mentionsDifferentMeasures = group.some((awning) => differentMeasuresPattern.test(normalize(lineNotes.get(awning.id))));
  if (mentionsDifferentMeasures) parts.push('medidas: RPS pone «diferentes medidas»');

  return parts.join(' · ');
}

function summaryModelName(model, count) {
  const name = summaryModelNames[model] || model;
  if (!Array.isArray(name)) return name;
  return count === 1 ? name[0] : name[1];
}

function structureColorSummary(value) {
  const match = /^([A-ZÁÉÍÓÚÑ ]+?)\s*(?:\(([^)]+)\))?$/.exec(String(value || '').trim());
  if (!match) return '';
  const name = match[1].trim();
  const code = match[2] || '';
  const label = structureColorAccents[name] || name.toLowerCase();
  const digitsMatch = /(\d{4,5})/.exec(code);
  const digits = digitsMatch ? (digitsMatch[1].length === 5 && digitsMatch[1].startsWith('0') ? digitsMatch[1].slice(1) : digitsMatch[1]) : '';
  return digits ? `${label} ${digits}` : label;
}

function expandEditableLine(line, model) {
  const quantity = positiveNumber(line.quantity) || 1;
  const wholeUnits = Number.isInteger(quantity) ? quantity : 1;
  if (wholeUnits <= 1 || wholeUnits > 50) {
    return [{ line, model }];
  }

  const detailText = [line.comment, line.manufacturingNotes].filter(Boolean).join('\n');
  const dimensions = extractOrderTextData(detailText, model);
  const needsIndividualMeasures = !positiveNumber(dimensions.width)
    || (model === 'BAMBALINA'
      ? !positiveNumber(dimensions.valanceHeight)
      : !positiveNumber(dimensions.projection));
  if (!needsIndividualMeasures) return [{ line, model }];

  return Array.from({ length: wholeUnits }, () => ({
    model,
    line: { ...line, quantity: 1 },
    expandedFromQuantity: wholeUnits
  }));
}

function composeCustomerName(customerValue, businessValue) {
  const customer = clean(customerValue);
  const business = clean(businessValue);
  if (!customer) return business;
  if (!business || normalize(customer) === normalize(business)) return customer;
  return `${customer} - ${business}`;
}

// Una línea es reparación o reposición cuando lo dice el artículo o la
// descripción (MANIPULACION, CORTE MATERIAL, REPARACION, REPOSICION) o cuando el
// comentario EMPIEZA por «(POR) REPARACION/REPOSICION». Una mención suelta en el
// comentario no basta: «TOLDO MODELO HERA…, REPOSICION DEL EXISTENTE» es un toldo
// nuevo. Nunca se descarta si el texto describe una confección o un suministro
// nuevo, un cambio de tela, o si el código de artículo es de toldo conocido.
const repairDescriptionPattern = /\b(REPOSICION|REPARACION|MANIPULACION|CORTE MATERIAL)\b/;
const repairCommentStartPattern = /^(POR )?(REPARACION|REPOSICION)\b/;
const newAwningPattern = /\b(CONFECCION|SUMINISTRO|FABRICACION)( E INSTALACION)? DE (TOLDOS?|CAMBIOS?)\b/;
const fabricChangePattern = /\bCAMBIOS? DE TELA\b/;

export function isRepairLine(line = {}) {
  const description = normalize(`${line.description || ''} ${line.articleDescription || ''}`);
  const comment = normalize(line.comment);
  const text = `${description} ${comment}`;
  const saysRepair = repairDescriptionPattern.test(description) || repairCommentStartPattern.test(comment);
  if (!saysRepair) return false;
  if (newAwningPattern.test(text) || fabricChangePattern.test(text)) return false;
  if (inferOrderModel({ articleCode: line.articleCode })) return false;
  return true;
}

function describeRepairWarning(line) {
  const of = cleanOf(line.manufacturingOrder);
  const source = clean(line.comment) || clean(line.description) || clean(line.articleDescription);
  const excerpt = source.length > 80 ? `${source.slice(0, 80)}…` : source;
  return `Reparación o reposición${of ? ` (OF ${of})` : ''}: no crea toldo.${excerpt ? ` «${excerpt}»` : ''}`;
}

export function inferOrderModel(line = {}) {
  const code = normalize(line.articleCode);
  const description = normalize(`${line.description || ''} ${line.articleDescription || ''}`);
  const comment = normalize(line.comment);
  const text = `${code} ${description} ${comment}`;

  if (code.includes('CAMTEL') || code === 'CAMBIOTELA' || text.includes('CAMBIO DE TELA')) {
    if (text.includes('CORTINA')) return 'CAMBIO CORTINA';
    if (text.includes('ANTICA')) return 'CAMBIO ANTICA';
    return 'CAMBIO TELA';
  }
  if (code === 'BAMBA' || description.includes('BAMBALINA NUEVA')) return 'BAMBALINA';
  if (code === 'PUERTAENR' || description.includes('LONA PARA PUERTA ENROLLABLE')) return 'ENROLLABLE';

  if (code === 'AMBARBOX' || text.includes('AMBAR BOX') || text.includes('AMBARBOX')) return 'AMBAR BOX';
  if (['AGATABOX', 'AGATASCLOSE', 'AGATASOPEN', 'ASTORGA'].includes(code) || text.includes('AGATA BOX')) return 'AGATA BOX';
  if (code === 'PERLABOX' || text.includes('PERLA BOX') || text.includes('STORBOX S-300') || text.includes('STORBOX S300')) return 'PERLA BOX';
  if (code === 'CORALBOX' || text.includes('CORAL BOX') || text.includes('STORBOX 400')) return 'CORAL BOX';
  if (code === 'CUARZOBOX' || text.includes('CUARZO BOX') || text.includes('STORBOX 250')) return 'CUARZO BOX';
  if (blockedElectraArticleCodes.has(code)) return '';
  if (electraArticleCodes.has(code) || (!code && (text.includes('MODELO ELECTRA') || text.includes('ELIT VERTICAL')))) return 'ELECTRA';
  if (['DIANAC/CO', 'DIANAS/CO'].includes(code) || text.includes('DIANA VERTICAL') || text.includes('MAXISCREEN') || text.includes('MAXISCREEM')) return 'MAXISCREEM';
  if (code === 'MONOB' || text.includes('MONOBLOC') || text.includes('MONOBLOCK')) return 'MONOBLOCK 350';
  if (code === 'PUNREC' || text.includes('PUNTO RECTO')) return 'PUNTO RECTO';
  if (code === 'XACOBEO' || text.includes('XACOBEO') || text.includes('ART 250')) return 'XACOBEO';
  if (code === 'GALICIA' || text.includes('MODELO GALICIA')) return 'GALICIA';
  if (code.startsWith('IRIS') || text.includes('MODELO IRIS')) return 'IRIS';
  if (code.includes('HERA') || text.includes('MODELO HERA') || text.includes('ROLL-SYSTEM') || text.includes('ROLLSYS')) return 'HERA';
  if (code === 'ANTICA' || text.includes('MODELO ANTICA')) return 'ANTICA';
  if (code === 'SELENA' || text.includes('MODELO SELENA') || text.includes('TOLDO SELENA')) return 'SELENA';
  if (code === 'CORTINA' || code === 'CORTINAUNI' || description.startsWith('TOLDO CORTINA') || text.includes('MODELO CORTINA')) return 'CORTINA';
  if (code === 'ARZUA' || code === 'BRACRU' || text.includes('MODELO ARZUA') || text.includes('ART 325')) return 'ARZUA PRO';
  return '';
}

export function extractOrderTextData(value, model = '') {
  const text = normalize(value);
  const dimensions = extractDimensions(text, model);
  const valanceHeight = model === 'BAMBALINA'
    ? dimensions.valanceHeight
    : matchNumber(text, /BAMBALINA\s+DE\s+(\d{1,3}(?:[.,]\d+)?)\s*CM/);
  const structureColor = inferStructureColor(text);
  const hasWindow = /\bCON\s+(?:UNA\s+)?VENTANA(?:S)?\b/.test(text) || /VENTANA(?:S)?\s+(?:EN|DE)\s+PVC/.test(text) || /\bINCLUYEN?\s+VENTANA/.test(text);
  const withoutWindow = /\bSIN\s+VENTANA(?:S)?\b/.test(text);
  const curtainLike = model.includes('CORTINA') || model === 'ELECTRA';
  const irisGlassCurtain = model === 'IRIS' && /CONFECCIONAD[OA]S?\s+EN\s+CRISTAL|TODO\s+(?:EN\s+)?CRISTAL|TEL[OÓ]N\s+DE\s+CRISTAL/.test(text);
  const withoutValance = /\bSIN\s+BAMBALINA\b/.test(text);
  const configuredCurtain = model.includes('CORTINA');
  const oldCurtainFinish = inferCurtainFinish(text);
  const lateralVelcro = /LATERALES?\s+(?:CON\s+)?VELCRO/.test(text);
  const tubeWindowHeight = configuredCurtain ? matchNumber(text, /(?:H(?:\.|ALTURA)?\s*)?TUBO(?:\s+DE\s+CARGA)?\s*-\s*VENT(?:ANA)?\.?\s*:?\s*(\d{1,4}(?:[.,]\d+)?)/) : null;
  return {
    ...dimensions,
    valanceHeight: valanceHeight ?? null,
    hasValance: valanceHeight !== null ? valanceHeight > 0 : withoutValance ? false : null,
    valanceCurve: inferValanceCurve(text),
    structureColor,
    rotFabric: inferFabricRotulation(text),
    rotValance: valanceWithoutRotulationPattern.test(text) ? 'NO'
      : /ROTULACI[OÓ]N\s+EN\s+(?:LA\s+)?BAMBALINA/.test(text) ? 'SI' : '',
    device: inferDevice(text, model),
    deviceManualUnresolved: isManualDeviceUnresolved(text, model),
    motorPower: model === 'ELECTRA' ? normalizeElectraMotor(text) : model === 'IRIS' ? inferIrisMotor(text) : '',
    placement: /ENTRE\s+PAREDES/.test(text) ? 'ENTRE PAREDES' : /COLOCACI[OÓ]N\s+(?:A\s+)?TECHO|INSTALACI[OÓ]N\s+(?:A\s+)?TECHO/.test(text) ? 'TECHO' : '',
    armCount: matchNumber(text, /(?:CON|DE)\s+([234])\s+BRAZOS?\b/),
    tubeLoad: /EVO\s*80/.test(text) ? 'TUBO DE CARGA EVO 80' : /UNIVERS\s*280/.test(text) ? 'TUBO DE CARGA UNIVERS 280' : '',
    curtainHasWindow: irisGlassCurtain ? false : curtainLike || model === 'IRIS' ? (hasWindow ? true : withoutWindow ? false : null) : null,
    irisGlassCurtain,
    curtainFinish: configuredCurtain ? lateralVelcro ? 'VELCRO' : oldCurtainFinish === 'TUBO' ? 'NORMAL' : oldCurtainFinish : curtainLike ? oldCurtainFinish : '',
    curtainBottomFinish: configuredCurtain ? /ENTRADA\s+(?:DE\s+)?TUBO|\bE[.\s]*T\.?(?=\s|[,;:]|$)/.test(text) || oldCurtainFinish === 'TUBO' ? 'ET' : 'TUBO DE CARGA' : '',
    curtainWindowReference: configuredCurtain ? tubeWindowHeight !== null ? 'TUBO DE CARGA' : 'SUELO' : '',
    curtainFabricAdjustment: configuredCurtain ? 'NINGUNO' : '',
    curtainFabricAdjustmentCm: configuredCurtain ? 0 : null,
    curtainWindowExit: curtainLike ? matchNumber(text, /SALIDA(?:\s+DE\s+LA)?\s+VENTANA\s*:?\s*(\d{1,4}(?:[.,]\d+)?)/) : null,
    curtainWindowCorner: curtainLike ? matchNumber(text, /(?:ESQ(?:UINA)?\.?)\s+(?:DE\s+LA\s+)?VENTANA\s*:?\s*(\d{1,4}(?:[.,]\d+)?)/) : null,
    curtainWindowFloorHeight: tubeWindowHeight ?? (curtainLike ? matchNumber(text, /(?:H(?:\.|ALTURA)?\s*)?SUELO\s*-\s*VENT(?:ANA)?\.?\s*:?\s*(\d{1,4}(?:[.,]\d+)?)/) : null),
    curtainWindowHeight: curtainLike ? matchNumber(text, /H(?:\.|ALTURA)?\s*(?:DE\s+)?VENTANA\s*:?\s*(\d{1,4}(?:[.,]\d+)?)/) : null,
    submodel: inferSubmodel(text, model)
  };
}

// «SIN ROTULACION EN BAMBALINA» habla de la bambalina, no de la tela: no cuenta
// para la rotulación de tela. Un «INCLUYE ROTULACION» explícito gana siempre.
const valanceWithoutRotulationPattern = /SIN\s+ROTULACI[OÓ]N\s+EN\s+(?:LA\s+)?BAMBALINA/;

function inferFabricRotulation(text) {
  const fabricText = text.replace(new RegExp(valanceWithoutRotulationPattern.source, 'g'), ' ');
  if (/\bINCLUYEN?\s+(?:LA\s+)?ROTULACI[OÓ]N/.test(fabricText)) return 'SI';
  if (/SIN\s+ROTULACI[OÓ]N/.test(fabricText)) return 'NO';
  if (/ROTULACI[OÓ]N/.test(fabricText)) return 'SI';
  return '';
}

function buildAwningSuggestion(line, model, index) {
  const detailText = [line.comment, line.manufacturingNotes].filter(Boolean).join('\n');
  const extracted = extractOrderTextData(detailText, model);
  const crossed = model === 'ARZUA PRO' && (normalize(line.articleCode) === 'BRACRU' || /BRAZOS?\s+CRUZADOS?/.test(normalize(`${line.description || ''} ${detailText}`)));
  const fabricOnly = fabricOnlyModels.has(model);
  const submodel = model === 'ELECTRA' ? inferElectraVariant(line.articleCode, detailText) : extracted.submodel;
  const electraSupport = model === 'ELECTRA'
    ? normalizeElectraSuggestionSupport(inferElectraSupport(detailText), submodel)
    : '';
  if (model === 'IRIS') return buildIrisSuggestion(line, index, detailText, extracted);
  return {
    id: `rps-${clean(line.lineId) || 'line'}-${index + 1}`,
    workType: fabricOnly ? 'FABRIC_ONLY' : 'FULL_AWNING',
    of: cleanOf(line.manufacturingOrder),
    model,
    units: positiveNumber(line.quantity) || 1,
    width: extracted.width,
    projection: extracted.projection,
    height: model === 'HERA' ? extracted.height : null,
    hasValance: extracted.hasValance,
    valanceHeight: extracted.valanceHeight,
    valanceCurve: extracted.valanceCurve,
    remate: extracted.valanceHeight > 0 ? 'COMO TELA' : '',
    structureColor: extracted.structureColor,
    rotFabric: extracted.rotFabric,
    rotValance: model === 'BAMBALINA' ? extracted.rotValance || extracted.rotFabric : extracted.rotValance,
    armCount: crossed ? extracted.armCount || 2 : extracted.armCount,
    armConfiguration: crossed ? 'CROSSED' : 'STANDARD',
    device: extracted.device || (model === 'SELENA' ? 'MAQ. INTERIOR' : ''),
    deviceManualUnresolved: extracted.deviceManualUnresolved,
    motorPower: extracted.motorPower,
    placement: extracted.placement,
    tubeLoad: extracted.tubeLoad,
    submodel,
    curtainHasWindow: extracted.curtainHasWindow,
    curtainFinish: extracted.curtainFinish,
    curtainBottomFinish: extracted.curtainBottomFinish,
    curtainWindowReference: extracted.curtainWindowReference,
    curtainFabricAdjustment: extracted.curtainFabricAdjustment,
    curtainFabricAdjustmentCm: extracted.curtainFabricAdjustmentCm,
    curtainSupport: model === 'CORTINA' ? 'UNIVERSAL 3 AGUJEROS' : '',
    electraSupport,
    curtainWindowExit: extracted.curtainWindowExit,
    curtainWindowCorner: extracted.curtainWindowCorner,
    curtainWindowFloorHeight: extracted.curtainWindowFloorHeight,
    curtainWindowHeight: extracted.curtainWindowHeight,
    fabric: '',
    valanceFabric: '',
    structureNotes: model === 'SELENA' ? 'BRAZOS STOR · PIEZAS STOR BARANDILLA' : '',
    fabricNotes: '',
    // Texto de la línea, para proponer telas del catálogo (Tarea 3). No se
    // guarda con el pedido: el servidor lo quita de la respuesta.
    _sourceText: detailText
  };
}

// El Iris se mide por el hueco (frente superior y salida izquierda) y se plantea escuadrado,
// como cuando el técnico lo mete a mano.
function buildIrisSuggestion(line, index, detailText, extracted) {
  const text = normalize(`${line.description || ''} ${line.articleDescription || ''} ${detailText}`);
  const submodel = inferIrisSubmodel(normalize(line.articleCode), text);
  return {
    id: `rps-${clean(line.lineId) || 'line'}-${index + 1}`,
    workType: 'FULL_AWNING',
    of: cleanOf(line.manufacturingOrder),
    model: 'IRIS',
    units: positiveNumber(line.quantity) || 1,
    width: null,
    projection: null,
    submodel,
    irisFrontTop: extracted.width,
    irisExitLeft: extracted.projection,
    irisAssumeSquare: true,
    irisGuideType: inferIrisGuideType(normalize(line.articleCode)),
    irisGuideFixing: '',
    irisBoxShape: irisAsksBoxShape({ submodel }) ? inferIrisBoxShape(text) : '',
    irisWindBlock: false,
    irisGlassCurtain: extracted.irisGlassCurtain,
    structureColor: irisStructureColor(extracted.structureColor, detailText),
    rotFabric: extracted.rotFabric,
    device: extracted.device,
    deviceManualUnresolved: extracted.deviceManualUnresolved,
    motorPower: extracted.device === 'MOTOR' ? extracted.motorPower : '',
    placement: extracted.placement === 'ENTRE PAREDES' ? 'ENTRE PAREDES' : '',
    curtainHasWindow: extracted.curtainHasWindow,
    fabric: '',
    valanceFabric: '',
    fabricNotes: '',
    _sourceText: detailText
  };
}

// BAT no tiene 9011: su negro brillo es el 9005, y los Iris en «negro» a secas gastaron NEGR y
// NE05 (Iván, 08/10/2026). Con «mate» se queda en el mate que diga el texto.
function irisStructureColor(color, detailText) {
  return color === 'NEGRO (R-09011)' && !/\bMATE\b/.test(normalize(detailText)) ? 'NEGRO 9005' : color;
}

function inferIrisSubmodel(code, text) {
  const fromCode = /^IRIS(110|130|150)([CS])/.exec(code);
  const series = fromCode?.[1] || /IRIS\s*(110|130|150)\b/.exec(text)?.[1] || '';
  if (!series) return '';
  const withBox = fromCode ? fromCode[2] === 'C' : !/SIN\s+COFRE/.test(text);
  const submodel = `IRIS ${series} ${withBox ? 'CON' : 'SIN'} COFRE`;
  return irisSubmodels.includes(submodel) ? submodel : '';
}

// COS/GU y COSG son «sin guía compensadora» y llevan la guía normal (taller, Q-I03); COCG es
// «con guía y ZIP» y sus OF gastaron la guía normal. C/CO y S/CO han llevado también
// compensadora o pequeña, y el texto no lo dice: la elige el técnico.
function inferIrisGuideType(code) {
  return /(?:COS\/GU|COSG|COCG)$/.test(code) ? 'ESTÁNDAR' : '';
}

function inferIrisBoxShape(text) {
  if (/CUADRAD[OA]/.test(text)) return 'CUADRADO';
  if (/REDOND[OA]/.test(text)) return 'REDONDO';
  return '';
}

// «SOMFY, SOLAR» sin par es el 15/12: el que compras pidió para el único Iris solar (OF 0232537).
function inferIrisMotor(text) {
  if (/\bSOLAR\b/.test(text)) return /\b10\s*\/\s*12\b/.test(text) ? 'SOLAR 10/12' : 'SOLAR 15/12';
  const sunilus = /SUNILUS[^0-9]{0,12}(\d{1,2})\s*\/\s*17/.exec(text)?.[1];
  return sunilus && irisMotorPowers.includes(`${sunilus}/17`) ? `${sunilus}/17` : '';
}

function extractDimensions(text, model) {
  // «253,5 CM DE FRENT EX 220 CM DE CAIDA» (AR2604748): FRENT sin la E también es el frente.
  const namedWidth = matchNumber(text, /(\d{2,4}(?:[.,]\d+)?)\s*(?:CM\s*)?(?:DE\s+)?FRENTE?\b/);
  const namedProjection = matchNumber(text, /(\d{2,4}(?:[.,]\d+)?)\s*(?:CM\s*)?(?:DE\s+)?(?:SALIDA|CA[IÍ]DA)\b/);
  const namedHeight = matchNumber(text, /(\d{2,4}(?:[.,]\d+)?)\s*(?:CM\s*)?(?:DE\s+)?ALTO\b/);
  const pair = /(?:MEDIDAS?\s+)(\d{2,4}(?:[.,]\d+)?)\s*(?:CM\s*)?(?:DE\s+FRENTE\s*)?[X×]\s*(\d{2,4}(?:[.,]\d+)?)\s*(?:CM)?/.exec(text);
  const width = namedWidth ?? decimal(pair?.[1]);
  const second = namedProjection ?? decimal(pair?.[2]);
  if (model === 'BAMBALINA') {
    return { width, projection: null, height: null, valanceHeight: second };
  }
  return {
    width,
    projection: second,
    height: namedHeight ?? (model === 'HERA' ? matchNumber(text, /ALTURA\s+(?:DE\s+)?(\d{2,4}(?:[.,]\d+)?)\s*CM/) : null),
    valanceHeight: null
  };
}

function inferOrderModelDescription(model) {
  return model === 'BAMBALINA' ? 'bambalina' : fabricOnlyModels.has(model) ? 'trabajo de tela' : 'toldo';
}

function describeRecoveredAwning(awning, index) {
  const prefix = `${letter(index)} · ${awning.model}`;
  const fields = [
    [awning.of, 'OF'], [awning.units, 'unidades'], [awning.width, 'frente'],
    [awning.projection, usesDropDimension(awning.model) ? 'caída' : 'salida'],
    [awning.height, 'alto'], [awning.valanceHeight, 'bambalina'], [awning.valanceCurve, 'curva'],
    [awning.structureColor, 'lacado'], [awning.device, 'accionamiento'], [awning.armCount, 'brazos'],
    [awning.electraSupport, 'soporte'], [awning.submodel, 'variante'],
    [awning.rotFabric, 'rotulación'], [awning.curtainHasWindow === true, 'ventana'], [awning.fabric, 'tela'],
    [awning.irisFrontTop, 'frente superior'], [awning.irisExitLeft, 'salida izquierda'], [awning.irisBoxShape, 'forma del cofre'],
    [awning.irisGlassCurtain === true, 'telón de cristal'], [awning.model === 'IRIS' ? awning.motorPower : '', 'motor']
  ];
  return [`${prefix} (${inferOrderModelDescription(awning.model)})`, ...fields.filter(([value]) => hasValue(value)).map(([, label]) => `${prefix}: ${label}`)];
}

function describePendingAwning(awning, index) {
  const fields = getModelBehavior(awning.model).dimensions || [];
  const visibility = getFieldVisibility(awning);
  const pending = [];
  if (!awning.of) pending.push('OF');
  if (fields.includes('width') && !positiveNumber(awning.width)) pending.push('frente');
  if (fields.includes('projection') && !positiveNumber(awning.projection)) pending.push(usesDropDimension(awning.model) ? 'caída' : 'salida');
  if (awning.model === 'HERA' && !positiveNumber(awning.height) && awning.submodel !== 'HERA 56 MOTOR') pending.push('alto');
  if (visibility.requiresStructureColor && !awning.structureColor) pending.push('lacado');
  if (visibility.requiresRotFabric && awning.model !== 'BAMBALINA' && !awning.rotFabric) pending.push('rotulación tela sí/no');
  if (fields.includes('valanceHeight') && awning.model !== 'BAMBALINA' && awning.hasValance === null) pending.push('bambalina sí/no');
  if ((awning.model === 'BAMBALINA' || awning.hasValance === true) && !awning.valanceCurve) pending.push('curva bambalina');
  if ((awning.model === 'BAMBALINA' || awning.hasValance === true) && !awning.rotValance) pending.push('rotulación bambalina sí/no');
  if (visibility.device && !awning.device) {
    pending.push(awning.deviceManualUnresolved
      ? 'accionamiento: RPS dice manual; elige máquina interior o exterior'
      : 'accionamiento');
  }
  if (visibility.tubeLoad && !awning.tubeLoad) pending.push('tubo de carga');
  if (visibility.submodel && !awning.submodel) pending.push('variante');
  if (awning.model === 'ELECTRA' && !awning.electraSupport) pending.push('tipo de soporte');
  if (awning.model === 'ELECTRA' && awning.device === 'MOTOR' && !awning.motorPower) pending.push('motor Electra');
  if (visibility.arms && !positiveNumber(awning.armCount)) pending.push('nº de brazos');
  if (visibility.sensor && !awning.sensor) pending.push('sensor');
  if ((visibility.motorLocation || visibility.machineLocation) && !awning.machineSide) pending.push(visibility.motorLocation ? 'posición motor' : 'lado máquina');
  if (visibility.crankHeight && !positiveNumber(awning.crankHeight)) pending.push('altura manivela');
  if (visibility.placement && !awning.placement) pending.push('colocación');
  const curtainLike = awning.model.includes('CORTINA') || awning.model === 'ELECTRA';
  if (curtainLike && awning.curtainHasWindow === null) pending.push('ventana sí/no');
  if (awning.model === 'IRIS') {
    if (!positiveNumber(awning.irisFrontTop)) pending.push('frente superior');
    if (!positiveNumber(awning.irisExitLeft)) pending.push('salida izquierda');
    if (!awning.irisGuideType) pending.push('tipo de guía');
    if (!awning.irisGuideFixing) pending.push('fijación de la guía');
    if (irisAsksBoxShape(awning) && !awning.irisBoxShape) pending.push('forma del cofre');
    if (!awning.irisGlassCurtain && awning.curtainHasWindow === null) pending.push('telón: lona, con ventana o cristal');
  }
  if (curtainLike && awning.curtainHasWindow === true) {
    if (!awning.model.includes('CORTINA') && !positiveNumber(awning.curtainWindowExit)) pending.push('salida ventana');
    if (!positiveNumber(awning.curtainWindowCorner)) pending.push('esquina ventana');
    if (!positiveNumber(awning.curtainWindowFloorHeight)) pending.push(awning.curtainWindowReference === 'TUBO DE CARGA' ? 'tubo-ventana' : 'suelo-ventana');
    if (!positiveNumber(awning.curtainWindowHeight)) pending.push('alto ventana');
  }
  if (curtainLike && !awning.curtainFinish) pending.push(awning.model.includes('CORTINA') ? 'laterales' : 'confección inferior');
  if (awning.model === 'HERA') pending.push('lado respecto a ventana');
  if (!awning.fabric && !awning.irisGlassCurtain) pending.push('tela');
  return pending.map((field) => `${letter(index)} · ${awning.model}: ${field}`);
}

function isAuxiliaryLine(line) {
  const code = normalize(line.articleCode);
  const description = normalize(line.description);
  return code === 'SCRAP'
    || code === 'INSTALACION'
    || code.startsWith('SOP')
    || code.startsWith('PIE')
    || description.startsWith('SOPORTE ')
    || description.startsWith('INSTALACION ');
}

function inferDevice(text, model) {
  if (motorDevicePattern.test(text)) return 'MOTOR';
  const deviceOptions = getFieldVisibility({ model, device: '' }).deviceOptions || [];
  // Los modelos de caja solo ofrecen «MAQUINA»: si RPS dice «máquina interior»
  // o «exterior», se queda en la única máquina que existe para el modelo.
  const machineOptions = deviceOptions.filter((option) => option !== 'MOTOR');
  const onlyGenericMachine = machineOptions.length === 1 && machineOptions[0] === 'MAQUINA';
  if (exteriorDevicePattern.test(text)) return onlyGenericMachine ? 'MAQUINA' : 'MAQ. EXTERIOR';
  if (interiorDevicePattern.test(text)) return onlyGenericMachine ? 'MAQUINA' : 'MAQ. INTERIOR';
  if (!manualDevicePattern.test(text)) return '';
  // RPS solo dice "accionamiento manual", sin decir interior/exterior. Si el
  // modelo tiene una sola máquina (caja o Selena), se puede deducir; si tiene
  // interior y exterior por separado, el técnico debe elegir.
  if (deviceOptions.includes('MAQUINA')) return 'MAQUINA';
  // Manual nunca es motor: cuenta solo la máquina (la Selena admite también motor).
  if (machineOptions.length === 1 && machineOptions[0] === 'MAQ. INTERIOR') return 'MAQ. INTERIOR';
  return '';
}

function isManualDeviceUnresolved(text, model) {
  if (motorDevicePattern.test(text) || exteriorDevicePattern.test(text) || interiorDevicePattern.test(text)) return false;
  if (!manualDevicePattern.test(text)) return false;
  return inferDevice(text, model) === '';
}

function usesDropDimension(model) {
  return String(model || '').includes('CORTINA') || model === 'SELENA' || model === 'ELECTRA';
}

function inferElectraVariant(articleCode, textValue) {
  const code = normalize(articleCode).replace(/\s+/g, '');
  const text = normalize(textValue);
  if (code === 'ELECTRCCCG') return 'CON COFRE / CON GUÍA';
  if (code === 'ELECTRCCSG') return 'CON COFRE / SIN GUÍA';
  if (code === 'ELECTRSCCG') return 'SIN COFRE / CON GUÍA';
  if (code === 'ELECTRSCSG') return 'SIN COFRE / SIN GUÍA';
  const withCofre = /\bCON\s+COFRE\b/.test(text);
  const withoutCofre = /\bSIN\s+COFRE\b/.test(text);
  const withGuide = /\bCON\s+GUIA\b/.test(text);
  const withoutGuide = /\bSIN\s+GUIA\b/.test(text);
  if (!(withCofre || withoutCofre) || !(withGuide || withoutGuide)) return '';
  return `${withCofre ? 'CON' : 'SIN'} COFRE / ${withGuide ? 'CON' : 'SIN'} GUÍA`;
}

function inferElectraSupport(value) {
  const text = normalize(value);
  if (/SOPORTE\s+MAXISCREEM\s+BOX|MAXISCREEM\s+BOX/.test(text)) return 'SOPORTE MAXISCREEM BOX';
  if (/SOPORTE\s+MAXISCR(?:EEM|EEN)|SOPORTES?\s+MAXISCR(?:EEM|EEN)/.test(text)) return 'SOPORTE MAXISCREEN';
  if (/SOPORTES?\s+ALMAGRO|SOPORTE\s+ALMAGRO/.test(text)) return 'SOPORTES ALMAGRO';
  if (/UNIVERSAL(?:\s+DE)?\s+3\s+AGUJEROS|SOPORTE\s+UNIVERSAL/.test(text)) return 'UNIVERSAL 3 AGUJEROS';
  if (/SOPORTE\s+ELIT(?:\s+VERTICAL)?/.test(text)) return 'SOPORTE ELIT VERTICAL';
  return '';
}

function normalizeElectraSuggestionSupport(support, variant) {
  const withCofre = String(variant || '').startsWith('CON COFRE');
  if (withCofre) return support === 'SOPORTE MAXISCREEM BOX' ? support : '';
  return support === 'SOPORTE MAXISCREEM BOX' ? '' : support;
}

function inferCurtainFinish(text) {
  const prefix = '(?:TERMINACION|CONFECCION)(?:\\s+INFERIOR)?\\s+(?:CON\\s+)?';
  if (new RegExp(`${prefix}VELCRO`).test(text)) return 'VELCRO';
  if (new RegExp(`${prefix}TUBO`).test(text)) return 'TUBO';
  if (new RegExp(`${prefix}NORMAL`).test(text)) return 'NORMAL';
  return '';
}

function inferSubmodel(text, model) {
  if (model === 'HERA') {
    const size = /HERA\s*43/.test(text) ? '43' : /HERA\s*56/.test(text) ? '56' : '';
    if (!size) return '';
    return `HERA ${size} ${/\bMOTOR/.test(text) ? 'MOTOR' : 'MAQUINA'}`;
  }
  if (model === 'AGATA BOX') {
    if (/SEMICLOSE|SEMI\s*CLOSE/.test(text)) return 'SEMICLOSE';
    if (/SEMIOPEN|SEMI\s*OPEN/.test(text)) return 'SEMIOPEN';
    if (/\bCOFRE\b/.test(text)) return 'COFRE';
    if (/\bOPEN\b/.test(text)) return 'OPEN';
  }
  return '';
}

function inferValanceCurve(text) {
  if (/TERMINACI[OÓ]N\s+(?:EN\s+)?(?:ONDA\s+)?EXTRA\s*SUAVE/.test(text)) return 'EXTRASUAVE';
  if (/TERMINACI[OÓ]N\s+(?:EN\s+)?ONDA\s+SUAVE/.test(text)) return 'SUAVE';
  if (/TERMINACI[OÓ]N\s+(?:EN\s+)?RECTA/.test(text)) return 'RECTA';
  if (/TERMINACI[OÓ]N\s+(?:EN\s+)?NORMAL/.test(text)) return 'NORMAL';
  return '';
}

function inferStructureColor(text) {
  const structure = /(?:ESTRUCTURA|ALUMINIO)[\s\S]{0,90}?(?:LACAD[OA]|COLOR)\s+(?:EN\s+COLOR\s+|COLOR\s+)?([A-Z0-9 -]{4,30})/.exec(text)?.[1] || '';
  if (/GRIS\s+7016\s+MATE/.test(structure)) return 'GRIS 7016 MATE TEXT.';
  // No confundir el acabado mate/texturado con el antracita GR16 comprado.
  if (/\bANTRACITA\b/.test(structure)) {
    const ral = structure.match(/\b\d{4}\b/)?.[0];
    return !/\bMATE\b|TEXT/.test(structure) && (!ral || ral === '7016')
      ? 'ANTRACITA (RAL 7016)' : 'LACADO ESPECIAL';
  }
  // Colores añadidos a la lista el 08/10/2026, antes que los genéricos de cada familia.
  if (/9003/.test(structure)) return 'BLANCO MATE 9003';
  if (/OSTRA|MARFIL[\s\S]*1013[\s\S]*TEXT/.test(structure)) return 'MARFIL BLANCO OSTRA 1013 TEXT.';
  if (/1013/.test(structure)) return 'MARFIL MATE 1013';
  if (/9006/.test(structure)) return 'PLATA 9006';
  if (/5004/.test(structure)) return 'AZUL 5004 MATE';
  if (/6009/.test(structure)) return 'VERDE 6009';
  if (/8017/.test(structure)) return 'MARRON 8017';
  if (/8007/.test(structure)) return 'MARRON 8007';
  if (/8002/.test(structure)) return 'MARRON 8002';
  if (/8019/.test(structure)) return /PARDO/.test(structure) ? 'PARDO 8019' : 'MARRON 8019';
  if (/MARR[OÓ]N[\s\S]*8014[\s\S]*TEXT|MARR[OÓ]N\s+TEXT/.test(structure)) return 'MARRON 8014 TEXT.';
  // También «NEGRO 9005-MATE», con el mate detrás (OF 0214722).
  if (/NEGRO\s+MATE\s+(?:9005|9405)|NEGRO\s+(?:9005|9405)\s*-?\s*MATE/.test(structure)) return 'NEGRO MATE 9005-9405';
  if (/NEGRO\s+MATE\s+9111/.test(structure)) return 'NEGRO MATE 9111';
  if (/\bBLANC[OA]\b/.test(structure)) return 'BLANCO';
  if (/\bNEGR[OA]\b/.test(structure)) return 'NEGRO (R-09011)';
  if (/\bMARFIL\b/.test(structure)) return 'MARFIL (R-01015)';
  if (/\bMARR[OÓ]N\b/.test(structure)) return 'MARRON (R-08014)';
  if (/\bBRONCE\b/.test(structure)) return 'BRONCE (R-00028)';
  if (/\bVERDE\b/.test(structure)) return 'VERDE (R-06005)';
  if (/\bBURDEOS\b/.test(structure)) return 'BURDEOS (R-03005)';
  if (/GRIS\s+7012/.test(structure)) return 'GRIS 7012';
  if (/GRIS\s+7016/.test(structure)) return 'GRIS 7016';
  return structure ? 'LACADO ESPECIAL' : '';
}

function groupMaterialsByOf(materials) {
  const grouped = new Map();
  for (const material of materials) {
    const key = cleanOf(material.of);
    if (!key) continue;
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key).push(material);
  }
  return grouped;
}

function rankFabricSelections(rows) {
  const grouped = new Map();
  rows.forEach((row, index) => {
    const selection = serializeFabricSelection({
      code: clean(row.code),
      description: clean(row.description) || clean(row.code),
      width: positiveNumber(row.width) || inferRollWidth(row.code, row.unitCode),
      subfamily: clean(row.subfamily)
    });
    if (!selection) return;
    const quantity = positiveNumber(row.quantity);
    const current = grouped.get(selection) || { selection, quantity: 0, hasQuantity: false, index };
    if (quantity !== null) {
      current.quantity += quantity;
      current.hasQuantity = true;
    }
    grouped.set(selection, current);
  });

  const candidates = [...grouped.values()];
  const quantitiesComparable = candidates.length > 1 && candidates.every((item) => item.hasQuantity);
  return candidates.sort((left, right) => quantitiesComparable
    ? right.quantity - left.quantity || left.index - right.index
    : left.index - right.index);
}

function inferRollWidth(code, unitCode) {
  const codeMatch = /P(\d{2,3})$/i.exec(clean(code));
  const unitMatch = /ML(\d{2,3})/i.exec(clean(unitCode));
  return Number(codeMatch?.[1] || unitMatch?.[1]) || 120;
}

function record(target, value, label) {
  if (hasValue(value)) target.push(label);
}

function hasValue(value) {
  return value !== '' && value !== null && value !== undefined && value !== false;
}

function matchNumber(text, expression) {
  return decimal(expression.exec(text)?.[1]);
}

function decimal(value) {
  if (value === undefined || value === null || value === '') return null;
  const number = Number(String(value).replace(',', '.'));
  return Number.isFinite(number) ? number : null;
}

function positiveNumber(value) {
  const number = decimal(value);
  return number !== null && number > 0 ? number : null;
}

function clean(value) {
  return String(value ?? '').trim();
}

function cleanOf(value) {
  return clean(value).replace(/\.0+$/, '');
}

function compactOrderCode(value) {
  return clean(value).toUpperCase().replace(/[^A-Z0-9]/g, '');
}

function normalize(value) {
  return clean(value).toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, ' ');
}

function unique(values) {
  return [...new Set(values.filter(Boolean))];
}

function letter(index) {
  return String.fromCharCode(65 + index);
}
