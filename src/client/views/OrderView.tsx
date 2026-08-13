import React, { useState } from 'react';
import type { Awning, Calculation, CalculationState, OrderAutofill, RuleParameters } from '../types';
import { OrderHeader } from '../components/OrderHeader';
import { AwningColumn } from '../components/AwningColumn';
import { LiveResults } from '../components/LiveResults';
import { ModelPickerDialog } from '../components/ModelPickerDialog';
import { ObservationLines } from '../components/ObservationLines';
import { fabricOnlyModelNames, fullAwningModelNames } from '../../domain/modelBehavior.js';

export function OrderView({
  availableModelNames,
  orderCode,
  customer,
  orderDate,
  technician,
  reviewer,
  fabric,
  sameFabric,
  notes,
  awnings,
  calculation,
  calculationState,
  parameters,
  setOrderCode,
  setCustomer,
  setOrderDate,
  setTechnician,
  setReviewer,
  setFabric,
  setSameFabric,
  setNotes,
  setRemate,
  setRemateColor,
  addAwning,
  duplicateAwning,
  removeAwning,
  updateAwning,
  onAutofill,
  autofillLoading,
  autofill,
  readOnly = false
}: {
  availableModelNames: string[];
  orderCode: string;
  customer: string;
  orderDate: string;
  technician: string;
  reviewer: string;
  fabric: string;
  sameFabric: boolean;
  notes: string;
  remate: string;
  remateColor: string;
  awnings: Awning[];
  calculation: Calculation | null;
  calculationState: CalculationState;
  parameters: RuleParameters;
  setOrderCode: (value: string) => void;
  setCustomer: (value: string) => void;
  setOrderDate: (value: string) => void;
  setTechnician: (value: string) => void;
  setReviewer: (value: string) => void;
  setFabric: (value: string) => void;
  setSameFabric: (value: boolean) => void;
  setNotes: (value: string) => void;
  setRemate: (value: string) => void;
  setRemateColor: (value: string) => void;
  addAwning: (workType?: Awning['workType'], model?: string) => void;
  duplicateAwning: (id: string) => void;
  removeAwning: (id: string) => void;
  updateAwning: (id: string, patch: Partial<Awning>) => void;
  onAutofill: () => void;
  autofillLoading: boolean;
  autofill: OrderAutofill | null;
  readOnly?: boolean;
}) {
  const [pickerType, setPickerType] = useState<Awning['workType'] | null>(null);
  const enabledModels = new Set(availableModelNames);

  function chooseModel(model: string) {
    if (!pickerType) return;
    addAwning(pickerType, model);
    setPickerType(null);
  }

  function setOrderField(patch: Record<string, string | boolean>) {
    if ('orderCode' in patch) setOrderCode(patch.orderCode as string);
    if ('customer' in patch) setCustomer(patch.customer as string);
    if ('orderDate' in patch) setOrderDate(patch.orderDate as string);
    if ('technician' in patch) setTechnician(patch.technician as string);
    if ('reviewer' in patch) setReviewer(patch.reviewer as string);
    if ('fabric' in patch) setFabric(patch.fabric as string);
    if ('sameFabric' in patch) {
      const nextSameFabric = patch.sameFabric as boolean;
      setSameFabric(nextSameFabric);
      if (!nextSameFabric && fabric) {
        awnings.forEach((awning) => {
          if (!awning.fabric) updateAwning(awning.id, { fabric });
        });
      }
    }
    if ('remate' in patch) setRemate(patch.remate as string);
    if ('remateColor' in patch) setRemateColor(patch.remateColor as string);
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
            sameFabric={sameFabric}
            onAddAwning={() => setPickerType('FULL_AWNING')}
            onAddFabricWork={() => setPickerType('FABRIC_ONLY')}
            onAutofill={onAutofill}
            autofillLoading={autofillLoading}
            autofill={autofill}
            readOnly={readOnly}
            set={setOrderField}
          />
        </div>
      </section>

      {awnings.length > 0 && <section className="awnings-section order-elements-section">
        <div className="section-header">
          <div>
            <h2>Elementos del pedido</h2>
            <span>{awnings.length} {awnings.length === 1 ? 'elemento' : 'elementos'} · orden A, B, C…</span>
          </div>
        </div>

        <div className="awning-grid">
          {awnings.map((awning, index) => (
            <AwningColumn
              key={awning.id}
              awning={awning}
              index={index}
              ofCalculation={calculation?.ofs.find((o) => o.awningId === awning.id)?.calculation}
              sameFabric={sameFabric}
              parameters={parameters}
              readOnly={readOnly}
              onUpdate={updateAwning}
              onDuplicate={duplicateAwning}
              onRemove={removeAwning}
            />
          ))}
        </div>

        <div className="order-observations">
          <ObservationLines readOnly={readOnly} label="Observaciones de tela del pedido" value={notes} onChange={setNotes} />
        </div>
      </section>}

      {!readOnly && awnings.length > 0 && <LiveResults calculation={calculation} state={calculationState} awnings={awnings} />}

      {!readOnly && pickerType && (
        <ModelPickerDialog
          workType={pickerType}
          models={(pickerType === 'FABRIC_ONLY' ? fabricOnlyModelNames : fullAwningModelNames)
            .filter((model) => enabledModels.has(model))}
          onSelect={chooseModel}
          onClose={() => setPickerType(null)}
        />
      )}
    </>
  );
}
