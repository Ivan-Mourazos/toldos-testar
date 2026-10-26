import React, { useCallback, useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Eraser, Plus, Save, Trash2 } from 'lucide-react';
import { alturasTubos, calcularPuerta, huecosEntrada, MODELOS_PUERTAS, nuevaPuerta } from '../../puertas/calcular.ts';
import type { PedidoPuertasGuardado } from '../../puertas/flujo/tipos.ts';
import { REGLAS_SYSTEM_DOCK } from '../../puertas/systemDock.ts';
import { medidasSaco, sacoPuerta, sacoUtil } from '../../puertas/saco.ts';
import type { Entrada, Hueco, ModeloPuerta, Puerta, Ventana } from '../../puertas/tipos.ts';
import type { AskForConfirmation, Notify } from '../components/NotificationCenter';
import { OrderActions } from '../components/OrderActions';
import { SelectField } from '../components/SelectField';
import { SegmentedField } from '../components/SegmentedField';
import { guardarPuertasParaRevision, pedidoDesdeGuardado, pedidoDesdeRps, type ModoCargaPuertas, type PedidoPantallaPuertas, type PuertasRps } from './guardarPuertas';
import { InputDecimal } from '../remolques/InputDecimal';
import type { ResumenPedido } from '../remolques/SelectorProducto';
import { AlzadoPuerta } from './AlzadoPuerta';
import { CorteResumen, useVistaCortePuertas, VistaCortePuertas } from './VistaCortePuertas';
import { cintasDesdeCotas, ejesDesdeTramos, leerCadena } from './cadenaDibujo';
import { avanzarConIntro } from '../avanzarConIntro';
import './puertas.css';

const num=(x:number)=>x.toLocaleString('es-ES',{maximumFractionDigits:2});
function Numero({titulo,valor,cambiar}:{titulo:string;valor:number|null;cambiar:(n:number|null)=>void}) {
  return <label className="field puerta-campo"><span>{titulo}</span><InputDecimal aria-label={titulo} value={valor} onValor={cambiar}/></label>;
}
/** Medidas del saco con la regla del 23/10/2026: el del pedido, rematado 1 cm más grande. */
function AyudaSaco({p}:{p:Puerta}) {
  const util=sacoUtil(p);
  if(util===null) return <p className="puerta-ayuda">Pon el saco que dice el pedido, en mm (80, 110, 120…).</p>;
  const s=medidasSaco(util,p.modelo);
  return <p className="puerta-ayuda">Rematado {num(s.rematado)} cm (1 cm más que el pedido){p.modelo==='PUERTAENR'?', libre bajo el paño, + 2 de soldar':''} · corte {num(s.corte)} cm{s.altoPestana>0?` · pestaña ${p.modelo==='PUERTAENR'?'6,5':'10'} × ${num(s.altoPestana)}`:''}. En el plano pone «SACO DE {util}».</p>;
}
function Lista({titulo,valores,cambiar,ayuda}:{titulo:string;valores:number[];cambiar:(n:number[])=>void;ayuda?:string}) {
  const [texto,setTexto]=useState(valores.map(num).join('; ')),[error,setError]=useState(false);
  const [anterior,setAnterior]=useState(valores);
  const ayudaId=useId();
  if(anterior!==valores) { setAnterior(valores); setTexto(valores.map(num).join('; ')); }
  return <label className="field puerta-campo puerta-campo-ancho"><span>{titulo}</span><input aria-label={titulo} value={texto} aria-invalid={error} aria-describedby={ayudaId} onChange={e=>{
    const t=e.target.value; setTexto(t);
    const partes=t.trim()?t.split(';').map(x=>Number(x.trim().replace(',','.'))):[];
    const mal=partes.some(x=>!Number.isFinite(x)); setError(mal);
  }} onBlur={()=>{const partes=texto.trim()?texto.split(';').map(x=>Number(x.trim().replace(',','.'))):[]; if(partes.every(Number.isFinite)) cambiar(partes);}}/><small id={ayudaId} className={error?'field-hint-warn':undefined}>{error?'Escribe números separados por ;':ayuda||'Separa con ; y usa coma para los decimales.'}</small></label>;
}
function Huecos({huecos,cambiar}:{huecos:Hueco[];cambiar:(h:Hueco[])=>void}) {
  return <div className="puerta-huecos">{huecos.map((h,j)=><div className="puerta-hueco" key={j}>
    {(['x','y','ancho','alto','radio'] as const).map(k=><Numero key={k} titulo={`${k==='x'?'Desde izquierda':k==='y'?'Desde abajo':k} · hueco ${j+1}`} valor={h[k]} cambiar={v=>cambiar(huecos.map((x,i)=>i===j?{...x,[k]:v??0}:x))}/>)}
    <button type="button" className="ghost-button" aria-label={`Quitar hueco ${j+1}`} onClick={()=>cambiar(huecos.filter((_,i)=>i!==j))}><Trash2 size={16}/></button>
  </div>)}<button type="button" className="ghost-button" onClick={()=>cambiar([...huecos,{x:0,y:0,ancho:12,alto:7.5,radio:0.5}])}>Añadir hueco</button></div>;
}
function Configurar({p,cambiar,corte,derecha='alzado',cambiarDerecha}:{p:Puerta;cambiar:(p:Puerta)=>void;corte?:React.ReactNode;derecha?:'alzado'|'corte';cambiarDerecha?:(v:'alzado'|'corte')=>void}) {
  const resultado=calcularPuerta(p);
  // System Dock: una lona rectangular; sin cristal, saco, tubos ni ventanas (src/puertas/systemDock.ts).
  const sd=p.modelo==='SYSTEMDOCK';
  const set=<K extends keyof Puerta>(k:K,v:Puerta[K])=>cambiar({...p,[k]:v});
  function cadena(parche:Partial<Puerta['apilable']>) {
    const nuevo={...p,apilable:{...p.apilable,...parche}};
    nuevo.entradas=alturasTubos(nuevo).map((altura,i)=>({...p.entradas[i]??{diametro:30,largo:p.frente+(p.frente>600?2:0),alto:12,huecos:[]},altura}));
    cambiar(nuevo);
  }
  function entrada(i:number,parche:Partial<Entrada>) { set('entradas',p.entradas.map((e,j)=>j===i?{...e,...parche}:e)); }
  // El paño inferior arranca en el rematado del saco, lo libre (13 con el de 120).
  const propuestaInferior=p.alto-p.enrollable.T-p.enrollable.D-(p.enrollable.ventanales??[]).reduce((s,v)=>s+v.D,0)+3.75-sacoPuerta(p).rematado;
  return <>
    <div className="puerta-config-alzado">
      <section className="puerta-config panel panel-vidrio" aria-label="Configurador de puerta">
        <header><h2>Configurador</h2><span>{sd?'System Dock · lona perimetral':'Portanova'} · medidas en cm</span></header>
        <div className="puerta-campos">
          {/* En el orden en que se leen el pedido y el dibujo (Iván, 25/10/2026): OF y cantidad, que vienen de RPS;
              después el modelo, las medidas y el color. Material y rollos, que casi no cambian, en «Materiales y rollos». */}
          <label className="puerta-campo"><span>OF</span><input aria-label="OF de puerta" value={p.of} placeholder="SIN OF" onChange={e=>set('of',e.target.value)}/></label>
          <Numero titulo={sd?'Cantidad de lonas iguales':'Cantidad de puertas iguales'} valor={p.cantidad} cambiar={v=>set('cantidad',v??0)}/>
          <SelectField label="Modelo de puerta" value={p.modelo} options={Object.keys(MODELOS_PUERTAS)} optionLabel={v=>MODELOS_PUERTAS[v as ModeloPuerta]} onChange={v=>cambiar({...p,modelo:v as ModeloPuerta,entradas:[],ventanas:[],confirmada:false,ventanasConfirmadas:v==='SYSTEMDOCK',
            ...(v==='SYSTEMDOCK'?{material:REGLAS_SYSTEM_DOCK.material,color:REGLAS_SYSTEM_DOCK.color,rollo:REGLAS_SYSTEM_DOCK.rollo}:{})})}/>
          <Numero titulo={sd?'Largo de la lona (cm)':'Frente (cm)'} valor={p.frente||null} cambiar={v=>set('frente',v??0)}/>
          {!(p.modelo==='PUERTAPLE'&&p.apilable.sueloInclinado)&&<Numero titulo={sd?'Ancho de la lona (cm)':'Alto (cm)'} valor={p.alto||null} cambiar={v=>set('alto',v??0)}/>}
          <label className="puerta-campo"><span>Color / RAL</span><input aria-label="Color de puerta" value={p.color} placeholder="Azul 5002" onChange={e=>set('color',e.target.value)}/></label>
        </div>
        {sd&&<p className="puerta-ayuda">Lona perimetral: corte de {num(p.frente+REGLAS_SYSTEM_DOCK.largo)} × {num(p.alto+REGLAS_SYSTEM_DOCK.ancho)} cm (+1 de largo, al corte, y +6,6 de ancho, con varilla negra de 4,5 a los dos lados). Sin rotulador.</p>}
        {p.modelo==='PUERTAENR'&&<fieldset><legend>Ventanal superior</legend><div className="puerta-campos">
          <Numero titulo="T · desde arriba al eje (cm)" valor={p.enrollable.T||null} cambiar={v=>set('enrollable',{...p.enrollable,T:v??0})}/>
          <Numero titulo="D · entre ejes (cm)" valor={p.enrollable.D} cambiar={v=>set('enrollable',{...p.enrollable,D:v??0})}/>
          <Numero titulo="Margen lateral m (cm)" valor={p.enrollable.margen||null} cambiar={v=>set('enrollable',{...p.enrollable,margen:v??0})}/>
        </div>
          {(p.enrollable.ventanales??[]).map((v,i)=><fieldset key={i}><legend>Ventanal {i+2} · debajo del anterior</legend><div className="puerta-campos">
            <Numero titulo={`D · entre ejes ventanal ${i+2} (cm)`} valor={v.D} cambiar={n=>set('enrollable',{...p.enrollable,ventanales:p.enrollable.ventanales!.map((v,j)=>i===j?{...v,D:n??0}:v)})}/>
            <Numero titulo={`Margen lateral ventanal ${i+2} (cm)`} valor={v.margen} cambiar={n=>set('enrollable',{...p.enrollable,ventanales:p.enrollable.ventanales!.map((v,j)=>i===j?{...v,margen:n??0}:v)})}/>
            <button type="button" className="ghost-button" onClick={()=>set('enrollable',{...p.enrollable,ventanales:p.enrollable.ventanales!.filter((_,j)=>j!==i)})}>Quitar ventanal {i+2}</button>
          </div></fieldset>)}
          <button type="button" className="ghost-button" disabled={(p.enrollable.ventanales?.length??0)>=99} onClick={()=>set('enrollable',{...p.enrollable,ventanales:[...p.enrollable.ventanales??[],{D:0,margen:0}]})}>Añadir ventanal debajo</button>
          {Boolean(p.enrollable.ventanales?.length)&&<p className="puerta-ayuda">Ventanales consecutivos: comparten el eje intermedio. Se cortan sus cachos por separado y dos entradas entre ventanales, una por delante y otra por detrás. Indica las cotas del dibujo para cada uno.</p>}
          <div className="puerta-campos"><TramosET p={p} cambiar={cambiar}/></div>
          <p className="puerta-ayuda">Paño inferior: {propuestaInferior>0?`${num(propuestaInferior)} cm`:'pendiente de medidas'} </p><div className="puerta-campos"><SacoUtil valor={sacoUtil(p)} cambiar={v=>set('enrollable',{...p.enrollable,saco:v})}/></div><AyudaSaco p={p}/><label className="puerta-casilla"><input type="checkbox" checked={Boolean(p.enrollable.sacoPartido)} onChange={e=>set('enrollable',{...p.enrollable,sacoPartido:e.target.checked})}/>Saco en dos piezas con unión de 2 cm</label></fieldset>}
        {!sd&&<><label className="puerta-casilla"><input type="checkbox" checked={Boolean(p.sacoDiagonalesAmarillas)} onChange={e=>set('sacoDiagonalesAmarillas',e.target.checked)}/>Saco con diagonales amarillas (impresión digital)</label>
        <label className="puerta-casilla"><input type="checkbox" checked={p.bolsillo} onChange={e=>set('bolsillo',e.target.checked)}/>Bolsillo · solo marcas, si lo pide el dibujo</label></>}
        {p.bolsillo&&<fieldset><legend>Posición del bolsillo según el dibujo · cm</legend><div className="puerta-campos">
          <Numero titulo="Distancia del bolsillo al borde (cm)" valor={p.medidasBolsillo.distancia||null} cambiar={v=>set('medidasBolsillo',{...p.medidasBolsillo,distancia:v??0})}/>
          <Numero titulo="Ancho del bolsillo (cm)" valor={p.medidasBolsillo.ancho||null} cambiar={v=>set('medidasBolsillo',{...p.medidasBolsillo,ancho:v??0})}/>
          <SegmentedField label="Lado del bolsillo por el revés" value={p.medidasBolsillo.lado==='izquierdo'?'Izquierdo':'Derecho'} options={['Izquierdo','Derecho']} onChange={v=>set('medidasBolsillo',{...p.medidasBolsillo,lado:v==='Izquierdo'?'izquierdo':'derecho'})}/>
          <Numero titulo="Altura superior del bolsillo desde el bajo terminado (cm)" valor={p.medidasBolsillo.altoSuperior??18} cambiar={v=>set('medidasBolsillo',{...p.medidasBolsillo,altoSuperior:v})}/>
          <button type="button" className="ghost-button" onClick={()=>set('medidasBolsillo',{...p.medidasBolsillo,altoSuperior:null})}>Usar altura propuesta</button>
        </div><p className="puerta-ayuda">Propuesta: 1 cm sobre el saco doblado + 17 cm de bolsillo = 18 cm. Puedes corregirla. Solo se marcan dos esquinas en L de 0,5 cm.</p></fieldset>}
        {p.modelo==='PUERTAPLE'&&<fieldset><legend>Tubos y saco</legend>
          <label className="puerta-casilla"><input type="checkbox" checked={Boolean(p.apilable.sueloInclinado)} onChange={e=>cadena({sueloInclinado:e.target.checked?{altoIzquierdo:p.alto,altoDerecho:p.alto}:undefined})}/>Suelo inclinado</label>
          {p.apilable.sueloInclinado&&<><div className="puerta-campos">
            <Numero titulo="Alto del lado izquierdo (cm)" valor={p.apilable.sueloInclinado.altoIzquierdo||null} cambiar={v=>cambiar({...p,alto:v??0,apilable:{...p.apilable,sueloInclinado:{...p.apilable.sueloInclinado!,altoIzquierdo:v??0}}})}/>
            <Numero titulo="Alto del lado derecho (cm)" valor={p.apilable.sueloInclinado.altoDerecho||null} cambiar={v=>cadena({sueloInclinado:{...p.apilable.sueloInclinado!,altoDerecho:v??0}})}/>
          </div><p className="puerta-ayuda">Mirando por el revés, como el alzado y la hoja de pedido de Portanova. Pie y cadena desde el bajo izquierdo; los tubos y la cabecera siguen horizontales. Solo se inclinan el bajo del primer paño y el saco.</p></>}
          <CadenaDibujo p={p} cadena={cadena}/>
          <div className="puerta-campos">
          <Numero titulo={p.apilable.sueloInclinado?'Pie izquierdo hasta primer eje (cm)':'Pie hasta primer eje (cm)'} valor={p.apilable.pie||null} cambiar={v=>cadena({pie:v??0})}/>
          <Numero titulo="Cabecera hasta último eje (cm)" valor={p.apilable.cabecera||null} cambiar={v=>cadena({cabecera:v??0})}/>
          <Numero titulo="Bolsillo superior (cm)" valor={p.apilable.bolsillo} cambiar={v=>cadena({bolsillo:v??0})}/>
          <Lista titulo="Pasos entre tubos (cm)" valores={p.apilable.pasos} cambiar={v=>cadena({pasos:v})} ayuda="Un valor por tramo, de abajo arriba, separado con ;"/>
          <fieldset className="puerta-control" disabled={p.apilable.doble}>
            <SacoUtil valor={p.apilable.saco} cambiar={v=>cadena({saco:v})}/>
          </fieldset>
          <SegmentedField label="Pestaña del saco por el revés" value={p.apilable.ladoPestana==='derecha'?'Derecha':'Izquierda'} options={['Izquierda','Derecha']} onChange={v=>cadena({ladoPestana:v==='Derecha'?'derecha':'izquierda'})}/>
          <label className="puerta-casilla"><input type="checkbox" checked={p.apilable.doble} onChange={e=>cadena({doble:e.target.checked,...(e.target.checked?{saco:80}:{})})}/>Doble saco</label>
          {p.apilable.doble?<p className="puerta-ayuda">El saco de 80 integrado queda rematado de 9 cm: el paño empieza 11,5 cm por debajo del bajo.</p>:<AyudaSaco p={p}/>}
        </div><RecortesCintas p={p} cambiar={cambiar}/></fieldset>}
        {p.modelo==='PUERTAUTO'&&<fieldset><legend>Autorreparable</legend><p className="puerta-ayuda">Dos entradas (F + 11) × 21. El cuerpo arranca en el rematado del saco y acaba 3,5 cm por encima del alto; se añaden 2 cm por empate.</p>
          <div className="puerta-campos"><SacoUtil valor={sacoUtil(p)} cambiar={v=>set('autorreparable',{...p.autorreparable,saco:v})}/></div><AyudaSaco p={p}/>
          <label className="puerta-casilla"><input type="checkbox" checked={Boolean(p.autorreparable.espaciadorCentral)} onChange={e=>set('autorreparable',{...p.autorreparable,espaciadorCentral:e.target.checked})}/>Espaciador central (líneas verticales en medio del dibujo)</label>
          <div className="puerta-campos"><Numero titulo="Rayas laterales a (cm del borde, según el pedido)" valor={p.autorreparable.distanciaEspaciador??10} cambiar={v=>set('autorreparable',{...p.autorreparable,distanciaEspaciador:v??0})}/>
          <Lista titulo="Empates desde abajo del cuerpo (cm)" valores={p.autorreparable.empates} cambiar={v=>set('autorreparable',{...p.autorreparable,empates:v})}/></div></fieldset>}
        {/* Una casilla para todo (Iván, 25/10/2026): modelo, medidas y ventanas se miran a la vez en el dibujo. */}
        <div className="puerta-confirmaciones">
          <label className="puerta-casilla"><input type="checkbox" checked={p.confirmada&&(sd||p.ventanasConfirmadas)}
            onChange={e=>cambiar({...p,confirmada:e.target.checked,ventanasConfirmadas:sd||e.target.checked})}/>
            {sd?'Confirmado con el pedido: medidas de la lona':`Confirmado con el dibujo: modelo, medidas y ${p.modelo==='PUERTAENR'?'ventanal':'ventanas (o puerta ciega)'}`}</label>
        </div>
      </section>
      {/* Lo que falta, junto al alzado: se ve sin bajar hasta el final (Iván, 25/10/2026). */}
      <div className="puerta-derecha">
        {/* El corte entero a un clic, sin bajar (Iván, 26/10/2026). */}
        {corte&&cambiarDerecha&&<div className="tira-3d puerta-derecha-pestanas" role="group" aria-label="Ver junto al configurador">{(['alzado','corte'] as const).map(v=><button type="button" key={v} className={`pestana ${derecha===v?'pestana-activa':''}`} aria-pressed={derecha===v} onClick={()=>cambiarDerecha(v)}>{v==='alzado'?'Alzado':'Corte'}</button>)}</div>}
        {derecha==='corte'&&corte?corte:<AlzadoPuerta puerta={p} resultado={resultado}/>}
        <section className="puerta-avisos panel panel-vidrio" aria-label="Comprobaciones de puerta">
          <h2>Qué falta o revisar <span>{resultado.avisos.filter(a=>a.nivel==='error').length} pendientes</span></h2>
          {resultado.avisos.length?<ul>{resultado.avisos.map((a,i)=><li key={i} className={a.nivel==='error'?'es-error':''}>{a.texto}</li>)}</ul>:<p>Todo listo: las medidas comprobadas son coherentes.</p>}
        </section>
      </div>
    </div>
    <section className="puerta-detalles panel panel-vidrio" aria-label="Detalles de confección">
      <details><summary>Materiales y rollos · {p.material||'sin material'} · rollo {p.rollo?`${num(p.rollo)} cm`:'sin poner'}</summary><div className="puerta-campos">
        <label className="puerta-campo"><span>Material de lona</span><input aria-label="Material de lona" value={p.material} onChange={e=>set('material',e.target.value)}/></label>
        <Numero titulo="Rollo de lona (cm)" valor={p.rollo||null} cambiar={v=>set('rollo',v??0)}/>
        {!sd&&<Numero titulo="Rollo transparente (cm)" valor={p.rolloCristal||null} cambiar={v=>set('rolloCristal',v??0)}/>}
      </div>{!sd&&<div className="puerta-campos">
        <label className="puerta-campo"><span>Transparente</span><input aria-label="Material transparente" value={p.materialCristal} onChange={e=>set('materialCristal',e.target.value)}/></label>
        <label className="puerta-campo"><span>Material de saco</span><input aria-label="Material de saco" value={p.materialSaco} onChange={e=>set('materialSaco',e.target.value)}/></label>
        <Numero titulo="Rollo de saco (cm)" valor={p.rolloSaco||null} cambiar={v=>set('rolloSaco',v??0)}/>
        <Numero titulo="Margen de las marcas al borde (cm)" valor={p.margenMarcas} cambiar={v=>set('margenMarcas',v??0)}/>
      </div>}</details>
      {!sd&&p.modelo!=='PUERTAUTO'&&<details><summary>Entradas de tubo y huecos · {p.entradas.length} entradas</summary>
        <p className="puerta-ayuda">Copia los huecos del dibujo. Las ayudas de Ø30 y Ø42 se aplican solo cuando las eliges.</p>
        {p.entradas.map((e,i)=><fieldset key={i}><legend>Tubo {i+1} · eje a {num(e.altura)} cm desde abajo</legend><div className="puerta-campos">
          {p.modelo!=='PUERTAPLE'&&<Numero titulo={`Eje tubo ${i+1} (cm)`} valor={e.altura} cambiar={v=>entrada(i,{altura:v??0})}/>}
          <SegmentedField label={`Diámetro tubo ${i+1}`} value={`Ø${e.diametro} mm`} options={['Ø30 mm','Ø42 mm']} onChange={v=>{const d=v==='Ø30 mm'?30:42;entrada(i,{diametro:d,alto:p.modelo==='PUERTAPLE'?(d===42?13.5:12):e.alto});}}/>
          <Numero titulo={`Largo entrada ${i+1} (cm)`} valor={e.largo} cambiar={v=>entrada(i,{largo:v??0})}/>
          {p.modelo==='PUERTAENR'?<p className="puerta-ayuda">Alto de corte: 8 cm · cota del plano: 7,5 cm</p>:<Numero titulo={`Alto entrada ${i+1} (cm)`} valor={e.alto} cambiar={v=>entrada(i,{alto:v??0})}/>}
          {p.modelo==='PUERTAPLE'&&<button type="button" className="ghost-button" onClick={()=>entrada(i,{huecos:huecosEntrada(e.largo,e.diametro)})}>Proponer huecos laterales</button>}
          {p.modelo!=='PUERTAPLE'&&<button type="button" className="ghost-button" onClick={()=>set('entradas',p.entradas.filter((_,j)=>j!==i))}>Quitar entrada</button>}
        </div><details><summary>Huecos de cutter · {e.huecos.length}</summary><Huecos huecos={e.huecos} cambiar={h=>entrada(i,{huecos:h})}/></details></fieldset>)}
        {p.modelo!=='PUERTAPLE'&&<button type="button" className="ghost-button" onClick={()=>set('entradas',[...p.entradas,{altura:0,diametro:30,largo:p.frente,alto:8,huecos:[]}])}>Añadir entrada</button>}
      </details>}
      {p.modelo==='PUERTAPLE'&&<details><summary>Empates · {resultado.empates.length?`tubos ${resultado.empates.join(', ')}`:'sin empate'}</summary><p className="puerta-ayuda">La propuesta usa el tubo más alto que cabe en el rollo y deja su entrada incorporada al paño inferior.</p><label className="puerta-casilla"><input type="checkbox" checked={p.apilable.empates===null} onChange={e=>cadena({empates:e.target.checked?null:resultado.empates})}/>Proponer según el rollo</label>{p.apilable.empates!==null&&<Lista titulo="Números de tubo para empate" valores={p.apilable.empates} cambiar={v=>cadena({empates:v})}/>}</details>}
      {p.modelo==='PUERTAENR'&&<EmpatesEnrollable p={p} cambiar={cambiar}/>}
      {!sd&&p.modelo!=='PUERTAENR'&&<details><summary>Ventanas individuales · {p.ventanas.length}</summary><p className="puerta-ayuda">Desde izquierda y desde abajo de la puerta terminada. Cristal = hueco + 4 cm en cada dimensión.</p>{p.ventanas.map((v,i)=><fieldset key={i}><legend>Ventana {i+1}</legend><div className="puerta-campos">{(['x','y','ancho','alto','radio','radioCristal'] as const).map(k=><Numero key={k} titulo={`${k==='x'?'Desde izquierda':k==='y'?'Desde abajo':k==='radioCristal'?'Radio cristal':k} ventana ${i+1}`} valor={v[k]} cambiar={n=>set('ventanas',p.ventanas.map((w,j)=>j===i?{...w,[k]:n??0}:w))}/>)}<button type="button" className="ghost-button" onClick={()=>set('ventanas',p.ventanas.filter((_,j)=>j!==i))}>Quitar ventana</button></div></fieldset>)}<button type="button" className="ghost-button" onClick={()=>set('ventanas',[...p.ventanas,{x:0,y:0,ancho:0,alto:0,radio:2,radioCristal:4}])}>Añadir ventana</button><FilasVentanas cambiar={v=>set('ventanas',[...p.ventanas,...v])}/></details>}
      <details><summary>Texto del pedido y observaciones</summary><div className="puerta-campos"><SelectField label="Artículo indicado en RPS" value={p.articuloOrigen} options={Object.keys(MODELOS_PUERTAS)} allowEmpty emptyLabel="Sin indicar" placeholder="Sin indicar" optionLabel={v=>v?`${v} · ${MODELOS_PUERTAS[v as ModeloPuerta]}`:'Sin indicar'} onChange={v=>set('articuloOrigen',v as Puerta['articuloOrigen'])}/><label className="field puerta-campo puerta-campo-ancho"><span>Texto a comprobar con el dibujo</span><textarea aria-label="Texto del pedido" value={p.observaciones} onChange={e=>set('observaciones',e.target.value)}/></label><label className="field puerta-campo puerta-campo-ancho"><span>Nota en el plano (opcional)</span><textarea aria-label="Nota en el plano" placeholder="Solo si queréis que salga en el plano" value={p.notaPlano??''} onChange={e=>set('notaPlano',e.target.value)}/></label></div></details>
    </section>
    <details className="puerta-piezas panel panel-vidrio"><summary>Piezas calculadas · {resultado.piezas.reduce((s,p)=>s+p.cantidad,0)} piezas{resultado.alternativasSaco?' y alternativas de saco':''}</summary><table><thead><tr><th>Pieza</th><th>Corte (cm)</th><th>Material</th><th>Cantidad</th><th>Huecos</th></tr></thead><tbody>{[...resultado.piezas,...resultado.alternativasSaco?.entero??[]].map((x,i)=><tr key={i}><td>{x.nombre}</td><td>{num(x.ancho)} × {num(x.alto)}</td><td>{x.material}</td><td>{x.cantidad}</td><td>{x.huecos.length}</td></tr>)}</tbody></table>{resultado.alternativasSaco&&<p className="puerta-ayuda">El saco entero y el saco partido son alternativas de la misma pieza.</p>}</details>
  </>;
}
function EmpatesEnrollable({p,cambiar}:{p:Puerta;cambiar:(p:Puerta)=>void}) {
  const valores=p.enrollable.empates;
  const set=(empates:Puerta['enrollable']['empates'])=>cambiar({...p,enrollable:{...p.enrollable,empates}});
  const editar=(i:number,parche:Partial<Puerta['enrollable']['empates'][number]>)=>set(valores.map((v,j)=>i===j?{...v,...parche}:v));
  return <details><summary>Empates de enrollable · {valores.length?'reparto del técnico':'propuesta según rollo'}</summary><p className="puerta-ayuda">Se aprovecha la entrada más alta que cabe en el rollo. Si no hay una entrada viable, unión horizontal de 2 cm. Puedes indicar otro reparto.</p>
    {valores.map((u,i)=><fieldset key={i}><legend>Empate {i+1}</legend><div className="puerta-campos">
      <SegmentedField label={`Paño de empate ${i+1}`} value={u.pano==='superior'?'Superior':'Inferior'} options={['Superior','Inferior']} onChange={v=>editar(i,{pano:v==='Superior'?'superior':'inferior',tubo:undefined})}/>
      <SelectField label={`Tipo de unión ${i+1}`} value={u.tubo?.toString()??''} options={p.entradas.map((_,j)=>String(j+1))} allowEmpty emptyLabel="Horizontal · 2 cm" placeholder="Horizontal · 2 cm" optionLabel={v=>v?`En entrada ${v} · 7,5 cm`:'Horizontal · 2 cm'} onChange={v=>{
        const tubo=v?Number(v):undefined;
        const origen=u.pano==='superior'?p.alto-p.enrollable.T-3.75:11;
        editar(i,tubo?{tubo,altura:p.entradas[tubo-1].altura-origen,solape:7.5}:{tubo:undefined,solape:2});
      }}/>
      <Numero titulo={`Altura desde el borde del paño · empate ${i+1}`} valor={u.altura} cambiar={v=>editar(i,{altura:v??0})}/>
      <button type="button" className="ghost-button" onClick={()=>set(valores.filter((_,j)=>i!==j))}>Quitar empate</button>
    </div></fieldset>)}
    <button type="button" className="ghost-button" onClick={()=>set([...valores,{pano:'superior',altura:0,solape:2}])}>Añadir empate manual</button>
    {valores.length>0&&<button type="button" className="ghost-button" onClick={()=>set([])}>Usar propuesta del rollo</button>}
  </details>;
}
/** Recortes de las cintas de las E.T. (Iván, 23/10/2026): a la vista, porque olvidarlos es grave y cada puerta lleva
 * los suyos. Parte de lo que ya tiene la puerta; «Repartir» los separa por igual entre el primero y el último. */
function RecortesCintas({p,cambiar}:{p:Puerta;cambiar:(p:Puerta)=>void}) {
  const ANCHO=12, centrales=(e:Entrada)=>e.huecos.filter(h=>h.x>1.01&&h.x+h.ancho<e.largo-1.01).map(h=>h.x);
  const conCintas=p.entradas.flatMap((e,i)=>centrales(e).length?[i+1]:[]);
  const actuales=centrales(p.entradas.find(e=>centrales(e).length)??{altura:0,diametro:30,largo:0,alto:0,huecos:[]});
  const [xs,setXs]=useState<number[]>(actuales),[tubos,setTubos]=useState<number[]>(conCintas);
  const [n,setN]=useState<number|null>(actuales.length||3),[borde,setBorde]=useState<number|null>(actuales[0]??44);
  const redondear=(v:number)=>Math.round(v*10)/10;
  const repartir=()=>{ if(!n||n<1||borde===null)return;
    setXs(n===1?[redondear((p.frente-ANCHO)/2)]:Array.from({length:n},(_,i)=>redondear(borde+i*(p.frente-2*borde-ANCHO)/(n-1)))); };
  // Plegado para que no ocupe media pantalla, con lo que hay en el título para que no se olvide (Iván, 25/10/2026).
  return <details className="puerta-cintas"><summary>Recortes de cintas · {conCintas.length?`tubos ${conCintas.join(', ')} · X ${actuales.map(num).join(', ')} cm`:<span className="puerta-falta">ninguno todavía</span>}</summary>
    <p className="puerta-ayuda">Recortes de {ANCHO} cm; X desde la izquierda, como en el dibujo.</p>
    <CintasDelDibujo frente={p.frente} poner={setXs}/>
    <div className="puerta-campos">
      <Numero titulo="Recortes por E.T." valor={n} cambiar={setN}/>
      <Numero titulo="Primer recorte desde el borde (cm)" valor={borde} cambiar={setBorde}/>
      <button type="button" className="ghost-button" onClick={repartir}>Repartir</button>
      <Lista titulo="Cintas · posiciones X (cm)" valores={xs} cambiar={setXs}/>
      <Lista titulo="Tubos con cintas" valores={tubos} cambiar={setTubos}/>
      <button type="button" className="ghost-button" onClick={()=>setTubos(p.entradas.map((_,i)=>i+1).filter(n=>n%2===1))}>Proponer tubos impares desde abajo</button>
      <button type="button" className="ghost-button" onClick={()=>cambiar({...p,entradas:p.entradas.map((e,i)=>({...e,huecos:huecosEntrada(e.largo,e.diametro,tubos.includes(i+1)?xs:[])}))})}>Aplicar a las E.T.</button>
    </div></details>;
}
/** Las cintas como vienen en el dibujo: de la izquierda hasta el centro, en mm; la derecha sale en simétrico. */
function CintasDelDibujo({frente,poner}:{frente:number;poner:(xs:number[])=>void}) {
  const [texto,setTexto]=useState(''),[aviso,setAviso]=useState('');
  const aplicar=()=>{
    if(!texto.trim()) { setAviso(''); return; }
    const leido=cintasDesdeCotas(texto.trim().split(/[\s;]+/).map(x=>Number(x.replace(',','.'))),frente);
    if('error' in leido) { setAviso(leido.error); return; }
    poner(leido.xs);
    setAviso(`Cintas en ${leido.xs.map(num).join(', ')} cm. Revisa los tubos y pulsa «Aplicar a las E.T.».`);
  };
  return <label className="field puerta-campo puerta-campo-ancho"><span>Cotas de las cintas del dibujo, de la izquierda hasta el centro (mm)</span>
    <input aria-label="Cintas del dibujo" value={texto} placeholder="60 380 120 1540" onChange={e=>setTexto(e.target.value)}
      onBlur={aplicar} onKeyDown={e=>{ if(e.key==='Enter') aplicar(); }}/>
    <small>{aviso||'Como vienen: hasta cada recorte y el recorte (120). La parte derecha es simétrica: la web la pone sola.'}</small></label>;
}
/** Saco útil con los habituales a un clic (Iván, 25/10/2026); se puede escribir otro. */
function SacoUtil({valor,cambiar}:{valor:number|null;cambiar:(n:number|null)=>void}) {
  return <div className="puerta-saco-util">
    <Numero titulo="Saco útil del pedido (mm)" valor={valor} cambiar={cambiar}/>
    <div className="puerta-saco-rapido" role="group" aria-label="Sacos habituales">
      {[80,110,120].map(mm=><button type="button" key={mm} className={`chip-3d ${valor===mm?'glass-chip-activo':''}`} aria-pressed={valor===mm} onClick={()=>cambiar(mm)}>{mm}</button>)}
    </div>
  </div>;
}
/** Las E.T. de la enrollable con los tramos de la hoja (Iván, 26/10/2026): la web hace las sumas. */
function TramosET({p,cambiar}:{p:Puerta;cambiar:(p:Puerta)=>void}) {
  const [texto,setTexto]=useState(''),[aviso,setAviso]=useState('');
  const aplicar=()=>{
    if(!texto.trim()) { setAviso(''); return; }
    const r=ejesDesdeTramos(texto,p.alto);
    if('error' in r) { setAviso(r.error); return; }
    cambiar({...p,entradas:r.ejes.map((altura,i)=>({...(p.entradas[i]??{diametro:30 as const,largo:p.frente,alto:8,huecos:[]}),altura}))});
    setAviso(`Leído en ${r.enMm?'mm':'cm'}: ${r.ejes.length} E.T. con el eje a ${r.ejes.map(num).join(', ')} cm desde abajo.`);
  };
  return <label className="field puerta-campo puerta-campo-ancho"><span>Tramos de las E.T. del dibujo, de abajo arriba (como en la hoja)</span>
    <input aria-label="Tramos de las E.T." value={texto} placeholder="600 710 600" onChange={e=>setTexto(e.target.value)}
      onBlur={aplicar} onKeyDown={e=>{ if(e.key==='Enter') aplicar(); }}/>
    <small>{aviso||'Del bajo al primer eje y de eje a eje, en mm o en cm. La web hace las sumas y pone el eje de cada E.T.; se corrigen en «Entradas de tubo».'}</small></label>;
}
function CadenaDibujo({p,cadena}:{p:Puerta;cadena:(parche:Partial<Puerta['apilable']>)=>void}) {
  const [texto,setTexto]=useState(''),[aviso,setAviso]=useState('');
  const inclinado=Boolean(p.apilable.sueloInclinado);
  const aplicar=()=>{
    if(!texto.trim()) { setAviso(''); return; }
    const c=leerCadena(texto,p.alto);
    if(!c) { setAviso('Escribe las cotas separadas por espacios, de abajo arriba.'); return; }
    // Con suelo inclinado el pie de cada lado es distinto: se pone a mano el del lado izquierdo.
    cadena(inclinado?{pasos:c.pasos,cabecera:c.cabecera}:{pie:c.pie,pasos:c.pasos,cabecera:c.cabecera});
    const total=c.pie+c.pasos.reduce((s,v)=>s+v,0)+c.cabecera;
    setAviso(`Leído en ${c.enMm?'mm':'cm'}: ${inclinado?'':`pie ${num(c.pie)} · `}${c.pasos.length} pasos · cabecera ${num(c.cabecera)} cm · suma ${num(total)} cm.`);
  };
  return <label className="field puerta-campo puerta-campo-ancho"><span>Cadena del dibujo, de abajo arriba (como en la hoja, en mm)</span>
    <input aria-label="Cadena del dibujo" value={texto} placeholder="310 580 550 580 550 580 700" onChange={e=>setTexto(e.target.value)}
      onBlur={aplicar} onKeyDown={e=>{ if(e.key==='Enter') aplicar(); }}/>
    <small>{aviso||(inclinado?'Rellena los pasos y la cabecera; el pie izquierdo va en su campo.':'Rellena el pie, los pasos y la cabecera de una vez. Se pueden corregir debajo.')}</small></label>;
}
function FilasVentanas({cambiar}:{cambiar:(v:Ventana[])=>void}) {
  const [fila,setFila]=useState({x:0,y:0,ancho:0,alto:0,columnas:1,pilar:0});
  return <fieldset><legend>Añadir una fila de ventanas iguales</legend><div className="puerta-campos">{(Object.keys(fila) as Array<keyof typeof fila>).map(k=><Numero key={k} titulo={`Fila · ${k==='x'?'margen izquierdo':k==='y'?'desde abajo':k}`} valor={fila[k]} cambiar={v=>setFila({...fila,[k]:v??0})}/>)}<button type="button" className="ghost-button" disabled={!Number.isInteger(fila.columnas)||fila.columnas<1||fila.columnas>20} onClick={()=>cambiar(Array.from({length:fila.columnas},(_,i)=>({x:fila.x+i*(fila.ancho+fila.pilar),y:fila.y,ancho:fila.ancho,alto:fila.alto,radio:2,radioCristal:4})))}>Añadir fila</button></div></fieldset>;
}
const hoy = () => new Date().toISOString().slice(0, 10);
const pedidoVacio = (): PedidoPantallaPuertas => ({ schemaVersion: 1, kind: 'puertas', orderCode: '', cabecera: { cliente: '', fecha: hoy() }, elementos: [{ id: 'puerta-1', input: nuevaPuerta() }] });
const tieneDatos = (p: PedidoPantallaPuertas) => Boolean(p.orderCode.trim() || p.cabecera.cliente.trim() || p.elementos.some(e => e.input.frente || e.input.alto || e.input.of));

export function PuertasView({ activo, onResumenChange, usuario, notify, askForConfirmation, accionesDestino, accionesVisibles = true, pedidoGuardadoSolicitado, pedidoRpsSolicitado, onGuardado }: {
  activo: boolean;
  onResumenChange: (r: ResumenPedido) => void;
  usuario: string;
  notify: Notify;
  askForConfirmation: AskForConfirmation;
  /** Donde van «Limpiar» y «Guardar para revisión»: la barra de arriba, como en toldos y remolques. */
  accionesDestino?: HTMLElement | null;
  accionesVisibles?: boolean;
  /** «Corregir» o «Reutilizar datos» de un pedido guardado (Pedidos). */
  pedidoGuardadoSolicitado?: { id: number; pedido: PedidoPuertasGuardado; modo: ModoCargaPuertas } | null;
  /** «Buscar pedido» con un pedido de puertas de RPS. */
  pedidoRpsSolicitado?: { id: number; numero: string; rps: PuertasRps } | null;
  /** Tras «Guardar para revisión»: Pedidos vuelve a leer sus listas. */
  onGuardado?: () => void;
}) {
  const [pedido, setPedido] = useState<PedidoPantallaPuertas>(pedidoVacio);
  const [indice, setIndice] = useState(0);
  const vistaCorte = useVistaCortePuertas(pedido, activo);
  const [derecha, setDerecha] = useState<'alzado' | 'corte'>('alzado');
  const [guardando, setGuardando] = useState(false);
  const [trayendo, setTrayendo] = useState(false);
  const ultimoSolicitado = useRef<number | null>(null);
  useEffect(() => { onResumenChange({ numero: pedido.orderCode, elementos: pedido.elementos.length }); }, [pedido.orderCode, pedido.elementos.length, onResumenChange]);

  useEffect(() => {
    if (!pedidoGuardadoSolicitado || ultimoSolicitado.current === pedidoGuardadoSolicitado.id) return;
    ultimoSolicitado.current = pedidoGuardadoSolicitado.id;
    const { pedido: guardado, modo } = pedidoGuardadoSolicitado;
    void (async () => {
      if (tieneDatos(pedido) && await askForConfirmation({ title: `Abrir ${guardado.orderCode} en Puertas`,
        message: 'Se sustituirá lo que hay ahora en Puertas por el pedido guardado.', confirmLabel: 'Abrir pedido', cancelLabel: 'Conservar pantalla', tone: 'warning' }) !== 'confirm') return;
      setPedido(pedidoDesdeGuardado(guardado, modo, hoy()));
      setIndice(0);
      notify(modo === 'corregir' ? `Pedido ${guardado.orderCode} cargado para corregirlo.` : `Datos de ${guardado.orderCode} cargados.`,
        { tone: 'info', title: modo === 'corregir' ? 'Modo de corrección' : 'Datos reutilizados' });
    })();
  }, [pedidoGuardadoSolicitado, pedido, askForConfirmation, notify]);

  const cargarDeRps = useCallback((rps: PuertasRps, numero: string) => {
    setPedido(pedidoDesdeRps(rps, numero, hoy()));
    setIndice(0);
    const n = rps.puertas.length;
    const lonas = n > 0 && rps.puertas.every(p => p.modelo === 'SYSTEMDOCK');
    notify(`${n} ${lonas ? (n === 1 ? 'lona de SYSTEM DOCK traída' : 'lonas de SYSTEM DOCK traídas') : n === 1 ? 'puerta traída' : 'puertas traídas'} de RPS con sus medidas, ${lonas ? '' : 'color, '}cantidad y OF. Confirma ${lonas ? 'las medidas con el pedido' : 'el modelo y las medidas con el dibujo'} del cliente.${rps.avisos.length ? ` ${rps.avisos.join(' ')}` : ''}`,
      { tone: 'success', title: 'Pedido de puertas' });
  }, [notify]);
  const ultimoRps = useRef<number | null>(null);
  useEffect(() => {
    if (!pedidoRpsSolicitado || ultimoRps.current === pedidoRpsSolicitado.id) return;
    ultimoRps.current = pedidoRpsSolicitado.id;
    const { numero, rps } = pedidoRpsSolicitado;
    void (async () => {
      if (tieneDatos(pedido) && await askForConfirmation({ title: `Abrir ${numero} en Puertas`,
        message: 'Se sustituirá lo que hay ahora en Puertas por lo que dice RPS.', confirmLabel: 'Abrir pedido', cancelLabel: 'Conservar pantalla', tone: 'warning' }) !== 'confirm') return;
      cargarDeRps(rps, numero);
    })();
  }, [pedidoRpsSolicitado, pedido, askForConfirmation, cargarDeRps]);


  const cabecera = (cambios: Partial<PedidoPantallaPuertas['cabecera']>) => setPedido({ ...pedido, cabecera: { ...pedido.cabecera, ...cambios } });

  // El pedido en RPS (solo lectura): el cliente y la fecha y, si la pantalla aún no tiene puertas, las de RPS.
  async function traerDeRps() {
    setTrayendo(true);
    try {
      const respuesta = await fetch(`/api/puertas/rps-pedido?numero=${encodeURIComponent(pedido.orderCode.trim())}`);
      const datos = await respuesta.json().catch(() => ({})) as { error?: string; pedido?: PuertasRps | null };
      if (!respuesta.ok) throw new Error(datos.error || 'No se pudo consultar RPS.');
      if (!datos.pedido) { notify('No encuentro ese pedido en RPS.', { tone: 'warning' }); return; }
      const { cliente, fecha, puertas } = datos.pedido;
      const sinPuertas = !pedido.elementos.some(e => e.input.frente || e.input.alto || e.input.of);
      if (puertas.length && sinPuertas) { cargarDeRps(datos.pedido, pedido.orderCode); return; }
      cabecera({ cliente: cliente.nombre, fecha: fecha || pedido.cabecera.fecha, clienteRps: { codigo: cliente.codigo, nombre: cliente.nombre } });
    } catch (error) {
      notify(error instanceof Error ? error.message : 'No se pudo consultar RPS.', { tone: 'error' });
    } finally {
      setTrayendo(false);
    }
  }

  async function guardar() {
    if (!usuario) { notify('Elige quién eres en «Soy» antes de guardar.', { tone: 'warning' }); return; }
    setGuardando(true);
    try {
      if (await guardarPuertasParaRevision({ pedido, usuario, preguntar: askForConfirmation, notify })) {
        onGuardado?.();
        setPedido(pedidoVacio());
        setIndice(0);
      }
    } catch {
      notify('No se pudo guardar el pedido para revisión.', { tone: 'error' });
    } finally {
      setGuardando(false);
    }
  }

  async function limpiar() {
    if (tieneDatos(pedido) && await askForConfirmation({ title: 'Limpiar Puertas', message: 'Se borrarán las puertas y los datos de esta pantalla.',
      confirmLabel: 'Limpiar', cancelLabel: 'Conservar', tone: 'warning' }) !== 'confirm') return;
    setPedido(pedidoVacio());
    setIndice(0);
  }

  const acciones = (
    <OrderActions hidden={!accionesVisibles}>
      <button className="ghost-button clear-form-button" type="button" disabled={guardando} onClick={() => void limpiar()}><Eraser aria-hidden="true" />Limpiar</button>
      <button type="button" className="primary-button" disabled={guardando || !pedido.orderCode.trim()} aria-busy={guardando}
        title={pedido.orderCode.trim() ? undefined : 'Escribe el número de pedido.'} onClick={() => void guardar()}>
        <Save aria-hidden="true" />{guardando ? 'Guardando…' : 'Guardar para revisión'}
      </button>
    </OrderActions>
  );

  return <div className="puertas-pantalla" onKeyDown={avanzarConIntro}>
    {accionesDestino ? createPortal(acciones, accionesDestino) : acciones}
    <section className="puerta-cabecera order-header panel rem-cabecera"><div className="order-header-group order-header-general"><h3>Datos del pedido</h3><div className="order-header-grid">
      <div className="puerta-pedido"><label className="field puerta-campo"><span>Número de pedido</span><input aria-label="Número de pedido de puertas" value={pedido.orderCode} placeholder="AR2600000" onChange={e=>setPedido({...pedido,orderCode:e.target.value})}/></label>
      <button type="button" className="ghost-button" disabled={trayendo || !pedido.orderCode.trim()} onClick={() => void traerDeRps()}>{trayendo ? 'Consultando…' : 'Traer de RPS'}</button>
      </div><label className="field puerta-campo"><span>Cliente</span><input aria-label="Cliente de puertas" value={pedido.cabecera.cliente} onChange={e=>cabecera({cliente:e.target.value,clienteRps:undefined})}/></label>
      <label className="field puerta-campo"><span>Fecha</span><input type="date" aria-label="Fecha del pedido de puertas" value={pedido.cabecera.fecha} onChange={e=>cabecera({fecha:e.target.value})}/></label>
    </div></div>
    </section>
    <div className="puerta-selector"><div className="tira-3d" role="group" aria-label="Puertas del pedido">{pedido.elementos.map((e,i)=><button type="button" key={e.id} className={`pestana ${indice===i?'pestana-activa':''}`} aria-pressed={indice===i} onClick={()=>setIndice(i)}>{e.input.modelo==='SYSTEMDOCK'?'Lona':'Puerta'} {i+1} · {e.input.of||'SIN OF'}</button>)}</div><button className="ghost-button" type="button" onClick={()=>{setPedido({...pedido,elementos:[...pedido.elementos,{id:crypto.randomUUID(),input:nuevaPuerta()}]});setIndice(pedido.elementos.length);}}><Plus size={16}/>Añadir puerta</button>{pedido.elementos.length>1&&<button className="ghost-button" type="button" onClick={()=>{setPedido({...pedido,elementos:pedido.elementos.filter((_,i)=>i!==indice)});setIndice(0);}}><Trash2 size={16}/>Quitar puerta</button>}</div>
    <Configurar key={pedido.elementos[indice].id} p={pedido.elementos[indice].input} cambiar={p=>setPedido({...pedido,elementos:pedido.elementos.map((e,i)=>i===indice?{...e,input:p}:e)})} corte={<CorteResumen vista={vistaCorte}/>} derecha={derecha} cambiarDerecha={setDerecha}/>
    <VistaCortePuertas pedido={pedido} vista={vistaCorte} usuario={usuario} notify={notify} askForConfirmation={askForConfirmation}/>
  </div>;
}
