import React from 'react';
import { AlertCircle } from 'lucide-react';
import type { Calculation, CalculationState } from '../types';
import { formatDecimal } from '../constants';

type Props = {
  calculation: Calculation | null;
  state: CalculationState;
};

export function LiveResults({ calculation, state }: Props) {
  const ofCards = calculation?.ofs.filter((ofBlock) => ofBlock.calculation) || [];
  const materialRows = calculation?.ofs.flatMap((ofBlock) =>
    ofBlock.materials.map((material) => ({
      of: ofBlock.of,
      description: material.description || '',
      code: material.code,
      quantity: material.quantity
    }))
  ) || [];
  const diagnostics = calculation?.diagnostics || [];

  return (
    <section className="live-results panel">
      <div className="section-header">
        <div>
          <h2>Resultado en vivo</h2>
          <span>{buildStatusText(state, calculation)}</span>
        </div>
        <strong className="num">{materialRows.length} líneas RPS</strong>
      </div>

      {diagnostics.length > 0 && (
        <ul className="diagnostics-list">
          {diagnostics.map((item, index) => (
            <li
              key={`${item.message}-${index}`}
              className={item.level === 'error' ? 'badge-danger' : 'badge-warn'}
            >
              <AlertCircle aria-hidden="true" />
              {item.message}
            </li>
          ))}
        </ul>
      )}

      {ofCards.length > 0 && (
        <div className="of-card-row">
          {ofCards.map((ofBlock, index) => (
            <article className="of-card" key={`${ofBlock.of}-${index}`}>
              <div className="of-card-head">
                <span>OF {ofBlock.of} · {ofBlock.calculation?.model}</span>
                <strong className={ofBlock.calculation?.valid ? 'badge-ok' : 'badge-danger'}>
                  {ofBlock.calculation?.valid ? 'VÁLIDO' : 'REVISAR'}
                </strong>
              </div>
              <span className="num">
                Tela {formatDecimal(ofBlock.calculation?.fabricWidth)} × {formatDecimal(ofBlock.calculation?.fabricDrop)} · {formatDecimal(ofBlock.calculation?.fabricMl)} ml
              </span>
            </article>
          ))}
        </div>
      )}

      {materialRows.length === 0 ? (
        <p className="rps-empty">Todavía no hay líneas de reserva preparadas.</p>
      ) : (
        <div className="rps-table-wrap">
          <table className="rps-table">
            <thead>
              <tr>
                <th>OF</th>
                <th>Artículo</th>
                <th>Descripción</th>
                <th className="num">Cantidad</th>
              </tr>
            </thead>
            <tbody>
              {materialRows.map((row, index) => (
                <tr key={`${row.of}-${row.code}-${index}`}>
                  <td>{row.of}</td>
                  <td className="code">{row.code}</td>
                  <td>{row.description || '-'}</td>
                  <td className="num">{formatDecimal(row.quantity)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

function buildStatusText(state: CalculationState, calculation: Calculation | null) {
  if (state === 'validating') return 'Actualizando automáticamente…';
  if (state === 'error') return 'Hay datos pendientes de revisar';
  if (calculation) return 'Medidas y reserva se actualizan al cambiar el pedido';
  return 'Esperando datos del pedido';
}
