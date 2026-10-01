import React, { useState } from 'react';
import { Layers3, Scissors } from 'lucide-react';
import type { Awning, Calculation, CalculationState, OrderAutofill, RuleParameters } from '../types';
import { OrderHeader } from '../components/OrderHeader';
import { AwningColumn } from '../components/AwningColumn';
import { AwningBlocks } from '../components/AwningBlocks';
import { awningStatuses } from '../awningBlocks';
import { LiveResults } from '../components/LiveResults';
import { ModelPickerDialog } from '../components/ModelPickerDialog';
import { AwningPanel, type PanelOrder } from '../components/AwningPanel';
import type { AskForConfirmation, Notify } from '../components/NotificationCenter';
import { fabricOnlyModelNames, fullAwningModelNames } from '../../domain/modelBehavior.js';
import { applyFabricProposal, pendingProposalIndexes } from '../fabricProposal';
import { fabricCodeOf, fabricNeedByCode } from '../fabricStock';
import { planFabricToggle } from '../orderFabricToggle';
import { fabricSelectionLabel } from '../../domain/fabricCatalog.js';
import type { FabricProposal } from '../types';

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
  diagnostics,
  getPanelOrder,
  onConfirm,
  onNotify
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
  // El pedido completo (parámetros, remate…) para el PDF del dibujo en el panel del toldo.
  // Es una función: solo se construye mientras el panel está abierto.
  getPanelOrder?: () => Record<string, unknown>;
  // Confirmación de la aplicación (el panel pregunta antes de descartar un despiece).
  onConfirm?: AskForConfirmation;
  // Avisos de la tela (al cambiar «Por toldo» o elegir una propuesta).
  onNotify?: Notify;
}) {
  const [pickerType, setPickerType] = useState<Awning['workType'] | null>(null);
  // Toldo cuyo panel «Despiece y dibujo» está abierto.
  const [panelAwningId, setPanelAwningId] = useState<string | null>(null);
  const panelIndex = panelAwningId ? awnings.findIndex((awning) => awning.id === panelAwningId) : -1;
  const enabledModels = new Set(availableModelNames);
  // Propuestas de tela ya comprobadas por el técnico (pulsó una opción o «Correcta»).
  // Van ligadas al autorrelleno que las trajo: con otro, empiezan sin comprobar.
  const [confirmed, setConfirmed] = useState<{ autofill: OrderAutofill | null; indexes: Set<number> }>({ autofill: null, indexes: new Set() });
  const confirmedIndexes = confirmed.autofill === autofill ? confirmed.indexes : new Set<number>();
  const proposals = autofill?.fabricProposals ?? [];
  const pendingProposals = readOnly ? [] : pendingProposalIndexes(proposals, { fabric, sameFabric, awnings }, confirmedIndexes);
  // Metros que el cálculo pide de cada tela, para compararlos con el stock.
  const needByCode = fabricNeedByCode(calculation);

  function confirmProposal(index: number) {
    setConfirmed({ autofill, indexes: new Set([...confirmedIndexes, index]) });
  }

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
    if ('sameFabric' in patch) void toggleSameFabric(patch.sameFabric as boolean);
    if ('remate' in patch) setRemate(patch.remate as string);
    if ('remateColor' in patch) setRemateColor(patch.remateColor as string);
  }

  // «Por toldo» sin perder la tela (informe tela-0930, F1): ver planFabricToggle.
  async function toggleSameFabric(nextSameFabric: boolean) {
    const plan = planFabricToggle({ fabric, awnings }, nextSameFabric);
    if (plan.conflict) {
      const [main, ...rest] = plan.conflict;
      const changed = rest.reduce((sum, group) => sum + group.count, 0);
      const choice = onConfirm
        ? await onConfirm({
          title: 'Los toldos llevan telas distintas',
          message: `¿Usar ${fabricSelectionLabel(main.fabric)} para todo el pedido? ${rest.map((group) => group.letters).join(', ')} ${changed === 1 ? 'cambiaría' : 'cambiarían'} de tela.`,
          details: plan.conflict.map((group) => `${group.letters}: ${fabricSelectionLabel(group.fabric)}`),
          confirmLabel: 'Usar la misma para todos',
          cancelLabel: 'Seguir por toldo',
          tone: 'warning'
        })
        : 'cancel';
      if (choice !== 'confirm') {
        onNotify?.('Sigue «Por toldo»: cada toldo conserva su tela.', { tone: 'info' });
        return;
      }
    }
    plan.awningPatches.forEach((item) => updateAwning(item.id, { fabric: item.fabric }));
    setFabric(plan.fabric);
    setSameFabric(plan.sameFabric);
  }

  // El técnico elige una tela propuesta del catálogo (rediseño 4 §10).
  function applyProposal(proposal: FabricProposal, selection: string) {
    const message = applyFabricProposal({ awnings, fabric, sameFabric, setFabric, setSameFabric, updateAwning }, proposal, selection, autofill?.fabricProposals ?? [proposal]);
    if (message) onNotify?.(message, { tone: 'info' });
    // Elegir una opción, sea la puesta u otra, es comprobarla.
    const index = proposals.indexOf(proposal);
    if (index >= 0) confirmProposal(index);
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
            onAutofill={onAutofill}
            autofillLoading={autofillLoading}
            autofill={autofill}
            awnings={awnings}
            onApplyFabricProposal={applyProposal}
            pendingProposals={pendingProposals}
            onConfirmProposal={confirmProposal}
            fabricNeedMl={needByCode.get(fabricCodeOf(fabric)) ?? 0}
            readOnly={readOnly}
            set={setOrderField}
          />
        </fieldset>
      </section>

      {(awnings.length > 0 || !readOnly) && <section className="awnings-section order-elements-section">
        <div className="section-header">
          <div>
            <h2>Elementos del pedido</h2>
            <span>{awnings.length ? `${awnings.length} ${awnings.length === 1 ? 'elemento' : 'elementos'} · orden A, B, C…` : 'Añade el primer toldo o trabajo de tela.'}</span>
          </div>
          {/* Antes eran una fila entera en la cabecera del pedido (espaciado, 25/09/2026). */}
          {!readOnly && (
            <div className="order-add-actions">
              <button type="button" className="ghost-button" onClick={() => setPickerType('FULL_AWNING')}>
                <Layers3 aria-hidden="true" />Añadir toldo
              </button>
              <button type="button" className="ghost-button" onClick={() => setPickerType('FABRIC_ONLY')}>
                <Scissors aria-hidden="true" />Añadir trabajo de tela
              </button>
            </div>
          )}
        </div>

        {awnings.length > 0 && <AwningBlocks
          awnings={awnings}
          reading={readOnly}
          statuses={statuses}
          renderCard={(awning, index) => (
            <AwningColumn
              key={awning.id}
              awning={awning}
              index={index}
              ofCalculation={calculation?.ofs.find((o) => o.awningId === awning.id)?.calculation}
              diagnostics={(calculation?.diagnostics ?? diagnostics ?? []).filter((item) => item.awningId === awning.id && !item.missingFields && (item.level === 'error' || item.level === 'pending' || item.level === 'warn'))}
              sameFabric={sameFabric}
              knownOfs={knownOfs}
              orderFabric={fabric}
              fabricPending={!sameFabric && pendingProposals.some((pending) => proposals[pending].awningIds.includes(awning.id))}
              fabricNeedMl={needByCode.get(fabricCodeOf(awning.fabric)) ?? 0}
              valanceFabricNeedMl={needByCode.get(fabricCodeOf(awning.valanceFabric)) ?? 0}
              parameters={parameters}
              readOnly={readOnly}
              readStatus={statuses[index]}
              onUpdate={updateAwning}
              onDuplicate={duplicateAwning}
              onRemove={removeAwning}
              onOpenPanel={setPanelAwningId}
            />
          )}
        />}
      </section>}

      {!readOnly && awnings.length > 0 && <LiveResults calculation={calculation} state={calculationState} awnings={awnings} />}

      {!readOnly && panelIndex !== -1 && (
        <AwningPanel
          // Cada apertura monta un <dialog> nuevo (showModal solo corre al montar).
          key={panelAwningId}
          awning={awnings[panelIndex]}
          index={panelIndex}
          calculation={calculation}
          order={{ ...getPanelOrder?.(), fabric, sameFabric } as PanelOrder}
          onUpdate={updateAwning}
          onClose={() => setPanelAwningId(null)}
          onConfirm={onConfirm}
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
