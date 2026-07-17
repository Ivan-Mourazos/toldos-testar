import React from 'react';
import { formOptions } from '../../domain/modelBehavior.js';
import { TextField } from './TextField';
import { SelectField } from './SelectField';
import { SegmentedField } from './SegmentedField';
import { FabricCombobox } from './FabricCombobox';

type Props = {
  orderCode: string; customer: string; orderDate: string; technician: string;
  reviewer: string; fabric: string; sameFabric: boolean; remate: string; remateColor: string; curvaBamba: string;
  bambaDistinta: boolean; telaBamba: string; structureColor: string;
  rotTela: string; rotBamba: string; totalUnits: number; showStructureColor: boolean;
  set: (patch: Record<string, string | boolean>) => void;
};

export function OrderHeader(props: Props) {
  return (
    <section className="order-header panel">
      <div className="order-header-group">
        <h3>Datos generales</h3>
        <div className="order-header-grid">
          <TextField label="Pedido" value={props.orderCode} onChange={(v) => props.set({ orderCode: v })} placeholder="AR26xxxxx" />
          <TextField label="Cliente" value={props.customer} onChange={(v) => props.set({ customer: v })} />
          <label className="field"><span>Fecha</span>
            <input type="date" value={props.orderDate} onChange={(e) => props.set({ orderDate: e.target.value })} />
          </label>
          <SelectField label="Técnico" value={props.technician} options={formOptions.tecnicos} placeholder="Sin asignar" onChange={(v) => props.set({ technician: v })} />
          <SelectField label="Revisión" value={props.reviewer} options={formOptions.tecnicos} placeholder="Sin asignar" onChange={(v) => props.set({ reviewer: v })} />
          <label className="field"><span>Unidades totales</span>
            <input value={props.totalUnits} readOnly className="num" />
          </label>
        </div>
      </div>

      <div className="order-header-group">
        <h3>Material</h3>
        <div className="order-header-grid">
          <div className="field field-toggle">
            <span>Misma tela en todos</span>
            <button
              type="button"
              className={`toggle-switch${props.sameFabric ? ' is-on' : ''}`}
              role="switch"
              aria-checked={props.sameFabric}
              aria-label="Misma tela en todos los toldos"
              onClick={() => props.set({ sameFabric: !props.sameFabric })}
            >
              <span className="toggle-thumb" aria-hidden="true" />
            </button>
          </div>
          {props.sameFabric && <FabricCombobox label="Tela" value={props.fabric} onChange={(v) => props.set({ fabric: v })} />}
          <SegmentedField label="Remate" value={props.remate} options={['COMO TELA', 'OTRO']} onChange={(remate) => props.set({ remate, remateColor: remate === 'COMO TELA' ? '' : props.remateColor })} />
          {props.remate === 'OTRO' && <TextField label="Color remate" value={props.remateColor} onChange={(v) => props.set({ remateColor: v })} />}
          <SelectField label="Curva bamba" value={props.curvaBamba} options={formOptions.curvasBamba} onChange={(v) => props.set({ curvaBamba: v })} />
          {props.showStructureColor && (
            <SelectField label="Lacado estructura" value={props.structureColor} options={formOptions.lacados} placeholder="Elegir…" allowEmpty emptyLabel="Sin indicar" onChange={(v) => props.set({ structureColor: v })} />
          )}
          <div className="field field-toggle">
            <span>Bamba en tela distinta</span>
            <button
              type="button"
              className={`toggle-switch${props.bambaDistinta ? ' is-on' : ''}`}
              role="switch"
              aria-checked={props.bambaDistinta}
              aria-label="Bamba en tela distinta"
              onClick={() => props.set({ bambaDistinta: !props.bambaDistinta, telaBamba: props.bambaDistinta ? '' : props.telaBamba })}
            >
              <span className="toggle-thumb" aria-hidden="true" />
            </button>
          </div>
          {props.bambaDistinta && (
            <TextField label="Tela bamba" value={props.telaBamba} onChange={(v) => props.set({ telaBamba: v })} />
          )}
        </div>
      </div>

      <div className="order-header-group">
        <h3>Rotulación</h3>
        <div className="order-header-grid">
          <SegmentedField label="Tela" value={props.rotTela} options={formOptions.rotulacion} onChange={(v) => props.set({ rotTela: v })} />
          <SegmentedField label="Bamba" value={props.rotBamba} options={formOptions.rotulacion} onChange={(v) => props.set({ rotBamba: v })} />
        </div>
      </div>
    </section>
  );
}
