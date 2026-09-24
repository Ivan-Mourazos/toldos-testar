import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { FileSpreadsheet, Layers3, Scissors, X } from 'lucide-react';
import type { Awning, Calculation } from '../types';
import { awningLetter, describeMissing, getMissingFields } from '../../domain/awningCompleteness.js';
import { controlLabel, legacyModelName } from './controlLabels';
import { FabricSheet, StructureSheet } from './LiveResults';
import { awningReservationRows } from '../awningPanel';
import { formatDecimal } from '../constants';
import { PdfPreviewViewer } from './PdfPreviewViewer';

type PanelTab = 'despiece' | 'dibujo' | 'reserva';

// El pedido tal como se envía para generar el planteamiento (parámetros, tela, remate…).
// Con la tela basta para saber qué le falta al toldo; el resto hace falta para su PDF.
export type PanelOrder = { fabric: string; sameFabric: boolean } & Record<string, unknown>;

type Props = {
  awning: Awning;
  index: number;
  calculation: Calculation | null;
  order: PanelOrder;
  onUpdate: (id: string, patch: Partial<Awning>) => void;
  onClose: () => void;
};

// Panel lateral «Despiece y dibujo» de un toldo (rediseño 3 §2). Es un <dialog> modal,
// como la vista previa de la revisión: Esc, la X o un clic fuera lo cierran y el foco
// vuelve al botón que lo abrió. Reutiliza las hojas de «Planteamientos».
export function AwningPanel({ awning, index, calculation, order, onUpdate, onClose }: Props) {
  const letter = awningLetter(index);
  // Como la tarjeta: «Tela A» para un trabajo de tela, «Toldo A» para un toldo.
  const elementName = `${awning.workType === 'FABRIC_ONLY' ? 'Tela' : 'Toldo'} ${letter}`;
  const block = calculation?.ofs.find((ofBlock) => ofBlock.awningId === awning.id && ofBlock.calculation);
  const hasStructure = awning.workType !== 'FABRIC_ONLY' && Boolean(block?.despiece);
  const [chosenTab, setTab] = useState<PanelTab>(hasStructure ? 'despiece' : 'dibujo');
  const tab = chosenTab === 'despiece' && !hasStructure ? 'dibujo' : chosenTab;
  const dialogRef = useRef<HTMLDialogElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const pressedOnBackdrop = useRef(false);
  const tabs: Array<{ id: PanelTab; label: string; icon: React.ReactNode }> = [
    ...(hasStructure ? [{ id: 'despiece' as const, label: 'Despiece', icon: <Layers3 aria-hidden="true" /> }] : []),
    { id: 'dibujo', label: 'Dibujo', icon: <Scissors aria-hidden="true" /> },
    { id: 'reserva', label: 'Reserva', icon: <FileSpreadsheet aria-hidden="true" /> }
  ];

  useLayoutEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const previousOverflow = document.body.style.overflow;
    dialog.showModal();
    document.body.style.overflow = 'hidden';
    closeRef.current?.focus();
    return () => {
      dialog.close();
      document.body.style.overflow = previousOverflow;
      opener?.focus({ preventScroll: true });
    };
  }, []);

  function moveTab(event: React.KeyboardEvent, current: number) {
    if (event.key !== 'ArrowRight' && event.key !== 'ArrowLeft') return;
    // Que no llegue al visor del PDF, que también cambia de página con las flechas.
    event.preventDefault();
    event.stopPropagation();
    const next = tabs[(current + (event.key === 'ArrowRight' ? 1 : tabs.length - 1)) % tabs.length];
    setTab(next.id);
    document.getElementById(`awning-panel-tab-${next.id}`)?.focus();
  }

  const missing = getMissingFields(awning, order);
  const reservation = block && calculation ? awningReservationRows(calculation, awning.id) : [];

  // El <dialog> no tiene relleno: un clic sobre él mismo solo puede ser en el fondo. Se
  // cierra al soltar (click), no al pulsar: si no, el clic acabaría en la página de detrás
  // y le quitaría el foco al botón que lo abrió. Un arrastre desde dentro no lo cierra.
  return (
    <dialog
      ref={dialogRef}
      className="awning-panel"
      aria-modal="true"
      aria-label={`Despiece y dibujo ${awning.workType === 'FABRIC_ONLY' ? 'de la tela' : 'del toldo'} ${letter}`}
      onCancel={(event) => { event.preventDefault(); onClose(); }}
      onMouseDown={(event) => { pressedOnBackdrop.current = event.target === event.currentTarget; }}
      onClick={(event) => { if (pressedOnBackdrop.current && event.target === event.currentTarget) onClose(); }}
    >
      <div className="awning-panel-inner">
        <header className="awning-panel-header">
          <div>
            <span>Despiece y dibujo</span>
            <h2>
              {elementName} · {controlLabel(awning.model) || 'sin modelo'}
              {legacyModelName(awning.model) && <small>antes {legacyModelName(awning.model)}</small>}
            </h2>
          </div>
          <dl className="awning-panel-meta">
            <dt>OF</dt><dd>{block?.of || awning.of || '-'}</dd>
            {block?.calculation && <><dt>Estado</dt><dd className={block.calculation.valid ? 'text-ok' : 'text-danger'}>{block.calculation.valid ? 'Válido' : 'Revisar'}</dd></>}
          </dl>
          <button ref={closeRef} type="button" className="icon-button" onClick={onClose} aria-label="Cerrar panel"><X aria-hidden="true" /></button>
        </header>

        {!block ? (
          <div className="awning-panel-empty">
            <p><strong>Completa el toldo para ver su despiece</strong></p>
            {missing.length > 0 && <p>Falta {describeMissing(missing)}.</p>}
          </div>
        ) : (
          <>
            <div className="planning-tabs awning-panel-tabs" role="tablist" aria-label={`Vistas de ${elementName}`} style={{ gridTemplateColumns: `repeat(${tabs.length}, minmax(0, 1fr))` }}>
              {tabs.map((item, position) => (
                <button
                  key={item.id}
                  id={`awning-panel-tab-${item.id}`}
                  type="button"
                  role="tab"
                  aria-selected={tab === item.id}
                  aria-controls="awning-panel-tabpanel"
                  tabIndex={tab === item.id ? 0 : -1}
                  className={tab === item.id ? 'active' : ''}
                  onClick={() => setTab(item.id)}
                  onKeyDown={(event) => moveTab(event, position)}
                >
                  {item.icon}<span>{item.label}</span>
                </button>
              ))}
            </div>
            <div className="awning-panel-body" id="awning-panel-tabpanel" role="tabpanel" aria-labelledby={`awning-panel-tab-${tab}`}>
              {tab === 'despiece' && <div className="structure-sheet-preview"><StructureSheet block={block} awning={awning} onUpdate={onUpdate} /></div>}
              {tab === 'dibujo' && <>
                <AwningDrawingPreview awning={awning} order={order} />
                <FabricSheet block={block} awning={awning} onUpdate={onUpdate} />
              </>}
              {tab === 'reserva' && (reservation.length === 0
                ? <p className="result-empty">Este toldo todavía no tiene líneas de reserva.</p>
                : (
                  <div className="rps-result-preview">
                    <div className="rps-table-wrap"><table className="rps-table"><thead><tr><th>OF</th><th>Artículo</th><th>Descripción</th><th className="num">Cantidad total</th></tr></thead><tbody>
                      {reservation.map((row, rowIndex) => <tr key={`${row.of}-${row.code}-${rowIndex}`}><td>{row.of}</td><td className="code">{row.code}</td><td>{row.description || '-'}</td><td className="num">{formatDecimal(row.quantity)}</td></tr>)}
                    </tbody></table></div>
                  </div>
                ))}
            </div>
          </>
        )}
      </div>
    </dialog>
  );
}

// El dibujo de la tela es el del PDF del planteamiento: se pide el de este toldo solo y
// se abre en su hoja de tela. Espera un momento tras cada cambio, como el cálculo.
function AwningDrawingPreview({ awning, order }: { awning: Awning; order: PanelOrder }) {
  const requestBody = JSON.stringify({ order: { ...order, awnings: [awning] } });
  const [preview, setPreview] = useState<{ source: string; status: 'ready' | 'error'; url: string; error: string } | null>(null);
  const visible = preview && preview.source === requestBody ? preview : null;

  useEffect(() => {
    const controller = new AbortController();
    let objectUrl = '';
    const timer = window.setTimeout(async () => {
      try {
        const response = await fetch('/api/planteamiento', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: requestBody,
          signal: controller.signal
        });
        if (!response.ok) {
          const data = await response.json().catch(() => ({}));
          throw new Error(data.error || 'No se pudo preparar el dibujo.');
        }
        const blob = await response.blob();
        if (controller.signal.aborted) return;
        objectUrl = URL.createObjectURL(blob);
        setPreview({ source: requestBody, status: 'ready', url: objectUrl, error: '' });
      } catch (error) {
        if (controller.signal.aborted) return;
        setPreview({ source: requestBody, status: 'error', url: '', error: error instanceof Error ? error.message : 'No se pudo preparar el dibujo.' });
      }
    }, 350);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [requestBody]);

  return (
    <section className="awning-panel-drawing" aria-label="Dibujo de la tela" aria-busy={!visible}>
      {!visible && <p className="awning-panel-drawing-state" role="status">Preparando el dibujo…</p>}
      {visible?.status === 'error' && <p className="awning-panel-drawing-state is-error" role="alert">{visible.error}</p>}
      {visible?.status === 'ready' && <PdfPreviewViewer key={visible.url} url={visible.url} startAt="firstWide" ariaLabel={`Dibujo de la tela · OF ${awning.of || 'sin OF'}`} />}
    </section>
  );
}
