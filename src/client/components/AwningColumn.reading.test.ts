import React from 'react';
import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { AwningColumn } from './AwningColumn';
import { controlLabel } from './controlLabels';
import { SAMPLE_FABRIC, sampleAwnings } from '../../../scripts/lib/model-samples.mjs';
import { fabricOnlyModelNames, fullAwningModelNames } from '../../domain/modelBehavior.js';
import { normalizeRuleParameters } from '../../domain/ruleParameters.js';
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

function render(awning: Awning, readOnly: boolean) {
  return renderToStaticMarkup(React.createElement(AwningColumn, {
    awning, index: 0, parameters, sameFabric: true, orderFabric: SAMPLE_FABRIC, readOnly,
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

// Un valor se ve en el marcado de dos formas: como atributo value="…" (NumberField,
// TextField, SelectField —su botón también lo lleva—) o como texto exacto de un nodo
// (SegmentedField solo pinta la etiqueta de la opción activa, sin atributo). Se compara
// con las comillas/ángulos alrededor para no confundir un "2" suelto con un fragmento de
// un id o una clase generados por useId.
function appears(markup: string, text: string) {
  if (!text) return false;
  const escaped = text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`value="${escaped}"`).test(markup) || new RegExp(`>${escaped}<`).test(markup);
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

// Claves que no son un dato del pedido, o que se transforman antes de mostrarse, así que
// comprobar su valor en bruto (o su controlLabel) no tiene sentido:
const excludedKeys = new Set([
  'id',                // identificador interno de React/estado, no aparece en la tarjeta
  'workType',           // metadato de las muestras de tela suelta (fabricOnly), no se enseña
  'reglasModificadas'   // conmuta la sección de excepciones; no se enseña como "true"/"false"
]);
// fabric y valanceFabric no se enseñan tal cual: FabricCombobox los pasa por
// fabricSelectionLabel(), que separa el código|||ancho|||color guardado en un texto legible
// ("código · descripción"), así que el valor en bruto no aparece nunca en el marcado.
const transformedKeys = new Set(['fabric', 'valanceFabric']);

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
          expect(read, `${model} ${key}=${value}`).toContain(`value="${value}"`);
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
        const edit = render(awning, false);
        const read = render(awning, true);
        for (const [key, raw] of Object.entries(awning)) {
          if (excludedKeys.has(key) || transformedKeys.has(key)) continue;
          if (typeof raw === 'boolean') continue; // se ve como elección segmentada Sí/No, no como "true"/"false"
          if (raw === null || raw === undefined || raw === '' || raw === 0) continue;
          // irisFrontTop/irisExitLeft: model-samples.mjs los rellena en toda muestra igual a
          // width/projection (línea 100 de scripts/lib/model-samples.mjs), pero AwningColumn
          // solo los enseña en IRIS; en el resto de modelos no hay campo que los muestre.
          if ((key === 'irisFrontTop' || key === 'irisExitLeft') && awning.model !== 'IRIS') continue;
          const text = String(raw);
          const label = typeof raw === 'string' ? controlLabel(raw) : text;
          const shownWhenEditing = appears(edit, text) || appears(edit, label);
          // Si ni editando se ve (p. ej. sensor o altura de manivela con salida motor, o
          // colocación/tipo de pared en HERA, que no pide instalación), no es un dato que la
          // tarjeta enseñe para esta configuración: no reproducimos aquí la visibilidad de
          // cada campo (fields.* en modelBehavior.js) porque ya la aplica AwningColumn al
          // editar, y es lo que estamos comparando.
          if (!shownWhenEditing) continue;
          const shownWhenReading = appears(read, text) || appears(read, label);
          expect(shownWhenReading, `${model} pierde "${key}"=${raw} al leer`).toBe(true);
        }
      }
    });
  }
});
