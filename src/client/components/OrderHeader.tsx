import React from 'react';
import { DatabaseZap, LoaderCircle } from 'lucide-react';
import type { Awning, FabricProposal, OrderAutofill } from '../types';
import { awningLetter } from '../../domain/awningCompleteness.js';
import { TextField } from './TextField';
import { FabricCombobox } from './FabricCombobox';
import { ObservationLines } from './ObservationLines';
import { ReadModeContext } from './ReadMode';
import { fabricSelectionLabel } from '../../domain/fabricCatalog.js';

type Props = {
  orderCode: string; onOrderCodeBlur?: () => void; customer: string; orderDate: string;
  fabric: string; sameFabric: boolean;
  notes: string; onNotesChange: (value: string) => void;
  set: (patch: Record<string, string | boolean>) => void;
  onAutofill: () => void;
  autofillLoading: boolean;
  autofill: OrderAutofill | null;
  // Solo para poner las letras («B, C») de las propuestas de tela junto a la frase de RPS.
  awnings: Pick<Awning, 'id'>[];
  onApplyFabricProposal: (proposal: FabricProposal, selection: string) => void;
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
  // Qué opción se ha elegido en cada bloque de propuestas, para marcar su botón sin
  // quitar las demás: el técnico puede cambiar de opinión (rediseño 4 §10).
  // Las marcas van ligadas al autorrelleno que las produjo: con otro autorrelleno
  // (otra consulta a RPS) empiezan vacías.
  const [chosen, setChosen] = React.useState<{ autofill: OrderAutofill | null; byProposal: Record<number, string> }>({ autofill: null, byProposal: {} });
  const chosenByProposal = chosen.autofill === props.autofill ? chosen.byProposal : {};

  function chooseFabricProposal(index: number, proposal: FabricProposal, selection: string) {
    if (props.readOnly) return;
    props.onApplyFabricProposal(proposal, selection);
    setChosen({ autofill: props.autofill, byProposal: { ...chosenByProposal, [index]: selection } });
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
    <section className={`order-header panel${props.readOnly ? ' is-readonly' : ''}`} aria-readonly={props.readOnly || undefined}>
      <div className="order-header-group order-header-general">
        <h3>Datos del pedido</h3>
        <div className="order-header-grid">
          <TextField label="Pedido" value={props.orderCode} onChange={(v) => props.set({ orderCode: v })} onBlur={props.onOrderCodeBlur} placeholder="AR26xxxxx" />
          <TextField label="Cliente" value={props.customer} onChange={(v) => props.set({ customer: v })} />
          <label className="field"><span>Fecha</span>
            <input type="date" value={props.orderDate} onChange={(e) => props.set({ orderDate: e.target.value })} />
          </label>
        </div>
        {!props.readOnly && <div className="order-autofill-action">
          <button type="button" className="order-autofill-button" disabled={props.autofillLoading || !props.orderCode.trim()} onClick={props.onAutofill}>
            {props.autofillLoading ? <LoaderCircle className="is-spinning" aria-hidden="true" /> : <DatabaseZap aria-hidden="true" />}
            {props.autofillLoading ? 'Consultando RPS…' : 'Obtener datos del pedido'}
          </button>
          <span>Rellena lo disponible; después todo se puede editar.</span>
        </div>}
      </div>

      <div className="order-header-group order-header-material">
        <h3>Tela</h3>
        <div className="order-material-clusters">
          <section className="order-material-cluster order-fabric-cluster">
            <div className={`order-fabric-row${props.sameFabric ? '' : ' is-per-awning'}`}>
              <FabricCombobox label="Referencia" value={props.fabric} disabled={props.readOnly || !props.sameFabric} onChange={(v) => props.set({ fabric: v })} />
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
            {/* La cabecera no está dentro de ReadModeContext (es un fieldset deshabilitado):
                se provee aquí para que las observaciones lean con el mismo criterio que la
                ficha (rediseño 3 §3). */}
            <ReadModeContext.Provider value={!!props.readOnly}>
              <ObservationLines label="Observaciones de tela del pedido" value={props.notes} onChange={props.onNotesChange} />
            </ReadModeContext.Provider>
          </section>
        </div>
      </div>

      {props.autofill && (
        <aside className="order-autofill-summary" aria-live="polite">
          {props.autofill.summary && props.autofill.summary.length > 0 && (
            <ul className="order-autofill-summary-lines">
              {props.autofill.summary.map((line) => <li key={line}>{line}</li>)}
            </ul>
          )}
          <div>
            <strong>Datos obtenidos de {props.autofill.source}</strong>
            <span>{props.autofill.recovered.length} campos recuperados · {props.autofill.pending.length} {props.autofill.pending.length === 1 ? 'pendiente' : 'pendientes'} · todos editables</span>
          </div>
          {props.autofill.fabricProposals && props.autofill.fabricProposals.length > 0 && (
            <div className="order-fabric-proposals">
              {props.autofill.fabricProposals.map((proposal, index) => (
                <div className="order-fabric-proposal" key={`${proposal.phrase}-${index}`}>
                  <span>Tela propuesta para {proposalLetters(proposal, props.awnings) || '—'}: «{proposal.phrase}»</span>
                  {proposal.options.length === 0
                    ? <em className="order-fabric-proposal-empty">sin coincidencias en el catálogo</em>
                    : <div className="order-fabric-proposal-options" role="group" aria-label={proposal.phrase}>
                      {proposal.options.slice(0, 5).map((option) => (
                        <button
                          type="button"
                          key={option.selection}
                          className={`order-fabric-proposal-option${chosenByProposal[index] === option.selection ? ' is-chosen' : ''}`}
                          aria-pressed={chosenByProposal[index] === option.selection}
                          disabled={props.readOnly}
                          onClick={() => chooseFabricProposal(index, proposal, option.selection)}
                        >
                          {option.label}
                        </button>
                      ))}
                    </div>}
                </div>
              ))}
            </div>
          )}
          {props.autofill.pending.length > 0 && (
            <details>
              <summary>Ver pendientes</summary>
              <ul>{props.autofill.pending.map((item) => <li key={item}>{item}</li>)}</ul>
            </details>
          )}
          {props.autofill.warnings.length > 0 && (
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
