// Identidad y unidad contrastadas en STKArticle/PURSupplierArticle el 15/09/2026.
// Cortes nominales: Excel de OT; materiales confirmados por Iván.
export const ANTICA_STEEL = Object.freeze({
  flat: Object.freeze({ code: 'PLEAC30MM10', description: 'PLETINA ACERO 30 X 10', stockLengthCm: 600, unitCode: 'BARRA' }),
  tube: Object.freeze({ code: 'TUBGA50MM30MM2MM', description: 'TUBO GALVANIZADO 50 X 30 X 2', stockLengthCm: 600, unitCode: 'BARRA' })
});


/** Consumo nominal de materia prima; no es una optimización de barras ni incluye merma. */
export function anticaSteelParts({ variant, units, armCount, projection, loadBarLength }) {
  const part = (num, name, material, pieces, length) => ({
    num, name, reference: material.code, units: pieces, length,
    reservationQuantity: Math.round(pieces * length / material.stockLengthCm * 1000000) / 1000000,
    unitCode: material.unitCode
  });
  const rows = [part(7, 'BRAZO ANTICA', ANTICA_STEEL.flat, armCount * units, Number(projection))];
  if (variant === 'TUBO 50X30 CONTRAPESO' || variant === 'TUBO 50X30 SIN BAMBA') {
    rows.push(part(5, 'TUBO CARGA 50 X 30', ANTICA_STEEL.tube, units, loadBarLength));
  } else if (variant === 'TUBO 30X10 CON BAMBA') {
    // Maestro habitual contrastado con compras 0200387/0200587: pletina maciza.
    // El tubo hueco 30×10×1,5 del especial 0209500 no es esta referencia.
    rows.push(part(5, 'PLETINA CARGA 30 X 10', ANTICA_STEEL.flat, units, loadBarLength));
  }
  if (variant === 'TUBO 50X30 CONTRAPESO') rows.push(part(12, 'PLETINA CONTRAPESO 30 X 10', ANTICA_STEEL.flat, units, loadBarLength));
  return rows;
}
