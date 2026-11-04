import React, { useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Check, ChevronDown } from 'lucide-react';
import { controlLabel } from './controlLabels';
import { useFloatingMenu } from '../hooks/useFloatingMenu';
import { ReadPair, useReadMode, withUnit } from './ReadMode';
import { readUnitOf } from '../readGroups';

type Props = {
  label: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
  placeholder?: string;
  allowEmpty?: boolean;
  emptyLabel?: string;
  missing?: boolean;
  /** Texto de cada opción (por defecto, controlLabel); con '' da el de la opción vacía de la lista. */
  optionLabel?: (value: string) => string;
  optionGroup?: (value: string) => string;
};

export function SelectField({ label, value, options, onChange, placeholder, allowEmpty = false, emptyLabel, missing = false, optionLabel, optionGroup }: Props) {
  const labelOf = (option: string) => (optionLabel ? optionLabel(option) : controlLabel(option));
  const emptyOptionLabel = optionLabel?.('') || emptyLabel || 'No indicado';
  const reading = useReadMode();
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const labelId = useId();
  const listboxId = useId();
  const visibleOptions = allowEmpty ? ['', ...options.filter(Boolean)] : options;
  const selectedIndex = visibleOptions.indexOf(value);
  // La lista se ensancha hasta que quepa la opción más larga, sin cortar los nombres (Iván,
  // 04/11/2026: «Negro intenso textura 9005-9405» salía cortado). Unos 7,5 px por letra.
  const textoMasLargo = visibleOptions.reduce((max, option) => Math.max(max, (option ? optionLabel?.(option) ?? option : emptyOptionLabel).length), 0);
  const anchoOpciones = Math.min(440, Math.ceil(textoMasLargo * 7.5) + 64);
  const listaLarga = optionGroup || visibleOptions.length > 12;
  const menuStyle = useFloatingMenu(open, triggerRef, { maxHeight: listaLarga ? 360 : 236, preferredWidth: optionGroup ? Math.max(390, anchoOpciones) : anchoOpciones });
  const sections: { group: string; entries: { option: string; index: number }[] }[] = [];
  visibleOptions.forEach((option, index) => {
    const group = option ? optionGroup?.(option) || '' : '';
    if (!sections.length || sections[sections.length - 1].group !== group) sections.push({ group, entries: [] });
    sections[sections.length - 1].entries.push({ option, index });
  });

  useEffect(() => {
    if (open) menuRef.current?.querySelector('[data-active="true"]')?.scrollIntoView({ block: 'nearest' });
  }, [open, activeIndex]);

  useEffect(() => {
    if (!open) return undefined;

    const closeOutside = (event: PointerEvent) => {
      const target = event.target as Node;
      if (!rootRef.current?.contains(target) && !menuRef.current?.contains(target)) setOpen(false);
    };

    document.addEventListener('pointerdown', closeOutside);
    return () => document.removeEventListener('pointerdown', closeOutside);
  }, [open]);

  // En la ficha, un vacío que es una opción con nombre propio («Tipo de pared · No
  // indicada», «Dibujo de confección · Automático») se lee con ese nombre. Un dato
  // obligatorio que falta, o un select sin opción vacía con nombre, se lee «—».
  if (reading) {
    const emptyRead = allowEmpty && emptyLabel && !missing ? emptyLabel : '';
    return <ReadPair label={label} value={value ? withUnit(labelOf(value), readUnitOf(label)) : emptyRead} />;
  }

  const showOptions = () => {
    setActiveIndex(selectedIndex >= 0 ? selectedIndex : 0);
    setOpen(true);
  };

  const choose = (option: string) => {
    onChange(option);
    setOpen(false);
    requestAnimationFrame(() => triggerRef.current?.focus());
  };

  const moveActive = (direction: 1 | -1) => {
    if (!open) {
      showOptions();
      return;
    }
    setActiveIndex((current) => (current + direction + visibleOptions.length) % visibleOptions.length);
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>) => {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      moveActive(event.key === 'ArrowDown' ? 1 : -1);
    } else if (event.key === 'Home' && open) {
      event.preventDefault();
      setActiveIndex(0);
    } else if (event.key === 'End' && open) {
      event.preventDefault();
      setActiveIndex(visibleOptions.length - 1);
    } else if ((event.key === 'Enter' || event.key === ' ') && open) {
      event.preventDefault();
      choose(visibleOptions[activeIndex]);
    } else if (event.key === 'Escape' && open) {
      event.preventDefault();
      setOpen(false);
    }
  };

  return (
    <div ref={rootRef} className={`field select-field${open ? ' is-open' : ''}${missing ? ' is-missing' : ''}`}>
      <span id={labelId}>{label}</span>
      <button
        ref={triggerRef}
        type="button"
        className={`select-control${value === '' ? ' is-placeholder' : ''}`}
        role="combobox"
        aria-expanded={open}
        aria-controls={listboxId}
        aria-haspopup="listbox"
        aria-labelledby={labelId}
        aria-invalid={missing || undefined}
        title={value ? labelOf(value) : undefined}
        onClick={() => open ? setOpen(false) : showOptions()}
        onKeyDown={handleKeyDown}
      >
        <span>{value ? labelOf(value) : placeholder || 'Elegir…'}</span>
        <ChevronDown aria-hidden="true" />
      </button>

      {open && createPortal(
        <div ref={menuRef} id={listboxId} className="select-options select-options-portal" style={menuStyle} role="listbox" aria-labelledby={labelId}>
          {sections.map(({ group, entries }, sectionIndex) => (
            <div key={sectionIndex} role={group ? 'group' : undefined} aria-label={group || undefined}>
              {group && <div className="select-group-label">{group}</div>}
              {entries.map(({ option, index }) => (
                <button
                  key={option || '__empty'}
                  type="button"
                  className={`select-option${option === value ? ' is-selected' : ''}${index === activeIndex ? ' is-active' : ''}`}
                  role="option"
                  aria-selected={option === value}
                  data-active={index === activeIndex || undefined}
                  title={option ? labelOf(option) : emptyOptionLabel}
                  onMouseEnter={() => setActiveIndex(index)}
                  onClick={() => choose(option)}
                >
                  <span>{option ? labelOf(option) : emptyOptionLabel}</span>
                  {option === value && <Check aria-hidden="true" />}
                </button>
              ))}
            </div>
          ))}
        </div>,
        document.body
      )}
    </div>
  );
}
