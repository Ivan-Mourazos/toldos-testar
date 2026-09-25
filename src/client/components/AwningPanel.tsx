import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { FileSpreadsheet, Layers3, Scissors, X } from 'lucide-react';
import type { Awning, Calculation } from '../types';
import { awningLetter, describeMissing, getMissingFields } from '../../domain/awningCompleteness.js';
import { controlLabel, legacyModelName } from './controlLabels';
import { FabricSheet, StructureSheet } from './LiveResults';
import { awningReservationRows } from '../awningPanel';
import { formatDecimal } from '../constants';
import { PdfPreviewViewer } from './PdfPreviewViewer';
import type { AskForConfirmation } from './NotificationCenter';

type PanelTab = 'despiece' | 'dibujo' | 'reserva';

// El pedido tal como se envía para generar el planteamiento (parámetros, tela, remate…).
// Con la tela basta para saber qué le falta al toldo; el resto hace falta para su PDF.
export type PanelOrder = { fabric: string; sameFabric: boolean } & Record<string, unknown>;

// El PDF del dibujo ya pedido: se guarda en el panel para no volver a pedirlo cada vez
// que se vuelve a la pestaña «Dibujo». `body` es la petición con la que se hizo.
type Drawing = { body: string; status: 'ready' | 'error'; url: string; error: string };

type Props = {
  awning: Awning;
  index: number;
  calculation: Calculation | null;
  order: PanelOrder;
  onUpdate: (id: string, patch: Partial<Awning>) => void;
  onClose: () => void;
  // Confirmación de la aplicación, para no perder un despiece a medio editar.
  onConfirm?: AskForConfirmation;
};

// Panel lateral «Despiece y dibujo» de un toldo (rediseño 3 §2). Es un <dialog> modal,
// como la vista previa de la revisión: Esc, la X o un clic fuera lo cierran y el foco
// vuelve al botón que lo abrió. Reutiliza las hojas de «Planteamientos».
export function AwningPanel({ awning, index, calculation, order, onUpdate, onClose, onConfirm }: Props) {
  const letter = awningLetter(index);
  const fabricOnly = awning.workType === 'FABRIC_ONLY';
  // Como la tarjeta: «Tela A» para un trabajo de tela, «Toldo A» para un toldo.
  const elementName = `${fabricOnly ? 'Tela' : 'Toldo'} ${letter}`;
  const block = calculation?.ofs.find((ofBlock) => ofBlock.awningId === awning.id && ofBlock.calculation);
  const hasStructure = !fabricOnly && Boolean(block?.despiece);
  const [chosenTab, setTab] = useState<PanelTab>(hasStructure ? 'despiece' : 'dibujo');
  const tab = chosenTab === 'despiece' && !hasStructure ? 'dibujo' : chosenTab;
  // Mientras se edita el despiece, el panel no se cierra ni cambia de pestaña sin preguntar:
  // la edición vive en el editor y se perdería sin avisar.
  const [editingDespiece, setEditingDespiece] = useState(false);
  const [drawing, setDrawing] = useState<Drawing | null>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const pressedOnBackdrop = useRef(false);
  // Abierto para React: lo cierra la limpieza del montaje, no un cierre nativo.
  const open = useRef(false);
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
    open.current = true;
    document.body.style.overflow = 'hidden';
    closeRef.current?.focus();
    return () => {
      open.current = false;
      if (dialog.open) dialog.close();
      document.body.style.overflow = previousOverflow;
      opener?.focus({ preventScroll: true });
    };
  }, []);

  // El PDF se revoca solo cuando otro lo sustituye o al cerrar el panel: mientras siga en
  // el estado se puede volver a enseñar (ida y vuelta de pestañas o de un dato).
  const drawingUrl = drawing?.url;
  useEffect(() => () => { if (drawingUrl) URL.revokeObjectURL(drawingUrl); }, [drawingUrl]);

  async function confirmDiscard() {
    if (!editingDespiece) return true;
    if (!onConfirm) return false;
    const choice = await onConfirm({
      title: 'Despiece sin guardar',
      message: 'Hay cambios del despiece sin guardar. ¿Descartarlos?',
      confirmLabel: 'Descartar',
      cancelLabel: 'Seguir editando',
      tone: 'warning'
    });
    return choice === 'confirm';
  }

  async function requestClose() {
    if (await confirmDiscard()) onClose();
  }

  // Esc hace lo mismo que la X: con el despiece en edición, pregunta. Se atiende en keydown
  // y se evita el comportamiento nativo: Chrome, tras varios «cancel» evitados seguidos,
  // cierra el <dialog> por su cuenta sin avisar a React. Un Esc que ya ha usado otro
  // control (un desplegable abierto) no llega aquí.
  function handleEscape(event: React.KeyboardEvent) {
    if (event.key !== 'Escape' || event.defaultPrevented) return;
    event.preventDefault();
    void requestClose();
  }

  async function chooseTab(next: PanelTab) {
    if (next === tab) return;
    if (!(await confirmDiscard())) return;
    setTab(next);
    document.getElementById(`awning-panel-tab-${next}`)?.focus();
  }

  function moveTab(event: React.KeyboardEvent, current: number) {
    const targets: Record<string, number> = {
      ArrowRight: (current + 1) % tabs.length,
      ArrowLeft: (current + tabs.length - 1) % tabs.length,
      Home: 0,
      End: tabs.length - 1
    };
    if (!(event.key in targets)) return;
    // Que no llegue al visor del PDF, que también cambia de página con las flechas.
    event.preventDefault();
    event.stopPropagation();
    void chooseTab(tabs[targets[event.key]].id);
  }

  const missing = getMissingFields(awning, order);
  const reservation = block && calculation ? awningReservationRows(calculation, awning.id) : [];

  // El <dialog> no tiene relleno: un clic sobre él mismo solo puede ser en el fondo. Se
  // cierra al soltar (click), no al pulsar: si no, el clic acabaría en la página de detrás
  // y le quitaría el foco al botón que lo abrió. Un arrastre desde dentro no lo cierra.
  // Con el despiece en edición, Esc, la X y el fondo preguntan antes de cerrar. Si el
  // <dialog> se cerrase aun así por su cuenta, el panel se da por cerrado (onClose) para
  // que el estado y la página no se queden a medias.
  return (
    <dialog
      ref={dialogRef}
      className="awning-panel"
      aria-label={`Despiece y dibujo ${fabricOnly ? 'de la tela' : 'del toldo'} ${letter}`}
      onKeyDown={handleEscape}
      onCancel={(event) => { event.preventDefault(); void requestClose(); }}
      onClose={() => { if (open.current) onClose(); }}
      onMouseDown={(event) => { pressedOnBackdrop.current = event.target === event.currentTarget; }}
      onClick={(event) => { if (pressedOnBackdrop.current && event.target === event.currentTarget) void requestClose(); }}
    >
      <div className="awning-panel-inner">
        <header className="awning-panel-header">
          <div>
            <span>Despiece y dibujo</span>
            <h2>
              {elementName} · {controlLabel(awning.model) || 'sin modelo'}
              {legacyModelName(awning.model) && <small>{legacyModelName(awning.model)}</small>}
            </h2>
          </div>
          <dl className="awning-panel-meta">
            <dt>OF</dt><dd>{block?.of || awning.of || '-'}</dd>
            {block?.calculation && <><dt>Estado</dt><dd className={block.calculation.valid ? 'text-ok' : 'text-danger'}>{block.calculation.valid ? 'Válido' : 'Revisar'}</dd></>}
          </dl>
          <button ref={closeRef} type="button" className="icon-button" onClick={() => void requestClose()} aria-label="Cerrar panel"><X aria-hidden="true" /></button>
        </header>

        {!block ? (
          <div className="awning-panel-empty">
            <p><strong>{fabricOnly ? 'Completa la tela para ver su dibujo' : 'Completa el toldo para ver su despiece'}</strong></p>
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
                  onClick={() => void chooseTab(item.id)}
                  onKeyDown={(event) => moveTab(event, position)}
                >
                  {item.icon}<span>{item.label}</span>
                </button>
              ))}
            </div>
            <div className="awning-panel-body" id="awning-panel-tabpanel" role="tabpanel" aria-labelledby={`awning-panel-tab-${tab}`}>
              {tab === 'despiece' && <div className="structure-sheet-preview"><StructureSheet block={block} awning={awning} onUpdate={onUpdate} onEditingChange={setEditingDespiece} /></div>}
              {tab === 'dibujo' && <>
                <AwningDrawingPreview awning={awning} order={order} drawing={drawing} onDrawing={setDrawing} />
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

// Devuelve el mismo objeto mientras sus campos no cambien: el pedido llega nuevo en cada
// render de la aplicación y, sin esto, se serializaría entero (imágenes incluidas) cada vez.
function useShallowStable<T extends Record<string, unknown>>(value: T): T {
  const [stable, setStable] = useState(value);
  const keys = Object.keys(value);
  const same = keys.length === Object.keys(stable).length && keys.every((key) => Object.is(value[key], stable[key]));
  if (!same) setStable(value);
  return same ? stable : value;
}

// El dibujo de la tela es el del PDF del planteamiento: se pide el pedido entero limitado
// a este toldo (así sale con su letra) y se abre en su hoja de tela. Espera un momento
// tras cada cambio, como el cálculo; si la petición no ha cambiado, reutiliza el PDF.
function AwningDrawingPreview({ awning, order, drawing, onDrawing }: {
  awning: Awning;
  order: PanelOrder;
  drawing: Drawing | null;
  onDrawing: (drawing: Drawing) => void;
}) {
  const stableOrder = useShallowStable(order);
  const requestBody = useMemo(() => JSON.stringify({ order: stableOrder, onlyAwningId: awning.id }), [stableOrder, awning.id]);
  const current = drawing?.body === requestBody;
  const visible = current ? drawing : null;

  useEffect(() => {
    if (current) return;
    const controller = new AbortController();
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
        onDrawing({ body: requestBody, status: 'ready', url: URL.createObjectURL(blob), error: '' });
      } catch (error) {
        if (controller.signal.aborted) return;
        onDrawing({ body: requestBody, status: 'error', url: '', error: error instanceof Error ? error.message : 'No se pudo preparar el dibujo.' });
      }
    }, 350);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [requestBody, current, onDrawing]);

  return (
    <section className="awning-panel-drawing" aria-label="Dibujo de la tela" aria-busy={!visible}>
      {!visible && <p className="awning-panel-drawing-state" role="status">Preparando el dibujo…</p>}
      {visible?.status === 'error' && <p className="awning-panel-drawing-state is-error" role="alert">{visible.error}</p>}
      {visible?.status === 'ready' && <PdfPreviewViewer key={visible.url} url={visible.url} startAt="firstWide" ariaLabel={`Dibujo de la tela · OF ${awning.of || 'sin OF'}`} />}
    </section>
  );
}
