// Datos del panel «Despiece y dibujo» de un toldo. La agrupación de la reserva es la misma
// que la de la reserva RPS del pedido (Planteamientos): el panel solo filtra su OF.
import type { Calculation } from './types';
import { collectFabricMaterialKeys, roundFabricMeters } from '../domain/reservationFabrics.js';
import { formatDecimal } from './constants';

export type ReservationRow = { of: string; code: string; description: string; quantity: number };

// Una línea por OF y artículo; los metros de tela se redondean como en la reserva.
export function groupMaterialRows(ofs: Calculation['ofs']): ReservationRow[] {
  return groupWithFabricFlag(ofs).map(({ row }) => row);
}

// La misma agrupación, marcando qué filas son tela: la línea resumen suma sus metros tal
// como se reservan (redondeados), no los del cálculo.
function groupWithFabricFlag(ofs: Calculation['ofs']): Array<{ row: ReservationRow; fabric: boolean }> {
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
    ? { row: { ...row, quantity: roundFabricMeters(row.quantity) }, fabric: true }
    : { row, fabric: false });
}

export function awningReservationRows(calculation: Calculation, awningId: string): ReservationRow[] {
  return groupMaterialRows(calculation.ofs.filter((ofBlock) => ofBlock.awningId === awningId));
}

export type PlanningSummary = { structures: number; fabrics: number; rpsLines: number; fabricMeters: number };

// Resumen de la línea plegada de Planteamientos (rediseño 3 §2): las mismas cuentas que
// enseñaban antes las pestañas de abajo, sin sus tablas. Los trabajos de tela no generan
// despiece (viene `null` desde el servidor), así que basta con mirar `ofBlock.despiece`.
// Los metros son los de las filas de tela de la reserva, ya redondeados como en RPS, para
// que la línea diga lo mismo que la tabla que despliega.
export function planningSummary(calculation: Calculation | null): PlanningSummary {
  const ofCards = calculation?.ofs.filter((ofBlock) => ofBlock.calculation) || [];
  const structures = ofCards.filter((ofBlock) => ofBlock.despiece).length;
  const grouped = groupWithFabricFlag(calculation?.ofs || []);
  const fabricMeters = Math.round(grouped.reduce((total, item) => total + (item.fabric ? item.row.quantity : 0), 0) * 1000) / 1000;
  return { structures, fabrics: ofCards.length, rpsLines: grouped.length, fabricMeters };
}

// «2 estructuras · 3 telas · 21 líneas RPS · 12,5 ml», con singulares y coma decimal.
export function formatSummary(summary: PlanningSummary): string {
  return [
    `${summary.structures} ${summary.structures === 1 ? 'estructura' : 'estructuras'}`,
    `${summary.fabrics} ${summary.fabrics === 1 ? 'tela' : 'telas'}`,
    `${summary.rpsLines} ${summary.rpsLines === 1 ? 'línea RPS' : 'líneas RPS'}`,
    `${formatDecimal(summary.fabricMeters)} ml`
  ].join(' · ');
}
