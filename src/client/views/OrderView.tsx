import React from 'react';
import {
  AlertCircle,
  Plus
} from 'lucide-react';
import type { Awning, Calculation, CalculationState } from '../types';
import { formatDecimal } from '../constants';
import { OrderHeader } from '../components/OrderHeader';
import { AwningColumn } from '../components/AwningColumn';

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

        <aside className="side-panel run-panel">
          <span>Estado del planteamiento</span>
          <strong>{calculation ? `${calculation.totals.awnings} toldos` : `${awnings.length} toldos`}</strong>
          <em>{buildCalculationStatus(calculationState, calculation)}</em>
          {calculation?.diagnostics.slice(0, 4).map((item, index) => (
            <p className={`diagnostic ${item.level}`} key={`${item.message}-${index}`}>
              <AlertCircle aria-hidden="true" />
              {item.message}
            </p>
          ))}
        </aside>
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
              ofCalculation={calculation?.ofs.find((o) => o.of === awning.of)?.calculation}
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

      <LiveResultView calculation={calculation} />
    </>
  );
}

function buildCalculationStatus(state: CalculationState, calculation: Calculation | null) {
  if (state === 'validating') return 'Actualizando automáticamente';
  if (state === 'error') return 'Hay datos pendientes de revisar';
  if (calculation) return `${calculation.totals.materials} líneas preparadas`;
  return 'Esperando datos';
}

function LiveResultView({ calculation }: { calculation: Calculation | null }) {
  const materialRows = calculation?.ofs.flatMap((ofBlock) =>
    ofBlock.materials.map((material) => ({
      of: ofBlock.of,
      description: material.description || '',
      code: material.code,
      quantity: material.quantity
    }))
  ) || [];

  return (
    <section className="live-results panel">
      <div className="section-header">
        <div>
          <h2>Resultado en vivo</h2>
          <span>Medidas y reserva se actualizan al cambiar el pedido</span>
        </div>
        <strong>{materialRows.length} líneas RPS</strong>
      </div>

      {calculation?.ofs.some((ofBlock) => ofBlock.calculation) && (
        <div className="calculation-strip">
          {calculation.ofs.filter((ofBlock) => ofBlock.calculation).map((ofBlock) => (
            <article key={ofBlock.of}>
              <span>OF {ofBlock.of}</span>
              <strong>{ofBlock.calculation?.valid ? 'Válido' : 'Revisar'}</strong>
              <em>Tela {formatDecimal(ofBlock.calculation?.fabricWidth)} x {formatDecimal(ofBlock.calculation?.fabricDrop)} · {formatDecimal(ofBlock.calculation?.fabricMl)} ml</em>
            </article>
          ))}
        </div>
      )}

      <div className="result-table-wrap">
        <table className="result-table">
          <thead>
            <tr>
              <th>OF</th>
              <th>Artículo</th>
              <th>Descripción</th>
              <th>Cantidad</th>
            </tr>
          </thead>
          <tbody>
            {materialRows.length === 0 ? (
              <tr><td colSpan={4}>Todavía no hay líneas de reserva preparadas.</td></tr>
            ) : materialRows.map((row) => (
              <tr key={`${row.of}-${row.code}`}>
                <td>{row.of}</td>
                <td><strong>{row.code}</strong></td>
                <td>{row.description || '-'}</td>
                <td>{formatDecimal(row.quantity)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
