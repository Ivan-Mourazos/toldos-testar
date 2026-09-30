// Observaciones del técnico por líneas (Iván, 30/09/2026), como las de tela de los toldos. Se siguen
// guardando en un solo texto (`observaciones: string`, una línea por renglón) para que los
// planteamientos de antes y los de la web vieja sigan valiendo: un texto de una línea es una línea.

/** Las líneas escritas, sin espacios en las puntas y sin las vacías. */
export function lineasObservaciones(texto: string): string[] {
  return String(texto ?? "").split(/\r\n|\r|\n/).map((linea) => linea.trim()).filter(Boolean);
}

/** Lo que se guarda: las líneas juntas con saltos de línea, sin las vacías que dejó «Añadir línea». */
export function limpiarObservaciones(texto: string): string {
  return lineasObservaciones(texto).join("\n");
}
