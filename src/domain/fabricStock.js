// Stock de una lona según RPS (informe tmp/tela-0930, sección c). Cada fila es una
// bobina (`roll`, la «Series» de STKStock) en un almacén, con sus metros y lo que
// tiene reservado por OF (STKStockReserve).
//
// - «Disponible» = metros − reservado, bobina a bobina (nunca negativo). Solo resta
//   lo reservado en RPS: no es el físico.
// - No cuentan «No_Usar» ni «PROVEEDORES», ni las filas negativas.
// - La consignación no es género nuestro hasta que se confirme: va aparte, en
//   `consignacion`, y no suma en «disponible».
// - Importa la bobina mayor, no solo el total: bobinas distintas pueden ser de
//   distinta partida de tinte.
const excludedWarehouse = /NO_?USAR|PROVEEDOR/i;
const consignmentWarehouse = /CONSIGNA/i;

export function summarizeFabricStock(rows = [], code = '') {
  const wanted = String(code || '').trim().toUpperCase();
  let metros = 0;
  let reservado = 0;
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
    const reserved = Math.min(Math.max(Number(row.reserved) || 0, 0), meters);
    const free = meters - reserved;
    if (consignmentWarehouse.test(warehouse)) {
      consignacion += free;
      continue;
    }
    metros += meters;
    reservado += reserved;
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
