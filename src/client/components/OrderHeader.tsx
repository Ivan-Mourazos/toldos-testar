import React from 'react';
import { formOptions } from '../../domain/modelBehavior.js';
import { TextField } from './TextField';
import { SelectField } from './SelectField';
import { SegmentedField } from './SegmentedField';

type Props = {
  orderCode: string; customer: string; orderDate: string; technician: string;
  reviewer: string; fabric: string; remate: string; curvaBamba: string;
  bambaDistinta: boolean; telaBamba: string; structureColor: string;
  rotTela: string; rotBamba: string; notes: string; totalUnits: number;
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
          <TextField label="Tela" value={props.fabric} onChange={(v) => props.set({ fabric: v })} placeholder="ACR ADMIRAL" />
          <TextField label="Remate" value={props.remate} onChange={(v) => props.set({ remate: v })} placeholder="COMO TELA" />
          <SegmentedField label="Curva bamba" value={props.curvaBamba} options={formOptions.curvasBamba} onChange={(v) => props.set({ curvaBamba: v })} />
          <SelectField label="Lacado (estruct)" value={props.structureColor} options={formOptions.lacados} onChange={(v) => props.set({ structureColor: v })} />
          <label className="field field-toggle"><span>Bamba en tela distinta</span>
            <input type="checkbox" checked={props.bambaDistinta}
              onChange={(e) => props.set({ bambaDistinta: e.target.checked, telaBamba: e.target.checked ? props.telaBamba : '' })} />
          </label>
          {props.bambaDistinta && (
            <TextField label="Tela bamba" value={props.telaBamba} onChange={(v) => props.set({ telaBamba: v })} />
          )}
        </div>
      </div>

      <div className="order-header-group order-header-rot">
        <h3>Rotulación</h3>
        <div className="order-header-grid">
          <SegmentedField label="Tela" value={props.rotTela} options={formOptions.rotulacion} onChange={(v) => props.set({ rotTela: v })} />
          <SegmentedField label="Bamba" value={props.rotBamba} options={formOptions.rotulacion} onChange={(v) => props.set({ rotBamba: v })} />
        </div>
        <label className="field field-notes"><span>Comentarios</span>
          <textarea value={props.notes} onChange={(e) => props.set({ notes: e.target.value })} />
        </label>
      </div>
    </section>
  );
}
