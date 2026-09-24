import React from 'react';
import { controlLabel } from './controlLabels';
import { ReadPair, useReadMode } from './ReadMode';

export function SegmentedField({ label, value, options, onChange, missing = false }: { label: string; value: string; options: string[]; onChange: (value: string) => void; missing?: boolean }) {
  const reading = useReadMode();
  if (reading) return <ReadPair label={label} value={value ? controlLabel(value) : ''} />;
  return (
    <div className={`field segmented-field${missing ? ' is-missing' : ''}`}>
      <span>{label}</span>
      <div className={`segmented-control${value ? '' : ' is-empty'}`} role="group" aria-label={label} aria-invalid={missing || undefined}>
        {options.map((option) => (
          <button
            key={option}
            type="button"
            className={option === value ? 'segmented-option active' : 'segmented-option'}
            aria-pressed={option === value}
            onClick={() => onChange(option)}
          >
            {controlLabel(option)}
          </button>
        ))}
      </div>
    </div>
  );
}
