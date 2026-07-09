import React from 'react';
import type { HistoryEntry } from '../types';

export function HistoryView({ entries, onReuse }: { entries: HistoryEntry[]; onReuse: (entry: HistoryEntry) => void }) {
  return (
    <section className="history-panel panel">
      <div className="section-header">
        <h2>Historial</h2>
        <span>{entries.length} pedidos guardados en este navegador</span>
      </div>
      <div className="history-table-wrap">
        <table className="history-table">
          <thead>
            <tr>
              <th>Fecha</th>
              <th>Pedido</th>
              <th>Cliente</th>
              <th>OFs</th>
              <th>Modelos</th>
              <th>Notas</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {entries.length === 0 ? (
              <tr><td colSpan={7}>Todavía no hay cálculos en el historial.</td></tr>
            ) : entries.map((entry) => (
              <tr key={entry.id}>
                <td>{new Date(entry.createdAt).toLocaleString('es-ES')}</td>
                <td><strong>{entry.orderCode || '-'}</strong></td>
                <td>{entry.customer || '-'}</td>
                <td>{entry.ofs.join(', ') || '-'}</td>
                <td>{entry.models.join(', ') || '-'}</td>
                <td>{entry.notes || '-'}</td>
                <td><button className="ghost-button compact" type="button" onClick={() => onReuse(entry)}>Abrir</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
