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
// (`tira-3d`), con la elegida hundida en dorado (`pestana-activa`). Remolques dejó de estar
// «en pruebas» el 02/10/2026 (Iván): hace todo lo que hacía la web vieja.
export type ResumenPedido = { numero: string; elementos: number };

export function SelectorProducto({ producto, onChange, pedidos, inicio = false, disabled = false }: { producto: Producto; onChange: (producto: Producto) => void; pedidos?: Partial<Record<Producto, ResumenPedido>>; inicio?: boolean; disabled?: boolean }) {
  const detalle = (tipo: Producto) => {
    const pedido = pedidos?.[tipo];
    return pedido?.numero.trim() || pedido?.elementos
      ? `${pedido.numero.trim() || 'Sin número'} · ${pedido.elementos} ${pedido.elementos === 1 ? 'elemento' : 'elementos'}`
      : 'Sin empezar';
  };
  return (
    <div className="producto-contexto">
    {inicio && <span className="producto-etiqueta">Empezar un pedido</span>}
    <div className="tira-3d producto-selector" role="group" aria-label="Producto">
      <button type="button" disabled={disabled} aria-label="Toldos" title={detalle('toldos')} className={!inicio && producto === 'toldos' ? 'pestana pestana-activa' : 'pestana'} aria-pressed={inicio ? undefined : producto === 'toldos'} onClick={() => onChange('toldos')}>
        Toldos
      </button>
      <button type="button" disabled={disabled} aria-label="Remolques" title={detalle('remolques')} className={!inicio && producto === 'remolques' ? 'pestana pestana-activa' : 'pestana'} aria-pressed={inicio ? undefined : producto === 'remolques'} onClick={() => onChange('remolques')}>
        Remolques
      </button>
    </div>
    </div>
  );
}
