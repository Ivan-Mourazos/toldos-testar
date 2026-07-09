import React from 'react';
import type { TechnicalMatrix } from '../types';

export function TechnicalMatrixCard({ matrix }: { matrix: TechnicalMatrix }) {
  return (
    <article className="technical-matrix-card">
      <div>
        <h4>{matrix.title}</h4>
        <span>{matrix.subtitle}</span>
      </div>
      <div className="parameter-table-wrap">
        <table className="technical-matrix">
          <thead>
            <tr>
              {matrix.columns.map((column) => <th key={column}>{column}</th>)}
            </tr>
          </thead>
          <tbody>
            {matrix.rows.map((row, rowIndex) => (
              <tr key={`${matrix.title}-${rowIndex}`}>
                {row.map((cell, cellIndex) => <td key={`${matrix.title}-${rowIndex}-${cellIndex}`}>{cell}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </article>
  );
}
