import React, { useRef } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { useReadMode } from './ReadMode';

type Props = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  readOnly?: boolean;
};

export function ObservationLines({ label, value, onChange, readOnly = false }: Props) {
  const reading = useReadMode();
  const lines = observationLines(value);
  const listRef = useRef<HTMLDivElement>(null);
  const isEmpty = lines.every((line) => !line.trim());

  // Ficha de lectura del toldo (rediseño 3 §1): nota amarilla si hay texto, línea gris si
  // no. Las observaciones del pedido no van en la ficha y siguen con su lectura de siempre.
  if (reading) {
    return (
      <div className={`read-note${isEmpty ? '' : ' has-text'}`} data-group="notas" style={{ order: 99 }}>
        <span className="read-label">{label}</span>
        {isEmpty ? <p className="read-empty">Sin observaciones</p> : (
          <p>{lines.filter((line) => line.trim()).map((line, index) => <React.Fragment key={index}>{index > 0 && <br />}{line}</React.Fragment>)}</p>
        )}
      </div>
    );
  }

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
    <section className={`observation-lines${readOnly ? ' is-reading' : ''}`} aria-label={label}>
      <header className="observation-lines-header">
        <span>{label}</span>
        {!readOnly && <button type="button" onClick={() => addLine()}>
          <Plus aria-hidden="true" />Añadir línea
        </button>}
      </header>
      {readOnly ? (
        isEmpty ? <p className="observation-lines-empty">Sin observaciones</p> : (
          // Solo la línea de etiqueta y el texto, sin la caja con borde de la edición
          // (rediseño 24/09/2026 §5, revisión): en lectura no hay nada que enfocar ni
          // que borrar por línea.
          <div className="observation-lines-read">
            {lines.filter((line) => line.trim()).map((line, index) => <p key={index}>{line}</p>)}
          </div>
        )
      ) : (
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
                onChange={(event) => updateLine(index, event.target.value)}
                onKeyDown={(event) => {
                  if (event.key !== 'Enter') return;
                  event.preventDefault();
                  addLine(index);
                }}
              />
              <button
                type="button"
                className="observation-line-remove"
                aria-label={`Eliminar ${label.toLowerCase()}, línea ${index + 1}`}
                onClick={() => removeLine(index)}
                disabled={lines.length === 1 && !line}
              >
                <Trash2 aria-hidden="true" />
              </button>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

export function observationLines(value: string) {
  const normalized = String(value || '').replace(/\r\n?/g, '\n');
  return normalized.split('\n');
}
