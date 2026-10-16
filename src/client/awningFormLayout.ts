// Cada fila consume doce columnas. Solo se ensanchan los campos de esa fila;
// nunca se adelanta otro campo para rellenar un hueco.
export function repartirFilas(minimos: number[]): number[] {
  const filas: number[][] = [];
  let fila: number[] = [];
  for (const minimo of minimos) {
    if (fila.reduce((sum, ancho) => sum + ancho, 0) + minimo > 12) {
      filas.push(fila);
      fila = [];
    }
    fila.push(minimo);
  }
  if (fila.length) filas.push(fila);
  const ultima = filas.at(-1);
  const anterior = filas.at(-2);
  if (ultima?.length === 1 && anterior && anterior.length > 2 && anterior.at(-1)! + ultima[0] <= 12) {
    ultima.unshift(anterior.pop()!);
  }
  const spans: number[] = [];
  for (const campos of filas) {
    const total = campos.reduce((sum, ancho) => sum + ancho, 0);
    let libres = 12;
    for (let i = 0; i < campos.length; i++) {
      const span = i === campos.length - 1 ? libres : Math.round(campos[i] * 12 / total);
      spans.push(span);
      libres -= span;
    }
  }
  return spans;
}
