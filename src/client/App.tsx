import React, { useEffect, useState } from 'react';
import {
  ClipboardList,
  Eraser,
  Eye,
  FolderCog,
  Inbox,
  Save,
  ShieldCheck,
  SlidersHorizontal,
  X
} from 'lucide-react';
import '@fontsource-variable/plus-jakarta-sans';
import './styles.css';
import type { ActiveTab, Catalog, OrderAutofill, ReviewPackage, WorkflowReadiness, WorkflowSettings } from './types';
import { useDraft } from './hooks/useDraft';
import { useCalculation } from './hooks/useCalculation';
import { TabButton } from './components/TabButton';
import { PdfPreviewPages } from './components/PdfPreviewPages';
import { OrderView } from './views/OrderView';
import { ParametersView } from './views/ParametersView';
import { useParameters } from './hooks/useParameters';
import { ReviewsView } from './views/ReviewsView';
import { SettingsView } from './views/SettingsView';
import { NotificationCenter, useNotifications } from './components/NotificationCenter';
import { todayIso } from './constants';

export default function App() {
  const draft = useDraft();
  const ruleSettings = useParameters();
  const [catalog, setCatalog] = useState<Catalog | null>(null);
  const [activeTab, setActiveTab] = useState<ActiveTab>('order');
  const [working, setWorking] = useState<'review' | 'preview' | null>(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const [workflowSettings, setWorkflowSettings] = useState<WorkflowSettings | null>(null);
  const [workflowReadiness, setWorkflowReadiness] = useState<WorkflowReadiness | null>(null);
  const [reviewRefresh, setReviewRefresh] = useState(0);
  const [autofillLoading, setAutofillLoading] = useState(false);
  const [autofill, setAutofill] = useState<OrderAutofill | null>(null);
  const { toasts, dialog, notify, askForConfirmation, dismissToast, resolveDialog } = useNotifications();

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
      .catch(() => notify('No se pudo cargar el catálogo.', { tone: 'error' }));
  }, [notify]);

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
      .catch(() => notify('No se pudo cargar la configuración de carpetas.', { tone: 'error' }));
  }, [notify]);

  useEffect(() => () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
  }, [previewUrl]);

  async function autofillOrder() {
    const orderCode = draft.orderCode.trim();
    if (!orderCode) {
      notify('Indica primero el número de pedido.', { tone: 'warning' });
      return;
    }
    const hasFormData = Boolean(draft.customer || draft.fabric || draft.notes || draft.awnings.length > 0);
    if (hasFormData) {
      const choice = await askForConfirmation({
        title: `Obtener datos de ${orderCode}`,
        message: 'Los datos actuales del formulario se sustituirán por lo disponible en RPS. Después podrás editar libremente todos los campos.',
        confirmLabel: 'Obtener y rellenar',
        cancelLabel: 'Conservar formulario',
        tone: 'warning'
      });
      if (choice !== 'confirm') return;
    }

    setAutofillLoading(true);
    try {
      const response = await fetch(`/api/orders/${encodeURIComponent(orderCode)}/autofill`);
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'No se pudieron obtener los datos del pedido.');
      const result = data as OrderAutofill;
      const currentResult = { ...result, order: { ...result.order, orderDate: todayIso() } };
      draft.loadOrder(currentResult.order);
      setAutofill(currentResult);
      const elements = result.order.awnings.length;
      notify(
        `${result.recovered.length} campos y ${elements} ${elements === 1 ? 'elemento recuperado' : 'elementos recuperados'}. ${result.pending.length === 1 ? 'Queda 1 dato' : `Quedan ${result.pending.length} datos`} por revisar.`,
        { tone: result.pending.length > 0 ? 'info' : 'success', title: 'Pedido autocompletado' }
      );
    } catch (error) {
      notify(error instanceof Error ? error.message : 'No se pudieron obtener los datos del pedido.', { tone: 'error' });
    } finally {
      setAutofillLoading(false);
    }
  }

  function updateOrderCode(value: string) {
    draft.setOrderCode(value);
    if (autofill && value !== autofill.order.orderCode) setAutofill(null);
  }

  async function editReview(review: ReviewPackage) {
    const hasDraftData = Boolean(
      draft.orderCode || draft.customer || draft.fabric || draft.notes
      || draft.awnings.some((awning) => awning.model || awning.of || awning.width || awning.projection)
    );
    if (hasDraftData) {
      const choice = await askForConfirmation({
        title: `Corregir ${review.orderCode}`,
        message: 'Los datos que haya ahora en Pedido se sustituirán por esta revisión. Los archivos ya guardados no se modificarán hasta que vuelvas a guardar.',
        confirmLabel: 'Abrir para corregir',
        cancelLabel: 'Conservar formulario',
        tone: 'warning'
      });
      if (choice !== 'confirm') return;
    }
    draft.loadOrder(review.order);
    setAutofill(null);
    if (review.order.parameters) ruleSettings.loadParameters(review.order.parameters);
    setActiveTab('order');
    notify(`Pedido ${review.orderCode} cargado en el formulario para corregirlo.`, { tone: 'info', title: 'Modo de corrección' });
  }

  async function reuseReview(review: ReviewPackage) {
    const choice = await askForConfirmation({
      title: `Reutilizar ${review.orderCode}`,
      message: 'Se sustituirá el formulario por los datos históricos, incluidos el número de pedido y las OF, y se recalculará con los parámetros actuales. Cámbialos antes de guardar si vas a crear un pedido nuevo.',
      confirmLabel: 'Reutilizar datos',
      cancelLabel: 'Conservar formulario',
      tone: 'warning'
    });
    if (choice !== 'confirm') return;
    draft.reuseOrder(review.order);
    setAutofill(null);
    setActiveTab('order');
    notify(`Datos de ${review.orderCode} cargados en el formulario.`, { tone: 'success', title: 'Datos reutilizados' });
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
      notes: draft.notes,
      awnings: draft.awnings,
      parameters: ruleSettings.parameters
    };
  }

  async function saveForReview(confirmOverwrite = false) {
    if (!calculation || calculation.ofs.length === 0) {
      notify('Completa al menos un toldo antes de guardarlo para revisión.', { tone: 'warning' });
      return;
    }
    if (!draft.orderCode.trim()) {
      notify('Indica el número de pedido para crear el archivo de revisión.', { tone: 'warning' });
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
        const choice = await askForConfirmation({
          title: `Actualizar ${draft.orderCode}`,
          message: 'Este pedido ya está en la bandeja de revisión. Si continúas, el PDF actual se sustituirá por los datos del formulario.',
          confirmLabel: 'Actualizar pedido',
          cancelLabel: 'Conservar el actual',
          tone: 'warning',
          details: data.existing
        });
        if (choice === 'confirm') await saveForReview(true);
        return;
      }
      if (!response.ok) {
        notify(data.error || 'No se pudo guardar el pedido para revisión.', { tone: 'error' });
        return;
      }
      setReviewRefresh((value) => value + 1);
      draft.resetDraft();
      notify(`${data.review.orderCode}.pdf guardado en ${data.savedPath}. El formulario se ha limpiado.`, { tone: 'success', title: 'Guardado para revisión' });
    } catch {
      notify('No se pudo guardar el pedido para revisión.', { tone: 'error' });
    } finally {
      setWorking(null);
    }
  }

  async function openPlanteamientoPreview() {
    if (!calculation || calculation.ofs.length === 0) {
      notify('Completa al menos un toldo para ver el planteamiento.', { tone: 'warning' });
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
        notify(data.error || 'No se pudo generar la vista previa.', { tone: 'error' });
        return;
      }
      const blob = await response.blob();
      setPreviewUrl((current) => {
        if (current) URL.revokeObjectURL(current);
        return URL.createObjectURL(blob);
      });
    } catch {
      notify('No se pudo generar la vista previa.', { tone: 'error' });
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

  async function clearForm() {
    const hasData = Boolean(
      draft.orderCode || draft.customer || draft.fabric
      || draft.awnings.some((awning) => awning.model || awning.of || awning.width || awning.projection)
    );
    if (hasData) {
      const choice = await askForConfirmation({
        title: 'Limpiar el formulario',
        message: 'Se borrarán todos los datos del pedido actual. Esta acción no elimina los archivos que ya estén guardados.',
        confirmLabel: 'Limpiar formulario',
        cancelLabel: 'Volver al pedido',
        tone: 'danger'
      });
      if (choice !== 'confirm') return;
    }
    draft.resetDraft();
    setAutofill(null);
    setActiveTab('order');
    notify('El formulario está listo para un pedido nuevo.', { tone: 'success', title: 'Formulario limpio' });
  }

  const statusBadgeClass = calculationState === 'validating' ? 'badge-warn' : calculationState === 'error' ? 'badge-danger' : calculationState === 'idle' ? 'badge-neutral' : 'badge-ok';
  const statusLabel = calculationState === 'validating' ? 'Actualizando' : calculationState === 'error' ? 'Revisar datos' : calculationState === 'idle' ? 'Esperando pedido' : 'Planteamiento vivo';
  const viewTitle = activeTab === 'order'
    ? 'Nuevo planteamiento'
    : activeTab === 'parameters'
      ? 'Parámetros de modelos'
      : activeTab === 'reviews'
        ? 'Revisión de pedidos'
        : 'Configuración de carpetas';

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
          <TabButton active={activeTab === 'order'} disabled={working === 'review'} icon={<ClipboardList />} label="Pedido" onClick={() => setActiveTab('order')} />
          <TabButton active={activeTab === 'parameters'} disabled={working === 'review'} icon={<SlidersHorizontal />} label="Parámetros" onClick={() => setActiveTab('parameters')} />
          <TabButton active={activeTab === 'reviews'} disabled={working === 'review'} icon={<Inbox />} label="Revisión" onClick={() => setActiveTab('reviews')} />
          <TabButton active={activeTab === 'settings'} disabled={working === 'review'} icon={<FolderCog />} label="Configuración" onClick={() => setActiveTab('settings')} />
        </nav>

        <div className="sidebar-meta">
          <div className={`production-mode ${workflowReadiness?.productionReady ? 'is-ready' : ''}`}>
            <ShieldCheck aria-hidden="true" />
            <div><strong>{workflowReadiness?.productionReady ? 'Generación disponible' : workflowReadiness?.reviewReady ? 'Revisión disponible' : 'Configura la revisión'}</strong><small>Aprobar y generar son pasos separados</small></div>
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
              <button className="ghost-button clear-form-button" type="button" disabled={Boolean(working)} onClick={() => void clearForm()}>
                <Eraser aria-hidden="true" />
                Limpiar
              </button>
              <button className="ghost-button" type="button" disabled={Boolean(working) || calculationState === 'validating' || draft.awnings.length === 0} onClick={openPlanteamientoPreview}>
                <Eye aria-hidden="true" />
                {working === 'preview' ? 'Preparando…' : 'Vista previa'}
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
            <fieldset className="order-form-fieldset" disabled={working === 'review'} aria-busy={working === 'review'}>
              <OrderView
                availableModelNames={catalog?.models.map((model) => model.code) ?? []}
                orderCode={draft.orderCode}
                customer={draft.customer}
                orderDate={draft.orderDate}
                technician={draft.technician}
                reviewer={draft.reviewer}
                fabric={draft.fabric}
                sameFabric={draft.sameFabric}
                notes={draft.notes}
                remate={draft.remate}
                remateColor={draft.remateColor}
                awnings={draft.awnings}
                calculation={calculation}
                calculationState={calculationState}
                parameters={ruleSettings.parameters}
                setOrderCode={updateOrderCode}
                setCustomer={draft.setCustomer}
                setOrderDate={draft.setOrderDate}
                setTechnician={draft.setTechnician}
                setReviewer={draft.setReviewer}
                setFabric={draft.setFabric}
                setSameFabric={draft.setSameFabric}
                setNotes={draft.setNotes}
                setRemate={draft.setRemate}
                setRemateColor={draft.setRemateColor}
                addAwning={draft.addAwning}
                duplicateAwning={draft.duplicateAwning}
                removeAwning={draft.removeAwning}
                updateAwning={draft.updateAwning}
                onAutofill={() => void autofillOrder()}
                autofillLoading={autofillLoading}
                autofill={autofill}
              />
            </fieldset>
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

          {activeTab === 'reviews' && (
            <ReviewsView
              refreshKey={reviewRefresh}
              parameters={ruleSettings.parameters}
              onOpen={editReview}
              onReuse={reuseReview}
              onToast={notify}
              onConfirm={askForConfirmation}
            />
          )}
          {activeTab === 'settings' && (
            workflowSettings && workflowReadiness
              ? <SettingsView
                  settings={workflowSettings}
                  readiness={workflowReadiness}
                  onSaved={(settings, readiness) => { setWorkflowSettings(settings); setWorkflowReadiness(readiness); }}
                  onToast={notify}
                />
              : <section className="settings-panel panel">Cargando configuración…</section>
          )}
        </div>
      </section>
      <NotificationCenter
        toasts={toasts}
        dialog={dialog}
        onDismissToast={dismissToast}
        onResolveDialog={resolveDialog}
      />
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
