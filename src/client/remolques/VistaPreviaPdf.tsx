import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Eye, X } from 'lucide-react';
import type { Notify } from '../components/NotificationCenter';
import { PdfPreviewViewer } from '../components/PdfPreviewViewer';
import type { LineaPedido } from '../../remolques/workspace/lineas.ts';
import { cuerpoVistaPrevia } from './vistaPrevia';

// «Vista previa del PDF» de remolques (fase 4): pide al servidor la hoja de taller del pedido y la
// abre en el mismo visor que toldos. No guarda nada en ninguna carpeta.
export function VistaPreviaPdf({ lineas, bloqueo, notify }: {
  lineas: LineaPedido[];
  /** Qué falta, o null si se puede pedir. */
  bloqueo: string | null;
  notify: Notify;
}) {
  const [url, setUrl] = useState('');
  const [preparando, setPreparando] = useState(false);
  const boton = useRef<HTMLButtonElement>(null);
  const dialogo = useRef<HTMLDivElement>(null);

  useEffect(() => () => {
    if (url) URL.revokeObjectURL(url);
  }, [url]);

  useEffect(() => {
    if (!url) return undefined;
    const foco = requestAnimationFrame(() => dialogo.current?.querySelector<HTMLElement>('.pdf-carousel')?.focus());
    const alPulsar = (evento: KeyboardEvent) => {
      if (evento.key !== 'Escape') return;
      evento.preventDefault();
      setUrl('');
      requestAnimationFrame(() => boton.current?.focus());
    };
    window.addEventListener('keydown', alPulsar);
    return () => {
      cancelAnimationFrame(foco);
      window.removeEventListener('keydown', alPulsar);
    };
  }, [url]);

  async function abrir() {
    if (preparando) return;
    setPreparando(true);
    try {
      const respuesta = await fetch('/api/remolques/pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(cuerpoVistaPrevia(lineas)),
      });
      if (!respuesta.ok) {
        const datos = await respuesta.json().catch(() => ({})) as { error?: string };
        notify(datos.error || 'No se pudo preparar la vista previa del PDF.', { tone: 'error' });
        return;
      }
      setUrl(URL.createObjectURL(await respuesta.blob()));
    } catch {
      notify('No se pudo preparar la vista previa del PDF.', { tone: 'error' });
    } finally {
      setPreparando(false);
    }
  }

  function cerrar() {
    setUrl('');
    requestAnimationFrame(() => boton.current?.focus());
  }

  return (
    <>
      <button ref={boton} type="button" className="ghost-button" disabled={Boolean(bloqueo) || preparando}
        aria-busy={preparando} title={bloqueo ?? undefined} onClick={() => void abrir()}>
        <Eye aria-hidden="true" />
        {preparando ? 'Preparando la hoja de taller…' : 'Vista previa del PDF'}
      </button>
      {/* En el body: dentro del panel, su backdrop-filter recortaría el diálogo a la sección. */}
      {url && createPortal(
        <div ref={dialogo} className="pdf-preview-backdrop" role="dialog" aria-modal="true" aria-label="Vista previa de la hoja de taller">
          <div className="pdf-preview-window">
            <header>
              <div><strong>Vista previa de la hoja de taller</strong><span>Una hoja A4 apaisada por elemento · no se guarda en ninguna carpeta</span></div>
              <div className="pdf-preview-actions">
                <button className="ghost-button" type="button" disabled={preparando} onClick={() => void abrir()}>
                  <Eye aria-hidden="true" />{preparando ? 'Preparando…' : 'Actualizar'}
                </button>
                <button className="icon-button" type="button" onClick={cerrar} aria-label="Cerrar vista previa"><X aria-hidden="true" /></button>
              </div>
            </header>
            <PdfPreviewViewer key={url} url={url} ariaLabel="Hoja de taller de remolques" />
          </div>
        </div>,
        document.body,
      )}
    </>
  );
}
