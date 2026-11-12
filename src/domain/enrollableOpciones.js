/**
 * Trabajo de tela ENROLLABLE (Iván, 12/11/2026): se elige si es un enrollable nuevo
 * o un cambio de tela, y si delante lleva pletina o varilla. Las dos cosas cambian
 * solo el dibujo; el corte y la reserva son los mismos.
 *
 * Un campo vacío ('') es que falta elegirlo. Un campo que no existe es un pedido
 * anterior a esta opción: entonces era nuevo salvo que se eligiera el dibujo
 * «Cambio de enrollable», y delante llevaba siempre pletina.
 */

export const tiposEnrollable = Object.freeze(['NUEVO', 'CAMBIO TELA']);
export const delanteEnrollable = Object.freeze(['PLETINA', 'VARILLA']);

const limpio = (value) => String(value ?? '').trim().toUpperCase();

/** @returns {'' | 'NUEVO' | 'CAMBIO TELA'} */
export function resolverTipoEnrollable(awning = {}) {
  if (awning?.rollerJob === undefined || awning?.rollerJob === null) {
    return limpio(awning?.fabricDiagramOverride).replace(/[-_]/g, ' ') === 'CAMBIO ENROLLABLE' ? 'CAMBIO TELA' : 'NUEVO';
  }
  const value = limpio(awning.rollerJob);
  return /** @type {'' | 'NUEVO' | 'CAMBIO TELA'} */ (tiposEnrollable.includes(value) ? value : '');
}

/** @returns {'' | 'PLETINA' | 'VARILLA'} */
export function resolverDelanteEnrollable(awning = {}) {
  if (awning?.rollerFront === undefined || awning?.rollerFront === null) return 'PLETINA';
  const value = limpio(awning.rollerFront);
  return /** @type {'' | 'PLETINA' | 'VARILLA'} */ (delanteEnrollable.includes(value) ? value : '');
}

/** Lo que pone el dibujo abajo, en la parte de delante. */
export function textoDelanteEnrollable(delante) {
  if (delante === 'VARILLA') return ['VARILLA'];
  if (delante === 'PLETINA') return ['E. PLETINA DE 30 × 6', 'CON REFUERZO PVC POR DENTRO'];
  return ['DELANTE SIN ELEGIR'];
}
