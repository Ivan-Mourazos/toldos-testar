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

// Las propuestas consultan sus opciones juntas y comparten la caché por artículo
// con las líneas de tela elegida, incluida la bamba.
export async function loadFabricStocks(codes: string[]): Promise<Record<string, FabricStockState>> {
  const unique = [...new Set(codes.filter(Boolean))];
  const missing = unique.filter((code) => {
    const cached = cache.get(code);
    return !cached || Date.now() - cached.at >= ttlMs;
  });
  if (missing.length) {
    const request = fetch(`/api/catalog/fabrics/stock?codes=${encodeURIComponent(missing.join(','))}`)
    .then(async (response) => {
      const data = await response.json();
      if (!response.ok || !Array.isArray(data.items)) throw new Error(data.error || 'Stock no disponible ahora');
      return new Map<string, FabricStock>(data.items.map((stock: FabricStock) => [stock.code.toUpperCase(), stock]));
    });
    for (const code of missing) {
      const promise = request.then((stocks) => {
        const stock = stocks.get(code);
        if (!stock) throw new Error('Stock no disponible ahora');
        return stock;
      });
      cache.set(code, { at: Date.now(), promise });
      // Un fallo no se guarda: la próxima vez se vuelve a preguntar.
      promise.catch(() => { if (cache.get(code)?.promise === promise) cache.delete(code); });
    }
  }
  return Object.fromEntries(await Promise.all(unique.map(async (code) => {
    try {
      const stock = await cache.get(code)!.promise;
      return [code, { status: 'ready', stock } as FabricStockState];
    } catch {
      return [code, { status: 'error' } as FabricStockState];
    }
  })));
}

export function useFabricStocks(codes: string[]): Record<string, FabricStockState> {
  const key = [...new Set(codes.filter(Boolean))].sort().join(',');
  const [state, setState] = useState<{ key: string; value: Record<string, FabricStockState> }>({ key: '', value: {} });

  useEffect(() => {
    if (!key) return undefined;
    let active = true;
    loadFabricStocks(key.split(',')).then((value) => { if (active) setState({ key, value }); });
    return () => { active = false; };
  }, [key]);

  if (!key) return {};
  return state.key === key ? state.value : Object.fromEntries(key.split(',').map((code) => [code, { status: 'loading' }]));
}

export function useFabricStock(code: string): FabricStockState {
  return useFabricStocks([code])[code] ?? { status: 'idle' };
}
