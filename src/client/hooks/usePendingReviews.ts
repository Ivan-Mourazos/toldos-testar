import { useEffect, useRef, useState } from 'react';
import type { ReviewSummary } from '../types';
import type { Notify } from '../components/NotificationCenter';
import { mergePendingReviews, pendingYears } from '../ordersInbox';

// Pedidos pendientes de generar, para la bandeja y para el contador «Pedidos · N» de la
// barra superior. Vive en App para que el contador sea correcto desde que se abre la
// página, sin tener que entrar en Pedidos, y se vuelve a leer cada vez que cambia
// `refreshKey` (al guardar un pedido o generar sus archivos).
export function usePendingReviews(refreshKey: number, onError: Notify) {
  const [reviews, setReviews] = useState<ReviewSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const requestId = useRef(0);

  useEffect(() => {
    const current = ++requestId.current;
    Promise.all(pendingYears().map(async (year) => {
      const response = await fetch(`/api/reviews?year=${year}`);
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'No se pudo cargar la bandeja.');
      return data.reviews as ReviewSummary[];
    }))
      .then((lists) => {
        if (current !== requestId.current) return;
        setReviews(mergePendingReviews(lists));
        setLoading(false);
      })
      .catch((error) => {
        if (current !== requestId.current) return;
        setLoading(false);
        onError(error instanceof Error ? error.message : 'No se pudo cargar la bandeja.', { tone: 'error' });
      });
  }, [refreshKey, onError]);

  return { reviews, loading };
}
