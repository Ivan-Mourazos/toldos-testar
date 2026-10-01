// Las posiciones de los ollaos y los códigos de RPS se escriben en un campo de texto en la hoja
// de Clientes. La coma es la de los decimales, así que las posiciones se separan con «·», «;» o
// espacios.

/** «2,5 · 10 · 40» → [2.5, 10, 40]; null si algo no es un número mayor que 0. Vacío → []. */
export function leerPosiciones(texto: string): number[] | null {
  const numeros = texto.split(/[·;\s]+/).filter(Boolean).map((parte) => Number(parte.replace(',', '.')));
  return numeros.every((n) => Number.isFinite(n) && n > 0) ? numeros : null;
}

export const escribirPosiciones = (posiciones: readonly number[]): string =>
  posiciones.map((n) => n.toLocaleString('es-ES', { maximumFractionDigits: 2 })).join(' · ');

/** Códigos separados por comas o espacios, sin repetir. */
export function leerCodigos(texto: string): string[] {
  return [...new Set(texto.split(/[\s,;·]+/).map((c) => c.trim()).filter(Boolean))];
}
