import { useEffect, useState } from 'react';
import type { FabricStock } from '../fabricStock';

// Stock de una tela en RPS (GET /api/catalog/fabrics/stock). Las tarjetas con la misma
// tela comparten la consulta y el resultado se reutiliza 60 s, como la caché del servidor.
export type FabricStockState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'ready'; stock: FabricStock }
  | { status: 'error' };

const ttlMs = 60_000;
const cache = new Map<string, { at: number; promise: Promise<FabricStock> }>();

function loadStock(code: string): Promise<FabricStock> {
  const cached = cache.get(code);
  if (cached && Date.now() - cached.at < ttlMs) return cached.promise;
  const promise = fetch(`/api/catalog/fabrics/stock?codes=${encodeURIComponent(code)}`)
    .then(async (response) => {
      const data = await response.json();
      const stock = response.ok && Array.isArray(data.items) ? data.items[0] : null;
      if (!stock) throw new Error(data.error || 'Stock no disponible ahora');
      return stock as FabricStock;
    });
  cache.set(code, { at: Date.now(), promise });
  // Un fallo no se guarda: la próxima vez se vuelve a preguntar.
  promise.catch(() => cache.delete(code));
  return promise;
}

export function useFabricStock(code: string): FabricStockState {
  const [state, setState] = useState<{ code: string; value: FabricStockState }>({ code: '', value: { status: 'idle' } });

  useEffect(() => {
    if (!code) return undefined;
    let active = true;
    loadStock(code).then(
      (stock) => { if (active) setState({ code, value: { status: 'ready', stock } }); },
      () => { if (active) setState({ code, value: { status: 'error' } }); }
    );
    return () => { active = false; };
  }, [code]);

  if (!code) return { status: 'idle' };
  return state.code === code ? state.value : { status: 'loading' };
}
