import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useContenidoFluido } from '../hooks/useContenidoFluido';
import { transicionPedido } from '../transicionPedido';
import type { PedidoBandeja, ReviewPackage, RuleParameters } from '../types';
import type { EstadoCorte } from '../corteLona';
import type { PedidoRemolques } from '../../remolques/flujo/tipos.ts';
import type { PedidoPuertasGuardado } from '../../puertas/flujo/tipos.ts';
import { PedidoPuertasDetalle } from '../puertas/PedidoPuertasDetalle';
import type { AskForConfirmation, Notify } from '../components/NotificationCenter';
import { ReviewOrderDetail } from '../components/ReviewOrderDetail';
import { OrdersInbox } from '../components/OrdersInbox';
import { useCoordinaStatus } from '../hooks/useCoordinaStatus';
import { generateState } from '../generatePermission';
import { leerPedidosDelAnio } from '../hooks/listaPedidos';
import { productoDe } from '../ordersInbox';
import { PedidoRemolquesDetalle } from '../remolques/PedidoRemolquesDetalle';
import { BuscadorRemolques } from '../remolques/BuscadorRemolques';
import { estadoBuscadorInicial, type EstadoBuscador } from '../remolques/busquedaRemolques';
import type { Borrador, ResumenBorrador } from '../../borradores/tipos.ts';
import { descartarBorrador, leerBorrador } from '../borradores';
import { useBorradores } from '../hooks/useBorradores';
import { controlLabel } from '../components/controlLabels';

// Pedidos: la bandeja y el pedido abierto. Los pendientes llegan de App (año actual y
// anterior, los mismos que cuenta «Pedidos · N»); aquí solo se lee el Historial del año
// elegido, que no filtra los pendientes.
export function ReviewsView({ refreshKey, puertas = true, parameters, currentUser, pending, pendingLoading, onChanged, onOpen, onReuse, onEditRemolques, onReuseRemolques, onEditPuertas, onReusePuertas, onSeguirBorrador, onToast, onConfirm, abrirAlCargar = null, onAbiertoAlCargar }: {
  refreshKey: number;
  /** false: puertas en pausa en el servidor, sin filtro de puertas. */
  puertas?: boolean;
  parameters: RuleParameters;
  currentUser: string;
  pending: PedidoBandeja[];
  pendingLoading: boolean;
  onChanged: () => void;
  onOpen: (review: ReviewPackage) => void | Promise<void>;
  onReuse: (review: ReviewPackage) => void | Promise<void>;
  onEditRemolques: (pedido: PedidoRemolques) => void;
  onReuseRemolques: (pedido: PedidoRemolques) => void;
  onEditPuertas: (pedido: PedidoPuertasGuardado) => void;
  onReusePuertas: (pedido: PedidoPuertasGuardado) => void;
  /** «Seguir con el borrador»: lo abre App en Toldos o en Remolques. */
  onSeguirBorrador: (borrador: Borrador) => void | Promise<void>;
  onToast: Notify;
  onConfirm: AskForConfirmation;
  /** Pedido que pide abrir CoordinaOT (`?revisar=`), sin puntos. Se abre en cuanto la bandeja
   *  lo tiene, y se avisa a App para que no se repita al volver a esta pestaña. */
  abrirAlCargar?: string | null;
  onAbiertoAlCargar?: () => void;
}) {
  const [year, setYear] = useState(new Date().getFullYear());
  const [history, setHistory] = useState<PedidoBandeja[]>([]);
  const [selectedCode, setSelectedCode] = useState('');
  // El pedido de remolques abierto (fase 5); el de toldos sigue en selectedCode.
  const [selectedRemolques, setSelectedRemolques] = useState('');
  // El de puertas (fase 2, 22/10/2026).
  const [selectedPuertas, setSelectedPuertas] = useState('');
  const [puertasLeido,setPuertasLeido] = useState<PedidoPuertasGuardado>();
  const [remolquesLeido,setRemolquesLeido] = useState<PedidoRemolques>();
  const contenidoFluido=useContenidoFluido<HTMLElement>(`${selectedCode}/${selectedRemolques}/${selectedPuertas}`);
  const solicitudApertura=useRef(0);
  const origenApertura=useRef<{boton:HTMLElement|null;scroll:number}>({boton:null,scroll:0});
  useEffect(()=>()=>{solicitudApertura.current++;},[]);

  function volverALista() {
    solicitudApertura.current++;
    void transicionPedido(()=>{
      setSelectedCode('');setSelectedRemolques('');setSelectedPuertas('');
    }).then(()=>{
      window.scrollTo({top:origenApertura.current.scroll,behavior:'instant'});
      if(origenApertura.current.boton?.isConnected) origenApertura.current.boton.focus({preventScroll:true});
      else contenidoFluido.current?.querySelector<HTMLElement>('button,input')?.focus({preventScroll:true});
    });
  }
  // El buscador de remolques (diseño 02/10/2026): si está abierto, y sus filtros y resultado, que
  // siguen ahí al abrir un pedido desde él y volver. `elementoRemolques` es el elemento buscado.
  const [buscadorAbierto, setBuscadorAbierto] = useState(false);
  const [estadoBuscador, setEstadoBuscador] = useState<EstadoBuscador>(estadoBuscadorInicial);
  const [elementoRemolques, setElementoRemolques] = useState<string | undefined>(undefined);
  const [detail, setDetail] = useState<{ orderCode: string; review: ReviewPackage | null } | null>(null);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [generating, setGenerating] = useState(false);
  const listRequestId = useRef(0);
  const pendingOfs = pending.flatMap((review) => (review.summary.awningList || []).map((item) => item.of));
  const { borradores } = useBorradores(refreshKey, onToast);
  const { status: coordinaStatus } = useCoordinaStatus(pendingOfs, selectedCode === '' && selectedRemolques === '' && selectedPuertas === '' && !buscadorAbierto);

  useEffect(() => {
    const requestId = ++listRequestId.current;
    let cancelled = false;
    leerPedidosDelAnio(year)
      .then(({ pedidos, avisoRemolques }) => {
        if (cancelled || requestId !== listRequestId.current) return;
        setHistory(pedidos);
        setHistoryLoading(false);
        if (avisoRemolques) onToast(avisoRemolques, { tone: 'error' });
      })
      .catch((error) => {
        if (cancelled || requestId !== listRequestId.current) return;
        setHistoryLoading(false);
        onToast(error instanceof Error ? error.message : 'No se pudo cargar el historial.', { tone: 'error' });
      });
    return () => { cancelled = true; };
  }, [year, refreshKey, onToast]);

  // Cada producto abre su ficha.
  const abrirCodigo=useCallback(async (orderCode:string, producto:string) => {
    const solicitud=++solicitudApertura.current;
    origenApertura.current={boton:document.activeElement instanceof HTMLElement?document.activeElement:null,scroll:window.scrollY};
    try {
      const ruta=producto==='remolques'?'remolques/pedidos':producto==='puertas'||producto==='systemdock'?'puertas/pedidos':'reviews';
      const respuesta=await fetch(`/api/${ruta}/${encodeURIComponent(orderCode)}`,{cache:'no-store'});
      const datos=await respuesta.json();
      if(!respuesta.ok)throw new Error(datos.error||'No se pudo abrir el pedido.');
      if(solicitud!==solicitudApertura.current)return;
      await transicionPedido(()=>{
        if(producto==='remolques'){setRemolquesLeido(datos as PedidoRemolques);setSelectedRemolques(orderCode);}
        else if(producto==='puertas'||producto==='systemdock'){setPuertasLeido(datos as PedidoPuertasGuardado);setSelectedPuertas(orderCode);}
        else {setDetail({orderCode,review:datos as ReviewPackage});setSelectedCode(orderCode);}
      });
      contenidoFluido.current?.querySelector<HTMLElement>('.reviews-back-button')?.focus({preventScroll:true});
    } catch(error) {
      if(solicitud===solicitudApertura.current)onToast(error instanceof Error?error.message:'No se pudo abrir el pedido.',{tone:'error'});
    }
  },[onToast,contenidoFluido]);
  const abrir=useCallback((review:PedidoBandeja)=>abrirCodigo(review.orderCode,productoDe(review)),[abrirCodigo]);

  const atendidoAlCargar = useRef<string | null>(null);
  // EL PEDIDO QUE MANDA COORDINAOT. Se espera a que estén las dos listas: si no está en
  // pendientes puede estar en el Historial (ya generado). Si no está en ninguna, se dice: lo
  // normal es que aún no se haya guardado para revisión desde aquí.
  useEffect(() => {
    if (!abrirAlCargar || pendingLoading || historyLoading || atendidoAlCargar.current === abrirAlCargar) return;
    atendidoAlCargar.current = abrirAlCargar;
    const sinPuntos = (codigo: string) => codigo.replace(/[.s-]/g, '').toUpperCase();
    const encontrado = [...pending, ...history].find((p) => sinPuntos(p.orderCode) === abrirAlCargar);
    queueMicrotask(() => {
      onAbiertoAlCargar?.();
      if (!encontrado) {
        onToast(`El pedido ${abrirAlCargar} no está guardado para revisión en Planteamientos.`, { tone: 'warning', title: 'No encuentro el pedido' });
        return;
      }
      abrir(encontrado);
    });
  }, [abrirAlCargar, pendingLoading, historyLoading, pending, history, onAbiertoAlCargar, onToast, abrir]);

  const detailIsCurrent = detail?.orderCode === selectedCode;
  const selectedReview = detailIsCurrent ? detail.review : null;
  // Segunda consulta a CoordinaOT: la de las OF del pedido abierto (la de la bandeja solo
  // corre en la lista). Un pedido ya generado no necesita preguntar.
  const detailOfs = selectedReview ? (selectedReview.order.awnings || []).map((awning) => String(awning.of || '')) : [];
  const { status: detailCoordina } = useCoordinaStatus(detailOfs, Boolean(selectedReview));
  const detailLoading = Boolean(selectedCode && !detailIsCurrent);

  useEffect(() => {
    if (!selectedCode) return;
    let cancelled = false;
    fetchReviewDetails(selectedCode)
      .then((review) => {
        if (cancelled) return;
        setDetail({ orderCode: selectedCode, review });
      })
      .catch((error) => {
        if (cancelled) return;
        setDetail({ orderCode: selectedCode, review: null });
        onToast(error instanceof Error ? error.message : 'No se pudieron cargar los datos del pedido.', { tone: 'error' });
      });
    return () => { cancelled = true; };
  }, [selectedCode, refreshKey, onToast]);

  async function openSelected() {
    if (!selectedCode) return;
    setWorking(true);
    try {
      const review = selectedReview || await fetchReviewDetails(selectedCode);
      await onOpen(review);
    } catch (error) {
      onToast(error instanceof Error ? error.message : 'No se pudo abrir el pedido.', { tone: 'error' });
    } finally {
      setWorking(false);
    }
  }

  // El autor genera en el detalle el corte que falta o está viejo (Iván, 21/10/2026): se vuelve a guardar el
  // pedido tal cual, con el corte nuevo y su plano, sin pasar por «Corregir».
  async function guardarCorte(review: ReviewPackage, corteLona: EstadoCorte, confirmPlanoOverwrite = false): Promise<void> {
    setWorking(true);
    try {
      const response = await fetch('/api/reviews', { method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ order: review.order, corteLona, confirmOverwrite: true, confirmPlanoOverwrite, savedBy: currentUser }) });
      const data = await response.json();
      if (response.status === 409 && data.needsPlanoConfirmation) {
        const choice = await onConfirm({ title: 'El plano del corte ya existe', message: 'El plano de este pedido ya está en su carpeta. ¿Sustituirlo por el de la web?',
          confirmLabel: 'Sustituir plano', cancelLabel: 'Conservar el actual', tone: 'warning', details: data.existing });
        if (choice === 'confirm') await guardarCorte(review, corteLona, true);
        return;
      }
      if (!response.ok) throw new Error(data.error || 'No se pudo guardar el corte.');
      onToast(`Corte guardado en ${review.orderCode}.`, { tone: 'success' });
      onChanged();
    } catch (error) {
      onToast(error instanceof Error ? error.message : 'No se pudo guardar el corte.', { tone: 'error' });
    } finally {
      setWorking(false);
    }
  }

  async function reuseSelected() {
    if (!selectedCode) return;
    setWorking(true);
    try {
      const review = selectedReview || await fetchReviewDetails(selectedCode);
      await onReuse(review);
    } catch (error) {
      onToast(error instanceof Error ? error.message : 'No se pudieron reutilizar los datos del pedido.', { tone: 'error' });
    } finally {
      setWorking(false);
    }
  }

  // «Seguir con el borrador»: se lee entero (la lista no trae el contenido) y lo abre App.
  async function seguirBorrador(resumen: ResumenBorrador) {
    try {
      const borrador = await leerBorrador(resumen.orderCode);
      if (!borrador) {
        onToast('Este borrador ya no está: puede que otro puesto lo haya guardado para revisión o descartado.', { tone: 'warning' });
        onChanged();
        return;
      }
      await onSeguirBorrador(borrador);
    } catch (error) {
      onToast(error instanceof Error ? error.message : 'No se pudo abrir el borrador.', { tone: 'error' });
    }
  }

  // «Descartar borrador»: cualquiera puede, preguntando antes.
  async function descartar(resumen: ResumenBorrador) {
    const choice = await onConfirm({
      title: `Descartar el borrador de ${resumen.orderCode}`,
      message: `Se borrará el borrador que guardó ${controlLabel(resumen.savedBy)}. No se puede deshacer. Lo que haya en RPS y en Pedidos no cambia.`,
      confirmLabel: 'Descartar borrador',
      cancelLabel: 'Conservar borrador',
      tone: 'danger'
    });
    if (choice !== 'confirm') return;
    try {
      await descartarBorrador(resumen.orderCode);
      onToast(`Borrador descartado: ${resumen.orderCode}.`, { tone: 'success', title: 'Borrador descartado' });
      onChanged();
    } catch (error) {
      onToast(error instanceof Error ? error.message : 'No se pudo descartar el borrador.', { tone: 'error' });
    }
  }

  async function generateSelected() {
    if (!selectedReview || !generateState(selectedReview, currentUser, detailCoordina).allowed) return;
    const targetCode = selectedReview.orderCode;
    const initialChoice = await onConfirm({
      title: `Generar archivos de ${targetCode}`,
      message: 'CoordinaOT ya lo ha aprobado. Se guardará el PDF definitivo en Planteamientos y un Excel de reserva por cada OF en Subida de material.',
      details: [`${targetCode}-1.pdf`, ...selectedReview.summary.ofs.map((of) => `${of}.xls`)],
      confirmLabel: 'Sí, generar archivos',
      cancelLabel: 'Ahora no',
      tone: 'warning'
    });
    if (initialChoice !== 'confirm') return;

    setGenerating(true);
    let includeNonAcrylicFabrics: boolean | null = null;
    let confirmOverwrite = false;
    try {
      while (true) {
        const response = await fetch(`/api/reviews/${encodeURIComponent(targetCode)}/generate-files`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            includeNonAcrylicFabrics,
            confirmOverwrite
          })
        });
        const data = await response.json();

        if (response.status === 409 && data.needsFabricConfirmation) {
          const fabrics = (data.fabrics || []).map((fabric: { code: string; description: string; ofs?: string[] }) =>
            `${fabric.code} · ${fabric.description}${fabric.ofs?.length ? ` (OF ${fabric.ofs.join(', ')})` : ''}`
          );
          const choice = await onConfirm({
            title: fabrics.length > 1 ? 'Telas no acrílicas' : 'Tela no acrílica',
            message: 'Decide si debe incluirse en la reserva de material.',
            details: fabrics,
            confirmLabel: 'Incluir en la reserva',
            cancelLabel: 'No incluir',
            tone: 'warning'
          });
          if (choice === 'dismiss') return;
          includeNonAcrylicFabrics = choice === 'confirm';
          continue;
        }

        if (response.status === 409 && data.needsConfirmation) {
          const choice = await onConfirm({
            title: 'Sustituir archivos existentes',
            message: 'Estos archivos ya existen. Comprueba la lista antes de sustituirlos.',
            details: data.existing,
            confirmLabel: 'Sustituir archivos',
            cancelLabel: 'Conservar archivos',
            tone: 'danger'
          });
          if (choice !== 'confirm') return;
          confirmOverwrite = true;
          continue;
        }

        if (!response.ok) throw new Error(data.error || 'No se pudieron generar los archivos.');
        setSelectedCode('');
        setDetail(null);
        // Se releen pendientes (App), historial y contador: el pedido pasa al Historial.
        onChanged();
        if (data.unchanged) {
          // Otro puesto lo generó mientras estaba abierto: no se ha escrito nada nuevo.
          onToast('Este pedido ya estaba generado.', { tone: 'info', title: 'Sin cambios' });
          return;
        }
        const rpsCount = (data.saved || []).filter((file: { type: string }) => file.type === 'rps').length;
        onToast(`Guardado ${targetCode}-1.pdf${data.conCad ? ' (con las presentaciones del CAD)' : ''} y ${rpsCount} reservas de RPS.`, {
          tone: 'success',
          title: 'Archivos generados'
        });
        for (const aviso of (data.avisos as string[] | undefined) ?? []) onToast(aviso, { tone: 'warning' });
        return;
      }
    } catch (error) {
      onToast(error instanceof Error ? error.message : 'No se pudieron generar los archivos.', { tone: 'error' });
    } finally {
      setGenerating(false);
    }
  }

  return (
    <section className="reviews-layout" ref={contenidoFluido}>
      {selectedPuertas
        ? (
          <PedidoPuertasDetalle
            pedidoInicial={puertasLeido}
            orderCode={selectedPuertas}
            refreshKey={refreshKey}
            currentUser={currentUser}
            onBack={volverALista}
            onCorregir={onEditPuertas}
            onReutilizar={onReusePuertas}
            onChanged={onChanged}
            onToast={onToast}
            onConfirm={onConfirm}
          />
        )
        : selectedRemolques
        ? (
          <PedidoRemolquesDetalle
            pedidoInicial={remolquesLeido}
            orderCode={selectedRemolques}
            refreshKey={refreshKey}
            currentUser={currentUser}
            elementoInicial={elementoRemolques}
            textoVolver={buscadorAbierto ? '← Buscar remolques' : undefined}
            onBack={() => { volverALista(); setElementoRemolques(undefined); }}
            onCorregir={onEditRemolques}
            onReutilizar={onReuseRemolques}
            onChanged={onChanged}
            onToast={onToast}
            onConfirm={onConfirm}
          />
        )
        : buscadorAbierto
        ? (
          <BuscadorRemolques
            estado={estadoBuscador}
            onEstado={setEstadoBuscador}
            onVolver={() => setBuscadorAbierto(false)}
            onAbrir={(orderCode, version) => { setElementoRemolques(version); void abrirCodigo(orderCode,'remolques'); }}
            onToast={onToast}
          />
        )
        : selectedCode === ''
        ? null
        : (
          <ReviewOrderDetail
            review={selectedReview}
            parameters={parameters}
            loading={detailLoading}
            currentUser={currentUser}
            coordinaStatus={detailCoordina}
            disabled={working || generating}
            generating={generating}
            onBack={volverALista}
            onEdit={() => void openSelected()}
            onReuse={() => void reuseSelected()}
            onGenerate={() => void generateSelected()}
            notify={onToast}
            onConfirm={onConfirm}
            onGuardarCorte={(estado) => { if (selectedReview) void guardarCorte(selectedReview, estado); }}
          />
        )}
      <div hidden={Boolean(selectedCode||selectedRemolques||selectedPuertas||buscadorAbierto)}>
        <OrdersInbox puertas={puertas} pending={pending} history={history} currentUser={currentUser}
          pendingLoading={pendingLoading} historyLoading={historyLoading} year={year}
          onYear={value=>{setHistoryLoading(true);setYear(value);}} onOpen={abrir} coordinaStatus={coordinaStatus}
          borradores={borradores} onSeguirBorrador={borrador=>void seguirBorrador(borrador)}
          onDescartarBorrador={borrador=>void descartar(borrador)} onBuscarRemolques={()=>setBuscadorAbierto(true)}/>
      </div>
    </section>
  );
}

async function fetchReviewDetails(orderCode: string) {
  const reviewResponse = await fetch(`/api/reviews/${encodeURIComponent(orderCode)}`);
  const reviewData = await reviewResponse.json();
  if (!reviewResponse.ok) throw new Error(reviewData.error || 'No se pudo abrir el pedido.');
  return reviewData as ReviewPackage;
}
