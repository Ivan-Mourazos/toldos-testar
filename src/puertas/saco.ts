import type { Puerta } from './tipos.ts';

/** Iván, 22/10/2026: las diagonales se imprimen después de cortar el saco negro. */
export function rotuloSaco(p: Pick<Puerta, 'materialSaco' | 'sacoDiagonalesAmarillas'>): string {
  return p.sacoDiagonalesAmarillas ? 'SACO 900 GR AMARILLO/NEGRO' : p.materialSaco.replace(/^LAC\s*900\s*/i, 'SACO 900 GR ');
}
