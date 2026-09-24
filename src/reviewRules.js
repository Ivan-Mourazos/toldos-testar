// Reglas puras del flujo de pedidos, sin Node ni disco, para que las compartan el
// servidor (server.js, workflow.js) y la web (bandeja, contador, permiso de generar).
//
// Aprobar y devolver se hacen en CoordinaOT (diseño 24/09/2026, apartado 3): aquí todo
// pedido guardado y no generado está pendiente de generar, venga del estado que venga.
const pendingGenerationStatuses = new Set(['PENDING_REVIEW', 'CHANGES_REQUESTED', 'APPROVED']);

/** @param {string} status */
export function isPendingGeneration(status) {
  return pendingGenerationStatuses.has(status);
}

export const PRODUCED_SAVE_ERROR = 'Este pedido ya está generado. Cambia el número de pedido para guardarlo como uno nuevo.';
export const NOT_GENERABLE_ERROR = 'Este pedido no se puede generar desde la web.';

/**
 * Qué hace «Generar archivos» según el estado guardado: un pedido pendiente se genera,
 * uno ya generado no se reescribe (se devuelve tal cual) y cualquier otro estado se
 * rechaza con 409.
 * @param {string} status
 * @returns {{ action: 'generate' } | { action: 'unchanged' } | { action: 'refuse', statusCode: number, error: string }}
 */
export function generateFilesDecision(status) {
  if (status === 'PRODUCED') return { action: 'unchanged' };
  if (isPendingGeneration(status)) return { action: 'generate' };
  return { action: 'refuse', statusCode: 409, error: NOT_GENERABLE_ERROR };
}

/**
 * Qué hace «Guardar» cuando ya hay un pedido con ese número. Uno generado no se pisa:
 * sus archivos ya salieron y la bandeja lo guarda como histórico.
 * @param {{ status?: string } | null} existing
 * @param {boolean} confirmOverwrite
 * @returns {{ action: 'save' } | { action: 'confirm' } | { action: 'refuse', statusCode: number, error: string }}
 */
export function saveReviewDecision(existing, confirmOverwrite) {
  if (!existing) return { action: 'save' };
  if (existing.status === 'PRODUCED') return { action: 'refuse', statusCode: 409, error: PRODUCED_SAVE_ERROR };
  return confirmOverwrite ? { action: 'save' } : { action: 'confirm' };
}

/**
 * Autor y revisor al guardar (diseño 24/09/2026, apartado 2). El autor es quien guardó
 * el pedido la primera vez y no cambia aunque otro lo corrija después; si guarda otra
 * persona, esa queda como revisor. Si el autor vuelve a guardar, se conserva el revisor
 * anterior, pero nunca el propio autor como revisor.
 *
 * `savedBy` es quien pulsa Guardar («Soy: …»). Si no llega (llamadas antiguas a la API),
 * se deduce del técnico recibido cuando no coincide con el autor guardado.
 * @param {{ existingTechnician?: string, existingReviewer?: string, technician?: string, reviewer?: string, savedBy?: string }} input
 */
export function reviewAuthorship({ existingTechnician = '', existingReviewer = '', technician = '', reviewer = '', savedBy = '' }) {
  const incomingTechnician = clean(technician);
  const saver = clean(savedBy);
  // En un pedido nuevo manda quien guarda: un borrador antiguo o un «Corregir» con otro
  // número pueden traer un técnico que no es quien lo está guardando.
  const author = clean(existingTechnician) || saver || incomingTechnician;
  // Sin autor guardado (pedido nuevo o histórico sin autor) nadie ha corregido todavía.
  if (!clean(existingTechnician)) return { technician: author, reviewer: '' };
  const corrector = saver || (incomingTechnician !== author ? incomingTechnician : '');
  if (corrector && corrector !== author) return { technician: author, reviewer: corrector };
  const previous = clean(reviewer) || clean(existingReviewer);
  return { technician: author, reviewer: previous && previous !== author ? previous : '' };
}

function clean(value) {
  return String(value || '').trim();
}
