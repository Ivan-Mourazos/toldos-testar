import type { ResultadoCmt } from './conversion';

interface FicheroGuardable { createWritable: () => Promise<{ write: (blob: Blob) => Promise<unknown>; close: () => Promise<unknown> }> }
type SelectorGuardado = (opciones: { suggestedName: string; types: { description: string; accept: Record<string, string[]> }[] }) => Promise<FicheroGuardable>;
export interface DestinoDescarga {
  seguro: boolean;
  elegir?: SelectorGuardado;
  descargar: (blob: Blob, nombre: string) => void;
}

export function blobCmt(resultado: ResultadoCmt): Blob {
  if (!resultado.ok || !resultado.cmtBase64) throw new Error('Este fichero no tiene un CMT listo para descargar.');
  return new Blob([Uint8Array.from(atob(resultado.cmtBase64), c => c.charCodeAt(0))], { type: 'application/octet-stream' });
}

function destinoDelNavegador(): DestinoDescarga {
  const navegador = window as Window & { showSaveFilePicker?: SelectorGuardado };
  return {
    // En HTTP de la oficina no hay contexto seguro: la descarga normal sigue funcionando.
    seguro: window.isSecureContext,
    elegir: navegador.showSaveFilePicker?.bind(navegador),
    descargar: (blob, nombre) => {
      const url = URL.createObjectURL(blob), enlace = document.createElement('a');
      enlace.href = url; enlace.download = nombre;
      document.body.append(enlace); enlace.click(); enlace.remove();
      // Dejar al navegador recoger el fichero antes de liberar su URL.
      setTimeout(() => URL.revokeObjectURL(url), 60000);
    },
  };
}

export async function descargarCmt(resultado: ResultadoCmt, destino = destinoDelNavegador()): Promise<boolean> {
  const blob = blobCmt(resultado);
  if (destino.seguro && destino.elegir) {
    let fichero: FicheroGuardable;
    try {
      fichero = await destino.elegir({ suggestedName: resultado.nombre,
        types: [{ description: 'Corte CUTMatic', accept: { 'application/octet-stream': ['.cmt'] } }] });
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') return false;
      if (!(error instanceof Error) || !['SecurityError', 'NotAllowedError'].includes(error.name)) throw error;
      destino.descargar(blob, resultado.nombre);
      return true;
    }
    const escritura = await fichero.createWritable();
    await escritura.write(blob);
    await escritura.close();
    return true;
  }
  destino.descargar(blob, resultado.nombre);
  return true;
}

export async function descargarTodos(resultados: ResultadoCmt[], guardar = descargarCmt): Promise<void> {
  for (const resultado of resultados) {
    if (resultado.ok && resultado.cmtBase64 && !await guardar(resultado)) return;
  }
}
