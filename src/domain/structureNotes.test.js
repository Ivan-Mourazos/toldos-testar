import { expect, test } from 'vitest';
import { structureNotes } from './structureNotes.js';
import { normalizeOrder } from './validation.js';

 test('los valores predeterminados se actualizan con el cálculo y conservan las notas antiguas', () => {
  const awning = { model: 'ELECTRA', structureNotes: 'REVISAR SOPORTES' };
  expect(structureNotes(awning, { guideLength: 246 })).toBe('MEDIDA GUÍAS 246\nREVISAR SOPORTES');
  expect(structureNotes(awning, { guideLength: 250 })).toBe('MEDIDA GUÍAS 250\nREVISAR SOPORTES');
  expect(structureNotes(awning, { guideLength: 0 })).toBe('REVISAR SOPORTES');
});

test.each(['', 'GUÍAS SEGÚN REVISIÓN'])('guardar y recargar conserva el texto editado: %s', (notes) => {
  const order = normalizeOrder(JSON.parse(JSON.stringify({ awnings: [{
    model: 'ELECTRA', structureNotes: notes, structureNotesEdited: true, notes: 'NOTA ANTIGUA'
  }] })));
  expect(structureNotes(order.awnings[0], { guideLength: 246 })).toBe(notes);
});
