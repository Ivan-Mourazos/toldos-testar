import { awningLetter, letraToldo } from '../awningCompleteness.js';

/** Los cortes antiguos podían guardar los ajustes bajo la letra automática. */
export function ajustesDeToldo(ajustes, toldo, indice) {
  return ajustes[toldo.id] ?? ajustes[toldo.of] ?? ajustes[letraToldo(toldo, indice)] ?? ajustes[awningLetter(toldo.posicionLetra ?? indice)] ?? {};
}
