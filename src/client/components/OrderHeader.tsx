import React from 'react';
import { Layers3, Plus, Scissors } from 'lucide-react';
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
};

export function OrderHeader(props: Props) {
  return (
    <section className="order-header panel">
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
      </div>

      <div className="order-header-group order-header-material">
        <h3>Tela</h3>
        <div className="order-material-clusters">
          <section className="order-material-cluster order-fabric-cluster">
            <div className={`order-fabric-row${props.sameFabric ? '' : ' is-per-awning'}`}>
              <FabricCombobox label="Referencia" value={props.fabric} disabled={!props.sameFabric} onChange={(v) => props.set({ fabric: v })} />
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

      <div className="order-header-group order-header-actions">
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
      </div>
    </section>
  );
}
