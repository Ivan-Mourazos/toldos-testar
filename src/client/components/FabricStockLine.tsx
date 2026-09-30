import React from 'react';
import { fabricCodeOf, fabricStockLine } from '../fabricStock';
import { useFabricStock } from '../hooks/useFabricStock';

// Stock en RPS de la tela elegida, bajo su buscador (informe tela-0930): «¿hay o no
// hay, y cuánto?». Nunca bloquea: si RPS no responde, lo dice y ya está.
export function FabricStockLine({ selection, neededMl = 0 }: { selection: string; neededMl?: number }) {
  const code = fabricCodeOf(selection);
  const state = useFabricStock(code);
  if (!code || state.status === 'idle') return null;
  if (state.status === 'loading') return <p className="fabric-stock-line is-apagado" aria-live="polite">Consultando stock en RPS…</p>;
  if (state.status === 'error') return <p className="fabric-stock-line is-apagado" aria-live="polite">Stock no disponible ahora</p>;
  const line = fabricStockLine(state.stock, neededMl);
  return (
    <p className={`fabric-stock-line is-${line.tone}`} title={line.title} aria-live="polite">
      {line.text}
    </p>
  );
}
