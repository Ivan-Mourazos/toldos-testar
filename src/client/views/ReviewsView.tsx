import React, { useEffect, useRef, useState } from 'react';
import type { ReviewPackage, ReviewSummary, RuleParameters } from '../types';
import type { AskForConfirmation, Notify } from '../components/NotificationCenter';
import { ReviewOrderDetail } from '../components/ReviewOrderDetail';
import { OrdersInbox } from '../components/OrdersInbox';
import { canGenerateReview } from '../generatePermission';

export function ReviewsView({ refreshKey, parameters, currentUser, onPendingCount, onOpen, onReuse, onToast, onConfirm }: {
  refreshKey: number;
  parameters: RuleParameters;
  currentUser: string;
  onPendingCount: (count: number) => void;
  onOpen: (review: ReviewPackage) => void | Promise<void>;
  onReuse: (review: ReviewPackage) => void | Promise<void>;
  onToast: Notify;
  onConfirm: AskForConfirmation;
}) {
  const [year, setYear] = useState(new Date().getFullYear());
  const [reviews, setReviews] = useState<ReviewSummary[]>([]);
  const [selectedCode, setSelectedCode] = useState('');
  const [detail, setDetail] = useState<{ orderCode: string; review: ReviewPackage | null } | null>(null);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [generating, setGenerating] = useState(false);
  const listRequestId = useRef(0);

  useEffect(() => {
    const requestId = ++listRequestId.current;
    let cancelled = false;
    fetch(`/api/reviews?year=${year}`)
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'No se pudo cargar la bandeja.');
        return data.reviews as ReviewSummary[];
      })
      .then((items) => {
        if (cancelled || requestId !== listRequestId.current) return;
        setReviews(items);
        // Ya no se elige un pedido automáticamente al cargar: el abierto sigue si sigue
        // existiendo, y si no, se vuelve a la bandeja (Bandeja de Pedidos, 24/09/2026).
        setSelectedCode((current) => items.some((item) => item.orderCode === current) ? current : '');
        setLoading(false);
      })
      .catch((error) => {
        if (cancelled || requestId !== listRequestId.current) return;
        setLoading(false);
        onToast(error instanceof Error ? error.message : 'No se pudo cargar la bandeja.', { tone: 'error' });
      });
    return () => { cancelled = true; };
  }, [year, refreshKey, onToast]);

  // Para el contador «Pedidos · N» de la barra superior (Task 4/5).
  useEffect(() => {
    onPendingCount(reviews.filter((review) => ['PENDING_REVIEW', 'CHANGES_REQUESTED', 'APPROVED'].includes(review.status)).length);
  }, [reviews, onPendingCount]);

  const selected = reviews.find((review) => review.orderCode === selectedCode) || null;
  const detailIsCurrent = detail?.orderCode === selectedCode;
  const selectedReview = detailIsCurrent ? detail.review : null;
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
    if (!selected) return;
    setWorking(true);
    try {
      const review = selectedReview || await fetchReviewDetails(selected.orderCode);
      await onOpen(review);
    } catch (error) {
      onToast(error instanceof Error ? error.message : 'No se pudo abrir el pedido.', { tone: 'error' });
    } finally {
      setWorking(false);
    }
  }

  async function reuseSelected() {
    if (!selected) return;
    setWorking(true);
    try {
      const review = selectedReview || await fetchReviewDetails(selected.orderCode);
      await onReuse(review);
    } catch (error) {
      onToast(error instanceof Error ? error.message : 'No se pudieron reutilizar los datos del pedido.', { tone: 'error' });
    } finally {
      setWorking(false);
    }
  }

  async function generateSelected() {
    if (!selected || !selectedReview || !canGenerateReview(selected.status, selectedReview.order.technician, currentUser)) return;
    const targetCode = selected.orderCode;
    const initialChoice = await onConfirm({
      title: `Generar archivos de ${targetCode}`,
      message: '¿Está aprobado en CoordinaOT? Se guardará el PDF definitivo en Planteamientos y un Excel de reserva por cada OF en Subida de material.',
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
        updateLocalReview(data.review as ReviewPackage);
        const rpsCount = (data.saved || []).filter((file: { type: string }) => file.type === 'rps').length;
        onToast(`Guardado ${targetCode}-1.pdf y ${rpsCount} ${rpsCount === 1 ? 'Excel de reserva' : 'Excel de reserva'}.`, {
          tone: 'success',
          title: 'Archivos generados'
        });
        setSelectedCode('');
        return;
      }
    } catch (error) {
      onToast(error instanceof Error ? error.message : 'No se pudieron generar los archivos.', { tone: 'error' });
    } finally {
      setGenerating(false);
    }
  }

  function updateLocalReview(review: ReviewPackage) {
    setDetail((current) => current?.orderCode === review.orderCode
      ? { orderCode: review.orderCode, review: { ...review, order: current.review?.order || review.order } }
      : current);
    setReviews((current) => current.map((item) => item.orderCode === review.orderCode ? reviewSummary(review) : item));
  }

  return (
    <section className="reviews-layout">
      {selectedCode === ''
        ? <OrdersInbox
            reviews={reviews}
            currentUser={currentUser}
            loading={loading}
            year={year}
            onYear={(value) => { setLoading(true); setYear(value); }}
            onOpen={setSelectedCode}
          />
        : (
          <ReviewOrderDetail
            review={selectedReview}
            parameters={parameters}
            loading={detailLoading}
            currentUser={currentUser}
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

function reviewSummary(review: ReviewPackage): ReviewSummary {
  const { order, ...summary } = review;
  void order;
  return summary;
}

async function fetchReviewDetails(orderCode: string) {
  const reviewResponse = await fetch(`/api/reviews/${encodeURIComponent(orderCode)}`);
  const reviewData = await reviewResponse.json();
  if (!reviewResponse.ok) throw new Error(reviewData.error || 'No se pudo abrir el pedido.');
  return reviewData as ReviewPackage;
}
