import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import {
  ClipboardList,
  Download,
  History,
  Save
} from 'lucide-react';
import '@fontsource-variable/inter';
import './styles.css';
import type { ActiveTab, Catalog } from './types';
import { fileNameFromDisposition, uid } from './constants';
import { useDraft } from './hooks/useDraft';
import { useCalculation } from './hooks/useCalculation';
import { TabButton } from './components/TabButton';
import { OrderView } from './views/OrderView';
import { HistoryView } from './views/HistoryView';

function App() {
  const draft = useDraft();
  const [catalog, setCatalog] = useState<Catalog | null>(null);
  const [activeTab, setActiveTab] = useState<ActiveTab>('order');
  const [toast, setToast] = useState('');
  const [saving, setSaving] = useState(false);

  const { calculation, calculationState, reservation } = useCalculation({
    activeTab,
    orderCode: draft.orderCode,
    customer: draft.customer,
    orderDate: draft.orderDate,
    technician: draft.technician,
    reviewer: draft.reviewer,
    fabric: draft.fabric,
    remate: draft.remate,
    curvaBamba: draft.curvaBamba,
    bambaDistinta: draft.bambaDistinta,
    telaBamba: draft.telaBamba,
    structureColor: draft.structureColor,
    rotTela: draft.rotTela,
    rotBamba: draft.rotBamba,
    notes: draft.notes,
    awnings: draft.awnings
  });

  useEffect(() => {
    fetch('/api/catalog')
      .then((response) => response.json())
      .then(setCatalog)
      .catch(() => setToast('No se pudo cargar el catálogo.'));
  }, []);

  // Auto-dismiss toast
  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(''), 5000);
    return () => window.clearTimeout(timer);
  }, [toast]);

  function reuseHistory(entry: Parameters<typeof draft.reuseHistory>[0]) {
    draft.reuseHistory(entry);
    setActiveTab('order');
    setToast(`Pedido ${entry.orderCode || 'sin número'} cargado desde historial.`);
  }

  async function exportReservation() {
    if (reservation.ofs.length === 0) {
      setToast('Todavía no hay materiales calculados para exportar.');
      return;
    }

    setSaving(true);
    try {
      const response = await fetch('/api/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(reservation)
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        setToast(data.error || 'No se pudo exportar.');
        return;
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileNameFromDisposition(response.headers.get('content-disposition')) || 'reserva-toldos.xlsx';
      link.click();
      URL.revokeObjectURL(url);
    } finally {
      setSaving(false);
    }
  }

  async function saveLegacyReservation(confirmOverwrite = false) {
    if (reservation.ofs.length === 0) {
      setToast('Todavía no hay materiales calculados para guardar.');
      return;
    }

    setSaving(true);
    try {
      const response = await fetch('/api/export/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reservation,
          order: {
            orderCode: draft.orderCode,
            customer: draft.customer,
            orderDate: draft.orderDate,
            technician: draft.technician,
            reviewer: draft.reviewer,
            fabric: draft.fabric,
            remate: draft.remate,
            curvaBamba: draft.curvaBamba,
            bambaDistinta: draft.bambaDistinta,
            telaBamba: draft.telaBamba,
            structureColor: draft.structureColor,
            rotTela: draft.rotTela,
            rotBamba: draft.rotBamba,
            notes: draft.notes,
            awnings: draft.awnings
          },
          confirmOverwrite
        })
      });
      const data = await response.json().catch(() => ({}));

      if (response.status === 409 && data.needsConfirmation) {
        setSaving(false);
        const overwrite = window.confirm(`Ya existen reservas: ${data.existing.join(', ')}. ¿Sobrescribir?`);
        if (overwrite) await saveLegacyReservation(true);
        return;
      }

      if (!response.ok) {
        setToast(data.error || 'No se pudo guardar la reserva antigua.');
        return;
      }

      const savedNames = (data.saved || []).map((item: { filename: string }) => item.filename).join(', ');
      const archiveName = data.orderArchive?.filename ? ` Resumen: ${data.orderArchive.filename}.` : '';
      const pdfName = data.planteamiento?.filename ? ` Planteamiento: ${data.planteamiento.filename}.` : '';
      setToast(savedNames ? `Reserva antigua guardada: ${savedNames}.${archiveName}${pdfName}` : `Reserva antigua guardada.${archiveName}${pdfName}`);

      draft.setHistoryEntries((current) => [
        {
          id: uid(),
          createdAt: new Date().toISOString(),
          orderCode: draft.orderCode,
          customer: draft.customer,
          orderDate: draft.orderDate,
          technician: draft.technician,
          reviewer: draft.reviewer,
          fabric: draft.fabric,
          remate: draft.remate,
          curvaBamba: draft.curvaBamba,
          bambaDistinta: draft.bambaDistinta,
          telaBamba: draft.telaBamba,
          structureColor: draft.structureColor,
          rotTela: draft.rotTela,
          rotBamba: draft.rotBamba,
          ofs: draft.awnings.map((a) => a.of).filter(Boolean),
          models: [...new Set(draft.awnings.map((a) => a.model))],
          awnings: structuredClone(draft.awnings),
          diagnostics: calculation?.diagnostics.length || 0,
          notes: draft.notes
        },
        ...current
      ].slice(0, 80));
    } finally {
      setSaving(false);
    }
  }

  const statusBadgeClass = calculationState === 'validating' ? 'badge-warn' : calculationState === 'error' ? 'badge-danger' : 'badge-ok';
  const statusLabel = calculationState === 'validating' ? 'Actualizando' : calculationState === 'error' ? 'Revisar datos' : 'Planteamiento vivo';

  return (
    <main className="app-shell">
      <header className="topbar">
        <div className="brand">
          <div className="brand-mark">TgM</div>
          <div>
            <h1>Toldos Testar</h1>
            <span>{catalog ? `${catalog.models.length} modelos · ${catalog.fabricStats.total} telas · ${catalog.referenceStats.total} referencias` : 'Cargando catálogo'}</span>
          </div>
        </div>
        <div className="topbar-status">
          <span className={statusBadgeClass}>{statusLabel}</span>
        </div>
        <div className="topbar-actions">
          <button className="primary-button" type="button" disabled={saving} onClick={() => saveLegacyReservation()}>
            <Save aria-hidden="true" />
            {saving ? 'Guardando…' : 'Guardar RPS'}
          </button>
          <button className="ghost-button" type="button" disabled={saving} onClick={exportReservation}>
            <Download aria-hidden="true" />
            Resumen
          </button>
        </div>
      </header>

      <nav className="app-tabs" aria-label="Vistas">
        <TabButton active={activeTab === 'order'} icon={<ClipboardList />} label="Pedido" onClick={() => setActiveTab('order')} />
        <TabButton active={activeTab === 'history'} icon={<History />} label="Historial" onClick={() => setActiveTab('history')} />
      </nav>

      {activeTab === 'order' && (
        <OrderView
          orderCode={draft.orderCode}
          customer={draft.customer}
          orderDate={draft.orderDate}
          technician={draft.technician}
          reviewer={draft.reviewer}
          fabric={draft.fabric}
          remate={draft.remate}
          curvaBamba={draft.curvaBamba}
          bambaDistinta={draft.bambaDistinta}
          telaBamba={draft.telaBamba}
          structureColor={draft.structureColor}
          rotTela={draft.rotTela}
          rotBamba={draft.rotBamba}
          notes={draft.notes}
          awnings={draft.awnings}
          calculation={calculation}
          calculationState={calculationState}
          setOrderCode={draft.setOrderCode}
          setCustomer={draft.setCustomer}
          setOrderDate={draft.setOrderDate}
          setTechnician={draft.setTechnician}
          setReviewer={draft.setReviewer}
          setFabric={draft.setFabric}
          setRemate={draft.setRemate}
          setCurvaBamba={draft.setCurvaBamba}
          setBambaDistinta={draft.setBambaDistinta}
          setTelaBamba={draft.setTelaBamba}
          setStructureColor={draft.setStructureColor}
          setRotTela={draft.setRotTela}
          setRotBamba={draft.setRotBamba}
          setNotes={draft.setNotes}
          addAwning={draft.addAwning}
          duplicateAwning={draft.duplicateAwning}
          removeAwning={draft.removeAwning}
          updateAwning={draft.updateAwning}
        />
      )}

      {activeTab === 'history' && <HistoryView entries={draft.historyEntries} onReuse={reuseHistory} />}
      {toast && (
        <div className="toast">
          {toast}
          <button className="toast-close" type="button" onClick={() => setToast('')} aria-label="Cerrar">×</button>
        </div>
      )}
    </main>
  );
}

createRoot(document.getElementById('root')!).render(<App />);
