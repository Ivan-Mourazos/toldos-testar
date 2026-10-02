import React from 'react';
import { AlertTriangle } from 'lucide-react';
import type { OrderAutofill } from '../types';
import { TextField } from './TextField';
import { OrderIdentity } from './OrderIdentity';
import { FabricCombobox } from './FabricCombobox';
import { ObservationLines } from './ObservationLines';
import { ReadModeContext } from './ReadMode';
import { fabricSelectionLabel } from '../../domain/fabricCatalog.js';
import { FabricStockLine } from './FabricStockLine';

type Props = {
  orderCode: string; onOrderCodeBlur?: () => void; customer: string; orderDate: string;
  fabric: string; sameFabric: boolean;
  notes: string; onNotesChange: (value: string) => void;
  set: (patch: Record<string, string | boolean>) => void;
  onAutofill: () => void;
  autofillLoading: boolean;
  autofill: OrderAutofill | null;
  // Metros que el pedido pide de la tela común, para compararlos con su stock.
  fabricNeedMl?: number;
  readOnly?: boolean;
};

// Iván, 02/10/2026: fuera las telas propuestas, los pendientes y el resumen de lo leído de RPS
// («ya aparece abajo»: cada tarjeta dice en vivo lo que le falta). Solo quedan los avisos de RPS,
// a la vista y solo si los hay.
export function OrderHeader(props: Props) {

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
            {props.sameFabric && !props.readOnly && props.fabric && <div className="order-fabric-common-meta">
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

      {props.autofill && props.autofill.warnings.length > 0 && (
        <ul className="order-autofill-warnings" aria-label={`Avisos de ${props.autofill.source}`}>
          {props.autofill.warnings.map((item) => <li key={item}><AlertTriangle aria-hidden="true" />{item}</li>)}
        </ul>
      )}
    </section>
  );
}
