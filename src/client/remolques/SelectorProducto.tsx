import React from 'react';
import { Boxes, Caravan, DoorOpen, Store } from 'lucide-react';
import type { CategoriaConModelos } from '../modelosInicio';

export type Producto = 'toldos' | 'remolques' | 'puertas' | 'systemdock';

// Lo último que se eligió se recuerda en este navegador (como el modo oscuro).
export const PRODUCTO_KEY = 'planteamientos-producto';

export function leerProducto(storage: Storage | null = window.localStorage): Producto {
  try { const valor=storage?.getItem(PRODUCTO_KEY); return valor==='remolques'||valor==='puertas'||valor==='systemdock'?valor:'toldos'; } catch { return 'toldos'; }
}

export function guardarProducto(producto: Producto, storage: Storage | null = window.localStorage) {
  try { storage?.setItem(PRODUCTO_KEY, producto); } catch { /* sin almacenamiento: dura hasta recargar */ }
}


export type ResumenPedido = { numero: string; elementos: number };
const nombres = {toldos:'Toldos',remolques:'Remolques',puertas:'Puertas',systemdock:'System Dock'};

/** La categoría se elige en el inicio; dentro del pedido solo se indica el trabajo actual. */
export function SelectorProducto({ producto, pedidos, inicio = false, disabled = false, puertas = true, transicion, onCategoria, embudos = false }: {
  producto: Producto; onChange: (producto: Producto) => void; pedidos?: Partial<Record<Producto, ResumenPedido>>;
  inicio?: boolean; disabled?: boolean; puertas?: boolean; transicion?: CategoriaConModelos | null;
  onCategoria?: (categoria: CategoriaConModelos) => void; embudos?: boolean;
}) {
  if (!inicio) return <h2>{embudos?'Embudos':nombres[producto]}{pedidos?.[producto]?.numero.trim() ? ' · '+pedidos[producto]!.numero.trim() : ''}</h2>;
  const tarjetas: Array<[CategoriaConModelos,string,string,React.ReactNode]> = [
    ['toldos','Toldos','Brazos, cortinas, cofres y trabajos de tela',<Store key="i" aria-hidden="true"/>],
    ['remolques','Remolques','Lonas y baquetones, con el corte',<Caravan key="i" aria-hidden="true"/>],
    ...(puertas ? [['puertas','Puertas','Enrollables, apilables y autorreparables',<DoorOpen key="i" aria-hidden="true"/>] as [CategoriaConModelos,string,string,React.ReactNode]] : []),
    ['estandar','Estándar','Combursa, Embudos y System Dock',<Boxes key="i" aria-hidden="true"/>],
  ];
  return <div className="producto-contexto inicio-productos">
    <span className="producto-etiqueta">O empieza uno en blanco</span>
    <div className="inicio-tarjetas" role="group" aria-label="Producto">
      {tarjetas.map(([tipo,nombre,lleva,icono])=>{
        const pedido=tipo==='estandar'?undefined:pedidos?.[tipo];
        const enCurso=pedido && (pedido.numero.trim()||pedido.elementos);
        return <button type="button" key={tipo} data-producto={tipo} style={transicion===tipo?{viewTransitionName:'categoria-inicio'}:undefined} disabled={disabled} aria-label={nombre} className="inicio-tarjeta" onClick={()=>onCategoria?.(tipo)}>
          <span className="inicio-tarjeta-icono">{icono}</span><strong>{nombre}</strong>
          <span className="inicio-tarjeta-lleva">{lleva}</span>
          <span className={`inicio-tarjeta-estado${enCurso?' is-en-curso':''}`}>{enCurso?`Seguir con ${pedido.numero.trim()||'Sin número'} · ${pedido.elementos} ${pedido.elementos===1?'elemento':'elementos'}`:'Elegir modelo'}</span>
        </button>;
      })}
    </div>
  </div>;
}
