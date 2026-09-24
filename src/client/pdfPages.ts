// Página con la que se abre un PDF del planteamiento. La hoja de estructura es A5
// apaisada (unos 595 pt de ancho) y la de tela A4 apaisada (unos 842 pt): el panel
// «Despiece y dibujo» abre en la primera página ancha, la del dibujo de la tela.
export const WIDE_PAGE_MIN_WIDTH = 700;

// Número de página (desde 1) de la primera con al menos minWidth de ancho; si no hay, la 1.
export function firstWidePage(widths: number[], minWidth = WIDE_PAGE_MIN_WIDTH): number {
  const index = widths.findIndex((width) => width >= minWidth);
  return index === -1 ? 1 : index + 1;
}
