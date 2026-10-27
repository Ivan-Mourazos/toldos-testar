import { useLayoutEffect, useRef } from 'react';

/** Anima el contenido sin desmontarlo: conserva campos, foco y desplazamiento.
 * Las tiras quedan fuera para que su píldora siga deslizándose por su cuenta. */
export function useContenidoFluido<T extends HTMLElement = HTMLDivElement>(clave: string) {
  const ref = useRef<T>(null);
  const anterior = useRef(clave);
  useLayoutEffect(() => {
    const cambio = anterior.current !== clave;
    anterior.current = clave;
    const zona = ref.current;
    // Marca la zona para que el cambio de pestaña (pestanasFluidas.ts) funda solo lo que cambia.
    zona?.setAttribute('data-fluido', '');
    if (!cambio || !zona || document.documentElement.dataset.transicionPedido || document.documentElement.dataset.transicionPestana || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const animaciones = Array.from(zona.children)
      .filter((hijo): hijo is HTMLElement => hijo instanceof HTMLElement && !hijo.matches('.tira-3d, header, [hidden]') && Boolean(hijo.getClientRects().length))
      .map(hijo => hijo.animate?.([
        { opacity: 0.35, transform: 'translateY(5px)' },
        { opacity: 1, transform: 'translateY(0)' },
      ], { duration: 200, easing: 'cubic-bezier(.2,.8,.2,1)' }));
    const reducir = window.matchMedia('(prefers-reduced-motion: reduce)');
    const cancelar = () => animaciones.forEach(a => a?.cancel());
    reducir.addEventListener('change', cancelar);
    return () => { cancelar(); reducir.removeEventListener('change', cancelar); };
  }, [clave]);
  return ref;
}
