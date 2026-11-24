import React, { useEffect, useId, useRef, useState } from 'react';

export type GestionToldos = 'terminar' | 'reabrir' | 'papelera';

const etiquetas = {
  terminar: 'Marcar como terminado',
  reabrir: 'Volver a pendiente',
  papelera: 'Enviar a la papelera'
};

export function ConfirmarGestionToldos({ accion, codigo, onClose, onConfirmar }: {
  accion: GestionToldos; codigo: string; onClose: () => void; onConfirmar: (texto: string) => void;
}) {
  const dialogo = useRef<HTMLDialogElement>(null);
  const titulo = useId();
  const [texto, setTexto] = useState('');
  const papelera = accion === 'papelera';
  const terminar = accion === 'terminar';
  const puedeConfirmar = papelera ? texto === codigo : !terminar || Boolean(texto.trim());
  useEffect(() => {
    const modal = dialogo.current;
    modal?.showModal();
    if (!terminar) modal?.querySelector<HTMLButtonElement>('footer button')?.focus();
  }, [terminar]);

  return <dialog ref={dialogo} className="destino-entrega gestion-toldos bloque-3d" aria-labelledby={titulo} onClose={onClose}>
    <h2 id={titulo}>{etiquetas[accion]} · {codigo}</h2>
    <form method="dialog" onSubmit={event => {
      event.preventDefault();
      if (!puedeConfirmar) return;
      dialogo.current?.close();
      onConfirmar(texto);
    }}>
      <p>{papelera ? 'El registro quedará en la papelera y podrá recuperarse. Se conservarán sus archivos de producción.'
        : terminar ? 'El pedido pasará al Historial como terminado sin generar.'
          : 'El pedido volverá a aparecer en la bandeja de pendientes.'}</p>
      {accion !== 'reabrir' && <label>
        {papelera ? `Escribe ${codigo} para confirmar` : 'Motivo'}
        <input type="text" value={texto} onChange={event => setTexto(event.target.value)}
          maxLength={papelera ? codigo.length : 200} required autoComplete="off" />
      </label>}
      <footer>
        <button type="button" className="ghost-button boton-3d" onClick={() => dialogo.current?.close()}>Cancelar</button>
        <button type="submit" className="primary-button boton-3d" disabled={!puedeConfirmar}>{etiquetas[accion]}</button>
      </footer>
    </form>
  </dialog>;
}
