import React, { useState } from 'react';
import { calcularPuerta } from '../../puertas/calcular.ts';
import { nuevoTramoAraujo, PERFILES_ARAUJO } from '../../puertas/araujo.ts';
import type { Puerta, TramoAraujo, Ventana } from '../../puertas/tipos.ts';
import { SelectField } from '../components/SelectField';
import { InputDecimal } from '../remolques/InputDecimal';
import { AlzadoPuerta } from './AlzadoPuerta';

const num=(x:number)=>x.toLocaleString('es-ES',{maximumFractionDigits:2});
function Numero({titulo,valor,cambiar}:{titulo:string;valor:number;cambiar:(v:number)=>void}){
  return <label className="field puerta-campo"><span>{titulo}</span><InputDecimal aria-label={titulo} value={valor||null} onValor={v=>cambiar(v??0)}/></label>;
}
function Texto({titulo,valor,cambiar}:{titulo:string;valor:string;cambiar:(v:string)=>void}){
  return <label className="field puerta-campo"><span>{titulo}</span><input aria-label={titulo} value={valor} onChange={e=>cambiar(e.target.value)}/></label>;
}
export function ConfigurarAraujo({p,cambiar,corte,derecha,letra}:{p:Puerta;cambiar:(p:Puerta)=>void;corte?:React.ReactNode;derecha:'alzado'|'corte';letra:string}){
  const [pestana,setPestana]=useState('datos');
  const a=p.araujo!,resultado=calcularPuerta(p);
  const set=<K extends keyof Puerta>(k:K,v:Puerta[K])=>cambiar({...p,[k]:v});
  function tramos(ts:TramoAraujo[]){cambiar({...p,frente:ts[0]?.frente??0,alto:ts.filter(t=>t.tipo==='tramo').reduce((s,t)=>s+t.alto*t.cantidad,0),araujo:{...a,tramos:ts}});}
  const tramo=(i:number,parche:Partial<TramoAraujo>)=>tramos(a.tramos.map((t,j)=>i===j?{...t,...parche}:t));
  const ventana=(i:number,j:number,parche:Partial<Ventana>)=>tramo(i,{ventanas:a.tramos[i].ventanas.map((v,k)=>j===k?{...v,...parche}:v)});
  const tabs=[['datos','Datos'],['tramos','Tramos y bolsas'],['ventanas','Ventanas'],...a.forma==='continua'?[['entradas','Entradas']]:[],['texto','Texto']];
  return <>
    <div className="puerta-config-alzado">
      <section className="puerta-config panel panel-vidrio" aria-label="Configurador de ARAUJO">
        <header><h2>Configurador</h2><span>ARAUJO · medidas en cm</span></header>
        <div className="tira-3d puerta-pestanas" role="tablist" aria-label="Partes de ARAUJO">{tabs.map(([k,t])=><button type="button" role="tab" key={k} aria-selected={pestana===k} className={`pestana ${pestana===k?'pestana-activa':''}`} onClick={()=>setPestana(k)}>{t}</button>)}</div>
        {pestana==='datos'&&<>
          <div className="puerta-campos">
            <Texto titulo="OF de puerta" valor={p.of} cambiar={v=>set('of',v)}/>
            <Numero titulo="Cantidad de conjuntos iguales" valor={p.cantidad} cambiar={v=>set('cantidad',v)}/>
            <SelectField label="Modelo de puerta" value={p.modelo} options={['PUERTAENR','PUERTAPLE']} optionLabel={v=>v==='PUERTAENR'?'Enrollable':'Plegable'} onChange={v=>set('modelo',v as Puerta['modelo'])}/>
            <SelectField label="Confección" value="araujo" options={['portanova','araujo']} optionLabel={v=>v==='araujo'?'ARAUJO · tramos y bolsas':'Portanova · puerta completa'} onChange={v=>{if(v==='portanova'){const {araujo:omitido,...resto}=p;void omitido;cambiar({...resto,confirmada:false,ventanasConfirmadas:false});}}}/>
            <Texto titulo="Color de puerta" valor={p.color} cambiar={v=>set('color',v)}/>
            <SelectField label="Forma de la lona" value={a.forma} options={['sueltos','continua']} optionLabel={v=>v==='sueltos'?'Tramos separados':'Lona continua'} onChange={v=>cambiar({...p,confirmada:false,ventanasConfirmadas:false,araujo:{...a,forma:v as typeof a.forma}})}/>
          </div>
          <p className="puerta-ayuda">Una fila por medida. Cada tramo o bolsa lleva su propia cantidad. Comprueba en la hoja si las entradas separan piezas o van soldadas sobre una lona continua.</p>
          <fieldset><legend>Canutillos de los extremos</legend>
            <SelectField label="Perfil de canutillo comprobado" value={a.perfil} options={['7','6,5']} optionLabel={v=>v==='7'?'Marcas de 7 cm · aumento de 7,4 cm':'Marcas de 6,5 cm · aumento de 7,15 cm'} onChange={v=>cambiar({...p,confirmada:false,ventanasConfirmadas:false,araujo:{...a,perfil:v as typeof a.perfil}})}/>
            <p className="puerta-ayuda">Dos canutillos con varilla blanca de 5,5 mm; laterales al corte. Si la hoja pide otro acabado, queda pendiente de estudiar.</p>
          </fieldset>
          <details><summary>Materiales y rollos</summary><div className="puerta-campos">
            <Texto titulo="Material de lona" valor={p.material} cambiar={v=>set('material',v)}/><Numero titulo="Rollo de lona (cm)" valor={p.rollo} cambiar={v=>set('rollo',v)}/>
            <Texto titulo="Material transparente" valor={p.materialCristal} cambiar={v=>set('materialCristal',v)}/><Numero titulo="Rollo transparente (cm)" valor={p.rolloCristal} cambiar={v=>set('rolloCristal',v)}/>
            <Texto titulo="Material de bolsa" valor={p.materialSaco} cambiar={v=>set('materialSaco',v)}/><Numero titulo="Rollo de bolsa (cm)" valor={p.rolloSaco} cambiar={v=>set('rolloSaco',v)}/>
            <Numero titulo="Margen de marcas (cm)" valor={p.margenMarcas} cambiar={v=>set('margenMarcas',v)}/>
          </div></details>
        </>}
        {pestana==='tramos'&&<>
          <p className="puerta-ayuda">Medidas terminadas de la hoja. En cada extremo, corte y marca según el perfil confirmado. Las bolsas pueden tener otro frente.</p>
          {a.forma==='continua'&&a.tramos.filter(t=>t.tipo==='tramo').length>1&&<><p className="puerta-ayuda">Para una lona continua, deja un cuerpo con el alto total. Las entradas intermedias se ponen en «Entradas».</p><button type="button" className="ghost-button" disabled={a.tramos.some(t=>t.tipo==='tramo'&&(t.cantidad!==1||t.ventanas.length>0||t.rotulacion||t.frente!==a.tramos.find(x=>x.tipo==='tramo')?.frente))} onClick={()=>{
            const cuerpos=a.tramos.filter(t=>t.tipo==='tramo');tramos([{...cuerpos[0],alto:cuerpos.reduce((s,t)=>s+t.alto,0)},...a.tramos.filter(t=>t.tipo==='bolsa')]);
          }}>Unir los altos en un cuerpo continuo</button></>}
          {a.tramos.map((t,i)=><fieldset key={i}><legend>{t.tipo==='bolsa'?'Bolsa':'Tramo'} {i+1} · corte {num(t.frente)} × {num(t.alto+PERFILES_ARAUJO[a.perfil].aumento)} cm</legend><div className="puerta-campos">
            <SelectField label={`Tipo de pieza ${i+1}`} value={t.tipo} options={['tramo','bolsa']} optionLabel={v=>v==='bolsa'?'Bolsa':'Tramo de lona'} onChange={v=>tramo(i,{tipo:v as TramoAraujo['tipo']})}/>
            <Numero titulo={`Frente pieza ${i+1} (cm)`} valor={t.frente} cambiar={v=>tramo(i,{frente:v})}/>
            <Numero titulo={`Alto terminado pieza ${i+1} (cm)`} valor={t.alto} cambiar={v=>tramo(i,{alto:v})}/>
            <Numero titulo={`Cantidad pieza ${i+1}`} valor={t.cantidad} cambiar={v=>tramo(i,{cantidad:v})}/>
          </div><label className="puerta-casilla"><input type="checkbox" checked={Boolean(t.rotulacion)} onChange={e=>tramo(i,{rotulacion:e.target.checked?{texto:'ANAGRAMA J. ARAUJO',ancho:0,desdeDerecha:0}:undefined})}/>Rotulación por el derecho · pieza {i+1}</label>
          {t.rotulacion&&<div className="puerta-campos"><Texto titulo={`Texto de rotulación pieza ${i+1}`} valor={t.rotulacion.texto} cambiar={v=>tramo(i,{rotulacion:{...t.rotulacion!,texto:v}})}/><Numero titulo={`Ancho de rotulación pieza ${i+1} (cm)`} valor={t.rotulacion.ancho} cambiar={v=>tramo(i,{rotulacion:{...t.rotulacion!,ancho:v}})}/><Numero titulo={`Desde derecha por el derecho pieza ${i+1} (cm)`} valor={t.rotulacion.desdeDerecha} cambiar={v=>tramo(i,{rotulacion:{...t.rotulacion!,desdeDerecha:v}})}/></div>}
          <button type="button" className="ghost-button" onClick={()=>tramos(a.tramos.filter((_,j)=>i!==j))}>Quitar pieza {i+1}</button></fieldset>)}
          <button type="button" className="ghost-button" onClick={()=>tramos([...a.tramos,{...nuevoTramoAraujo(),frente:p.frente}])}>Añadir tramo</button>{' '}
          <button type="button" className="ghost-button" onClick={()=>tramos([...a.tramos,nuevoTramoAraujo('bolsa')])}>Añadir bolsa</button>
        </>}
        {pestana==='ventanas'&&<>
          <p className="puerta-ayuda">Desde izquierda y desde el bajo terminado de cada pieza, mirando por el revés. Copia hueco y radios de la hoja comprobada. El cristal suma 2 cm por lado.</p>
          {a.tramos.map((t,i)=><fieldset key={i}><legend>Ventanas de la pieza {i+1} · {num(t.frente)} × {num(t.alto)}</legend>
            {t.ventanas.map((v,j)=><fieldset key={j}><legend>Ventana {j+1}</legend><div className="puerta-campos">{(['x','y','ancho','alto','radio','radioCristal'] as const).map(k=><Numero key={k} titulo={`${k==='x'?'Desde izquierda':k==='y'?'Desde abajo':k==='radioCristal'?'Radio cristal':k} · pieza ${i+1} ventana ${j+1}`} valor={v[k]} cambiar={n=>ventana(i,j,{[k]:n})}/>)}</div><button type="button" className="ghost-button" onClick={()=>tramo(i,{ventanas:t.ventanas.filter((_,k)=>j!==k)})}>Quitar ventana {j+1}</button></fieldset>)}
            <button type="button" className="ghost-button" onClick={()=>tramo(i,{ventanas:[...t.ventanas,{x:0,y:0,ancho:0,alto:0,radio:2,radioCristal:4}]})}>Añadir ventana a pieza {i+1}</button>
          </fieldset>)}
        </>}
        {pestana==='entradas'&&a.forma==='continua'&&<>
          <p className="puerta-ayuda">Entradas soldadas sobre el cuerpo continuo. Introduce su largo, alto de corte y eje desde el bajo terminado. No se proponen recortes ni empates.</p>
          {p.entradas.map((e,i)=><fieldset key={i}><legend>Entrada {i+1}</legend><div className="puerta-campos">{(['altura','largo','alto'] as const).map(k=><Numero key={k} titulo={`${k==='altura'?'Eje desde el bajo':k==='largo'?'Largo':'Alto de corte'} entrada ${i+1} (cm)`} valor={e[k]} cambiar={v=>set('entradas',p.entradas.map((e,j)=>i===j?{...e,[k]:v}:e))}/>)}</div><button type="button" className="ghost-button" onClick={()=>set('entradas',p.entradas.filter((_,j)=>i!==j))}>Quitar entrada {i+1}</button></fieldset>)}
          <button type="button" className="ghost-button" onClick={()=>set('entradas',[...p.entradas,{altura:0,largo:p.frente,alto:0,diametro:30,huecos:[]}])}>Añadir entrada intermedia</button>
        </>}
        {pestana==='texto'&&<div className="puerta-campos"><label className="field puerta-campo puerta-campo-ancho"><span>Texto del pedido · {p.articuloOrigen||'sin artículo RPS'}</span><textarea aria-label="Texto del pedido" value={p.observaciones} onChange={e=>set('observaciones',e.target.value)}/></label><label className="field puerta-campo puerta-campo-ancho"><span>Nota en el plano</span><textarea aria-label="Nota en el plano" value={p.notaPlano??''} onChange={e=>set('notaPlano',e.target.value)}/></label></div>}
        <div className="puerta-confirmaciones"><label className="puerta-casilla"><input type="checkbox" checked={p.confirmada&&p.ventanasConfirmadas} onChange={e=>cambiar({...p,confirmada:e.target.checked,ventanasConfirmadas:e.target.checked})}/>Confirmado con el dibujo: tramos, bolsas, cantidades, canutillos y ventanas</label></div>
      </section>
      <div className="puerta-derecha">
        {derecha==='corte'&&corte?corte:<AlzadoPuerta puerta={p} resultado={resultado} letra={letra}/>}
        <section className="puerta-avisos panel panel-vidrio" aria-label="Comprobaciones de puerta"><h2>Qué falta o revisar <span>{resultado.avisos.filter(a=>a.nivel==='error').length} pendientes</span></h2>{resultado.avisos.length?<ul>{resultado.avisos.map((a,i)=><li key={i} className={a.nivel==='error'?'es-error':''}>{a.texto}</li>)}</ul>:<p>Medidas comprobadas y coherentes.</p>}</section>
      </div>
    </div>
    <details className="puerta-piezas panel panel-vidrio"><summary>Piezas calculadas · {resultado.piezas.reduce((s,p)=>s+p.cantidad,0)}</summary><table><thead><tr><th>Pieza</th><th>Corte (cm)</th><th>Material</th><th>Cantidad</th></tr></thead><tbody>{resultado.piezas.map(x=><tr key={x.id}><td>{x.nombre}</td><td>{num(x.ancho)} × {num(x.alto)}</td><td>{x.material}</td><td>{x.cantidad}</td></tr>)}</tbody></table></details>
  </>;
}
