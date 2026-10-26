import React, { useEffect, useRef, useState } from 'react';
import type { CortePuertas, PedidoPuertas, VistaPuertas } from '../../puertas/tipos.ts';
import '../coordina/corte-lona.css';

/** `ajustado`: solo lo que ocupan las piezas, sin el resto del rollo ni el título (el resumen junto al alzado). */
export function DibujoCortePuertas({corte:c,zoom=1,ajustado=false}:{corte:CortePuertas;zoom?:number;ajustado?:boolean}) {
  const alto=c.anchoRollo+430;
  const techo=Math.max(0,...c.colocadas.map(p=>p.y+10*(p.girada?p.pieza.ancho:p.pieza.alto)));
  return <svg role="img" aria-label={`Corte ${c.material}`} className="corte-dibujo puerta-corte-dibujo" style={zoom>1?{width:`${zoom*100}%`,maxHeight:'none'}:undefined} viewBox={ajustado?`-20 ${-techo-20} ${c.largo+40} ${techo+40}`:zoom>1?`0 ${-techo} ${c.largo} ${techo}`:`-100 ${-alto} ${c.largo+200} ${alto+100}`}>
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
type EstadoVista = {entrada:string;datos?:VistaPuertas;error?:string;cargando?:boolean};
export type VistaCorte = {actual:EstadoVista|null;anticuada:boolean;calcular:()=>Promise<void>};

/** El corte del pedido, calculado solo al cambiar los datos (Iván, 26/10/2026: «que salga ya el corte tal cual, con
 * los cristales y sacos; así no hay que andar bajando»). Lo comparten el resumen junto al alzado y la vista grande. */
export function useVistaCortePuertas(pedido:PedidoPuertas,activo:boolean):VistaCorte {
  const entrada=JSON.stringify(pedido), solicitud=useRef<AbortController|null>(null);
  const [vista,setVista]=useState<EstadoVista|null>(null);
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
  // Se recalcula solo, un momento después de dejar de escribir.
  useEffect(()=>{
    if(!activo) return;
    const espera=setTimeout(()=>void calcular(),600);
    return ()=>{clearTimeout(espera);solicitud.current?.abort();};
    // eslint-disable-next-line react-hooks/exhaustive-deps
  },[entrada,activo]);
  return {actual,anticuada:Boolean(vista&&!actual),calcular};
}

const nombreOpcion=(c:CortePuertas)=>c.opcion==='saco-entero'?' · saco entero (alternativa)':c.opcion==='saco-partido'?' · saco en dos':'';

/** Todo el corte de un vistazo, junto al alzado: cada material con su rollo, uno debajo de otro. */
export function CorteResumen({vista}:{vista:VistaCorte}) {
  const {actual}=vista;
  return <section className="puerta-corte-resumen panel panel-vidrio" aria-label="Corte del pedido" aria-busy={Boolean(actual?.cargando)}>
    <h2>Corte <span>{actual?.cargando?'calculando…':actual?.datos?`${actual.datos.cortes.length} rollos`:''}</span></h2>
    {actual?.error&&<p role="alert" className="corte-aviso">{actual.error}</p>}
    {actual?.datos&&!actual.datos.cortes.length&&<p className="corte-ayuda">Completa las medidas y los anchos de rollo para colocar las piezas.</p>}
    {actual?.datos?.cortes.map((c,i)=><figure key={i}>
      <figcaption>{c.material}{nombreOpcion(c)} · rollo {(c.anchoRollo/10).toLocaleString('es-ES')} · {(c.largo/1000).toLocaleString('es-ES',{maximumFractionDigits:2})} m</figcaption>
      <DibujoCortePuertas corte={c} ajustado/>
    </figure>)}
  </section>;
}
