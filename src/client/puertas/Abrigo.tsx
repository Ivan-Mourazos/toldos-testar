import React from 'react';
import { calcularAbrigo, materialesAbrigo } from '../../puertas/abrigo.ts';
import { fichaDePuerta } from '../../puertas/clientes.ts';
import { cambiarTipoDelCliente } from '../../puertas/nuevaPuertaCliente.ts';
import type { ParteAbrigo, Puerta } from '../../puertas/tipos.ts';
import { SelectField } from '../components/SelectField';
import { NumeroPuerta } from './NumeroPuerta';
import { medidaPuerta } from './medidasPuertas';

const nombres = {frente:'Frente A',laterales:'Laterales B y C',perimetral:'Lona perimetral',tiras:'Tiras de resto'};

export function VistaAbrigo({p}:{p:Puerta}){
  const piezas=calcularAbrigo(p).piezas;
  return <section className="puerta-alzado panel panel-vidrio"><h2>{nombres[p.abrigo?.parte??'frente']}</h2>
    {piezas.map(q=><figure key={q.id}><svg viewBox={`-2 -2 ${q.ancho+4} ${q.alto+4}`} role="img" aria-label={`Pieza ${q.nombre}`} width="100%" style={{maxHeight:150}}>
      <polygon points={q.contorno.map(([x,y])=>`${x},${q.alto-y}`).join(' ')} fill="none" stroke="currentColor" strokeWidth="1" vectorEffect="non-scaling-stroke"/>
      {q.circulosMarca?.map((m,i)=><circle key={i} cx={m.x} cy={q.alto-m.y} r={.4} fill="currentColor"/>)}
    </svg><figcaption>{q.nombre} · {medidaPuerta(q.ancho)}{p.abrigo?.parte==='laterales'?` / ${medidaPuerta(p.abrigo.corto)}`:''} × {medidaPuerta(q.alto)} mm · X {q.cantidad}</figcaption></figure>)}
    {piezas[0]?.abrigo?.nota && <p>{piezas[0].abrigo.nota}</p>}
    {!piezas.length && <p>Completa las medidas de la hoja para ver la pieza.</p>}
  </section>;
}

export function ConfigurarAbrigo({p,cambiar,vista,corte}:{p:Puerta;cambiar:(p:Puerta)=>void;vista?:React.ReactNode;corte?:React.ReactNode}){
  const parte=p.abrigo?.parte??'frente', ficha=fichaDePuerta(p);
  const editar=(c:Partial<Puerta>)=>cambiar({...p,...c,confirmada:false});
  const cambiarParte=(v:ParteAbrigo)=>editar({abrigo:{parte:v,corto:0},material:materialesAbrigo[v],color:'',
    rollo:v==='perimetral'?250:160,frente:0,alto:v==='tiras'?3:0});
  const avisos=calcularAbrigo(p).avisos;
  return <div className="puerta-config-alzado"><section className="puerta-config panel panel-vidrio">
    <header><h2>Configurador</h2><span>Portanova · medidas en mm</span></header>
    <fieldset><legend>Abrigo de carga</legend><div className="puerta-campos">
      <SelectField label="Tipo de producto" value="abrigo" options={ficha.tipos.map(t=>t.id)} optionLabel={v=>ficha.tipos.find(t=>t.id===v)?.nombre??v} onChange={v=>cambiar(cambiarTipoDelCliente(p,v))}/>
      <SelectField label="Pieza del abrigo" value={parte} options={Object.keys(nombres) as ParteAbrigo[]} optionLabel={v=>nombres[v as ParteAbrigo]} onChange={v=>cambiarParte(v as ParteAbrigo)}/>
      <label className="field puerta-campo">OF<input value={p.of} onChange={e=>editar({of:e.target.value})}/></label>
      <NumeroPuerta titulo={parte==='laterales'?'Parejas de laterales':'Unidades'} unidad="cantidad" valor={p.cantidad||null} cambiar={v=>editar({cantidad:v??0})}/>
      <NumeroPuerta titulo={parte==='laterales'?'Borde largo':'Largo'} valor={p.frente||null} cambiar={v=>editar({frente:v??0})}/>
      {parte==='laterales'&&<NumeroPuerta titulo="Borde corto" valor={p.abrigo?.corto||null} cambiar={v=>editar({abrigo:{parte,corto:v??0}})}/>}
      <NumeroPuerta titulo="Ancho" valor={p.alto||null} cambiar={v=>editar({alto:v??0})}/>
    </div><p>{materialesAbrigo[parte]} · Consumo en ML según la OF.</p>{parte==='laterales'&&<p>Un ollao N14 y una arandela N30 por lateral.</p>}</fieldset>
    <label className="puerta-casilla"><input type="checkbox" checked={p.confirmada} onChange={e=>cambiar({...p,confirmada:e.target.checked})}/>Medidas y cantidad confirmadas con el pedido</label>
    {p.observaciones&&<details><summary>Texto del pedido</summary><p>{p.observaciones}</p></details>}
  </section><div className="puerta-derecha"><div className="puerta-dibujo">{vista}{corte??<VistaAbrigo p={p}/>}</div>
    {avisos.length>0&&<section className="puerta-avisos panel panel-vidrio"><h2>Qué falta o revisar</h2><ul>{avisos.map(a=><li key={a.codigo}>{a.texto}</li>)}</ul></section>}
  </div></div>;
}
