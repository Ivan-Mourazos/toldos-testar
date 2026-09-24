import React from 'react';
import { ReadPair, readNumber, useReadMode, withUnit } from './ReadMode';
import { readUnitOf } from '../readGroups';

export function NumberField({ label, value, min, max, step, onChange, missing = false }: { label: string; value: number | null; min?: number; max?: number; step?: number; onChange: (value: number | null) => void; missing?: boolean }) {
  const reading = useReadMode();
  // En la ficha, la medida con coma decimal y su unidad («12,5 cm»); si la etiqueta ya la
  // dice («Bamba (cm)»), solo el número.
  if (reading) return <ReadPair label={label} value={withUnit(readNumber(value), readUnitOf(label))} />;
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
