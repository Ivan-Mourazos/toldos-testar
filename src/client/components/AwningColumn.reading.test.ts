import React from 'react';
import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { AwningColumn } from './AwningColumn';
import { controlLabel } from './controlLabels';
import { SAMPLE_FABRIC, sampleAwnings } from '../../../scripts/lib/model-samples.mjs';
import {
  fabricOnlyModelNames, formOptions, fullAwningModelNames, getFabricDiagramOptions, getFieldVisibility, getModelBehavior
} from '../../domain/modelBehavior.js';
import { normalizeRuleParameters } from '../../domain/ruleParameters.js';
import { getMissingFields } from '../../domain/awningCompleteness.js';
import { fabricSelectionLabel } from '../../domain/fabricCatalog.js';
import { electraMotors } from '../../domain/electraParameters.js';
import type { Awning, RuleParameters } from '../types';

const parameters = normalizeRuleParameters() as RuleParameters;
const noop = () => undefined;

// Trabajos de tela sin muestra en model-samples: se rellenan aquí con los campos
// que exige getMissingFields para darlos por completos.
// device y valanceFabric no forman parte de getMissingFields para estos modelos, pero
// AwningColumn los lee sin comprobar antes (normalizeBoxDevice, valanceFabric.trim()):
// sin valor por defecto la muestra a medias (Partial<Awning>) hacía saltar un TypeError.
const extraSamples: Record<string, Partial<Awning>> = {
  'CAMBIO CORTINA': { of: '0000001', model: 'CAMBIO CORTINA', workType: 'FABRIC_ONLY', units: 1, width: 300, projection: 250, device: '', curtainHasWindow: false, curtainFinish: 'NORMAL' },
  'CAMBIO ANTICA': { of: '0000002', model: 'CAMBIO ANTICA', workType: 'FABRIC_ONLY', units: 1, width: 380, projection: 70, device: '', anticaVariant: 'TUBO 50X30 SIN BAMBA' },
  BAMBALINA: { of: '0000003', model: 'BAMBALINA', workType: 'FABRIC_ONLY', units: 1, width: 300, valanceHeight: 30, valanceCurve: 'RECTA', device: '', valanceFabric: '', remate: 'COMO TELA' }
};

// Texto libre de prueba para Obs. estructura: mismo formato que useDraft/AwningColumn
// (structureNotes es una cadena de texto plano, sin JSON ni separadores especiales para
// una sola línea).
const OBSERVATION_SAMPLE = 'OBS PRUEBA LECTURA';

// Telas de la muestra «máxima»: la de la tarjeta (sin tela común) y la de la bamba, las
// dos distintas de la del pedido para no confundirlas en el marcado.
const CARD_FABRIC = 'ACRILI2018P120|||120|||ACR AZUL';
const VALANCE_FABRIC = 'ACRILI2020P120|||120|||ACR VERDE';

function render(awning: Awning, readOnly: boolean, { sameFabric = true } = {}) {
  return renderToStaticMarkup(React.createElement(AwningColumn, {
    awning, index: 0, parameters, sameFabric, orderFabric: SAMPLE_FABRIC, readOnly,
    onUpdate: noop, onDuplicate: noop, onRemove: noop
  }));
}

// Etiquetas de campo: <label><span>X</span>, grupos segmentados (aria-label), selects
// (<span id=…>X</span>) y secciones con su propio aria-label (ObservationLines: "Obs.
// estructura" es <section aria-label="Obs. estructura"><header><span>Obs. estructura</span>…).
function labels(markup: string) {
  const found = new Set<string>();
  for (const match of markup.matchAll(/<label[^>]*>\s*<span[^>]*>([^<]+)<\/span>/g)) found.add(match[1]);
  for (const match of markup.matchAll(/role="group" aria-label="([^"]+)"/g)) found.add(match[1]);
  for (const match of markup.matchAll(/<span id="[^"]+">([^<]+)<\/span>/g)) found.add(match[1]);
  for (const match of markup.matchAll(/<section[^>]*aria-label="([^"]+)"/g)) found.add(match[1]);
  return found;
}

// renderToStaticMarkup escapa el texto y los atributos: el valor buscado también.
function html(text: string) {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#x27;');
}

function pattern(text: string) {
  return html(text).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Dónde se ve un valor en el marcado, según el control que lo pinta:
// - input: atributo value="…" de un <input> (NumberField, TextField, FabricCombobox);
// - select: el texto visible del SelectField, el <span> dentro de .select-control;
// - segmented: la opción ACTIVA de un SegmentedField (las demás también llevan su texto,
//   así que ver la etiqueta en cualquier sitio no basta);
// - text: el texto exacto de un nodo que no es un botón (así no cuentan las opciones
//   inactivas de un segmentado): el modelo en la cabecera o, al leer, las líneas de
//   observaciones, que dejan de ser <input> y pasan a texto.
type Place = 'input' | 'select' | 'segmented' | 'text';

function placesOf(markup: string, text: string): Set<Place> {
  const places = new Set<Place>();
  if (!text) return places;
  const escaped = pattern(text);
  if (new RegExp(`<input[^>]*\\svalue="${escaped}"`).test(markup)) places.add('input');
  if (new RegExp(`class="select-control[^"]*"[^>]*><span>${escaped}</span>`).test(markup)) places.add('select');
  if (new RegExp(`class="segmented-option active"[^>]*>${escaped}</button>`).test(markup)) places.add('segmented');
  if (new RegExp(`(?<!<button[^<]*)>${escaped}<`).test(markup)) places.add('text');
  return places;
}

// Dónde puede verse al leer lo que al editar estaba en cada sitio.
const readPlacesFor: Record<Place, Place[]> = {
  input: ['input', 'text'],
  select: ['select'],
  segmented: ['segmented'],
  text: ['text']
};

// Sitios de edición que cuentan: los controles, y el texto suelto solo si no está en ninguno.
function editPlaces(markup: string, candidates: string[]) {
  const places = new Set(candidates.flatMap((candidate) => [...placesOf(markup, candidate)]));
  if (places.size > 1) places.delete('text');
  return places;
}

// Cada control con su etiqueta y lo que enseña: el texto visible de los SelectField, la
// opción activa de los SegmentedField y el value de los <input> con etiqueta.
function controls(markup: string) {
  const found = new Map<string, string>();
  for (const match of markup.matchAll(/<span id="[^"]+">([^<]+)<\/span><button[^>]*class="select-control[^"]*"[^>]*><span>([^<]*)<\/span>/g)) {
    found.set(`select:${match[1]}`, match[2]);
  }
  for (const match of markup.matchAll(/role="group" aria-label="([^"]+)"[^>]*>(.*?)<\/div>/g)) {
    const active = /class="segmented-option active"[^>]*>([^<]*)<\/button>/.exec(match[2]);
    if (/class="segmented-option/.test(match[2])) found.set(`segmented:${match[1]}`, active ? active[1] : '');
  }
  for (const match of markup.matchAll(/<label[^>]*>\s*<span[^>]*>([^<]+)<\/span>\s*<input([^>]*)>/g)) {
    found.set(`input:${match[1]}`, /\svalue="([^"]*)"/.exec(match[2])?.[1] ?? '');
  }
  return found;
}

function samplesFor(model: string): Awning[] {
  const samples = sampleAwnings(model).map((item: { awning: unknown }) => item.awning as Awning);
  const base = samples.length ? samples.slice(0, 3) : (extraSamples[model] ? [{ ...extraSamples[model], id: 'x' } as Awning] : []);
  // Cada muestra lleva también su observación de estructura, para comprobar un valor de
  // texto libre y no solo medidas de listas cerradas (revisión de la tarea 4). workType
  // también se fuerza aquí: sampleAwnings() (pensado para el barrido del cálculo, que
  // deduce el tipo de trabajo del modelo) no lo rellena, y AwningColumn sí lo lee
  // directamente para decidir si hay Obs. estructura — sin esto, CAMBIO TELA y
  // ENROLLABLE (fabricOnly) se comportaban en la muestra como un toldo completo.
  const workType = fabricOnlyModelNames.includes(model) ? 'FABRIC_ONLY' : 'FULL_AWNING';
  return base.map((awning) => ({ ...awning, workType, structureNotes: OBSERVATION_SAMPLE }));
}

// Excepciones técnicas (candado abierto): todas con un valor propio y distinto, para
// que ninguna se dé por vista por coincidir con otra. Las que no son del modelo no se
// pintan al editar y la comparación las salta.
const overrideKeys = [
  'curtainFabricDeductionCm', 'curtainFabricWidthDiscountCm', 'curtainRollTubeDiscountCm', 'curtainLoadProfileDiscountCm',
  'boxMinimumLineCm', 'boxProfileDiscountCm', 'boxRollDiscountCm', 'boxFabricWidthDiscountCm', 'boxProtectorDiscountCm',
  'xacMinimumLineCm', 'xacFabricWidthDiscountCm', 'xacRollDiscountCm', 'xacLoadBarDiscountCm',
  'pointFabricWidthDiscountCm', 'pointRollDiscountCm', 'pointLoadBarDiscountCm', 'pointFabricDropMultiplier', 'pointFabricDropAllowanceCm',
  'dropArmVerticalAllowanceCm',
  'monoblockMinimumLineCm', 'monoblockMaximumLineCm', 'monoblockFabricWidthDiscountCm', 'monoblockRollDiscountCm',
  'monoblockLoadBarDiscountCm', 'monoblockSquareBarDiscountCm', 'monoblockFabricDropAllowanceCm',
  'maxisFabricWidthDiscountCm', 'maxisRollDiscountCm', 'maxisLoadBarDiscountCm', 'maxisBoxProfileDiscountCm', 'maxisFabricDropAllowanceCm',
  'electraFabricWidthDiscountCm', 'electraRollDiscountCm', 'electraLoadBarDiscountCm', 'electraBoxProfileDiscountCm',
  'electraGuideDiscountCm', 'electraFabricDropAllowanceCm',
  'ambarFabricWidthDiscountCm', 'ambarRollDiscountCm', 'ambarProfileDiscountCm', 'ambarFabricDropMultiplier', 'ambarFabricDropAllowanceCm',
  'agataMinimumLineCm', 'agataFabricWidthDiscountCm', 'agataRollDiscountCm', 'agataFabricDropAllowanceCm',
  'fabricJobWidthAdjustmentCm', 'fabricJobDropAllowanceCm', 'fabricJobValanceExtraCm'
] as const;
const overrideValues = Object.fromEntries(overrideKeys.map((key, position) => [key, 20.5 + position]));

// Motor de las excepciones de cada modelo (el último de su lista en AwningColumn).
const overrideMotor: Record<string, string> = {
  CORTINA: '55/17', 'PERLA BOX': '50/17', 'CORAL BOX': '50/17', 'CUARZO BOX': '50/17',
  'MONOBLOCK 350': '100/12', 'AGATA BOX': '100/17', 'ARZUA PRO': '70/17', GALICIA: '70/17',
  ELECTRA: electraMotors[electraMotors.length - 1].value
};

// Variante que enseña más campos (cofre y guía, cofre con varilla…).
const richSubmodel: Record<string, string> = {
  ELECTRA: 'CON COFRE / CON GUÍA', IRIS: 'IRIS 110 CON COFRE', HERA: 'HERA 56 MAQUINA',
  'AGATA BOX': 'SEMICLOSE', MAXISCREEM: 'COFRE CON VARILLA'
};

// Muestra «máxima» de cada modelo (revisión final del plan 2): con todos sus campos
// rellenos y con valores de sus listas de opciones (modelBehavior.js), excepción técnica
// activa, bamba con su tela y remate de otro color, tela propia de la tarjeta, ventana
// en los de tipo cortina y sensor donde lo hay. No tiene por qué poder calcularse.
function maxSample(model: string): Awning {
  const [base] = samplesFor(model);
  const behavior = getModelBehavior(model);
  const deviceOptions: string[] = getFieldVisibility({ model, device: '' }).deviceOptions || [];
  const device = behavior.tipo01 === null ? base.device : deviceOptions.includes('MOTOR') ? 'MOTOR' : deviceOptions[deviceOptions.length - 1];
  const fields = getFieldVisibility({ model, device });
  const last = <T,>(list: readonly T[]) => list[list.length - 1];
  const valance = fields.dimensions.includes('valanceHeight') || model === 'BAMBALINA';
  const curtain = model.includes('CORTINA') || model === 'ELECTRA';
  const diagram = last(getFabricDiagramOptions(model).map(({ value }) => value).filter(Boolean)) || '';
  const armOptions: number[] = behavior.armOptions || formOptions.brazos;

  const awning: Awning = {
    ...base,
    ...overrideValues,
    reglasModificadas: true,
    device,
    submodel: richSubmodel[model] ?? base.submodel,
    motorPower: overrideMotor[model] ?? base.motorPower ?? '',
    sensor: fields.sensor ? last(formOptions.sensores).sensor : base.sensor,
    machineSide: last(formOptions.localizacionesMaquina),
    placement: fields.placement ? last(formOptions.colocaciones) : base.placement,
    wallType: fields.wallType ? last(formOptions.tiposPared).pared : base.wallType,
    structureColor: fields.requiresStructureColor ? 'NEGRO (R-09011)' : base.structureColor,
    rotFabric: 'SI',
    fabric: CARD_FABRIC,
    fabricDiagramOverride: diagram as Awning['fabricDiagramOverride']
  };

  if (valance) {
    Object.assign(awning, {
      hasValance: true,
      valanceHeight: model === 'BAMBALINA' ? 40 : 25,
      valanceCurve: last(formOptions.curvasBamba),
      valanceFabric: model === 'BAMBALINA' ? '' : VALANCE_FABRIC,
      remate: 'OTRO',
      remateColor: 'ROJO PRUEBA',
      rotValance: 'SI'
    });
  }
  if (curtain || model === 'SELENA' || model === 'IRIS') {
    Object.assign(awning, {
      curtainHasWindow: true, curtainWindowExit: 111, curtainWindowCorner: 22, curtainWindowFloorHeight: 33, curtainWindowHeight: 44
    });
  }
  if (curtain) awning.curtainFinish = 'VELCRO';
  if (model === 'CORTINA' || model === 'SELENA') awning.curtainSupport = 'MAXISCREEM';
  if (model === 'CAMBIO CORTINA') awning.curtainTopFinish = 'REMACHADO';
  if (model === 'ELECTRA') awning.electraSupport = 'SOPORTE MAXISCREEM BOX';
  if (model === 'IRIS') {
    Object.assign(awning, {
      irisAssumeSquare: false, irisFrontBottom: 301, irisExitRight: 202, irisDiagonal1: 355, irisDiagonal2: 356,
      irisGuideType: 'COMPENSADORA', irisGuideFixing: 'TECHO', irisBoxShape: 'CUADRADO', irisWindBlock: true
    });
  }
  if (model === 'ARZUA PRO') Object.assign(awning, { armConfiguration: 'CROSSED', crossedAdditionalTerminals: true, armCount: 2, tubeLoad: 'TUBO DE CARGA EVO 80' });
  else if (behavior.tubeOptions?.length) awning.tubeLoad = last(behavior.tubeOptions);
  if (behavior.multipleBrazos) awning.armCount = last(armOptions);
  if (model === 'MONOBLOCK 350') awning.monoblockSupportCount = 5;
  if (model === 'AGATA BOX') awning.agataSupportCount = 6;
  if (model === 'AMBAR BOX' || model === 'PUNTO RECTO') awning.dropArmMode = 'VERTICAL_170';
  if (model === 'HERA') {
    Object.assign(awning, {
      heraJoin: 'HORIZONTAL', heraChainColor: 'NEGRO', heraTopFinish: 'VARILLA PLANA', heraBottomFinish: 'E.T. PLATANERO',
      heraInteriorFace: 'REVÉS', height: 260
    });
  }
  if (model === 'ANTICA') Object.assign(awning, { anticaVariant: 'ENTRADA TUBO Ø42 MM', anticaSupportHeight: 45 });
  if (model === 'CAMBIO ANTICA') Object.assign(awning, { anticaVariant: 'ENTRADA TUBO Ø33 MM', anticaMeasurementMode: 'FINISHED' });
  if (diagram === 'SUPLEMENTO') {
    Object.assign(awning, {
      supplementFastening: 'BROCHES', supplementFasteningPitchCm: 12.5, supplementWaveOverlapCm: 3.5,
      supplementBottomFinish: 'OTRO', supplementBottomFinishOther: 'CORDÓN PRUEBA',
      supplementJoinHemCm: 2.5, supplementSideHemCm: 3.25, supplementBottomHemCm: 4.75
    });
  }
  return awning;
}

// Claves que no son un dato del pedido, o que se transforman antes de mostrarse, así que
// comprobar su valor en bruto (o su controlLabel) no tiene sentido:
const excludedKeys = new Set([
  'id',                // identificador interno de React/estado, no aparece en la tarjeta
  'workType',           // metadato de las muestras de tela suelta (fabricOnly), no se enseña
  'reglasModificadas'   // conmuta la sección de excepciones; no se enseña como "true"/"false"
]);
// fabric y valanceFabric no se enseñan tal cual: FabricCombobox los pasa por
// fabricSelectionLabel(), que separa el código|||ancho|||color guardado en un texto legible
// ("código · descripción"), así que el valor en bruto no aparece nunca en el marcado. Se
// comprueban aparte, con su etiqueta.
const transformedKeys = new Set(['fabric', 'valanceFabric']);

// Todo valor de texto o número que se ve al editar se ve igual al leer: en el mismo tipo
// de control (valor de un input, texto de un select, opción activa de un segmentado).
function expectValuesKept(model: string, awning: Awning, sameFabric: boolean) {
  const edit = render(awning, false, { sameFabric });
  const read = render(awning, true, { sameFabric });
  for (const [key, raw] of Object.entries(awning)) {
    if (excludedKeys.has(key) || transformedKeys.has(key)) continue;
    if (typeof raw === 'boolean') continue; // se ve como elección segmentada Sí/No: lo cubre expectControlsKept
    if (raw === null || raw === undefined || raw === '' || raw === 0) continue;
    // irisFrontTop/irisExitLeft: model-samples.mjs los rellena en toda muestra igual a
    // width/projection (línea 100 de scripts/lib/model-samples.mjs), pero AwningColumn
    // solo los enseña en IRIS; en el resto de modelos no hay campo que los muestre.
    if ((key === 'irisFrontTop' || key === 'irisExitLeft') && awning.model !== 'IRIS') continue;
    const text = String(raw);
    const label = typeof raw === 'string' ? controlLabel(raw) : text;
    const shownWhenEditing = editPlaces(edit, [text, label]);
    // Si ni editando se ve (p. ej. sensor o altura de manivela con salida motor, o
    // colocación/tipo de pared en HERA, que no pide instalación), no es un dato que la
    // tarjeta enseñe para esta configuración: no reproducimos aquí la visibilidad de
    // cada campo (fields.* en modelBehavior.js) porque ya la aplica AwningColumn al
    // editar, y es lo que estamos comparando.
    if (!shownWhenEditing.size) continue;
    const shownWhenReading = new Set([...placesOf(read, text), ...placesOf(read, label)]);
    const lost = [...shownWhenEditing].filter((place) => !readPlacesFor[place].some((allowed) => shownWhenReading.has(allowed)));
    expect(lost, `${model} pierde "${key}"=${raw} al leer (se veía en ${[...shownWhenEditing].join(', ')})`).toEqual([]);
  }
}

// Cada select, segmentado e input con etiqueta enseña al leer lo mismo que al editar.
function expectControlsKept(model: string, awning: Awning, sameFabric: boolean) {
  const edit = controls(render(awning, false, { sameFabric }));
  const read = controls(render(awning, true, { sameFabric }));
  expect(edit.size, `${model}: la muestra no pinta ningún control`).toBeGreaterThan(0);
  for (const [control, shown] of edit) {
    expect(read.get(control), `${model} ${control} enseña "${shown}" al editar`).toBe(shown);
  }
}

// FabricCombobox en lectura: la etiqueta del campo y, justo después, la tela entera en texto.
function fabricShown(markup: string, label: string, fabric: string) {
  return new RegExp(`<span id="[^"]+">${pattern(label)}</span><p class="fabric-readonly-value">${pattern(fabricSelectionLabel(fabric))}</p>`).test(markup);
}

function expectFabricsShown(model: string, awning: Awning, sameFabric: boolean) {
  const read = render(awning, true, { sameFabric });
  if (!sameFabric && awning.fabric) {
    expect(fabricShown(read, 'Tela', awning.fabric), `${model} pierde la tela de la tarjeta`).toBe(true);
  }
  if (awning.valanceFabric && awning.model !== 'BAMBALINA') {
    expect(fabricShown(read, 'Tela bamba', awning.valanceFabric), `${model} pierde la tela de la bamba`).toBe(true);
  }
}

describe('tarjeta de lectura: salen todos los datos (rediseño §5)', () => {
  const models = [...fullAwningModelNames, ...fabricOnlyModelNames];

  // Recorre calculateOrder para cada modelo (sampleAwnings): con la suite completa en
  // paralelo, otros ficheros compiten por CPU y el valor por defecto (5 s) a veces no
  // llega, aunque en solitario tarda ~1 s.
  it('cubre los 22 modelos', () => {
    expect(models).toHaveLength(22);
    for (const model of models) expect(samplesFor(model).length, model).toBeGreaterThan(0);
  }, 20000);

  for (const model of models) {
    it(`${model}: cada campo que se ve al editar se ve al leer`, () => {
      for (const awning of samplesFor(model)) {
        const edit = labels(render(awning, false));
        const read = labels(render(awning, true));
        const lost = [...edit].filter((label) => !read.has(label));
        expect(lost, `${model} pierde ${lost.join(', ')}`).toEqual([]);
      }
    });

    it(`${model}: las medidas escritas aparecen en la lectura`, () => {
      for (const awning of samplesFor(model)) {
        const read = render(awning, true);
        for (const key of ['of', 'width', 'projection', 'valanceHeight', 'height'] as const) {
          const value = awning[key as keyof Awning];
          if (value === null || value === undefined || value === '' || value === 0) continue;
          // Con salidas establecidas la salida es un SelectField: se ve su texto, no un value.
          const places = placesOf(read, String(value));
          expect(places.has('input') || places.has('select'), `${model} ${key}=${value}`).toBe(true);
        }
      }
    });

    it(`${model}: la observación de estructura escrita aparece en la lectura`, () => {
      for (const awning of samplesFor(model)) {
        const read = render(awning, true);
        if (fabricOnlyModelNames.includes(model)) {
          // Los trabajos de tela suelta no llevan Obs. estructura (AwningColumn la oculta
          // con !fabricOnly): no hay nada que comprobar aquí.
          expect(read).not.toContain(OBSERVATION_SAMPLE);
          continue;
        }
        expect(read, `${model} pierde la observación de estructura`).toContain(OBSERVATION_SAMPLE);
      }
    });

    it(`${model}: todo valor de texto o número visible al editar sigue visible al leer`, () => {
      for (const awning of samplesFor(model)) {
        expectValuesKept(model, awning, true);
        expectControlsKept(model, awning, true);
        // El modelo sale en la cabecera, no en un control.
        expect(render(awning, true)).toContain(`class="awning-model-title">${html(controlLabel(awning.model))}`);
      }
    });

    describe(`${model}: muestra con todos los campos rellenos`, () => {
      const awning = maxSample(model);

      it('está completa (getMissingFields)', () => {
        expect(getMissingFields(awning, { fabric: SAMPLE_FABRIC, sameFabric: false })).toEqual([]);
      });

      it('cada campo que se ve al editar se ve al leer', () => {
        const edit = labels(render(awning, false, { sameFabric: false }));
        const read = labels(render(awning, true, { sameFabric: false }));
        const lost = [...edit].filter((label) => !read.has(label));
        expect(lost, `${model} pierde ${lost.join(', ')}`).toEqual([]);
      });

      it('cada valor y cada control enseñan lo mismo al leer', () => {
        expectValuesKept(model, awning, false);
        expectControlsKept(model, awning, false);
      });

      it('la tela de la tarjeta y la de la bamba salen con su etiqueta', () => {
        expectFabricsShown(model, awning, false);
      });

      it('la excepción técnica se ve al leer', () => {
        const read = render(awning, true, { sameFabric: false });
        expect(read).toContain('Excepción técnica activa para este toldo.');
      });
    });
  }
});
