import { letraQueCabe } from '../hoja/ajusteTexto';

// La segunda línea de cada fila (la instrucción del toldo) no puede perder texto: primero se parte
// en dos líneas; si no cabe, la letra baja hasta 7 pt; y solo si ni así cabe se corta con «…» y se
// avisa de que la nota completa está en el pedido, como hacía la página de pdfkit.

export const NOTA_COMPLETA = '[NOTA COMPLETA EN EL PEDIDO]';

/** La letra (pt) y el texto con que `texto` cabe en dos líneas. `cabe(texto, pt)` lo dice. */
export function textoEnDosLineas(texto: string, cabe: (texto: string, pt: number) => boolean, max: number, min: number): { pt: number; texto: string } {
  // letraQueCabe compara una medida con un ancho: 0 si cabe y 1 si no, contra un ancho de 0.
  const { pt, cabe: entero } = letraQueCabe((prueba) => (cabe(texto, prueba) ? 0 : 1), 0, max, min);
  if (entero) return { pt, texto };
  const cortado = (largo: number) => `${texto.slice(0, largo).trimEnd()}… ${NOTA_COMPLETA}`;
  // El trozo más largo que cabe con el aviso detrás.
  let bajo = 0;
  let alto = texto.length;
  while (bajo < alto) {
    const medio = Math.ceil((bajo + alto) / 2);
    if (cabe(cortado(medio), min)) bajo = medio;
    else alto = medio - 1;
  }
  // Mejor en el último espacio que a media palabra, si queda cerca (15 letras como mucho).
  const espacio = texto.lastIndexOf(' ', bajo);
  const corte = /\s/.test(texto[bajo] ?? ' ') || espacio <= 0 || bajo - espacio > 15 ? bajo : espacio;
  return { pt: min, texto: cortado(corte) };
}

/** Ajusta cada `.telas-dos-lineas` de `raiz` a dos líneas de su casilla. La letra de partida es la
 *  del CSS y el mínimo, `data-letra-minima`. Va después de cargar las fuentes. */
export function ajustarDosLineas(raiz: ParentNode) {
  for (const el of Array.from(raiz.querySelectorAll<HTMLElement>('.telas-dos-lineas'))) {
    const nodo = el.firstChild;
    const casilla = el.parentElement;
    if (!(nodo instanceof Text) || !casilla) continue;
    const max = parseFloat(getComputedStyle(el).fontSize) * 0.75; // px → pt
    const min = Math.min(Number(el.dataset.letraMinima ?? max), max);
    const alturaLinea = parseFloat(getComputedStyle(el).lineHeight) / parseFloat(getComputedStyle(el).fontSize);
    const original = nodo.nodeValue ?? '';
    const cabe = (texto: string, pt: number) => {
      // Se cambia el nodo de texto que puso React, no se sustituye: React lo sigue teniendo.
      nodo.nodeValue = texto;
      el.style.fontSize = `${pt}pt`;
      const dosLineas = 2 * alturaLinea * pt * (4 / 3);
      return el.scrollHeight <= Math.min(dosLineas, casilla.clientHeight) + 1 && el.scrollWidth <= el.clientWidth + 1;
    };
    const { pt, texto } = textoEnDosLineas(original, cabe, max, min);
    nodo.nodeValue = texto;
    el.style.fontSize = `${pt}pt`;
  }
}
