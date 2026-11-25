import { normalizeOf } from '../reviewRules.js';

// Stock de una lona según RPS (informe tmp/tela-0930, sección c). Cada fila es una
// bobina (`roll`, la «Series» de STKStock) en un almacén, con sus metros y lo que
// tiene reservado por OF (STKStockReserve).
//
// - Disponible = metros − reservado por otros pedidos. Lo reservado por las OF del
//   propio pedido (`ofsPropias`) no resta: va en `reservadoPropio`. Las asignaciones
//   no cuentan.
// - No cuentan «No_Usar» ni «PROVEEDORES», ni las filas negativas.
// - La consignación SÍ cuenta como stock (Compras, 25/11/2026: «temos stock, non
//   hai que avisar»). Suma en «disponible» como cualquier almacén; `consignacion`
//   solo dice cuánto de ese disponible está en consignación.
// - Importa la bobina mayor, no solo el total: bobinas distintas pueden ser de
//   distinta partida de tinte.
const excludedWarehouse = /NO_?USAR|PROVEEDOR/i;
const consignmentWarehouse = /CONSIGNA/i;

export function summarizeFabricStock(rows = [], code = '', { reservas = [], ofsPropias = [] } = {}) {
  const wanted = String(code || '').trim().toUpperCase();
  const propias = new Set(ofsPropias.map(normalizeOf).filter(Boolean));
  const propioPorBobina = new Map();
  for (const r of reservas) {
    if (r?.stockId == null || !propias.has(normalizeOf(r?.of))) continue;
    propioPorBobina.set(r.stockId, (propioPorBobina.get(r.stockId) || 0) + (Number(r.quantity) || 0));
  }
  let metros = 0;
  let reservado = 0;
  let reservadoPropio = 0;
  let disponible = 0;
  let consignacion = 0;
  let bobinasConDisponible = 0;
  let mayorBobinaDisponible = 0;
  const almacenes = new Map();

  for (const row of rows) {
    if (String(row?.code || '').trim().toUpperCase() !== wanted) continue;
    const warehouse = `${row.warehouseCode || ''} ${row.warehouseName || ''}`;
    if (excludedWarehouse.test(warehouse)) continue;
    const meters = Number(row.meters) || 0;
    if (meters <= 0) continue;
    const total = Math.max(Number(row.reserved) || 0, 0);
    const propio = row.stockId == null ? 0 : Math.min(propioPorBobina.get(row.stockId) || 0, total);
    const otros = Math.min(total - propio, meters);
    const free = meters - otros;
    if (consignmentWarehouse.test(warehouse) && free > 0) consignacion += free;
    metros += meters;
    reservado += otros;
    reservadoPropio += propio;
    if (free <= 0) continue;
    disponible += free;
    bobinasConDisponible += 1;
    mayorBobinaDisponible = Math.max(mayorBobinaDisponible, free);
    const key = String(row.warehouseCode || '').trim();
    const entry = almacenes.get(key) || { codigo: key, nombre: String(row.warehouseName || '').trim(), disponible: 0, bobinas: 0 };
    entry.disponible += free;
    entry.bobinas += 1;
    almacenes.set(key, entry);
  }

  return {
    code: wanted,
    metros: round(metros),
    reservado: round(reservado),
    reservadoPropio: round(reservadoPropio),
    disponible: round(disponible),
    bobinasConDisponible,
    mayorBobinaDisponible: round(mayorBobinaDisponible),
    consignacion: round(consignacion),
    almacenes: [...almacenes.values()]
      .map((entry) => ({ ...entry, disponible: round(entry.disponible) }))
      .sort((a, b) => b.disponible - a.disponible)
  };
}

function round(value) {
  return Math.round(value * 10) / 10;
}
