import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { FileText, Maximize2, RefreshCw, X } from 'lucide-react';
import { CabeceraDocumento } from './DocumentosPedido';
import { PdfPreviewViewer } from './PdfPreviewViewer';

/** Mantiene el mismo visor al ampliar: ni se vuelve a pedir el PDF ni se pierde la página. */
export function PlanteamientoPedido({ origen, cuerpo, version = '' }: { origen: string; cuerpo?: string; version?: string }) {
  const clave = JSON.stringify([origen, cuerpo, version]);
  return <Planteamiento key={clave} origen={origen} cuerpo={cuerpo} />;
}

function Planteamiento({ origen, cuerpo }: { origen: string; cuerpo?: string }) {
  const [url, setUrl] = useState('');
  const [error, setError] = useState('');
  const [intento, setIntento] = useState(0);
  const [ampliado, setAmpliado] = useState(false);
  const dialogo = useRef<HTMLDialogElement>(null);
  const abrir = useRef<HTMLButtonElement>(null);
  const cerrar = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const controller = new AbortController();
    let objectUrl = '';
    async function cargar() {
      try {
        const respuesta = await fetch(origen, {
          ...(cuerpo === undefined ? { cache: 'no-store' as const } : {
            method: 'POST', headers: { 'Content-Type': 'application/json' }, body: cuerpo,
          }),
          signal: controller.signal,
        });
        if (!respuesta.ok) {
          const datos = await respuesta.json().catch(() => ({}));
          throw new Error(datos.error || 'No se pudo preparar el planteamiento.');
        }
        const blob = await respuesta.blob();
        if (controller.signal.aborted) return;
        objectUrl = URL.createObjectURL(blob);
        setUrl(objectUrl);
      } catch (e) {
        if (!controller.signal.aborted) setError(e instanceof Error ? e.message : 'No se pudo preparar el planteamiento.');
      }
    }
    void cargar();
    return () => { controller.abort(); if (objectUrl) URL.revokeObjectURL(objectUrl); };
  }, [origen, cuerpo, intento]);

  useLayoutEffect(() => {
    const elemento = dialogo.current;
    if (!elemento || !ampliado) return;
    const overflow = document.body.style.overflow;
    const boton = abrir.current;
    elemento.close();
    elemento.showModal();
    document.body.style.overflow = 'hidden';
    cerrar.current?.focus();
    return () => {
      elemento.close();
      elemento.open = true;
      document.body.style.overflow = overflow;
      requestAnimationFrame(() => boton?.focus({ preventScroll: true }));
    };
  }, [ampliado]);

  return <dialog ref={dialogo} open={!ampliado} className="planteamiento-pedido panel bloque-3d"
    role={ampliado ? 'dialog' : 'region'} aria-modal={ampliado || undefined} aria-label="Planteamiento"
    onCancel={(evento) => { evento.preventDefault(); setAmpliado(false); }}>
    <CabeceraDocumento titulo="Planteamiento" icono={<FileText aria-hidden="true" />}>
      <div className="documento-acciones">
        {error && <button type="button" className="ghost-button boton-3d" onClick={() => { setError(''); setIntento(i => i + 1); }}><RefreshCw aria-hidden="true" />Reintentar</button>}
        <button ref={abrir} type="button" hidden={ampliado} className="ghost-button boton-3d" onClick={() => setAmpliado(true)}><Maximize2 aria-hidden="true" />Abrir en grande</button>
        <button ref={cerrar} type="button" hidden={!ampliado} className="icon-button" aria-label="Cerrar vista previa" onClick={() => setAmpliado(false)}><X aria-hidden="true" /></button>
      </div>
    </CabeceraDocumento>
    {!url && !error && <p className="documento-espera" role="status">Preparando el planteamiento…</p>}
    {error && <p className="corte-aviso" role="alert">{error}</p>}
    {url && <PdfPreviewViewer url={url} ariaLabel="Planteamiento del pedido" />}
  </dialog>;
}
