import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import {
  ClipboardList,
  Eraser,
  Eye,
  FileDown,
  FileSpreadsheet,
  FlaskConical,
  History,
  SlidersHorizontal,
  X
} from 'lucide-react';
import '@fontsource-variable/plus-jakarta-sans';
import './styles.css';
import type { ActiveTab, Catalog } from './types';
import { fileNameFromDisposition } from './constants';
import { useDraft } from './hooks/useDraft';
import { useCalculation } from './hooks/useCalculation';
import { TabButton } from './components/TabButton';
import { PdfPreviewPages } from './components/PdfPreviewPages';
import { OrderView } from './views/OrderView';
import { HistoryView } from './views/HistoryView';
import { ParametersView } from './views/ParametersView';
import { useParameters } from './hooks/useParameters';

type WritableFileHandle = {
  createWritable: () => Promise<{
    write: (data: Blob) => Promise<void>;
    close: () => Promise<void>;
  }>;
};

type WindowWithFilePicker = Window & {
  showSaveFilePicker?: (options: {
    suggestedName: string;
    types: Array<{ description: string; accept: Record<string, string[]> }>;
  }) => Promise<WritableFileHandle>;
};

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
}

function suggestedPdfName(orderCode: string) {
  const clean = orderCode.trim().toUpperCase().replace(/[^A-Z0-9_-]+/g, '').slice(0, 80);
  return `${clean || 'PLANTEAMIENTO'}-1.pdf`;
}

function App() {
  const draft = useDraft();
  const ruleSettings = useParameters();
  const [catalog, setCatalog] = useState<Catalog | null>(null);
  const [activeTab, setActiveTab] = useState<ActiveTab>('order');
  const [toast, setToast] = useState('');
  const [working, setWorking] = useState<'rps' | 'pdf' | 'preview' | null>(null);
  const [previewUrl, setPreviewUrl] = useState('');

  const { calculation, calculationState, reservation } = useCalculation({
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
    curvaBamba: draft.curvaBamba,
    bambaDistinta: draft.bambaDistinta,
    telaBamba: draft.telaBamba,
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

  // Auto-dismiss toast
  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(''), 5000);
    return () => window.clearTimeout(timer);
  }, [toast]);

  useEffect(() => () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
  }, [previewUrl]);

  function reuseHistory(entry: Parameters<typeof draft.reuseHistory>[0]) {
    draft.reuseHistory(entry);
    setActiveTab('order');
    setToast(`Pedido ${entry.orderCode || 'sin número'} cargado desde historial.`);
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
      curvaBamba: draft.curvaBamba,
      bambaDistinta: draft.bambaDistinta,
      telaBamba: draft.telaBamba,
      structureColor: draft.structureColor,
      rotTela: draft.rotTela,
      rotBamba: draft.rotBamba,
      awnings: draft.awnings,
      parameters: ruleSettings.parameters
    };
  }

  async function simulateReservation() {
    if (reservation.ofs.length === 0) {
      setToast('Todavía no hay materiales calculados para simular.');
      return;
    }

    setWorking('rps');
    try {
      const response = await fetch('/api/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(reservation)
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        setToast(data.error || 'No se pudo generar la simulación RPS.');
        return;
      }

      const blob = await response.blob();
      const filename = fileNameFromDisposition(response.headers.get('content-disposition')) || 'simulacion-rps-toldos.xls';
      downloadBlob(blob, filename);
      setToast('Simulación RPS descargada. No se ha guardado nada en las carpetas compartidas.');
    } catch {
      setToast('No se pudo generar la simulación RPS.');
    } finally {
      setWorking(null);
    }
  }

  async function savePlanteamientoPdf() {
    if (!calculation || calculation.ofs.length === 0) {
      setToast('Completa al menos un toldo para generar el planteamiento.');
      return;
    }

    const picker = (window as WindowWithFilePicker).showSaveFilePicker;
    let handle: WritableFileHandle | null = null;

    if (picker) {
      try {
        handle = await picker({
          suggestedName: suggestedPdfName(draft.orderCode),
          types: [{ description: 'Documento PDF', accept: { 'application/pdf': ['.pdf'] } }]
        });
      } catch (error) {
        if (error instanceof DOMException && error.name === 'AbortError') return;
        setToast('No se pudo abrir el selector de archivo.');
        return;
      }
    }

    setWorking('pdf');
    try {
      const response = await fetch('/api/planteamiento', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ order: currentOrderPayload() })
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        setToast(data.error || 'No se pudo generar el planteamiento PDF.');
        return;
      }

      const blob = await response.blob();
      const filename = fileNameFromDisposition(response.headers.get('content-disposition')) || suggestedPdfName(draft.orderCode);
      if (handle) {
        const writable = await handle.createWritable();
        await writable.write(blob);
        await writable.close();
      } else {
        downloadBlob(blob, filename);
      }
      setToast(handle ? `Planteamiento guardado como ${filename}.` : `Planteamiento ${filename} descargado.`);
    } catch {
      setToast('No se pudo generar o guardar el planteamiento PDF.');
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

  const statusBadgeClass = calculationState === 'validating' ? 'badge-warn' : calculationState === 'error' ? 'badge-danger' : 'badge-ok';
  const statusLabel = calculationState === 'validating' ? 'Actualizando' : calculationState === 'error' ? 'Revisar datos' : 'Planteamiento vivo';
  const viewTitle = activeTab === 'order'
    ? 'Nuevo planteamiento'
    : activeTab === 'parameters'
      ? 'Parámetros de modelos'
      : 'Historial de pedidos';

  return (
    <main className="app-shell">
      <aside className="app-sidebar">
        <div className="brand">
          <div className="brand-mark">TgM</div>
          <div>
            <h1>Toldos</h1>
            <span>Planteamientos</span>
          </div>
        </div>

        <nav className="app-tabs" aria-label="Vistas">
          <TabButton active={activeTab === 'order'} icon={<ClipboardList />} label="Pedido" onClick={() => setActiveTab('order')} />
          <TabButton active={activeTab === 'parameters'} icon={<SlidersHorizontal />} label="Parámetros" onClick={() => setActiveTab('parameters')} />
          <TabButton active={activeTab === 'history'} icon={<History />} label="Historial" onClick={() => setActiveTab('history')} />
        </nav>

        <div className="sidebar-meta">
          <div className="simulation-mode">
            <FlaskConical aria-hidden="true" />
            <div><strong>Modo pruebas</strong><small>No guarda reservas</small></div>
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
              <button className="ghost-button" type="button" disabled={Boolean(working) || calculationState === 'validating'} onClick={simulateReservation}>
                <FileSpreadsheet aria-hidden="true" />
                {working === 'rps' ? 'Generando…' : 'Simular RPS'}
              </button>
              <button className="ghost-button" type="button" disabled={Boolean(working) || calculationState === 'validating'} onClick={openPlanteamientoPreview}>
                <Eye aria-hidden="true" />
                {working === 'preview' ? 'Preparando…' : 'Vista previa'}
              </button>
              <button className="primary-button" type="button" disabled={Boolean(working) || calculationState === 'validating'} onClick={savePlanteamientoPdf}>
                <FileDown aria-hidden="true" />
                {working === 'pdf' ? 'Generando…' : 'Guardar PDF'}
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
          curvaBamba={draft.curvaBamba}
          bambaDistinta={draft.bambaDistinta}
          telaBamba={draft.telaBamba}
          structureColor={draft.structureColor}
          rotTela={draft.rotTela}
          rotBamba={draft.rotBamba}
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
          setCurvaBamba={draft.setCurvaBamba}
          setBambaDistinta={draft.setBambaDistinta}
          setTelaBamba={draft.setTelaBamba}
          setStructureColor={draft.setStructureColor}
          setRotTela={draft.setRotTela}
          setRotBamba={draft.setRotBamba}
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
            />
          )}

          {activeTab === 'history' && <HistoryView entries={draft.historyEntries} onReuse={reuseHistory} />}
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
                <button className="primary-button" type="button" onClick={savePlanteamientoPdf}><FileDown aria-hidden="true" />Guardar PDF</button>
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

createRoot(document.getElementById('root')!).render(<App />);
