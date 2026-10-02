import React from 'react';

// Acciones del pedido entero; añadir o quitar elementos pertenece a su propia sección.
export function OrderActions({ children, hidden = false }: { children: React.ReactNode; hidden?: boolean }) {
  return <div className="topbar-actions order-actions" role="group" aria-label="Acciones del pedido" hidden={hidden}>{children}</div>;
}
