import React, { useEffect, useState } from 'react';
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import { RUTA_PARAMETROS } from '../parametrosToldos';

export const rutaMiniatura = (model: string, variant: string) =>
  `${RUTA_PARAMETROS}/drawing-preview?model=${encodeURIComponent(model)}&variant=${encodeURIComponent(variant)}`;

// Cada miniatura se pide y se pinta una vez por sesión: al volver al modelo sale al momento.
const cache = new Map<string, Promise<string>>();

async function pintar(url: string): Promise<string> {
  const { getDocument, GlobalWorkerOptions } = await import('pdfjs-dist');
  GlobalWorkerOptions.workerSrc = pdfWorkerUrl;
  const response = await fetch(url);
  if (!response.ok) throw new Error(`No se pudo pedir el dibujo (${response.status}).`);
  const task = getDocument({ data: new Uint8Array(await response.arrayBuffer()) });
  try {
    const pdf = await task.promise;
    const page = await pdf.getPage(1);
    const viewport = page.getViewport({ scale: 2 });
    const canvas = document.createElement('canvas');
    canvas.width = Math.ceil(viewport.width);
    canvas.height = Math.ceil(viewport.height);
    const context = canvas.getContext('2d');
    if (!context) throw new Error('No se pudo preparar la miniatura.');
    await page.render({ canvas, canvasContext: context, viewport }).promise;
    return canvas.toDataURL('image/png');
  } finally {
    void task.destroy();
  }
}

export function miniaturaDibujo(url: string): Promise<string> {
  let promesa = cache.get(url);
  if (!promesa) {
    promesa = pintar(url);
    cache.set(url, promesa);
    promesa.catch(() => cache.delete(url));
  }
  return promesa;
}

/** La miniatura del dibujo de la web de una variante: la hace el servidor con el código del PDF. */
export function MiniaturaDibujo({ model, variant, label }: { model: string; variant: string; label: string }) {
  const url = rutaMiniatura(model, variant);
  const [leida, setLeida] = useState<{ url: string; src: string; error: boolean } | null>(null);
  useEffect(() => {
    let activo = true;
    miniaturaDibujo(url).then(
      (src) => { if (activo) setLeida({ url, src, error: false }); },
      () => { if (activo) setLeida({ url, src: '', error: true }); }
    );
    return () => { activo = false; };
  }, [url]);
  const actual = leida?.url === url ? leida : null;
  if (!actual) return <div className="drawing-today-thumb is-loading" role="status">Preparando dibujo…</div>;
  if (actual.error) return <div className="drawing-today-thumb is-error" role="alert">No se pudo preparar el dibujo.</div>;
  return <img className="drawing-today-thumb" src={actual.src} alt={`Dibujo de la web · ${label}`} />;
}
