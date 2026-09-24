import { formOptions } from '../domain/modelBehavior.js';

// Quién usa este navegador (diseño 24/09/2026, apartado 2). No es un inicio de sesión:
// sirve para poner el autor del pedido y abrir la bandeja en "Míos".
export const CURRENT_USER_KEY = 'toldos-testar-usuario';

function defaultStorage(): Storage | null {
  try { return typeof localStorage === 'undefined' ? null : localStorage; } catch { return null; }
}

export function readCurrentUser(storage: Storage | null = defaultStorage()): string {
  try {
    const name = storage?.getItem(CURRENT_USER_KEY) || '';
    return (formOptions.tecnicos as string[]).includes(name) ? name : '';
  } catch {
    return '';
  }
}

export function saveCurrentUser(name: string, storage: Storage | null = defaultStorage()) {
  try { storage?.setItem(CURRENT_USER_KEY, name); } catch { /* navegador sin almacenamiento: se pregunta otra vez */ }
}
