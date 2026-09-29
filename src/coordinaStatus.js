// Estado de las OF en CoordinaOT (diseño 29/09/2026). CoordinaOT aprueba y devuelve;
// aquí solo se pregunta por su ruta de solo lectura /api/integracion/ofs, con la clave
// compartida en la cabecera. Cuatro segundos como mucho y 30 s de memoria por OF, para
// que Pedidos no pregunte de más; «Generar archivos» pide siempre fresco.

const CHUNK = 50;

export function createCoordinaClient({ url, key, fetchImpl = fetch, timeoutMs = 4000, cacheMs = 30000, now = () => Date.now() }) {
  const cache = new Map();
  const base = String(url || '').replace(/\/+$/, '');

  async function statusOf(ofs, { fresh = false } = {}) {
    if (!base || !key) return { disponible: false, motivo: 'CoordinaOT no está configurado.' };
    const wanted = [...new Set(ofs.map((of) => String(of ?? '').trim()).filter(Boolean))];
    const result = {};
    const missing = [];
    for (const of of wanted) {
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
