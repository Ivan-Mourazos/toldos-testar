import React, { useEffect, useRef, useState } from 'react';
import { Search, X } from 'lucide-react';
import type { PedidoBandeja } from '../types';
import { buscarPedidos, MIN_LETRAS, type ResultadoBusqueda } from '../buscadorPedidos';
import { controlLabel } from './controlLabels';

// Buscador de la cabecera (Iván, 11/11/2026: «el buscador casi que se debería pasar al header,
// como en coordina»). La misma forma que BuscadorGlobal de CoordinaOT: escribir y que salgan,
// con el teclado, y cada línea dice DÓNDE está el pedido. Ctrl+K desde cualquier sitio.
// Busca en los pedidos que la cabecera ya tiene (año actual y anterior): responde en la tecla.
export function BuscadorCabecera({ pedidos, cargando, onElegir }: {
  pedidos: readonly PedidoBandeja[];
  cargando: boolean;
  onElegir: (pedido: PedidoBandeja) => void;
}) {
  const [q, setQ] = useState('');
  const [abierto, setAbierto] = useState(false);
  const [cursor, setCursor] = useState(0);
  const caja = useRef<HTMLDivElement>(null);
  const campo = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const tecla = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        campo.current?.focus();
        campo.current?.select();
      }
    };
    const fuera = (e: MouseEvent) => { if (!caja.current?.contains(e.target as Node)) setAbierto(false); };
    document.addEventListener('keydown', tecla);
    document.addEventListener('mousedown', fuera);
    return () => { document.removeEventListener('keydown', tecla); document.removeEventListener('mousedown', fuera); };
  }, []);

  const buscando = q.trim().length >= MIN_LETRAS;
  const resultados = buscando ? buscarPedidos(q, pedidos) : [];
  const activo = Math.min(cursor, Math.max(0, resultados.length - 1));
  const visible = abierto && buscando;

  function elegir(r: ResultadoBusqueda) {
    onElegir(r.pedido);
    setAbierto(false);
    setQ('');
    campo.current?.blur();
  }

  function teclas(e: React.KeyboardEvent) {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      setAbierto(true);
      const n = resultados.length;
      const paso = e.key === 'ArrowDown' ? 1 : -1;
      setCursor((c) => (n === 0 ? 0 : (Math.min(c, n - 1) + paso + n) % n));
    } else if (e.key === 'Enter' && resultados[activo]) {
      e.preventDefault();
      elegir(resultados[activo]);
    } else if (e.key === 'Escape') {
      setAbierto(false);
      campo.current?.blur();
    }
  }

  return (
    <div className="cabecera-buscador" ref={caja}>
      <div className="cabecera-buscador-campo">
        <Search aria-hidden="true" />
        <input
          ref={campo}
          value={q}
          autoComplete="off"
          role="combobox"
          aria-expanded={visible}
          aria-controls="cabecera-buscador-resultados"
          aria-autocomplete="list"
          aria-activedescendant={visible && resultados.length ? `cabecera-buscador-op-${activo}` : undefined}
          aria-label="Buscar pedidos"
          placeholder="Buscar pedido, cliente, OF o modelo…"
          onChange={(e) => { setQ(e.target.value); setCursor(0); setAbierto(true); }}
          onFocus={() => setAbierto(true)}
          onKeyDown={teclas}
        />
        {q
          ? <button type="button" className="cabecera-buscador-limpiar" aria-label="Limpiar" onClick={() => { setQ(''); campo.current?.focus(); }}><X aria-hidden="true" /></button>
          : <kbd>Ctrl K</kbd>}
      </div>
      {visible && (
        <div id="cabecera-buscador-resultados" className="cabecera-buscador-panel">
          {resultados.length === 0
            ? <p>{cargando ? 'Cargando pedidos…' : 'Nada con eso en los pedidos de este año ni del anterior.'}</p>
            : <ul role="listbox" aria-label="Resultados">
              {resultados.map((r, i) => (
                <li key={`${r.producto}:${r.pedido.orderCode}`}>
                  <button type="button" id={`cabecera-buscador-op-${i}`} role="option" aria-selected={i === activo}
                    className={i === activo ? 'es-activo' : undefined} onClick={() => elegir(r)} onMouseEnter={() => setCursor(i)}>
                    <span className={`cabecera-buscador-punto ${r.pedido.status === 'PRODUCED' ? 'es-generado' : 'es-pendiente'}`} aria-hidden="true" />
                    <span className="cabecera-buscador-texto">
                      <span><b>{r.pedido.orderCode}</b> · {r.pedido.summary.customer || 'Sin cliente'}</span>
                      <small>{r.donde} · {r.producto}{r.pedido.summary.models?.length ? ` · ${[...new Set(r.pedido.summary.models)].map(controlLabel).join(', ')}` : ''}</small>
                    </span>
                  </button>
                </li>
              ))}
            </ul>}
        </div>
      )}
    </div>
  );
}
