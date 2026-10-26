import React, { useEffect, useId, useRef, useState } from 'react';
import { Ellipsis } from 'lucide-react';

/**
 * «Más ⋯»: las acciones que se usan poco, recogidas en un menú para que la barra de arriba solo enseñe el paso que toca
 * (Iván, 26/10/2026: «en las revisiones hay que revisar qué botones son necesarios o sobran»). Los hijos son los
 * elementos del menú (botones o enlaces con la clase `menu-mas-item`); se cierra al elegir, al pulsar fuera o con Esc.
 */
export function MenuMas({ children, etiqueta = 'Más' }: { children: React.ReactNode; etiqueta?: string }) {
  const [abierto, setAbierto] = useState(false);
  const raiz = useRef<HTMLDivElement>(null);
  const boton = useRef<HTMLButtonElement>(null);
  const id = useId();
  useEffect(() => {
    if (!abierto) return;
    const fuera = (evento: MouseEvent) => { if (!raiz.current?.contains(evento.target as Node)) setAbierto(false); };
    const tecla = (evento: KeyboardEvent) => { if (evento.key === 'Escape') { setAbierto(false); boton.current?.focus(); } };
    document.addEventListener('mousedown', fuera);
    document.addEventListener('keydown', tecla);
    return () => { document.removeEventListener('mousedown', fuera); document.removeEventListener('keydown', tecla); };
  }, [abierto]);
  const hayAlgo = React.Children.toArray(children).some(Boolean);
  if (!hayAlgo) return null;
  return <div className="menu-mas" ref={raiz}>
    <button ref={boton} type="button" className="ghost-button boton-3d" aria-haspopup="menu" aria-expanded={abierto} aria-controls={id}
      onClick={() => setAbierto((v) => !v)}><Ellipsis size={16} aria-hidden="true" />{etiqueta}</button>
    {abierto && <div id={id} className="menu-mas-panel glass-pop" role="menu" onClick={(evento) => {
      if ((evento.target as HTMLElement).closest('.menu-mas-item')) setAbierto(false);
    }}>{children}</div>}
  </div>;
}
