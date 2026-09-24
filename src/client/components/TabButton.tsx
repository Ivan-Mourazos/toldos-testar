import React from 'react';

export function TabButton({ active, disabled = false, icon, label, onClick }: {
  active: boolean;
  disabled?: boolean;
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button className={active ? 'active tecla-3d sobre-oscuro' : 'tecla-3d sobre-oscuro'} aria-current={active ? 'page' : undefined} type="button" disabled={disabled} onClick={onClick}>
      {icon}
      {label}
    </button>
  );
}
