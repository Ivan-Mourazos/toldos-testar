import React, { useMemo, useState } from 'react';
import { AlertCircle, Search } from 'lucide-react';
import type { HistoryEntry } from '../types';

export function HistoryView({ entries, onReuse }: { entries: HistoryEntry[]; onReuse: (entry: HistoryEntry) => void }) {
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return entries;
    return entries.filter((entry) =>
      entry.orderCode.toLowerCase().includes(term) || entry.customer.toLowerCase().includes(term)
    );
  }, [entries, query]);

  return (
    <section className="history-panel panel">
      <div className="section-header">
        <div>
          <h2>Historial</h2>
          <span>{entries.length} pedidos guardados en este navegador</span>
        </div>
      </div>

      <div className="history-search">
        <Search aria-hidden="true" />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar por pedido o cliente…"
          aria-label="Buscar en el historial"
        />
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
              <th>Diagnósticos</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {entries.length === 0 ? (
              <tr>
                <td className="history-empty" colSpan={7}>
                  Aún no hay pedidos guardados. Se añaden al guardar RPS.
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td className="history-empty" colSpan={7}>
                  Sin resultados para «{query}».
                </td>
              </tr>
            ) : (
              filtered.map((entry) => (
                <tr key={entry.id}>
                  <td>{formatDate(entry.createdAt)}</td>
                  <td><strong>{entry.orderCode || '-'}</strong></td>
                  <td>{entry.customer || '-'}</td>
                  <td>
                    {entry.ofs.length > 0 ? (
                      <div className="history-badges">
                        {entry.ofs.map((of, index) => (
                          <span className="code" key={`${of}-${index}`}>{of}</span>
                        ))}
                      </div>
                    ) : '-'}
                  </td>
                  <td>{entry.models.join(', ') || '-'}</td>
                  <td>
                    {entry.diagnostics > 0 ? (
                      <span className="badge-warn">
                        <AlertCircle aria-hidden="true" size={14} />
                        {entry.diagnostics}
                      </span>
                    ) : '-'}
                  </td>
                  <td>
                    <button className="ghost-button compact" type="button" onClick={() => onReuse(entry)}>
                      Reutilizar
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function formatDate(iso: string) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '-';
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  return `${day}/${month}/${date.getFullYear()}`;
}
