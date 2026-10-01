import type { ElementoFicha } from '../../remolques/clientes/diferencias.ts';
import type { FichaCliente, SnapshotFichas } from '../../remolques/clientes/tipos.ts';
import type { ClienteRps } from '../../remolques/rps/types.ts';
import { REMOLQUES_PARAMETERS_SAVED } from './useRemolquesParameters';

// Las fichas de cliente de remolques (fase 3) desde la web: leerlas y guardar desde un pedido. La
// hoja de Parámetros guarda todas a la vez con su propio borrador (useFichasClientes).

export const RUTA_FICHAS = '/api/remolques/clientes';
/** Se lanza al guardar fichas: la hoja de Clientes las vuelve a leer. */
export const REMOLQUES_CLIENTES_SAVED = 'remolques-clientes-saved';

/** El nombre que se ve del cliente de RPS: el alias si lo tiene (como la cabecera del pedido). */
export const nombreClienteRps = (cliente: Pick<ClienteRps, 'nombre' | 'alias'>): string =>
  (cliente.alias?.trim() || cliente.nombre).trim();

export async function leerFichas(): Promise<SnapshotFichas> {
  const respuesta = await fetch(RUTA_FICHAS, { cache: 'no-store' });
  if (!respuesta.ok) throw new Error('No se pudieron leer las fichas de cliente.');
  const datos = await respuesta.json() as SnapshotFichas;
  if (!Number.isInteger(datos?.version) || !Array.isArray(datos?.fichas)) throw new Error('Las fichas de cliente recibidas no son válidas.');
  return datos;
}

export interface CuerpoDesdePedido {
  numeroPedido: string;
  cliente: Pick<ClienteRps, 'codigo' | 'nombre'>;
  /** La ficha a la que se añade (sugerida); sin ella, la del código o una nueva. */
  fichaId?: string | null;
  elemento?: ElementoFicha;
  /** Lo marcado; vacío = solo añadir el código. */
  claves: string[];
  updatedBy: string;
}

/** Las fichas cambian los parámetros con que se calcula (extras de baquetón, recogidas propias). */
export function avisarFichasGuardadas() {
  window.dispatchEvent(new Event(REMOLQUES_CLIENTES_SAVED));
  window.dispatchEvent(new Event(REMOLQUES_PARAMETERS_SAVED));
}

export async function guardarDesdePedido(cuerpo: CuerpoDesdePedido): Promise<{ ficha: FichaCliente; snapshot: SnapshotFichas }> {
  const respuesta = await fetch(`${RUTA_FICHAS}/desde-pedido`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(cuerpo),
  });
  const datos = await respuesta.json().catch(() => ({})) as { error?: string; ficha?: FichaCliente; snapshot?: SnapshotFichas };
  if (!respuesta.ok || !datos.ficha || !datos.snapshot) throw new Error(datos.error || 'No se pudo guardar en la ficha del cliente.');
  avisarFichasGuardadas();
  return { ficha: datos.ficha, snapshot: datos.snapshot };
}
