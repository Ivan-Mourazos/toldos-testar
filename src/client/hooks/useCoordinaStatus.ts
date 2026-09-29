import { useEffect, useState } from 'react';
import type { CoordinaStatus } from '../types';

// Estado de las OF en CoordinaOT (diseño 29/09/2026): se pide al abrir, al cambiar
// la lista y cada minuto mientras la pantalla está abierta. Pregunta a nuestro
// servidor, que es quien tiene la clave.
const REFRESH_MS = 60_000;

export function useCoordinaStatus(ofs: string[], enabled = true) {
  const [status, setStatus] = useState<CoordinaStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const key = [...new Set(ofs.filter(Boolean))].sort().join(',');

  useEffect(() => {
    if (!enabled || !key) return;
    let cancelled = false;
    const load = () => {
      setLoading(true);
      fetch(`/api/coordina/ofs?ofs=${encodeURIComponent(key)}`)
        .then((response) => response.json() as Promise<CoordinaStatus>)
        .then((data) => { if (!cancelled) setStatus(data); })
        .catch(() => { if (!cancelled) setStatus({ disponible: false, motivo: 'Sin conexión con el servidor.' }); })
        .finally(() => { if (!cancelled) setLoading(false); });
    };
    load();
    const timer = window.setInterval(load, REFRESH_MS);
    return () => { cancelled = true; window.clearInterval(timer); };
  }, [key, enabled]);

  // Sin OF que consultar (o pantalla cerrada) no hay nada pendiente de CoordinaOT: se
  // deriva aquí en vez de guardarlo desde el efecto.
  if (!enabled || !key) return { status: { disponible: true, ofs: {} } as CoordinaStatus, loading: false };
  return { status, loading };
}
