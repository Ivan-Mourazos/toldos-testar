import React, { useRef, useState } from 'react';
import { Layers, Package } from 'lucide-react';
import type { LineaLote, Lote } from './tipos';

const numero = (n: number) => n.toLocaleString('es-ES', { maximumFractionDigits: 3 });
const resumen = (lineas: LineaLote[]) =>
  `${numero(lineas.length)} ${lineas.length === 1 ? 'línea' : 'líneas'} · ${numero(lineas.reduce((total, l) => total + l.cantidad, 0))} uds.`;

type Props = {
  lote: Lote;
  ocupado: boolean;
  sueltas: Record<string, boolean>;
  onPalet: (linea: LineaLote, palet: number | null) => void;
  onSueltas: (codigo: string, sueltas: boolean) => void;
};

export function PaletsLote({ lote, ocupado, sueltas, onPalet, onSueltas }: Props) {
  const [pedido, setPedido] = useState('');
  const [grupo, setGrupo] = useState('todos');
  const desplazamiento = useRef<HTMLDivElement>(null);
  const pedidos = [...new Set(lote.lineas.map(l => l.CodOrder))];
  const lineas = pedido ? lote.lineas.filter(l => l.CodOrder === pedido) : lote.lineas;
  const grupos = new Map<string, { clave: string; palets: number[]; titulo: string; lineas: LineaLote[] }>();
  for (const l of lineas) {
    const palets = lote.paletsOficina?.[l.IDOrderLine] ?? (l.palet == null ? [] : [l.palet]);
    const clave = palets.join('-');
    const existente = grupos.get(clave);
    if (existente) existente.lineas.push(l);
    else grupos.set(clave, {
      clave, palets, lineas: [l],
      titulo: palets.length ? `${palets.length === 1 ? 'Palet' : 'Palets'} ${palets.join(' y ')}` : 'Sin asignar',
    });
  }
  const ordenados = [...grupos.values()].sort((a, b) => (a.palets[0] ?? Infinity) - (b.palets[0] ?? Infinity));
  const seleccionado = grupos.get(grupo);
  const visibles = seleccionado ? [seleccionado] : ordenados;
  const seleccionar = (clave: string) => {
    setGrupo(clave);
    if (desplazamiento.current) desplazamiento.current.scrollTop = 0;
  };

  if (!lote.lineas.length) return <section className="glass-panel combursa-vacio"><h2>Sin líneas para esta entrega</h2><p>Elige otro sábado para consultar RPS.</p></section>;

  return <div className="combursa-reparto">
    <nav className="glass-panel combursa-selector-palets" aria-label="Palets del lote">
      <div className="combursa-selector-cabecera"><h2>Palets</h2>
        <label htmlFor="combursa-pedido">Pedido</label>
        <select id="combursa-pedido" value={pedido} onChange={e => { setPedido(e.target.value); seleccionar('todos'); }}>
          <option value="">Todos los pedidos</option>
          {pedidos.map(p => <option key={p}>{p}</option>)}
        </select>
      </div>
      <div className="combursa-selector-lista">
        <button type="button" aria-pressed={!seleccionado} onClick={() => seleccionar('todos')}>
          <Layers size={17} aria-hidden="true" />
          <span><strong>{pedido ? 'Todo el pedido' : 'Todo el lote'}</strong><small>{resumen(lineas)}</small></span>
        </button>
        {ordenados.map(g => <button key={g.clave} type="button" aria-pressed={seleccionado === g} onClick={() => seleccionar(g.clave)}>
          <Package size={17} aria-hidden="true" />
          <span><strong>{g.titulo}</strong><small>{resumen(g.lineas)}</small></span>
        </button>)}
      </div>
    </nav>
    <section className="glass-panel combursa-listado combursa-listado-palets" aria-labelledby="combursa-listado-titulo">
      <header>
        <div><h2 id="combursa-listado-titulo">{seleccionado ? seleccionado.titulo : 'Piezas por palet'}</h2>
          <small>{resumen(seleccionado?.lineas ?? lineas)}</small>
          {seleccionado && seleccionado.palets.length > 1 && <small>Cantidad conjunta · reparto pendiente</small>}
        </div>
        {lote.paletsOficina && <span className="combursa-origen glass-chip">Plano de oficina</span>}
      </header>
      <div className="combursa-tabla-scroll" role="region" aria-labelledby="combursa-listado-titulo" tabIndex={0} ref={desplazamiento}>
        <table className="combursa-lineas">
          <thead><tr>
            <th scope="col">Pedido / línea RPS</th><th scope="col">Referencia</th><th scope="col">Descripción</th>
            <th scope="col">Uds.</th><th scope="col">OF</th><th scope="col">Estado</th><th scope="col">Asignar palet</th><th scope="col">Sueltas</th>
          </tr></thead>
          {visibles.map(g => <tbody key={g.clave}>
            {!seleccionado && <tr className="combursa-grupo"><th scope="rowgroup" colSpan={8}>
              <span>{g.titulo}</span><small>{g.palets.length > 1 ? 'Cantidad conjunta · reparto pendiente' : resumen(g.lineas)}</small>
            </th></tr>}
            {g.lineas.map(l => {
              const identificador = `${l.CodArticle} ${l.CodOrder} línea ${l.NumLine ?? '—'}`;
              return <tr key={l.IDOrderLine}>
                <th scope="row">{l.CodOrder}<small>Línea {l.NumLine ?? '—'}</small></th>
                <td className="combursa-referencia">{l.CodArticle}</td>
                <td>{l.descripcion}
                  {(l.corteMm || l.comentarioLinea) && <small>{[l.corteMm && `${l.corteMm.map(numero).join(' × ')} mm`, l.comentarioLinea].filter(Boolean).join(' · ')}</small>}
                  {l.avisos.map(a => <small key={a}>{a}</small>)}
                </td>
                <td className="combursa-numero">{numero(l.cantidad)}</td>
                <td className="combursa-of">{l.of_ || 'Sin OF'}</td>
                <td>{l.estado === 'validado' ? <span className="combursa-estado combursa-validado">Validado</span> : l.motivos.length ?
                  <details><summary className="combursa-estado combursa-manual pildora-aviso">A mano</summary>
                    {l.motivos.map(m => <p key={m}>{m.replaceAll('PLASTEL', 'Plastel')}</p>)}
                  </details> : <span className="combursa-estado combursa-manual pildora-aviso">A mano</span>}</td>
                <td><input className="combursa-palet" type="number" min={1} max={99} step={1} inputMode="numeric" disabled={ocupado}
                  defaultValue={l.palet ?? ''} key={l.palet ?? ''} aria-label={`Palet de ${identificador}`}
                  onBlur={e => {
                    const valor = e.currentTarget.value === '' ? null : e.currentTarget.valueAsNumber;
                    if (valor !== (l.palet ?? null)) onPalet(l, valor);
                  }}
                  onKeyDown={e => { if (e.key === 'Enter') e.currentTarget.blur(); }} /></td>
                <td><label className="combursa-suelta"><input type="checkbox" disabled={ocupado || l.estado !== 'validado' || !l.codigo}
                  checked={Boolean(l.codigo && sueltas[l.codigo])} aria-label={`Sueltas ${identificador}`}
                  onChange={e => { if (l.codigo) onSueltas(l.codigo, e.target.checked); }} /></label></td>
              </tr>;
            })}
          </tbody>)}
        </table>
      </div>
    </section>
  </div>;
}
