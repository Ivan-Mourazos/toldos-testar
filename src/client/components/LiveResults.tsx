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
  const materialRows = groupMaterialRows(calculation?.ofs || []);
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
                <span>Toldo {awningLetter(ofBlock.awningIndex ?? index)} · OF {ofBlock.of} · {ofBlock.calculation?.model}</span>
                <strong className={ofBlock.calculation?.valid ? 'badge-ok' : 'badge-danger'}>
                  {ofBlock.calculation?.valid ? 'VÁLIDO' : 'REVISAR'}
                </strong>
              </div>
              <span className="num">
                Tela {formatDecimal(ofBlock.calculation?.fabricWidth)} × {formatDecimal(ofBlock.calculation?.fabricDrop)} · {formatDecimal(ofBlock.calculation?.fabricMl)} ml
                {ofBlock.calculation?.valanceFabricCode ? ` · Bamba ${ofBlock.calculation.valanceFabricCode}: ${formatDecimal(ofBlock.calculation.valanceFabricMl)} ml` : ''}
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

function groupMaterialRows(ofs: Calculation['ofs']) {
  const rows = new Map<string, {
    of: string;
    description: string;
    code: string;
    quantity: number;
    aggregation?: 'sum' | 'max';
  }>();
  for (const ofBlock of ofs) {
    for (const material of ofBlock.materials) {
      const key = `${ofBlock.of.trim().toUpperCase()}||${material.code.trim().toUpperCase()}`;
      const current = rows.get(key) || {
        of: ofBlock.of,
        description: material.description || '',
        code: material.code,
        quantity: 0
      };
      current.quantity = material.aggregation === 'max'
        ? Math.round(Math.max(current.quantity, material.quantity) * 1000) / 1000
        : Math.round((current.quantity + material.quantity) * 1000) / 1000;
      rows.set(key, current);
    }
  }
  return Array.from(rows.values());
}

function awningLetter(index: number) {
  let number = index + 1;
  let label = '';
  while (number > 0) {
    number -= 1;
    label = String.fromCharCode(65 + (number % 26)) + label;
    number = Math.floor(number / 26);
  }
  return label;
}

function buildStatusText(state: CalculationState, calculation: Calculation | null) {
  if (state === 'validating') return 'Actualizando automáticamente…';
  if (state === 'error') return 'Hay datos pendientes de revisar';
  if (calculation) return 'Medidas y reserva se actualizan al cambiar el pedido';
  return 'Esperando datos del pedido';
}
