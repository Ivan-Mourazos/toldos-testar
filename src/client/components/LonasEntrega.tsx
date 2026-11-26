import React, { useId, useState } from 'react';
import { Plus, X } from 'lucide-react';
import { resolveFabric } from '../../domain/fabricCatalog.js';
import { esLonaAcrilica, TEXTO_ACRILICA, TEXTO_RESERVAS } from '../../domain/stockSinComprobar.js';
import { FabricCombobox } from './FabricCombobox';
import { ReadModeContext } from './ReadMode';
import type { LonaAprobada, PropuestaStockLona } from '../salidaPedido';
import { resumenGrupoLona, type FabricStock } from '../fabricStock';
import { useFabricStocks, useGruposLona } from '../hooks/useFabricStock';

export type LonaEditable = Omit<PropuestaStockLona['lonas'][number], 'ml'> & { metros: string };

export function metrosLona(valor: string) {
  const texto = valor.trim();
  const ml = /^\d+(?:[,.]\d+)?$/.test(texto) ? Number(texto.replace(',', '.')) : NaN;
  return Number.isFinite(ml) && ml > 0 ? ml : null;
}

export function aprobarLonas(lonas: LonaEditable[]): LonaAprobada[] | null {
  const aprobadas: LonaAprobada[] = [];
  for (const { codigo, metros, ofs } of lonas) {
    const ml = metrosLona(metros);
    if (ml === null) return null;
    aprobadas.push({ codigo, ml, ofs });
  }
  return aprobadas;
}

const formatoM = (n: number) => n.toLocaleString('es-ES', { maximumFractionDigits: 1 });

/** La lona con todas sus marcas: lo disponible de cada una, su bobina mayor y si llega con una sola
 * bobina. Es la misma cuenta que hace el aviso a Compras al pasar a producción. */
export function DesgloseLona({ codigo, ml, ofs }: { codigo: string; ml: number | null; ofs: readonly string[] }) {
  const estadoGrupo = useGruposLona([codigo])[codigo];
  const grupo = estadoGrupo?.status === 'ready' ? estadoGrupo.grupo : null;
  const listo = Boolean(estadoGrupo && estadoGrupo.status !== 'loading');
  const estados = useFabricStocks(listo ? [codigo, ...(grupo?.mismoAncho ?? []), ...(grupo?.masAnchas.map(a => a.codigo) ?? [])] : [], ofs);
  const stocks: Record<string, FabricStock> = Object.fromEntries(Object.entries(estados).flatMap(([c, e]) => e.status === 'ready' ? [[c, e.stock]] : []));
  if (!listo || Object.values(estados).some(e => e.status === 'loading')) return <small className="lona-desglose">Consultando stock en RPS…</small>;
  if (!stocks[codigo] && !grupo?.mismoAncho.some(c => stocks[c])) return <small className="lona-desglose">Stock no disponible ahora</small>;
  return <DesgloseLonaTexto codigo={codigo} grupo={grupo} stocks={stocks} ml={ml} />;
}

export function DesgloseLonaTexto({ codigo, grupo, stocks, ml }: {
  codigo: string; grupo: Parameters<typeof resumenGrupoLona>[1]; stocks: Record<string, FabricStock>; ml: number | null;
}) {
  const { marcas, veredicto } = resumenGrupoLona(codigo, grupo, stocks, ml);
  return <div className="lona-desglose">
    {grupo?.nombre && <span className="lona-desglose-nombre">{grupo.nombre}</span>}
    {marcas.map(s => <small key={s.code}>{s.code} · {formatoM(s.disponible)} m · bobina mayor {formatoM(s.mayorBobinaDisponible)} m</small>)}
    {veredicto && <small className={`fabric-stock-line ${veredicto.llega ? 'is-normal' : 'is-aviso'}`}>{veredicto.texto}</small>}
  </div>;
}

export function LonasEntrega({ lonas, ofs, cambiar, enviado, acrilicas = [], enReservas = [] }: {
  lonas: LonaEditable[]; ofs: string[]; cambiar: (lonas: LonaEditable[]) => void; enviado: boolean;
  acrilicas?: PropuestaStockLona['acrilicas'];
  enReservas?: PropuestaStockLona['enReservas'];
}) {
  const id = useId();
  const [buscando, setBuscando] = useState(false);
  const [aviso, setAviso] = useState('');
  function agregar(seleccion: string) {
    const tela = resolveFabric(seleccion);
    if (!tela) return;
    if (esLonaAcrilica({ codigo: tela.code, descripcion: tela.description })) {
      setAviso(`${tela.code} · ${TEXTO_ACRILICA}`);
      return;
    }
    if (lonas.some(lona => lona.codigo === tela.code)) {
      setAviso('Esta lona ya está en la lista.');
      return;
    }
    cambiar([...lonas, { codigo: tela.code, descripcion: tela.description, metros: '', ofs, origen: 'manual' }]);
    setBuscando(false);
    setAviso('');
  }
  function editar(codigo: string, cambios: Partial<Pick<LonaEditable, 'metros' | 'ofs'>>) {
    cambiar(lonas.map(lona => lona.codigo === codigo ? { ...lona, ...cambios } : lona));
  }
  return <fieldset className="lonas-entrega">
    <legend>Lonas para comprobar el stock</legend>
    {lonas.length ? <table>
      <thead><tr><th scope="col">Material</th><th scope="col">Metros (m)</th><th scope="col">OF</th><th scope="col"><span className="sr-only">Acciones</span></th></tr></thead>
      <tbody>{lonas.map((lona, i) => {
        const campo = `${id}-metros-${i}`;
        const invalido = enviado && metrosLona(lona.metros) === null;
        return <tr key={lona.codigo}>
          <td><strong>{lona.codigo}</strong><span className="lona-descripcion">{lona.descripcion}</span>
            <small>{lona.origen === 'manual' ? 'Añadido' : lona.origen === 'reserva' ? 'Detectado · reserva' : 'Del formulario · metros del corte'}</small>
            <DesgloseLona codigo={lona.codigo} ml={metrosLona(lona.metros)} ofs={ofs} /></td>
          <td><label className="sr-only" htmlFor={campo}>Metros de {lona.codigo}</label>
            <input id={campo} type="text" inputMode="decimal" value={lona.metros} aria-invalid={invalido || undefined}
              aria-describedby={invalido ? `${id}-error` : undefined}
              onChange={e => editar(lona.codigo, { metros: e.target.value })} /></td>
          <td>{lona.origen === 'manual' && ofs.length > 1 ? <details>
            <summary>{lona.ofs.length === ofs.length ? 'Todas las OF' : lona.ofs.join(', ') || 'Sin OF'}</summary>
            {ofs.map(of => <label key={of}><input type="checkbox" checked={lona.ofs.includes(of)}
              onChange={e => editar(lona.codigo, { ofs: e.target.checked ? [...lona.ofs, of] : lona.ofs.filter(valor => valor !== of) })} />{of}</label>)}
          </details> : lona.ofs.join(', ') || '—'}</td>
          <td><button type="button" className="ghost-button boton-3d" aria-label={`Quitar ${lona.codigo}`}
            onClick={() => { cambiar(lonas.filter(fila => fila.codigo !== lona.codigo)); setAviso(''); }}><X size={16} aria-hidden="true" /></button></td>
        </tr>;
      })}</tbody>
    </table> : <p>{acrilicas?.length || enReservas?.length ? 'No hay lonas que comprobar.' : 'La lista de lonas está vacía.'}</p>}
    {acrilicas?.length ? <ul className="lonas-entrega-acrilicas">{acrilicas.map(lona =>
      <li key={lona.codigo}><strong>{lona.codigo}</strong> {lona.descripcion} · {TEXTO_ACRILICA}</li>)}</ul> : null}
    {enReservas?.length ? <ul className="lonas-entrega-acrilicas">{enReservas.map(({ of, codigo }) =>
      <li key={of}>OF <strong>{of}</strong> ({codigo}) · {TEXTO_RESERVAS}</li>)}</ul> : null}
    {enviado && !aprobarLonas(lonas) && <p id={`${id}-error`} role="alert">Indica un número de metros mayor que cero en cada lona.</p>}
    {buscando ? <div className="lonas-entrega-buscar">
      <ReadModeContext.Provider value={false}>
        <FabricCombobox label="Buscar tela para añadir" value="" onChange={agregar} soloReferencia />
      </ReadModeContext.Provider>
      <button type="button" className="ghost-button boton-3d" onClick={() => { setBuscando(false); setAviso(''); }}>Cerrar buscador</button>
    </div> : <button type="button" className="ghost-button boton-3d" onClick={() => setBuscando(true)}><Plus size={16} aria-hidden="true" />Añadir lona</button>}
    {aviso && <p role="alert">{aviso}</p>}
  </fieldset>;
}
