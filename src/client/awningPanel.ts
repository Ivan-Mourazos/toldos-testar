// Datos del panel «Despiece y dibujo» de un toldo. La agrupación de la reserva es la misma
// que la de la reserva RPS del pedido (Planteamientos): el panel solo filtra su OF.
import type { Calculation } from './types';
import { collectFabricMaterialKeys, roundFabricMeters } from '../domain/reservationFabrics.js';

export type ReservationRow = { of: string; code: string; description: string; quantity: number };

// Una línea por OF y artículo; los metros de tela se redondean como en la reserva.
export function groupMaterialRows(ofs: Calculation['ofs']): ReservationRow[] {
  const rows = new Map<string, ReservationRow>();
  const fabricKeys = collectFabricMaterialKeys(ofs);
  for (const ofBlock of ofs) {
    for (const material of ofBlock.materials) {
      const key = `${ofBlock.of.trim().toUpperCase()}||${material.code.trim().toUpperCase()}`;
      const current = rows.get(key) || { of: ofBlock.of, code: material.code, description: material.description || '', quantity: 0 };
      current.quantity = material.aggregation === 'max'
        ? Math.round(Math.max(current.quantity, material.quantity) * 1000) / 1000
        : Math.round((current.quantity + material.quantity) * 1000) / 1000;
      rows.set(key, current);
    }
  }
  return Array.from(rows.entries()).map(([key, row]) => fabricKeys.has(key)
    ? { ...row, quantity: roundFabricMeters(row.quantity) }
    : row);
}

export function awningReservationRows(calculation: Calculation, awningId: string): ReservationRow[] {
  return groupMaterialRows(calculation.ofs.filter((ofBlock) => ofBlock.awningId === awningId));
}
