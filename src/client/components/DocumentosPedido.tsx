import React from 'react';
import '../coordina/documentos-pedido.css';

/** Cada producto aporta sus documentos; la disposición y las cabeceras son comunes. */
export function DocumentosPedido({ planteamiento, corte }: { planteamiento: React.ReactNode; corte?: React.ReactNode }) {
  return <div className="review-documentos">
    <div className="documento-planteamiento">{planteamiento}</div>
    <div className="documento-corte">{corte}</div>
  </div>;
}

export function CabeceraDocumento({ titulo, icono, children }: {
  titulo: string; icono: React.ReactNode; children?: React.ReactNode;
}) {
  return <header className="corte-cabecera documento-cabecera">
    <span className="corte-titulo">{icono}<h2>{titulo}</h2></span>
    {children}
  </header>;
}
