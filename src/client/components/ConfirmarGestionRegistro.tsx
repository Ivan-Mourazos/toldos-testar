import React, { useEffect, useId, useRef, useState } from 'react';

export type GestionRegistro = 'terminar' | 'reabrir' | 'papelera';

const etiquetas = {
  terminar: 'Marcar como terminado',
  reabrir: 'Volver a pendiente',
  papelera: 'Enviar a la papelera'
};

export function ConfirmarGestionRegistro({ accion, codigo, onClose, onConfirmar }: {
  accion: GestionRegistro; codigo: string; onClose: () => void; onConfirmar: (texto: string) => void;
}) {
  const dialogo = useRef<HTMLDialogElement>(null);
  const titulo = useId();
  const [texto, setTexto] = useState('');
  const papelera = accion === 'papelera';
  const terminar = accion === 'terminar';
  const puedeConfirmar = !papelera || texto === codigo;
  useEffect(() => {
    const modal = dialogo.current;
    modal?.showModal();
    if (!papelera) modal?.querySelector<HTMLButtonElement>('footer button')?.focus();
  }, [papelera]);

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
      {papelera && <label>
        {`Escribe ${codigo} para confirmar`}
        <input type="text" value={texto} onChange={event => setTexto(event.target.value)}
          maxLength={codigo.length} required autoComplete="off" />
      </label>}
      <footer>
        <button type="button" className="ghost-button boton-3d" onClick={() => dialogo.current?.close()}>Cancelar</button>
        <button type="submit" className="primary-button boton-3d" disabled={!puedeConfirmar}>{etiquetas[accion]}</button>
      </footer>
    </form>
  </dialog>;
}
