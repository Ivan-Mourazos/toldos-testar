/** Reparte líneas (por su alto) entre la caja de la primera página y las de continuación.
 *  Devuelve los índices de cada página. Una línea que no cabe en ninguna caja va sola. */
export function repartirNotas(altos: number[], primera: number, siguiente: number): number[][] {
  const paginas: number[][] = [];
  let actual: number[] = [];
  let libre = primera;
  altos.forEach((alto, indice) => {
    if (actual.length > 0 && alto > libre) {
      paginas.push(actual);
      actual = [];
      libre = siguiente;
    }
    actual.push(indice);
    libre -= alto;
  });
  if (actual.length > 0) paginas.push(actual);
  return paginas;
}
