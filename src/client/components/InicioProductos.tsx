import React, { useRef, useState } from 'react';
import { flushSync } from 'react-dom';
import { ArrowLeft, Caravan, DoorOpen, Search, Store } from 'lucide-react';
import { SelectorProducto, type Producto, type ResumenPedido } from '../remolques/SelectorProducto';
import { modelosInicio, type CategoriaConModelos, type ModeloInicio } from '../modelosInicio';
import '../coordina/modelos-inicio.css';

const nombres = { toldos:'Toldos', puertas:'Puertas', remolques:'Remolques' };
const iconos = { toldos:Store, puertas:DoorOpen, remolques:Caravan };

/** La tarjeta y el panel representan la misma categoría; la transición conserva esa relación. */
export function InicioProductos({ producto, onChange, onModelo, pedidos, puertas, disabled, disponibles }: {
  producto: Producto; onChange:(producto:Producto)=>void; onModelo:(modelo:ModeloInicio)=>void;
  pedidos:Partial<Record<Producto,ResumenPedido>>; puertas:boolean; disabled:boolean; disponibles:string[];
}) {
  const [categoria,setCategoria] = useState<CategoriaConModelos|null>(null);
  const [anterior,setAnterior] = useState<CategoriaConModelos|null>(null);
  const [busqueda,setBusqueda] = useState('');
  const raiz=useRef<HTMLDivElement>(null), buscador=useRef<HTMLInputElement>(null);
  const animando=useRef(false);

  function cambiar(next:CategoriaConModelos|null) {
    if (animando.current) return;
    const actualizar=()=>flushSync(()=>{setCategoria(next);setBusqueda('');if(next)setAnterior(next);});
    const foco=()=>next?buscador.current?.focus():raiz.current?.querySelector<HTMLButtonElement>(`[data-producto="${anterior}"]`)?.focus();
    if (!document.startViewTransition || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {actualizar();foco();return;}
    if(next) {
      raiz.current?.querySelectorAll<HTMLButtonElement>('[data-producto]').forEach(t=>{t.style.viewTransitionName='none';});
      const tarjeta=raiz.current?.querySelector<HTMLButtonElement>(`[data-producto="${next}"]`);
      if(tarjeta)tarjeta.style.viewTransitionName='categoria-inicio';
    }
    animando.current=true;
    const transicion=document.startViewTransition(actualizar);
    void transicion.finished.catch(()=>undefined).finally(()=>{animando.current=false;foco();});
  }

  const grupos=categoria?modelosInicio(categoria,disponibles,busqueda):[];
  const Icono=categoria?iconos[categoria]:Store;
  const resumen=categoria?pedidos[categoria]:undefined;
  let posicion=0;
  return <div ref={raiz} className="inicio-categorias" onKeyDown={e=>{if(e.key==='Escape'&&categoria){e.preventDefault();cambiar(null);}}}>
    {categoria?<section className="cat-panel" aria-label={`Modelos de ${nombres[categoria]}`} style={{viewTransitionName:'categoria-inicio'}}>
      <header className="cat-cabecera">
        <button className="cat-volver" type="button" onClick={()=>cambiar(null)}><ArrowLeft size={16} aria-hidden="true"/>Categorías</button>
        <h2 className="cat-titulo"><span className="inicio-tarjeta-icono"><Icono size={20} aria-hidden="true"/></span>{nombres[categoria]}</h2>
        <label className="cat-buscar"><Search size={17} aria-hidden="true"/><input ref={buscador} type="search" aria-label="Buscar modelo" placeholder="Buscar modelo…" value={busqueda} onChange={e=>setBusqueda(e.target.value)}/></label>
      </header>
      {(resumen?.numero.trim()||resumen?.elementos)?<button className="ghost-button cat-seguir" type="button" data-cambio-fluido onClick={()=>onChange(categoria)}>Seguir con {resumen.numero||'el pedido a medias'} · {resumen.elementos} elementos</button>:null}
      {grupos.length?grupos.map(grupo=><section key={grupo.nombre} aria-label={grupo.nombre}>
        <h3 className="cat-sec">{grupo.nombre}</h3>
        <div className="cat-rejilla">{grupo.modelos.map(modelo=><button type="button" className="cat-modelo" data-cambio-fluido key={modelo.nombre} disabled={modelo.proximamente||!modelo.valor||disabled}
          title={modelo.proximamente?'Todavía no está disponible':undefined} style={{animationDelay:`${posicion++*14}ms`}} onClick={()=>{if(modelo.valor)onModelo(modelo.valor);}}>
          <span className="cat-iniciales" aria-hidden="true">{modelo.nombre.normalize('NFD').replace(/[\u0300-\u036f]/g,'').slice(0,2).toUpperCase()}</span>
          <span>{modelo.nombre}{modelo.proximamente&&<small>Próximamente</small>}</span>
        </button>)}</div>
      </section>):<p className="cat-vacio" role="status">No hay modelos con ese nombre.</p>}
    </section>:<SelectorProducto inicio transicion={anterior} puertas={puertas} disabled={disabled} producto={producto} pedidos={pedidos} onChange={next=>next==='systemdock'?onChange(next):cambiar(next)}/>}
  </div>;
}
