// Largos del perfil UNIVERS 280 (PUNI280{color}{largo}C) que existen en RPS y
// no están de baja, por sufijo de color. Consultado en STKArticle el 22/09/2026:
// no todos los colores se fabrican en todos los largos (el gris 7012 no tiene
// 400, el 7022 solo 700), y componer un largo que no existe deja la reserva con
// una referencia inválida. Un color que no esté aquí (lacado especial, texturados
// sin perfil propio) sigue con la barra de 600, como antes del 22/09/2026.
const lengthsBySuffix = Object.freeze({
  '': [], // lacado especial: no hay perfil Univers propio
  A536: [500],
  GT16: [], // gris 7016 mate texturado: sin perfil Univers
  NM05: [], // el perfil existe, pero el soporte SOPUNI3AGUNM05 no
  BL06: [600, 700],
  BL10: [400, 500, 600, 700],
  BL16: [400, 500, 600, 700],
  BR28: [], // los tres largos están de baja desde 2020-2021
  BU05: [400, 500, 600, 700],
  G16M: [500],
  GR12: [500, 600, 700],
  GR16: [500, 600, 700],
  GR22: [700],
  MA15: [400, 500, 600, 700],
  MATX: [500],
  MM13: [500],
  MR07: [400, 500, 600, 700],
  MR14: [400, 500, 600, 700],
  MR17: [600, 700],
  NE05: [400, 500, 600, 700],
  NE11: [600, 700],
  NEM1: [500, 700],
  O516: [400, 500, 600, 700],
  ORO: [400, 500, 600, 700],
  P537: [500],
  PA19: [500, 600, 700],
  PL06: [400, 500, 600, 700],
  PL27: [400, 500, 600, 700],
  VE05: [400, 500, 600, 700],
  VE09: [500, 600, 700]
});

export function universProfileStockLengths(universSuffix, wanted) {
  const available = lengthsBySuffix[String(universSuffix || '')];
  return available ? wanted.filter((length) => available.includes(length)) : wanted.filter((length) => length === 600);
}
