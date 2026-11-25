import React, { useId, useRef, useState } from 'react';
import { Ellipsis } from 'lucide-react';

export function MenuMas({ children, etiqueta = 'Más', icono }: { children: React.ReactNode; etiqueta?: string; icono?: React.ReactNode }) {
  const [abierto, setAbierto] = useState(false);
  const boton = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const entrarAlAbrir = useRef(false);
  const id = useId();
  const opciones = () => [...(panel.current?.querySelectorAll<HTMLElement>('[role="menuitem"]:not(:disabled):not([aria-disabled="true"])') ?? [])];
  const enfocarPrimera = () => (opciones()[0] ?? panel.current)?.focus();
  function cerrar() {
    boton.current?.focus();
    panel.current?.hidePopover();
  }

  if (!React.Children.toArray(children).length) return null;
  return <div className="menu-mas" onBlur={evento => {
    if (evento.relatedTarget && !evento.currentTarget.contains(evento.relatedTarget)) panel.current?.hidePopover();
  }}>
    <button ref={boton} id={`${id}-boton`} type="button" className="ghost-button boton-3d"
      aria-haspopup="menu" aria-expanded={abierto} aria-controls={id}
      {...{ commandfor: id, command: 'toggle-popover' }} onClick={evento => { entrarAlAbrir.current = evento.detail === 0; }}
      onKeyDown={evento => {
        if (evento.key !== 'ArrowDown') return;
        evento.preventDefault();
        if (panel.current?.matches(':popover-open')) enfocarPrimera();
        else boton.current?.click();
      }}>{icono ?? <Ellipsis size={16} aria-hidden="true" />}{etiqueta}</button>
    <div ref={panel} id={id} className="menu-mas-panel glass-pop" popover="auto" role="menu" tabIndex={-1}
      aria-labelledby={`${id}-boton`} onToggle={evento => {
        const visible = evento.newState === 'open';
        setAbierto(visible);
        if (visible) {
          opciones().forEach(item => { item.tabIndex = -1; });
          if (entrarAlAbrir.current) enfocarPrimera();
        }
      }}
      onKeyDown={evento => {
        const { key } = evento;
        if (key === 'Escape') {
          evento.preventDefault();
          evento.stopPropagation();
          cerrar();
        } else if (['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(key)) {
          evento.preventDefault();
          const items = opciones();
          if (!items.length) return;
          const actual = items.indexOf(document.activeElement as HTMLElement);
          const destino = key === 'Home' || (key === 'ArrowDown' && actual < 0) ? 0
            : key === 'End' || actual < 0 ? items.length - 1
              : (actual + (key === 'ArrowDown' ? 1 : items.length - 1)) % items.length;
          items[destino]?.focus();
        }
      }}
      onClickCapture={evento => {
        const item = (evento.target as Element).closest('[role="menuitem"]');
        if (item && !item.matches(':disabled, [aria-disabled="true"]')) cerrar();
      }}>
      {children}
    </div>
  </div>;
}
