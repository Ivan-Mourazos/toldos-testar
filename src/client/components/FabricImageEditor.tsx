import React, { useRef, useState } from 'react';
import { ImagePlus, Image as ImageIcon, PencilRuler, RotateCcw, Upload } from 'lucide-react';
import type { Awning } from '../types';

// De dónde sale el dibujo de este toldo en el PDF (resolveConfiguredDrawing).
export type DrawingSource = { kind: 'web' } | { kind: 'library'; name: string } | { kind: 'manual' };

// Iván, 25/09/2026: el flujo de las imágenes tenía que entenderse solo. Encima del dibujo
// se dice qué sale en el PDF y hay un único sitio para cambiarlo: poner una imagen propia
// (archivo, arrastrar o Ctrl+V) o quitarla y volver al dibujo. La imagen se guarda con el
// pedido y solo cambia este toldo.
export function FabricImageEditor({ awning, source, onUpdate }: {
  awning: Awning;
  source: DrawingSource;
  onUpdate: (id: string, patch: Partial<Awning>) => void;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [choosing, setChoosing] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const fallback = source.kind === 'library' ? `el dibujo del taller «${source.name}»` : 'el dibujo de la web';

  async function importImage(blob: Blob) {
    if (busy) return;
    setError(''); setBusy(true);
    try {
      if (!['image/png', 'image/jpeg', 'image/webp'].includes(blob.type)) throw new Error('Tiene que ser una imagen PNG, JPG o WebP.');
      if (blob.size > 20 * 1024 * 1024) throw new Error('La imagen pasa de 20 MB. Elige una más pequeña.');
      const bitmap = await createImageBitmap(blob);
      try {
        // Se guarda dentro del pedido: se reduce a 1800 px y a menos de 600 KB.
        const scale = Math.min(1, 1800 / Math.max(bitmap.width, bitmap.height));
        const canvas = document.createElement('canvas');
        canvas.width = Math.max(1, Math.round(bitmap.width * scale)); canvas.height = Math.max(1, Math.round(bitmap.height * scale));
        const ctx = canvas.getContext('2d');
        if (!ctx) throw new Error('No se pudo preparar la imagen.');
        ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
        let data = canvas.toDataURL('image/jpeg', 0.9);
        for (const quality of [0.8, 0.65, 0.5, 0.35]) { if (data.length <= 600000) break; data = canvas.toDataURL('image/jpeg', quality); }
        if (data.length > 600000) throw new Error('La imagen sigue siendo demasiado grande. Recórtala o elige otra.');
        onUpdate(awning.id, { fabricImage: data });
        setChoosing(false);
      } finally { bitmap.close(); }
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'No se pudo leer la imagen.'); }
    finally { setBusy(false); }
  }

  const pick = () => input.current?.click();
  const fileInput = <input ref={input} type="file" accept="image/png,image/jpeg,image/webp" hidden onChange={(event) => { const file = event.target.files?.[0]; event.target.value = ''; if (file) void importImage(file); }} />;

  const current = source.kind === 'manual'
    ? <><ImageIcon aria-hidden="true" /><span>En el PDF sale <strong>una imagen puesta en este toldo</strong>.</span></>
    : source.kind === 'library'
      ? <><PencilRuler aria-hidden="true" /><span>En el PDF sale <strong>el dibujo del taller «{source.name}»</strong> (Parámetros).</span></>
      : <><PencilRuler aria-hidden="true" /><span>En el PDF sale <strong>el dibujo de la web</strong>.</span></>;

  return (
    <section className="drawing-source" aria-label="Dibujo que sale en el PDF">
      <div className="drawing-source-bar">
        <p className="drawing-source-current">{current}</p>
        <div className="drawing-source-actions">
          {source.kind === 'manual' ? <>
            <button type="button" className="ghost-button" disabled={busy} onClick={pick}><Upload aria-hidden="true" />Cambiar imagen</button>
            <button type="button" className="ghost-button" disabled={busy} onClick={() => { setError(''); onUpdate(awning.id, { fabricImage: null }); }}><RotateCcw aria-hidden="true" />Quitar imagen</button>
          </> : !choosing && (
            <button type="button" className="ghost-button" onClick={() => { setError(''); setChoosing(true); }}><ImagePlus aria-hidden="true" />Poner una imagen propia</button>
          )}
        </div>
      </div>
      {source.kind === 'manual' && <p className="drawing-source-note">Solo para este toldo. Se guarda con el pedido. Si la quitas, vuelve {fallback}.</p>}
      {choosing && source.kind !== 'manual' && (
        <div
          className={dragging ? 'drawing-source-drop is-dragging' : 'drawing-source-drop'}
          tabIndex={0}
          role="group"
          aria-label="Poner una imagen propia: arrastra, pega con Ctrl+V o elige un archivo"
          onPaste={(event) => {
            const file = Array.from(event.clipboardData.items).find((item) => item.type.startsWith('image/'))?.getAsFile();
            if (file) { event.preventDefault(); void importImage(file); }
            else setError('Lo copiado no es una imagen. Copia la foto o el dibujo y vuelve a pulsar Ctrl+V aquí.');
          }}
          onDragOver={(event) => { event.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={(event) => {
            event.preventDefault(); setDragging(false);
            const file = event.dataTransfer.files?.[0];
            if (file) void importImage(file);
          }}
          ref={(element) => element?.focus()}
        >
          <ImagePlus aria-hidden="true" />
          <strong>Arrastra aquí la imagen o pégala con Ctrl+V</strong>
          <span>o <button type="button" className="link-button" disabled={busy} onClick={pick}>elige un archivo</button> · PNG, JPG o WebP</span>
          <small>Sustituye al dibujo solo en este toldo y se guarda con el pedido.</small>
          <button type="button" className="ghost-button drawing-source-cancel" onClick={() => { setChoosing(false); setError(''); }}>Cancelar</button>
        </div>
      )}
      {fileInput}
      {busy && <p className="drawing-source-note" role="status">Preparando la imagen…</p>}
      {error && <p className="drawing-source-error" role="alert">{error}</p>}
    </section>
  );
}
