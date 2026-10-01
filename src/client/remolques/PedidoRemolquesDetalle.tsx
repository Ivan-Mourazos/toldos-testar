import React, { useEffect, useState } from 'react';
import { CopyPlus, ExternalLink, Factory, FileSearch, FileText, PencilLine } from 'lucide-react';
import { formOptions } from '../../domain/modelBehavior.js';
import { elementosAprobacion, modeloElemento } from '../../remolques/flujo/pedido.ts';
import type { ElementoGuardado, PedidoRemolques } from '../../remolques/flujo/tipos.ts';
import { normalizeOf, reviewerName } from '../../reviewRules.js';
import type { AskForConfirmation, Notify } from '../components/NotificationCenter';
import { controlLabel } from '../components/controlLabels';
import { useCoordinaStatus } from '../hooks/useCoordinaStatus';
import type { CoordinaStatus } from '../types';
import { estadoGenerarRemolques, ficherosPrevistos } from './generarPedido';
import { formatearNumeroEs } from './numeroEs';
import { VistaPreviaPdf } from './VistaPreviaPdf';

// Un pedido de remolques abierto desde Pedidos (fase 5), con las acciones del de toldos: ver la
// hoja, «Corregir», «Generar archivos» (solo el autor, con todo aprobado en CoordinaOT) y, ya
// generado, abrir su PDF y «Reutilizar datos».

function fechaHora(valor: string) {
  const fecha = new Date(valor);
  return Number.isNaN(fecha.getTime()) ? valor : new Intl.DateTimeFormat('es-ES', { dateStyle: 'short', timeStyle: 'short' }).format(fecha);
}

const nombreElemento = (elemento: ElementoGuardado) => (elemento.tipo === 'lona' ? `Remolque · ${modeloElemento(elemento)}` : 'Baquetón');

function FilaElemento({ elemento, letra, coordina }: { elemento: ElementoGuardado; letra: string; coordina: CoordinaStatus | null }) {
  const of = normalizeOf(elemento.input.cabecera.ordenFabricacion ?? '');
  const enCoordina = coordina?.disponible && of ? coordina.ofs?.[of] : undefined;
  const aprobadoPor = enCoordina?.estado === 'aprobada' && enCoordina.revisor
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

export function FichaPedidoRemolques({ pedido, cargando, coordina, currentUser, generando, onBack, onCorregir, onReutilizar, onGenerar, notify }: {
  pedido: PedidoRemolques | null;
  cargando: boolean;
  coordina: CoordinaStatus | null;
  currentUser: string;
  generando: boolean;
  onBack: () => void;
  onCorregir: () => void;
  onReutilizar: () => void;
  onGenerar: () => void;
  notify: Notify;
}) {
  const volver = <button type="button" className="ghost-button boton-3d reviews-back-button" onClick={onBack}>← Pedidos</button>;
  if (cargando) {
    return <section className="review-reader">{volver}<div className="review-empty"><FileSearch aria-hidden="true" />Cargando el pedido…</div></section>;
  }
  if (!pedido) {
    return <section className="review-reader">{volver}<div className="review-empty"><FileSearch aria-hidden="true" />No se pudo abrir el pedido.</div></section>;
  }
  const generado = pedido.status === 'PRODUCED';
  const { allowed, note } = estadoGenerarRemolques(pedido, currentUser, coordina);
  const ruta = `/api/remolques/pedidos/${encodeURIComponent(pedido.orderCode)}`;
  const letras = elementosAprobacion(pedido).map((item) => item.letter);
  const datos = [
    pedido.summary.customer || 'Sin cliente',
    pedido.summary.orderDate && `pedido del ${pedido.summary.orderDate.split('-').reverse().join('/')}`,
    pedido.summary.technician && `autor ${controlLabel(pedido.summary.technician)}`,
    pedido.updatedAt && `guardado ${fechaHora(pedido.updatedAt)}`,
  ].filter(Boolean).join(' · ');

  return (
    <section className="review-reader rem-pedido-guardado" aria-label={`Pedido de remolques ${pedido.orderCode}`}>
      <header className="review-reader-header">
        {volver}
        <div className="review-reader-title">
          <h2>{pedido.orderCode}<span className="orders-kind-tag familia-tag is-remolques">Remolque</span></h2>
          <small>{datos}</small>
        </div>
        <div className="review-reader-actions">
          <VistaPreviaPdf origen={`${ruta}/vista-previa`} bloqueo={generando ? 'Generando los archivos…' : null} notify={notify} />
          {!generado && (
            <>
              <button className="ghost-button boton-3d" type="button" disabled={generando} onClick={onCorregir}>
                <PencilLine aria-hidden="true" />Corregir
              </button>
              <button className="primary-button boton-3d review-generate-button" type="button" disabled={generando || !allowed} title={note || undefined} onClick={onGenerar}>
                <Factory aria-hidden="true" />{generando ? 'Generando…' : 'Generar archivos'}
              </button>
              {note && <span className="review-generate-note">{note}</span>}
            </>
          )}
        </div>
      </header>

      {generado && pedido.production && (
        <div className="review-production-block bloque-3d" role="status">
          <div className="review-production-summary">
            <Factory aria-hidden="true" />
            <span>
              <strong>{`Archivos generados${pedido.production.createdBy ? ` por ${controlLabel(pedido.production.createdBy)}, autor del pedido` : ''}`}</strong>
              <small>{`${fechaHora(pedido.production.createdAt)}${pedido.reviewedBy ? ` · revisado por ${controlLabel(pedido.reviewedBy)}` : ''}`}</small>
            </span>
            <button className="ghost-button boton-3d review-reuse-button" type="button" onClick={onReutilizar}>
              <CopyPlus aria-hidden="true" />Reutilizar datos
            </button>
          </div>
          <div className="review-generated-files">
            <a className="review-generated-file chip-3d is-pdf" href={`${ruta}/archivo`} target="_blank" rel="noreferrer"
              title={pedido.production.files.map((fichero) => fichero.savedPath).join('\n')}>
              <span className="review-generated-file-icon"><FileText aria-hidden="true" /></span>
              <span><strong>{pedido.production.files[0]?.filename ?? 'Hoja de taller'}</strong><small>Hoja de taller PDF · planteamientos y oficina técnica</small></span>
              <ExternalLink aria-hidden="true" />
            </a>
          </div>
        </div>
      )}

      <ul className="rem-pedido-elementos" aria-label="Elementos del pedido">
        {pedido.elementos.map((elemento, indice) => (
          <FilaElemento key={elemento.version} elemento={elemento} letra={letras[indice]} coordina={coordina} />
        ))}
      </ul>
    </section>
  );
}

export function PedidoRemolquesDetalle({ orderCode, refreshKey, currentUser, onBack, onCorregir, onReutilizar, onChanged, onToast, onConfirm }: {
  orderCode: string;
  refreshKey: number;
  currentUser: string;
  onBack: () => void;
  onCorregir: (pedido: PedidoRemolques) => void;
  onReutilizar: (pedido: PedidoRemolques) => void;
  onChanged: () => void;
  onToast: Notify;
  onConfirm: AskForConfirmation;
}) {
  const [detalle, setDetalle] = useState<{ orderCode: string; pedido: PedidoRemolques | null } | null>(null);
  const [generando, setGenerando] = useState(false);
  const cargando = detalle?.orderCode !== orderCode;
  const pedido = detalle && detalle.orderCode === orderCode ? detalle.pedido : null;
  // Las OF del pedido abierto en CoordinaOT; un pedido generado no necesita preguntar.
  const ofs = pedido ? elementosAprobacion(pedido).map((item) => item.of) : [];
  const { status: coordina } = useCoordinaStatus(ofs, Boolean(pedido) && pedido?.status !== 'PRODUCED');

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
    try {
      for (;;) {
        const respuesta = await fetch(`/api/remolques/pedidos/${encodeURIComponent(codigo)}/generar`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ confirmOverwrite }),
        });
        const datos = await respuesta.json().catch(() => ({})) as { error?: string; needsConfirmation?: boolean; existing?: string[]; unchanged?: boolean; nombre?: string };
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
      notify={onToast}
    />
  );
}
