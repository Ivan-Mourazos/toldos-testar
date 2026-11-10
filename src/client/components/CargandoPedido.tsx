import { LoaderCircle } from 'lucide-react';

/**
 * Aviso mientras llega un pedido abierto desde CoordinaOT (Iván, 10/11/2026: «parece que se queda trabado»).
 * Se ve desde el clic hasta que el pedido está cargado en Nuevo pedido o abierto en Pedidos.
 */
export function CargandoPedido({ numero }: { numero: string | null }) {
  if (!numero) return null;
  return (
    <div className="cargando-pedido" role="status" aria-live="polite" aria-busy="true">
      <LoaderCircle className="is-spinning" aria-hidden="true" />
      Cargando el pedido {numero} de CoordinaOT…
    </div>
  );
}
