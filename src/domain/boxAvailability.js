// Lo que existe de verdad en RPS para los cofres y el Xacobeo, consultado con
// InactiveDate el 23/09/2026. Sin esto la reserva componía códigos inexistentes (el
// Ámbar negro, con perfil, tapas y soportes de baja; el Ágata negro con cofre, sin
// ninguno de sus perfiles) y, como una referencia de baja no bloquea la subida a RPS,
// el fallo no se veía. Un lacado que no esté en la tabla significa que el modelo no
// se fabrica en ese color.

// Largos del perfil principal de cada cofre por lacado.
const profileLengths = Object.freeze({
  'PERLA BOX': {
    BL06: [600], BL16: [400, 500, 600], BT06: [500], BU05: [400, 500], GR12: [400, 500, 600], GR16: [400, 500, 600],
    GR22: [500, 600], GT16: [400, 500, 600], MA15: [400, 500, 600], MATX: [500], MR02: [500], MR14: [400, 500, 600],
    MR17: [400, 600], MR19: [500], MT14: [400, 500], NE11: [500, 600], NEM1: [400, 500, 600], NM05: [400, 500, 600],
    O516: [400, 500, 600], PL06: [400, 500, 600], PL27: [400, 500], VE05: [400, 500], VE09: [400]
  },
  'CORAL BOX': {
    B16M: [400, 600], BL16: [400, 500, 600], BR28: [400, 500], BU05: [500], G16M: [400, 500, 600], GR12: [400],
    GR16: [400, 500, 600], GR22: [400], GT16: [400, 500, 600], MA15: [500, 600], MATX: [400, 600], MM13: [400, 600],
    MR14: [400, 500, 600], MT14: [500], NE11: [400, 500], NEM1: [400, 500, 600], NM05: [400, 500, 600],
    O516: [400, 500, 600], PA19: [600], PL06: [400, 600], PL27: [600], VE05: [600], VE09: [400, 500, 600]
  },
  'CUARZO BOX': {
    BL16: [350, 400, 450], BR28: [350, 450], BU05: [350, 400, 450], G16M: [350], GR12: [350, 400, 450],
    GR16: [350, 400, 450], GR22: [350, 450], MA15: [350], MR07: [350, 450], MR14: [350, 450], MR19: [350],
    NE11: [350, 400, 450], NEM1: [350], NM05: [350], O516: [350, 450], P537: [450], PA19: [450], PL06: [350],
    PL27: [350, 450], VE05: [300, 350, 450], VE09: [350, 450]
  },
  'AMBAR BOX': {
    BL16: [500, 600, 700], BU05: [500], GR12: [500], GR16: [400, 500, 700], GR22: [500], GT16: [500], MR14: [500],
    NEM1: [400, 500], O516: [500], PA19: [500], PL27: [700], VE09: [500]
  }
});

// Ágata: el lacado tiene que tener las tapas de su variante (con ellas vienen los
// perfiles del cofre; en negro no hay ninguno de los del cofre cerrado).
const agataCapsBySubmodel = Object.freeze({
  COFRE: ['BL16', 'BU05', 'GR12', 'GR16', 'GT16', 'NEM1', 'NM05', 'PL27'],
  // En negro hay tapas de semicofre pero no los perfiles del tejadillo.
  SEMI: ['BL16', 'GR16'],
  OPEN: ['BL16', 'BU05', 'GR16', 'NE11', 'NEM1', 'NM05', 'O516']
});

// Brazos ART 250 (Cuarzo y Xacobeo) por lacado y salida.
const art250Arms = Object.freeze({
  BL16: [125, 150, 175, 200, 225, 250], BR28: [125, 150, 200, 250], BU05: [125, 150, 175, 200, 225, 250], G16M: [225],
  GR12: [125, 150, 175, 200, 225, 250], GR16: [125, 150, 175, 200, 225, 250], GR22: [150, 175, 200, 250], MR07: [250],
  MR14: [150, 175, 200, 225, 250], NE11: [125, 150, 175, 225, 250], NEM1: [175, 200], NM05: [175], O516: [125, 175, 200, 225],
  P537: [150], PL06: [150, 200, 225], PL27: [125, 150, 175, 200, 225, 250], VE05: [125, 150, 175, 200, 225, 250], VE09: [200, 225, 250]
});

// Perfil EVO 70 del Xacobeo (PEVO702R): en blanco solo existe el de 700; en negro, ninguno.
const evo70Lengths = Object.freeze({ BL16: [700], BU05: [700], NEM1: [500], PL06: [500], VE05: [500] });

// Tapas laterales del Ámbar: en blanco están de baja desde 2021.
const ambarCapSuffixes = Object.freeze(['GR12', 'GR16', 'GR22', 'NEM1', 'VE05']);

export function ambarCapsExist(suffix) {
  return ambarCapSuffixes.includes(String(suffix || ''));
}

export function pickEvo70Length(suffix, needed) {
  return (evo70Lengths[String(suffix || '')] || []).find((length) => length >= needed) || null;
}

export function evo70Issue(suffix, lacadoName, needed) {
  const available = evo70Lengths[String(suffix || '')];
  if (!available) return `XACOBEO no se fabrica en ${lacadoName}: no hay perfil EVO 70 en ese lacado.`;
  if (!available.some((length) => length >= needed)) return `XACOBEO no válido: en ${lacadoName} el perfil EVO 70 solo existe de ${available.join(', ')} cm.`;
  return null;
}

export function boxProfileLengths(model, suffix) {
  return profileLengths[model]?.[String(suffix || '')] || null;
}

// Largo de perfil: el habitual (`wanted`) si existe en ese lacado y cabe; si no, el
// más corto de los que existen que quepa. null si el lacado no tiene perfil o no
// hay ninguno bastante largo.
export function pickBoxProfileLength(model, suffix, wanted, needed) {
  const available = boxProfileLengths(model, suffix);
  if (!available) return null;
  const usual = [...wanted].sort((a, b) => a - b).find((length) => available.includes(length) && length >= needed);
  return usual || available.find((length) => length >= needed) || null;
}

export function boxProfileIssue(model, suffix, lacadoName, needed) {
  const available = boxProfileLengths(model, suffix);
  if (!available) return `${model} no se fabrica en ${lacadoName}: no hay perfil en ese lacado.`;
  if (!available.some((length) => length >= needed)) {
    return `${model} no válido: en ${lacadoName} el perfil solo existe de ${available.join(', ')} cm y hacen falta ${Math.round(needed * 10) / 10}.`;
  }
  return null;
}

export function agataLacadoIssue(submodel, suffix, lacadoName) {
  const allowed = agataCapsBySubmodel[submodel];
  return allowed && !allowed.includes(String(suffix || ''))
    ? `ÁGATA BOX ${submodel} no se fabrica en ${lacadoName}: no hay tapas ni perfiles de esa variante en ese lacado.`
    : null;
}

export function art250ArmExists(suffix, projection) {
  const sizes = art250Arms[String(suffix || '')];
  return sizes ? sizes.includes(Number(projection)) : false;
}
