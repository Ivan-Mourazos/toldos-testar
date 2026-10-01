import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Eye, X } from 'lucide-react';
import type { Notify } from '../components/NotificationCenter';
import { PdfPreviewViewer } from '../components/PdfPreviewViewer';
import type { CalcParams } from '../../remolques/calc/params.ts';
import type { LineaPedido } from '../../remolques/workspace/lineas.ts';
import { crearGuardaPeticion, peticionVistaPrevia } from './vistaPrevia';

// «Vista previa del PDF» de remolques (fase 4): pide al servidor la hoja de taller del pedido y la
// abre en el mismo visor que toldos. No guarda nada en ninguna carpeta.
export function VistaPreviaPdf({ lineas, params, origen, bloqueo, notify }: {
  lineas?: LineaPedido[];
  /** Los parámetros con que se calcula si no son los comunes («Corregir» un pedido guardado). */
  params?: CalcParams;
  /** Un pedido ya guardado: la hoja se pide a esta dirección con sus datos y parámetros guardados. */
  origen?: string;
  /** Qué falta, o null si se puede pedir. */
  bloqueo: string | null;
  notify: Notify;
}) {
  const [url, setUrl] = useState('');
  const [preparando, setPreparando] = useState(false);
  const boton = useRef<HTMLButtonElement>(null);
  const peticion = useRef('');
  const dialogo = useRef<HTMLDivElement>(null);
  const cerrarRef = useRef<() => void>(() => undefined);
  const guarda = useRef(crearGuardaPeticion());
  const peticionPdf = peticionVistaPrevia({ lineas, params, origen });
  const cuerpo = peticionPdf.clave;

  useEffect(() => () => {
    if (url) URL.revokeObjectURL(url);
  }, [url]);

  // Al desmontar (p. ej. se borra el último elemento) nada en vuelo puede abrir el visor.
  useEffect(() => {
    const g = guarda.current;
    return () => g.invalidar();
  }, []);

  // Si el pedido cambia mientras la hoja se prepara, esa hoja ya no es la de este pedido.
  useEffect(() => {
    if (!preparando) return;
    if (cuerpo !== peticion.current) {
      guarda.current.invalidar();
      setPreparando(false);
    }
  }, [cuerpo, preparando]);

  useEffect(() => {
    if (!url) return undefined;
    const foco = requestAnimationFrame(() => dialogo.current?.querySelector<HTMLElement>('.pdf-carousel')?.focus());
    const alPulsar = (evento: KeyboardEvent) => {
      if (evento.key !== 'Escape') return;
      evento.preventDefault();
      cerrarRef.current();
    };
    window.addEventListener('keydown', alPulsar);
    return () => {
      cancelAnimationFrame(foco);
      window.removeEventListener('keydown', alPulsar);
    };
  }, [url]);

  async function abrir() {
    if (preparando) return;
    const { numero, senal } = guarda.current.nueva();
    peticion.current = cuerpo;
    setPreparando(true);
    try {
      const respuesta = await fetch(peticionPdf.url, { ...peticionPdf.init, signal: senal });
      if (!respuesta.ok) {
        const datos = await respuesta.json().catch(() => ({})) as { error?: string };
        if (guarda.current.vigente(numero)) notify(datos.error || 'No se pudo preparar la vista previa del PDF.', { tone: 'error' });
        return;
      }
      const blob = await respuesta.blob();
      // Llegó tarde (cerrado, desmontado o pedido cambiado): no se abre ni se guarda nada.
      if (!guarda.current.vigente(numero)) return;
      setUrl(URL.createObjectURL(blob));
    } catch {
      if (guarda.current.vigente(numero)) notify('No se pudo preparar la vista previa del PDF.', { tone: 'error' });
    } finally {
      if (guarda.current.vigente(numero)) setPreparando(false);
    }
  }

  function cerrar() {
    guarda.current.invalidar();
    setPreparando(false);
    setUrl('');
    requestAnimationFrame(() => boton.current?.focus());
  }

  useEffect(() => {
    cerrarRef.current = cerrar;
  });

  return (
    <>
      <button ref={boton} type="button" className="ghost-button rem-pdf-boton" disabled={Boolean(bloqueo) || preparando}
        aria-busy={preparando} title={bloqueo ?? undefined} onClick={() => void abrir()}>
        <Eye aria-hidden="true" />
        {preparando ? 'Preparando la hoja…' : 'Vista previa del PDF'}
      </button>
      {/* En el body: dentro del panel, su backdrop-filter recortaría el diálogo a la sección. */}
      {url && createPortal(
        <div ref={dialogo} className="pdf-preview-backdrop" role="dialog" aria-modal="true" aria-label="Vista previa de la hoja de taller">
          <div className="pdf-preview-window">
            <PdfPreviewViewer key={url} url={url} ariaLabel="Hoja de taller de remolques" heading={<strong>Vista previa de la hoja de taller</strong>} actions={<>
                <button className="ghost-button" type="button" disabled={preparando} onClick={() => void abrir()}>
                  <Eye aria-hidden="true" />{preparando ? 'Preparando la hoja…' : 'Actualizar'}
                </button>
                <button className="icon-button" type="button" onClick={cerrar} aria-label="Cerrar vista previa"><X aria-hidden="true" /></button>
            </>} />
          </div>
        </div>,
        document.body,
      )}
    </>
  );
}
