// Textos de la hoja que van en una sola línea (el MATERIAL, la recogida al pie de las vistas): si
// no caben con su letra, la letra baja de cuarto en cuarto de punto hasta un mínimo; si ni así
// caben, el CSS los corta con «…» (Iván, 30/09/2026).

const PASO_PT = 0.25;

/** La letra más grande entre `max` y `min` (en pt) con la que el texto cabe en `ancho`. `mide(pt)`
 *  da lo que mide el texto con esa letra. `cabe` es false si ni con el mínimo cabe. */
export function letraQueCabe(mide: (pt: number) => number, ancho: number, max: number, min: number): { pt: number; cabe: boolean } {
  for (let pt = max; pt >= min - 1e-9; pt = Math.round((pt - PASO_PT) * 100) / 100) {
    if (mide(pt) <= ancho + 0.5) return { pt, cabe: true };
  }
  return { pt: min, cabe: false };
}

/** Ajusta la letra de cada elemento `.hoja-una-linea` de `raiz` a su ancho. Su letra de partida es
 *  la del CSS; el mínimo, `data-letra-minima` (pt). Va después de cargar las fuentes. */
export function ajustarUnaLinea(raiz: ParentNode) {
  for (const el of Array.from(raiz.querySelectorAll<HTMLElement>('.hoja-una-linea'))) {
    const max = parseFloat(getComputedStyle(el).fontSize) * 0.75; // px → pt
    const min = Number(el.dataset.letraMinima ?? max);
    const { pt } = letraQueCabe((prueba) => {
      el.style.fontSize = `${prueba}pt`;
      return el.scrollWidth;
    }, el.clientWidth, max, Math.min(min, max));
    el.style.fontSize = `${pt}pt`;
  }
}
