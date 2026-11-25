import React from 'react';

export type VistaPedido = 'datos' | 'cad';

export function PestanasVistaPedido({ vista, onChange }: { vista: VistaPedido; onChange: (vista: VistaPedido) => void }) {
  return <div className="orders-scope tira-3d glass-chip" role="group" aria-label="Contenido de la vista previa">
    <button type="button" className={vista === 'datos' ? 'pestana-activa' : undefined} aria-pressed={vista === 'datos'} onClick={() => onChange('datos')}>Hojas de datos</button>
    <button type="button" className={vista === 'cad' ? 'pestana-activa' : undefined} aria-pressed={vista === 'cad'} onClick={() => onChange('cad')}>Dibujo CAD</button>
  </div>;
}
