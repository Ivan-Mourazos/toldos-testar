import { awningLetter } from '../../domain/awningCompleteness.js';
import { normalizeOf } from '../../reviewRules.js';

export const OF_PROVISIONAL = 'SIN OF';
export const ofElemento = (el) => normalizeOf(el.input?.cabecera?.ordenFabricacion ?? '');
export const elementosSinOf = (pedido) => pedido.elementos.flatMap((el, i) =>
  !ofElemento(el) || ofElemento(el).toUpperCase() === OF_PROVISIONAL ? [awningLetter(i)] : []);

// La OF provisional solo sirve para dibujar: nunca llega a los archivos ni al bot.
export function exigirOfsCorte(pedido) {
  const sinOf = elementosSinOf(pedido);
  if (sinOf.length) throw Object.assign(new Error(
    `Falta la OF del elemento ${sinOf.join(', ')}: escríbela antes de guardar, descargar o enviar el corte.`,
  ), { statusCode: 409 });
}
