import { describe, expect, it } from 'vitest';
import {
  automaticDrawingsForVariant, drawingConditionNeedsReview, drawingConditionOptions, drawingConditionShownValue,
  exampleAwning, replacementLines, webDrawingVariants
} from './drawingCatalog.js';
import { modelNames } from './modelBehavior.js';

const image = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=';
const fields = (model) => drawingConditionOptions(model).map((option) => option.field);

describe('condiciones con valores reales de cada modelo', () => {
  it('cada modelo ofrece solo sus campos, con los valores del formulario', () => {
    const cortina = drawingConditionOptions('CORTINA');
    expect(cortina.find((o) => o.field === 'device').values).toEqual(['MAQ. INTERIOR', 'MAQ. EXTERIOR', 'MOTOR']);
    expect(cortina.find((o) => o.field === 'curtainHasWindow')).toMatchObject({ label: 'Con ventana', values: ['SÍ', 'NO'] });
    expect(cortina.find((o) => o.field === 'curtainFinish').values).toEqual(['NORMAL', 'VELCRO', 'TUBO']);
    expect(fields('CORTINA')).not.toContain('irisGuideType');
    expect(fields('ENROLLABLE')).toEqual(['fabricDiagramOverride']);
    expect(drawingConditionOptions('IRIS').find((o) => o.field === 'device').values).toEqual(['MAQUINA', 'MOTOR']);
    expect(fields('ANTICA')).toContain('anticaVariant');
    expect(fields('BAMBALINA')).toEqual(['valanceCurve', 'fabricDiagramOverride']);
    expect(fields('ARZUA PRO')).toEqual(expect.arrayContaining(['device', 'placement', 'machineSide', 'tubeLoad', 'hasValance', 'valanceCurve', 'fabricDiagramOverride']));
  });

  it('marca para revisar lo que no casa con un valor real; lo de antes en minúsculas sí casa', () => {
    expect(drawingConditionNeedsReview('CORTINA', { field: 'device', value: 'motor' })).toBe(false);
    expect(drawingConditionNeedsReview('CORTINA', { field: 'curtainHasWindow', value: 'si' })).toBe(false);
    expect(drawingConditionNeedsReview('CORTINA', { field: 'device', value: 'MOTORR' })).toBe(true);
    expect(drawingConditionNeedsReview('CORTINA', { field: 'irisGuideType', value: 'PARED' })).toBe(true);
    expect(drawingConditionShownValue('CORTINA', { field: 'curtainHasWindow', value: 'si' })).toBe('SÍ');
    expect(drawingConditionShownValue('CORTINA', { field: 'device', value: 'MOTORR' })).toBe('MOTORR');
  });
});

describe('variantes del dibujo de la web', () => {
  it('Cortina por ventana y confección; Enrollable general y cambio; Hera sin dibujo de la web', () => {
    expect(webDrawingVariants('CORTINA').map((v) => v.id)).toEqual([
      'con-ventana', 'con-ventana-velcro', 'con-ventana-tubo', 'sin-ventana', 'sin-ventana-velcro', 'sin-ventana-tubo'
    ]);
    expect(webDrawingVariants('ENROLLABLE').map((v) => v.id)).toEqual(['general', 'cambio-enrollable']);
    expect(webDrawingVariants('ARZUA PRO').map((v) => v.label)).toEqual(['General', 'Toldo con velcro']);
    expect(webDrawingVariants('HERA')).toEqual([expect.objectContaining({ id: 'hera', webDrawing: false })]);
    expect(webDrawingVariants('ANTICA')).toHaveLength(6);
    expect(webDrawingVariants('SELENA').map((v) => v.id)).toEqual(['sin-ventana', 'con-ventana']);
  });

  it('todos los modelos tienen al menos una variante y su toldo de ejemplo es de ese modelo', () => {
    for (const model of modelNames) {
      const variants = webDrawingVariants(model);
      expect(variants.length, model).toBeGreaterThan(0);
      for (const variant of variants) expect(exampleAwning(variant)).toMatchObject({ model, width: 400, projection: 250 });
    }
  });
});

describe('qué dibujo del taller sustituye a cada variante', () => {
  const drawings = { byModel: { CORTINA: [
    { id: 'velcro-motor', name: 'Velcro con motor', enabled: true, image, conditions: [{ field: 'curtainFinish', value: 'VELCRO' }, { field: 'device', value: 'MOTOR' }] },
    { id: 'velcro', name: 'Velcro', enabled: true, image, conditions: [{ field: 'curtainFinish', value: 'VELCRO' }] },
    { id: 'mano', name: 'A mano', usage: 'manual', enabled: true, image, conditions: [] }
  ] } };
  const variant = (id) => webDrawingVariants('CORTINA').find((v) => v.id === id);

  it('dice cuál y, si depende de algo que la variante no fija, cuándo', () => {
    expect(automaticDrawingsForVariant(variant('sin-ventana-velcro'), drawings)).toEqual([
      { id: 'velcro-motor', name: 'Velcro con motor', pending: [{ field: 'device', value: 'MOTOR' }] },
      { id: 'velcro', name: 'Velcro', pending: [] }
    ]);
    expect(automaticDrawingsForVariant(variant('sin-ventana'), drawings)).toEqual([]);
  });

  it('en palabras', () => {
    expect(replacementLines(automaticDrawingsForVariant(variant('con-ventana-velcro'), drawings))).toEqual([
      '«Velcro con motor» lo sustituye cuando Accionamiento = MOTOR.',
      '«Velcro» lo sustituye siempre.'
    ]);
    expect(replacementLines([])).toEqual(['Sale el de la web.']);
    expect(replacementLines([{ id: 'x', name: 'X', pending: [{ field: 'device', value: 'MOTOR' }] }])).toEqual([
      '«X» lo sustituye cuando Accionamiento = MOTOR.', 'Si no, sale el de la web.'
    ]);
  });
});
