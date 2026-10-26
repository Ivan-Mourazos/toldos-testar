import { flushSync } from 'react-dom';
import './coordina/transiciones.css';

let actual: ViewTransition | undefined;

/** Lista y detalle: dos vistas del mismo pedido, con captura nativa cuando existe. */
export function transicionPedido(actualizar: () => void) {
  actual?.skipTransition();
  if (!document.startViewTransition || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    actualizar();
    return Promise.resolve();
  }
  document.documentElement.dataset.transicionPedido = 'activa';
  const transicion = document.startViewTransition(() => flushSync(actualizar));
  actual = transicion;
  void transicion.finished.catch(() => undefined).finally(() => {
    if (actual !== transicion) return;
    actual = undefined;
    delete document.documentElement.dataset.transicionPedido;
  });
  return transicion.updateCallbackDone.catch(() => undefined);
}
