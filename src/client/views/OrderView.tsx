import React, { useState } from 'react';
import type { Awning, Calculation, CalculationState, OrderAutofill, RuleParameters } from '../types';
import { OrderHeader } from '../components/OrderHeader';
import { AwningColumn } from '../components/AwningColumn';
import { AwningBlocks } from '../components/AwningBlocks';
import { awningStatuses } from '../awningBlocks';
import { LiveResults } from '../components/LiveResults';
import { ModelPickerDialog } from '../components/ModelPickerDialog';
import { AwningPanel } from '../components/AwningPanel';
import { fabricOnlyModelNames, fullAwningModelNames } from '../../domain/modelBehavior.js';

export function OrderView({
  availableModelNames,
  orderCode,
  knownOfs = null,
  onOrderCodeBlur,
  customer,
  orderDate,
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
  readOnly = false,
  diagnostics
}: {
  availableModelNames: string[];
  orderCode: string;
  knownOfs?: string[] | null;
  onOrderCodeBlur?: () => void;
  customer: string;
  orderDate: string;
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
  // Solo para el estado de cada toldo en el índice (el pedido abierto no pasa el cálculo
  // completo: las tarjetas de lectura cambiarían sus observaciones con él).
  diagnostics?: Calculation['diagnostics'] | null;
}) {
  const [pickerType, setPickerType] = useState<Awning['workType'] | null>(null);
  // Toldo cuyo panel «Despiece y dibujo» está abierto.
  const [panelAwningId, setPanelAwningId] = useState<string | null>(null);
  const panelIndex = panelAwningId ? awnings.findIndex((awning) => awning.id === panelAwningId) : -1;
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

  // Un estado por toldo: lo enseñan el índice de bloques y, en lectura, la cabecera de la ficha.
  const statuses = awningStatuses(awnings, { fabric, sameFabric }, diagnostics ?? calculation?.diagnostics ?? []);

  return (
    <>
      <section className="workbench">
        <fieldset className="order-strip" disabled={readOnly}>
          <OrderHeader
            orderCode={orderCode}
            onOrderCodeBlur={onOrderCodeBlur}
            customer={customer}
            orderDate={orderDate}
            fabric={fabric}
            sameFabric={sameFabric}
            notes={notes}
            onNotesChange={setNotes}
            onAddAwning={() => setPickerType('FULL_AWNING')}
            onAddFabricWork={() => setPickerType('FABRIC_ONLY')}
            onAutofill={onAutofill}
            autofillLoading={autofillLoading}
            autofill={autofill}
            readOnly={readOnly}
            set={setOrderField}
          />
        </fieldset>
      </section>

      {awnings.length > 0 && <section className="awnings-section order-elements-section">
        <div className="section-header">
          <div>
            <h2>Elementos del pedido</h2>
            <span>{awnings.length} {awnings.length === 1 ? 'elemento' : 'elementos'} · orden A, B, C…</span>
          </div>
        </div>

        <AwningBlocks
          awnings={awnings}
          reading={readOnly}
          statuses={statuses}
          renderCard={(awning, index) => (
            <AwningColumn
              key={awning.id}
              awning={awning}
              index={index}
              ofCalculation={calculation?.ofs.find((o) => o.awningId === awning.id)?.calculation}
              diagnostics={(calculation?.diagnostics || []).filter((item) => item.awningId === awning.id && !item.missingFields && (item.level === 'error' || item.level === 'pending' || item.level === 'warn'))}
              sameFabric={sameFabric}
              knownOfs={knownOfs}
              orderFabric={fabric}
              parameters={parameters}
              readOnly={readOnly}
              readStatus={statuses[index]}
              onUpdate={updateAwning}
              onDuplicate={duplicateAwning}
              onRemove={removeAwning}
              onOpenPanel={setPanelAwningId}
            />
          )}
        />
      </section>}

      {!readOnly && awnings.length > 0 && <LiveResults calculation={calculation} state={calculationState} awnings={awnings} onUpdate={updateAwning} />}

      {!readOnly && panelIndex !== -1 && (
        <AwningPanel
          awning={awnings[panelIndex]}
          index={panelIndex}
          calculation={calculation}
          order={{ fabric, sameFabric }}
          onUpdate={updateAwning}
          onClose={() => setPanelAwningId(null)}
        />
      )}

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
