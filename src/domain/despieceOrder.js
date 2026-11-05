// Despiece de todos los modelos: arriba las piezas con longitud, que son las que se cortan, en el orden en que las
// da el modelo; debajo el resto (Iván, 05/11/2026: «así les es más fácil a los montadores»). Las filas de mando,
// sensor y receptor van aparte en ELEMENTOS ACCESORIOS y no se mueven. Las demás se numeran de nuevo, 1, 2, 3…, para
// que el número siga el orden de la hoja.

const isAccessory = (row) => row?.accessory === true || /MANDO|SENSOR|RECEPTOR/i.test(row?.name || '');

export function hasLength(row) {
  const value = row?.length;
  if (typeof value === 'number') return Number.isFinite(value) && value > 0;
  return typeof value === 'string' && /\d/.test(value) && Number.parseFloat(value.replace(',', '.')) > 0;
}

export function orderDespieceByLength(despiece) {
  if (!despiece || !Array.isArray(despiece.rows)) return despiece;
  const main = despiece.rows.filter((row) => !isAccessory(row));
  const ordered = [...main.filter(hasLength), ...main.filter((row) => !hasLength(row))];
  // Los accesorios, al final y numerados a continuación, sin saltos.
  const rows = [...ordered, ...despiece.rows.filter(isAccessory)];
  return { ...despiece, rows: rows.map((row, i) => (row.num === i + 1 ? row : { ...row, num: i + 1 })) };
}
