import React from 'react';
import { formOptions } from '../../domain/modelBehavior.js';
import { TextField } from './TextField';
import { SelectField } from './SelectField';
import { SegmentedField } from './SegmentedField';
import { FabricCombobox } from './FabricCombobox';

type Props = {
  orderCode: string; customer: string; orderDate: string; technician: string;
  reviewer: string; fabric: string; sameFabric: boolean; remate: string; remateColor: string;
  set: (patch: Record<string, string | boolean>) => void;
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
        <h3>Tela y acabados</h3>
        <div className="order-material-clusters">
          <section className="order-material-cluster order-fabric-cluster">
            <span className="order-cluster-title">Tela</span>
            <SegmentedField
              label="Aplicación"
              value={props.sameFabric ? 'COMÚN' : 'POR TOLDO'}
              options={['COMÚN', 'POR TOLDO']}
              onChange={(value) => props.set({ sameFabric: value === 'COMÚN' })}
            />
            {props.sameFabric && <FabricCombobox label="Referencia" value={props.fabric} onChange={(v) => props.set({ fabric: v })} />}
          </section>

          <section className="order-material-cluster order-finish-cluster">
            <span className="order-cluster-title">Remate</span>
            <div className="order-cluster-fields">
              <div className="order-remate-choice"><SegmentedField label="Color" value={props.remate} options={['COMO TELA', 'OTRO']} onChange={(remate) => props.set({ remate, remateColor: remate === 'COMO TELA' ? '' : props.remateColor })} /></div>
              {props.remate === 'OTRO' && <TextField label="Color remate" value={props.remateColor} onChange={(v) => props.set({ remateColor: v })} />}
            </div>
          </section>

        </div>
      </div>
    </section>
  );
}
