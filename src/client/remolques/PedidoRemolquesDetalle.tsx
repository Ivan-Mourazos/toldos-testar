import { confirmarMateriales, type AvisoMateriales } from '../materialesEntrega';
import { pedidoEntrega } from '../../entregas.js';
import { solicitarGeneracion } from '../reintentarGeneracion';
import React, { useCallback, useEffect, useState } from 'react';
import { CopyPlus, ExternalLink, Factory, FileSearch, FileText, Scissors } from 'lucide-react';
import { formOptions } from '../../domain/modelBehavior.js';
import { elementosAprobacion, modeloElemento } from '../../remolques/flujo/pedido.ts';
import type { ElementoGuardado, PedidoRemolques } from '../../remolques/flujo/tipos.ts';
import { normalizeOf, reviewerName } from '../../reviewRules.js';
import type { AskForConfirmation, Notify } from '../components/NotificationCenter';
import { controlLabel } from '../components/controlLabels';
import { useCoordinaStatus } from '../hooks/useCoordinaStatus';
import type { CoordinaStatus } from '../types';
import { CorteRemolques, type VistaCorteRemolques } from './CorteRemolques';
import { estadoGenerarRemolques, ficherosPrevistos, opcionesCorteRemolques } from './generarPedido';
import { puedeCorregir } from '../generatePermission';
import { LecturaPedidoRemolques } from './LecturaPedidoRemolques';
import { formatearNumeroEs } from './numeroEs';
import { DocumentosPedido } from '../components/DocumentosPedido';
import { PlanteamientoPedido } from '../components/PlanteamientoPedido';
import { EnviosCorte, HistorialEnvios } from '../components/EnviosCorte';
import { AccionesPedido, CabeceraPedidoGuardado } from '../components/AccionesPedido';
import { useCortePedidoEditable } from '../useCortePedidoEditable';
import { aprobadaOPasada } from '../../toldosEditable.js';
import { abrirCorteGuardado, preguntarCambioCorte, decidirCortePendiente, type CortePendiente } from '../toldosEditable';

// Un pedido de remolques abierto desde Pedidos (fase 5), con las acciones del de toldos: ver la
// hoja, «Corregir», «Generar archivos» (con todo aprobado o pasado en CoordinaOT) y, ya
// generado, abrir su PDF y «Reutilizar datos». Debajo de la lista de elementos, el pedido entero en
// solo lectura (LecturaPedidoRemolques), como el formulario de lectura de los toldos.

function fechaHora(valor: string) {
  const fecha = new Date(valor);
  return Number.isNaN(fecha.getTime()) ? valor : new Intl.DateTimeFormat('es-ES', { dateStyle: 'short', timeStyle: 'short' }).format(fecha);
}

const nombreElemento = (elemento: ElementoGuardado) => (elemento.tipo === 'lona' ? `Remolque · ${modeloElemento(elemento)}`
  : elemento.tipo === 'ganado' ? `Ganado · ${modeloElemento(elemento)}` : 'Baquetón');

function FilaElemento({ elemento, letra, coordina }: { elemento: ElementoGuardado; letra: string; coordina: CoordinaStatus | null }) {
  const of = normalizeOf(elemento.input.cabecera.ordenFabricacion ?? '');
  const enCoordina = coordina?.disponible && of ? coordina.ofs?.[of] : undefined;
  const aprobadoPor = aprobadaOPasada(enCoordina?.estado) && enCoordina?.revisor
    ? reviewerName(enCoordina.revisor, formOptions.tecnicos as string[])
    : '';
  return (
    <li className="rem-pedido-elemento bloque-3d">
      <strong className="rem-pedido-letra">{letra}</strong>
      <span>{nombreElemento(elemento)}</span>
      <span>{`${formatearNumeroEs(elemento.input.largo)} × ${formatearNumeroEs(elemento.input.ancho)} cm`}</span>
      <span>{`OF ${of || '—'}`}</span>
      <span className="rem-pedido-material" title={elemento.input.material}>{elemento.input.material || 'Sin material'}</span>
      {aprobadoPor && <span className="orders-detail-approved">{`Aprobado por ${controlLabel(aprobadoPor)}`}</span>}
      {enCoordina?.estado === 'devuelta' && (
        <span className="orders-detail-returned"><strong>Devuelta en CoordinaOT:</strong> {enCoordina.nota || 'sin nota'}</span>
      )}
    </li>
  );
}

export function FichaPedidoRemolques({ pedido, cargando, coordina, currentUser, generando, onBack, onCorregir, onReutilizar, onGenerar, onEnviado, notify, onConfirm, elementoInicial, textoVolver = '← Pedidos' }: {
  pedido: PedidoRemolques | null;
  cargando: boolean;
  coordina: CoordinaStatus | null;
  currentUser: string;
  generando: boolean;
  onBack: () => void;
  onCorregir: () => void;
  onReutilizar: () => void;
  onGenerar: () => void;
  /** Tras mandar o guardar el corte: volver a leer el pedido. */
  onEnviado?: () => void;
  notify: Notify;
  onConfirm: AskForConfirmation;
  /** El elemento que se abre primero en la lectura (por su versión); sin él, el primero. */
  elementoInicial?: string;
  /** El texto del botón de volver: «← Buscar remolques» si se abrió desde el buscador. */
  textoVolver?: string;
}) {
  const claveCorte = `${pedido?.orderCode}|${pedido?.updatedAt}`;
  const [vistaCorte, setVistaCorte] = useState<{ clave: string; datos: VistaCorteRemolques } | null>(null);
  const recibirVista = useCallback((datos: VistaCorteRemolques) => setVistaCorte({ clave: claveCorte, datos }), [claveCorte]);
  const opcionesCorte = pedido ? opcionesCorteRemolques(pedido, vistaCorte?.clave === claveCorte ? vistaCorte.datos : undefined)
    : { falta: 'Cargando el pedido…', aplica: false };
  const corte = useCortePedidoEditable({ tipo: 'remolques', pedido, cuerpo: { elementos: pedido?.elementos, params: pedido?.params, clienteRps: pedido?.clienteRps },
    ...opcionesCorte,
    usuario: currentUser, notify, preguntar: onConfirm, onChanged: onEnviado });
  const volver = <button type="button" className="ghost-button boton-3d reviews-back-button" onClick={onBack}>{textoVolver}</button>;
  if (cargando) {
    return <section className="review-reader">{volver}<div className="review-empty"><FileSearch aria-hidden="true" />Cargando el pedido…</div></section>;
  }
  if (!pedido) {
    return <section className="review-reader">{volver}<div className="review-empty"><FileSearch aria-hidden="true" />No se pudo abrir el pedido.</div></section>;
  }
  const generado = pedido.status === 'PRODUCED';
  const { allowed, note } = estadoGenerarRemolques(pedido, currentUser, coordina);
  // Cualquier técnico edita; el aviso de aprobación se muestra desde la barra común.
  const corregible = puedeCorregir(pedido.status, elementosAprobacion(pedido), pedido.summary.technician || '', currentUser, coordina);
  const permisoCorte = estadoGenerarRemolques(Object.assign({}, pedidoEntrega(pedido), { status: 'PENDING_REVIEW' as const, entregas: [] }), currentUser, coordina);
  const ruta = `/api/remolques/pedidos/${encodeURIComponent(pedido.orderCode)}`;
  const letras = elementosAprobacion(pedido).map((item) => item.letter);
  const datos = [
    pedido.summary.customer || 'Sin cliente',
    pedido.summary.orderDate && `pedido del ${pedido.summary.orderDate.split('-').reverse().join('/')}`,
    pedido.summary.technician && `autor ${controlLabel(pedido.summary.technician)}`,
    pedido.updatedAt && `guardado ${fechaHora(pedido.updatedAt)}${pedido.updatedBy ? ` por ${controlLabel(pedido.updatedBy)}` : ''}`,
  ].filter(Boolean).join(' · ');

  return (
    <section className="review-reader rem-pedido-guardado" aria-label={`Pedido de remolques ${pedido.orderCode}`}>
      <CabeceraPedidoGuardado pedido={pedido} volver={volver} titulo={<>{pedido.orderCode}<span className="orders-kind-tag familia-tag is-remolques">Remolque</span></>}
        datos={datos} corteNoRegenerado={pedido.corteNoRegenerado} corteSimulado={pedido.corteSimulado}
        acciones={<AccionesPedido generado={generado} ocupado={generando || corte.ocupado} enviando={generando} editandoPermitido={corregible}
          onEditar={onCorregir} elementos={elementosAprobacion(pedido)} coordina={coordina} preguntar={onConfirm} abrir={corte.abrir}
          regenerar={currentUser && corte.abrir ? () => void corte.regenerar() : undefined} generar={onGenerar} generarPermitido={allowed} motivoGenerar={note}
          envios={opcionesCorte.aplica ? <EnviosCorte key={ruta} barra ruta={`${ruta}/corte`} usuario={currentUser} permitido={permisoCorte.allowed && Boolean(currentUser.trim())}
            motivo={permisoCorte.note} ocupado={generando || corte.ocupado} envios={pedido.enviosCorte} entrega={pedido.entregaActual} descarga={`${ruta}/corte/dxf`} notify={notify} preguntar={onConfirm} onEnviado={onEnviado}
            guardado={{ ruta: '/api/remolques/pedidos', cuerpo: { elementos: pedido.elementos, params: pedido.params, clienteRps: pedido.clienteRps }, usuario: currentUser }}
            mas={generado ? <button type="button" role="menuitem" className="menu-mas-item" onClick={onReutilizar}><CopyPlus size={16} aria-hidden="true" />Reutilizar datos</button> : null} />
            : generado ? <button type="button" className="ghost-button boton-3d" onClick={onReutilizar}><CopyPlus aria-hidden="true" />Reutilizar datos</button> : null} />} />

      {generado && pedido.production && (
        <div className="review-production-block bloque-3d" role="status">
          <div className="review-production-summary">
            <Factory aria-hidden="true" />
            <span>
              <strong>{`Archivos generados${pedido.production.createdBy ? ` por ${controlLabel(pedido.production.createdBy)}` : ''}`}</strong>
              <small>{`${fechaHora(pedido.production.createdAt)}${pedido.reviewedBy ? ` · revisado por ${controlLabel(pedido.reviewedBy)}` : ''}`}</small>
            </span>
          </div>
          <div className="review-generated-files">
            <a className="review-generated-file chip-3d is-pdf" href={`${ruta}/archivo`} target="_blank" rel="noreferrer"
              title={pedido.production.files.map((fichero) => fichero.savedPath).join('\n')}>
              <span className="review-generated-file-icon"><FileText aria-hidden="true" /></span>
              <span><strong>{pedido.production.files[0]?.filename ?? 'Hoja de taller'}</strong><small>Hoja de taller PDF · planteamientos y oficina técnica</small></span>
              <ExternalLink aria-hidden="true" />
            </a>
            {pedido.production.corte?.files.map((fichero) => (
              <span className="review-generated-file chip-3d" key={fichero.savedPath} title={fichero.savedPath}>
                <span className="review-generated-file-icon"><Scissors aria-hidden="true" /></span>
                <span><strong>{fichero.filename}</strong><small>{`${fichero.type === 'corte-lona' ? 'Corte del bot' : 'Plano de revisión'} · ${fichero.material}`}</small></span>
              </span>
            ))}
          </div>
          {pedido.production.corte && pedido.production.corte.avisos.length > 0 && (
            <ul className="corte-avisos">{pedido.production.corte.avisos.map((aviso, i) => <li key={i}>{aviso}</li>)}</ul>
          )}
        </div>
      )}


      <ul className="rem-pedido-elementos" aria-label="Elementos del pedido">
        {pedido.elementos.map((elemento, indice) => (
          <FilaElemento key={elemento.version} elemento={elemento} letra={letras[indice]} coordina={coordina} />
        ))}
      </ul>

      {/* key: otro pedido empieza otra vez por su primer elemento. */}
      <LecturaPedidoRemolques key={pedido.orderCode} pedido={pedido} versionInicial={elementoInicial} />

      {/* Debajo de los datos (Iván, 20/10/2026). Se vuelve a calcular si el pedido cambia (guardado o generado). */}
      <DocumentosPedido planteamiento={<PlanteamientoPedido origen={`${ruta}/vista-previa`} version={pedido.updatedAt} />}
        corte={<CorteRemolques ruta={ruta} version={pedido.updatedAt} generado notify={notify} onConfirm={onConfirm} onVista={recibirVista}
        acciones={<HistorialEnvios envios={pedido.enviosCorte} />} />} />
    </section>
  );
}

export function PedidoRemolquesDetalle({ orderCode, refreshKey, currentUser, onBack, onCorregir, onReutilizar, onChanged, onToast, onConfirm, elementoInicial, textoVolver, pedidoInicial }: {
  pedidoInicial?: PedidoRemolques;
  orderCode: string;
  refreshKey: number;
  currentUser: string;
  /** El elemento que se abre elegido (por su versión): el de la fila pulsada en el buscador. */
  elementoInicial?: string;
  textoVolver?: string;
  onBack: () => void;
  onCorregir: (pedido: PedidoRemolques) => void;
  onReutilizar: (pedido: PedidoRemolques) => void;
  onChanged: () => void;
  onToast: Notify;
  onConfirm: AskForConfirmation;
}) {
  const [detalle, setDetalle] = useState<{ orderCode: string; pedido: PedidoRemolques | null } | null>(()=>pedidoInicial?.orderCode===orderCode?{orderCode,pedido:pedidoInicial}:null);
  const [generando, setGenerando] = useState(false);
  const cargando = detalle?.orderCode !== orderCode;
  const pedido = detalle && detalle.orderCode === orderCode ? detalle.pedido : null;
  // Las OF del pedido abierto en CoordinaOT; un pedido generado no necesita preguntar.
  const ofs = pedido ? elementosAprobacion(pedido).map((item) => item.of) : [];
  const { status: coordina } = useCoordinaStatus(ofs, Boolean(pedido));

  useEffect(() => {
    let cancelado = false;
    fetch(`/api/remolques/pedidos/${encodeURIComponent(orderCode)}`, { cache: 'no-store' })
      .then(async (respuesta) => {
        const datos = await respuesta.json();
        if (!respuesta.ok) throw new Error(datos.error || 'No se pudo abrir el pedido.');
        return datos as PedidoRemolques;
      })
      .then((leido) => { if (!cancelado) setDetalle({ orderCode, pedido: leido }); })
      .catch((error) => {
        if (cancelado) return;
        setDetalle({ orderCode, pedido: null });
        onToast(error instanceof Error ? error.message : 'No se pudo abrir el pedido.', { tone: 'error' });
      });
    return () => { cancelado = true; };
  }, [orderCode, refreshKey, onToast]);

  async function generar() {
    if (!pedido || !estadoGenerarRemolques(pedido, currentUser, coordina).allowed) return;
    const codigo = pedido.orderCode;
    const inicial = await onConfirm({
      title: `Generar archivos de ${codigo}`,
      message: 'CoordinaOT ya lo ha aprobado. Se guardará la hoja de taller, con quién la revisó y los datos del pedido dentro, en las dos carpetas de remolques.',
      details: ficherosPrevistos(pedido),
      confirmLabel: 'Sí, generar archivos',
      cancelLabel: 'Ahora no',
      tone: 'warning',
    });
    if (inicial !== 'confirm') return;
    setGenerando(true);
    let confirmOverwrite = false;
    let aceptarHuellaCorte: string | undefined;
    let aceptarCorteNoRegenerado: string | undefined;
    let aceptarMateriales: string | undefined;
    try {
      for (;;) {
        const { respuesta, datos } = await solicitarGeneracion(`/api/remolques/pedidos/${encodeURIComponent(codigo)}/generar`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ confirmOverwrite, aceptarHuellaCorte, aceptarCorteNoRegenerado, aceptarMateriales, savedBy: currentUser }),
        }, async (respuesta) => ({ respuesta, datos: await respuesta.json() as CortePendiente & AvisoMateriales & { needsMaterialConfirmation?: boolean; error?: string; cambioCorte?: boolean; huella?: string; needsConfirmation?: boolean; existing?: string[]; unchanged?: boolean; nombre?: string } }),
        () => onToast('Reintentando…', { tone: 'info' }));
        if (respuesta.status === 409 && datos.needsMaterialConfirmation) {
          if (!await confirmarMateriales(datos, onConfirm)) return;
          aceptarMateriales = datos.huellaMateriales;
          continue;
        }
        if (respuesta.status === 409 && datos.corteNoRegenerado) {
          const permiso = await decidirCortePendiente(datos, onConfirm, { ruta: '/api/remolques/pedidos', cuerpo: { elementos: pedido.elementos, params: pedido.params, clienteRps: pedido.clienteRps }, usuario: currentUser }, onChanged);
          if (permiso === null) return;
          aceptarCorteNoRegenerado = permiso || undefined;
          continue;
        }
        if (respuesta.status === 409 && datos.cambioCorte) {
          if (!await preguntarCambioCorte(onConfirm, () => abrirCorteGuardado(`/api/remolques/pedidos/${encodeURIComponent(codigo)}/corte-dwg`))) return;
          aceptarHuellaCorte = datos.huella;
          continue;
        }
        if (respuesta.status === 409 && datos.needsConfirmation && !confirmOverwrite) {
          const eleccion = await onConfirm({
            title: 'Sustituir archivos existentes',
            message: 'La hoja de taller de este pedido ya está en las carpetas. Comprueba la lista antes de sustituirla.',
            details: datos.existing,
            confirmLabel: 'Sustituir archivos',
            cancelLabel: 'Conservar archivos',
            tone: 'danger',
          });
          if (eleccion !== 'confirm') return;
          confirmOverwrite = true;
          continue;
        }
        if (!respuesta.ok) throw new Error(datos.error || 'No se pudieron generar los archivos.');
        // Se releen pendientes, historial y contador: el pedido pasa a «Generados».
        onChanged();
        onBack();
        if (datos.unchanged) {
          onToast('Este pedido ya estaba generado.', { tone: 'info', title: 'Sin cambios' });
          return;
        }
        onToast(`Guardada la hoja de taller ${datos.nombre ?? ''} en planteamientos y en oficina técnica.`, { tone: 'success', title: 'Archivos generados' });
        return;
      }
    } catch (error) {
      onToast(error instanceof Error ? error.message : 'No se pudieron generar los archivos.', { tone: 'error' });
    } finally {
      setGenerando(false);
    }
  }

  return (
    <FichaPedidoRemolques
      pedido={pedido}
      cargando={cargando}
      coordina={coordina}
      currentUser={currentUser}
      generando={generando}
      onBack={onBack}
      onCorregir={() => { if (pedido) onCorregir(pedido); }}
      onReutilizar={() => { if (pedido) onReutilizar(pedido); }}
      onGenerar={() => void generar()}
      onEnviado={onChanged}
      notify={onToast}
      onConfirm={onConfirm}
      elementoInicial={elementoInicial}
      textoVolver={textoVolver}
    />
  );
}
