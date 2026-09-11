import React, { useRef, useState } from 'react';
import type { Awning } from '../types';

export function FabricImageEditor({ awning, onUpdate }: { awning: Awning; onUpdate: (id: string, patch: Partial<Awning>) => void }) {
  const input = useRef<HTMLInputElement>(null);
  const pasteArea = useRef<HTMLDivElement>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  async function importImage(blob: Blob) {
    if (busy) return;
    setError(''); setBusy(true);
    try {
      if (!['image/png', 'image/jpeg', 'image/webp'].includes(blob.type)) throw new Error('Selecciona una imagen PNG, JPG o WebP.');
      if (blob.size > 20 * 1024 * 1024) throw new Error('La imagen supera los 20 MB. Elige una más pequeña.');
      const bitmap = await createImageBitmap(blob);
      try {
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
      } finally { bitmap.close(); }
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'No se pudo leer la imagen.'); }
    finally { setBusy(false); }
  }
  async function paste() {
    setError('');
    try {
      if (!navigator.clipboard?.read) throw new Error();
      const items = await navigator.clipboard.read();
      for (const item of items) {
        const type = item.types.find((value) => ['image/png', 'image/jpeg', 'image/webp'].includes(value));
        if (type) { await importImage(await item.getType(type)); return; }
      }
      setError('El portapapeles no contiene una imagen. Copia una foto y pulsa Ctrl+V aquí.');
    } catch { setError('Pulsa Ctrl+V en este recuadro para pegar la imagen.'); pasteArea.current?.focus(); }
  }
  return <div className="fabric-image-editor" ref={pasteArea} tabIndex={0} role="group" aria-label={'Imagen de tela OF ' + (awning.of || 'sin OF')} onPaste={(event) => {
    const item = Array.from(event.clipboardData.items).find((value) => value.type.startsWith('image/'));
    const file = item?.getAsFile();
    if (file) { event.preventDefault(); void importImage(file); }
  }}>
    <strong>Imagen del planteamiento de tela · OF {awning.of || '-'}</strong>
    <p>{awning.fabricImage ? 'Imagen personalizada para este toldo y su PDF.' : 'Se utiliza el dibujo original. Puedes sustituirlo por una imagen para este toldo.'}</p>
    {awning.fabricImage && <img src={awning.fabricImage} alt="Imagen personalizada del planteamiento de tela" />}
    <div className="structure-editor-toolbar">
      <button type="button" disabled={busy} onClick={() => input.current?.click()}>Importar imagen</button>
      <button type="button" disabled={busy} onClick={() => void paste()}>Pegar del portapapeles</button>
      {awning.fabricImage && <button type="button" disabled={busy} onClick={() => { setError(''); onUpdate(awning.id, { fabricImage: null }); }}>Restaurar original</button>}
    </div>
    <input ref={input} type="file" accept="image/png,image/jpeg,image/webp" hidden onChange={(event) => { const file = event.target.files?.[0]; event.target.value = ''; if (file) void importImage(file); }} />
    <small>PNG, JPG o WebP. También puedes hacer clic en este recuadro y pulsar Ctrl+V.</small>
    {busy && <p role="status">Preparando imagen…</p>}
    {error && <p role="alert">{error}</p>}
  </div>;
}
