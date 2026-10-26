import React from 'react';
import { Caravan, DoorOpen, Store } from 'lucide-react';

export type Producto = 'toldos' | 'remolques' | 'puertas';

// Lo último que se eligió se recuerda en este navegador (como el modo oscuro).
export const PRODUCTO_KEY = 'planteamientos-producto';

export function leerProducto(storage: Storage | null = window.localStorage): Producto {
  try { const valor=storage?.getItem(PRODUCTO_KEY); return valor==='remolques'||valor==='puertas'?valor:'toldos'; } catch { return 'toldos'; }
}

export function guardarProducto(producto: Producto, storage: Storage | null = window.localStorage) {
  try { storage?.setItem(PRODUCTO_KEY, producto); } catch { /* sin almacenamiento: dura hasta recargar */ }
}

// Selector «Toldos | Remolques» de Nuevo pedido: la tira de pestañas de CoordinaOT
// (`tira-3d`), con la elegida hundida en dorado (`pestana-activa`). Remolques dejó de estar
// «en pruebas» el 02/10/2026 (Iván): hace todo lo que hacía la web vieja.
export type ResumenPedido = { numero: string; elementos: number };

// `puertas` false: puertas en pausa en el servidor (ENABLE_PUERTAS), sin pestaña.
export function SelectorProducto({ producto, onChange, pedidos, inicio = false, disabled = false, puertas = true }: { producto: Producto; onChange: (producto: Producto) => void; pedidos?: Partial<Record<Producto, ResumenPedido>>; inicio?: boolean; disabled?: boolean; puertas?: boolean }) {
  const detalle = (tipo: Producto) => {
    const pedido = pedidos?.[tipo];
    return pedido?.numero.trim() || pedido?.elementos
      ? `${pedido.numero.trim() || 'Sin número'} · ${pedido.elementos} ${pedido.elementos === 1 ? 'elemento' : 'elementos'}`
      : 'Sin empezar';
  };
  // En la pantalla de inicio, una tarjeta por producto con lo que lleva y el borrador que haya a medias (Iván, 26/10/2026:
  // «rediseña la página principal»).
  if (inicio) {
    const tarjetas: Array<[Producto, string, string, React.ReactNode]> = [
      ['toldos', 'Toldos', 'Brazos, cortinas, cofres y trabajos de tela', <Store key="i" aria-hidden="true" />],
      ['remolques', 'Remolques', 'Lonas y baquetones, con el corte', <Caravan key="i" aria-hidden="true" />],
      ...(puertas ? [['puertas', 'Puertas', 'Enrollables, apilables y System Dock', <DoorOpen key="i" aria-hidden="true" />] as [Producto, string, string, React.ReactNode]] : []),
    ];
    return <div className="producto-contexto inicio-productos">
      <span className="producto-etiqueta">O empieza uno en blanco</span>
      <div className="inicio-tarjetas" role="group" aria-label="Producto">
        {tarjetas.map(([tipo, nombre, lleva, icono]) => {
          const enCurso = detalle(tipo) !== 'Sin empezar';
          return <button type="button" key={tipo} disabled={disabled} aria-label={nombre} className="inicio-tarjeta" onClick={() => onChange(tipo)}>
            <span className="inicio-tarjeta-icono">{icono}</span>
            <strong>{nombre}</strong>
            <span className="inicio-tarjeta-lleva">{lleva}</span>
            <span className={`inicio-tarjeta-estado${enCurso ? ' is-en-curso' : ''}`}>{enCurso ? `Seguir con ${detalle(tipo)}` : 'Sin empezar'}</span>
          </button>;
        })}
      </div>
    </div>;
  }
  return (
    <div className="producto-contexto">
    <div className="tira-3d producto-selector" role="group" aria-label="Producto">
      <button type="button" disabled={disabled} aria-label="Toldos" title={detalle('toldos')} className={!inicio && producto === 'toldos' ? 'pestana pestana-activa' : 'pestana'} aria-pressed={inicio ? undefined : producto === 'toldos'} onClick={() => onChange('toldos')}>
        Toldos
      </button>
      <button type="button" disabled={disabled} aria-label="Remolques" title={detalle('remolques')} className={!inicio && producto === 'remolques' ? 'pestana pestana-activa' : 'pestana'} aria-pressed={inicio ? undefined : producto === 'remolques'} onClick={() => onChange('remolques')}>
        Remolques
      </button>
      {puertas && <button type="button" disabled={disabled} aria-label="Puertas" title={detalle('puertas')} className={!inicio && producto === 'puertas' ? 'pestana pestana-activa' : 'pestana'} aria-pressed={inicio ? undefined : producto === 'puertas'} onClick={() => onChange('puertas')}>
        Puertas
      </button>}
    </div>
    </div>
  );
}
