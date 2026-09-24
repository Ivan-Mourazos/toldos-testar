import React, { createContext, useContext } from 'react';
import { readGroupOf, readGroupOrder } from '../readGroups';

// Con la ficha de lectura, cada campo se pinta como «etiqueta · valor» en su grupo.
export const ReadModeContext = createContext(false);
export const useReadMode = () => useContext(ReadModeContext);

// El vacío se escribe «—» y en gris, para que no se confunda con un dato que falta sin más.
export function ReadPair({ label, value }: { label: string; value: React.ReactNode }) {
  const group = readGroupOf(label);
  const empty = value === null || value === undefined || value === '';
  return (
    <div className="read-pair" data-group={group} style={{ order: readGroupOrder(group) + 1 }}>
      <span className="read-label">{label}</span>
      <b className={`read-value${empty ? ' is-empty' : ''}`}>{empty ? '—' : value}</b>
    </div>
  );
}

// Número de la ficha con coma decimal («12,5»), sin redondear ni agrupar miles; vacío si
// no hay número.
export function readNumber(value: number | null | undefined) {
  return typeof value === 'number' && Number.isFinite(value) ? String(value).replace('.', ',') : '';
}

// Valor con su unidad («285 cm»); vacío si no hay valor.
export function withUnit(value: string | number, unit?: string) {
  const text = String(value);
  return text && unit ? `${text} ${unit}` : text;
}
