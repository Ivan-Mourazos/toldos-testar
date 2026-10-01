import { describe, expect, it } from 'vitest';
import {
  COORDINA_NOT_CONFIGURED,
  COORDINA_UNAVAILABLE,
  coordinaGroup,
  generateFilesDecision,
  generationBlock,
  isPendingGeneration,
  normalizeOf,
  NOT_GENERABLE_ERROR,
  PRODUCED_SAVE_ERROR,
  approvalReviewers,
  reviewAuthorship,
  reviewerName,
  saveReviewDecision,
  uniqueOfs,
  ELEMENT_NOUNS,
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

describe('aprobación leída de CoordinaOT', () => {
  const awnings = [{ letter: 'A', of: '0230194' }, { letter: 'B', of: ' 0230195 ' }];
  const status = (ofs) => ({ disponible: true, ofs });
  const ok = { estado: 'aprobada', nota: '' };

  it('uniqueOfs limpia espacios, vacíos y repetidas', () => {
    expect(uniqueOfs([...awnings, { letter: 'C', of: '0230194' }, { letter: 'D', of: '' }])).toEqual(['0230194', '0230195']);
  });

  it('coordinaGroup: aprobado solo con todas aprobadas', () => {
    expect(coordinaGroup(awnings, status({ '0230194': ok, '0230195': ok }))).toBe('aprobado');
    expect(coordinaGroup(awnings, status({ '0230194': ok, '0230195': { estado: 'en_revision' } }))).toBe('por_revisar');
    expect(coordinaGroup(awnings, status({ '0230194': ok }))).toBe('por_revisar');
  });

  it('coordinaGroup: una devuelta manda', () => {
    expect(coordinaGroup(awnings, status({ '0230194': ok, '0230195': { estado: 'devuelta', nota: 'x' } }))).toBe('devuelto');
  });

  it('coordinaGroup: sin CoordinaOT o sin toldos, por revisar', () => {
    expect(coordinaGroup(awnings, { disponible: false })).toBe('por_revisar');
    expect(coordinaGroup(awnings, undefined)).toBe('por_revisar');
    expect(coordinaGroup([], status({}))).toBe('por_revisar');
  });

  it('generationBlock: null con todo aprobado', () => {
    expect(generationBlock(awnings, status({ '0230194': ok, '0230195': ok }))).toBeNull();
  });

  it('generationBlock: falta la OF va primero, aunque CoordinaOT no responda', () => {
    expect(generationBlock([{ letter: 'A', of: '0230194' }, { letter: 'B', of: '' }], { disponible: false }))
      .toBe('Falta la OF en el toldo B.');
    expect(generationBlock([{ letter: 'A', of: '' }, { letter: 'C', of: ' ' }], status({})))
      .toBe('Falta la OF en los toldos A, C.');
  });

  it('generationBlock: CoordinaOT sin responder bloquea', () => {
    expect(generationBlock(awnings, { disponible: false })).toBe(COORDINA_UNAVAILABLE);
  });

  it('generationBlock: dice qué falta y cómo está', () => {
    expect(generationBlock(awnings, status({ '0230194': { estado: 'devuelta', nota: 'n' }, '0230195': { estado: 'en_revision' } })))
      .toBe('Sin aprobar en CoordinaOT: A (0230194) devuelta, B (0230195) en revisión.');
    expect(generationBlock(awnings, status({ '0230194': ok })))
      .toBe('Sin aprobar en CoordinaOT: B (0230195) sin revisión en CoordinaOT.');
  });

  it('normalizeOf recorta y rellena con ceros hasta 7 cifras solo si son todo dígitos', () => {
    expect(normalizeOf('230194')).toBe('0230194');
    expect(normalizeOf(' 230194 ')).toBe('0230194');
    expect(normalizeOf('0230194')).toBe('0230194');
    expect(normalizeOf('12345678')).toBe('12345678');
    expect(normalizeOf('231486.0')).toBe('231486.0');
    expect(normalizeOf('OF0230194')).toBe('OF0230194');
    expect(normalizeOf(undefined)).toBe('');
  });

  it('las reglas encuentran la OF sin el cero inicial', () => {
    const short = [{ letter: 'A', of: '230194' }];
    expect(uniqueOfs([...short, { letter: 'B', of: '0230194' }])).toEqual(['0230194']);
    expect(coordinaGroup(short, status({ '0230194': ok }))).toBe('aprobado');
    expect(generationBlock(short, status({ '0230194': ok }))).toBeNull();
    expect(approvalReviewers(short, status({ '0230194': { estado: 'aprobada', revisor: 'angel' } }), ['ÁNGEL'])).toBe('ÁNGEL');
  });

  it('generationBlock: una OF no válida se dice como tal', () => {
    const invalid = { estado: 'invalida', nota: '', actualizado: null, revisor: '' };
    expect(generationBlock([{ letter: 'A', of: '0230194' }, { letter: 'B', of: '0230194/1' }], status({ '0230194': ok, '0230194/1': invalid })))
      .toBe('Sin aprobar en CoordinaOT: B (0230194/1) OF no válida.');
    expect(coordinaGroup([{ letter: 'B', of: '0230194/1' }], status({ '0230194/1': invalid }))).toBe('por_revisar');
  });

  it('generationBlock: CoordinaOT sin configurar lo dice, en vez de pedir reintentar', () => {
    expect(generationBlock(awnings, { disponible: false, motivo: 'CoordinaOT no está configurado.' })).toBe(COORDINA_NOT_CONFIGURED);
    expect(COORDINA_NOT_CONFIGURED).toBe('La conexión con CoordinaOT no está configurada en el servidor.');
    expect(generationBlock(awnings, { disponible: false, motivo: 'CoordinaOT no responde.' })).toBe(COORDINA_UNAVAILABLE);
  });

  it('generationBlock: pedido sin toldos', () => {
    expect(generationBlock([], status({}))).toBe('El pedido no tiene toldos.');
  });

  it('generationBlock: en remolques habla de elementos', () => {
    expect(generationBlock([], { disponible: true, ofs: {} }, ELEMENT_NOUNS)).toBe('El pedido no tiene elementos.');
    expect(generationBlock([{ letter: 'A', of: '0230194' }, { letter: 'B', of: '' }], { disponible: false }, ELEMENT_NOUNS))
      .toBe('Falta la OF en el elemento B.');
    expect(generationBlock([{ letter: 'A', of: '' }, { letter: 'B', of: ' ' }], { disponible: false }, ELEMENT_NOUNS))
      .toBe('Falta la OF en los elementos A, B.');
    // Sin el tercer argumento, lo de siempre.
    expect(generationBlock([], { disponible: true, ofs: {} })).toBe('El pedido no tiene toldos.');
  });
});

describe('revisor desde CoordinaOT', () => {
  const tecnicos = ['ÁNGEL', 'JAIME', 'ALBERTO', 'ADRIÁN', 'TAMARA', 'IVÁN'];
  const awnings = [{ letter: 'A', of: '0230191' }, { letter: 'B', of: '0230192' }, { letter: 'C', of: '0230193' }];
  it('reviewerName traduce a la lista de técnicos sin tildes ni mayúsculas', () => {
    expect(reviewerName('angel', tecnicos)).toBe('ÁNGEL');
    expect(reviewerName('carron', tecnicos)).toBe('CARRON');
    expect(reviewerName('', tecnicos)).toBe('');
  });
  it('approvalReviewers: sin repetir y en orden de toldos', () => {
    const status = { disponible: true, ofs: { '0230191': { estado: 'aprobada', revisor: 'jaime' }, '0230192': { estado: 'aprobada', revisor: 'angel' }, '0230193': { estado: 'aprobada', revisor: 'jaime' } } };
    expect(approvalReviewers(awnings, status, tecnicos)).toBe('JAIME, ÁNGEL');
  });
  it('approvalReviewers: no aprobadas, vacíos y sin CoordinaOT fuera', () => {
    const status = { disponible: true, ofs: { '0230191': { estado: 'aprobada', revisor: 'carron' }, '0230192': { estado: 'en_revision', revisor: 'jaime' }, '0230193': { estado: 'aprobada', revisor: '' } } };
    expect(approvalReviewers(awnings, status, tecnicos)).toBe('CARRON');
    expect(approvalReviewers(awnings, { disponible: false }, tecnicos)).toBe('');
  });
});
