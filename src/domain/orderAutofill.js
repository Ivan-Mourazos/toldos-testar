import { serializeFabricSelection } from './fabricCatalog.js';
import { getFieldVisibility, getModelBehavior } from './modelBehavior.js';
import { normalizeElectraMotor } from './electraParameters.js';

const fabricOnlyModels = new Set(['CAMBIO TELA', 'CAMBIO CORTINA', 'CAMBIO ANTICA', 'BAMBALINA', 'ENROLLABLE']);
const boxDeviceModels = new Set(['AMBAR BOX', 'AGATA BOX', 'MAXISCREEM', 'MONOBLOCK 350', 'PUNTO RECTO', 'ANTICA', 'CUARZO BOX', 'PERLA BOX', 'CORAL BOX']);
const electraArticleCodes = new Set(['ELECTR', 'ELECTRCCCG', 'ELECTRCCSG', 'ELECTRSCCG', 'ELECTRSCSG', 'ELITV']);
const blockedElectraArticleCodes = new Set(['ELECTRA', 'ELECTRAZIP', 'ELECTRS/COS/GU']);

export function buildOrderAutofill({ header = {}, lines = [], materials = [] } = {}) {
  const recovered = [];
  const warnings = [];
  const mappedLines = [];

  for (const line of lines) {
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
  const awnings = editableLines.map(({ line, model }, index) => {
    const awning = buildAwningSuggestion(line, model, index);
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
    return awning;
  });

  const selectedFabrics = awnings.map((awning) => awning.fabric).filter(Boolean);
  const uniqueFabrics = [...new Set(selectedFabrics)];
  const sameFabric = uniqueFabrics.length <= 1;
  const fabric = sameFabric ? uniqueFabrics[0] || '' : '';
  if (fabric) recovered.push('Tela común');
  if (uniqueFabrics.length > 1) recovered.push('Tela por elemento');

  if (mappedLines.length === 0) {
    warnings.push('RPS no contiene líneas que se puedan asociar con un modelo admitido.');
  }
  const unmappedManufactured = lines.filter((line) => clean(line.manufacturingOrder) && !inferOrderModel(line) && !isAuxiliaryLine(line));
  if (unmappedManufactured.length > 0) {
    warnings.push(`${unmappedManufactured.length} línea(s) con OF no corresponden a un toldo o cambio de tela reconocido y no se añadieron.`);
  }

  const pending = awnings.flatMap((awning, index) => describePendingAwning(awning, index));
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
    warnings: unique(warnings)
  };
}

function expandEditableLine(line, model) {
  const quantity = positiveNumber(line.quantity) || 1;
  const wholeUnits = Number.isInteger(quantity) ? quantity : 1;
  if (!fabricOnlyModels.has(model) || wholeUnits <= 1 || wholeUnits > 50) {
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
    line: { ...line, quantity: 1 }
  }));
}

function composeCustomerName(customerValue, businessValue) {
  const customer = clean(customerValue);
  const business = clean(businessValue);
  if (!customer) return business;
  if (!business || normalize(customer) === normalize(business)) return customer;
  return `${customer} - ${business}`;
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
  if (code.includes('HERA') || text.includes('MODELO HERA') || text.includes('ROLL-SYSTEM') || text.includes('ROLLSYS')) return 'HERA';
  if (code === 'ANTICA' || text.includes('MODELO ANTICA')) return 'ANTICA';
  if (code === 'SELENA' || text.includes('MODELO SELENA') || text.includes('TOLDO SELENA')) return 'SELENA';
  if (code === 'CORTINA' || code === 'CORTINAUNI' || description.startsWith('TOLDO CORTINA') || text.includes('MODELO CORTINA')) return 'CORTINA';
  if (code === 'ARZUA' || text.includes('MODELO ARZUA') || text.includes('ART 325')) return 'ARZUA PRO';
  return '';
}

export function extractOrderTextData(value, model = '') {
  const text = normalize(value);
  const dimensions = extractDimensions(text, model);
  const valanceHeight = model === 'BAMBALINA'
    ? dimensions.valanceHeight
    : matchNumber(text, /BAMBALINA\s+DE\s+(\d{1,3}(?:[.,]\d+)?)\s*CM/);
  const structureColor = inferStructureColor(text);
  const hasWindow = /\bCON\s+(?:UNA\s+)?VENTANA(?:S)?\b/.test(text) || /VENTANA(?:S)?\s+(?:EN|DE)\s+PVC/.test(text);
  const withoutWindow = /\bSIN\s+VENTANA(?:S)?\b/.test(text);
  const curtainLike = model.includes('CORTINA') || model === 'ELECTRA';
  const withoutValance = /\bSIN\s+BAMBALINA\b/.test(text);
  return {
    ...dimensions,
    valanceHeight: valanceHeight ?? null,
    hasValance: valanceHeight !== null ? valanceHeight > 0 : withoutValance ? false : null,
    valanceCurve: inferValanceCurve(text),
    structureColor,
    rotFabric: /ROTULACI[OÓ]N/.test(text) ? 'SI' : '',
    rotValance: /ROTULACI[OÓ]N\s+EN\s+(?:LA\s+)?BAMBALINA/.test(text) ? 'SI' : '',
    device: inferDevice(text, model),
    motorPower: model === 'ELECTRA' ? normalizeElectraMotor(text) : '',
    placement: /ENTRE\s+PAREDES/.test(text) ? 'ENTRE PAREDES' : /COLOCACI[OÓ]N\s+(?:A\s+)?TECHO|INSTALACI[OÓ]N\s+(?:A\s+)?TECHO/.test(text) ? 'TECHO' : '',
    armCount: matchNumber(text, /(?:CON|DE)\s+([234])\s+BRAZOS?\b/),
    tubeLoad: /EVO\s*80/.test(text) ? 'TUBO DE CARGA EVO 80' : /UNIVERS\s*280/.test(text) ? 'TUBO DE CARGA UNIVERS 280' : '',
    curtainHasWindow: curtainLike ? (hasWindow ? true : withoutWindow ? false : null) : null,
    curtainFinish: curtainLike ? inferCurtainFinish(text) : '',
    curtainWindowExit: curtainLike ? matchNumber(text, /SALIDA(?:\s+DE\s+LA)?\s+VENTANA\s*:?\s*(\d{1,4}(?:[.,]\d+)?)/) : null,
    curtainWindowCorner: curtainLike ? matchNumber(text, /(?:ESQ(?:UINA)?\.?)\s+(?:DE\s+LA\s+)?VENTANA\s*:?\s*(\d{1,4}(?:[.,]\d+)?)/) : null,
    curtainWindowFloorHeight: curtainLike ? matchNumber(text, /(?:H(?:\.|ALTURA)?\s*)?SUELO\s*-\s*VENT(?:ANA)?\.?\s*:?\s*(\d{1,4}(?:[.,]\d+)?)/) : null,
    curtainWindowHeight: curtainLike ? matchNumber(text, /H(?:\.|ALTURA)?\s*(?:DE\s+)?VENTANA\s*:?\s*(\d{1,4}(?:[.,]\d+)?)/) : null,
    submodel: inferSubmodel(text, model)
  };
}

function buildAwningSuggestion(line, model, index) {
  const detailText = [line.comment, line.manufacturingNotes].filter(Boolean).join('\n');
  const extracted = extractOrderTextData(detailText, model);
  const fabricOnly = fabricOnlyModels.has(model);
  const submodel = model === 'ELECTRA' ? inferElectraVariant(line.articleCode, detailText) : extracted.submodel;
  const electraSupport = model === 'ELECTRA'
    ? normalizeElectraSuggestionSupport(inferElectraSupport(detailText), submodel)
    : '';
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
    armCount: extracted.armCount,
    device: extracted.device || (model === 'SELENA' ? 'MAQ. INTERIOR' : ''),
    motorPower: extracted.motorPower,
    placement: extracted.placement,
    tubeLoad: extracted.tubeLoad,
    submodel,
    curtainHasWindow: extracted.curtainHasWindow,
    curtainFinish: extracted.curtainFinish,
    curtainSupport: model === 'CORTINA' ? 'UNIVERSAL 3 AGUJEROS' : '',
    electraSupport,
    curtainWindowExit: extracted.curtainWindowExit,
    curtainWindowCorner: extracted.curtainWindowCorner,
    curtainWindowFloorHeight: extracted.curtainWindowFloorHeight,
    curtainWindowHeight: extracted.curtainWindowHeight,
    fabric: '',
    valanceFabric: '',
    structureNotes: model === 'SELENA' ? 'BRAZOS STOR · PIEZAS STOR BARANDILLA' : '',
    fabricNotes: ''
  };
}

function extractDimensions(text, model) {
  const namedWidth = matchNumber(text, /(\d{2,4}(?:[.,]\d+)?)\s*(?:CM\s*)?(?:DE\s+)?FRENTE\b/);
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
    [awning.rotFabric, 'rotulación'], [awning.curtainHasWindow === true, 'ventana'], [awning.fabric, 'tela']
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
  if (visibility.device && !awning.device) pending.push('accionamiento');
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
  if (curtainLike && awning.curtainHasWindow === true) {
    if (!positiveNumber(awning.curtainWindowExit)) pending.push('salida ventana');
    if (!positiveNumber(awning.curtainWindowCorner)) pending.push('esquina ventana');
    if (!positiveNumber(awning.curtainWindowFloorHeight)) pending.push('suelo-ventana');
    if (!positiveNumber(awning.curtainWindowHeight)) pending.push('alto ventana');
  }
  if (curtainLike && !awning.curtainFinish) pending.push('confección inferior');
  if (awning.model === 'HERA') pending.push('lado respecto a ventana');
  if (!awning.fabric) pending.push('tela');
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
  if (/\bMOTOR(?:IZADO|IZADA)?\b/.test(text) || /ACCIONAMIENTO\s+(?:POR\s+)?MOTOR/.test(text)) return 'MOTOR';
  if (/MAQ(?:UINA)?\.?\s+EXTERIOR|MAQUINA\s+FUERA/.test(text)) return 'MAQ. EXTERIOR';
  if (/MAQ(?:UINA)?\.?\s+INTERIOR|MAQUINA\s+DENTRO/.test(text)) return 'MAQ. INTERIOR';
  if (!/ACCIONAMIENTO\s+MANUAL|ACCIONAD[OA]\s+MANUAL|\bMANUALMENTE\b/.test(text)) return '';
  if (model === 'SELENA') return 'MAQ. INTERIOR';
  if (model === 'ELECTRA') return '';
  return boxDeviceModels.has(model) ? 'MAQUINA' : '';
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
  if (/NEGRO\s+MATE\s+(?:9005|9405)/.test(structure)) return 'NEGRO MATE 9005-9405';
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
