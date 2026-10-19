// Ancho aproximado de un texto en Arial de altura h (AutoCAD toma h como la altura de las mayúsculas,
// que en Arial es 0,716 del cuerpo). Anchos de Arial en milésimas del cuerpo.
const ARIAL = { ' ': 278, '(': 333, ')': 333, ',': 278, '.': 278, '-': 333, '+': 584, '/': 278, ':': 278, I: 278, J: 500, L: 556, F: 611, T: 611, Z: 611, M: 833, W: 944, C: 722, D: 722, H: 722, N: 722, Ñ: 722, R: 722, U: 722, G: 778, O: 778, Q: 778 };
export function anchoArial(texto, h) {
  const milesimas = [...String(texto)].reduce((s, c) => s + (ARIAL[c] ?? (/\d/.test(c) ? 556 : 667)), 0);
  return (milesimas / 1000) * (h / 0.716);
}


/** No deja que un salto de línea o un control de MTEXT altere la estructura del fichero. */
export const textoSeguro = (valor) => String(valor ?? '').replace(/[\r\n\t]+/g, ' ').replace(/[\\{}]/g, ' ').trim().toUpperCase();
export const textoLatin1 = (valor) => textoSeguro(valor).replace(/[^\x20-\xff]/gu, (c) => '\\U+' + c.codePointAt(0).toString(16).toUpperCase().padStart(4, '0'));
