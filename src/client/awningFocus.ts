// Saltar a un toldo desde «Qué revisar», los avisos de Planteamientos o el índice.
// Con los toldos por bloques la tarjeta puede estar en otra página de la fila: el
// bloque la trae primero y después se desplaza la página hasta ella.
const bus = new EventTarget();
const EVENT = 'toldos:focus-awning';

export function requestAwningFocus(letter: string) {
  bus.dispatchEvent(new CustomEvent<string>(EVENT, { detail: letter }));
}

export function onAwningFocus(handler: (letter: string) => void) {
  const listener = (event: Event) => handler((event as CustomEvent<string>).detail);
  bus.addEventListener(EVENT, listener);
  return () => bus.removeEventListener(EVENT, listener);
}

export function revealAwningCard(card: HTMLElement) {
  card.scrollIntoView({ behavior: 'smooth', block: 'start' });
  card.classList.add('is-flash');
  window.setTimeout(() => card.classList.remove('is-flash'), 1400);
}
