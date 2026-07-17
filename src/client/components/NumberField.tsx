import React from 'react';

export function NumberField({ label, value, min, max, step, onChange }: { label: string; value: number | null; min?: number; max?: number; step?: number; onChange: (value: number | null) => void }) {
  return (
    <label>
      <span>{label}</span>
      <input
        type="number"
        min={min}
        max={max}
        step={step}
        value={value === null ? '' : value}
        onChange={(event) => {
          const raw = event.target.value;
          onChange(raw === '' ? null : Number(raw));
        }}
      />
    </label>
  );
}
