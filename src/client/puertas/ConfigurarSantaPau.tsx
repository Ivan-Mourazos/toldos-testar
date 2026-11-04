import React, { useState } from 'react';
import { calcularPuerta } from '../../puertas/calcular.ts';
import { aumentoSantaPau, REGLAS_SANTA_PAU, revisionSantaPau } from '../../puertas/santapau.ts';
import type { Puerta } from '../../puertas/tipos.ts';
import { SelectField } from '../components/SelectField';
import { InputDecimal } from '../remolques/InputDecimal';
import { AlzadoPuerta } from './AlzadoPuerta';

const num=(x:number)=>x.toLocaleString('es-ES',{maximumFractionDigits:2});
function Numero({titulo,valor,cambiar}:{titulo:string;valor:number;cambiar:(v:number)=>void}){
 return <label className="field puerta-campo"><span>{titulo}</span><InputDecimal aria-label={titulo} value={valor} onValor={v=>cambiar(v??0)}/></label>;
}
export function ConfigurarSantaPau({p,cambiar,corte,derecha,letra}:{p:Puerta;cambiar:(p:Puerta)=>void;corte?:React.ReactNode;derecha:'alzado'|'corte';letra:string}){
 const [tab,setTab]=useState('datos');
 const s=p.santapau!,r=calcularPuerta(p),v=p.ventanas[0]??{x:0,y:0,ancho:p.frente,alto:60,radio:0,radioCristal:0};
 const patch=(q:Partial<Puerta>)=>cambiar({...p,...q,confirmada:false,ventanasConfirmadas:false});
 const remate=(q:Partial<NonNullable<Puerta['santapau']>>)=>patch({santapau:{...s,...q}});
 const ventana=(q:Partial<typeof v>)=>patch({ventanas:[{...v,...q}]});
 const texto=(titulo:string,key:'of'|'color'|'material'|'materialCristal'|'materialSaco'|'notaPlano')=><label className="field puerta-campo"><span>{titulo}</span><input aria-label={titulo} value={p[key]??''} onChange={e=>patch({[key]:e.target.value})}/></label>;
 const tabs=[['datos','Puerta'],['mirilla','Mirilla y tubos'],['remates','Confección'],['materiales','Materiales y texto']];
 return <>
  <div className="puerta-config-alzado">
   <section className="puerta-config panel panel-vidrio" aria-label="Configurador de Santa Pau">
    <header><h2>Configurador</h2><span>Santa Pau · medidas en cm</span></header>
    <div className="tira-3d puerta-pestanas" role="tablist" aria-label="Partes de la puerta">{tabs.map(([id,nombre])=><button key={id} type="button" role="tab" aria-selected={tab===id} className={`pestana ${tab===id?'pestana-activa':''}`} onClick={()=>setTab(id)}>{nombre}</button>)}</div>
    {tab==='datos'&&<>
     <div className="puerta-campos">{texto('OF de puerta','of')}
      <Numero titulo="Cantidad de puertas iguales" valor={p.cantidad} cambiar={cantidad=>patch({cantidad})}/>
      <Numero titulo="Frente (cm)" valor={p.frente} cambiar={frente=>patch({frente,ventanas:p.ventanas.map(v=>({...v,ancho:frente-2*v.x})),entradas:p.entradas.map(e=>({...e,largo:frente}))})}/>
      <Numero titulo="Alto (cm)" valor={p.alto} cambiar={alto=>patch({alto})}/>{texto('Color de puerta','color')}
     </div>
     <p className="puerta-ayuda">Enrollable con mirilla, entradas de tubo y faldón independiente. La hoja del cliente está en mm: divide por 10 al transcribir aquí.</p>
    </>}
    {tab==='mirilla'&&<>
     <fieldset><legend>Bordes visibles de la mirilla</legend><div className="puerta-campos">
      <Numero titulo="Bajo de mirilla desde el bajo terminado (cm)" valor={v.y} cambiar={y=>ventana({y})}/>
      <Numero titulo="Alto visible de mirilla (cm)" valor={v.alto} cambiar={alto=>ventana({alto})}/>
      <Numero titulo="Margen lateral de lona (cm; 0 de lado a lado)" valor={v.x} cambiar={x=>ventana({x,ancho:p.frente-2*x})}/>
     </div><p className="puerta-ayuda">El borde superior queda a {num(v.y+v.alto)} cm del bajo. Los ejes de tubo se ponen aparte.</p></fieldset>
     <fieldset><legend>Entradas de tubo · sueltas de 9 cm</legend>
      {p.entradas.map((e,i)=><div className="puerta-campos" key={i}>
       <Numero titulo={`Eje de tubo ${i+1} desde el bajo (cm)`} valor={e.altura} cambiar={altura=>patch({entradas:p.entradas.map((t,j)=>j===i?{...t,altura}:t)})}/>
       <Numero titulo={`Largo de E.T. ${i+1} (cm)`} valor={e.largo} cambiar={largo=>patch({entradas:p.entradas.map((t,j)=>j===i?{...t,largo}:t)})}/>
       <button type="button" className="ghost-button" onClick={()=>patch({entradas:p.entradas.filter((_,j)=>j!==i)})}>Quitar E.T. {i+1}</button>
      </div>)}
      <button type="button" className="ghost-button" onClick={()=>patch({entradas:[...p.entradas,{altura:0,largo:p.frente,alto:9,diametro:30,huecos:[]}]})}>Añadir E.T.</button>
      <p className="puerta-ayuda">Sin recortes de cintas. En 4815 el tubo es plano de 30 × 10 mm. Revisa el tubo de cada pedido.</p>
     </fieldset>
    </>}
    {tab==='remates'&&<>
     <div className="puerta-campos">
      <Numero titulo="Alto de corte del faldón (cm)" valor={s.altoFaldon} cambiar={altoFaldon=>remate({altoFaldon})}/>
      <SelectField label="Lado cerrado de las E.T. por el revés" value={s.ladoCerrado} options={['sin confirmar','izquierda','derecha']} optionLabel={v=>v==='sin confirmar'?'Sin confirmar':v==='derecha'?'Derecha':'Izquierda'} onChange={ladoCerrado=>remate({ladoCerrado:ladoCerrado as typeof s.ladoCerrado})}/>
     </div>
      <SelectField label="Confección del bajo" value={revisionSantaPau(s)} options={['5363','4815']} optionLabel={v=>v==='5363'?'Actual · bajo +2,5 cm':'Anterior · bajo +5 cm'} onChange={v=>remate({revision:v as '4815'|'5363',aumentoBajo:v==='4815'?5:2.5})}/>
      <p className="puerta-ayuda">Bajo del paño: +{num(aumentoSantaPau(s))} cm. Comprueba la confección del pedido.</p>
     <label className="puerta-casilla"><input type="checkbox" checked={s.refuerzos} onChange={e=>remate({refuerzos:e.target.checked})}/>Refuerzos en ambos extremos de todas las E.T.</label>
     {s.refuerzos&&<Numero titulo="Ancho de corte del refuerzo (cm)" valor={s.anchoRefuerzo??REGLAS_SANTA_PAU.anchoRefuerzo} cambiar={anchoRefuerzo=>remate({anchoRefuerzo})}/>}
     <label className="puerta-casilla"><input type="checkbox" checked={Boolean(p.sacoDiagonalesAmarillas)} onChange={e=>patch({sacoDiagonalesAmarillas:e.target.checked})}/>Franja negra/amarilla en el faldón (impresión digital)</label>
     <p className="puerta-ayuda">Se cortan dos refuerzos por E.T., del ancho del pedido y del mismo alto que la entrada (9 cm).</p>
    </>}
    {tab==='materiales'&&<div className="puerta-campos">
     {texto('Material de lona','material')}{texto('Material transparente','materialCristal')}{texto('Material del faldón','materialSaco')}
     <Numero titulo="Rollo de lona (cm)" valor={p.rollo} cambiar={rollo=>patch({rollo})}/>
     <Numero titulo="Rollo transparente (cm)" valor={p.rolloCristal} cambiar={rolloCristal=>patch({rolloCristal})}/>
     <Numero titulo="Rollo de faldón (cm)" valor={p.rolloSaco} cambiar={rolloSaco=>patch({rolloSaco})}/>{texto('Nota para revisión','notaPlano')}
    </div>}
    <label className="puerta-casilla"><input type="checkbox" checked={p.confirmada&&p.ventanasConfirmadas} onChange={e=>cambiar({...p,confirmada:e.target.checked,ventanasConfirmadas:e.target.checked})}/>Confirmado con el dibujo y los rollos reales</label>
   </section>
   <div className="puerta-derecha">
    {derecha==='corte'&&corte?corte:<AlzadoPuerta puerta={p} resultado={r} letra={letra}/>}
    <section className="puerta-avisos panel panel-vidrio" aria-label="Comprobaciones de puerta"><h2>Qué falta o revisar <span>{r.avisos.filter(a=>a.nivel==='error').length} pendientes</span></h2><ul>{r.avisos.map((a,i)=><li key={i} className={a.nivel==='error'?'es-error':''}>{a.texto}</li>)}</ul></section>
   </div>
  </div>
  <details className="puerta-piezas panel panel-vidrio"><summary>Piezas calculadas · {r.piezas.reduce((s,x)=>s+x.cantidad,0)} piezas</summary><table><thead><tr><th>Pieza</th><th>Corte (cm)</th><th>Material</th><th>Cantidad</th></tr></thead><tbody>{r.piezas.map(x=><tr key={x.id}><td>{x.nombre}</td><td>{num(x.ancho)} × {num(x.alto)}</td><td>{x.material}</td><td>{x.cantidad}</td></tr>)}</tbody></table></details>
 </>;
}
