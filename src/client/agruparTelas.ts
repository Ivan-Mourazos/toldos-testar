import { claveLona, leerLona, nombreLona } from '../domain/lonaSimple.js';

// Todos los buscadores de tela (toldos, cabecera de puertas, ventanas de stock) juntan las marcas de la misma lona en una opción, como el material de remolques (Iván,
// 26/11/2026): «PVC 900 BLANCO 9016 · 300 AN» con PANAMA y LAC900 debajo. Lo que no se reconoce
// como lona de PVC sale suelto, con nombre null.

export interface TelaBuscada { code: string; description: string; width: number | null }
export interface GrupoTelas<T extends TelaBuscada> { clave: string; nombre: string | null; marcas: T[]; stock: number | null }

/** `stocks`: lo disponible de cada código, si ya se sabe. Los grupos salen en el orden de la
 * búsqueda; dentro, primero la marca con más stock (es la que se añade al elegir el grupo). */
export function agruparTelas<T extends TelaBuscada>(telas: readonly T[], stocks: Record<string, number>): GrupoTelas<T>[] {
  const grupos = new Map<string, GrupoTelas<T>>();
  for (const tela of telas) {
    const lona = leerLona(tela.description, tela.width);
    const clave = lona?.ancho ? claveLona(lona) : `suelta|${tela.code}`;
    const grupo = grupos.get(clave) ?? grupos.set(clave, { clave, nombre: lona?.ancho ? nombreLona(lona) : null, marcas: [], stock: null }).get(clave)!;
    if (!grupo.marcas.some(m => m.code === tela.code)) grupo.marcas.push(tela);
  }
  const stockDe = (code: string) => stocks[code] ?? Number.NEGATIVE_INFINITY;
  return [...grupos.values()].map((grupo) => {
    const conDato = grupo.marcas.filter(m => stocks[m.code] != null);
    return {
      ...grupo,
      marcas: [...grupo.marcas].sort((a, b) => stockDe(b.code) - stockDe(a.code) || a.code.localeCompare(b.code)),
      stock: conDato.length ? Math.round(conDato.reduce((total, m) => total + stocks[m.code], 0) * 10) / 10 : null,
    };
  });
}
