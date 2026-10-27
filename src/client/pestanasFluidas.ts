import { flushSync } from 'react-dom';
import './coordina/transiciones.css';

// Cambio de pestaña fundido (Iván, 27/10/2026: «hace un salto en vez de ver cómo cambia»). Hasta ahora el contenido
// viejo desaparecía de golpe y solo el nuevo se animaba. Con una View Transition el navegador fotografía la página antes
// del cambio: la cabecera queda quieta, el contenido viejo se apaga y el nuevo entra con un pequeño ascenso (como las
// Tabs de HeroUI). La tira pulsada sale de la foto para que su píldora siga deslizándose en vivo.
//
// No hay que tocar cada pestaña: se escucha el clic en captura, antes que React, se para, se hace la foto y dentro de la
// transición se repite el clic para que React haga el cambio con flushSync.

// Además de las tiras: las pestañas de elementos de remolques (el botón va dentro de la pestaña), los modelos y los
// clientes de Parámetros, y los botones marcados con data-cambio-fluido (elegir modelo en el inicio, «Buscar otro pedido»).
const PESTANA = ':is(:is(.tira-3d, [role="tablist"]) > button, .rem-pestana > .rem-pestana-abrir, .parameter-model-options > button, .clientes-remolques-lista > button, button[data-cambio-fluido])'
  + ':not(.pestana-activa, .glass-chip-activo, .is-active, [aria-selected="true"], [aria-pressed="true"], [aria-current="true"], :disabled)';

let repitiendo = false;
let actual: ViewTransition | undefined;

function alPulsar(evento: MouseEvent) {
  if (repitiendo || evento.button !== 0 || evento.defaultPrevented || evento.metaKey || evento.ctrlKey || evento.shiftKey) return;
  const boton = (evento.target as Element | null)?.closest<HTMLButtonElement>(PESTANA);
  if (!boton || !document.startViewTransition || document.documentElement.dataset.transicionPedido
    || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  evento.stopPropagation();
  evento.preventDefault();
  actual?.skipTransition();
  const tira = (boton.closest('.tira-3d, [role="tablist"]') ?? boton.parentElement) as HTMLElement;
  tira.style.setProperty('view-transition-name', 'tira-pulsada');
  // Se funde la zona más cercana que cambia con la pestaña; las de la cabecera, todo el espacio de trabajo con su título.
  const zona = tira.closest<HTMLElement>('[data-fluido]') ?? document.querySelector<HTMLElement>('.app-workspace');
  zona?.style.setProperty('view-transition-name', 'contenido-pestana');
  document.documentElement.dataset.transicionPestana = 'activa';
  const transicion = document.startViewTransition(() => {
    repitiendo = true;
    try { flushSync(() => boton.click()); } finally { repitiendo = false; }
  });
  actual = transicion;
  void transicion.finished.catch(() => undefined).finally(() => {
    tira.style.removeProperty('view-transition-name');
    zona?.style.removeProperty('view-transition-name');
    if (actual !== transicion) return;
    actual = undefined;
    delete document.documentElement.dataset.transicionPestana;
  });
}

export function iniciarPestanasFluidas() {
  document.addEventListener('click', alPulsar, true);
}
