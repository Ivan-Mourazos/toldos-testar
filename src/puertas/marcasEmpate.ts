/** Flecha FLECHA2 de la oficina, en cm; el sentido cambia entre el SVG y el corte. */
export const ESCALA_FLECHA_EMPATE = 1;

export function flechaEmpate(x: number, y: number, sentido: 1 | -1): Array<[number, number, number, number]> {
  const n = (v: number) => Math.round(v * 10000) / 10000;
  const escala = ESCALA_FLECHA_EMPATE, base = n(y + sentido * escala), punta = n(y + sentido * 2.53205 * escala);
  const izquierda = n(x - .8 * escala), derecha = n(x + .8 * escala);
  return [[x, y, x, base], [izquierda, base, derecha, base], [izquierda, base, x, punta], [x, punta, derecha, base]];
}
