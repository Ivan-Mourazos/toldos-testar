import { formatNumber } from './math.js';
import { resolveFabric } from './fabricCatalog.js';
import { getFieldVisibility, isFabricOnlyModel, isVerticalAwningModel, normalizeValanceFinish } from './modelBehavior.js';
import {
  normalizeAnticaMeasurementMode,
  normalizeAnticaVariant,
  resolveAnticaRoundEntry
} from './anticaRules.js';
import { normalizeDropArmMode, supportsVerticalDropArm } from './dropArmMode.js';

const legacyModelNames = {
  'AMBAR BOX': 'Microbox 300', 'AGATA BOX': 'Modul 400 / Modulbox', 'CUARZO BOX': 'Storbox 250',
  'PERLA BOX': 'Storbox S-300', 'CORAL BOX': 'Storbox 400', MAXISCREEM: 'Diana vertical',
  ELECTRA: 'Elit Vertical'
};

const preferredLabels = {
  MAQUINA: 'Máquina', 'MAQ. INTERIOR': 'Máq. interior', 'MAQ. EXTERIOR': 'Máq. exterior',
  'M.F.DER': 'M.F. derecha', 'M.F IZQ': 'M.F. izquierda', 'ENTRE PAREDES': 'Entre paredes',
  'DIRECTA A PARED': 'Directa a pared', TECHO: 'Techo', FRONTAL: 'Frontal', SI: 'Sí', NO: 'No',
  HERA: 'HERA',
  'ENTRADA TUBO Ø33 MM': 'Entrada tubo Ø33 mm',
  'ENTRADA TUBO Ø42 MM': 'Entrada tubo Ø42 mm',
  'HERA 43 MAQUINA': 'HERA 43 máquina',
  'HERA 56 MAQUINA': 'HERA 56 máquina',
  'HERA 56 MOTOR': 'HERA 56 motor',
  'PLANTEAMIENTO CAD MANUAL': 'Planteamiento CAD manual',
  'TOLDO-VELCRO': 'Toldo con velcro',
  'CAMBIO ENROLLABLE': 'Cambio de enrollable',
  SUPLEMENTO: 'Suplemento con broches',
  BASE: 'Salida base', FINISHED: 'Tela terminada',
  STANDARD: 'Estándar', VERTICAL_170: 'Bajada vertical 170°'
};

export function buildReviewSheetEntries(order, calculation) {
  return (order.awnings || []).map((awning, index) => {
    const fields = getFieldVisibility({ model: awning.model, device: awning.device });
    const ofBlock = findOfBlock(calculation, awning, index);
    const diagnostics = (calculation.diagnostics || []).filter((item) => !item.awningId || item.awningId === awning.id);
    const fabricOnly = isFabricOnlyModel(awning.model);
    const isHera = awning.model === 'HERA';
    const hasValance = awning.model === 'BAMBALINA' || Number(awning.valanceHeight) > 0;
    const standaloneValance = awning.model === 'BAMBALINA';
    const anticaVariant = normalizeAnticaVariant(awning.anticaVariant);
    const roundAnticaEntry = resolveAnticaRoundEntry(anticaVariant);
    const cambioAnticaRound = awning.model === 'CAMBIO ANTICA' && Boolean(roundAnticaEntry);
    const anticaMeasurementMode = cambioAnticaRound
      ? normalizeAnticaMeasurementMode(awning.anticaMeasurementMode, anticaVariant)
      : '';
    const finishedAnticaRound = cambioAnticaRound && anticaMeasurementMode === 'FINISHED';
    const valanceFinish = normalizeValanceFinish(awning, awning.remate || order.remate);
    const cardFields = [];

    addField(cardFields, 'OF', awning.of, true);
    if (fields.dimensions.includes('width')) addField(cardFields, cambioAnticaRound ? 'Frente tela terminada' : 'Frente', measure(awning.width), true);
    if (fields.dimensions.includes('projection')) {
      const projectionLabel = cambioAnticaRound
        ? finishedAnticaRound ? 'Caída tela terminada' : 'Salida base'
        : awning.model === 'ANTICA' && roundAnticaEntry ? 'Salida brazo' : isVerticalAwningModel(awning.model) ? 'Caída' : 'Salida';
      addField(cardFields, projectionLabel, measure(awning.projection), true);
    }
    // IRIS no tiene width/projection entre sus dimensions, así que las dos
    // tarjetas de arriba no se emiten. Sin esto, la hoja de revisión enseñaría
    // solo medidas ya descontadas y el revisor no tendría contra qué comparar.
    if (awning.model === 'IRIS') {
      addField(cardFields, 'Frente superior', measure(awning.irisFrontTop), true);
      addField(cardFields, 'Salida izquierda', measure(awning.irisExitLeft), true);
      if (!awning.irisAssumeSquare) {
        addField(cardFields, 'Frente inferior', measure(awning.irisFrontBottom), true);
        addField(cardFields, 'Salida derecha', measure(awning.irisExitRight), true);
        addField(cardFields, 'Diagonal 1', measure(awning.irisDiagonal1), true);
        addField(cardFields, 'Diagonal 2', measure(awning.irisDiagonal2), true);
      }
      if (ofBlock?.calculation) {
        addField(cardFields, 'Frente escuadrado', measure(ofBlock.calculation.width), true);
        addField(cardFields, 'Caída escuadrada', measure(ofBlock.calculation.projection), true);
      }
      addField(cardFields, 'Tipo de guía', awning.irisGuideType, true);
      addField(cardFields, 'Fijación de guía', awning.irisGuideFixing, true);
    }
    if (supportsVerticalDropArm(awning.model)) {
      addField(cardFields, 'Posición de trabajo', normalizeDropArmMode(awning.dropArmMode), true);
    }
    if (isHera) addField(cardFields, 'Variante', awning.submodel, true);
    if (!fabricOnly && ofBlock?.calculation) {
      addField(cardFields, 'Frente tela', measure(ofBlock.calculation.fabricWidth), true);
      addField(cardFields, isVerticalAwningModel(awning.model) ? 'Caída tela' : 'Salida tela', measure(ofBlock.calculation.fabricDrop), true);
      if (normalizeDropArmMode(ofBlock.calculation.dropArmMode) === 'VERTICAL_170') {
        addField(cardFields, 'Margen vertical', measure(ofBlock.calculation.dropArmVerticalAllowanceCm), true);
      }
    }
    if (isHera && ofBlock?.calculation) {
      const calc = ofBlock.calculation;
      if (Number(calc.fabricCutWidth) !== Number(calc.fabricWidth)) addField(cardFields, 'Frente de corte', measure(calc.fabricCutWidth), true);
      if (Number(calc.fabricCutDrop) !== Number(calc.fabricDrop)) addField(cardFields, 'Salida de corte', measure(calc.fabricCutDrop), true);
      if (awning.submodel !== 'HERA 56 MOTOR') addField(cardFields, 'Altura instalación', measure(awning.height), true);
      addField(cardFields, 'Tubo calculado', measure(calc.rollTubeLength), true);
      addField(cardFields, 'Cadena', calc.chainLength === null ? 'NO LLEVA' : measure(calc.chainLength), true);
      addField(cardFields, 'Empate cliente', awning.heraJoin, true);
      addField(cardFields, 'Arriba', awning.heraTopFinish || 'VARILLA PLANA', true);
      addField(cardFields, 'Abajo', awning.heraBottomFinish, true);
      addField(cardFields, 'Cara interior', awning.heraInteriorFace ? `${awning.heraInteriorFace} DENTRO` : '', true);
      addField(cardFields, 'Paños', calc.fabricPanels, true);
      addField(cardFields, 'Metros tela', `${formatNumber(calc.fabricMl)} ml`, true);
      addField(cardFields, 'Proceso', 'PLANTEAMIENTO CAD MANUAL', true);
      if (calc.specialTubeRequired) addField(cardFields, 'Aviso', 'TUBO ESPECIAL · CAMBIAR PRESUPUESTO', true);
    }
    if (fields.dimensions.includes('valanceHeight')) addField(cardFields, standaloneValance ? 'Alto' : 'Bamba (cm)', measure(awning.valanceHeight), true);
    if (hasValance) {
      addField(cardFields, 'Curva bamba', awning.valanceCurve, true);
      if (!standaloneValance) addField(cardFields, 'Tela bamba', fabricLabel(awning.valanceFabric) || 'IGUAL QUE LA TELA', true);
      addField(cardFields, 'Remate', valanceFinish, true);
      if (valanceFinish === 'OTRO') addField(cardFields, 'Color remate', awning.remateColor, true);
    }
    if (awning.fabricDiagramOverride) addField(cardFields, 'Dibujo de confección', awning.fabricDiagramOverride, true);
    if (fields.tubeLoad) addField(cardFields, 'Tubo de carga', awning.tubeLoad, true);
    if (fields.submodel && !isHera) addField(cardFields, 'Variante', awning.submodel, true);
    if (awning.model === 'ANTICA' || awning.model === 'CAMBIO ANTICA') addField(cardFields, 'Configuración Antica', awning.anticaVariant, true);
    if (cambioAnticaRound) addField(cardFields, 'Medida de caída', anticaMeasurementMode, true);
    if (awning.model === 'ANTICA' && (awning.anticaVariant === 'SOPORTE FIJO 3 AGUJEROS' || roundAnticaEntry)) {
      addField(cardFields, 'Altura soporte-brazo', measure(awning.anticaSupportHeight), true);
    }
    if (fields.requiresStructureColor) addField(cardFields, 'Lacado', awning.structureColor || order.structureColor || 'SIN INDICAR', true);
    if (fields.requiresRotFabric && !standaloneValance) addField(cardFields, 'Rotulación tela', yesNo(awning.rotFabric), true);
    if (hasValance) addField(cardFields, 'Rotulación bamba', yesNo(awning.rotValance), true);

    if (awning.model === 'ELECTRA') addField(cardFields, 'Soporte', awning.electraSupport, true);
    if (String(awning.model || '').includes('CORTINA') || awning.model === 'ELECTRA') {
      if (awning.model === 'CORTINA') addField(cardFields, 'Soporte', awning.curtainSupport || 'UNIVERSAL 3 AGUJEROS', true);
      const windowValue = awning.curtainHasWindow === null || awning.curtainHasWindow === undefined
        ? '' : awning.curtainHasWindow ? 'CON VENTANA' : 'SIN VENTANA';
      addField(cardFields, 'Ventana', windowValue, true);
      if (windowValue) addField(cardFields, 'Confección', awning.curtainFinish, true);
      if (awning.curtainHasWindow) {
        addField(cardFields, 'Salida ventana', measure(awning.curtainWindowExit), true);
        addField(cardFields, 'Esquina', measure(awning.curtainWindowCorner), true);
        addField(cardFields, 'Suelo-ventana', measure(awning.curtainWindowFloorHeight), true);
        addField(cardFields, 'H. ventana', measure(awning.curtainWindowHeight), true);
      }
    }
    if (awning.model === 'SELENA') addField(cardFields, 'Sistema', 'BRAZOS STOR · 2 UDS.', true);

    if (order.sameFabric === false) addField(cardFields, 'Tela', fabricLabel(awning.fabric), true);
    if (fields.device) addField(cardFields, 'Dispositivo', awning.device, true);
    if (awning.model === 'ELECTRA' && awning.device === 'MOTOR') addField(cardFields, 'Motor Electra', awning.motorPower, true);
    if (fields.sensor) addField(cardFields, 'Sensor', awning.sensor, true);
    if (fields.motorLocation) addField(cardFields, 'Posición motor', awning.machineSide, true);
    if (fields.machineLocation) addField(cardFields, 'Lado máquina', awning.machineSide, true);
    if (fields.crankHeight) addField(cardFields, 'Altura manivela', measure(awning.crankHeight), true);
    if (fields.placement) addField(cardFields, 'Colocación', awning.placement, true);
    if (fields.wallType) addField(cardFields, 'Tipo de pared', awning.wallType || 'NO INDICADA', true);
    if (fields.arms) addField(cardFields, 'Nº de brazos', awning.armCount, true);

    return {
      awning, letter: awningLetter(index), tag: `${fabricOnly ? 'TELA' : 'TOLDO'} ${awningLetter(index)}`,
      title: reviewDisplayLabel(awning.model || 'MODELO SIN INDICAR'),
      legacyTitle: legacyModelNames[String(awning.model || '').toUpperCase()] || '',
      status: reviewStatus(awning, ofBlock, diagnostics), fields: cardFields,
      notes: fabricOnly ? [] : [{ label: 'Obs. estructura', value: reviewDisplayValue(awning.structureNotes) }],
      modified: Boolean(awning.reglasModificadas)
    };
  });
}

function addField(fields, label, value, preserveBlank = false) {
  if (!preserveBlank && (value === '' || value === null || value === undefined)) return;
  fields.push({ label, value: reviewDisplayValue(value) });
}

function findOfBlock(calculation, awning, index) {
  return (calculation.ofs || []).find((item) => item.awningId && item.awningId === awning.id)
    || (calculation.ofs || []).find((item) => item.awningIndex === index) || calculation.ofs?.[index] || null;
}

function reviewStatus(awning, ofBlock, diagnostics) {
  if (!awning.model || !awning.of || !ofBlock) return 'INCOMPLETO';
  if (diagnostics.some((item) => item.level === 'error' || item.level === 'pending')) return 'REVISAR';
  return ofBlock.calculation?.valid ? 'VÁLIDO' : 'REVISAR';
}

export function reviewDisplayValue(value) {
  if (value === '' || value === null || value === undefined) return '—';
  return reviewDisplayLabel(String(value));
}

export function reviewDisplayLabel(value) {
  const text = String(value || '');
  if (preferredLabels[text]) return preferredLabels[text];
  if (!text || text !== text.toLocaleUpperCase('es-ES')) return text;
  const sentence = text.toLocaleLowerCase('es-ES');
  return `${sentence.charAt(0).toLocaleUpperCase('es-ES')}${sentence.slice(1)}`
    .replace(/\b(r|ral)-(?=\d)/g, (code) => code.toLocaleUpperCase('es-ES'));
}

function measure(input) {
  const number = Number(input);
  if (!Number.isFinite(number) || number === 0) return '';
  return formatNumber(number);
}

function yesNo(value) {
  if (String(value || '').toUpperCase() === 'SI') return 'Sí';
  if (String(value || '').toUpperCase() === 'NO') return 'No';
  return value;
}

export function fabricLabel(selection) {
  if (!selection) return '';
  const fabric = resolveFabric(selection);
  if (!fabric) return String(selection);
  return `${fabric.description || 'TELA'} · ${fabric.code}`;
}

function awningLetter(index) { return String.fromCharCode(65 + (index % 26)); }
