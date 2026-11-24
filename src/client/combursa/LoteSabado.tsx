import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ArrowLeft, CalendarDays } from 'lucide-react';
import { abrirCorteDwg } from '../abrirCorte';
import { NotificationCenter, useNotifications } from '../components/NotificationCenter';
import { VistaCorte } from './VistaCorte';
import { HojaCortador } from './HojaCortador';
import { PaletsLote } from './PaletsLote';
import type { Lote } from './tipos';

function proximoSabado() {
  const d = new Date();
  d.setDate(d.getDate() + (6 - d.getDay() + 7) % 7);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
const numero = (n: number) => n.toLocaleString('es-ES', { maximumFractionDigits: 1 });

export default function LoteSabado({ onCerrar }: { onCerrar: () => void }) {
  const dialogo = useRef<HTMLDialogElement>(null);
  const [vista, setVista] = useState<'lineas' | 'corte' | 'papel'>('lineas');
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
    setVista('lineas'); setOcupado(true); setSueltas(opciones); setPalets(porLinea); setError(''); invalidar();
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
    if (lote?.paletsOficina) return siguiente;
    for (const o of lote?.lineas ?? []) if (o.CodOrder === l.CodOrder && siguiente[o.IDOrderLine] === undefined) siguiente[o.IDOrderLine] = v;
    return siguiente;
  };
  return createPortal(<>
    <dialog ref={dialogo} className="combursa-dialogo" aria-labelledby="combursa-titulo" onCancel={e => { e.preventDefault(); if (!ocupado) onCerrar(); }}>
      <div className="combursa-pagina">
        <header className="glass-header combursa-cabecera">
          <div><span className="combursa-cliente">COMBURSA · ASSA ABLOY</span><h1 id="combursa-titulo">{lote?.nombre ?? 'Lote del sábado'}</h1></div>
          <button className="ghost-button" type="button" disabled={ocupado} onClick={onCerrar}><ArrowLeft size={16} aria-hidden="true" /> Volver</button>
        </header>
        <form className="glass-panel combursa-fecha" onSubmit={e => { e.preventDefault(); void cargar(); }}>
          <label><CalendarDays size={17} aria-hidden="true" /> Sábado de entrega<input type="date" value={fecha} disabled={ocupado} required onChange={e => { setFecha(e.target.value); setLote(null); setSueltas({}); setPalets({}); invalidar(); }} /></label>
          <button className="ghost-button" type="submit" disabled={ocupado}>{ocupado ? 'Preparando…' : 'Leer lote de RPS'}</button>
          {lote && <dl className="combursa-resumen">
            <div><dt>Pedidos</dt><dd>{new Set(lote.lineas.map(l => l.CodOrder)).size}</dd></div>
            <div><dt>Líneas</dt><dd>{lote.lineas.length}</dd></div>
            <div><dt>Unidades</dt><dd>{numero(lote.totalUnidades)}</dd></div>
            <div><dt>Validadas</dt><dd>{validas}</dd></div>
            <div><dt>A mano</dt><dd>{lote.aMano}</dd></div>
          </dl>}
        </form>
        {error && <p role="alert" className="combursa-aviso">{error}</p>}
        {lote ? <>
          <nav className="combursa-vistas tira-3d" aria-label="Vistas del lote">
            <button type="button" className={vista === 'lineas' ? 'pestana-activa' : undefined} aria-pressed={vista === 'lineas'} onClick={() => setVista('lineas')}>Palets</button>
            <button type="button" className={vista === 'corte' ? 'pestana-activa' : undefined} aria-pressed={vista === 'corte'} onClick={() => setVista('corte')}>Dibujos · {lote.programas.length}</button>
            <button type="button" className={vista === 'papel' ? 'pestana-activa' : undefined} aria-pressed={vista === 'papel'} onClick={() => setVista('papel')}>Papel del cortador</button>
          </nav>
          <div className="combursa-contenido" aria-busy={ocupado}>
          {vista === 'lineas' && <PaletsLote lote={lote} ocupado={ocupado} sueltas={sueltas}
            onPalet={(linea, palet) => void cargar(sueltas, conPalet(linea, palet))}
            onSueltas={(codigo, suelta) => void cargar({ ...sueltas, [codigo]: suelta })} />}
          {vista === 'corte' && (lote.programas.length ? <VistaCorte programas={lote.programas} /> : <p className="combursa-ayuda">No hay programas de corte para estas líneas.</p>)}
          {vista === 'papel' && (lote.cortador.length ? <HojaCortador lote={lote} /> : <p className="combursa-ayuda">No hay cantidades para imprimir.</p>)}
          </div>
          <footer className="glass-panel combursa-acciones">
            <div><strong>{envio ? 'Prueba enviada' : confirmado ? 'Corte confirmado' : abierto ? 'Revisa el DWG y confirma el corte' : !lote.paletsCompletos ? 'Asigna los palets para preparar el corte' : !lote.programas.length ? 'No hay líneas para cortar' : !lote.dwgDisponible ? 'ODA no está disponible para preparar el DWG' : 'Revisa las líneas y los dibujos'}</strong><small>{envio || lote.avisos[0] || `Destino de prueba: ${lote.destino}`}</small></div>
            <button type="button" className="ghost-button" disabled={ocupado || !lote.programas.length || !lote.dwgDisponible || !lote.paletsCompletos} onClick={() => void abrir()}>Abrir corte</button>
            <button type="button" className="ghost-button" disabled={ocupado || !abierto} onClick={() => void confirmar()}>Confirmar corte</button>
            <button type="button" className="primary-button" disabled={ocupado || !confirmado || Boolean(envio)} onClick={() => void enviar()}>Enviar prueba al bot</button>
          </footer>
        </> : <div className="glass-panel combursa-vacio"><CalendarDays size={30} aria-hidden="true" /><h2>Prepara la próxima entrega</h2><p>Elige un sábado para ver los pedidos, las cantidades y sus OF.</p></div>}
      </div>
    </dialog>
    <NotificationCenter toasts={n.toasts} dialog={n.dialog} onDismissToast={n.dismissToast} onResolveDialog={n.resolveDialog} />
  </>, document.getElementById('root')!);
}
