import { buildFabricHistory } from './domain/fabricHistory.js';
import { summarizeFabricStock } from './domain/fabricStock.js';

// Lecturas de RPS para la tela (informe tmp/tela-0930) con caché en memoria. La
// consulta se inyecta (`loadRows`): en el servidor son las de rpsCatalog.js y en las
// pruebas, funciones falsas. Nada de esto escribe en RPS.

// Un valor que se carga una vez y vale `ttlMs`. Dos peticiones a la vez comparten la
// misma consulta; si falla, la siguiente petición lo vuelve a intentar.
export function createCachedValue({ load, ttlMs, now = Date.now }) {
  let cache = null;
  let pending = null;
  return {
    async get() {
      if (cache && cache.expiresAt > now()) return cache.value;
      if (pending) return pending;
      pending = (async () => {
        const value = await load();
        cache = { value, expiresAt: now() + ttlMs };
        return value;
      })().finally(() => {
        pending = null;
      });
      return pending;
    },
    reset() {
      cache = null;
      pending = null;
    }
  };
}

// Stock de lonas: se lee entero (unos 170 ms) y se guarda 60 s, para que abrir
// tarjetas no multiplique consultas.
export function createFabricStockService({ loadRows, ttlMs = 60_000, now = Date.now }) {
  const rows = createCachedValue({
    load: async () => ({ rows: await loadRows(), consultado: new Date(now()).toISOString() }),
    ttlMs,
    now
  });
  return {
    async getStock(codes) {
      const { rows: stockRows, consultado } = await rows.get();
      return codes.map((code) => ({ ...summarizeFabricStock(stockRows, code), consultado }));
    },
    reset: rows.reset
  };
}

// Historial de la frase de tela: 12 meses de OF, se guarda 24 h. El autorrelleno no
// espera más de `waitMs` por él: sin historial la propuesta es la 1.ª del buscador.
export function createFabricHistoryService({ loadRows, ttlMs = 24 * 60 * 60 * 1000, now = Date.now }) {
  const history = createCachedValue({ load: async () => buildFabricHistory(await loadRows()), ttlMs, now });
  return {
    get: history.get,
    async getWithin(waitMs) {
      let timer;
      const timeout = new Promise((resolve) => { timer = setTimeout(() => resolve(null), waitMs); });
      try {
        return await Promise.race([history.get().catch((error) => {
          console.error('No se pudo leer el historial de telas de RPS:', error?.message || error);
          return null;
        }), timeout]);
      } finally {
        clearTimeout(timer);
      }
    },
    reset: history.reset
  };
}

// GET /api/catalog/fabrics/stock?codes=A,B. Si RPS no responde, 503 con un texto que
// la web enseña tal cual: el pedido nunca se bloquea por esto.
export function fabricStockHandler(service) {
  return async (req, res) => {
    const codes = parseCodes(req.query?.codes);
    if (codes.length === 0) return res.status(400).json({ error: 'Indica al menos un código de tela.' });
    try {
      return res.json({ source: 'RPSNext', items: await service.getStock(codes) });
    } catch (error) {
      console.error('RPSNext no disponible para el stock de telas:', error?.message || error);
      return res.status(503).json({ error: 'Stock no disponible ahora' });
    }
  };
}

function parseCodes(value) {
  const list = String(Array.isArray(value) ? value.join(',') : value || '')
    .split(',')
    .map((code) => code.trim().toUpperCase())
    // La barra la llevan algunas lonas de remolque (NS86B16P/NP250). Los códigos solo se
    // comparan con las filas ya leídas: nunca entran en la consulta.
    .filter((code) => /^[A-Z0-9._/-]{1,40}$/.test(code));
  return [...new Set(list)].slice(0, 20);
}
