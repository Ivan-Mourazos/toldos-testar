import type { DatosHojaPedido } from '../../remolques/hoja/tipos.ts';

type Pedir = (url: string, init?: RequestInit) => Promise<Response>;

/** Los datos de la hoja, con el identificador de un solo uso que puso el servidor en la dirección. */
export async function cargarDatosHoja(busqueda: string, pedir: Pedir = (url, init) => fetch(url, init)): Promise<DatosHojaPedido> {
  const id = new URLSearchParams(busqueda).get('id');
  if (!id) throw new Error('Falta el identificador de la hoja.');
  const respuesta = await pedir(`/api/remolques/hoja/${encodeURIComponent(id)}`, { cache: 'no-store' });
  const cuerpo = await respuesta.json().catch(() => null) as { error?: string } | null;
  if (!respuesta.ok) throw new Error(cuerpo?.error ?? `No se pudieron leer los datos de la hoja (${respuesta.status}).`);
  return cuerpo as unknown as DatosHojaPedido;
}
