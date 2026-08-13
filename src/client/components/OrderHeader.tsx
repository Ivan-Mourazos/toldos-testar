import React from 'react';
import { DatabaseZap, Layers3, LoaderCircle, Plus, Scissors } from 'lucide-react';
import type { OrderAutofill } from '../types';
import { formOptions } from '../../domain/modelBehavior.js';
import { TextField } from './TextField';
import { SelectField } from './SelectField';
import { FabricCombobox } from './FabricCombobox';

type Props = {
  orderCode: string; customer: string; orderDate: string; technician: string;
  reviewer: string; fabric: string; sameFabric: boolean;
  set: (patch: Record<string, string | boolean>) => void;
  onAddAwning: () => void;
  onAddFabricWork: () => void;
  onAutofill: () => void;
  autofillLoading: boolean;
  autofill: OrderAutofill | null;
  readOnly?: boolean;
};

export function OrderHeader(props: Props) {
  return (
    <section className={`order-header panel${props.readOnly ? ' is-readonly' : ''}`} aria-readonly={props.readOnly || undefined}>
      <div className="order-header-group order-header-general">
        <h3>Datos del pedido</h3>
        <div className="order-header-grid">
          <TextField label="Pedido" value={props.orderCode} onChange={(v) => props.set({ orderCode: v })} placeholder="AR26xxxxx" />
          <TextField label="Cliente" value={props.customer} onChange={(v) => props.set({ customer: v })} />
          <label className="field"><span>Fecha</span>
            <input type="date" value={props.orderDate} onChange={(e) => props.set({ orderDate: e.target.value })} />
          </label>
          <SelectField label="Técnico" value={props.technician} options={formOptions.tecnicos} placeholder="Sin asignar" onChange={(v) => props.set({ technician: v })} />
          <SelectField label="Revisión" value={props.reviewer} options={formOptions.tecnicos} placeholder="Sin asignar" onChange={(v) => props.set({ reviewer: v })} />
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
              <label className="order-fabric-per-awning">
                <input
                  type="checkbox"
                  checked={!props.sameFabric}
                  onChange={(event) => props.set({ sameFabric: !event.target.checked })}
                />
                <span>Por toldo</span>
              </label>
            </div>
          </section>
        </div>
      </div>

      {!props.readOnly && <div className="order-header-group order-header-actions">
        <h3>Nuevo elemento</h3>
        <div className="order-add-actions">
          <button type="button" className="work-type-option" onClick={props.onAddAwning}>
            <Layers3 aria-hidden="true" />
            <span><strong>Añadir toldo</strong><small>Elegir modelo</small></span>
            <Plus aria-hidden="true" />
          </button>
          <button type="button" className="work-type-option work-type-option-fabric" onClick={props.onAddFabricWork}>
            <Scissors aria-hidden="true" />
            <span><strong>Añadir trabajo de tela</strong><small>Cambio, cortina, enrollable, bamba o Antica</small></span>
            <Plus aria-hidden="true" />
          </button>
        </div>
      </div>}

      {props.autofill && (
        <aside className="order-autofill-summary" aria-live="polite">
          <div>
            <strong>Datos obtenidos de {props.autofill.source}</strong>
            <span>{props.autofill.recovered.length} campos recuperados · {props.autofill.pending.length} {props.autofill.pending.length === 1 ? 'pendiente' : 'pendientes'} · todos editables</span>
          </div>
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
