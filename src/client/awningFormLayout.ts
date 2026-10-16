// Cada fila consume doce columnas. Solo se ensanchan los campos de esa fila;
// nunca se adelanta otro campo para rellenar un hueco.
export function repartirFilas(minimos: number[], inicios: boolean[] = []): number[] {
  const filas: number[][] = [];
  let fila: number[] = [];
  for (const [index, minimo] of minimos.entries()) {
    if (fila.length && (inicios[index] || fila.reduce((sum, ancho) => sum + ancho, 0) + minimo > 12)) {
      filas.push(fila);
      fila = [];
    }
    fila.push(minimo);
  }
  if (fila.length) filas.push(fila);
  const spans: number[] = [];
  for (const campos of filas) {
    let libres = 12;
    for (let i = 0; i < campos.length; i++) {
      const span = i === campos.length - 1 ? libres : campos[i];
      spans.push(span);
      libres -= span;
    }
  }
  return spans;
}
