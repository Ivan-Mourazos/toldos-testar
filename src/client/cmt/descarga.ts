import type { PlanoPreparado, ResultadoCmt } from './conversion';

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

export async function descargarCmt(resultado: ResultadoCmt | PlanoPreparado, destino = destinoDelNavegador()): Promise<boolean> {
  if ('listo' in resultado) return guardarArchivo(archivoPreparado(resultado, 'cmt'), destino);
  return guardarArchivo({ blob: blobCmt(resultado), nombre: resultado.nombre, extension: 'cmt' }, destino);
}

type Archivo = { blob: Blob; nombre: string; extension: 'dxf' | 'cmt' };

function archivoPreparado(r: PlanoPreparado, extension: Archivo['extension']): Archivo {
  const base64 = extension === 'dxf' ? r.dxfBase64 : r.cmtBase64;
  const nombre = extension === 'dxf' ? r.nombreDxf : r.nombreCmt;
  if (!r.listo || !nombre || !base64) throw new Error(`Este fichero no tiene el ${extension.toUpperCase()} listo para descargar.`);
  const blob = new Blob([Uint8Array.from(atob(base64), c => c.charCodeAt(0))], { type: 'application/octet-stream' });
  return { blob, nombre, extension };
}

export async function descargarDxf(r: PlanoPreparado, destino = destinoDelNavegador()) {
  return guardarArchivo(archivoPreparado(r, 'dxf'), destino);
}

export async function descargarPlanos(planos: PlanoPreparado[], destino = destinoDelNavegador()) {
  let descargados = 0, omitidos = 0;
  for (const plano of planos) {
    if (!plano.listo) {
      omitidos++;
      continue;
    }
    for (const extension of ['dxf', 'cmt'] as const) {
      const { blob, nombre } = archivoPreparado(plano, extension);
      destino.descargar(blob, nombre);
    }
    descargados++;
  }
  return { descargados, omitidos };
}

async function guardarArchivo({ blob, nombre, extension }: Archivo, destino: DestinoDescarga): Promise<boolean> {
  if (destino.seguro && destino.elegir) {
    let fichero: FicheroGuardable;
    try {
      fichero = await destino.elegir({ suggestedName: nombre,
        types: [{ description: extension === 'cmt' ? 'Corte CUTMatic' : 'Plano de corte DXF', accept: { 'application/octet-stream': [`.${extension}`] } }] });
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') return false;
      if (!(error instanceof Error) || !['SecurityError', 'NotAllowedError'].includes(error.name)) throw error;
      destino.descargar(blob, nombre);
      return true;
    }
    const escritura = await fichero.createWritable();
    await escritura.write(blob);
    await escritura.close();
    return true;
  }
  destino.descargar(blob, nombre);
  return true;
}

export async function descargarTodos(resultados: ResultadoCmt[], guardar: (resultado: ResultadoCmt) => Promise<boolean> = descargarCmt): Promise<void> {
  for (const resultado of resultados) {
    if (resultado.ok && resultado.cmtBase64 && !await guardar(resultado)) return;
  }
}
