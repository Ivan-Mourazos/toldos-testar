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

function normalizeOfList(ofs: readonly string[] = []): string[] {
  return [...new Set(ofs.map((of) => of.trim()).filter(Boolean))].sort();
}

function cacheKey(code: string, ofsKey: string): string {
  return `${code}|${ofsKey}`;
}

// Las propuestas consultan sus opciones juntas y comparten la caché por artículo
// y juego de OF del pedido con las líneas de tela elegida, incluida la bamba.
export async function loadFabricStocks(codes: string[], ofs: readonly string[] = []): Promise<Record<string, FabricStockState>> {
  const unique = [...new Set(codes.filter(Boolean))];
  const ofsKey = normalizeOfList(ofs).join(',');
  const missing = unique.filter((code) => {
    const cached = cache.get(cacheKey(code, ofsKey));
    return !cached || Date.now() - cached.at >= ttlMs;
  });
  if (missing.length) {
    const ofsParam = ofsKey ? `&ofs=${encodeURIComponent(ofsKey)}` : '';
    const request = fetch(`/api/catalog/fabrics/stock?codes=${encodeURIComponent(missing.join(','))}${ofsParam}`)
    .then(async (response) => {
      const data = await response.json();
      if (!response.ok || !Array.isArray(data.items)) throw new Error(data.error || 'Stock no disponible ahora');
      return new Map<string, FabricStock>(data.items.map((stock: FabricStock) => [stock.code.toUpperCase(), stock]));
    });
    for (const code of missing) {
      const key = cacheKey(code, ofsKey);
      const promise = request.then((stocks) => {
        const stock = stocks.get(code);
        if (!stock) throw new Error('Stock no disponible ahora');
        return stock;
      });
      cache.set(key, { at: Date.now(), promise });
      // Un fallo no se guarda: la próxima vez se vuelve a preguntar.
      promise.catch(() => { if (cache.get(key)?.promise === promise) cache.delete(key); });
    }
  }
  return Object.fromEntries(await Promise.all(unique.map(async (code) => {
    try {
      const stock = await cache.get(cacheKey(code, ofsKey))!.promise;
      return [code, { status: 'ready', stock } as FabricStockState];
    } catch {
      return [code, { status: 'error' } as FabricStockState];
    }
  })));
}

export function useFabricStocks(codes: string[], ofs: readonly string[] = []): Record<string, FabricStockState> {
  const codesKey = [...new Set(codes.filter(Boolean))].sort().join(',');
  const ofsKey = normalizeOfList(ofs).join(',');
  const key = codesKey ? `${codesKey}|${ofsKey}` : '';
  const [state, setState] = useState<{ key: string; value: Record<string, FabricStockState> }>({ key: '', value: {} });

  useEffect(() => {
    if (!key) return undefined;
    let active = true;
    loadFabricStocks(codesKey.split(','), ofsKey ? ofsKey.split(',') : []).then((value) => { if (active) setState({ key, value }); });
    return () => { active = false; };
  }, [key, codesKey, ofsKey]);

  if (!key) return {};
  return state.key === key ? state.value : Object.fromEntries(codesKey.split(',').map((code) => [code, { status: 'loading' }]));
}

export function useFabricStock(code: string, ofs: readonly string[] = []): FabricStockState {
  return useFabricStocks([code], ofs)[code] ?? { status: 'idle' };
}
