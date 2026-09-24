import React from 'react';
import { ReadPair, useReadMode, withUnit } from './ReadMode';

export function NumberField({ label, value, min, max, step, onChange, missing = false, unit }: { label: string; value: number | null; min?: number; max?: number; step?: number; onChange: (value: number | null) => void; missing?: boolean; unit?: string }) {
  const reading = useReadMode();
  // En la ficha, la medida con su unidad: la que se indique o, si la etiqueta ya la lleva
  // («Bamba (cm)»), esa.
  if (reading) return <ReadPair label={label} value={withUnit(value ?? '', unit ?? (/\(cm\)$/.test(label) ? 'cm' : undefined))} />;
  return (
    <label className={missing ? 'is-missing' : undefined}>
      <span>{label}</span>
      <input
        type="number"
        min={min}
        max={max}
        step={step}
        value={value === null ? '' : value}
        aria-invalid={missing || undefined}
        onChange={(event) => {
          const raw = event.target.value;
          onChange(raw === '' ? null : Number(raw));
        }}
      />
    </label>
  );
}
