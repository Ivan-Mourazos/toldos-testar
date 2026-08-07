import React, { useEffect, useState } from 'react';
import {
  ClipboardList,
  Eraser,
  Eye,
  FileText,
  FolderCog,
  Inbox,
  Save,
  ShieldCheck,
  SlidersHorizontal,
  X
} from 'lucide-react';
import '@fontsource-variable/plus-jakarta-sans';
import './styles.css';
import type { ActiveTab, Catalog, ReviewPackage, WorkflowReadiness, WorkflowSettings } from './types';
import { useDraft } from './hooks/useDraft';
import { useCalculation } from './hooks/useCalculation';
import { TabButton } from './components/TabButton';
import { PdfPreviewPages } from './components/PdfPreviewPages';
import { OrderView } from './views/OrderView';
import { ParametersView } from './views/ParametersView';
import { useParameters } from './hooks/useParameters';
import { ReviewsView } from './views/ReviewsView';
import { SettingsView } from './views/SettingsView';

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
}

function reviewPdfFilename(orderCode: string) {
  const clean = orderCode.trim().toUpperCase().replace(/[^A-Z0-9_-]+/g, '').slice(0, 80);
  return `${clean || 'PEDIDO'}.pdf`;
}

export default function App() {
  const draft = useDraft();
  const ruleSettings = useParameters();
  const [catalog, setCatalog] = useState<Catalog | null>(null);
  const [activeTab, setActiveTab] = useState<ActiveTab>('order');
  const [toast, setToast] = useState('');
  const [working, setWorking] = useState<'review' | 'reviewPdf' | 'preview' | null>(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const [workflowSettings, setWorkflowSettings] = useState<WorkflowSettings | null>(null);
  const [workflowReadiness, setWorkflowReadiness] = useState<WorkflowReadiness | null>(null);
  const [reviewRefresh, setReviewRefresh] = useState(0);

  const { calculation, calculationState } = useCalculation({
    activeTab,
    orderCode: draft.orderCode,
    customer: draft.customer,
    orderDate: draft.orderDate,
    technician: draft.technician,
    reviewer: draft.reviewer,
    fabric: draft.fabric,
    sameFabric: draft.sameFabric,
    remate: draft.remate,
    remateColor: draft.remateColor,
    structureColor: draft.structureColor,
    rotTela: draft.rotTela,
    rotBamba: draft.rotBamba,
    awnings: draft.awnings,
    parameters: ruleSettings.parameters
  });

  useEffect(() => {
    fetch('/api/catalog')
      .then((response) => response.json())
      .then(setCatalog)
      .catch(() => setToast('No se pudo cargar el catálogo.'));
  }, []);

  useEffect(() => {
    fetch('/api/workflow/settings')
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.error);
        return data;
      })
      .then((data) => {
        setWorkflowSettings(data.settings);
        setWorkflowReadiness(data.readiness);
      })
      .catch(() => setToast('No se pudo cargar la configuración de carpetas.'));
  }, []);

  // Auto-dismiss toast
  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(''), 5000);
    return () => window.clearTimeout(timer);
  }, [toast]);

  useEffect(() => () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
  }, [previewUrl]);

  function openReview(review: ReviewPackage) {
    draft.loadOrder(review.order);
    if (review.order.parameters) ruleSettings.loadParameters(review.order.parameters);
    setActiveTab('order');
    setToast(`Pedido ${review.orderCode} abierto desde la bandeja de revisión.`);
  }

  function currentOrderPayload() {
    return {
      orderCode: draft.orderCode,
      customer: draft.customer,
      orderDate: draft.orderDate,
      technician: draft.technician,
      reviewer: draft.reviewer,
      fabric: draft.fabric,
      sameFabric: draft.sameFabric,
      remate: draft.remate,
      remateColor: draft.remateColor,
      structureColor: draft.structureColor,
      rotTela: draft.rotTela,
      rotBamba: draft.rotBamba,
      awnings: draft.awnings,
      parameters: ruleSettings.parameters
    };
  }

  async function saveForReview(confirmOverwrite = false) {
    if (!calculation || calculation.ofs.length === 0) {
      setToast('Completa al menos un toldo antes de guardarlo para revisión.');
      return;
    }
    if (!draft.orderCode.trim()) {
      setToast('Indica el número de pedido para crear el archivo de revisión.');
      return;
    }
    setWorking('review');
    try {
      const response = await fetch('/api/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ order: currentOrderPayload(), confirmOverwrite })
      });
      const data = await response.json();
      if (response.status === 409 && data.needsConfirmation) {
        const ok = window.confirm(`El pedido ${draft.orderCode} ya está en revisión. ¿Quieres actualizarlo con estos datos?`);
        if (ok) await saveForReview(true);
        return;
      }
      if (!response.ok) {
        setToast(data.error || 'No se pudo guardar el pedido para revisión.');
        return;
      }
      setReviewRefresh((value) => value + 1);
      setToast(`${data.review.orderCode}.pdf guardado en la carpeta TOLDOS para revisión.`);
    } catch {
      setToast('No se pudo guardar el pedido para revisión.');
    } finally {
      setWorking(null);
    }
  }

  async function openPlanteamientoPreview() {
    if (!calculation || calculation.ofs.length === 0) {
      setToast('Completa al menos un toldo para ver el planteamiento.');
      return;
    }
    setWorking('preview');
    try {
      const response = await fetch('/api/planteamiento', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ order: currentOrderPayload() })
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        setToast(data.error || 'No se pudo generar la vista previa.');
        return;
      }
      const blob = await response.blob();
      setPreviewUrl((current) => {
        if (current) URL.revokeObjectURL(current);
        return URL.createObjectURL(blob);
      });
    } catch {
      setToast('No se pudo generar la vista previa.');
    } finally {
      setWorking(null);
    }
  }

  async function downloadReviewPdf() {
    if (draft.awnings.length === 0) {
      setToast('Añade al menos un toldo para generar la ficha de revisión.');
      return;
    }
    setWorking('reviewPdf');
    try {
      const response = await fetch('/api/review-pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ order: currentOrderPayload() })
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        setToast(data.error || 'No se pudo generar la ficha de revisión.');
        return;
      }
      const filename = reviewPdfFilename(draft.orderCode);
      downloadBlob(await response.blob(), filename);
      setToast(`Ficha ${filename} descargada. No se ha enviado a producción.`);
    } catch {
      setToast('No se pudo generar la ficha de revisión.');
    } finally {
      setWorking(null);
    }
  }

  function closePreview() {
    setPreviewUrl((current) => {
      if (current) URL.revokeObjectURL(current);
      return '';
    });
  }

  function clearForm() {
    const hasData = Boolean(
      draft.orderCode || draft.customer || draft.fabric
      || draft.awnings.some((awning) => awning.model || awning.of || awning.width || awning.projection)
    );
    if (hasData && !window.confirm('Se borrarán todos los datos del formulario actual. ¿Continuar?')) return;
    draft.resetDraft();
    setActiveTab('order');
    setToast('Formulario limpio.');
  }

  const statusBadgeClass = calculationState === 'validating' ? 'badge-warn' : calculationState === 'error' ? 'badge-danger' : calculationState === 'idle' ? 'badge-neutral' : 'badge-ok';
  const statusLabel = calculationState === 'validating' ? 'Actualizando' : calculationState === 'error' ? 'Revisar datos' : calculationState === 'idle' ? 'Esperando pedido' : 'Planteamiento vivo';
  const viewTitle = activeTab === 'order'
    ? 'Nuevo planteamiento'
    : activeTab === 'parameters'
      ? 'Parámetros de modelos'
      : activeTab === 'reviews'
        ? 'Revisión de pedidos'
        : 'Configuración de producción';

  return (
    <main className="app-shell">
      <aside className="app-sidebar">
        <div className="brand">
          <div className="brand-mark"><img src="/logo-tgm-transparent.png" alt="TGM" /></div>
          <div>
            <h1>Toldos</h1>
            <span>Planteamientos</span>
          </div>
        </div>

        <nav className="app-tabs" aria-label="Vistas">
          <TabButton active={activeTab === 'order'} icon={<ClipboardList />} label="Pedido" onClick={() => setActiveTab('order')} />
          <TabButton active={activeTab === 'parameters'} icon={<SlidersHorizontal />} label="Parámetros" onClick={() => setActiveTab('parameters')} />
          <TabButton active={activeTab === 'reviews'} icon={<Inbox />} label="Revisión" onClick={() => setActiveTab('reviews')} />
          <TabButton active={activeTab === 'settings'} icon={<FolderCog />} label="Configuración" onClick={() => setActiveTab('settings')} />
        </nav>

        <div className="sidebar-meta">
          <div className={`production-mode ${workflowReadiness?.productionReady ? 'is-ready' : ''}`}>
            <ShieldCheck aria-hidden="true" />
            <div><strong>{workflowReadiness?.productionReady ? 'Producción activa' : 'Revisión segura'}</strong><small>{workflowReadiness?.productionReady ? 'Aprobación obligatoria' : 'Configura las rutas finales'}</small></div>
          </div>
          <span className={statusBadgeClass}>{statusLabel}</span>
          <small>{catalog ? `${catalog.models.length} modelos · ${catalog.fabricStats.total} telas` : 'Cargando catálogo'}</small>
          <small>{catalog ? `${catalog.referenceStats.total} referencias` : ''}</small>
        </div>
      </aside>

      <section className="app-workspace">
        <header className="topbar">
          <div className="workspace-heading">
            <span>Oficina técnica</span>
            <h2>{viewTitle}</h2>
          </div>
          {activeTab === 'order' && (
            <div className="topbar-actions">
              <button className="ghost-button clear-form-button" type="button" disabled={Boolean(working)} onClick={clearForm}>
                <Eraser aria-hidden="true" />
                Limpiar
              </button>
              <button className="ghost-button" type="button" disabled={Boolean(working) || calculationState === 'validating' || draft.awnings.length === 0} onClick={openPlanteamientoPreview}>
                <Eye aria-hidden="true" />
                {working === 'preview' ? 'Preparando…' : 'Vista previa'}
              </button>
              <button className="ghost-button" type="button" disabled={Boolean(working) || calculationState === 'validating' || draft.awnings.length === 0} onClick={downloadReviewPdf}>
                <FileText aria-hidden="true" />
                {working === 'reviewPdf' ? 'Generando…' : 'PDF revisión'}
              </button>
              <button className="primary-button" type="button" disabled={Boolean(working) || calculationState === 'validating' || draft.awnings.length === 0} onClick={() => void saveForReview()}>
                <Save aria-hidden="true" />
                {working === 'review' ? 'Guardando…' : 'Guardar para revisión'}
              </button>
            </div>
          )}
        </header>

        <div className="workspace-content">
          {activeTab === 'order' && (
            <OrderView
          orderCode={draft.orderCode}
          customer={draft.customer}
          orderDate={draft.orderDate}
          technician={draft.technician}
          reviewer={draft.reviewer}
          fabric={draft.fabric}
          sameFabric={draft.sameFabric}
          remate={draft.remate}
          remateColor={draft.remateColor}
          awnings={draft.awnings}
          calculation={calculation}
          calculationState={calculationState}
          parameters={ruleSettings.parameters}
          setOrderCode={draft.setOrderCode}
          setCustomer={draft.setCustomer}
          setOrderDate={draft.setOrderDate}
          setTechnician={draft.setTechnician}
          setReviewer={draft.setReviewer}
          setFabric={draft.setFabric}
          setSameFabric={draft.setSameFabric}
          setRemate={draft.setRemate}
          setRemateColor={draft.setRemateColor}
          addAwning={draft.addAwning}
          duplicateAwning={draft.duplicateAwning}
          removeAwning={draft.removeAwning}
          updateAwning={draft.updateAwning}
            />
          )}

          {activeTab === 'parameters' && (
            <ParametersView
              parameters={ruleSettings.parameters}
              onUpdateArzua={ruleSettings.updateArzua}
              onUpdateGalicia={ruleSettings.updateGalicia}
              onResetArzua={ruleSettings.resetArzua}
              onResetGalicia={ruleSettings.resetGalicia}
              onUpdatePerlaBox={ruleSettings.updatePerlaBox}
              onResetPerlaBox={ruleSettings.resetPerlaBox}
              onUpdateCoralBox={ruleSettings.updateCoralBox}
              onResetCoralBox={ruleSettings.resetCoralBox}
              onUpdateCuarzoBox={ruleSettings.updateCuarzoBox}
              onResetCuarzoBox={ruleSettings.resetCuarzoBox}
              onUpdateCortina={ruleSettings.updateCortina}
              onResetCortina={ruleSettings.resetCortina}
              onUpdateCambioCortina={ruleSettings.updateCambioCortina}
              onResetCambioCortina={ruleSettings.resetCambioCortina}
              onUpdateXacobeo={ruleSettings.updateXacobeo}
              onResetXacobeo={ruleSettings.resetXacobeo}
              onUpdatePuntoRecto={ruleSettings.updatePuntoRecto}
              onResetPuntoRecto={ruleSettings.resetPuntoRecto}
              onUpdateMonoblock350={ruleSettings.updateMonoblock350}
              onResetMonoblock350={ruleSettings.resetMonoblock350}
              onUpdateMaxiscreem={ruleSettings.updateMaxiscreem}
              onResetMaxiscreem={ruleSettings.resetMaxiscreem}
              onUpdateAmbarBox={ruleSettings.updateAmbarBox}
              onResetAmbarBox={ruleSettings.resetAmbarBox}
              onUpdateAgataBox={ruleSettings.updateAgataBox}
              onResetAgataBox={ruleSettings.resetAgataBox}
              onUpdateFabricJobs={ruleSettings.updateFabricJobs}
              onResetFabricJobs={ruleSettings.resetFabricJobs}
            />
          )}

          {activeTab === 'reviews' && <ReviewsView refreshKey={reviewRefresh} onOpen={openReview} onToast={setToast} />}
          {activeTab === 'settings' && (
            workflowSettings && workflowReadiness
              ? <SettingsView
                  settings={workflowSettings}
                  readiness={workflowReadiness}
                  onSaved={(settings, readiness) => { setWorkflowSettings(settings); setWorkflowReadiness(readiness); }}
                  onToast={setToast}
                />
              : <section className="settings-panel panel">Cargando configuración…</section>
          )}
        </div>
      </section>
      {toast && (
        <div className="toast">
          {toast}
          <button className="toast-close" type="button" onClick={() => setToast('')} aria-label="Cerrar">×</button>
        </div>
      )}
      {previewUrl && (
        <div className="pdf-preview-backdrop" role="dialog" aria-modal="true" aria-label="Vista previa del planteamiento">
          <div className="pdf-preview-window">
            <header>
              <div><strong>Vista previa del planteamiento</strong><span>Estructuras A5 y telas A4</span></div>
              <div className="pdf-preview-actions">
                <button className="ghost-button" type="button" onClick={openPlanteamientoPreview}><Eye aria-hidden="true" />Actualizar</button>
                <button className="icon-button" type="button" onClick={closePreview} aria-label="Cerrar vista previa"><X aria-hidden="true" /></button>
              </div>
            </header>
            <PdfPreviewPages key={previewUrl} url={previewUrl} />
          </div>
        </div>
      )}
    </main>
  );
}
