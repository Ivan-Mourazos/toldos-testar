import React, { useState } from 'react';
import type { Awning, FabricProposal, OrderAutofill } from '../types';
import { awningLetter } from '../../domain/awningCompleteness.js';
import { TextField } from './TextField';
import { OrderIdentity } from './OrderIdentity';
import { FabricCombobox } from './FabricCombobox';
import { ObservationLines } from './ObservationLines';
import { ReadModeContext } from './ReadMode';
import { fabricSelectionLabel } from '../../domain/fabricCatalog.js';
import { appliedProposalSelection } from '../fabricProposal';
import { FabricStockLine, FabricStockText } from './FabricStockLine';
import { fabricCodeOf } from '../fabricStock';
import { useFabricStocks } from '../hooks/useFabricStock';

type Props = {
  orderCode: string; onOrderCodeBlur?: () => void; customer: string; orderDate: string;
  fabric: string; sameFabric: boolean;
  notes: string; onNotesChange: (value: string) => void;
  set: (patch: Record<string, string | boolean>) => void;
  onAutofill: () => void;
  autofillLoading: boolean;
  autofill: OrderAutofill | null;
  fabricProposals?: FabricProposal[];
  // Las letras («B, C») de las propuestas de tela y la tela que lleva cada toldo, para
  // marcar la opción que el pedido tiene puesta de verdad.
  awnings: Pick<Awning, 'id' | 'fabric'>[];
  onApplyFabricProposal: (proposal: FabricProposal, selection: string) => void;
  // Propuestas cuya tela se puso sola y aún no se ha comprobado (índices de
  // autofill.fabricProposals), y la acción «Correcta».
  pendingProposals?: number[];
  onConfirmProposal?: (index: number) => void;
  // Metros que el pedido pide de la tela común, para compararlos con su stock.
  fabricNeedMl?: number;
  readOnly?: boolean;
};

// Letras de los toldos de una propuesta, en el orden A, B, C… del pedido.
function proposalLetters(proposal: FabricProposal, awnings: Pick<Awning, 'id'>[]) {
  return proposal.awningIds
    .map((id) => awnings.findIndex((awning) => awning.id === id))
    .filter((index) => index >= 0)
    .map((index) => awningLetter(index))
    .join(', ');
}

export function OrderHeader(props: Props) {
  // La opción marcada de cada bloque de propuestas sale del pedido, no de un clic
  // recordado (informe tela-0930, F3): si luego se vacía o cambia la tela, o se pasa a
  // «Por toldo», la marca lo refleja y el técnico no cree tener una tela que no tiene.
  const fabricOrder = { fabric: props.fabric, sameFabric: props.sameFabric, awnings: props.awnings };
  const pending = props.pendingProposals ?? [];
  const commonPending = props.sameFabric && Boolean(props.fabric) && pending.length > 0;
  const proposals = props.fabricProposals ?? props.autofill?.fabricProposals ?? [];
  const [proposalsOpen, setProposalsOpen] = useState(false);
  const needsFabricChoice = proposals.some((proposal) => !appliedProposalSelection(proposal, fabricOrder));
  const proposalStocks = useFabricStocks(props.readOnly || (!proposalsOpen && !needsFabricChoice) ? [] : proposals
    .flatMap((proposal) => proposal.options.slice(0, 5).map((option) => fabricCodeOf(option.selection))));

  function chooseFabricProposal(proposal: FabricProposal, selection: string) {
    if (props.readOnly) return;
    props.onApplyFabricProposal(proposal, selection);
  }

  // En el pedido abierto, pedido, cliente y fecha ya salen junto al título: aquí solo
  // queda la tela y sus observaciones, en una línea (Iván, 25/09/2026).
  if (props.readOnly) {
    return (
      <section className="order-header panel is-readonly order-header-compact" aria-readonly>
        <p className="order-header-read-line">
          <span className="read-label">Tela</span>
          <strong>{props.sameFabric ? (props.fabric ? fabricSelectionLabel(props.fabric) : '—') : 'Tela por toldo'}</strong>
        </p>
        <ReadModeContext.Provider value>
          <ObservationLines label="Observaciones de tela del pedido" value={props.notes} onChange={props.onNotesChange} />
        </ReadModeContext.Provider>
      </section>
    );
  }

  return (
    <section className="order-header panel order-header-simple">
      <OrderIdentity
        pedido={<TextField label="Pedido" value={props.orderCode} onChange={v => props.set({ orderCode: v })} onBlur={props.onOrderCodeBlur} placeholder="AR26xxxxx" />}
        cliente={props.customer} fecha={props.orderDate} onClienteChange={v => props.set({ customer: v })} onFechaChange={v => props.set({ orderDate: v })}
        />

      <div className="order-header-group order-header-material">
        <h3>Tela</h3>
        <div className="order-material-clusters">
          <section className="order-material-cluster order-fabric-cluster">
            <div className={`order-fabric-row${props.sameFabric ? '' : ' is-per-awning'}`}>
              {/* Con «Por toldo» la tela común no es la del pedido: enseñarla en gris hacía
                  creer que había una elegida (F4). */}
              {props.sameFabric
                ? <FabricCombobox label="Referencia" value={props.fabric} onChange={(v) => props.set({ fabric: v })} />
                : <div className="field order-fabric-per-awning-field"><span>Referencia</span><p className="order-fabric-per-awning-value">Tela por toldo · se elige en cada tarjeta</p></div>}
              {/* En lectura no se puede cambiar: el interruptor sobra y solo se indica si
                  cada toldo lleva su propia tela. */}
              {props.readOnly
                ? !props.sameFabric && <span className="order-fabric-per-awning-note">Tela por toldo</span>
                : <label className="order-fabric-per-awning">
                  <input
                    type="checkbox"
                    checked={!props.sameFabric}
                    onChange={(event) => props.set({ sameFabric: !event.target.checked })}
                  />
                  <span>Por toldo</span>
                </label>}
            </div>
            {props.sameFabric && !props.readOnly && (commonPending || props.fabric) && <div className="order-fabric-common-meta">
              {commonPending && <span className="fabric-proposal-pending">Propuesta · compruébala</span>}
              <FabricStockLine selection={props.fabric} neededMl={props.fabricNeedMl} />
            </div>}
            {/* La cabecera no está dentro de ReadModeContext (es un fieldset deshabilitado):
                se provee aquí para que las observaciones lean con el mismo criterio que la
                ficha (rediseño 3 §3). */}
            <details className="order-fabric-notes" open={Boolean(props.notes.trim())}>
              <summary>Observaciones de tela{props.notes.trim() ? ' · con anotaciones' : ''}</summary>
              <ObservationLines label="Observaciones de tela del pedido" value={props.notes} onChange={props.onNotesChange} />
            </details>
          </section>
        </div>
      </div>

      {(props.autofill || proposals.length > 0) && (
        <aside className="order-autofill-summary" aria-live="polite">
          {props.autofill && <details className="order-rps-details">
            <summary>Datos de {props.autofill.source}{props.autofill.pending.length ? ` · ${props.autofill.pending.length} pendientes` : ''}{props.autofill.warnings.length ? ` · ${props.autofill.warnings.length} avisos` : ''}</summary>
          {props.autofill.summary && props.autofill.summary.length > 0 && (
            <ul className="order-autofill-summary-lines">
              {props.autofill.summary.map((line) => <li key={line}>{line}</li>)}
            </ul>
          )}
          {props.autofill && <div>
            <strong>Datos obtenidos de {props.autofill.source}</strong>
            <span>{props.autofill.recovered.length} campos recuperados · {props.autofill.pending.length} {props.autofill.pending.length === 1 ? 'pendiente' : 'pendientes'} · todos editables</span>
          </div>}
          </details>}
          {proposals.length > 0 && (
            <details className="order-fabric-alternatives" open={needsFabricChoice} onToggle={(event) => setProposalsOpen(event.currentTarget.open)}>
              <summary>{commonPending ? 'Revisar propuesta de tela' : needsFabricChoice ? 'Elegir tela del pedido' : 'Cambiar tela propuesta'}<span>{proposals.reduce((total, proposal) => total + Math.min(5, proposal.options.length), 0)} alternativas</span></summary>
              <div className="order-fabric-proposals">
              {proposals.map((proposal, index) => {
                const applied = appliedProposalSelection(proposal, fabricOrder);
                return (
                <div className="order-fabric-proposal" key={`${proposal.phrase}-${index}`}>
                  <span>Tela propuesta para {proposalLetters(proposal, props.awnings) || '—'}: «{proposal.phrase}»</span>
                  {proposal.options.length === 0
                    ? <em className="order-fabric-proposal-empty">sin coincidencias en el catálogo</em>
                    : <div className="order-fabric-proposal-options" role="group" aria-label={proposal.phrase}>
                      {proposal.options.slice(0, 5).map((option) => (
                        <button
                          type="button"
                          key={option.selection}
                          className={`order-fabric-proposal-option${applied === option.selection ? ' is-chosen' : ''}`}
                          aria-pressed={applied === option.selection}
                          disabled={props.readOnly}
                          onClick={() => chooseFabricProposal(proposal, option.selection)}
                        >
                          {option.label}
                          <FabricStockText state={proposalStocks[fabricCodeOf(option.selection)] ?? { status: 'idle' }} compact />
                        </button>
                      ))}
                      {pending.includes(index) && <>
                        <span className="fabric-proposal-pending">Propuesta · compruébala</span>
                        <button type="button" className="ghost-button order-fabric-proposal-confirm" onClick={() => props.onConfirmProposal?.(index)}>Correcta</button>
                      </>}
                    </div>}
                </div>
                );
              })}
            </div>
            </details>
          )}
          {props.autofill && props.autofill.pending.length > 0 && (
            <details>
              <summary>Ver pendientes</summary>
              <ul>{props.autofill.pending.map((item) => <li key={item}>{item}</li>)}</ul>
            </details>
          )}
          {props.autofill && props.autofill.warnings.length > 0 && (
            <details>
              <summary>Ver avisos</summary>
              <ul>{props.autofill.warnings.map((item) => <li key={item}>{item}</li>)}</ul>
            </details>
          )}
        </aside>
      )}
    </section>
  );
}
