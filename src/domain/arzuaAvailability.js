// Lo que existe de verdad en RPS para el Arzúa, consultado con InactiveDate el
// 23/09/2026. Dos piezas se componían con cualquier medida y salían referencias
// que RPS no tiene o que están de baja: el perfil EVO 80 en negro de 600 (de baja
// desde 2023) y el brazo Onyx negro de 175, que no ha existido nunca.
// Una referencia de baja no bloquea la subida a RPS, así que el fallo no avisa.
const evo80LengthsBySuffix = Object.freeze({
  BL16: [500, 600, 700],
  BU05: [500, 600, 700],
  GR12: [500],
  GR16: [500, 600, 700],
  GR22: [700],
  MA15: [700],
  NE11: [500, 700],
  NEM1: [500],
  NM05: [500, 600],
  O516: [700],
  PL27: [500],
  VE05: [500]
});

const onyxArmsBySuffix = Object.freeze({
  BL16: [150, 175, 200, 225, 250, 275, 300, 325, 350, 375, 400],
  BR28: [225, 250, 350],
  BU05: [200, 225, 275, 300, 350, 400],
  GR12: [175, 200, 250, 275, 300, 325, 400],
  GR16: [175, 200, 225, 250, 275, 300, 325, 350, 400],
  GR22: [200, 250],
  GT16: [225, 250, 275, 300, 325, 350],
  MA15: [200, 225, 250, 275, 300, 350, 400],
  MR14: [175, 200, 225, 250, 275, 300, 325, 350, 400],
  NE11: [150, 200, 225, 250, 275, 300, 325, 350, 400],
  NEM1: [150, 175, 200, 225, 250, 275, 300, 325, 350, 375, 400],
  NM05: [200, 250, 300, 325, 350, 400],
  O516: [200, 225, 250, 275, 300, 350, 400],
  PL27: [175, 200, 225, 250, 300, 350, 400],
  VE05: [200, 225, 250, 275, 300, 350]
});

// Un lacado que no esté en la tabla (lacado especial, colores sin perfil propio)
// conserva los largos pedidos: lo detecta `pnpm validate:rps-refs`.
export function evo80StockLengths(colorSuffix, wanted) {
  const available = evo80LengthsBySuffix[String(colorSuffix || '')];
  return available ? wanted.filter((length) => available.includes(length)) : wanted;
}

export function onyxArmExists(colorSuffix, projection) {
  const sizes = onyxArmsBySuffix[String(colorSuffix || '')];
  return sizes ? sizes.includes(Number(projection)) : true;
}
