import React from 'react';

export type Producto = 'toldos' | 'remolques';

// Lo último que se eligió se recuerda en este navegador (como el modo oscuro).
export const PRODUCTO_KEY = 'planteamientos-producto';

export function leerProducto(storage: Storage | null = window.localStorage): Producto {
  try { return storage?.getItem(PRODUCTO_KEY) === 'remolques' ? 'remolques' : 'toldos'; } catch { return 'toldos'; }
}

export function guardarProducto(producto: Producto, storage: Storage | null = window.localStorage) {
  try { storage?.setItem(PRODUCTO_KEY, producto); } catch { /* sin almacenamiento: dura hasta recargar */ }
}

// Selector «Toldos | Remolques» de Nuevo pedido: la tira de pestañas de CoordinaOT
// (`tira-3d`), con la elegida hundida en dorado (`pestana-activa`). Remolques todavía es una
// prueba (diseño 30/09/2026): lleva la etiqueta «en pruebas» y se ve para todos.
export function SelectorProducto({ producto, onChange }: { producto: Producto; onChange: (producto: Producto) => void }) {
  return (
    <div className="tira-3d producto-selector" role="group" aria-label="Producto">
      <button type="button" className={producto === 'toldos' ? 'pestana pestana-activa' : 'pestana'} aria-pressed={producto === 'toldos'} onClick={() => onChange('toldos')}>
        Toldos
      </button>
      <button type="button" className={producto === 'remolques' ? 'pestana pestana-activa' : 'pestana'} aria-pressed={producto === 'remolques'} onClick={() => onChange('remolques')}>
        Remolques
        <span className="producto-en-pruebas pildora-aviso">en pruebas</span>
      </button>
    </div>
  );
}
