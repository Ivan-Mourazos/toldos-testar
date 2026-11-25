import { resolveFabric } from './fabricCatalog.js';

/** Lo que se enseña junto a una lona acrílica donde se comprueba el stock. */
export const TEXTO_ACRILICA = 'Acrílica: no se comprueba el stock, se asigna con el Excel.';

/**
 * Las acrílicas no se comprueban ni avisan a Compras: ya se asignan con el Excel de la reserva (Iván, 25/11/2026).
 * Manda el material del catálogo; si la tela no está en él, lo que diga su descripción («ACR …», «ACRÍLICA»).
 * @param {{ codigo: string, descripcion?: string }} lona
 */
export function esLonaAcrilica({ codigo, descripcion }) {
  const tela = resolveFabric(codigo);
  const delCatalogo = tela?.code === codigo ? tela : null;
  const material = (delCatalogo?.material ?? '').trim().toUpperCase();
  if (material) return material.startsWith('ACR');
  return /(^|\s)ACR(\s|$)|ACR[IÍ]L/i.test(descripcion || delCatalogo?.description || '');
}

/** Lo que se enseña junto a una OF cuyo artículo va incluido en reservas. */
export const TEXTO_RESERVAS = 'Incluido en reservas: no se comprueba el stock de lona.';

/**
 * Artículos de venta incluidos en reservas (Iván, 25/11/2026): sus OF no comprueban la lona.
 * H0K… (puertas plegables, los de COMBURSA), subfamilia YURTAS, genérico LEM (no LEMANS ni LEMC, que son otros), DUCHAMOVIL y LOSEPMONARD247ESVERD.
 * @param {{ codigo?: string | null, generico?: string | null, subfamilia?: string | null }} articulo
 */
export function esArticuloEnReservas({ codigo, generico, subfamilia }) {
  const cod = (codigo ?? '').trim().toUpperCase();
  return cod.startsWith('H0K') || cod === 'LEM' || cod === 'DUCHAMOVIL' || cod === 'LOSEPMONARD247ESVERD'
    || (generico ?? '').trim().toUpperCase() === 'LEM' || (subfamilia ?? '').trim().toUpperCase() === 'YURTAS';
}

/** Las OF del pedido con un artículo incluido en reservas, con ese artículo.
 * @param {{ of: string, codigo?: string | null, generico?: string | null, subfamilia?: string | null }[]} articulos
 * @returns {{ of: string, codigo: string }[]} */
export function ofsEnReservas(articulos) {
  const porOf = new Map();
  for (const articulo of articulos) {
    if (articulo.of && !porOf.has(articulo.of) && esArticuloEnReservas(articulo)) porOf.set(articulo.of, String(articulo.codigo ?? '').trim());
  }
  return [...porOf].map(([of, codigo]) => ({ of, codigo })).sort((a, b) => a.of.localeCompare(b.of));
}

/** Quita las lonas cuyas OF van todas incluidas en reservas. Una lona sin OF se queda.
 * @template {{ ofs: string[] }} T @param {T[]} lonas @param {Iterable<string>} excluidas @returns {T[]} */
export function fueraDeReservas(lonas, excluidas) {
  const fuera = new Set(excluidas);
  return fuera.size ? lonas.filter(lona => !lona.ofs.length || lona.ofs.some(of => !fuera.has(of))) : lonas;
}
