import React, { useLayoutEffect, useRef, useState } from 'react';
import { FileSpreadsheet, Layers3, Scissors, X } from 'lucide-react';
import type { Awning, Calculation } from '../types';
import { awningLetter, describeMissing, getMissingFields } from '../../domain/awningCompleteness.js';
import { controlLabel, legacyModelName } from './controlLabels';
import { FabricSheet, StructureSheet } from './LiveResults';
import { awningReservationRows } from '../awningPanel';
import { formatDecimal } from '../constants';

type PanelTab = 'despiece' | 'dibujo' | 'reserva';

type Props = {
  awning: Awning;
  index: number;
  calculation: Calculation | null;
  // Tela del pedido: sin ella no se sabe qué le falta a un toldo con la misma tela.
  order: { fabric: string; sameFabric: boolean };
  onUpdate: (id: string, patch: Partial<Awning>) => void;
  onClose: () => void;
};

// Panel lateral «Despiece y dibujo» de un toldo (rediseño 3 §2). Es un <dialog> modal,
// como la vista previa de la revisión: Esc, la X o un clic fuera lo cierran y el foco
// vuelve al botón que lo abrió. Reutiliza las hojas de «Planteamientos».
export function AwningPanel({ awning, index, calculation, order, onUpdate, onClose }: Props) {
  const letter = awningLetter(index);
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
    event.preventDefault();
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
      aria-label={`Despiece y dibujo del toldo ${letter}`}
      onCancel={(event) => { event.preventDefault(); onClose(); }}
      onMouseDown={(event) => { pressedOnBackdrop.current = event.target === event.currentTarget; }}
      onClick={(event) => { if (pressedOnBackdrop.current && event.target === event.currentTarget) onClose(); }}
    >
      <div className="awning-panel-inner">
        <header className="awning-panel-header">
          <div>
            <span>Despiece y dibujo</span>
            <h2>
              Toldo {letter} · {controlLabel(awning.model) || 'sin modelo'}
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
            <div className="planning-tabs awning-panel-tabs" role="tablist" aria-label={`Vistas del toldo ${letter}`} style={{ gridTemplateColumns: `repeat(${tabs.length}, minmax(0, 1fr))` }}>
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
              {tab === 'dibujo' && <FabricSheet block={block} awning={awning} onUpdate={onUpdate} />}
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
