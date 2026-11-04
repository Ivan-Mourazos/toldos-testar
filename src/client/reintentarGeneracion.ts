/** Un reinicio puede cortar también la lectura del cuerpo: se repite la petición completa. */
export async function solicitarGeneracion<T>(url: string, init: RequestInit, leer: (respuesta: Response) => Promise<T>, alReintentar: () => void): Promise<T> {
  for (let intento = 0; ; intento++) {
    init.signal?.throwIfAborted();
    try {
      const respuesta = await fetch(url, init);
      if (respuesta.status === 503) {
        const datos = await respuesta.clone().json().catch(() => ({})) as { error?: string };
        if (datos.error?.startsWith('El servidor se está cerrando')) throw new ErrorReinicio(datos.error);
      }
      return await leer(respuesta);
    } catch (error) {
      if (init.signal?.aborted || intento >= 2 || !(error instanceof TypeError || error instanceof ErrorReinicio)) throw error;
      if (intento === 0) alReintentar();
      await esperarReinicio(3_000, init.signal);
    }
  }
}

class ErrorReinicio extends Error {}

function esperarReinicio(ms: number, signal?: AbortSignal | null): Promise<void> {
  signal?.throwIfAborted();
  return new Promise((resolve, reject) => {
    const cancelar = () => { clearTimeout(timer); reject(signal?.reason); };
    const timer = setTimeout(() => { signal?.removeEventListener('abort', cancelar); resolve(); }, ms);
    signal?.addEventListener('abort', cancelar, { once: true });
  });
}
