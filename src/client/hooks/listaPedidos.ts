import type { PedidoBandeja } from '../types';

type Pedir = (url: string) => Promise<Response>;

async function lista(pedir: Pedir, url: string, fallo: string): Promise<PedidoBandeja[]> {
  const respuesta = await pedir(url);
  const datos = await respuesta.json().catch(() => ({})) as { reviews?: PedidoBandeja[]; error?: string };
  if (!respuesta.ok) throw new Error(datos.error || fallo);
  return datos.reviews ?? [];
}

/**
 * Los pedidos guardados de un año (fase 5): los de toldos (su carpeta de revisión) y los de
 * remolques (la carpeta interna). Si fallan los de toldos falla todo, como antes; si fallan solo
 * los de remolques, siguen los de toldos y se devuelve el aviso para enseñarlo.
 */
export async function leerPedidosDelAnio(year: number, pedir: Pedir = (url) => fetch(url)): Promise<{ pedidos: PedidoBandeja[]; avisoRemolques: string | null }> {
  const [toldos, remolques] = await Promise.all([
    lista(pedir, `/api/reviews?year=${year}`, 'No se pudo cargar la bandeja.'),
    lista(pedir, `/api/remolques/pedidos?year=${year}`, 'No se pudieron cargar los pedidos de remolques.').then(
      (pedidos) => ({ pedidos, aviso: null as string | null }),
      (error: unknown) => ({ pedidos: [] as PedidoBandeja[], aviso: error instanceof Error ? error.message : 'No se pudieron cargar los pedidos de remolques.' }),
    ),
  ]);
  return { pedidos: [...toldos, ...remolques.pedidos], avisoRemolques: remolques.aviso };
}
