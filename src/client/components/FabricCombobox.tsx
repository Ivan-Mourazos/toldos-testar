import React, { useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Check, Search, X } from 'lucide-react';
import { fabricSelectionLabel, resolveFabric, serializeFabricSelection } from '../../domain/fabricCatalog.js';
import { useFloatingMenu } from '../hooks/useFloatingMenu';
import { useFabricStocks } from '../hooks/useFabricStock';
import { agruparTelas } from '../agruparTelas';
import { useSalidaAnimada } from '../hooks/useSalidaAnimada';
import { ReadPair, useReadMode } from './ReadMode';
import { NumberField } from './NumberField';

type FabricOption = {
  code: string;
  description: string;
  width: number | null;
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
  missing?: boolean;
  // Solo para la ficha: qué leer si no hay tela y eso significa algo («Tela bamba · Igual
  // que la tela»); si no, «—».
  readEmptyAs?: string;
  onlyPvc?: boolean;
  soloReferencia?: boolean;
  enfocarAlMontar?: boolean;
};

export function FabricCombobox({ label, value, onChange, placeholder = 'Código, color o nombre…', disabled = false, missing = false, readEmptyAs = '', onlyPvc = false, soloReferencia = false, enfocarAlMontar = soloReferencia }: Props) {
  const reading = useReadMode();
  const labelId = useId();
  const [query, setQuery] = useState(() => fabricSelectionLabel(value));
  // Texto escrito sin elegir ninguna opción (informe tela-0930, F5). No se guarda como
  // tela: la tela se queda vacía y el texto se sigue viendo, marcado «sin elegir».
  const [typed, setTyped] = useState(false);
  const [options, setOptions] = useState<FabricOption[]>([]);
  const [open, setOpen] = useState(false);
  const { montado, alTerminar } = useSalidaAnimada(open);
  const [loading, setLoading] = useState(false);
  const [portal, setPortal] = useState<HTMLDialogElement | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const listId = useId();
  const menuStyle = useFloatingMenu(open, rootRef, { maxHeight: 290, preferredWidth: 520 });
  // En todos los buscadores de tela se elige la lona, no la marca: las marcas de la misma lona
  // salen juntas con su stock y se coge la que más tiene, como en remolques (Iván, 26/11/2026).
  const estadosStock = useFabricStocks(open && !loading ? options.map(o => o.code) : []);
  const stocks = Object.fromEntries(Object.entries(estadosStock).flatMap(([c, e]) => e.status === 'ready' ? [[c, e.stock.disponible]] : []));
  const grupos = agruparTelas(options, stocks);

  useEffect(() => {
    if (!open) return undefined;
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setLoading(true);
      try {
        const response = await fetch(`/api/catalog/fabrics?q=${encodeURIComponent(query)}&limit=35`, { signal: controller.signal });
        const data = await response.json();
        const items: FabricOption[] = Array.isArray(data.items) ? data.items : [];
        setOptions(onlyPvc ? items.filter(f => f.material?.trim().toUpperCase() === 'PLASTICA (LONA)') : items);
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
  }, [open, query, onlyPvc]);

  useEffect(() => {
    if (!open) return undefined;
    const closeOutside = (event: PointerEvent) => {
      const target = event.target as Node;
      if (!rootRef.current?.contains(target) && !menuRef.current?.contains(target)) setOpen(false);
    };
    document.addEventListener('pointerdown', closeOutside);
    return () => document.removeEventListener('pointerdown', closeOutside);
  }, [open]);

  // Una tela puesta desde fuera (propuesta, «Por toldo», otro pedido) sustituye lo que
  // se hubiera escrito sin elegir.
  const [seenValue, setSeenValue] = useState(value);
  if (value !== seenValue) {
    setSeenValue(value);
    if (value) {
      setTyped(false);
      setQuery(fabricSelectionLabel(value));
    }
  }

  const selectedFabric = resolveFabric(value);
  const needsRollWidth = !soloReferencia && selectedFabric && !resolveFabric(selectedFabric.code)?.width;
  const widthLabel = label === 'Tela bamba' ? 'Ancho de rollo de bamba (cm)' : 'Ancho de rollo (cm)';
  if (reading) return <>
    <ReadPair label={label} value={value ? fabricSelectionLabel(value) : readEmptyAs} />
    {needsRollWidth && <ReadPair label={widthLabel} value={selectedFabric.width ? selectedFabric.width.toLocaleString('es-ES') : 'Sin indicar'} />}
  </>;

  function choose(option: FabricOption) {
    setTyped(false);
    onChange(serializeFabricSelection(option));
    setQuery(`${option.code} · ${option.description}`);
    setOpen(false);
  }

  function clear() {
    setTyped(false);
    setQuery('');
    setOptions([]);
    onChange('');
    setOpen(true);
    inputRef.current?.focus();
  }

  const unchosen = typed && !value && Boolean(query.trim());

  return (
    <div ref={rootRef} data-fabric-width={label === 'Tela bamba' ? 'valance' : 'primary'} className={`field fabric-combobox${open ? ' is-open' : ''}${disabled ? ' is-disabled' : ''}${missing || (unchosen && !open) ? ' is-missing' : ''}`}>
      <span id={labelId}>{label}</span>
      {/* En solo lectura (Revisión) la tela se lee entera: dentro del buscador se cortaba
          a "ACRI…" y el revisor no podía comprobarla. */}
      {disabled && value ? <p className="fabric-readonly-value">{fabricSelectionLabel(value)}</p> : <div className="fabric-input-wrap">
        <Search aria-hidden="true" />
        <input
          ref={inputRef}
          role="combobox"
          aria-labelledby={labelId}
          aria-invalid={missing || (unchosen && !open) || undefined}
          aria-expanded={open}
          aria-controls={listId}
          autoComplete="off"
          autoFocus={enfocarAlMontar}
          disabled={disabled}
          value={open || typed ? query : value ? fabricSelectionLabel(value) : ''}
          placeholder={placeholder}
          onFocus={event => {
            if (disabled) return;
            setPortal(event.currentTarget.closest('dialog'));
            if (!typed) setQuery(fabricSelectionLabel(value));
            setOpen(true);
          }}
          onChange={(event) => {
            const next = event.target.value;
            setQuery(next);
            setTyped(true);
            // Lo escrito es una búsqueda, no una tela: la que hubiera deja de valer.
            if (value) onChange('');
            setOpen(true);
          }}
          onKeyDown={(event) => {
            if (event.key === 'Escape' && open) { event.preventDefault(); setOpen(false); }
            if (event.key === 'Enter' && open) {
              event.preventDefault();
              if (!loading && grupos[0]) choose(grupos[0].marcas[0]);
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
      </div>}
      {unchosen && !open && <small className="fabric-unchosen-note" role="status">Sin elegir: pulsa una tela de la lista</small>}
      {needsRollWidth && <>
        {!selectedFabric.width && <small className="fabric-unchosen-note" role="alert">Ancho de rollo desconocido. Indícalo para poder calcular.</small>}
        {disabled ? <ReadPair label={widthLabel} value={selectedFabric.width ? selectedFabric.width.toLocaleString('es-ES') : 'Sin indicar'} /> : <NumberField
          label={widthLabel} value={selectedFabric.width} min={0.1} step={0.1} missing={!selectedFabric.width}
          onChange={(width) => onChange(serializeFabricSelection({ ...selectedFabric, width }))} />}
      </>}
      {montado && createPortal(
        <div ref={menuRef} id={listId} className={`fabric-options fabric-options-portal${open ? '' : ' pop-out'}`} style={menuStyle}
          role="listbox" aria-hidden={!open} inert={!open} onAnimationEnd={alTerminar}>
          {loading && <div className="fabric-option-state">Buscando en RPSNext…</div>}
          {!loading && options.length === 0 && <div className="fabric-option-state">Sin coincidencias</div>}
          {!loading && grupos.map(({ clave, nombre, marcas, stock }) => nombre ? (
            <button key={clave} type="button" className="fabric-option" role="option" onClick={() => choose(marcas[0])}>
              <span>
                <strong>{nombre}</strong>
                {marcas.map(m => <small key={m.code} className="fabric-option-marca" title={m.description}>
                  {m.code}{estadosStock[m.code]?.status === 'ready' ? ` · ${formatoM(stocks[m.code])} m` : ''}
                </small>)}
              </span>
              <span className="fabric-option-meta">{stock == null ? '' : `Stock · ${formatoM(stock)} m`}<Check aria-hidden="true" /></span>
            </button>
          ) : marcas.map((option) => (
            <button key={option.code} type="button" className="fabric-option" role="option" onClick={() => choose(option)}>
              <span><strong>{option.code}</strong><small>{option.description}</small></span>
              <span className="fabric-option-meta">{estadosStock[option.code]?.status === 'ready'
                ? `Stock · ${formatoM(stocks[option.code])} m`
                : option.width ? `${option.width.toLocaleString('es-ES')} cm` : 'Ancho sin indicar'}<Check aria-hidden="true" /></span>
            </button>
          )))}
        </div>,
        portal ?? document.body
      )}
    </div>
  );
}

const formatoM = (n: number) => n.toLocaleString('es-ES', { maximumFractionDigits: 1 });
