import React, { type ReactNode } from 'react';
import { fabricCodeOf, fabricStockLine } from '../fabricStock';
import { useFabricStock } from '../hooks/useFabricStock';

// Stock en RPS de la tela elegida, bajo su buscador (informe tela-0930): «¿hay o no
// hay, y cuánto?». Nunca bloquea: si RPS no responde, lo dice y ya está.
export function FabricStockLine({ selection, neededMl = 0 }: { selection: string; neededMl?: number }) {
  return <FabricStockCodeLine code={fabricCodeOf(selection)} neededMl={neededMl} />;
}

// La misma línea a partir del código de artículo de RPS. La usan también las lonas de
// remolque, que guardan el nombre de la bobina y sacan el código de su propia lista;
// `prefix` va delante del texto (el código de la bobina, allí).
export function FabricStockCodeLine({ code, neededMl = 0, prefix }: { code: string; neededMl?: number; prefix?: ReactNode }) {
  const state = useFabricStock(code);
  if (!code || state.status === 'idle') return null;
  if (state.status === 'loading') return <p className="fabric-stock-line is-apagado" aria-live="polite">{prefix}Consultando stock en RPS…</p>;
  if (state.status === 'error') return <p className="fabric-stock-line is-apagado" aria-live="polite">{prefix}Stock no disponible ahora</p>;
  const line = fabricStockLine(state.stock, neededMl);
  return (
    <p className={`fabric-stock-line is-${line.tone}`} title={line.title} aria-live="polite">
      {prefix}{line.text}
    </p>
  );
}
