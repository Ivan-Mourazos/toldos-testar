import React from 'react';
import { Plus } from 'lucide-react';
import type { Awning, Calculation, CalculationState } from '../types';
import { OrderHeader } from '../components/OrderHeader';
import { AwningColumn } from '../components/AwningColumn';
import { LiveResults } from '../components/LiveResults';
import { DespieceView } from '../components/DespieceView';

export function OrderView({
  orderCode,
  customer,
  orderDate,
  technician,
  reviewer,
  fabric,
  remate,
  curvaBamba,
  bambaDistinta,
  telaBamba,
  structureColor,
  rotTela,
  rotBamba,
  notes,
  awnings,
  calculation,
  calculationState,
  setOrderCode,
  setCustomer,
  setOrderDate,
  setTechnician,
  setReviewer,
  setFabric,
  setRemate,
  setCurvaBamba,
  setBambaDistinta,
  setTelaBamba,
  setStructureColor,
  setRotTela,
  setRotBamba,
  setNotes,
  addAwning,
  duplicateAwning,
  removeAwning,
  updateAwning
}: {
  orderCode: string;
  customer: string;
  orderDate: string;
  technician: string;
  reviewer: string;
  fabric: string;
  remate: string;
  curvaBamba: string;
  bambaDistinta: boolean;
  telaBamba: string;
  structureColor: string;
  rotTela: string;
  rotBamba: string;
  notes: string;
  awnings: Awning[];
  calculation: Calculation | null;
  calculationState: CalculationState;
  setOrderCode: (value: string) => void;
  setCustomer: (value: string) => void;
  setOrderDate: (value: string) => void;
  setTechnician: (value: string) => void;
  setReviewer: (value: string) => void;
  setFabric: (value: string) => void;
  setRemate: (value: string) => void;
  setCurvaBamba: (value: string) => void;
  setBambaDistinta: (value: boolean) => void;
  setTelaBamba: (value: string) => void;
  setStructureColor: (value: string) => void;
  setRotTela: (value: string) => void;
  setRotBamba: (value: string) => void;
  setNotes: (value: string) => void;
  addAwning: () => void;
  duplicateAwning: (id: string) => void;
  removeAwning: (id: string) => void;
  updateAwning: (id: string, patch: Partial<Awning>) => void;
}) {
  const totalUnits = awnings.reduce((sum, awning) => sum + (awning.units || 0), 0);

  function setOrderField(patch: Record<string, string | boolean>) {
    if ('orderCode' in patch) setOrderCode(patch.orderCode as string);
    if ('customer' in patch) setCustomer(patch.customer as string);
    if ('orderDate' in patch) setOrderDate(patch.orderDate as string);
    if ('technician' in patch) setTechnician(patch.technician as string);
    if ('reviewer' in patch) setReviewer(patch.reviewer as string);
    if ('fabric' in patch) setFabric(patch.fabric as string);
    if ('remate' in patch) setRemate(patch.remate as string);
    if ('curvaBamba' in patch) setCurvaBamba(patch.curvaBamba as string);
    if ('bambaDistinta' in patch) setBambaDistinta(patch.bambaDistinta as boolean);
    if ('telaBamba' in patch) setTelaBamba(patch.telaBamba as string);
    if ('structureColor' in patch) setStructureColor(patch.structureColor as string);
    if ('rotTela' in patch) setRotTela(patch.rotTela as string);
    if ('rotBamba' in patch) setRotBamba(patch.rotBamba as string);
    if ('notes' in patch) setNotes(patch.notes as string);
  }

  return (
    <>
      <section className="workbench">
        <div className="order-strip">
          <OrderHeader
            orderCode={orderCode}
            customer={customer}
            orderDate={orderDate}
            technician={technician}
            reviewer={reviewer}
            fabric={fabric}
            remate={remate}
            curvaBamba={curvaBamba}
            bambaDistinta={bambaDistinta}
            telaBamba={telaBamba}
            structureColor={structureColor}
            rotTela={rotTela}
            rotBamba={rotBamba}
            notes={notes}
            totalUnits={totalUnits}
            set={setOrderField}
          />
        </div>
      </section>

      <section className="awnings-section">
        <div className="section-header">
          <div>
            <h2>Toldos</h2>
            <span>Formulario dirigido por el modelo seleccionado</span>
          </div>
          <button className="icon-text-button" type="button" onClick={addAwning}>
            <Plus aria-hidden="true" />
            Añadir
          </button>
        </div>

        <div className="awning-grid">
          {awnings.map((awning, index) => (
            <AwningColumn
              key={awning.id}
              awning={awning}
              index={index}
              ofCalculation={calculation?.ofs.find((o) => o.of === awning.of.trim())?.calculation}
              onUpdate={updateAwning}
              onDuplicate={duplicateAwning}
              onRemove={removeAwning}
            />
          ))}

          {awnings.length < 4 && (
            <button type="button" className="awning-add-ghost" onClick={addAwning}>
              <Plus aria-hidden="true" />
              Añadir toldo
            </button>
          )}
        </div>
      </section>

      <LiveResults calculation={calculation} state={calculationState} />
      <DespieceView calculation={calculation} awnings={awnings} />
    </>
  );
}
