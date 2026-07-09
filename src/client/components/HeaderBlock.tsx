import React from 'react';

export function HeaderBlock({ orderCode, customer, technician, title }: { orderCode: string; customer: string; technician: string; title: string }) {
  return (
    <div className="sheet-header">
      <div className="sheet-logo">TGM</div>
      <div className="sheet-meta">
        <span>Cliente: <strong>{customer || '-'}</strong></span>
        <span>Técnico: <strong>{technician || '-'}</strong></span>
        <span>Fecha: <strong>{new Date().toLocaleDateString('es-ES')}</strong></span>
      </div>
      <div className="sheet-order">
        <span>Pedido</span>
        <strong>{orderCode || '-'}</strong>
      </div>
      <div className="sheet-title">{title}</div>
    </div>
  );
}
