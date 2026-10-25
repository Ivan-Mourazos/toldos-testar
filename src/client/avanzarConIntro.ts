import type React from 'react';

// Intro pasa al campo siguiente, como en Excel (Iván, 25/10/2026): las medidas se teclean seguidas sin soltar
// el teclado. Va en el contenedor de cada formulario (toldo, remolque, baquetón, puerta) y solo actúa sobre
// campos de escribir; los desplegables y buscadores que usan Intro para elegir ya lo marcan con preventDefault.

const CAMPOS = [
  'input:not([type="hidden"]):not([type="checkbox"]):not([type="radio"]):not([type="button"]):not([type="submit"]):not(:disabled):not([readonly])',
  'select:not(:disabled)',
  'textarea:not(:disabled)',
  'button[role="combobox"]:not(:disabled)',
].join(', ');

const visible = (el: HTMLElement) => el.offsetParent !== null || el.getClientRects().length > 0;

export function siguienteCampo(contenedor: HTMLElement, actual: HTMLElement): HTMLElement | null {
  const campos = [...contenedor.querySelectorAll<HTMLElement>(CAMPOS)].filter(visible);
  const i = campos.indexOf(actual);
  return i < 0 ? null : campos[i + 1] ?? null;
}

export function avanzarConIntro(evento: React.KeyboardEvent<HTMLElement>) {
  if (evento.key !== 'Enter' || evento.defaultPrevented || evento.shiftKey || evento.ctrlKey || evento.altKey || evento.metaKey) return;
  if (evento.nativeEvent.isComposing) return;
  const campo = evento.target;
  if (!(campo instanceof HTMLInputElement) || campo.closest('form')) return;
  if (campo.getAttribute('aria-expanded') === 'true') return;
  const siguiente = siguienteCampo(evento.currentTarget, campo);
  if (!siguiente) return;
  evento.preventDefault();
  siguiente.focus();
  if (siguiente instanceof HTMLInputElement) siguiente.select();
}
