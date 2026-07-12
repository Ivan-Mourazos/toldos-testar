import React from 'react';

export function NumberField({ label, value, min, max, onChange }: { label: string; value: number | null; min?: number; max?: number; onChange: (value: number | null) => void }) {
  return (
    <label>
      <span>{label}</span>
      <input
        type="number"
        min={min}
        max={max}
        value={value === null ? '' : value}
        onChange={(event) => {
          const raw = event.target.value;
          onChange(raw === '' ? null : Number(raw));
        }}
      />
    </label>
  );
}
