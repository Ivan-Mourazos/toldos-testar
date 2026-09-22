// Brazos PRT-07 (BPRT07{lacado}{salida}C) vigentes en RPS por lacado, consultado
// el 22/09/2026 con InactiveDate. Solo el blanco tiene toda la gama; en negro, el
// de 100 está de baja desde 2020 y quedan 80, 90 y 140. Reservar un brazo de baja
// no da error al subir a RPS, así que el fallo pasaba desapercibido.
// La tarifa nacional 2026 (pág. 434) vende el PRT-07 de 0,70 a 1,40 m.
const armSizesBySuffix = Object.freeze({
  BL16: [70, 80, 90, 100, 120, 140, 160],
  GR12: [80],
  GR16: [80, 100, 120, 140],
  GR22: [100],
  MR14: [80, 90, 120],
  NE11: [80, 90, 140],
  NEM1: [80, 90, 100, 120, 140],
  O516: [100],
  PL27: [100, 140],
  VE05: [90, 100]
});

export const puntoRectoArmSizes = [...new Set(Object.values(armSizesBySuffix).flat())].sort((left, right) => left - right);

export function puntoRectoArmCode(lacadoSuffix, projection) {
  const sizes = armSizesBySuffix[String(lacadoSuffix || '')];
  const size = Number(projection);
  // El código real de algunas medidas acaba en "CM"; lo corrige rpsIrregularCodes.
  return sizes?.includes(size) ? `BPRT07${lacadoSuffix}${size}C` : '';
}
