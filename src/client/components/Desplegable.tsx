import type { ReactNode } from 'react';
import { useSalidaAnimada } from '../hooks/useSalidaAnimada';

/** La misma rejilla y los mismos tiempos de apertura y cierre que en CoordinaOT. */
export function Desplegable({ abierto, children }: { abierto: boolean; children: ReactNode }) {
  const { montado, alTerminar } = useSalidaAnimada(abierto);
  if (!montado) return null;
  return (
    <div className={`desplegable ${abierto ? 'desplegable-abre' : 'desplegable-cierra'}`}
      aria-hidden={!abierto} inert={!abierto} onAnimationEnd={alTerminar}>
      <div>{children}</div>
    </div>
  );
}
