import { describe, expect, it } from 'vitest';
import { chosenDrawingMissing, normalizeDrawingParameters, resolveAutomaticDrawing, resolveConfiguredDrawing, selectableDrawings } from './drawingParameters.js';
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
  it('normalizeOrder conserva el dibujo del taller elegido en la tarjeta', async () => {
    const { normalizeOrder } = await import('./validation.js');
    const order = normalizeOrder({ orderCode: 'T', awnings: [{ id: 'a', of: '0200001', model: 'ENROLLABLE', units: 1, width: 300, projection: 250, workshopDrawingId: ' plano ' }] });
    expect(order.awnings[0].workshopDrawingId).toBe('plano');
  });
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

describe('cómo se usa cada dibujo y el elegido en la tarjeta (02/10/2026)', () => {
  const library = { byModel: { ENROLLABLE: [
    { id: 'plano', name: 'Plano', usage: 'manual', enabled: true, image: imageA, conditions: [] },
    { id: 'general', name: 'General', enabled: true, image: imageB, conditions: [] }
  ] } };

  it('los dibujos guardados antes son automáticos; «Solo a mano» se conserva', () => {
    expect(normalizeDrawingParameters(library).byModel.ENROLLABLE.map((d) => d.usage)).toEqual(['manual', 'auto']);
  });

  it('«Solo a mano» nunca sale solo; el automático sí', () => {
    expect(resolveAutomaticDrawing({ model: 'ENROLLABLE' }, library)).toMatchObject({ id: 'general', name: 'General', source: 'parameters' });
    expect(resolveConfiguredDrawing({ model: 'ENROLLABLE' }, library)).toMatchObject({ id: 'general' });
  });

  it('precedencia: imagen del toldo > elegido a mano > automático > dibujo de la web', () => {
    const chosen = { model: 'ENROLLABLE', workshopDrawingId: 'plano' };
    expect(resolveConfiguredDrawing(chosen, library)).toMatchObject({ id: 'plano', image: imageA, source: 'chosen' });
    expect(resolveConfiguredDrawing({ ...chosen, fabricImage: imageB }, library)).toMatchObject({ source: 'manual' });
    expect(resolveConfiguredDrawing({ model: 'ENROLLABLE', workshopDrawingId: 'general' }, library)).toMatchObject({ id: 'general', source: 'chosen' });
    expect(resolveConfiguredDrawing({ model: 'BAMBALINA' }, library)).toBeNull();
  });

  it('un elegido que se quitó, se desactivó o no tiene imagen avisa y deja salir el automático', () => {
    const off = { byModel: { ENROLLABLE: [{ ...library.byModel.ENROLLABLE[0], enabled: false }, library.byModel.ENROLLABLE[1]] } };
    const awning = { model: 'ENROLLABLE', workshopDrawingId: 'plano' };
    expect(chosenDrawingMissing(awning, off)).toBe(true);
    expect(resolveConfiguredDrawing(awning, off)).toMatchObject({ id: 'general', source: 'parameters' });
    expect(chosenDrawingMissing({ model: 'ENROLLABLE', workshopDrawingId: 'otro' }, library)).toBe(true);
    expect(chosenDrawingMissing({ model: 'ENROLLABLE', workshopDrawingId: '' }, library)).toBe(false);
    expect(chosenDrawingMissing(awning, library)).toBe(false);
  });

  it('en la tarjeta se eligen los activos con imagen, a mano y automáticos', () => {
    const withBroken = { byModel: { ENROLLABLE: [...library.byModel.ENROLLABLE, { id: 'sin', name: 'Sin imagen', enabled: true, image: null, conditions: [] }] } };
    expect(selectableDrawings('enrollable', withBroken)).toEqual([
      { id: 'plano', name: 'Plano', usage: 'manual' },
      { id: 'general', name: 'General', usage: 'auto' }
    ]);
  });

  it('el elegido a mano llega al PDF', () => {
    const awning = { id: 'awning-1', model: 'ENROLLABLE', workshopDrawingId: 'plano', fabricImage: null };
    const plan = buildPlanteamientoPlan({ awnings: [awning], parameters: { drawings: library } }, { ofs: [{ awningId: 'awning-1', calculation: {} }] });
    expect(plan.fabricPages[0].diagramAwning.fabricImage).toBe(imageA);
  });
});
