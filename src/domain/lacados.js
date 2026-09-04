// Tabla D.COM del Excel maestro (LACADOS / REFERENCIA / MANIVELA).
const table = Object.freeze([
  Object.freeze({ name: 'BLANCO', suffix: 'BL16', crank: 'BLANCA' }),
  Object.freeze({ name: 'BRONCE (R-00028)', suffix: 'BR28', crank: 'NEGRA' }),
  Object.freeze({ name: 'GRIS (R-07022)', suffix: 'GR22', crank: 'NEGRA' }),
  Object.freeze({ name: 'GRIS PLATA (R-00027)', suffix: 'PL27', crank: 'NEGRA' }),
  Object.freeze({ name: 'LACADO ESPECIAL', suffix: '', crank: 'NEGRA' }),
  Object.freeze({ name: 'MARFIL (R-01015)', suffix: 'MA15', crank: 'BLANCA' }),
  Object.freeze({ name: 'MARRON (R-08014)', suffix: 'MR14', crank: 'NEGRA' }),
  Object.freeze({ name: 'NEGRO (R-09011)', suffix: 'NE11', crank: 'NEGRA' }),
  Object.freeze({ name: 'VERDE (R-06005)', suffix: 'VE05', crank: 'NEGRA' }),
  Object.freeze({ name: 'BURDEOS (R-03005)', suffix: 'BU05', crank: 'NEGRA' }),
  Object.freeze({ name: 'GRIS 7012', suffix: 'GR12', crank: 'NEGRA' }),
  Object.freeze({ name: 'GRIS 7016', suffix: 'GR16', crank: 'NEGRA' }),
  Object.freeze({ name: 'GRIS 7016 MATE TEXT.', suffix: 'GT16', crank: 'NEGRA' }),
  Object.freeze({ name: 'NEGRO MATE 9111', suffix: 'NEM1', crank: 'NEGRA' }),
  Object.freeze({ name: 'NEGRO MATE 9005-9405', suffix: 'NM05', crank: 'NEGRA' }),
  Object.freeze({ name: 'CORTEN OXIDO 516', suffix: 'O516', crank: 'NEGRA' })
]);

const normalize = (value) => String(value || '').toUpperCase().replace(/\s+/g, '');
// Nombre sin el codigo "(R-XXXXX)" final, p. ej. "GRIS (R-07022)" -> "GRIS".
const stripCode = (value) => normalize(value).replace(/\(R-\d+\)$/, '');

export const lacadoNames = table.map((item) => item.name);

export function resolveLacado(name) {
  const clean = normalize(name);
  const exact = table.find((item) => normalize(item.name) === clean);
  if (exact) return exact;
  // Variantes sin código R- (p. ej. "BURDEOS") o con espacios raros del Excel.
  // Coincidencia exacta contra el nombre sin código, no startsWith: un prefijo
  // corto o ambiguo (p. ej. "GRIS" contra "GRIS PLATA") no debe colar por azar.
  const partial = clean && table.find((item) => stripCode(item.name) === clean);
  return partial || table[0];
}

// El perfil UNIVERS-280 no sigue la tabla general en blanco ni en negro. Sus
// referencias vivas en RPS son BL10 y NE05; las que da la tabla, BL16 y NE11,
// están de baja desde 2021 y no se consumen desde entonces. Comprobado contra
// el maestro de artículos y contra las imputaciones reales de fabricación:
// PUNI280BL10 suma 110 imputaciones en 2026 y PUNI280BL16, ninguna desde 2021.
// El resto de colores sí coinciden con la tabla.
const universSuffixOverrides = Object.freeze({ BL16: 'BL10', NE11: 'NE05' });

export function universProfileSuffix(suffix) {
  const clean = String(suffix || '');
  return universSuffixOverrides[clean] || clean;
}

export function crankSuffix(lacado) {
  return lacado.crank === 'BLANCA' ? 'BL16' : 'NE11';
}

// Los tapones de plástico de los perfiles solo se fabrican en blanco y negro, y
// se eligen por el mismo criterio que la manivela: la columna BLANCA/NEGRA de la
// tabla de lacados. Componerlos con el sufijo del lacado emitía TAPOPLUN280MA15
// y otras doce referencias que no existen en el maestro. Las imputaciones reales
// confirman la regla: se consumen más tapones negros que toldos lacados en
// negro, porque los lacados oscuros los llevan negros.
export function plasticCapSuffix(lacado) {
  return crankSuffix(lacado);
}

// La MB-9 está descatalogada en RPS y no se consume desde hace años: lo que
// monta el taller es la MB-11, con 777 imputaciones desde 2025 frente a cero.
// La referencia ya lleva el color, así que no se le añade el sufijo de lacado.
export function machineCode(lacado) {
  return lacado.crank === 'BLANCA' ? 'MAQMB11L12BLAN' : 'MAQMB11L12NEGRO';
}
