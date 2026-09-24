import { describe, expect, it } from 'vitest';
import {
  generateFilesDecision,
  isPendingGeneration,
  NOT_GENERABLE_ERROR,
  PRODUCED_SAVE_ERROR,
  reviewAuthorship,
  saveReviewDecision
} from './reviewRules.js';

// server.js arranca Express al importarlo, así que las decisiones de las rutas
// POST /api/reviews y POST /api/reviews/:orderCode/generate-files se prueban aquí,
// como funciones puras que la ruta aplica tal cual.
describe('generar archivos sin APPROVED (ruta generate-files)', () => {
  it('acepta un pedido PENDING_REVIEW y los estados antiguos pendientes', () => {
    expect(generateFilesDecision('PENDING_REVIEW')).toEqual({ action: 'generate' });
    expect(generateFilesDecision('CHANGES_REQUESTED')).toEqual({ action: 'generate' });
    expect(generateFilesDecision('APPROVED')).toEqual({ action: 'generate' });
  });

  it('un pedido PRODUCED no se reescribe: se devuelve sin cambios', () => {
    expect(generateFilesDecision('PRODUCED')).toEqual({ action: 'unchanged' });
  });

  it('un estado desconocido se rechaza con 409', () => {
    expect(generateFilesDecision('ARCHIVED')).toEqual({ action: 'refuse', statusCode: 409, error: NOT_GENERABLE_ERROR });
    expect(generateFilesDecision(undefined)).toMatchObject({ action: 'refuse', statusCode: 409 });
  });

  it('la regla de pendiente es la misma que usa la web', () => {
    expect(isPendingGeneration('PENDING_REVIEW')).toBe(true);
    expect(isPendingGeneration('PRODUCED')).toBe(false);
    expect(isPendingGeneration('ARCHIVED')).toBe(false);
  });
});

describe('guardar sobre un pedido existente (ruta POST /api/reviews)', () => {
  it('un pedido nuevo se guarda sin preguntar', () => {
    expect(saveReviewDecision(null, false)).toEqual({ action: 'save' });
  });

  it('uno pendiente pide confirmación y, confirmado, se sustituye', () => {
    expect(saveReviewDecision({ status: 'PENDING_REVIEW' }, false)).toEqual({ action: 'confirm' });
    expect(saveReviewDecision({ status: 'APPROVED' }, true)).toEqual({ action: 'save' });
  });

  it('uno ya generado se rechaza con 409 aunque se confirme', () => {
    const expected = { action: 'refuse', statusCode: 409, error: PRODUCED_SAVE_ERROR };
    expect(saveReviewDecision({ status: 'PRODUCED' }, false)).toEqual(expected);
    expect(saveReviewDecision({ status: 'PRODUCED' }, true)).toEqual(expected);
    expect(PRODUCED_SAVE_ERROR).toBe('Este pedido ya está generado. Cambia el número de pedido para guardarlo como uno nuevo.');
  });
});

describe('reviewAuthorship — autor y revisor al guardar en el servidor', () => {
  it('pedido nuevo: el autor es quien lo guarda y no hay revisor', () => {
    expect(reviewAuthorship({ technician: 'IVÁN', reviewer: '', savedBy: 'IVÁN' })).toEqual({ technician: 'IVÁN', reviewer: '' });
  });

  it('pedido nuevo con un técnico heredado (borrador antiguo): manda quien guarda', () => {
    expect(reviewAuthorship({ technician: 'ÁNGEL', reviewer: 'JAIME', savedBy: 'IVÁN' })).toEqual({ technician: 'IVÁN', reviewer: '' });
  });

  it('el autor guardado no cambia aunque el navegador mande otro técnico', () => {
    expect(reviewAuthorship({ existingTechnician: 'IVÁN', technician: 'JAIME', reviewer: '', savedBy: 'JAIME' }))
      .toEqual({ technician: 'IVÁN', reviewer: 'JAIME' });
  });

  it('sin savedBy (llamadas antiguas), un técnico distinto del autor cuenta como quien corrige', () => {
    expect(reviewAuthorship({ existingTechnician: 'IVÁN', technician: 'JAIME' })).toEqual({ technician: 'IVÁN', reviewer: 'JAIME' });
  });

  it('si corrige otro sobre un pedido del autor, el revisor es quien guarda', () => {
    expect(reviewAuthorship({ existingTechnician: 'IVÁN', technician: 'IVÁN', reviewer: 'ÁNGEL', savedBy: 'JAIME' }))
      .toEqual({ technician: 'IVÁN', reviewer: 'JAIME' });
  });

  it('si el autor vuelve a guardar, se conserva el revisor anterior', () => {
    expect(reviewAuthorship({ existingTechnician: 'IVÁN', existingReviewer: 'JAIME', technician: 'IVÁN', reviewer: '', savedBy: 'IVÁN' }))
      .toEqual({ technician: 'IVÁN', reviewer: 'JAIME' });
  });

  it('el autor nunca queda como su propio revisor', () => {
    expect(reviewAuthorship({ existingTechnician: 'IVÁN', technician: 'IVÁN', reviewer: 'IVÁN', savedBy: 'IVÁN' }))
      .toEqual({ technician: 'IVÁN', reviewer: '' });
  });

  it('pedido histórico sin autor: toma como autor al técnico recibido', () => {
    expect(reviewAuthorship({ existingTechnician: '', technician: 'ÁNGEL', savedBy: 'ÁNGEL' })).toEqual({ technician: 'ÁNGEL', reviewer: '' });
  });
});
