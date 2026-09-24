import React from 'react';
import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { AwningColumn } from './AwningColumn';
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

function render(awning: Awning, readOnly: boolean) {
  return renderToStaticMarkup(React.createElement(AwningColumn, {
    awning, index: 0, parameters, sameFabric: true, orderFabric: SAMPLE_FABRIC, readOnly,
    onUpdate: noop, onDuplicate: noop, onRemove: noop
  }));
}

// Etiquetas de campo: <label><span>X</span>, grupos segmentados (aria-label) y selects (<span id=…>X</span>).
function labels(markup: string) {
  const found = new Set<string>();
  for (const match of markup.matchAll(/<label[^>]*>\s*<span[^>]*>([^<]+)<\/span>/g)) found.add(match[1]);
  for (const match of markup.matchAll(/role="group" aria-label="([^"]+)"/g)) found.add(match[1]);
  for (const match of markup.matchAll(/<span id="[^"]+">([^<]+)<\/span>/g)) found.add(match[1]);
  return found;
}

function samplesFor(model: string): Awning[] {
  const samples = sampleAwnings(model).map((item: { awning: unknown }) => item.awning as Awning);
  if (samples.length) return samples.slice(0, 3);
  return extraSamples[model] ? [{ ...extraSamples[model], id: 'x' } as Awning] : [];
}

describe('tarjeta de lectura: salen todos los datos (rediseño §5)', () => {
  const models = [...fullAwningModelNames, ...fabricOnlyModelNames];

  it('cubre los 22 modelos', () => {
    expect(models).toHaveLength(22);
    for (const model of models) expect(samplesFor(model).length, model).toBeGreaterThan(0);
  });

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
  }
});
