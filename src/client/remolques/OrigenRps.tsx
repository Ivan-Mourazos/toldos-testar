import React from 'react';
import type { OrigenRps } from '../../remolques/rps/types.ts';

// De qué línea de RPS salió el elemento abierto y qué hay que comprobar a mano. Antes esto salía
// debajo de la línea elegida en el selector de la cabecera; con un elemento por línea creado de
// una vez (Iván, 30/09/2026), va con el elemento, encima de su formulario.
export function OrigenRpsElemento({ origen }: { origen: OrigenRps }) {
  const avisos = origen.avisos ?? [];
  return (
    <div className={`rem-rps-origen${origen.requiereRevision ? ' is-revisar' : ''}`} role="note" aria-label="Datos de RPS">
      <p className="rem-rps-linea-titulo">
        <strong>De RPS · Línea {origen.numeroLinea}</strong>
        {origen.ordenFabricacion && <span className="rem-rps-of">OF {origen.ordenFabricacion}</span>}
        {origen.requiereRevision && <span className="pildora-aviso rem-etiqueta">Revisar</span>}
        <span className="rem-rps-ok">Datos copiados y editables</span>
      </p>
      {avisos.length > 0 && (
        <ul className="rem-rps-origen-avisos">
          {avisos.map((aviso) => <li key={aviso}>{aviso}</li>)}
        </ul>
      )}
      {origen.texto && <p className="rem-rps-detalle" title={origen.texto}>{origen.texto}</p>}
    </div>
  );
}
