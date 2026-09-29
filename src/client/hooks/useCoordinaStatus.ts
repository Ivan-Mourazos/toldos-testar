import { useEffect, useState } from 'react';
import type { CoordinaStatus } from '../types';
import { normalizeOf } from '../../reviewRules.js';

// Estado de las OF en CoordinaOT (diseño 29/09/2026): se pide al abrir, al cambiar
// la lista y cada minuto mientras la pantalla está abierta. Pregunta a nuestro
// servidor, que es quien tiene la clave.
const REFRESH_MS = 60_000;

type Loaded = { key: string; status: CoordinaStatus };

// Qué estado enseñar para la lista de OF actual. La vista de detalle no se desmonta al
// cambiar de pedido, así que el estado guardado puede ser de la lista anterior: si no
// es de esta clave se devuelve null («comprobando…») en vez de dejar pasar una
// aprobación vieja que habilitaría «Generar archivos» un instante. Sin OF que consultar
// (o pantalla cerrada) no hay nada pendiente de CoordinaOT.
export function statusForKey(loaded: Loaded | null, key: string, enabled: boolean): CoordinaStatus | null {
  if (!enabled || !key) return { disponible: true, ofs: {} };
  return loaded && loaded.key === key ? loaded.status : null;
}

export function useCoordinaStatus(ofs: string[], enabled = true) {
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const key = [...new Set(ofs.map(normalizeOf).filter(Boolean))].sort().join(',');

  useEffect(() => {
    if (!enabled || !key) return;
    let cancelled = false;
    const load = () => {
      fetch(`/api/coordina/ofs?ofs=${encodeURIComponent(key)}`)
        .then(async (response) => {
          const data = await response.json().catch(() => null);
          // Una respuesta de error (500, 502…) no es un estado: se trata como no disponible.
          if (!response.ok || !data) {
            const motivo = data && typeof data.motivo === 'string' ? data.motivo : 'No se pudo consultar CoordinaOT.';
            return { disponible: false, motivo } as CoordinaStatus;
          }
          return data as CoordinaStatus;
        })
        .catch(() => ({ disponible: false, motivo: 'Sin conexión con el servidor.' }) as CoordinaStatus)
        .then((status) => { if (!cancelled) setLoaded({ key, status }); });
    };
    load();
    const timer = window.setInterval(load, REFRESH_MS);
    return () => { cancelled = true; window.clearInterval(timer); };
  }, [key, enabled]);

  const status = statusForKey(loaded, key, enabled);
  return { status, loading: status === null };
}
