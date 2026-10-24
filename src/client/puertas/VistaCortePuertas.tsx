import React, { useEffect, useRef, useState } from 'react';
import { CheckCircle2, FolderOpen, Scissors } from 'lucide-react';
import type { CortePuertas, PedidoPuertas, VistaPuertas } from '../../puertas/tipos.ts';
import { abrirCorteDwg, confirmarCorteDwg } from '../abrirCorte';
import type { AskForConfirmation, Notify } from '../components/NotificationCenter';
import '../coordina/corte-lona.css';

export function DibujoCortePuertas({corte:c,zoom=1}:{corte:CortePuertas;zoom?:number}) {
  const alto=c.anchoRollo+430;
  const techo=Math.max(0,...c.colocadas.map(p=>p.y+10*(p.girada?p.pieza.ancho:p.pieza.alto)));
  return <svg role="img" aria-label={`Corte ${c.material}`} className="corte-dibujo puerta-corte-dibujo" style={zoom>1?{width:`${zoom*100}%`,maxHeight:'none'}:undefined} viewBox={zoom>1?`0 ${-techo} ${c.largo} ${techo}`:`-100 ${-alto} ${c.largo+200} ${alto+100}`}>
    <rect className="corte-rollo" width={c.largo} height={c.anchoRollo} y={-c.anchoRollo}/>
    {c.entidades.lineas.map((l,i)=><line key={i} x1={l.x1} y1={-l.y1} x2={l.x2} y2={-l.y2} className={l.capa==='ROTULADOR'?'corte-marca':l.capa==='CUTTER'?'puerta-cutter':'corte-linea'} vectorEffect="non-scaling-stroke"/>)}
    {c.entidades.arcos.map((a,i)=>{
      const rad=(v:number)=>v*Math.PI/180;
      const x0=a.x+a.r*Math.cos(rad(a.desde)),y0=-a.y-a.r*Math.sin(rad(a.desde));
      const x1=a.x+a.r*Math.cos(rad(a.hasta)),y1=-a.y-a.r*Math.sin(rad(a.hasta));
      return <path key={i} d={`M ${x0} ${y0} A ${a.r} ${a.r} 0 0 0 ${x1} ${y1}`} className={a.capa==='CUTTER'?'puerta-cutter':'corte-linea'} vectorEffect="non-scaling-stroke"/>;
    })}
    {c.entidades.textos.map((t,i)=><text key={i} x={t.x} y={-t.y} fontSize={t.h} className={t.capa==='ROTULADOR'?'puerta-texto-rotulador':undefined} textAnchor={t.centrado?'middle':'start'} dominantBaseline={t.centrado?'central':'auto'} transform={t.giro?`rotate(${-t.giro} ${t.x} ${-t.y})`:undefined}>{t.valor}<title>{t.capa} · {t.valor} · {(t.h/10).toLocaleString('es-ES')} cm</title></text>)}
  </svg>;
}
function MaterialCorte({c}:{c:CortePuertas}) {
  const [zoom,setZoom]=useState(1);
  return <article className="corte-material">
    <header><h3>{c.material}</h3><span>Rollo de {(c.anchoRollo/10).toLocaleString('es-ES')} cm · {(c.largo/1000).toLocaleString('es-ES',{maximumFractionDigits:2})} m</span></header>
    {c.opcion!=='principal'&&<p className="corte-aviso">{c.opcion==='saco-entero'?'Opción saco entero':'Opción saco en dos piezas'} · Alternativas de un mismo saco: elige una.</p>}
    <div className="puerta-corte-ampliacion" role="group" aria-label={`Ampliación del corte ${c.material}`}>
      <button type="button" className="ghost-button" disabled={zoom===1} onClick={()=>setZoom(Math.max(1,zoom/2))}>Reducir</button>
      <span aria-live="polite">{zoom}×</span>
      <button type="button" className="ghost-button" disabled={zoom===8} onClick={()=>setZoom(Math.min(8,zoom*2))}>Ampliar</button>
      <button type="button" className="ghost-button" disabled={zoom===1} onClick={()=>setZoom(1)}>Ver entero</button>
    </div>
    <div className="puerta-corte-desplazamiento" tabIndex={0} aria-label={`Dibujo desplazable del corte ${c.material}`}><DibujoCortePuertas corte={c} zoom={zoom}/></div>
    <small className="corte-leyenda"><span>DISCO1 · corte</span><span className="puerta-cutter-texto">CUTTER · huecos y curvas</span><span>ROTULADOR · marcas y mininúmeros de 1 cm</span></small>
  </article>;
}
export function VistaCortePuertas({pedido,activo,usuario,notify,askForConfirmation}:{pedido:PedidoPuertas;activo:boolean;usuario:string;notify:Notify;askForConfirmation:AskForConfirmation}) {
  const [abriendo,setAbriendo]=useState(false);
  // Flujo del DWG, fase 1: el plano en la carpeta de borradores, abierto en ZWCAD para perfilarlo.
  async function abrirCorte() {
    setAbriendo(true);
    try { await abrirCorteDwg({ruta:'/api/puertas/borrador-corte',orderCode:pedido.orderCode,cuerpo:{pedido},usuario,preguntar:askForConfirmation,notify}); }
    finally { setAbriendo(false); }
  }
  // Fase 2: el corte del borrador, tal como quedó en ZWCAD, confirmado para poder guardar para revisión.
  async function confirmarCorte() {
    setAbriendo(true);
    try { await confirmarCorteDwg({ruta:'/api/puertas/borrador-corte/confirmar',orderCode:pedido.orderCode,usuario,notify}); }
    finally { setAbriendo(false); }
  }
  const entrada=JSON.stringify(pedido), solicitud=useRef<AbortController|null>(null);
  const [vista,setVista]=useState<{entrada:string;datos?:VistaPuertas;error?:string;cargando?:boolean}|null>(null);
  useEffect(()=>()=>{solicitud.current?.abort();},[entrada,activo]);
  const actual=vista?.entrada===entrada?vista:null;
  async function calcular() {
    solicitud.current?.abort(); const abortar=new AbortController(); solicitud.current=abortar;
    setVista({entrada,cargando:true});
    try {
      const r=await fetch('/api/puertas/corte/vista-previa',{method:'POST',headers:{'Content-Type':'application/json'},body:entrada,signal:abortar.signal});
      const datos=await r.json() as VistaPuertas & {error?:string};
      if(!r.ok) throw new Error(datos.error||'No se pudo calcular el corte.');
      if(!abortar.signal.aborted) setVista({entrada,datos});
    } catch(error) { if(!abortar.signal.aborted) setVista({entrada,error:error instanceof Error?error.message:'No se pudo calcular el corte.'}); else setVista(v=>v?.cargando?null:v); }
  }
  return <section className="corte-lona panel bloque-3d" aria-label="Vista previa del corte de puertas" aria-busy={Boolean(actual?.cargando)}>
    <header className="corte-cabecera"><div><span className="corte-titulo"><Scissors aria-hidden="true"/><h2>Vista previa del corte</h2></span><p>{pedido.orderCode||'Sin número de pedido'} · Revisa las piezas y el material antes de preparar la puerta.</p></div>
      <div className="corte-acciones"><button type="button" className="ghost-button boton-3d" onClick={()=>void abrirCorte()} disabled={abriendo} title="Deja el plano en la carpeta de borradores y lo abre en ZWCAD"><FolderOpen size={16} aria-hidden="true"/>{abriendo?'Un momento…':'Abrir corte'}</button>
      <button type="button" className="ghost-button boton-3d" onClick={()=>void confirmarCorte()} disabled={abriendo} title="Lee el borrador tal como quedó en ZWCAD y lo da por bueno para guardar para revisión"><CheckCircle2 size={16} aria-hidden="true"/>Confirmar corte</button>
      <button type="button" className="primary-button boton-3d" onClick={()=>void calcular()} disabled={Boolean(actual?.cargando)}>{actual?.cargando?'Calculando…':'Ver vista previa del corte'}</button></div></header>
    {vista&&!actual&&<p role="status" className="corte-aviso">Han cambiado los datos. Vuelve a calcular el corte.</p>}
    {actual?.error&&<p role="alert" className="corte-aviso">{actual.error}</p>}
    {actual?.datos&&<>
      {actual.datos.avisos.some(a=>a.nivel==='error')&&<p role="alert" className="corte-aviso">Hay medidas pendientes de corregir. Se muestran solo las piezas que caben; el corte está incompleto.</p>}
      {actual.datos.sinOf.length>0&&<p className="corte-aviso">SIN OF · Solo vista previa.</p>}
      {actual.datos.cortes.map((c,i)=><MaterialCorte key={`${entrada}:${i}`} c={c}/>)}
      {!actual.datos.cortes.length&&<p className="corte-ayuda">Completa las medidas y los anchos de rollo para colocar las piezas.</p>}
    </>}
  </section>;
}
