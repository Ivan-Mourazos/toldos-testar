import React, { useEffect, useRef, useState } from 'react';
import {
  ClipboardList,
  Eraser,
  Eye,
  FolderCog,
  Inbox,
  Save,
  SlidersHorizontal,
  UserRound,
  X, Undo2 } from 'lucide-react';
import '@fontsource-variable/plus-jakarta-sans';
import './styles.css';
import './relieve.css';
import type { ActiveTab, Catalog, OrderAutofill, ReviewPackage, WorkflowReadiness, WorkflowSettings } from './types';
import { useDraft } from './hooks/useDraft';
import { useCalculation } from './hooks/useCalculation';
import { TabButton } from './components/TabButton';
import { incompleteAwningLines } from './incompleteAwnings';
import { PdfPreviewViewer } from './components/PdfPreviewViewer';
import { controlLabel } from './components/controlLabels';
import { OrderView } from './views/OrderView';
import { ParametersView } from './views/ParametersView';
import { useParameters, type SaveDraftResult } from './hooks/useParameters';
import { ParametersSaveBar } from './components/ParametersSaveBar';
import { ParameterSectionIndex } from './components/ParameterSectionIndex';
import { ParametersHistory } from './components/ParametersHistory';
import { formOptions } from '../domain/modelBehavior.js';
import { ReviewsView } from './views/ReviewsView';
import { SettingsView } from './views/SettingsView';
import { NotificationCenter, useNotifications } from './components/NotificationCenter';
import { todayIso } from './constants';
import { readCurrentUser, saveCurrentUser } from './currentUser';
import { WhoAreYouDialog } from './components/WhoAreYouDialog';
import { stampAuthorship } from './authorship';
import { usePendingReviews } from './hooks/usePendingReviews';

export default function App() {
  const draft = useDraft();
  const ruleSettings = useParameters();
  const [catalog, setCatalog] = useState<Catalog | null>(null);
  const [activeTab, setActiveTab] = useState<ActiveTab>('order');
  const [working, setWorking] = useState<'review' | 'preview' | null>(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const previewButtonRef = useRef<HTMLButtonElement>(null);
  const previewDialogRef = useRef<HTMLDivElement>(null);
  const [workflowSettings, setWorkflowSettings] = useState<WorkflowSettings | null>(null);
  const [workflowReadiness, setWorkflowReadiness] = useState<WorkflowReadiness | null>(null);
  const [reviewRefresh, setReviewRefresh] = useState(0);
  const [autofillLoading, setAutofillLoading] = useState(false);
  const [autofill, setAutofill] = useState<OrderAutofill | null>(null);
  // Nota del revisor al devolver un pedido: se ve en Pedido mientras se corrige.
  const [returnNote, setReturnNote] = useState<{ by: string; at: string; note: string } | null>(null);
  // OF del pedido según RPS, junto al pedido al que pertenecen. Solo valen si ese
  // pedido es el que está en pantalla: así una revisión abierta o un formulario
  // vaciado no se comparan con las OF del pedido anterior. null = no se conocen y
  // no se avisa de nada.
  const [orderOfs, setOrderOfs] = useState<{ orderCode: string; ofs: string[] } | null>(null);
  // Quién usa este navegador (diseño 24/09/2026, apartado 2): pone el autor/revisor
  // del pedido al guardar sin preguntarlo.
  const [currentUser, setCurrentUser] = useState(() => readCurrentUser());
  const [choosingUser, setChoosingUser] = useState(false);
  function chooseUser(name: string) { saveCurrentUser(name); setCurrentUser(name); setChoosingUser(false); }
  const { toasts, dialog, notify, askForConfirmation, dismissToast, resolveDialog } = useNotifications();
  // Pendientes de generar (año actual y anterior): alimentan la bandeja y el contador
  // «Pedidos · N» desde que carga la página, y se releen al guardar o generar.
  const pendingReviews = usePendingReviews(reviewRefresh, notify);
  const pendingCount = pendingReviews.reviews.length;

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

  useEffect(() => {
    if (!previewUrl) return;
    const focusFrame = requestAnimationFrame(() => previewDialogRef.current?.querySelector<HTMLElement>('.pdf-carousel')?.focus());
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      event.preventDefault();
      setPreviewUrl('');
      requestAnimationFrame(() => previewButtonRef.current?.focus());
    };
    window.addEventListener('keydown', onKeyDown);
    return () => {
      cancelAnimationFrame(focusFrame);
      window.removeEventListener('keydown', onKeyDown);
    };
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

  // Se consulta cada vez que cambia el pedido, venga de teclearlo, del autorrelleno o
  // de abrir una revisión, con una pausa para no preguntar a cada tecla. Cualquier
  // fallo deja el estado en desconocido y en silencio: se puede plantear un pedido
  // sin RPS y eso no cambia.
  const currentOrderCode = draft.orderCode.trim();
  useEffect(() => {
    // Con el pedido vacío no se pregunta: la lista guardada deja de coincidir con él y
    // `knownOfs` queda en null sin tocar el estado.
    if (!currentOrderCode) return undefined;
    let cancelled = false;
    const timer = setTimeout(async () => {
      try {
        const response = await fetch(`/api/orders/${encodeURIComponent(currentOrderCode)}/ofs`);
        const data = response.ok ? await response.json() as { ofs?: string[] } : null;
        if (!cancelled) setOrderOfs(Array.isArray(data?.ofs) ? { orderCode: currentOrderCode, ofs: data.ofs } : null);
      } catch {
        if (!cancelled) setOrderOfs(null);
      }
    }, 400);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [currentOrderCode]);
  const knownOfs = orderOfs && orderOfs.orderCode === currentOrderCode ? orderOfs.ofs : null;

  async function editReview(review: ReviewPackage) {
    const hasDraftData = Boolean(
      draft.orderCode || draft.customer || draft.fabric || draft.notes
      || draft.awnings.some((awning) => awning.model || awning.of || awning.width || awning.projection)
    );
    if (hasDraftData) {
      const choice = await askForConfirmation({
        title: `Corregir ${review.orderCode}`,
        message: 'Los datos que haya ahora en Nuevo pedido se sustituirán por los de este pedido. Los archivos ya guardados no se modificarán hasta que vuelvas a guardar.',
        confirmLabel: 'Abrir para corregir',
        cancelLabel: 'Conservar formulario',
        tone: 'warning'
      });
      if (choice !== 'confirm') return;
    }
    draft.loadOrder(review.order);
    setAutofill(null);
    setReturnNote(review.status === 'CHANGES_REQUESTED' && review.reviewNote
      ? { by: review.reviewedBy, at: review.reviewedAt || '', note: review.reviewNote }
      : null);
    if (review.order.parameters) ruleSettings.loadParameters(review.order.parameters, review.order.parametersVersion ?? null);
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
    // Es un pedido nuevo: el autor lo pone quien lo guarde, no el del histórico reutilizado.
    draft.setTechnician('');
    draft.setReviewer('');
    setAutofill(null);
    setActiveTab('order');
    notify(`Datos de ${review.orderCode} cargados en el formulario.`, { tone: 'success', title: 'Datos reutilizados' });
  }

  function currentOrderPayload() {
    const authorship = stampAuthorship({ technician: draft.technician, reviewer: draft.reviewer }, currentUser);
    return {
      orderCode: draft.orderCode,
      customer: draft.customer,
      orderDate: draft.orderDate,
      technician: authorship.technician,
      reviewer: authorship.reviewer,
      fabric: draft.fabric,
      sameFabric: draft.sameFabric,
      remate: draft.remate,
      remateColor: draft.remateColor,
      structureColor: draft.structureColor,
      rotTela: draft.rotTela,
      rotBamba: draft.rotBamba,
      notes: draft.notes,
      awnings: draft.awnings,
      parameters: ruleSettings.parameters,
      parametersVersion: ruleSettings.parametersVersion
    };
  }

  async function discardParameterDraft() {
    const choice = await askForConfirmation({
      title: 'Descartar cambios de parámetros',
      message: 'Se perderán los cambios que no has guardado. Los parámetros comunes no cambian.',
      confirmLabel: 'Descartar',
      cancelLabel: 'Seguir editando',
      tone: 'warning'
    });
    if (choice === 'confirm') ruleSettings.discardDraft();
  }

  function notifyParameterSave(result: SaveDraftResult) {
    if (result.status === 'saved') notify('Los parámetros nuevos ya se usan en todos los puestos.', { tone: 'success', title: 'Parámetros guardados' });
    else if (result.status === 'conflict') notify('Otro puesto guardó cambios antes. Tu borrador sigue aquí: revísalo y vuelve a guardar.', { tone: 'warning', title: 'Parámetros actualizados por otro puesto' });
    else notify(result.message || 'No se pudieron guardar los parámetros.', { tone: 'error' });
  }

  async function saveForReview(confirmOverwrite = false, confirmIncomplete = false) {
    const incomplete = incompleteAwningLines(draft.awnings, { fabric: draft.fabric, sameFabric: draft.sameFabric });
    if (!calculation || calculation.ofs.length === 0) {
      notify(incomplete.length ? incomplete.join('. ') : 'Añade al menos un toldo antes de guardarlo para revisión.', { tone: 'warning', title: 'Faltan datos' });
      return;
    }
    if (incomplete.length && !confirmIncomplete) {
      const choice = await askForConfirmation({
        title: 'Hay elementos sin completar',
        message: 'Se puede guardar como borrador para revisión, pero no se podrán generar los archivos definitivos hasta completarlos.',
        confirmLabel: 'Guardar igualmente',
        cancelLabel: 'Seguir completando',
        tone: 'warning',
        details: incomplete
      });
      if (choice !== 'confirm') return;
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
        body: JSON.stringify({ order: currentOrderPayload(), confirmOverwrite, savedBy: currentUser })
      });
      const data = await response.json();
      if (response.status === 409 && data.needsConfirmation) {
        const choice = await askForConfirmation({
          title: `Actualizar ${draft.orderCode}`,
          message: 'Este pedido ya está guardado en Pedidos. Si continúas, el PDF actual se sustituirá por los datos del formulario.',
          confirmLabel: 'Actualizar pedido',
          cancelLabel: 'Conservar el actual',
          tone: 'warning',
          details: data.existing
        });
        if (choice === 'confirm') await saveForReview(true, true);
        return;
      }
      if (!response.ok) {
        notify(data.error || 'No se pudo guardar el pedido para revisión.', { tone: 'error' });
        return;
      }
      setReviewRefresh((value) => value + 1);
      setReturnNote(null);
      draft.resetDraft();
      ruleSettings.restoreParameters();
      notify(`Guardado en Pedidos para revisión: ${data.review.orderCode}.pdf`, { tone: 'success', title: 'Guardado para revisión' });
    } catch {
      notify('No se pudo guardar el pedido para revisión.', { tone: 'error' });
    } finally {
      setWorking(null);
    }
  }

  async function openPlanteamientoPreview() {
    if (!calculation || calculation.ofs.length === 0) {
      const incomplete = incompleteAwningLines(draft.awnings, { fabric: draft.fabric, sameFabric: draft.sameFabric });
      notify(incomplete.length ? incomplete.join('. ') : 'Añade al menos un toldo para ver el planteamiento.', { tone: 'warning', title: 'Faltan datos' });
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
      setPreviewUrl(URL.createObjectURL(blob));
    } catch {
      notify('No se pudo generar la vista previa.', { tone: 'error' });
    } finally {
      setWorking(null);
    }
  }

  function closePreview() {
    setPreviewUrl('');
    requestAnimationFrame(() => previewButtonRef.current?.focus());
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
    ruleSettings.restoreParameters();
    setAutofill(null);
    setReturnNote(null);
    setActiveTab('order');
    notify('El formulario está listo para un pedido nuevo.', { tone: 'success', title: 'Formulario limpio' });
  }

  const viewTitle = activeTab === 'order'
    ? 'Nuevo pedido'
    : activeTab === 'parameters'
      ? 'Parámetros de modelos'
      : activeTab === 'reviews'
        ? 'Pedidos'
        : 'Configuración de carpetas';

  return (
    <main className="app-shell">
      <header className="app-topnav">
        <div className="brand">
          <div className="brand-mark"><img src="/logo-tgm-transparent.png" alt="TGM" /></div>
          <div><h1>Toldos</h1><span>Planteamientos</span></div>
        </div>
        {/* Barra superior (diseño 24/09/2026, apartado 1): la lateral quitaba 204 px a 1280. */}
        <nav className="app-tabs" aria-label="Vistas">
          <TabButton active={activeTab === 'order'} disabled={working === 'review'} icon={<ClipboardList />} label="Nuevo pedido" onClick={() => setActiveTab('order')} />
          <TabButton active={activeTab === 'reviews'} disabled={working === 'review'} icon={<Inbox />} label={pendingCount ? `Pedidos · ${pendingCount}` : 'Pedidos'} onClick={() => setActiveTab('reviews')} />
          <TabButton active={activeTab === 'parameters'} disabled={working === 'review'} icon={<SlidersHorizontal />} label="Parámetros" onClick={() => setActiveTab('parameters')} />
          <TabButton active={activeTab === 'settings'} disabled={working === 'review'} icon={<FolderCog />} label="Configuración" onClick={() => setActiveTab('settings')} />
        </nav>
        <button type="button" className="app-current-user tecla-3d sobre-oscuro" onClick={() => setChoosingUser(true)} aria-label="Cambiar quién soy">
          <UserRound aria-hidden="true" />Soy: {currentUser ? controlLabel(currentUser) : '—'}
        </button>
      </header>

      <section className="app-workspace">
        <header className="topbar">
          <div className="workspace-heading">
            <h2>{viewTitle}</h2>
          </div>
          {activeTab === 'order' && (
            <div className="topbar-actions">
              <button className="ghost-button clear-form-button" type="button" disabled={Boolean(working)} onClick={() => void clearForm()}>
                <Eraser aria-hidden="true" />
                Limpiar
              </button>
              <button ref={previewButtonRef} className="ghost-button" type="button" disabled={Boolean(working) || calculationState === 'validating' || draft.awnings.length === 0} onClick={openPlanteamientoPreview}>
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
          {activeTab === 'order' && returnNote && (
            <div className="review-state-note is-returned order-return-note" role="status">
              <Undo2 aria-hidden="true" />
              <span>
                <strong>Devuelto por {controlLabel(returnNote.by) || 'el revisor'}{returnNote.at ? ` · ${new Date(returnNote.at).toLocaleString('es-ES', { dateStyle: 'short', timeStyle: 'short' })}` : ''}</strong>
                {returnNote.note}
              </span>
            </div>
          )}
          {activeTab === 'order' && (
            <fieldset className="order-form-fieldset" disabled={working === 'review'} aria-busy={working === 'review'}>
              <OrderView
                availableModelNames={catalog?.models.map((model) => model.code) ?? []}
                orderCode={draft.orderCode}
                customer={draft.customer}
                orderDate={draft.orderDate}
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
                knownOfs={knownOfs}
                getPanelOrder={currentOrderPayload}
                onConfirm={askForConfirmation}
              />
            </fieldset>
          )}

          {activeTab === 'parameters' && (
            <>
            <ParametersSaveBar
              dirty={ruleSettings.dirty}
              saving={ruleSettings.saving}
              technicians={formOptions.tecnicos}
              onDiscard={() => void discardParameterDraft()}
              onSave={ruleSettings.saveDraft}
              onResult={notifyParameterSave}
            />
            <ParametersHistory version={ruleSettings.version} onLoadVersion={ruleSettings.loadVersion} />
            <ParameterSectionIndex />
            <ParametersView
              parameters={ruleSettings.generalParameters}
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
              onUpdateSelena={ruleSettings.updateSelena}
              onResetSelena={ruleSettings.resetSelena}
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
              onUpdateElectra={ruleSettings.updateElectra}
              onResetElectra={ruleSettings.resetElectra}
              onUpdateAmbarBox={ruleSettings.updateAmbarBox}
              onResetAmbarBox={ruleSettings.resetAmbarBox}
              onUpdateAgataBox={ruleSettings.updateAgataBox}
              onResetAgataBox={ruleSettings.resetAgataBox}
              onUpdateFabricJobs={ruleSettings.updateFabricJobs}
              onResetFabricJobs={ruleSettings.resetFabricJobs}
              onUpdateDrawings={ruleSettings.updateDrawings}
            />
            </>
          )}

          {activeTab === 'reviews' && (
            <ReviewsView
              refreshKey={reviewRefresh}
              parameters={ruleSettings.parameters}
              currentUser={currentUser}
              pending={pendingReviews.reviews}
              pendingLoading={pendingReviews.loading}
              onChanged={() => setReviewRefresh((value) => value + 1)}
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
              : <section className="settings-panel panel panel-3d">Cargando configuración…</section>
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
        <div ref={previewDialogRef} className="pdf-preview-backdrop" role="dialog" aria-modal="true" aria-label="Vista previa del planteamiento">
          <div className="pdf-preview-window">
            <header>
              <div><strong>Vista previa del planteamiento</strong><span>Estructuras A5 y telas A4</span></div>
              <div className="pdf-preview-actions">
                <button className="ghost-button" type="button" onClick={openPlanteamientoPreview}><Eye aria-hidden="true" />Actualizar</button>
                <button className="icon-button" type="button" onClick={closePreview} aria-label="Cerrar vista previa"><X aria-hidden="true" /></button>
              </div>
            </header>
            <PdfPreviewViewer key={previewUrl} url={previewUrl} />
          </div>
        </div>
      )}
      {(!currentUser || choosingUser) && (
        <WhoAreYouDialog current={currentUser} onChoose={chooseUser} onCancel={currentUser ? () => setChoosingUser(false) : undefined} />
      )}
    </main>
  );
}
