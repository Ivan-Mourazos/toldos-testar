import React, { useEffect, useRef, useState } from 'react';
import type { CortePuertas, EntidadesPuertas, PedidoPuertas, VistaPuertas } from '../../puertas/tipos.ts';
import { anchoArial } from '../../domain/corteLona/texto.js';
import { presentarImpresionAraujo } from '../../puertas/cotasImpresionAraujo.ts';
import { entidadesDePieza } from '../../puertas/corteEnPlano.ts';
import { MATERIAL_SACO_AMARILLO } from '../../puertas/saco.ts';
import '../coordina/corte-lona.css';
import { textoMedidasMm } from './medidasPuertas';

function TrazosCorte({ entidades, factorMm = 1 }: { entidades: EntidadesPuertas; factorMm?: number }) {
  return <>
    {entidades.lineas.map((l,i)=><line key={i} x1={l.x1} y1={-l.y1} x2={l.x2} y2={-l.y2} data-capa={l.capa} className={l.capa==='ROTULADOR'?'corte-marca':l.capa==='CUTTER'?'puerta-cutter':'corte-linea'} vectorEffect="non-scaling-stroke"/>)}
    {entidades.arcos.map((a,i)=>{
      const rad=(v:number)=>v*Math.PI/180;
      const x0=a.x+a.r*Math.cos(rad(a.desde)),y0=-a.y-a.r*Math.sin(rad(a.desde));
      const x1=a.x+a.r*Math.cos(rad(a.hasta)),y1=-a.y-a.r*Math.sin(rad(a.hasta));
      return <path key={i} d={`M ${x0} ${y0} A ${a.r} ${a.r} 0 0 0 ${x1} ${y1}`} data-capa={a.capa} className={a.capa==='CUTTER'?'puerta-cutter':'corte-linea'} vectorEffect="non-scaling-stroke"/>;
    })}
    {entidades.textos.map((t,i)=><text key={i} data-capa={t.capa} x={t.x} y={-t.y} fontSize={t.h} className={t.capa==='ROTULADOR'?'puerta-texto-rotulador':undefined} textAnchor={t.centrado?'middle':'start'} dominantBaseline={t.centrado?'central':'auto'} transform={t.giro?`rotate(${-t.giro} ${t.x} ${-t.y})`:undefined}>{textoMedidasMm(t.valor)}<title>{t.capa} · {textoMedidasMm(t.valor)} · {(t.h * factorMm).toLocaleString('es-ES')} mm</title></text>)}
  </>;
}

/** Recupera cada mitad del corte real en sus propias coordenadas, con sus marcas de unión. */
function SacoPartidoHorizontal({ corte }: { corte: CortePuertas }) {
  let alto = 0;
  const piezas = [];
  for (const t of corte.colocadas) {
    const base = alto + t.pieza.alto;
    piezas.push({ base, entidades: entidadesDePieza(corte, t) });
    alto = base + 4;
  }
  const ancho = Math.max(...corte.colocadas.map(t => t.pieza.ancho));
  return <>
    <p className="corte-ayuda">Piezas en horizontal · La colocación en el rollo se conserva en el DXF.</p>
    <svg role="img" aria-label={`Piezas del saco en horizontal · ${corte.material}`} className="corte-dibujo puerta-corte-dibujo"
      viewBox={`-2 -2 ${ancho + 4} ${alto}`}>
      {piezas.map(({ base, entidades }, i) => <g key={i} transform={`translate(0 ${base})`}>
        <TrazosCorte entidades={entidades} factorMm={10}/>
      </g>)}
    </svg>
  </>;
}

/** `ajustado`: solo lo que ocupan las piezas, sin el resto del rollo ni el título (el resumen junto al alzado). */
export function DibujoCortePuertas({corte,zoom=1,ajustado=false}:{corte:CortePuertas;zoom?:number;ajustado?:boolean}) {
  if (corte.opcion === 'saco-partido' && corte.material.trim().toUpperCase() === MATERIAL_SACO_AMARILLO
    && corte.colocadas.some(t => t.girada)) return <SacoPartidoHorizontal corte={corte}/>;
  const c=presentarImpresionAraujo(corte);
  const alto=Math.max(c.anchoRollo+430, ...c.entidades.textos.map(t=>t.y+t.h+20));
  const titulosAparte=c.extensionDibujo ? c.entidades.textos.filter(t=>t.x>=c.largo+1500).map(t=>t.y+t.h) : [];
  const techo=Math.max(0,...titulosAparte,...c.colocadas.map(p=>p.y+10*(p.girada?p.pieza.ancho:p.pieza.alto)));
  // El título del material va a 200 mm aunque el corte sea corto (un saco entero): la vista llega hasta donde acaba,
  // para que no se corte por la derecha. En SVG el tamaño es el del cuerpo, no el de las mayúsculas como en el DXF.
  const extension=c.extensionDibujo ?? c.largo;
  const derecha=Math.max(extension,...c.entidades.textos.filter(t=>!t.giro&&!t.centrado).map(t=>t.x+anchoArial(textoMedidasMm(t.valor),t.h*0.716)));
  return <svg role="img" aria-label={`Corte ${c.material}`} className="corte-dibujo puerta-corte-dibujo" style={zoom>1?{width:`${zoom*100}%`,maxHeight:'none'}:undefined} viewBox={ajustado?`-20 ${-techo-20} ${extension+40} ${techo+40}`:zoom>1?`0 ${-techo} ${extension} ${techo}`:`-100 ${-alto} ${derecha+200} ${alto+100}`}>
    <rect className="corte-rollo" width={c.largo} height={c.anchoRollo} y={-c.anchoRollo}/>
    <TrazosCorte entidades={c.entidades}/>
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
    if(!activo || (vista?.entrada===entrada && vista.datos)) return;
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
    <h2>Corte <span>{actual?.cargando?'calculando…':actual?.datos?`${actual.datos.cortes.length} ${actual.datos.cortes.length===1?'rollo':'rollos'}`:''}</span></h2>
    {actual?.error&&<p role="alert" className="corte-aviso">{actual.error}</p>}
    {actual?.datos&&!actual.datos.cortes.length&&<p className="corte-ayuda">Completa las medidas y los anchos de rollo para colocar las piezas.</p>}
    {actual?.datos?.cortes.map((c,i)=><figure key={i}>
      <figcaption>{c.material}{nombreOpcion(c)} · rollo {c.anchoRollo.toLocaleString('es-ES')} mm · {c.largo.toLocaleString('es-ES',{maximumFractionDigits:2})} mm</figcaption>
      <DibujoCortePuertas corte={c} ajustado/>
    </figure>)}
  </section>;
}
