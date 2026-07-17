import React from 'react';
import { controlLabel } from './controlLabels';

export function SegmentedField({ label, value, options, onChange }: { label: string; value: string; options: string[]; onChange: (value: string) => void }) {
  return (
    <div className="field segmented-field">
      <span>{label}</span>
      <div className={`segmented-control${value ? '' : ' is-empty'}`} role="group" aria-label={label}>
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
