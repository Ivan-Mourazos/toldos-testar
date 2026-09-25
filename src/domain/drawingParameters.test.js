import { describe, expect, it } from 'vitest';
import { normalizeDrawingParameters, resolveConfiguredDrawing } from './drawingParameters.js';
import { buildPlanteamientoPlan } from './planteamientoPdf.js';

const imageA = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=';
const imageB = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Wl2nVQAAAAASUVORK5CYII=';

describe('drawing parameters', () => {
  it('chooses the most specific matching drawing and ignores accents and case', () => {
    const drawings = { byModel: { ELECTRA: [
      { id: 'general', name: 'General', enabled: true, image: imageA, conditions: [] },
      { id: 'motor', name: 'Motor techo', enabled: true, image: imageB, conditions: [
        { field: 'device', value: 'motor' },
        { field: 'placement', value: 'TECHO' }
      ] }
    ] } };
    expect(resolveConfiguredDrawing({ model: 'electra', device: 'MOTOR', placement: 'techo' }, drawings)).toMatchObject({ image: imageB, name: 'Motor techo', source: 'parameters' });
    expect(resolveConfiguredDrawing({ model: 'ELECTRA', device: 'MAQ. INTERIOR' }, drawings)).toMatchObject({ image: imageA, name: 'General' });
  });

  it('understands boolean conditions written as SI and NO', () => {
    const drawings = { byModel: { CORTINA: [
      { id: 'window', name: 'Con ventana', enabled: true, image: imageA, conditions: [{ field: 'curtainHasWindow', value: 'sí' }] }
    ] } };
    expect(resolveConfiguredDrawing({ model: 'CORTINA', curtainHasWindow: true }, drawings)?.name).toBe('Con ventana');
    expect(resolveConfiguredDrawing({ model: 'CORTINA', curtainHasWindow: false }, drawings)).toBeNull();
  });

  it('keeps the manual order image above configured drawings', () => {
    const drawings = { byModel: { GALICIA: [
      { id: 'general', name: 'General', enabled: true, image: imageA, conditions: [] }
    ] } };
    expect(resolveConfiguredDrawing({ model: 'GALICIA', fabricImage: imageB }, drawings)).toEqual({ image: imageB, name: 'Imagen manual del pedido', source: 'manual' });
  });

  it('does not select an unfinished or disabled rule and drops corrupt images on load', () => {
    const drawings = { byModel: { XACOBEO: [
      { id: 'unfinished', name: 'Incompleto', enabled: true, image: imageA, conditions: [{ field: 'device', value: '' }] },
      { id: 'disabled', name: 'Desactivado', enabled: false, image: imageB, conditions: [] },
      { id: 'bad', name: 'Corrupto', enabled: true, image: 'not-an-image', conditions: [] }
    ] } };
    expect(resolveConfiguredDrawing({ model: 'XACOBEO', device: 'MOTOR' }, drawings)).toBeNull();
    expect(normalizeDrawingParameters(drawings).byModel.XACOBEO[2].image).toBeNull();
  });

  it('injects the selected drawing into the fabric PDF plan without changing the structure entry', () => {
    const awning = { id: 'awning-1', model: 'GALICIA', device: 'MOTOR', fabricImage: null };
    const order = {
      awnings: [awning],
      parameters: { drawings: { byModel: { GALICIA: [
        { id: 'motor', name: 'Motor', enabled: true, image: imageA, conditions: [{ field: 'device', value: 'MOTOR' }] }
      ] } } }
    };
    const calculation = { ofs: [{ awningId: 'awning-1', calculation: {} }] };
    const plan = buildPlanteamientoPlan(order, calculation);
    expect(plan.fabricPages[0].diagramAwning.fabricImage).toBe(imageA);
    expect(plan.structureEntries[0].awning).toBe(awning);
    expect(awning.fabricImage).toBeNull();
  });
});

describe('la biblioteca de dibujos llega al PDF', () => {
  it('normalizeOrder conserva los dibujos de Parámetros', async () => {
    const { normalizeOrder } = await import('./validation.js');
    const { readFileSync } = await import('node:fs');
    const image = 'data:image/png;base64,' + readFileSync(new URL('./assets/tgm-logo.png', import.meta.url)).toString('base64');
    const order = normalizeOrder({
      orderCode: 'T', awnings: [{ id: 'a', of: '0200001', model: 'BAMBALINA', units: 1, width: 300, valanceHeight: 25 }],
      parameters: { drawings: { byModel: { BAMBALINA: [{ id: 'g', name: 'General', enabled: true, image, conditions: [] }] } } }
    });
    expect(order.parameters.drawings.byModel.BAMBALINA).toHaveLength(1);
    expect(order.parameters.drawings.byModel.BAMBALINA[0].image).toBeTruthy();
  });
});
