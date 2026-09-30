import { useLayoutEffect, type RefObject } from 'react';

// Un área de texto de una sola línea lógica que crece a los renglones que ocupe su texto: así un
// dato largo (la bobina de un remolque, una observación) se lee entero en vez de cortarse con «…».
// `field-sizing: content` lo hace solo en los Chrome nuevos; esto, en todos. Se vuelve a medir en
// cada pintado (el ancho también cambia al redimensionar la ventana: ver el ResizeObserver).
export function useAltoAjustado(ref: RefObject<HTMLTextAreaElement | null>, valor: string) {
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    const ajustar = () => {
      el.style.height = 'auto';
      el.style.height = `${el.scrollHeight + (el.offsetHeight - el.clientHeight)}px`;
    };
    ajustar();
    if (typeof ResizeObserver === 'undefined') return undefined;
    let ancho = el.clientWidth;
    const observador = new ResizeObserver(() => {
      if (el.clientWidth === ancho) return;
      ancho = el.clientWidth;
      ajustar();
    });
    observador.observe(el);
    return () => observador.disconnect();
  }, [ref, valor]);
}

/** Lo pegado con saltos de línea queda en un renglón, como en un input. */
export const enUnRenglon = (texto: string) => texto.replace(/[\r\n]+/g, ' ');
