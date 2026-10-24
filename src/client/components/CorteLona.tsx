import React, { useEffect, useRef, useState } from 'react';
import { CheckCircle2, FolderOpen, Scissors, RefreshCw } from 'lucide-react';
import { abrirCorteDwg, confirmarCorteDwg } from '../abrirCorte';
import type { AskForConfirmation, Notify } from './NotificationCenter';
import { corteReadiness } from '../../domain/corteReadiness.js';
import { resolveFabric } from '../../domain/fabricCatalog.js';
import { awningLetter } from '../../domain/awningCompleteness.js';
import { AJUSTES_POR_DEFECTO } from '../../domain/corteLona/despiece.js';
import type { DraftState } from '../types';
import { textoEstadoCorte, type AjustesCorte, type CorteRespuesta, type EstadoCorte, type PendienteCorte, type VistaCorte } from '../corteLona';
import '../coordina/corte-lona.css';
import { CabeceraDocumento } from './DocumentosPedido';

const numero = (n: number) => n.toLocaleString('es-ES', { maximumFractionDigits: 3 });

// `regenerable`: en un pedido guardado, su autor puede generar el corte que falta o está viejo sin «Corregir»
// (Iván, 21/10/2026); `onGenerated` lo guarda con el pedido tal cual está.
// `dwg`: en el formulario, «Abrir corte» y «Confirmar corte» del flujo del DWG (plan del 24/10/2026), como en puertas.
export function CorteLona({ order, estado, onGenerated, reviewCode, acciones, regenerable = false, dwg }: {
  order: DraftState; estado?: EstadoCorte | null; onGenerated?: (estado: EstadoCorte) => void; reviewCode?: string; regenerable?: boolean;
  acciones?: (alDia: boolean) => React.ReactNode;
  dwg?: { usuario: string; notify: Notify; preguntar: AskForConfirmation };
}) {
  const [abriendo, setAbriendo] = useState(false);
  const toldos = order.awnings.flatMap((t, i) => corteReadiness(t.model).ready &&
    resolveFabric(order.sameFabric ? order.fabric : t.fabric)?.material?.trim().toUpperCase() === 'PLASTICA (LONA)' ? [{ t, letra: awningLetter(i) }] : []);
  const entrada = JSON.stringify(order);
  const [vista, setVista] = useState<{ entrada: string; datos: CorteRespuesta } | null>(null);
  const [comprobacion, setComprobacion] = useState<{ entrada: string; pendientes: PendienteCorte[] } | null>(null);
  const [error, setError] = useState('');
  const [generando, setGenerando] = useState(false);
  const secuencia = useRef(0);
  const entradaActual = useRef(entrada);
  useEffect(() => { entradaActual.current = entrada; }, [entrada]);
  const requerido = toldos.length > 0;
  const estadoJson = JSON.stringify(estado ?? null);

  useEffect(() => {
    if (!requerido) return;
    const controller = new AbortController();
    const timer = setTimeout(() => {
      const url = reviewCode ? `/api/reviews/${encodeURIComponent(reviewCode)}/corte-lona` : '/api/corte-lona/estado';
      fetch(url, reviewCode ? { signal: controller.signal } : {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ order: JSON.parse(entrada), corteLona: JSON.parse(estadoJson) }), signal: controller.signal
      }).then(async response => {
        const datos = await response.json();
        if (!response.ok) throw new Error(datos.error || 'No se pudo comprobar el corte.');
        if (controller.signal.aborted) return;
        setComprobacion({ entrada, pendientes: datos.pendientes });
        if (reviewCode) setVista({ entrada, datos });
      }).catch(e => { if (!controller.signal.aborted) setError(e.message); });
    }, 250);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [entrada, estadoJson, requerido, reviewCode]);

  if (!requerido) return null;
  const datos = vista?.entrada === entrada ? vista.datos : null;
  const sinOf = toldos.some(({ t }) => !t.of?.trim());
  const pendientes = comprobacion?.entrada === entrada ? comprobacion.pendientes : estado ? null : toldos.map(({ letra }) => ({ letra, motivo: 'sinGenerar' as const }));
  const estadoVisible = pendientes?.some(p => p.motivo === 'viejo') ? 'viejo' : pendientes?.length || !estado ? 'falta' : 'hecho';

  async function generar(ajustes = estado?.ajustes || {}) {
    const solicitud = ++secuencia.current;
    setGenerando(true);
    setError('');
    try {
      const response = await fetch('/api/corte-lona', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ order, ajustes }) });
      const datos: CorteRespuesta & { error?: string } = await response.json();
      if (!response.ok) throw new Error(datos.error || 'No se pudo generar el corte.');
      if (solicitud !== secuencia.current || entrada !== entradaActual.current) return;
      setVista({ entrada, datos });
      setComprobacion({ entrada, pendientes: datos.pendientes });
      if (datos.corteLona) onGenerated?.(datos.corteLona);
    } catch (e) { if (solicitud === secuencia.current) setError(e instanceof Error ? e.message : 'No se pudo generar el corte.'); }
    finally { if (solicitud === secuencia.current) setGenerando(false); }
  }
  // Fase 1: los planos del corte en la carpeta de borradores, abiertos en ZWCAD. Fase 2: su corte, confirmado para guardar.
  async function abrirCorte() {
    if (!dwg) return;
    setAbriendo(true);
    try { await abrirCorteDwg({ ruta: '/api/corte-lona/borrador', orderCode: order.orderCode, cuerpo: { order, corteLona: estado }, usuario: dwg.usuario, preguntar: dwg.preguntar, notify: dwg.notify }); }
    finally { setAbriendo(false); }
  }
  async function confirmarCorte() {
    if (!dwg) return;
    setAbriendo(true);
    try { await confirmarCorteDwg({ ruta: '/api/corte-lona/borrador/confirmar', orderCode: order.orderCode, usuario: dwg.usuario, notify: dwg.notify }); }
    finally { setAbriendo(false); }
  }
  function cambiar(clave: string, patch: AjustesCorte) {
    void generar({ ...estado?.ajustes, [clave]: { ...estado?.ajustes[clave], ...patch } });
  }

  return <section className="corte-lona panel bloque-3d" aria-label={reviewCode ? 'Corte' : 'Corte de lona'} aria-busy={generando}>
    <CabeceraDocumento titulo={reviewCode ? 'Corte' : 'Corte de lona'} icono={<Scissors aria-hidden="true" />}>
      <span className={`corte-estado is-${sinOf ? 'aviso' : estadoVisible}`} role="status">{!sinOf && estadoVisible === 'hecho' && <CheckCircle2 size={16} aria-hidden="true" />}{sinOf ? 'Vista previa · falta la OF' : pendientes === null ? 'Comprobando el corte…' : textoEstadoCorte(estadoVisible)}</span>
      {(!reviewCode || (regenerable && pendientes !== null && estadoVisible !== 'hecho')) && <button className="primary-button boton-3d" type="button" disabled={generando} onClick={() => void generar()}><RefreshCw size={16} aria-hidden="true" />{generando ? 'Generando corte…' : 'Generar corte'}</button>}
      {dwg && !reviewCode && <>
        <button type="button" className="ghost-button boton-3d" onClick={() => void abrirCorte()} disabled={abriendo || generando || sinOf || estadoVisible !== 'hecho'}
          title={estadoVisible !== 'hecho' ? 'Genera el corte antes de abrirlo' : 'Deja el plano en la carpeta de borradores y lo abre en ZWCAD'}><FolderOpen size={16} aria-hidden="true" />{abriendo ? 'Un momento…' : 'Abrir corte'}</button>
        <button type="button" className="ghost-button boton-3d" onClick={() => void confirmarCorte()} disabled={abriendo || generando || sinOf || estadoVisible !== 'hecho'}
          title="Lee el borrador tal como quedó en ZWCAD y lo da por bueno para guardar para revisión"><CheckCircle2 size={16} aria-hidden="true" />Confirmar corte</button>
      </>}
      {acciones?.(Boolean(datos && pendientes?.length === 0))}
    </CabeceraDocumento>
    <p className="corte-ayuda">PVC · piezas y marcas de confección, agrupadas por tela</p>
    {error && <p role="alert" className="corte-aviso">{error}</p>}
    {pendientes && pendientes.length > 0 && <p className="corte-aviso">{pendientes.map(p => `Toldo ${p.letra}: ${p.motivo === 'viejo' ? 'corte viejo' : 'falta generar el corte'}`).join(' · ')}</p>}
    {!datos && estado?.toldos.some(t => t.manual) && <ul className="corte-avisos">{estado.toldos.filter(t => t.manual).map(t => <li key={t.clave}>Toldo {t.letra}, OF {t.of}: {t.motivoManual}</li>)}</ul>}
    {!reviewCode && <details className="corte-ajustes"><summary>Ajustes por toldo · se regenera al cambiar</summary>
      {toldos.map(({ t, letra }) => {
        const clave = t.id || t.of || letra;
        const a = { ...AJUSTES_POR_DEFECTO, ...estado?.ajustes[clave] } as AjustesCorte;
        return <fieldset key={clave} disabled={generando}><legend>Toldo {letra} · OF {t.of || 'sin indicar'}</legend>
          <label>Empate<select aria-label="Empate" value={a.empate} onChange={e => cambiar(clave, { empate: e.target.value as AjustesCorte['empate'] })}><option value="horizontal">Horizontal</option><option value="vertical">Vertical</option></select></label>
          {([
            ['empateCm', 'Empate (cm)'], ['aumentoEscuadrarCm', 'Aumento para escuadrar (cm)'], ['lateralVerticalCm', 'Cada lateral en vertical (cm)'],
            ['tiraExtraLargoCm', 'Tira: extra de largo (cm)'], ['tiraExtraAltoCm', 'Tira: extra de alto (cm)']
          ] as const).map(([campo, etiqueta]) => <label key={`${clave}-${campo}-${a[campo]}`}>{etiqueta}<input type="text" inputMode="decimal" defaultValue={numero(a[campo] ?? 0)} onBlur={e => {
            const valor = Number(e.target.value.replace(',', '.'));
            if (!Number.isFinite(valor) || valor < 0) { e.target.value = numero(a[campo] ?? 0); return; }
            if (valor !== a[campo]) cambiar(clave, { [campo]: valor });
          }} /></label>)}
          <label>Varilla de arriba<select aria-label="Varilla de arriba" value={a.varillaArriba || (t.workType === 'FULL_AWNING' ? 'VARILLA NEGRA (4,5)' : 'VARILLA BLANCA (5,5)')} onChange={e => cambiar(clave, { varillaArriba: e.target.value })}><option>VARILLA NEGRA (4,5)</option><option>VARILLA BLANCA (5,5)</option></select></label>
          <label>Tira en vertical<select aria-label="Tira en vertical" value={estado?.ajustes[clave]?.tiraPartida === undefined ? 'auto' : a.tiraPartida ? 'partida' : 'entera'} onChange={e => cambiar(clave, { tiraPartida: e.target.value === 'auto' ? undefined : e.target.value === 'partida' })}><option value="auto">Automática</option><option value="entera">Entera</option><option value="partida">Partida</option></select></label>
        </fieldset>;
      })}
    </details>}
    {datos && <CorteLonaVista datos={datos} />}
    {!datos && estado && !reviewCode && <p className="corte-ayuda">Genera el corte para ver las piezas y las dos opciones del rollo.</p>}
  </section>;
}

export function CorteLonaVista({ datos }: { datos: CorteRespuesta }) {
  return <>
    {datos.avisos.length > 0 && <ul className="corte-avisos">{datos.avisos.map((aviso, i) => <li key={i}>{aviso}</li>)}</ul>}
    {datos.cortes.conSacos.map(corte => {
      const separado = datos.cortes.trozoSeparado?.find(c => c.idMaterial === corte.idMaterial);
      const soloBamba = corte.piezas.every(t => t.piezas.every(p => p.nombre.includes('BAMBA')));
      // El cristal de las cortinas va en su rollo, sin sacos de stock.
      const soloCristal = corte.piezas.every(t => t.piezas.every(p => p.nombre.includes('CRISTAL')));
      return <article className="corte-material" key={corte.idMaterial}>
        <header><h3>{corte.material}</h3><span>Rollo de {numero(corte.anchoRollo / 10)} cm · {corte.codigoTela}</span></header>
        <div className="corte-opciones"><Opcion corte={corte} titulo={soloBamba ? 'Bamba sola · sin sacos' : soloCristal ? 'Cristal · sin sacos' : 'Con sacos'} soloBamba={soloBamba || soloCristal} />{separado && <Opcion corte={separado} titulo="Trozo separado" />}</div>
        <details className="corte-desglose"><summary>Piezas por toldo · medidas de corte en cm</summary>{corte.piezas.map((t, i) => <div key={i}><strong>{`Toldo ${t.letra}${(t.unidades ?? 1) > 1 ? ` (${t.unidades} uds)` : ''}`}</strong><ul>{t.piezas.map((p, j) => <li key={j}>{p.nombre}: {numero(p.largo / 10)} × {numero(p.alto / 10)} cm</li>)}</ul></div>)}</details>
      </article>;
    })}
  </>;
}

function Opcion({ corte, titulo, soloBamba = false }: { corte: VistaCorte; titulo: string; soloBamba?: boolean }) {
  return <section className="corte-opcion"><header><strong>{titulo}</strong><span><b>{numero(corte.largo / 1000)} m</b> de rollo</span></header>
    {Boolean(corte.largoRestos) && <p>{numero(corte.largoRestos! / 1000)} m aparte, para cortar de un resto</p>}
    <DibujoCorte corte={corte} />
    <small className="corte-leyenda"><span>DISCO1 · corte</span><span>ROTULADOR · marcas</span></small>
    {!soloBamba && <p>Sacos: {corte.sacos.length}{corte.sacos.length > 0 ? ` · ${corte.sacos.map(s => `${numero(s.largo / 10)} × ${numero(s.alto / 10)} cm`).join(' · ')}` : ' · sin alargar el rollo'}</p>}
  </section>;
}

export function DibujoCorte({ corte }: { corte: VistaCorte }) {
  const { lineas, textos } = corte.dibujo;
  let maxX = corte.largo, maxY = corte.anchoRollo, minX = 0, minY = 0;
  for (const l of lineas) { maxX = Math.max(maxX, l.x1, l.x2); maxY = Math.max(maxY, l.y1, l.y2); minX = Math.min(minX, l.x1, l.x2); minY = Math.min(minY, l.y1, l.y2); }
  for (const t of textos) { maxY = Math.max(maxY, t.y + t.h); maxX = Math.max(maxX, t.x); minY = Math.min(minY, t.y - t.h); }
  const margen = 180;
  return <svg className="corte-dibujo" role="img" aria-label={`Vista del corte ${corte.material}`} viewBox={`${minX - margen} ${-maxY - margen} ${maxX - minX + margen * 2} ${maxY - minY + margen * 2}`}>
    <rect x="0" y={-corte.anchoRollo} width={corte.largo} height={corte.anchoRollo} className="corte-rollo" />
    {lineas.map((l, i) => <line key={i} x1={l.x1} y1={-l.y1} x2={l.x2} y2={-l.y2} data-capa={l.capa} className={l.capa === 'ROTULADOR' ? 'corte-marca' : 'corte-linea'} vectorEffect="non-scaling-stroke" />)}
    {textos.map((t, i) => <text key={i} x={t.x} y={-t.y} fontSize={t.h} textAnchor={t.centrado ? 'middle' : 'start'} transform={t.giro ? `rotate(${-t.giro} ${t.x} ${-t.y})` : undefined}>{t.valor}</text>)}
  </svg>;
}
