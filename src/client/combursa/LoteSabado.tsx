import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ArrowLeft, CalendarDays, Layers, Scissors } from 'lucide-react';
import { abrirCorteDwg } from '../abrirCorte';
import { NotificationCenter, useNotifications } from '../components/NotificationCenter';
import { VistaCorte } from './VistaCorte';
import { HojaCortador } from './HojaCortador';
import type { Lote } from './tipos';
import './combursa.css';

function proximoSabado() {
  const d = new Date();
  d.setDate(d.getDate() + (6 - d.getDay() + 7) % 7);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
const numero = (n: number) => n.toLocaleString('es-ES', { maximumFractionDigits: 1 });

export default function LoteSabado({ onCerrar }: { onCerrar: () => void }) {
  const dialogo = useRef<HTMLDialogElement>(null);
  const [fecha, setFecha] = useState(proximoSabado);
  const [sueltas, setSueltas] = useState<Record<string, boolean>>({});
  // El palet lo pone el técnico a mano, del correo de Producción (Iván, 28/10/2026).
  const [palets, setPalets] = useState<Record<string, number>>({});
  const [lote, setLote] = useState<Lote | null>(null);
  const [ocupado, setOcupado] = useState(false);
  const [error, setError] = useState('');
  const [abierto, setAbierto] = useState(false);
  const [confirmado, setConfirmado] = useState(false);
  const [envio, setEnvio] = useState('');
  const n = useNotifications();
  useEffect(() => { dialogo.current?.showModal(); }, []);
  const usuario = () => localStorage.getItem('toldos-testar-usuario') || '';
  const invalidar = () => { setAbierto(false); setConfirmado(false); setEnvio(''); };
  const post = async (accion: string, opciones = sueltas, porLinea = palets) => {
    const respuesta = await fetch(`/api/assa/lote/${accion}`, { method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fecha, sueltas: opciones, palets: porLinea, savedBy: usuario() }) });
    const datos = await respuesta.json();
    if (!respuesta.ok) throw new Error(datos.error || 'No se pudo preparar el lote.');
    return datos;
  };
  const cargar = async (opciones = sueltas, porLinea = palets) => {
    setOcupado(true); setSueltas(opciones); setPalets(porLinea); setError(''); invalidar();
    try { setLote(await post('vista', opciones, porLinea) as Lote); }
    catch (e) { setLote(null); setError(e instanceof Error ? e.message : 'No se pudo leer RPS.'); }
    finally { setOcupado(false); }
  };
  const abrir = async () => {
    setOcupado(true); setConfirmado(false); setEnvio('');
    try {
      const ok = await abrirCorteDwg({ ruta: '/api/assa/lote/borrador', orderCode: lote!.nombre,
        cuerpo: { fecha, sueltas, palets }, usuario: usuario(), preguntar: n.askForConfirmation, notify: n.notify });
      setAbierto(ok);
    } finally { setOcupado(false); }
  };
  const confirmar = async () => {
    setOcupado(true); setError('');
    try { await post('confirmar'); setConfirmado(true); n.notify('Corte confirmado. Ya puedes enviar la prueba.', { tone: 'success' }); }
    catch (e) { setConfirmado(false); setError(e instanceof Error ? e.message : 'No se pudo confirmar.'); }
    finally { setOcupado(false); }
  };
  const enviar = async () => {
    setOcupado(true); setError('');
    try { const datos = await post('enviar'); setEnvio(datos.ruta); }
    catch (e) { setConfirmado(false); setError(e instanceof Error ? e.message : 'No se pudo enviar.'); }
    finally { setOcupado(false); }
  };
  const validas = lote ? lote.lineas.length - lote.aMano : 0;
  // Al poner el palet en una línea, las del mismo pedido que aún no lo tienen van al mismo; luego se cambian una a una.
  const conPalet = (l: Lote['lineas'][number], v: number | null) => {
    const siguiente = { ...palets };
    if (v == null || !Number.isInteger(v) || v < 1 || v > 99) { delete siguiente[l.IDOrderLine]; return siguiente; }
    siguiente[l.IDOrderLine] = v;
    for (const o of lote?.lineas ?? []) if (o.CodOrder === l.CodOrder && siguiente[o.IDOrderLine] === undefined) siguiente[o.IDOrderLine] = v;
    return siguiente;
  };
  return createPortal(<>
    <dialog ref={dialogo} className="combursa-dialogo" aria-labelledby="combursa-titulo" onCancel={e => { e.preventDefault(); if (!ocupado) onCerrar(); }}>
      <div className="combursa-pagina">
        <header className="combursa-cabecera">
          <div><span className="combursa-cliente">COMBURSA · ASSA ABLOY</span><h1 id="combursa-titulo">Lote del sábado</h1><p>Pedidos de RPS, piezas y corte en un solo lote.</p></div>
          <button className="boton-3d" type="button" disabled={ocupado} onClick={onCerrar}><ArrowLeft size={16} aria-hidden="true" /> Volver</button>
        </header>
        <form className="glass-panel combursa-fecha" onSubmit={e => { e.preventDefault(); void cargar(); }}>
          <label><CalendarDays size={17} aria-hidden="true" /> Sábado de entrega<input type="date" value={fecha} disabled={ocupado} required onChange={e => { setFecha(e.target.value); setLote(null); setSueltas({}); setPalets({}); invalidar(); }} /></label>
          <button className="boton-3d" type="submit" disabled={ocupado}>{ocupado ? 'Preparando…' : 'Leer lote de RPS'}</button>
          <p>420150 · 420102 · 420148</p>
        </form>
        {error && <p role="alert" className="combursa-aviso">{error}</p>}
        {lote ? <>
          {lote.avisos.map(aviso => <p className="combursa-aviso" role="status" key={aviso}>{aviso}</p>)}
          <div className="combursa-resumen">
            <div className="glass-panel"><Layers aria-hidden="true" /><strong>{numero(lote.totalUnidades)}</strong><span>unidades pedidas · {lote.lineas.length} líneas</span></div>
            <div className="glass-panel"><Scissors aria-hidden="true" /><strong>{validas}</strong><span>líneas validadas para el corte</span></div>
            <div className="glass-panel"><strong>{lote.aMano}</strong><span>líneas a mano · ver motivo en su fila</span></div>
          </div>
          <section className="glass-panel combursa-listado" aria-label="Líneas del lote">
            <header><h2>{lote.nombre}</h2><span>Rollo PLASTEL 204 · sin giros ni empates</span></header>
            {!lote.lineas.length ? <p>No hay líneas de ASSA con esta fecha de entrega.</p> : <div className="combursa-tabla-scroll"><table className="combursa-lineas">
              <thead><tr><th>Pedido / línea</th><th>Referencia</th><th>Descripción / corte en mm</th><th>Cantidad</th><th>OF</th><th>Comentario</th><th>Estado</th><th>Palet</th><th>Cortar</th></tr></thead>
              <tbody>{lote.lineas.map(l => <tr key={l.IDOrderLine}>
                <td>{l.CodOrder}<small>Línea {l.NumLine ?? '—'}</small></td>
                <td className="combursa-referencia">{l.CodArticle}</td>
                <td>{l.descripcion}{l.corteMm && <small>{l.corteMm.map(numero).join(' × ')} mm</small>}{l.avisos.map(a => <small className="combursa-nota" key={a}>{a}</small>)}</td>
                <td className="combursa-numero">{numero(l.cantidad)}</td><td>{l.of_ || 'Sin OF'}</td><td>{l.comentarioLinea || '—'}</td>
                <td>{l.estado === 'validado' ? <span className="combursa-validado">Validado</span> : <><strong className="combursa-manual">A mano</strong><small>{l.motivos[0]}</small>{l.motivos.length > 1 && <details><summary>Ver motivos</summary>{l.motivos.slice(1).map(m => <p key={m}>{m}</p>)}</details>}</>}</td>
                <td><input className="combursa-palet" type="number" min={1} max={99} step={1} inputMode="numeric" disabled={ocupado}
                  defaultValue={palets[l.IDOrderLine] ?? ''} key={`${l.IDOrderLine}-${palets[l.IDOrderLine] ?? ''}`} aria-label={`Palet de ${l.CodArticle} ${l.CodOrder} línea ${l.NumLine ?? '—'}`}
                  onBlur={e => { const v = Number(e.target.value); if (e.target.value === '' ? palets[l.IDOrderLine] === undefined : v === palets[l.IDOrderLine]) return; void cargar(sueltas, conPalet(l, e.target.value === '' ? null : v)); }} /></td>
                <td><label className="combursa-suelta"><input type="checkbox" disabled={ocupado || l.estado !== 'validado' || !l.codigo} checked={Boolean(l.codigo && sueltas[l.codigo])} aria-label={`Sueltas ${l.CodArticle} ${l.CodOrder} línea ${l.NumLine ?? '—'}`} onChange={e => { if (l.codigo) void cargar({ ...sueltas, [l.codigo]: e.target.checked }); }} />Sueltas</label></td>
              </tr>)}</tbody>
            </table></div>}
          </section>
          {lote.programas.length > 0 && <VistaCorte programas={lote.programas} />}
          {lote.cortador.length > 0 && <HojaCortador lote={lote} />}
          <footer className="glass-panel combursa-acciones">
            <div><strong>{envio ? 'Prueba enviada' : confirmado ? 'Corte confirmado' : abierto ? 'Revisa el DWG y confirma el corte' : 'Revisa la vista del corte'}</strong><small>{envio || `Destino de prueba: ${lote.destino}`}</small></div>
            <button type="button" className="boton-3d" disabled={ocupado || !lote.programas.length || !lote.dwgDisponible || !lote.paletsCompletos} onClick={() => void abrir()}>Abrir corte</button>
            <button type="button" className="boton-3d" disabled={ocupado || !abierto} onClick={() => void confirmar()}>Confirmar corte</button>
            <button type="button" className="boton-3d" disabled={ocupado || !confirmado || Boolean(envio)} onClick={() => void enviar()}>Enviar prueba al bot</button>
          </footer>
          {!lote.dwgDisponible && <p className="combursa-ayuda">ODA no está disponible para preparar el DWG.</p>}
        </> : <div className="glass-panel combursa-vacio"><CalendarDays size={30} aria-hidden="true" /><h2>Prepara la próxima entrega</h2><p>Elige un sábado para ver los pedidos, las cantidades y sus OF.</p></div>}
      </div>
    </dialog>
    <NotificationCenter toasts={n.toasts} dialog={n.dialog} onDismissToast={n.dismissToast} onResolveDialog={n.resolveDialog} />
  </>, document.body);
}
