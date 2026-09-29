// Estado de las OF en CoordinaOT (diseño 29/09/2026). CoordinaOT aprueba y devuelve;
// aquí solo se pregunta por su ruta de solo lectura /api/integracion/ofs, con la clave
// compartida en la cabecera. Cuatro segundos como mucho y 30 s de memoria por OF, para
// que Pedidos no pregunte de más; «Generar archivos» pide siempre fresco.

import { COORDINA_NOT_CONFIGURED_MOTIVO, normalizeOf } from './reviewRules.js';

const CHUNK = 50;
// CoordinaOT rechaza con 400 toda la lista si una OF no cumple esto; por eso las que no
// lo cumplen no se envían y se marcan aquí, y una OF mal tecleada no tira el resto.
const VALID_OF = /^\d{5,9}$/;
const invalidEntry = () => ({ estado: 'invalida', nota: '', actualizado: null, revisor: '' });

export function createCoordinaClient({ url, key, fetchImpl = fetch, timeoutMs = 4000, cacheMs = 30000, now = () => Date.now() }) {
  const cache = new Map();
  const base = String(url || '').replace(/\/+$/, '');

  async function statusOf(ofs, { fresh = false } = {}) {
    if (!base || !key) return { disponible: false, motivo: COORDINA_NOT_CONFIGURED_MOTIVO };
    const wanted = [...new Set(ofs.map(normalizeOf).filter(Boolean))];
    const result = {};
    const missing = [];
    for (const of of wanted) {
      if (!VALID_OF.test(of)) { result[of] = invalidEntry(); continue; }
      const hit = cache.get(of);
      if (!fresh && hit && now() - hit.at < cacheMs) result[of] = hit.value;
      else missing.push(of);
    }
    try {
      for (let index = 0; index < missing.length; index += CHUNK) {
        const chunk = missing.slice(index, index + CHUNK);
        const response = await fetchImpl(`${base}/api/integracion/ofs?ofs=${chunk.map(encodeURIComponent).join(',')}`, {
          headers: { 'X-Clave-Integracion': key },
          signal: AbortSignal.timeout(timeoutMs)
        });
        if (!response.ok) return { disponible: false, motivo: `CoordinaOT respondió ${response.status}.` };
        const data = await response.json();
        for (const item of data.ofs || []) {
          const value = { estado: String(item.estado || 'sin_estado'), nota: String(item.nota || ''), actualizado: item.actualizado ?? null, revisor: String(item.revisor || '') };
          cache.set(item.of, { at: now(), value });
          result[item.of] = value;
        }
      }
    } catch {
      return { disponible: false, motivo: 'CoordinaOT no responde.' };
    }
    return { disponible: true, ofs: result };
  }

  return { statusOf };
}
