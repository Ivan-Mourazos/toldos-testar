// Comprueba que una OF pertenezca al pedido, no solo que exista. El pedido 4111
// llevaba 0234186, que es 0231486 con dos dígitos transpuestos; la comprobación de
// pertenencia cubre además la OF real de otro pedido, que es el error que no salta
// a la vista al revisar. Ver docs/superpowers/specs/2026-09-14-aviso-of-inexistente-design.md.

export function normalizeOfCode(value) {
  // Excel guarda a veces la OF como número, así que llega "231486.0": la parte
  // decimal se descarta antes de quedarse con los dígitos, o sumaría un cero.
  const withoutDecimals = String(value ?? '').trim().replace(/[.,]\d*$/, '');
  const digits = withoutDecimals.replace(/\D/g, '');
  return digits.replace(/^0+(?=\d)/, '');
}

// knownOfs null o undefined significa que no se conocen las OF del pedido: en ese
// caso no se avisa. Un aviso emitido sin saber la respuesta es ruido.
export function isOfOutsideOrder(of, knownOfs) {
  if (!Array.isArray(knownOfs) || knownOfs.length === 0) return false;
  const normalized = normalizeOfCode(of);
  if (!normalized) return false;
  return !knownOfs.some((known) => normalizeOfCode(known) === normalized);
}
