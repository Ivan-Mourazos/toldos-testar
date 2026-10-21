import type { PedidoBandeja } from '../types';

type Pedir = (url: string) => Promise<Response>;

async function lista(pedir: Pedir, url: string, fallo: string): Promise<PedidoBandeja[]> {
  const respuesta = await pedir(url);
  const datos = await respuesta.json().catch(() => ({})) as { reviews?: PedidoBandeja[]; error?: string };
  if (!respuesta.ok) throw new Error(datos.error || fallo);
  return datos.reviews ?? [];
}

/** Una lista que puede fallar sin tirar las demás: sus pedidos o el aviso para enseñarlo. */
function listaOpcional(pedir: Pedir, url: string, fallo: string) {
  return lista(pedir, url, fallo).then(
    (pedidos) => ({ pedidos, aviso: null as string | null }),
    (error: unknown) => ({ pedidos: [] as PedidoBandeja[], aviso: error instanceof Error ? error.message : fallo }),
  );
}

/**
 * Los pedidos guardados de un año (fase 5): los de toldos (su carpeta de revisión), los de
 * remolques (la carpeta interna) y los de puertas (su subcarpeta, 22/10/2026). Si fallan los de
 * toldos falla todo, como antes; si fallan los otros, siguen los demás y se devuelve el aviso.
 */
export async function leerPedidosDelAnio(year: number, pedir: Pedir = (url) => fetch(url)): Promise<{ pedidos: PedidoBandeja[]; avisoRemolques: string | null }> {
  const [toldos, remolques, puertas] = await Promise.all([
    lista(pedir, `/api/reviews?year=${year}`, 'No se pudo cargar la bandeja.'),
    listaOpcional(pedir, `/api/remolques/pedidos?year=${year}`, 'No se pudieron cargar los pedidos de remolques.'),
    listaOpcional(pedir, `/api/puertas/pedidos?year=${year}`, 'No se pudieron cargar los pedidos de puertas.'),
  ]);
  const avisos = [remolques.aviso, puertas.aviso].filter(Boolean);
  return { pedidos: [...toldos, ...remolques.pedidos, ...puertas.pedidos], avisoRemolques: avisos.length ? avisos.join(' ') : null };
}
