import React from 'react';
import { Layers3, Plus, Scissors } from 'lucide-react';
import type { Awning, Calculation, CalculationState, RuleParameters } from '../types';
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
  sameFabric,
  remate,
  remateColor,
  curvaBamba,
  bambaDistinta,
  telaBamba,
  structureColor,
  rotTela,
  rotBamba,
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
  setRemate,
  setRemateColor,
  setCurvaBamba,
  setBambaDistinta,
  setTelaBamba,
  setStructureColor,
  setRotTela,
  setRotBamba,
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
  sameFabric: boolean;
  remate: string;
  remateColor: string;
  curvaBamba: string;
  bambaDistinta: boolean;
  telaBamba: string;
  structureColor: string;
  rotTela: string;
  rotBamba: string;
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
  setRemate: (value: string) => void;
  setRemateColor: (value: string) => void;
  setCurvaBamba: (value: string) => void;
  setBambaDistinta: (value: boolean) => void;
  setTelaBamba: (value: string) => void;
  setStructureColor: (value: string) => void;
  setRotTela: (value: string) => void;
  setRotBamba: (value: string) => void;
  addAwning: (workType?: Awning['workType']) => void;
  duplicateAwning: (id: string) => void;
  removeAwning: (id: string) => void;
  updateAwning: (id: string, patch: Partial<Awning>) => void;
}) {
  const totalUnits = awnings.reduce((sum, awning) => sum + (awning.units || 0), 0);
  const indexedAwnings = awnings.map((awning, index) => ({ awning, index }));
  const fullAwnings = indexedAwnings.filter(({ awning }) => awning.workType !== 'FABRIC_ONLY');
  const fabricJobs = indexedAwnings.filter(({ awning }) => awning.workType === 'FABRIC_ONLY');

  function addFabricJob() {
    const onlyAwning = awnings.length === 1 ? awnings[0] : null;
    const isBlankStarter = onlyAwning
      && onlyAwning.workType !== 'FABRIC_ONLY'
      && !onlyAwning.model
      && !onlyAwning.of
      && !onlyAwning.width
      && !onlyAwning.projection;

    if (isBlankStarter) {
      updateAwning(onlyAwning.id, { workType: 'FABRIC_ONLY' });
      return;
    }
    addAwning('FABRIC_ONLY');
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
    if ('curvaBamba' in patch) setCurvaBamba(patch.curvaBamba as string);
    if ('bambaDistinta' in patch) setBambaDistinta(patch.bambaDistinta as boolean);
    if ('telaBamba' in patch) setTelaBamba(patch.telaBamba as string);
    if ('structureColor' in patch) setStructureColor(patch.structureColor as string);
    if ('rotTela' in patch) setRotTela(patch.rotTela as string);
    if ('rotBamba' in patch) setRotBamba(patch.rotBamba as string);
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
            remate={remate}
            remateColor={remateColor}
            curvaBamba={curvaBamba}
            bambaDistinta={bambaDistinta}
            telaBamba={telaBamba}
            structureColor={structureColor}
            rotTela={rotTela}
            rotBamba={rotBamba}
            totalUnits={totalUnits}
            showStructureColor={fullAwnings.some(({ awning }) => Boolean(awning.model))}
            set={setOrderField}
          />
        </div>
      </section>

      <section className="work-type-launcher" aria-label="Añadir al pedido">
        <div className="work-type-launcher-title">
          <strong>Añadir al pedido</strong>
          <span>Elige el tipo de planteamiento</span>
        </div>
        <button type="button" className="work-type-option" onClick={() => addAwning('FULL_AWNING')}>
          <Layers3 aria-hidden="true" />
          <span><strong>Toldo completo</strong><small>Estructura y tela</small></span>
          <Plus aria-hidden="true" />
        </button>
        <button type="button" className="work-type-option work-type-option-fabric" onClick={addFabricJob}>
          <Scissors aria-hidden="true" />
          <span><strong>Cambio de tela</strong><small>Toldo, cortina, enrollable, bambalina o Antica</small></span>
          <Plus aria-hidden="true" />
        </button>
      </section>

      <section className="awnings-section">
        <div className="section-header">
          <div>
            <h2>Toldos completos</h2>
            <span>Estructura y tela</span>
          </div>
          <button className="icon-text-button" type="button" onClick={() => addAwning('FULL_AWNING')}>
            <Plus aria-hidden="true" />
            Añadir toldo
          </button>
        </div>

        <div className="awning-grid">
          {fullAwnings.map(({ awning, index }) => (
            <AwningColumn
              key={awning.id}
              awning={awning}
              index={index}
              ofCalculation={calculation?.ofs.find((o) => o.awningId === awning.id)?.calculation}
              sameFabric={sameFabric}
              parameters={parameters}
              onUpdate={updateAwning}
              onDuplicate={duplicateAwning}
              onRemove={removeAwning}
            />
          ))}
          {fullAwnings.length === 0 && <div className="awning-section-empty">Sin toldos completos en este pedido.</div>}
        </div>
      </section>

      <section className="awnings-section fabric-jobs-section">
        <div className="section-header">
          <div>
            <h2>Trabajos de tela</h2>
            <span>Sin estructura ni lacado</span>
          </div>
          <button className="icon-text-button" type="button" onClick={addFabricJob}>
            <Plus aria-hidden="true" />
            Añadir trabajo
          </button>
        </div>

        <div className="awning-grid">
          {fabricJobs.map(({ awning, index }) => (
            <AwningColumn
              key={awning.id}
              awning={awning}
              index={index}
              ofCalculation={calculation?.ofs.find((o) => o.awningId === awning.id)?.calculation}
              sameFabric={sameFabric}
              parameters={parameters}
              onUpdate={updateAwning}
              onDuplicate={duplicateAwning}
              onRemove={removeAwning}
            />
          ))}
          {fabricJobs.length === 0 && <div className="awning-section-empty">Añade aquí cambios de tela, cortina, enrollable, bambalina o Antica.</div>}
        </div>
      </section>

      <LiveResults calculation={calculation} state={calculationState} />
      <DespieceView calculation={calculation} awnings={awnings} />
    </>
  );
}
