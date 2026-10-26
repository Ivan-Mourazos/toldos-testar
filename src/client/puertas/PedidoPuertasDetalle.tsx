import React, { useEffect, useState } from 'react';
import { CopyPlus, DoorOpen, Factory, FileDown, FileSearch, PencilLine, Scissors } from 'lucide-react';
import { formOptions } from '../../domain/modelBehavior.js';
import { calcularPuerta, MODELOS_PUERTAS } from '../../puertas/calcular.ts';
import { elementosAprobacion } from '../../puertas/flujo/pedido.ts';
import type { PedidoPuertasGuardado } from '../../puertas/flujo/tipos.ts';
import { productoDeElementos } from '../../puertas/producto.ts';
import type { VistaPuertas } from '../../puertas/tipos.ts';
import { normalizeOf, reviewerName } from '../../reviewRules.js';
import { CabeceraDocumento, DocumentosPedido } from '../components/DocumentosPedido';
import { BotonAbrirCorteRevisado } from '../flujoCorteDwg';
import { EnviosCorte } from '../components/EnviosCorte';
import type { AskForConfirmation, Notify } from '../components/NotificationCenter';
import { controlLabel } from '../components/controlLabels';
import { puedeCorregir } from '../generatePermission';
import { useCoordinaStatus } from '../hooks/useCoordinaStatus';
import type { CoordinaStatus } from '../types';
import { AlzadoPuerta } from './AlzadoPuerta';
import { estadoGenerarPuertas } from './generarPuertas';
import { DibujoCortePuertas } from './VistaCortePuertas';
import '../coordina/corte-lona.css';
import './puertas.css';

// Un pedido de puertas abierto desde Pedidos (fase 2, 22/10/2026), con las acciones de toldos y remolques:
// «Corregir» (el autor, si se lo devolvieron), «Generar archivos» (el autor, con todo aprobado en CoordinaOT)
// y, debajo, los dos bloques: el planteamiento (el alzado de cada puerta, lo mismo que va al plano DWG) y el
// corte con sus botones.

const num = (x: number) => x.toLocaleString('es-ES', { maximumFractionDigits: 2 });

function fechaHora(valor: string) {
  const fecha = new Date(valor);
  return Number.isNaN(fecha.getTime()) ? valor : new Intl.DateTimeFormat('es-ES', { dateStyle: 'short', timeStyle: 'short' }).format(fecha);
}

/** Escribe el plano para revisar; si ya está en su carpeta, pregunta antes de sustituirlo. */
async function guardarPlano(ruta: string, preguntar: AskForConfirmation, notify: Notify) {
  let confirmOverwrite = false;
  for (;;) {
    const respuesta = await fetch(`${ruta}/plano`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ confirmOverwrite }) });
    const datos = await respuesta.json().catch(() => ({})) as { error?: string; existing?: string[]; plano?: { files: Array<{ filename: string }>; avisos: string[] } | null };
    if (respuesta.status === 409 && datos.existing?.length && !confirmOverwrite) {
      const eleccion = await preguntar({ title: 'Plano del pedido', message: `El plano ${datos.existing.join(' · ')} ya está en su carpeta. ¿Sustituirlo por el de la web?`,
        confirmLabel: 'Sustituir plano', cancelLabel: 'Conservar el actual', tone: 'warning' });
      if (eleccion !== 'confirm') return;
      confirmOverwrite = true;
      continue;
    }
    if (!respuesta.ok) throw new Error(datos.error || 'No se pudo guardar el plano.');
    const planos = datos.plano?.files.map((fichero) => fichero.filename) ?? [];
    const avisos = datos.plano?.avisos ?? [];
    notify(planos.length ? `Plano guardado para revisar: ${planos.join(' · ')}.${avisos.length ? ` ${avisos.join(' ')}` : ''}` : avisos.join(' ') || 'No se ha escrito el plano.',
      { tone: planos.length ? 'success' : 'warning', title: 'Plano del pedido' });
    return;
  }
}

function PlanteamientoPuertas({ pedido, ruta, generado, notify, onConfirm }: {
  pedido: PedidoPuertasGuardado; ruta: string; generado: boolean; notify: Notify; onConfirm: AskForConfirmation;
}) {
  const [guardando, setGuardando] = useState(false);
  async function guardar() {
    setGuardando(true);
    try { await guardarPlano(ruta, onConfirm, notify); }
    catch (error) { notify(error instanceof Error ? error.message : 'No se pudo guardar el plano.', { tone: 'error' }); }
    finally { setGuardando(false); }
  }
  return (
    <section className="corte-lona panel bloque-3d puerta-planteamiento" aria-label="Planteamiento">
      <CabeceraDocumento titulo="Planteamiento" icono={<DoorOpen aria-hidden="true" />}>
        {!generado && (
          <button className="ghost-button boton-3d" type="button" disabled={guardando} onClick={() => void guardar()}>
            <FileDown aria-hidden="true" />{guardando ? 'Guardando plano…' : 'Guardar plano para revisar'}
          </button>
        )}
      </CabeceraDocumento>
      <p className="corte-ayuda">Lo mismo que va al plano DWG: el alzado de cada elemento con sus cotas y textos. El plano sale al guardar para revisión.</p>
      <div className="puerta-planteamiento-alzados">
        {pedido.elementos.map(({ id, input }) => <AlzadoPuerta key={id} puerta={input} resultado={calcularPuerta(input)} />)}
      </div>
    </section>
  );
}

function CortePuertasGuardado({ ruta, version, acciones, systemDock = false }: { ruta: string; version: string; acciones?: React.ReactNode; systemDock?: boolean }) {
  const clave = `${ruta}|${version}`;
  const [leido, setLeido] = useState<{ clave: string; datos?: VistaPuertas; error?: string } | null>(null);
  useEffect(() => {
    let cancelado = false;
    fetch(`${ruta}/corte`, { cache: 'no-store' })
      .then(async (respuesta) => {
        const datos = await respuesta.json().catch(() => ({}));
        if (!respuesta.ok) throw new Error(datos.error || 'No se pudo calcular el corte.');
        return datos as VistaPuertas;
      })
      .then((datos) => { if (!cancelado) setLeido({ clave, datos }); })
      .catch((error) => { if (!cancelado) setLeido({ clave, error: error instanceof Error ? error.message : 'No se pudo calcular el corte.' }); });
    return () => { cancelado = true; };
  }, [ruta, clave]);
  const estado = leido?.clave === clave ? leido : null;
  const datos = estado?.datos;
  return (
    <section className="corte-lona panel bloque-3d" aria-label="Corte" aria-busy={!estado}>
      <CabeceraDocumento titulo="Corte" icono={<Scissors aria-hidden="true" />}>{Boolean(datos?.cortes.length) && acciones}</CabeceraDocumento>
      <p className="corte-ayuda">{systemDock?'Un solo DXF por pedido con las tandas de lonas perimetrales.':'Un solo DXF por pedido; si hay saco entero y saco en dos, van las dos opciones y el técnico de la máquina elige.'}</p>
      {!estado && <p className="corte-ayuda">Calculando el corte…</p>}
      {estado?.error && <p role="alert" className="corte-aviso">{estado.error}</p>}
      {datos?.avisos.some((aviso) => aviso.nivel === 'error') && <p role="alert" className="corte-aviso">Hay medidas pendientes de corregir: el corte está incompleto.</p>}
      {datos?.cortes.map((c, i) => (
        <article className="corte-material" key={i}>
          <header><h3>{c.material}</h3><span>{`Rollo de ${num(c.anchoRollo / 10)} cm · ${num(c.largo / 1000)} m`}</span></header>
          {c.opcion !== 'principal' && <p className="corte-aviso">{c.opcion === 'saco-entero' ? 'Opción saco entero' : 'Opción saco en dos piezas'} · Alternativas de un mismo saco: elige una.</p>}
          <DibujoCortePuertas corte={c} />
          <small className="corte-leyenda"><span>DISCO1 · corte</span>{!systemDock&&<><span className="puerta-cutter-texto">CUTTER · huecos y curvas</span><span>ROTULADOR · marcas</span></>}</small>
        </article>
      ))}
    </section>
  );
}

function FilaPuerta({ letra, puerta, coordina }: { letra: string; puerta: PedidoPuertasGuardado['elementos'][number]['input']; coordina: CoordinaStatus | null }) {
  const of = normalizeOf(puerta.of ?? '');
  const enCoordina = coordina?.disponible && of ? coordina.ofs?.[of] : undefined;
  const aprobadoPor = enCoordina?.estado === 'aprobada' && enCoordina.revisor ? reviewerName(enCoordina.revisor, formOptions.tecnicos as string[]) : '';
  return (
    <li className="rem-pedido-elemento bloque-3d">
      <strong className="rem-pedido-letra">{letra}</strong>
      <span>{`${puerta.modelo==='SYSTEMDOCK'?'Lona System Dock':`Puerta ${MODELOS_PUERTAS[puerta.modelo].toLowerCase()}`}${puerta.cantidad > 1 ? ` · ${puerta.cantidad} iguales` : ''}`}</span>
      <span>{`${num(puerta.frente)} × ${num(puerta.alto)} cm`}</span>
      <span>{`OF ${of || '—'}`}</span>
      <span className="rem-pedido-material" title={puerta.material}>{[puerta.material, puerta.color].filter(Boolean).join(' · ') || 'Sin material'}</span>
      {aprobadoPor && <span className="orders-detail-approved">{`Aprobado por ${controlLabel(aprobadoPor)}`}</span>}
      {enCoordina?.estado === 'devuelta' && <span className="orders-detail-returned"><strong>Devuelta en CoordinaOT:</strong> {enCoordina.nota || 'sin nota'}</span>}
    </li>
  );
}

export function PedidoPuertasDetalle({ orderCode, refreshKey, currentUser, onBack, onCorregir, onReutilizar, onChanged, onToast, onConfirm }: {
  orderCode: string;
  refreshKey: number;
  currentUser: string;
  onBack: () => void;
  onCorregir: (pedido: PedidoPuertasGuardado) => void;
  onReutilizar: (pedido: PedidoPuertasGuardado) => void;
  onChanged: () => void;
  onToast: Notify;
  onConfirm: AskForConfirmation;
}) {
  const [detalle, setDetalle] = useState<{ orderCode: string; pedido: PedidoPuertasGuardado | null } | null>(null);
  const [generando, setGenerando] = useState(false);
  const cargando = detalle?.orderCode !== orderCode;
  const pedido = detalle && detalle.orderCode === orderCode ? detalle.pedido : null;
  const ofs = pedido ? elementosAprobacion(pedido).map((item) => item.of) : [];
  const { status: coordina } = useCoordinaStatus(ofs, Boolean(pedido));
  const ruta = `/api/puertas/pedidos/${encodeURIComponent(orderCode)}`;

  useEffect(() => {
    let cancelado = false;
    fetch(ruta, { cache: 'no-store' })
      .then(async (respuesta) => {
        const datos = await respuesta.json();
        if (!respuesta.ok) throw new Error(datos.error || 'No se pudo abrir el pedido.');
        return datos as PedidoPuertasGuardado;
      })
      .then((leido) => { if (!cancelado) setDetalle({ orderCode, pedido: leido }); })
      .catch((error) => {
        if (cancelado) return;
        setDetalle({ orderCode, pedido: null });
        onToast(error instanceof Error ? error.message : 'No se pudo abrir el pedido.', { tone: 'error' });
      });
    return () => { cancelado = true; };
  }, [ruta, orderCode, refreshKey, onToast]);

  async function generar() {
    if (!pedido || !estadoGenerarPuertas(pedido, currentUser, coordina).allowed) return;
    const inicial = await onConfirm({
      title: `Generar archivos de ${pedido.orderCode}`,
      message: 'CoordinaOT ya lo ha aprobado. Se guardará el plano definitivo, con quién lo revisó en el cajetín, en la carpeta de planos.',
      confirmLabel: 'Sí, generar archivos', cancelLabel: 'Ahora no', tone: 'warning',
    });
    if (inicial !== 'confirm') return;
    setGenerando(true);
    let confirmOverwrite = false;
    try {
      for (;;) {
        const respuesta = await fetch(`${ruta}/generar`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ confirmOverwrite }) });
        const datos = await respuesta.json().catch(() => ({})) as { error?: string; needsConfirmation?: boolean; existing?: string[]; unchanged?: boolean; saved?: Array<{ filename: string }>; avisos?: string[] };
        if (respuesta.status === 409 && datos.needsConfirmation && !confirmOverwrite) {
          const eleccion = await onConfirm({
            title: 'Sustituir el plano de revisión',
            message: 'El plano de revisión de este pedido ya está en su carpeta. Se sustituye por el definitivo, con el revisor en el cajetín. Si lo has retocado a mano, se perderán los cambios.',
            details: datos.existing, confirmLabel: 'Sustituir plano', cancelLabel: 'Conservar el plano', tone: 'danger',
          });
          if (eleccion !== 'confirm') return;
          confirmOverwrite = true;
          continue;
        }
        if (!respuesta.ok) throw new Error(datos.error || 'No se pudieron generar los archivos.');
        onChanged();
        onBack();
        if (datos.unchanged) {
          onToast('Este pedido ya estaba generado.', { tone: 'info', title: 'Sin cambios' });
          return;
        }
        onToast(`Guardado el plano ${datos.saved?.map((f) => f.filename).join(' · ') ?? ''}.${datos.avisos?.length ? ` ${datos.avisos.join(' ')}` : ''}`, { tone: 'success', title: 'Archivos generados' });
        return;
      }
    } catch (error) {
      onToast(error instanceof Error ? error.message : 'No se pudieron generar los archivos.', { tone: 'error' });
    } finally {
      setGenerando(false);
    }
  }

  const volver = <button type="button" className="ghost-button boton-3d reviews-back-button" onClick={onBack}>← Pedidos</button>;
  if (cargando) return <section className="review-reader">{volver}<div className="review-empty"><FileSearch aria-hidden="true" />Cargando el pedido…</div></section>;
  if (!pedido) return <section className="review-reader">{volver}<div className="review-empty"><FileSearch aria-hidden="true" />No se pudo abrir el pedido.</div></section>;

  const generado = pedido.status === 'PRODUCED';
  const { allowed, note } = estadoGenerarPuertas(pedido, currentUser, coordina);
  const corregible = puedeCorregir(pedido.status, elementosAprobacion(pedido), pedido.summary.technician || '', currentUser, coordina);
  const permisoCorte = estadoGenerarPuertas({ ...pedido, status: generado ? 'PENDING_REVIEW' : pedido.status }, currentUser, coordina);
  const letras = elementosAprobacion(pedido).map((item) => item.letter);
  const datos = [
    pedido.summary.customer || 'Sin cliente',
    pedido.summary.orderDate && `pedido del ${pedido.summary.orderDate.split('-').reverse().join('/')}`,
    pedido.summary.technician && `autor ${controlLabel(pedido.summary.technician)}`,
    pedido.updatedAt && `guardado ${fechaHora(pedido.updatedAt)}`,
  ].filter(Boolean).join(' · ');

  return (
    <section className="review-reader rem-pedido-guardado" aria-label={`Pedido de ${productoDeElementos(pedido.elementos)==='systemdock'?'System Dock':'puertas'} ${pedido.orderCode}`}>
      <header className="review-reader-header">
        {volver}
        <div className="review-reader-title">
          <h2>{pedido.orderCode}<span className="orders-kind-tag familia-tag is-puertas">{productoDeElementos(pedido.elementos)==='systemdock'?'System Dock':'Puerta'}</span></h2>
          <small>{datos}</small>
        </div>
        <div className="review-reader-actions">
          {pedido.corteConfirmado && <BotonAbrirCorteRevisado ruta={`${ruta}/corte-dwg`} notify={onToast} />}
          {!generado && (
            <>
              {corregible && <button className="ghost-button boton-3d" type="button" disabled={generando} onClick={() => onCorregir(pedido)}><PencilLine aria-hidden="true" />Corregir</button>}
              {/* Con el corte del DWG confirmado, «Mandar corte al bot» deja el pedido generado (Iván, 26/10/2026). */}
              {pedido.corteConfirmado
                ? <span className="review-generate-note">Se cierra con «Mandar corte al bot», en Corte.</span>
                : <>
                  <button className="primary-button boton-3d review-generate-button" type="button" disabled={generando || !allowed} title={note || undefined} onClick={() => void generar()}>
                    <Factory aria-hidden="true" />{generando ? 'Generando…' : 'Generar archivos'}
                  </button>
                  {note && <span className="review-generate-note">{note}</span>}
                </>}
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
            <button className="ghost-button boton-3d review-reuse-button" type="button" onClick={() => onReutilizar(pedido)}><CopyPlus aria-hidden="true" />Reutilizar datos</button>
          </div>
          <div className="review-generated-files">
            {pedido.production.files.map((fichero) => (
              <span className="review-generated-file chip-3d" key={fichero.savedPath} title={fichero.savedPath}>
                <span className="review-generated-file-icon"><DoorOpen aria-hidden="true" /></span>
                <span><strong>{fichero.filename}</strong><small>Plano · oficina técnica</small></span>
              </span>
            ))}
          </div>
        </div>
      )}

      <ul className="rem-pedido-elementos" aria-label={productoDeElementos(pedido.elementos)==='systemdock'?'Lonas del pedido':'Puertas del pedido'}>
        {pedido.elementos.map((elemento, indice) => <FilaPuerta key={elemento.id} letra={letras[indice]} puerta={elemento.input} coordina={coordina} />)}
      </ul>

      <DocumentosPedido
        planteamiento={<PlanteamientoPuertas pedido={pedido} ruta={ruta} generado={generado} notify={onToast} onConfirm={onConfirm} />}
        corte={<CortePuertasGuardado ruta={ruta} version={pedido.updatedAt} systemDock={productoDeElementos(pedido.elementos)==='systemdock'}
          acciones={<EnviosCorte key={ruta} ruta={`${ruta}/corte`} usuario={currentUser} permitido={permisoCorte.allowed} motivo={permisoCorte.note}
            ocupado={generando} envios={pedido.enviosCorte} descarga={`${ruta}/corte/dxf`} conPdf notify={onToast} preguntar={onConfirm} />} />} />
    </section>
  );
}
