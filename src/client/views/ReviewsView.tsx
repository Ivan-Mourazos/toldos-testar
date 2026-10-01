import React, { useEffect, useRef, useState } from 'react';
import type { PedidoBandeja, ReviewPackage, RuleParameters } from '../types';
import type { PedidoRemolques } from '../../remolques/flujo/tipos.ts';
import type { AskForConfirmation, Notify } from '../components/NotificationCenter';
import { ReviewOrderDetail } from '../components/ReviewOrderDetail';
import { OrdersInbox } from '../components/OrdersInbox';
import { useCoordinaStatus } from '../hooks/useCoordinaStatus';
import { generateState } from '../generatePermission';
import { leerPedidosDelAnio } from '../hooks/listaPedidos';
import { productoDe } from '../ordersInbox';
import { PedidoRemolquesDetalle } from '../remolques/PedidoRemolquesDetalle';
import type { Borrador, ResumenBorrador } from '../../borradores/tipos.ts';
import { descartarBorrador, leerBorrador } from '../borradores';
import { useBorradores } from '../hooks/useBorradores';
import { controlLabel } from '../components/controlLabels';

// Pedidos: la bandeja y el pedido abierto. Los pendientes llegan de App (año actual y
// anterior, los mismos que cuenta «Pedidos · N»); aquí solo se lee el Historial del año
// elegido, que no filtra los pendientes.
export function ReviewsView({ refreshKey, parameters, currentUser, pending, pendingLoading, onChanged, onOpen, onReuse, onEditRemolques, onReuseRemolques, onSeguirBorrador, onToast, onConfirm }: {
  refreshKey: number;
  parameters: RuleParameters;
  currentUser: string;
  pending: PedidoBandeja[];
  pendingLoading: boolean;
  onChanged: () => void;
  onOpen: (review: ReviewPackage) => void | Promise<void>;
  onReuse: (review: ReviewPackage) => void | Promise<void>;
  onEditRemolques: (pedido: PedidoRemolques) => void;
  onReuseRemolques: (pedido: PedidoRemolques) => void;
  /** «Seguir con el borrador»: lo abre App en Toldos o en Remolques. */
  onSeguirBorrador: (borrador: Borrador) => void | Promise<void>;
  onToast: Notify;
  onConfirm: AskForConfirmation;
}) {
  const [year, setYear] = useState(new Date().getFullYear());
  const [history, setHistory] = useState<PedidoBandeja[]>([]);
  const [selectedCode, setSelectedCode] = useState('');
  // El pedido de remolques abierto (fase 5); el de toldos sigue en selectedCode.
  const [selectedRemolques, setSelectedRemolques] = useState('');
  const [detail, setDetail] = useState<{ orderCode: string; review: ReviewPackage | null } | null>(null);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [generating, setGenerating] = useState(false);
  const listRequestId = useRef(0);
  const pendingOfs = pending.flatMap((review) => (review.summary.awningList || []).map((item) => item.of));
  const { borradores } = useBorradores(refreshKey, onToast);
  const { status: coordinaStatus } = useCoordinaStatus(pendingOfs, selectedCode === '' && selectedRemolques === '');

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

  const detailIsCurrent = detail?.orderCode === selectedCode;
  const selectedReview = detailIsCurrent ? detail.review : null;
  // Segunda consulta a CoordinaOT: la de las OF del pedido abierto (la de la bandeja solo
  // corre en la lista). Un pedido ya generado no necesita preguntar.
  const detailOfs = selectedReview ? (selectedReview.order.awnings || []).map((awning) => String(awning.of || '')) : [];
  const { status: detailCoordina } = useCoordinaStatus(detailOfs, Boolean(selectedReview) && selectedReview?.status !== 'PRODUCED');
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
        onToast(`Guardado ${targetCode}-1.pdf y ${rpsCount} Excel de reserva.`, {
          tone: 'success',
          title: 'Archivos generados'
        });
        return;
      }
    } catch (error) {
      onToast(error instanceof Error ? error.message : 'No se pudieron generar los archivos.', { tone: 'error' });
    } finally {
      setGenerating(false);
    }
  }

  return (
    <section className="reviews-layout">
      {selectedRemolques
        ? (
          <PedidoRemolquesDetalle
            orderCode={selectedRemolques}
            refreshKey={refreshKey}
            currentUser={currentUser}
            onBack={() => setSelectedRemolques('')}
            onCorregir={onEditRemolques}
            onReutilizar={onReuseRemolques}
            onChanged={onChanged}
            onToast={onToast}
            onConfirm={onConfirm}
          />
        )
        : selectedCode === ''
        ? <OrdersInbox
            pending={pending}
            history={history}
            currentUser={currentUser}
            pendingLoading={pendingLoading}
            historyLoading={historyLoading}
            year={year}
            onYear={(value) => { setHistoryLoading(true); setYear(value); }}
            onOpen={(review) => (productoDe(review) === 'remolques' ? setSelectedRemolques(review.orderCode) : setSelectedCode(review.orderCode))}
            coordinaStatus={coordinaStatus}
            borradores={borradores}
            onSeguirBorrador={(borrador) => void seguirBorrador(borrador)}
            onDescartarBorrador={(borrador) => void descartar(borrador)}
          />
        : (
          <ReviewOrderDetail
            review={selectedReview}
            parameters={parameters}
            loading={detailLoading}
            currentUser={currentUser}
            coordinaStatus={detailCoordina}
            disabled={working || generating}
            generating={generating}
            onBack={() => setSelectedCode('')}
            onEdit={() => void openSelected()}
            onReuse={() => void reuseSelected()}
            onGenerate={() => void generateSelected()}
          />
        )}
    </section>
  );
}

async function fetchReviewDetails(orderCode: string) {
  const reviewResponse = await fetch(`/api/reviews/${encodeURIComponent(orderCode)}`);
  const reviewData = await reviewResponse.json();
  if (!reviewResponse.ok) throw new Error(reviewData.error || 'No se pudo abrir el pedido.');
  return reviewData as ReviewPackage;
}
