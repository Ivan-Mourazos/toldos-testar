import React from 'react';

// Pestaña de la cabecera como las de CoordinaOT (ViewSwitcher.tsx): tecla suelta, sin
// icono, y la de la vista en la que estás hundida en dorado (`pestana-activa`). El
// contador va en una píldora como el de «Revisiones»; el « · » se queda para lectores de
// pantalla, así el nombre accesible sigue siendo «Pedidos · N».
export function TabButton({ active, disabled = false, label, count, onClick }: {
  active: boolean;
  disabled?: boolean;
  label: string;
  count?: number;
  onClick: () => void;
}) {
  return (
    <button className={active ? 'pestana pestana-activa' : 'pestana'} aria-current={active ? 'page' : undefined} type="button" disabled={disabled} onClick={onClick}>
      {label}
      {count ? (
        <>
          <span className="sr-only"> · </span>
          <span className="pestana-contador">{count}</span>
        </>
      ) : null}
    </button>
  );
}
