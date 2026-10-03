import type { HojaTelasDatos } from './tipos';

type Pedir = (url: string, init?: RequestInit) => Promise<Response>;

/**
 * Las hojas de telas del PDF (todas las del pedido, que Chromium imprime de una vez), con el
 * identificador de un solo uso que puso el servidor en la dirección.
 */
export async function cargarHojaTelas(busqueda: string, pedir: Pedir = (url, init) => fetch(url, init)): Promise<HojaTelasDatos[]> {
  const id = new URLSearchParams(busqueda).get('id');
  if (!id) throw new Error('Falta el identificador de la hoja.');
  const respuesta = await pedir(`/api/hoja-telas/${encodeURIComponent(id)}`, { cache: 'no-store' });
  const cuerpo = await respuesta.json().catch(() => null) as { error?: string } | null;
  if (!respuesta.ok) throw new Error(cuerpo?.error ?? `No se pudieron leer los datos de la hoja (${respuesta.status}).`);
  if (!Array.isArray(cuerpo) || cuerpo.length === 0) throw new Error('El servidor no mandó ninguna hoja de telas.');
  return cuerpo as unknown as HojaTelasDatos[];
}
