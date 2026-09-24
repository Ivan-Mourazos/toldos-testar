// Datos del panel «Despiece y dibujo» de un toldo. La agrupación de la reserva es la misma
// que la de la reserva RPS del pedido (Planteamientos): el panel solo filtra su OF.
import type { Calculation } from './types';
import { collectFabricMaterialKeys, roundFabricMeters } from '../domain/reservationFabrics.js';
import { formatDecimal } from './constants';

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

export type PlanningSummary = { structures: number; fabrics: number; rpsLines: number; fabricMeters: number };

// Resumen de la línea plegada de Planteamientos (rediseño 3 §2): las mismas cuentas que
// enseñaban antes las pestañas de abajo, sin sus tablas. Los trabajos de tela no generan
// despiece (viene `null` desde el servidor), así que basta con mirar `ofBlock.despiece`.
export function planningSummary(calculation: Calculation | null): PlanningSummary {
  const ofCards = calculation?.ofs.filter((ofBlock) => ofBlock.calculation) || [];
  const structures = ofCards.filter((ofBlock) => ofBlock.despiece).length;
  const rpsLines = groupMaterialRows(calculation?.ofs || []).length;
  const fabricMeters = ofCards.reduce((total, ofBlock) => {
    const calc = ofBlock.calculation!;
    const hasSeparateValance = Boolean(calc.valanceFabricCode) && Number(calc.valanceFabricMl) > 0;
    return total + calc.fabricMl + (hasSeparateValance ? Number(calc.valanceFabricMl) : 0);
  }, 0);
  return { structures, fabrics: ofCards.length, rpsLines, fabricMeters };
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
