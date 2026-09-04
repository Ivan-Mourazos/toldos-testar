/**
 * Guardia común contra cortes imposibles.
 *
 * Cuando el descuento de fabricación supera la medida del hueco, la pieza sale
 * con longitud negativa. Eso no es un toldo pequeño: es un corte que no existe,
 * y casi siempre un frente o una salida mal tecleados. Nunca debe llegar a la
 * hoja que baja al taller, ni siquiera con una excepción técnica activada: la
 * excepción está para salirse de la tabla del fabricante, no para pedir piezas
 * de longitud negativa.
 *
 * Los nombres de pieza que se pasen aquí son los de la hoja de taller, no los
 * del cálculo: este diagnóstico lo lee un técnico de oficina.
 */
export function findNegativeCuts(pieces) {
  return (pieces || []).filter((piece) => {
    const length = Number(piece?.length);
    return Number.isFinite(length) && length < 0;
  });
}

export function negativeCutMessage(model, of, pieces) {
  const names = pieces.map((piece) => piece.name).join(', ');
  return `${model} en OF ${of}: las medidas no dan para los descuentos de fabricación (quedaría en negativo: ${names}).`;
}
