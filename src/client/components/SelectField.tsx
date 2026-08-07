import React, { useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Check, ChevronDown } from 'lucide-react';
import { controlLabel } from './controlLabels';
import { useFloatingMenu } from '../hooks/useFloatingMenu';

type Props = {
  label: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
  placeholder?: string;
  allowEmpty?: boolean;
  emptyLabel?: string;
};

export function SelectField({ label, value, options, onChange, placeholder, allowEmpty = false, emptyLabel = 'No indicado' }: Props) {
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const labelId = useId();
  const listboxId = useId();
  const visibleOptions = allowEmpty ? ['', ...options.filter(Boolean)] : options;
  const selectedIndex = visibleOptions.indexOf(value);
  const menuStyle = useFloatingMenu(open, triggerRef, { maxHeight: 236 });

  useEffect(() => {
    if (!open) return undefined;

    const closeOutside = (event: PointerEvent) => {
      const target = event.target as Node;
      if (!rootRef.current?.contains(target) && !menuRef.current?.contains(target)) setOpen(false);
    };

    document.addEventListener('pointerdown', closeOutside);
    return () => document.removeEventListener('pointerdown', closeOutside);
  }, [open]);

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
      setActiveIndex(options.length - 1);
    } else if ((event.key === 'Enter' || event.key === ' ') && open) {
      event.preventDefault();
      choose(visibleOptions[activeIndex]);
    } else if (event.key === 'Escape' && open) {
      event.preventDefault();
      setOpen(false);
    }
  };

  return (
    <div ref={rootRef} className={`field select-field${open ? ' is-open' : ''}`}>
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
        title={value ? controlLabel(value) : undefined}
        onClick={() => open ? setOpen(false) : showOptions()}
        onKeyDown={handleKeyDown}
      >
        <span>{value ? controlLabel(value) : placeholder || 'Elegir…'}</span>
        <ChevronDown aria-hidden="true" />
      </button>

      {open && createPortal(
        <div ref={menuRef} id={listboxId} className="select-options select-options-portal" style={menuStyle} role="listbox" aria-labelledby={labelId}>
          {visibleOptions.map((option, index) => (
            <button
              key={option || '__empty'}
              type="button"
              className={`select-option${option === value ? ' is-selected' : ''}${index === activeIndex ? ' is-active' : ''}`}
              role="option"
              aria-selected={option === value}
              title={option ? controlLabel(option) : emptyLabel}
              onMouseEnter={() => setActiveIndex(index)}
              onClick={() => choose(option)}
            >
              <span>{option ? controlLabel(option) : emptyLabel}</span>
              {option === value && <Check aria-hidden="true" />}
            </button>
          ))}
        </div>,
        document.body
      )}
    </div>
  );
}
