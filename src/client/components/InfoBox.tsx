import React from 'react';

export function InfoBox({ title, rows }: { title: string; rows: Array<[string, string | number]> }) {
  return (
    <div className="info-box">
      <strong>{title}</strong>
      {rows.map(([label, value]) => (
        <div key={label}>
          <span>{label}</span>
          <b>{value || '-'}</b>
        </div>
      ))}
    </div>
  );
}
