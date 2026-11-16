import { useState, useSyncExternalStore, type AnimationEvent } from 'react';

const consulta = '(prefers-reduced-motion: reduce)';
const leerReducido = () => window.matchMedia(consulta).matches;
const sinNavegador = () => true;
const suscribir = (avisar: () => void) => {
  const medio = window.matchMedia(consulta);
  medio.addEventListener('change', avisar);
  return () => medio.removeEventListener('change', avisar);
};

/** Conserva el contenido hasta terminar su cierre, como Desplegable de CoordinaOT. */
export function useSalidaAnimada(abierto: boolean) {
  const reducido = useSyncExternalStore(suscribir, leerReducido, sinNavegador);
  const [montado, setMontado] = useState(abierto);
  if (abierto && !montado) setMontado(true);
  if (!abierto && montado && reducido) setMontado(false);

  const alTerminar = (evento: AnimationEvent<HTMLElement>) => {
    // Una animación de un hijo no debe desmontar la caja que aún se está cerrando.
    if (evento.target === evento.currentTarget && !abierto) setMontado(false);
  };
  return { montado: abierto || (montado && !reducido), alTerminar };
}
