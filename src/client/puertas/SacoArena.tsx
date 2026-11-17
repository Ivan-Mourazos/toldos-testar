import React, { useId } from 'react';
import { InputDecimal } from '../remolques/InputDecimal';
import { SelectField } from '../components/SelectField';
import { calcularPuerta } from '../../puertas/calcular.ts';
import { fichaDePuerta, tipoDePuerta } from '../../puertas/clientes.ts';
import { cambiarTipoDelCliente } from '../../puertas/nuevaPuertaCliente.ts';
import { medidasSacoArena, numeroSacoArena as n } from '../../puertas/sacoArena.ts';
import type { Puerta } from '../../puertas/tipos.ts';

export function VistaSacoArena({ puerta: p }: { puerta: Puerta }) {
  const m = medidasSacoArena(p), completo = p.frente>0&&p.alto>0;
  return <section className="puerta-alzado panel panel-vidrio" aria-label="Medidas del saco confeccionado">
    <header><h2>Saco confeccionado</h2><span>OF {p.of||'SIN OF'}</span></header>
    {completo ? <>
      <table><thead><tr><th>Preparación</th><th>Medidas (cm)</th></tr></thead><tbody>
        <tr><td>Confeccionado · plano abierto</td><td>{n(m.confeccionado)} × {n(m.largo)}</td></tr>
        <tr><td>Al corte · sin empate</td><td>{n(m.anchoCorte)} × {n(m.largoCorte)}</td></tr>
        <tr><td>Para empatar · 2 piezas</td><td>{n(m.anchoCorte)} × {n(m.largoMitad)}</td></tr>
      </tbody></table>
      <svg role="img" aria-label="Esquema del confeccionado y las dos opciones de corte" viewBox="0 0 540 265" style={{maxHeight:280}}>
        <g fill="none" stroke="currentColor" strokeWidth="1.5">
          <rect x="40" y="45" width="95" height="155"/><path d="M55 45V200" strokeDasharray="5 4"/>
          <rect x="210" y="45" width="95" height="155"/>
          <rect x="380" y="45" width="50" height="95"/><rect x="430" y="45" width="50" height="95"/>
          <path d="M380 130H430M430 55H480" strokeDasharray="5 4"/>
        </g>
        <g fill="currentColor" fontSize="13" textAnchor="middle">
          <text x="88" y="25">Confeccionado</text><text x="88" y="222">Pisar 3 cm</text>
          <text x="258" y="25">Sin empate</text><text x="258" y="222">1 pieza por saco</text>
          <text x="430" y="25">Para empatar</text><text x="405" y="120">1</text><text x="455" y="80">1</text>
          <text x="430" y="168">Empate 2 cm</text><text x="430" y="188">Marcar por lado negro</text>
          <text x="270" y="252">Esquema sin escala · medidas reales en la tabla</text>
        </g>
      </svg>
      <p className="puerta-ayuda">Soldar 3 cm para cerrar el cilindro. Negro hacia el exterior.</p>
      <p className="puerta-ayuda">El corte incluye las dos opciones. El técnico de la máquina elige una.</p>
    </> : <p>Completa el largo y el aplastado para ver las medidas del saco y sus dos opciones de corte.</p>}
  </section>;
}

export function ConfigurarSacoArena({ p, cambiar, corte, derecha, vistas }: {
  p: Puerta; cambiar: (p: Puerta)=>void; corte?: React.ReactNode; derecha: 'alzado'|'corte'; vistas?: React.ReactNode;
}) {
  const prefijo = useId(), ficha = fichaDePuerta(p), r = calcularPuerta(p);
  const set = <K extends keyof Puerta>(k: K, v: Puerta[K]) => cambiar({...p,[k]:v,confirmada:false});
  const campo = (k: 'cantidad'|'frente'|'alto'|'rollo', titulo: string) => <div className="field puerta-campo">
    <label htmlFor={`${prefijo}-${k}`}>{titulo}</label><InputDecimal id={`${prefijo}-${k}`} name={k} required value={p[k]||null} onValor={v=>set(k,v??0)}/>
  </div>;
  return <div className="puerta-config-alzado">
    <section className="puerta-config panel panel-vidrio" aria-label="Configurador de saco confeccionado">
      <header><h2>Configurador</h2><span>Portanova · medidas en cm</span></header>
      <fieldset><legend>Saco confeccionado</legend><div className="puerta-campos">
        <div className="field puerta-campo"><label htmlFor={`${prefijo}-of`}>OF</label><input id={`${prefijo}-of`} name="of" required value={p.of} placeholder="SIN OF" spellCheck={false} onChange={e=>set('of',e.target.value)}/></div>
        {campo('cantidad','Cantidad de sacos iguales')}
        <SelectField label="Tipo de producto" value={tipoDePuerta(p).id} options={ficha.tipos.map(t=>t.id)} optionLabel={v=>ficha.tipos.find(t=>t.id===v)?.nombre??''} onChange={v=>cambiar(cambiarTipoDelCliente(p,v))}/>
        {campo('frente','Largo (cm)')}{campo('alto','Aplastado (cm)')}
      </div></fieldset>
      <fieldset><legend>Material y restos</legend><div className="puerta-campos">
        <div className="field puerta-campo"><label htmlFor={`${prefijo}-material`}>Material</label><input id={`${prefijo}-material`} name="material" required value={p.material} onChange={e=>set('material',e.target.value)}/></div>
        <div className="field puerta-campo"><label htmlFor={`${prefijo}-color`}>Color</label><input id={`${prefijo}-color`} name="color" required value={p.color} onChange={e=>set('color',e.target.value)}/></div>
        {campo('rollo','Ancho del rollo de restos (cm)')}
      </div><p className="puerta-ayuda">Cara negra hacia fuera. Marcar por el lado negro.</p></fieldset>
      <div className="puerta-confirmaciones"><label className="puerta-casilla"><input type="checkbox" name="confirmada" checked={p.confirmada} onChange={e=>cambiar({...p,confirmada:e.target.checked,ventanasConfirmadas:true})}/>Confirmado con el pedido: largo, aplastado, material y negro hacia fuera</label></div>
      <details><summary>Texto del pedido</summary><div className="field puerta-campo"><label htmlFor={`${prefijo}-texto`}>Texto original y observaciones</label><textarea id={`${prefijo}-texto`} name="observaciones" value={p.observaciones} onChange={e=>set('observaciones',e.target.value)}/></div></details>
    </section>
    <div className="puerta-derecha"><div className="puerta-dibujo">{vistas}{derecha==='corte'&&corte?corte:<VistaSacoArena puerta={p}/>}</div>
      <section className="puerta-avisos panel panel-vidrio" aria-label="Comprobaciones del saco"><h2>Qué falta o revisar</h2>{r.avisos.length?<ul>{r.avisos.map(a=><li key={a.codigo} className={a.nivel==='error'?'es-error':''}>{a.texto}</li>)}</ul>:<p>Todo listo: medidas confirmadas.</p>}</section>
    </div>
  </div>;
}
