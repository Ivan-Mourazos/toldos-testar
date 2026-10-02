import React from 'react';
import { LoaderCircle, Search } from 'lucide-react';
import { lookupOnEnter } from './orderLookup';

export function OrderSearch({ number, onChange, loading, onSearch }: {
  number: string; onChange: (value: string) => void; loading: boolean; onSearch: () => void;
}) {
  const disabled = loading || !number.trim();
  return <form className="order-search" onSubmit={event => { event.preventDefault(); if (!disabled) onSearch(); }}>
    <label htmlFor="order-search-number">Buscar pedido</label>
    <div className="order-search-controls">
      <input id="order-search-number" value={number} onChange={event => onChange(event.target.value)}
        placeholder="Número de pedido · AR26xxxxx" autoComplete="off" disabled={loading}
        onKeyDown={event => lookupOnEnter({ key: event.key, composing: event.nativeEvent.isComposing,
          disabled, preventDefault: () => event.preventDefault(), lookup: onSearch })} />
      <button className="primary-button order-search-button" type="submit" disabled={disabled} aria-busy={loading}>
        {loading ? <LoaderCircle className="is-spinning" aria-hidden="true" /> : <Search aria-hidden="true" />}
        {loading ? 'Buscando…' : 'Buscar'}
      </button>
    </div>
  </form>;
}
