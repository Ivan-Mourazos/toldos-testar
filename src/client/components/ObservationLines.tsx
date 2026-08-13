import React, { useRef } from 'react';
import { Plus, Trash2 } from 'lucide-react';

type Props = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  readOnly?: boolean;
};

export function ObservationLines({ label, value, onChange, readOnly = false }: Props) {
  const lines = observationLines(value);
  const listRef = useRef<HTMLDivElement>(null);

  function updateLine(index: number, nextValue: string) {
    const next = [...lines];
    next[index] = nextValue;
    onChange(next.join('\n'));
  }

  function addLine(afterIndex = lines.length - 1) {
    const next = [...lines];
    next.splice(afterIndex + 1, 0, '');
    onChange(next.join('\n'));
    requestAnimationFrame(() => {
      listRef.current?.querySelector<HTMLInputElement>(`[data-observation-line="${afterIndex + 1}"]`)?.focus();
    });
  }

  function removeLine(index: number) {
    if (lines.length === 1) {
      onChange('');
      return;
    }
    onChange(lines.filter((_, lineIndex) => lineIndex !== index).join('\n'));
  }

  return (
    <section className="observation-lines" aria-label={label}>
      <header className="observation-lines-header">
        <span>{label}</span>
        {!readOnly && <button type="button" onClick={() => addLine()}>
          <Plus aria-hidden="true" />Añadir línea
        </button>}
      </header>
      <div className="observation-lines-list" ref={listRef}>
        {lines.map((line, index) => (
          <div className="observation-line" key={index}>
            <span className="observation-line-number" aria-hidden="true">{String(index + 1).padStart(2, '0')}</span>
            <input
              type="text"
              data-observation-line={index}
              value={line}
              aria-label={`${label}, línea ${index + 1}`}
              placeholder="Escribe una observación"
              readOnly={readOnly}
              onChange={(event) => updateLine(index, event.target.value)}
              onKeyDown={(event) => {
                if (readOnly) return;
                if (event.key !== 'Enter') return;
                event.preventDefault();
                addLine(index);
              }}
            />
            {!readOnly && <button
              type="button"
              className="observation-line-remove"
              aria-label={`Eliminar ${label.toLowerCase()}, línea ${index + 1}`}
              onClick={() => removeLine(index)}
              disabled={lines.length === 1 && !line}
            >
              <Trash2 aria-hidden="true" />
            </button>}
          </div>
        ))}
      </div>
    </section>
  );
}

export function observationLines(value: string) {
  const normalized = String(value || '').replace(/\r\n?/g, '\n');
  return normalized.split('\n');
}
