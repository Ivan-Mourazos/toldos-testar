import { AccionesCorteMaquina } from '../components/CorteMaquina';
import { ProduccionPedido } from '../components/ProduccionPedido';
import { guardarToldosEditable } from '../toldosEditable';
import type { DestinoEntrega } from '../../entregasTipos';
import { pedidoEntrega } from '../../entregas.js';
import React, { useEffect, useState } from 'react';
import { CopyPlus, DoorOpen, Factory, FileSearch, FileText, Scissors } from 'lucide-react';
import { formOptions } from '../../domain/modelBehavior.js';
import { calcularPuerta, MODELOS_PUERTAS } from '../../puertas/calcular.ts';
import { elementosAprobacion } from '../../puertas/flujo/pedido.ts';
import type { PedidoPuertasGuardado } from '../../puertas/flujo/tipos.ts';
import { productoDeElementos } from '../../puertas/producto.ts';
import { puertaParaAlzadoTgm } from '../../puertas/tgm.ts';
import type { VistaPuertas } from '../../puertas/tipos.ts';
import { normalizeOf, isPendingGeneration, reviewerName, TERMINADO_SIN_GENERAR } from '../../reviewRules.js';
import { CabeceraDocumento, DocumentosPedido } from '../components/DocumentosPedido';
import { AccionesPedido, CabeceraPedidoGuardado } from '../components/AccionesPedido';
import { MenuMas } from '../components/MenuMas';
import { useCortePedidoEditable } from '../useCortePedidoEditable';
import { faltaParaAbrir } from './flujoCorte';
import { abrirCorteGuardado, preguntarCambioCorte, decidirCortePendiente, type CortePendiente } from '../toldosEditable';
import { aprobadaOPasada } from '../../toldosEditable.js';
import { HistorialEnvios } from '../components/EnviosCorte';
import type { AskForConfirmation, Notify } from '../components/NotificationCenter';
import { controlLabel } from '../components/controlLabels';
import { puedeEditarToldos } from '../generatePermission';
import { medidaPuerta } from './medidasPuertas';
import { useCoordinaStatus } from '../hooks/useCoordinaStatus';
import { useContenidoFluido } from '../hooks/useContenidoFluido';
import type { CoordinaStatus } from '../types';
import { AlzadoPuerta } from './AlzadoPuerta';
import { CadPaginasPuertas } from './CadPaginasPuertas';
import { ConfirmarGestionRegistro, type GestionRegistro } from '../components/ConfirmarGestionRegistro';
import { mensajeGestionRegistro, solicitarGestionRegistro } from '../gestionRegistro';
import { estadoGenerarPuertas } from './generarPuertas';
import { DibujoCortePuertas, largoReferenciaCortes, textoCabeceraCorte } from './VistaCortePuertas';
import '../coordina/corte-lona.css';
import './puertas.css';

// Un pedido de puertas abierto desde Pedidos (fase 2, 22/10/2026), con las acciones de toldos y remolques:
// «Corregir» (cualquier técnico) y «Generar archivos» (con todo aprobado o pasado en CoordinaOT)
// y, debajo, los dos bloques: el planteamiento (el alzado de cada puerta, lo mismo que va al plano DWG) y el
// corte con sus botones.


function fechaHora(valor: string) {
  const fecha = new Date(valor);
  return Number.isNaN(fecha.getTime()) ? valor : new Intl.DateTimeFormat('es-ES', { dateStyle: 'short', timeStyle: 'short' }).format(fecha);
}

function PlanteamientoPuertas({ pedido }: { pedido: PedidoPuertasGuardado }) {
  const [indice, setIndice] = useState(0);
  const elegido = pedido.elementos[Math.min(indice, pedido.elementos.length - 1)];
  const letras = elementosAprobacion(pedido).map((item) => item.letter);
  const alzadoFluido = useContenidoFluido(String(indice));
  return (
    <section className="corte-lona panel bloque-3d puerta-planteamiento" aria-label="Planteamiento">
      <CabeceraDocumento titulo="Planteamiento" icono={<DoorOpen aria-hidden="true" />} />
      <p className="corte-ayuda">Lo mismo que va al plano DWG: el alzado de cada elemento con sus cotas y textos. El plano sale al guardar para revisión.</p>
      {/* Una puerta o lona cada vez, con pestañas (Iván, 26/10/2026: «no quiero que salgan todas las puertas una debajo
          de otra»), y el dibujo del tamaño de la pieza, sin hueco. */}
      {pedido.elementos.length > 1 && <div className="tira-3d puerta-planteamiento-pestanas" role="tablist" aria-label="Elemento del planteamiento">
        {pedido.elementos.map(({ id, input }, i) => <button type="button" role="tab" key={id} aria-selected={i === indice}
          className={`pestana ${i === indice ? 'pestana-activa' : ''}`} onClick={() => setIndice(i)}>{`${letras[i] ?? i + 1} · ${input.of || 'SIN OF'}`}</button>)}
      </div>}
      <div className="puerta-planteamiento-alzados" ref={alzadoFluido}>
        {elegido && <AlzadoPuerta key={elegido.id} puerta={puertaParaAlzadoTgm(elegido.input)} resultado={calcularPuerta(elegido.input)} letra={letras[indice]} />}
      </div>
    </section>
  );
}

function CortePuertasGuardado({ ruta, version, historial, acciones, confirmado, systemDock = false }: { ruta: string; version: string; historial?: React.ReactNode; acciones?: React.ReactNode; confirmado?: boolean; systemDock?: boolean }) {
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
  const largoReferencia = datos ? largoReferenciaCortes(datos.cortes) : 0;
  return (
    <section className="corte-lona panel bloque-3d" aria-label="Corte" aria-busy={!estado}>
      <CabeceraDocumento titulo="Corte" icono={<Scissors aria-hidden="true" />} />{(confirmado || Boolean(datos?.cortes.length)) && acciones}{historial}
      <p className="corte-ayuda">{systemDock?'Un solo DXF por pedido con las tandas de lonas perimetrales.':'Un solo DXF por pedido; si hay saco entero y saco en dos, van las dos opciones y el técnico de la máquina elige.'}</p>
      {!estado && <p className="corte-ayuda">Calculando el corte…</p>}
      {estado?.error && <p role="alert" className="corte-aviso">{estado.error}</p>}
      {datos?.avisos.some((aviso) => aviso.nivel === 'error') && <p role="alert" className="corte-aviso">Hay medidas pendientes de corregir: el corte está incompleto.</p>}
      {datos?.cortes.map((c, i) => (
        <article className="corte-material" key={i}>
          <header><h3>{c.material}</h3><span>{textoCabeceraCorte(c)}</span></header>
          {c.opcion !== 'principal' && <p className="corte-aviso">{c.opcion === 'saco-entero' ? 'Opción saco entero' : 'Opción saco en dos piezas'} · Alternativas de un mismo saco: elige una.</p>}
          <DibujoCortePuertas corte={c} ajustado largoReferencia={largoReferencia} />
          <small className="corte-leyenda"><span>DISCO1 · corte</span>{!systemDock&&<><span className="puerta-cutter-texto">CUTTER · huecos y curvas</span><span>ROTULADOR · marcas</span></>}</small>
        </article>
      ))}
    </section>
  );
}

function FilaPuerta({ letra, puerta, coordina }: { letra: string; puerta: PedidoPuertasGuardado['elementos'][number]['input']; coordina: CoordinaStatus | null }) {
  const of = normalizeOf(puerta.of ?? '');
  const enCoordina = coordina?.disponible && of ? coordina.ofs?.[of] : undefined;
  const aprobadoPor = aprobadaOPasada(enCoordina?.estado) && enCoordina?.revisor ? reviewerName(enCoordina.revisor, formOptions.tecnicos as string[]) : '';
  return (
    <li className="rem-pedido-elemento bloque-3d">
      <strong className="rem-pedido-letra">{letra}</strong>
      <span>{`${puerta.abrigo?`Abrigo · ${puerta.abrigo.parte}`:puerta.modelo==='SYSTEMDOCK'?'Lona System Dock':puerta.modelo==='SACOARENA'?'Saco confeccionado':`Puerta ${MODELOS_PUERTAS[puerta.modelo].toLowerCase()}`}${puerta.cantidad > 1 ? ` · ${puerta.cantidad} iguales` : ''}`}</span>
      <span>{puerta.modelo==='SACOARENA'?`${medidaPuerta(puerta.frente)} × ${medidaPuerta(puerta.alto)} mm aplastado`:`${medidaPuerta(puerta.frente)}${puerta.abrigo?.parte==='laterales'?` / ${medidaPuerta(puerta.abrigo.corto)}`:''} × ${medidaPuerta(puerta.alto)} mm`}</span>
      <span>{`OF ${of || '—'}`}</span>
      <span className="rem-pedido-material" title={puerta.material}>{[puerta.material, puerta.color].filter(Boolean).join(' · ') || 'Sin material'}</span>
      {aprobadoPor && <span className="orders-detail-approved">{`Aprobado por ${controlLabel(aprobadoPor)}`}</span>}
      {enCoordina?.estado === 'devuelta' && <span className="orders-detail-returned"><strong>Devuelta en CoordinaOT:</strong> {enCoordina.nota || 'sin nota'}</span>}
    </li>
  );
}

export function PedidoPuertasDetalle({ orderCode, refreshKey, currentUser, onBack, onCorregir, onReutilizar, onChanged, onToast, onConfirm, pedidoInicial }: {
  pedidoInicial?: PedidoPuertasGuardado;
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
  const [detalle, setDetalle] = useState<{ orderCode: string; pedido: PedidoPuertasGuardado | null } | null>(()=>pedidoInicial?.orderCode===orderCode?{orderCode,pedido:pedidoInicial}:null);
  const [generando, setGenerando] = useState(false);
  const [gestion, setGestion] = useState<GestionRegistro | null>(null);
  const [gestionando, setGestionando] = useState(false);
  const cargando = detalle?.orderCode !== orderCode;
  const pedido = detalle && detalle.orderCode === orderCode ? detalle.pedido : null;
  const terminado = pedido?.status === TERMINADO_SIN_GENERAR;
  const ofs = pedido ? elementosAprobacion(pedido).map((item) => item.of) : [];
  const { status: coordina } = useCoordinaStatus(ofs, Boolean(pedido && !terminado));
  const ruta = `/api/puertas/pedidos/${encodeURIComponent(orderCode)}`;
  const corte = useCortePedidoEditable({ tipo: 'puertas', pedido, cuerpo: { pedido }, falta: pedido ? faltaParaAbrir(pedido) : 'Cargando el pedido…',
    usuario: currentUser, notify: onToast, preguntar: onConfirm, onChanged });

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

  async function generar(destinoEntrega?: DestinoEntrega) {
    if (!pedido || !estadoGenerarPuertas(pedido, currentUser, coordina).allowed) return;
    const inicial = destinoEntrega ? 'confirm' : await onConfirm({
      title: `Generar archivos de ${pedido.orderCode}`,
      message: 'CoordinaOT ya lo ha aprobado. Se guardará el plano definitivo, con quién lo revisó en el cajetín, en la carpeta de planos.',
      confirmLabel: 'Sí, generar archivos', cancelLabel: 'Ahora no', tone: 'warning',
    });
    if (inicial !== 'confirm') return;
    setGenerando(true);
    let confirmOverwrite = destinoEntrega?.modo === 'sustituir';
    let aceptarHuellaCorte: string | undefined;
    let aceptarCorteNoRegenerado: string | undefined;
    try {
      for (;;) {
        const respuesta = await fetch(`${ruta}/generar`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ destinoEntrega, confirmarEntrega: Boolean(destinoEntrega), confirmOverwrite, aceptarHuellaCorte, aceptarCorteNoRegenerado, savedBy: currentUser }) });
        const datos = await respuesta.json().catch(() => ({})) as CortePendiente & { needsPrepararEntrega?: boolean; error?: string; cambioCorte?: boolean; huella?: string; needsConfirmation?: boolean; existing?: string[]; unchanged?: boolean; saved?: Array<{ filename: string }>; avisos?: string[] };
        if (respuesta.status === 409 && datos.needsPrepararEntrega) {
          const preparado = await guardarToldosEditable({ ...{ pedido }, destinoEntrega, confirmarEntrega: true, confirmarEntradaEntrega: true, savedBy: currentUser, confirmOverwrite: true, confirmPlanoOverwrite: true, decisionCorte: 'regenerar' }, onConfirm, async () => {}, '/api/puertas/pedidos');
          if (!preparado) return;
          continue;
        }
        if (respuesta.status === 409 && datos.corteNoRegenerado) {
          const permiso = await decidirCortePendiente(datos, onConfirm, { ruta: '/api/puertas/pedidos', cuerpo: { pedido }, usuario: currentUser }, onChanged);
          if (permiso === null) return;
          aceptarCorteNoRegenerado = permiso || undefined;
          continue;
        }
        if (respuesta.status === 409 && datos.cambioCorte) {
          if (!await preguntarCambioCorte(onConfirm, () => abrirCorteGuardado(`${ruta}/corte-dwg`))) return;
          aceptarHuellaCorte = datos.huella;
          continue;
        }
        if (respuesta.status === 409 && datos.needsConfirmation && !confirmOverwrite) {
          const esPdf = datos.existing?.some(nombre => nombre.toLowerCase().endsWith('.pdf'));
          const eleccion = await onConfirm({
            title: esPdf ? 'Sustituir el PDF de la entrega' : 'Sustituir el plano de revisión',
            message: esPdf ? 'Ya existe un PDF de esta entrega. Comprueba si se puede sustituir.' : 'El plano de revisión de este pedido ya está en su carpeta. Se sustituye por el definitivo, con el revisor en el cajetín. Si lo has retocado a mano, se perderán los cambios.',
            details: datos.existing, confirmLabel: esPdf ? 'Sustituir PDF' : 'Sustituir plano', cancelLabel: 'Conservar el actual', tone: 'danger',
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

  async function gestionarRegistro(accion: GestionRegistro, texto: string) {
    if (!pedido || gestionando) return;
    setGestionando(true);
    try {
      const review = await solicitarGestionRegistro<PedidoPuertasGuardado | undefined>(ruta, accion, currentUser, texto);
      if (accion === 'papelera') {
        setDetalle(null);
        onChanged();
        onBack();
      } else {
        setDetalle({ orderCode, pedido: review ?? pedido });
        onChanged();
      }
      onToast(mensajeGestionRegistro[accion], { tone: 'success' });
    } catch (error) {
      onToast(error instanceof Error ? error.message : 'No se pudo actualizar el pedido.', { tone: 'error' });
    } finally {
      setGestionando(false);
    }
  }

  const volver = <button type="button" className="ghost-button boton-3d reviews-back-button" onClick={onBack}>← Pedidos</button>;
  if (cargando) return <section className="review-reader">{volver}<div className="review-empty"><FileSearch aria-hidden="true" />Cargando el pedido…</div></section>;
  if (!pedido) return <section className="review-reader">{volver}<div className="review-empty"><FileSearch aria-hidden="true" />No se pudo abrir el pedido.</div></section>;

  const generado = pedido.status === 'PRODUCED';
  const pendiente = isPendingGeneration(pedido.status);
  const { allowed, note } = estadoGenerarPuertas(pedido, currentUser, coordina);
  const editable = puedeEditarToldos(currentUser);
  const edicion = pedido.ediciones?.at(-1);
  const permisoCorte = estadoGenerarPuertas(Object.assign({}, pedidoEntrega(pedido), { status: 'PENDING_REVIEW' as const, entregas: [] }), currentUser, coordina);
  const letras = elementosAprobacion(pedido).map((item) => item.letter);
  const ocupadoAcciones = generando || corte.ocupado || gestionando;
  const datos = [
    pedido.summary.customer || 'Sin cliente',
    pedido.summary.orderDate && `pedido del ${pedido.summary.orderDate.split('-').reverse().join('/')}`,
    pedido.summary.technician && `autor ${controlLabel(pedido.summary.technician)}`,
    edicion && `Editado por ${controlLabel(edicion.usuario)} el ${new Date(edicion.fecha).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit' })}`,
    pedido.updatedAt && (!edicion || edicion.fecha !== pedido.updatedAt)
      && `guardado ${fechaHora(pedido.updatedAt)}${pedido.updatedBy ? ` por ${controlLabel(pedido.updatedBy)}` : ''}`,
  ].filter(Boolean).join(' · ');

  return (
    <section className="review-reader rem-pedido-guardado" aria-label={`Pedido de ${productoDeElementos(pedido.elementos)==='systemdock'?'System Dock':'puertas'} ${pedido.orderCode}`}>
      <CabeceraPedidoGuardado pedido={pedido} volver={volver} titulo={<>{pedido.orderCode}<span className="orders-kind-tag familia-tag is-puertas">{productoDeElementos(pedido.elementos)==='systemdock'?'Lona System Dock':'Puerta'}</span></>}
        datos={datos} corteNoRegenerado={pedido.corteNoRegenerado} corteSimulado={pedido.corteSimulado}
        acciones={<AccionesPedido generado={generado || terminado} ocupado={ocupadoAcciones} enviando={generando} editandoPermitido={editable} etiquetaEditar="Editar"
          onEditar={() => onCorregir(pedido)} elementos={elementosAprobacion(pedido)} coordina={coordina} preguntar={onConfirm}
          abrir={!terminado ? corte.abrir : null} regenerar={!terminado && !generado && currentUser && corte.abrir ? () => void corte.regenerar() : undefined} codigo={pedido.orderCode} rutaDestinos={`${ruta}/destinos-entrega`} generar={d => void generar(d)}
          generarPermitido={allowed} motivoGenerar={note}
          envios={<>
            {(pendiente || terminado) && <button type="button" className="ghost-button boton-3d"
              disabled={ocupadoAcciones || !currentUser} onClick={() => setGestion(terminado ? 'reabrir' : 'terminar')}>
              {terminado ? 'Volver a pendiente' : 'Marcar como terminado'}
            </button>}
            <MenuMas>
              <button type="button" role="menuitem" className="menu-mas-item" disabled={ocupadoAcciones || !currentUser}
                onClick={() => setGestion('papelera')}>Enviar a la papelera</button>
            </MenuMas>
          </>}
          produccion={!terminado && <ProduccionPedido ruta={ruta} rutaPdf={ruta + '/pdf'} rutaPlano={ruta + '/guardar-plano'} rutaCorte={ruta + '/corte'}
            tecnico={pedido.summary.technician || ''} codigo={pedido.orderCode} generado={generado} permitido={Boolean(currentUser.trim()) && (generado ? permisoCorte.allowed : allowed)} motivo={note}
            ocupado={ocupadoAcciones} usuario={currentUser} notify={onToast} preguntar={onConfirm} onChanged={onChanged} onVolver={onBack}
            guardado={{ ruta: '/api/puertas/pedidos', cuerpo: { pedido }, usuario: currentUser }}
            mas={generado ? <button type="button" role="menuitem" className="menu-mas-item" onClick={() => onReutilizar(pedido)}><CopyPlus size={16} aria-hidden="true" />Reutilizar datos</button> : null} />} />} />
      {gestion && <ConfirmarGestionRegistro accion={gestion} codigo={pedido.orderCode} onClose={() => setGestion(null)}
        onConfirmar={(texto) => { const accion = gestion; setGestion(null); void gestionarRegistro(accion, texto); }} />}
      {pedido.terminadoSinGenerar && (
        <div className="review-production-block bloque-3d" role="status">
          <div className="review-production-summary">
            <span>
              <strong>Terminado sin generar</strong>
              <small>{`${fechaHora(pedido.terminadoSinGenerar.fecha)} · ${controlLabel(pedido.terminadoSinGenerar.usuario)}`}</small>
              {pedido.terminadoSinGenerar.motivo && <p className="motivo-cierre-toldos">{pedido.terminadoSinGenerar.motivo}</p>}
            </span>
          </div>
        </div>
      )}
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
            {pedido.production.files.filter((f, i, todos) => f.type !== 'pdf' || todos.findIndex(a => a.type === 'pdf') === i).map((fichero) => (
              <span className="review-generated-file chip-3d" key={fichero.savedPath} title={fichero.savedPath}>
                <span className="review-generated-file-icon">{fichero.type === 'pdf' ? <FileText aria-hidden="true" /> : <DoorOpen aria-hidden="true" />}</span>
                <span><strong>{fichero.filename}</strong><small>{fichero.type === 'pdf' ? 'Presentaciones PDF · planteamientos y carpeta anual' : 'Plano · oficina técnica'}</small></span>
              </span>
            ))}
          </div>
        </div>
      )}

      <ul className="rem-pedido-elementos" aria-label={productoDeElementos(pedido.elementos)==='systemdock'?'Lonas del pedido':'Puertas del pedido'}>
        {pedido.elementos.map((elemento, indice) => <FilaPuerta key={elemento.id} letra={letras[indice]} puerta={elemento.input} coordina={coordina} />)}
      </ul>

      <DocumentosPedido
        planteamiento={<PlanteamientoPuertas pedido={pedido} />}
        corte={<CadPaginasPuertas
          key={pedido.orderCode}
          orderCode={pedido.orderCode}
          version={pedido.updatedAt}
          noRegenerado={pedido.corteNoRegenerado}
          onActualizarCorte={!terminado && !generando && Boolean(currentUser) ? () => corte.regenerar() : undefined}
          actualizando={corte.ocupado}
          fallback={<CortePuertasGuardado ruta={ruta} version={pedido.updatedAt} systemDock={productoDeElementos(pedido.elementos) === 'systemdock'} />}
        />} />
      {!terminado && <AccionesCorteMaquina ruta={ruta + '/corte'} codigo={pedido.orderCode} onEnviado={onChanged} />}
      <HistorialEnvios envios={pedido.enviosCorte} />
    </section>
  );
}
