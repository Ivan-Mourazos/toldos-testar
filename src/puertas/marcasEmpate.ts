/** FLECHA2 a media escala (1,266 cm), hacia fuera del paño superior (Iván, 27/10/2026). */
export const ESCALA_FLECHA_EMPATE = .5;

export function flechaEmpate(x: number, y: number, sentido: 1 | -1): Array<[number, number, number, number]> {
  const n = (v: number) => Math.round(v * 10000) / 10000;
  const escala = ESCALA_FLECHA_EMPATE, base = n(y + sentido * escala), punta = n(y + sentido * 2.53205 * escala);
  const izquierda = n(x - .8 * escala), derecha = n(x + .8 * escala);
  return [[x, y, x, base], [izquierda, base, derecha, base], [izquierda, base, x, punta], [x, punta, derecha, base]];
}
