import { formatNumber } from './math.js';

// Both the form and the PDF use these defaults until the user edits the notes.
export function structureNotes(awning, calculation) {
  const notes = String(awning.structureNotes || '');
  if (awning.model !== 'ELECTRA' || awning.structureNotesEdited === true) return notes;
  const guideLength = Number(calculation?.guideLength);
  const guideMeasure = guideLength > 0 ? `MEDIDA GUÍAS ${formatNumber(guideLength)}` : '';
  return [guideMeasure, notes].filter(Boolean).join('\n');
}
