import React, { useId } from 'react';
import { InputDecimal } from '../remolques/InputDecimal';
import { SelectField } from '../components/SelectField';
import { calcularPuerta } from '../../puertas/calcular.ts';
import { fichaDePuerta, tipoDePuerta } from '../../puertas/clientes.ts';
import { cambiarTipoDelCliente } from '../../puertas/nuevaPuertaCliente.ts';
import { medidasSacoArena, numeroSacoArena as n } from '../../puertas/sacoArena.ts';
import type { Puerta } from '../../puertas/tipos.ts';

export function VistaSacoArena({ puerta: p }: { puerta: Puerta }) {
  const m = medidasSacoArena(p), completo = p.frente>0&&p.alto>0, uid = useId();
  return <section className="puerta-alzado panel panel-vidrio" aria-label="Medidas del saco confeccionado">
    <header><h2>Saco confeccionado</h2><span>OF {p.of||'SIN OF'}</span></header>
    {completo ? <>
      <table><thead><tr><th>Preparación</th><th>Medidas (cm)</th></tr></thead><tbody>
        <tr><td>Doblado · marca de rotulador</td><td>{n(2*m.aplastado)} + 3 para pisar</td></tr>
        <tr><td>Al corte · sin empate</td><td>{n(m.anchoCorte)} × {n(m.largoCorte)}</td></tr>
        <tr><td>Para empatar · 2 piezas</td><td>{n(m.anchoCorte)} × {n(m.largoMitad)}</td></tr>
      </tbody></table>
      <svg role="img" aria-label="Saco confeccionado, plano abierto y las dos opciones de corte, en horizontal" viewBox="0 0 540 330" style={{maxHeight:340}}>
        <defs>
          <linearGradient id={`${uid}-tubo`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#6b6f75"/><stop offset=".28" stopColor="#3a3d42"/><stop offset=".6" stopColor="#16181b"/><stop offset="1" stopColor="#050506"/>
          </linearGradient>
          <radialGradient id={`${uid}-boca`} cx=".55" cy=".5" r=".6"><stop offset="0" stopColor="#8c9096"/><stop offset=".7" stopColor="#c9ccd1"/><stop offset="1" stopColor="#eef0f2"/></radialGradient>
        </defs>
        <g transform="rotate(-12 270 70)">
          <rect x="95" y="52" width="350" height="28" fill={`url(#${uid}-tubo)`}/>
          <path d="M445 52Q451 66 445 80Q439 66 445 52Z" fill="#2a2c30"/>
          <path d="M95 52Q102 66 95 80Q88 66 95 52Z" fill={`url(#${uid}-boca)`} stroke="#111"/>
          <rect x="102" y="56" width="336" height="4" rx="2" fill="#fff" opacity=".18"/>
        </g>
        <g fill="currentColor" fontSize="13" textAnchor="middle">
          <text x="290" y="28">Largo {n(m.largo)} cm</text><text x="95" y="128">Aplastado {n(m.aplastado)} cm</text>
        </g>
        <g fill="none" stroke="currentColor" strokeWidth="1.5">
          <rect x="30" y="158" width="480" height="14"/><path d="M30 161H510" strokeDasharray="5 4"/>
          <rect x="30" y="218" width="480" height="14"/>
          <rect x="30" y="278" width="240" height="14"/><rect x="30" y="292" width="240" height="14"/>
          <path d="M266 278V292M34 292V306" strokeDasharray="3 3"/>
        </g>
        <g fill="currentColor" fontSize="13">
          <text x="30" y="150">Doblado {n(2*m.aplastado)} hasta la marca + 3 cm para pisar</text>
          <text x="30" y="210">Al corte sin empate {n(m.anchoCorte)} × {n(m.largoCorte)}</text>
          <text x="30" y="270">Para empatar 2 × {n(m.anchoCorte)} × {n(m.largoMitad)}</text>
          <text x="285" y="296">Empate 2 cm · marcar por lado negro</text>
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
