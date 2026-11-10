import React, { useState } from 'react';
import { calcularPuerta } from '../../puertas/calcular.ts';
import { elegirPerfilAraujo, nuevoTramoAraujo, medidasTramoAraujo } from '../../puertas/araujo.ts';
import { fichaDePuerta, tipoDePuerta } from '../../puertas/clientes.ts';
import { cambiarTipoDelCliente } from '../../puertas/nuevaPuertaCliente.ts';
import type { Puerta, TramoAraujo, Ventana } from '../../puertas/tipos.ts';
import { SelectField } from '../components/SelectField';
import { NumeroPuerta } from './NumeroPuerta';
import { medidaPuerta as num, textoMedidasMm, type UnidadPuerta } from './medidasPuertas';
import { AlzadoPuerta } from './AlzadoPuerta';

function Numero({titulo,valor,cambiar,unidad='cm'}:{titulo:string;valor:number;unidad?:UnidadPuerta;cambiar:(v:number)=>void}){
  return <NumeroPuerta titulo={titulo} valor={valor} unidad={unidad} cambiar={v=>cambiar(v??0)}/>;
}
function Texto({titulo,valor,cambiar}:{titulo:string;valor:string;cambiar:(v:string)=>void}){
  return <label className="field puerta-campo"><span>{titulo}</span><input aria-label={titulo} value={valor} onChange={e=>cambiar(e.target.value)}/></label>;
}
export function ConfigurarAraujo({p,cambiar,corte,derecha,letra}:{p:Puerta;cambiar:(p:Puerta)=>void;corte?:React.ReactNode;derecha:'alzado'|'corte';letra:string}){
  const [pestana,setPestana]=useState('datos');
  const a=p.araujo!,resultado=calcularPuerta(p);
  const ficha=fichaDePuerta(p),perfiles=ficha.perfiles;
  const set=<K extends keyof Puerta>(k:K,v:Puerta[K])=>cambiar({...p,[k]:v});
  function tramos(ts:TramoAraujo[]){cambiar({...p,frente:ts[0]?.frente??0,alto:ts.filter(t=>t.tipo==='tramo').reduce((s,t)=>s+t.alto*t.cantidad,0),araujo:{...a,tramos:ts}});}
  const tramo=(i:number,parche:Partial<TramoAraujo>)=>tramos(a.tramos.map((t,j)=>i===j?{...t,...parche}:t));
  const ventana=(i:number,j:number,parche:Partial<Ventana>)=>tramo(i,{ventanas:a.tramos[i].ventanas.map((v,k)=>j===k?{...v,...parche}:v)});
  const tabs=[['datos','Datos'],['tramos','Tramos y bolsas'],['ventanas','Ventanas'],['entradas','E.T.'],['texto','Texto']];
  return <>
    <div className="puerta-config-alzado">
      <section className="puerta-config panel panel-vidrio" aria-label="Configurador de Araujo">
        <header><h2>Configurador</h2><span>{ficha.nombre} · medidas en mm</span></header>
        <div className="tira-3d puerta-pestanas" role="tablist" aria-label="Partes de Araujo">{tabs.map(([k,t])=><button type="button" role="tab" key={k} aria-selected={pestana===k} className={`pestana ${pestana===k?'pestana-activa':''}`} onClick={()=>setPestana(k)}>{t}</button>)}</div>
        {pestana==='datos'&&<>
          <div className="puerta-campos">
            <Texto titulo="OF de puerta" valor={p.of} cambiar={v=>set('of',v)}/>
            <Numero titulo="Cantidad de conjuntos iguales" unidad="cantidad" valor={p.cantidad} cambiar={v=>set('cantidad',v)}/>
            <SelectField label="Tipo de puerta" value={tipoDePuerta(p).id} options={ficha.tipos.map(t=>t.id)} optionLabel={v=>ficha.tipos.find(t=>t.id===v)?.nombre??''} onChange={v=>cambiar(cambiarTipoDelCliente(p,v))}/>
            <Texto titulo="Color de puerta" valor={p.color} cambiar={v=>set('color',v)}/>
          </div>
          <p className="puerta-ayuda">Una fila por medida. Cada tramo o bolsa lleva su propia cantidad. Comprueba en la hoja si las entradas separan piezas o van soldadas sobre una lona continua.</p>
          <fieldset><legend>Canutillos de los extremos</legend>
            <SelectField label="Perfil de canutillo comprobado" value={a.perfil} options={Object.keys(perfiles)} optionLabel={v=>perfiles[v]?`${perfiles[v].nombre??'Canutillo'} · canutillo de ${num(perfiles[v].marca)} mm`:''} onChange={v=>cambiar(elegirPerfilAraujo(p,v))}/>
            <p className="puerta-ayuda">Introduce las medidas del cliente. El canutillo de 70 mm es el habitual, también en LAC 900; COMB de 65 mm se elige a mano. La línea de rotulador va a {num(perfiles[a.perfil].marca)} mm del corte y la referencia de lona terminada, a {num(perfiles[a.perfil].aumento/2)} mm, solo en el plano.</p>
            <p className="puerta-ayuda">{textoMedidasMm(ficha.remates??'')}. El ancho de cada E.T. se introduce en su pieza.</p>
            {!ficha.rollosConfirmados&&<p className="puerta-ayuda">Comprueba los anchos reales en «Materiales y rollos» antes de generar el corte.</p>}
          </fieldset>
          <label className="puerta-casilla"><input type="checkbox" checked={Boolean(a.corteTrasImprimir)} onChange={e=>cambiar({...p,confirmada:false,ventanasConfirmadas:false,araujo:{...a,corteTrasImprimir:e.target.checked}})}/>Cortar el cuerpo después de imprimir</label>
          {a.corteTrasImprimir&&<p className="puerta-ayuda">El alto del cuerpo cruza el rollo y se conserva la orientación de la impresión. Si supera el rollo, se reparte en paños y el superior lleva 20 mm más para soldar. El plano acota las entradas también en el corte.</p>}
          <details><summary>Materiales y rollos</summary><div className="puerta-campos">
            <Texto titulo="Material de lona" valor={p.material} cambiar={v=>set('material',v)}/><Numero titulo="Rollo de lona (mm)" valor={p.rollo} cambiar={v=>set('rollo',v)}/>
            <Texto titulo="Material transparente" valor={p.materialCristal} cambiar={v=>set('materialCristal',v)}/><Numero titulo="Rollo transparente (mm)" valor={p.rolloCristal} cambiar={v=>set('rolloCristal',v)}/>
            <Texto titulo="Material de bolsa" valor={p.materialSaco} cambiar={v=>set('materialSaco',v)}/><Numero titulo="Rollo de bolsa (mm)" valor={p.rolloSaco} cambiar={v=>set('rolloSaco',v)}/>
            <Numero titulo="Margen de marcas (mm)" valor={p.margenMarcas} cambiar={v=>set('margenMarcas',v)}/>
          </div></details>
        </>}
        {pestana==='tramos'&&<>
          <p className="puerta-ayuda">Medidas terminadas de la hoja. En cada extremo, corte y marca según el perfil confirmado. Las bolsas pueden tener otro frente.</p>
          {a.forma==='continua'&&a.tramos.filter(t=>t.tipo==='tramo').length>1&&<><p className="puerta-ayuda">Para una lona continua, deja un cuerpo con el alto total. Las entradas intermedias se ponen en «E.T.».</p><button type="button" className="ghost-button" disabled={a.tramos.some(t=>t.tipo==='tramo'&&(t.cantidad!==1||t.ventanas.length>0||t.rotulacion||t.entradas?.length||t.arriba?.tipo==='et'||t.abajo?.tipo==='et'||t.material||t.of||t.frente!==a.tramos.find(x=>x.tipo==='tramo')?.frente))} onClick={()=>{
            const cuerpos=a.tramos.filter(t=>t.tipo==='tramo');tramos([{...cuerpos[0],alto:cuerpos.reduce((s,t)=>s+t.alto,0)},...a.tramos.filter(t=>t.tipo==='bolsa')]);
          }}>Unir los altos en un cuerpo continuo</button></>}
          {a.tramos.map((t,i)=><fieldset key={i}><legend>{t.tipo==='bolsa'?'Bolsa':'Tramo'} {i+1} · corte {num(t.frente)} × {num(medidasTramoAraujo(t,perfiles[a.perfil]).alto)} mm</legend><div className="puerta-campos">
            <SelectField label={`Tipo de pieza ${i+1}`} value={t.tipo} options={['tramo','bolsa']} optionLabel={v=>v==='bolsa'?'Bolsa':'Tramo de lona'} onChange={v=>tramo(i,{tipo:v as TramoAraujo['tipo']})}/>
            <Numero titulo={`Frente pieza ${i+1} (mm)`} valor={t.frente} cambiar={v=>tramo(i,{frente:v})}/>
            <Numero titulo={`Alto terminado pieza ${i+1} (mm)`} valor={t.alto} cambiar={v=>tramo(i,{alto:v})}/>
            <Texto titulo={`OF pieza ${i+1}`} valor={t.of??p.of} cambiar={v=>tramo(i,{of:v})}/>
            <Texto titulo={`Material pieza ${i+1}`} valor={t.material??(t.tipo==='bolsa'?p.materialSaco:`${p.material} ${p.color}`)} cambiar={v=>tramo(i,{material:v})}/>
            <Numero titulo={`Cantidad pieza ${i+1}`} unidad="cantidad" valor={t.cantidad} cambiar={v=>tramo(i,{cantidad:v})}/>
          </div><div className="puerta-campos">{(['arriba','abajo'] as const).map(k=><React.Fragment key={k}>
            <SelectField label={`Extremo ${k} pieza ${i+1}`} value={t[k]?.tipo??'canutillo'} options={['canutillo','et']} optionLabel={v=>v==='et'?'E.T. · Bolsa soldada':'Canutillo · Varilla blanca'} onChange={v=>tramo(i,{[k]:v==='et'?{tipo:'et',ancho:0}:{tipo:'canutillo'}})}/>
            {t[k]?.tipo==='et'&&<Numero titulo={`Ancho E.T. ${k} pieza ${i+1} (mm)`} valor={t[k].ancho} cambiar={v=>tramo(i,{[k]:{tipo:'et',ancho:v}})}/>}
          </React.Fragment>)}</div><label className="puerta-casilla"><input type="checkbox" checked={Boolean(t.rotulacion)} onChange={e=>tramo(i,{rotulacion:e.target.checked?{texto:`Anagrama ${ficha.nombre}`,ancho:0,desdeDerecha:0,...ficha.rotulacion}:undefined})}/>Rotulación por el derecho · pieza {i+1}</label>
          {t.rotulacion&&<>
            <div className="puerta-campos"><Texto titulo={`Texto de rotulación pieza ${i+1}`} valor={t.rotulacion.texto} cambiar={v=>tramo(i,{rotulacion:{...t.rotulacion!,texto:v}})}/><Numero titulo={`Ancho de rotulación pieza ${i+1} (mm)`} valor={t.rotulacion.ancho} cambiar={v=>tramo(i,{rotulacion:{...t.rotulacion!,ancho:v}})}/><Numero titulo={`Desde derecha por el derecho pieza ${i+1} (mm)`} valor={t.rotulacion.desdeDerecha} cambiar={v=>tramo(i,{rotulacion:{...t.rotulacion!,desdeDerecha:v}})}/>
              <Numero titulo={`Alto desde el bajo pieza ${i+1} (mm)`} valor={t.rotulacion.desdeBajo??8} cambiar={v=>tramo(i,{rotulacion:{...t.rotulacion!,desdeBajo:v,centrada:false}})}/>
            </div>
            <p className="puerta-ayuda">Anagrama habitual de Araujo: copia su ancho, la distancia al borde derecho y el alto desde el bajo (80 mm por defecto). No genera ningún corte de máquina.</p>
          </>}
          <button type="button" className="ghost-button" onClick={()=>tramos(a.tramos.filter((_,j)=>i!==j))}>Quitar pieza {i+1}</button></fieldset>)}
          <button type="button" className="ghost-button" onClick={()=>tramos([...a.tramos,{...nuevoTramoAraujo(),frente:p.frente}])}>Añadir tramo</button>{' '}
          <button type="button" className="ghost-button" onClick={()=>tramos([...a.tramos,nuevoTramoAraujo('bolsa')])}>Añadir bolsa</button>
        </>}
        {pestana==='ventanas'&&<>
          <p className="puerta-ayuda">Desde izquierda y desde el bajo terminado de cada pieza, mirando por el revés. Copia hueco y radios de la hoja comprobada. El cristal suma 20 mm por lado.</p>
          {a.tramos.map((t,i)=><fieldset key={i}><legend>Ventanas de la pieza {i+1} · {num(t.frente)} × {num(t.alto)}</legend>
            {t.ventanas.map((v,j)=><fieldset key={j}><legend>Ventana {j+1}</legend><div className="puerta-campos">{(['x','y','ancho','alto','radio','radioCristal'] as const).map(k=><Numero key={k} titulo={`${k==='x'?'Desde izquierda':k==='y'?'Desde abajo':k==='radioCristal'?'Radio cristal':k} · pieza ${i+1} ventana ${j+1}`} valor={v[k]} cambiar={n=>ventana(i,j,{[k]:n})}/>)}</div><button type="button" className="ghost-button" onClick={()=>tramo(i,{ventanas:t.ventanas.filter((_,k)=>j!==k)})}>Quitar ventana {j+1}</button></fieldset>)}
            <button type="button" className="ghost-button" onClick={()=>tramo(i,{ventanas:[...t.ventanas,{x:0,y:0,ancho:0,alto:0,radio:2,radioCristal:4}]})}>Añadir ventana a pieza {i+1}</button>
          </fieldset>)}
        </>}
        {pestana==='entradas'&&<>
          <p className="puerta-ayuda">E.T. intermedias: copia el ancho y el eje desde el bajo terminado de cada pieza. Se conservan sus marcas y referencias; no se cortan tiras de E.T. «Dejar huecos» es una indicación de soldadura; no recorta la lona.</p>
          {a.tramos.map((t,i)=><fieldset key={i}><legend>E.T. intermedias de pieza {i+1}</legend>
            {(t.entradas??[]).map((e,j)=><fieldset key={j}><legend>E.T. {j+1}</legend><div className="puerta-campos">
              {(['altura','ancho','huecoLibre'] as const).map(k=><Numero key={k} titulo={`${k==='altura'?'Eje desde el bajo':k==='ancho'?'Ancho E.T.':'Dejar huecos'} pieza ${i+1} E.T. ${j+1} (mm)`} valor={e[k]??0} cambiar={v=>tramo(i,{entradas:t.entradas!.map((q,n)=>n===j?{...q,[k]:k==='huecoLibre'&&!v?undefined:v}:q)})}/>)}
            </div><button type="button" className="ghost-button" onClick={()=>tramo(i,{entradas:t.entradas!.filter((_,n)=>n!==j)})}>Quitar E.T. {j+1} de pieza {i+1}</button></fieldset>)}
            <button type="button" className="ghost-button" onClick={()=>tramo(i,{entradas:[...t.entradas??[],{altura:0,ancho:0}]})}>Añadir E.T. a pieza {i+1}</button>
          </fieldset>)}
          {a.forma==='continua'&&p.entradas.length>0&&<>

          <p className="puerta-ayuda">Entradas soldadas sobre el cuerpo continuo. Introduce su largo, ancho de E.T. y eje desde el bajo terminado. No se proponen recortes ni empates.</p>
          {p.entradas.map((e,i)=><fieldset key={i}><legend>Entrada {i+1}</legend><div className="puerta-campos">{(['altura','largo','alto'] as const).map(k=><Numero key={k} titulo={`${k==='altura'?'Eje desde el bajo':k==='largo'?'Largo':'Ancho E.T.'} entrada ${i+1} (mm)`} valor={e[k]} cambiar={v=>set('entradas',p.entradas.map((e,j)=>i===j?{...e,[k]:v}:e))}/>)}</div><button type="button" className="ghost-button" onClick={()=>set('entradas',p.entradas.filter((_,j)=>i!==j))}>Quitar entrada {i+1}</button></fieldset>)}
          </>}
        </>}
        {pestana==='texto'&&<div className="puerta-campos"><label className="field puerta-campo puerta-campo-ancho"><span>Texto del pedido · {p.articuloOrigen||'sin artículo RPS'}</span><textarea aria-label="Texto del pedido" value={p.observaciones} onChange={e=>set('observaciones',e.target.value)}/></label><label className="field puerta-campo puerta-campo-ancho"><span>Nota en el plano</span><textarea aria-label="Nota en el plano" value={p.notaPlano??''} onChange={e=>set('notaPlano',e.target.value)}/></label></div>}
        <div className="puerta-confirmaciones"><label className="puerta-casilla"><input type="checkbox" checked={p.confirmada&&p.ventanasConfirmadas} onChange={e=>cambiar({...p,confirmada:e.target.checked,ventanasConfirmadas:e.target.checked})}/>Confirmado con el dibujo: tramos, bolsas, cantidades, canutillos y ventanas</label></div>
      </section>
      <div className="puerta-derecha">
        {derecha==='corte'&&corte?corte:<AlzadoPuerta puerta={p} resultado={resultado} letra={letra}/>}
        <section className="puerta-avisos panel panel-vidrio" aria-label="Comprobaciones de puerta"><h2>Qué falta o revisar <span>{resultado.avisos.filter(a=>a.nivel==='error').length} pendientes</span></h2>{resultado.avisos.length?<ul>{resultado.avisos.map((a,i)=><li key={i} className={a.nivel==='error'?'es-error':''}>{textoMedidasMm(a.texto)}</li>)}</ul>:<p>Medidas comprobadas y coherentes.</p>}</section>
      </div>
    </div>
    <details className="puerta-piezas panel panel-vidrio"><summary>Piezas calculadas · {resultado.piezas.reduce((s,p)=>s+p.cantidad,0)}</summary><table><thead><tr><th>Pieza</th><th>Corte (mm)</th><th>Material</th><th>Cantidad</th></tr></thead><tbody>{resultado.piezas.map(x=><tr key={x.id}><td>{x.nombre}</td><td>{num(x.ancho)} × {num(x.alto)}</td><td>{x.material}</td><td>{x.cantidad}</td></tr>)}</tbody></table></details>
  </>;
}
