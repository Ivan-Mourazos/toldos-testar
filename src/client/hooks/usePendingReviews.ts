import { useEffect, useRef, useState } from 'react';
import type { PedidoBandeja } from '../types';
import type { Notify } from '../components/NotificationCenter';
import { mergePendingReviews, pendingYears } from '../ordersInbox';
import { leerPedidosDelAnio } from './listaPedidos';

// Pedidos pendientes de generar, de toldos y de remolques (fase 5), para la bandeja y para el contador «Pedidos · N» de la
// barra superior. Vive en App para que el contador sea correcto desde que se abre la
// página, sin tener que entrar en Pedidos, y se vuelve a leer cada vez que cambia
// `refreshKey` (al guardar un pedido o generar sus archivos).
export function usePendingReviews(refreshKey: number, onError: Notify) {
  const [reviews, setReviews] = useState<PedidoBandeja[]>([]);
  const [loading, setLoading] = useState(true);
  const requestId = useRef(0);

  useEffect(() => {
    const current = ++requestId.current;
    Promise.all(pendingYears().map((year) => leerPedidosDelAnio(year)))
      .then((years) => {
        if (current !== requestId.current) return;
        setReviews(mergePendingReviews(years.map((item) => item.pedidos)));
        setLoading(false);
        const warning = years.map((item) => item.avisoRemolques).find(Boolean);
        if (warning) onError(warning, { tone: 'error' });
      })
      .catch((error) => {
        if (current !== requestId.current) return;
        setLoading(false);
        onError(error instanceof Error ? error.message : 'No se pudo cargar la bandeja.', { tone: 'error' });
      });
  }, [refreshKey, onError]);

  return { reviews, loading };
}
