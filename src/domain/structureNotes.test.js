import { expect, test } from 'vitest';
import { structureNotes } from './structureNotes.js';
import { normalizeOrder } from './validation.js';

test('borrar progresivamente las notas de brazos cruzados no añade ni multiplica líneas', () => {
  const awning = { model: 'ARZUA PRO', armConfiguration: 'CROSSED', structureNotes: 'BRAZOS CRUZADOS · KIT EN SOPORTE IZQUIERDO\nNOTA DEL USUARIO' };
  while (awning.structureNotes.length) {
    const edited = awning.structureNotes.slice(0, -1);
    awning.structureNotes = edited;
    expect(structureNotes(awning)).toBe(edited);
  }
  expect(structureNotes(awning)).toBe('');
});

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
