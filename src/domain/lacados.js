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

export function crankSuffix(lacado) {
  return lacado.crank === 'BLANCA' ? 'BL16' : 'NE11';
}

export function machineCode(lacado) {
  return lacado.crank === 'BLANCA' ? 'MAQMB9L13BLANBL16' : 'MAQMB9L13NEGRNE11';
}
