import React from 'react';

export function TabButton({ active, icon, label, onClick }: { active: boolean; icon: React.ReactNode; label: string; onClick: () => void }) {
  return (
    <button className={active ? 'active' : ''} type="button" onClick={onClick}>
      {icon}
      {label}
    </button>
  );
}
