import React, { type ReactNode } from 'react';
import { fabricCodeOf, fabricStockLine } from '../fabricStock';
import { useFabricStock, type FabricStockState } from '../hooks/useFabricStock';

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
  return <FabricStockText state={state} neededMl={neededMl} prefix={prefix} />;
}

// El mismo texto y avisos, sin otra consulta cuando la cabecera ya tiene el lote.
// Dentro de un botón se usa un span y el detalle completo queda al pasar el ratón.
export function FabricStockText({ state, neededMl = 0, prefix, compact = false }: { state: FabricStockState; neededMl?: number; prefix?: ReactNode; compact?: boolean }) {
  if (state.status === 'idle') return null;
  const Tag = compact ? 'span' : 'p';
  const line = state.status === 'ready' ? fabricStockLine(state.stock, neededMl) : {
    text: state.status === 'loading' ? 'Consultando stock en RPS…' : 'Stock no disponible ahora', tone: 'apagado', title: undefined
  };
  const text = compact && state.status === 'ready' && state.stock.disponible > 0
    ? `${state.stock.disponible.toLocaleString('es-ES', { maximumFractionDigits: 1 })} m disponibles${state.stock.consignacion > 0 ? ` · + ${state.stock.consignacion.toLocaleString('es-ES', { maximumFractionDigits: 1 })} m en consignación` : ''}`
    : line.text;
  return (
    <Tag className={`${compact ? 'fabric-stock-option' : 'fabric-stock-line'} is-${line.tone}`} title={compact ? `${line.text}\n${line.title ?? ''}` : line.title} aria-live="polite">
      {prefix}{text}
    </Tag>
  );
}
