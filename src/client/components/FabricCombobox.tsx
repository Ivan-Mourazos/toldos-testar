import React, { useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Check, Search, X } from 'lucide-react';
import { fabricSelectionLabel, serializeFabricSelection } from '../../domain/fabricCatalog.js';
import { useFloatingMenu } from '../hooks/useFloatingMenu';

type FabricOption = {
  code: string;
  description: string;
  width: number;
  material?: string;
  family?: string;
  subfamily?: string;
};

type Props = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
};

export function FabricCombobox({ label, value, onChange, placeholder = 'Código, color o nombre aproximado…', disabled = false }: Props) {
  const [query, setQuery] = useState(() => fabricSelectionLabel(value));
  const [options, setOptions] = useState<FabricOption[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const listId = useId();
  const menuStyle = useFloatingMenu(open, rootRef, { maxHeight: 290, preferredWidth: 520 });

  useEffect(() => {
    if (!open) return undefined;
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setLoading(true);
      try {
        const response = await fetch(`/api/catalog/fabrics?q=${encodeURIComponent(query)}&limit=35`, { signal: controller.signal });
        const data = await response.json();
        setOptions(Array.isArray(data.items) ? data.items : []);
      } catch {
        if (!controller.signal.aborted) setOptions([]);
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }, 180);
    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [open, query]);

  useEffect(() => {
    if (!open) return undefined;
    const closeOutside = (event: PointerEvent) => {
      const target = event.target as Node;
      if (!rootRef.current?.contains(target) && !menuRef.current?.contains(target)) setOpen(false);
    };
    document.addEventListener('pointerdown', closeOutside);
    return () => document.removeEventListener('pointerdown', closeOutside);
  }, [open]);

  function choose(option: FabricOption) {
    onChange(serializeFabricSelection(option));
    setQuery(`${option.code} · ${option.description}`);
    setOpen(false);
  }

  function clear() {
    setQuery('');
    setOptions([]);
    onChange('');
    setOpen(true);
    inputRef.current?.focus();
  }

  return (
    <div ref={rootRef} className={`field fabric-combobox${open ? ' is-open' : ''}${disabled ? ' is-disabled' : ''}`}>
      <span>{label}</span>
      <div className="fabric-input-wrap">
        <Search aria-hidden="true" />
        <input
          ref={inputRef}
          role="combobox"
          aria-expanded={open}
          aria-controls={listId}
          autoComplete="off"
          disabled={disabled}
          value={value ? (open ? query : fabricSelectionLabel(value)) : ''}
          placeholder={placeholder}
          onFocus={() => {
            if (disabled) return;
            setQuery(fabricSelectionLabel(value));
            setOpen(true);
          }}
          onChange={(event) => {
            const next = event.target.value;
            setQuery(next);
            onChange(next);
            setOpen(true);
          }}
          onKeyDown={(event) => {
            if (event.key === 'Escape') setOpen(false);
            if (event.key === 'Enter' && options[0]) {
              event.preventDefault();
              choose(options[0]);
            }
          }}
        />
        {!disabled && query && (
          <button
            type="button"
            className="fabric-clear-button"
            aria-label={`Borrar ${label.toLocaleLowerCase('es-ES')}`}
            title="Borrar tela"
            onPointerDown={(event) => event.preventDefault()}
            onClick={clear}
          >
            <X aria-hidden="true" />
          </button>
        )}
      </div>
      {open && createPortal(
        <div ref={menuRef} id={listId} className="fabric-options fabric-options-portal" style={menuStyle} role="listbox">
          {loading && <div className="fabric-option-state">Buscando en RPSNext…</div>}
          {!loading && options.length === 0 && <div className="fabric-option-state">Sin coincidencias</div>}
          {!loading && options.map((option) => (
            <button key={option.code} type="button" className="fabric-option" role="option" onClick={() => choose(option)}>
              <span><strong>{option.code}</strong><small>{option.description}</small></span>
              <span className="fabric-option-meta">{option.width} cm<Check aria-hidden="true" /></span>
            </button>
          ))}
        </div>,
        document.body
      )}
    </div>
  );
}
