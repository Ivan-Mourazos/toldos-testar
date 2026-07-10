// Tabla D.COM del Excel maestro (LACADOS / REFERENCIA / MANIVELA).
const table = [
  { name: 'BLANCO', suffix: 'BL16', crank: 'BLANCA' },
  { name: 'BRONCE (R-00028)', suffix: 'BR28', crank: 'NEGRA' },
  { name: 'GRIS (R-07022)', suffix: 'GR22', crank: 'NEGRA' },
  { name: 'GRIS PLATA (R-00027)', suffix: 'PL27', crank: 'NEGRA' },
  { name: 'LACADO ESPECIAL', suffix: '', crank: 'NEGRA' },
  { name: 'MARFIL (R-01015)', suffix: 'MA15', crank: 'BLANCA' },
  { name: 'MARRON (R-08014)', suffix: 'MR14', crank: 'NEGRA' },
  { name: 'NEGRO (R-09011)', suffix: 'NE11', crank: 'NEGRA' },
  { name: 'VERDE (R-06005)', suffix: 'VE05', crank: 'NEGRA' },
  { name: 'BURDEOS (R-03005)', suffix: 'BU05', crank: 'NEGRA' }
];

const normalize = (value) => String(value || '').toUpperCase().replace(/\s+/g, '');

export const lacadoNames = table.map((item) => item.name);

export function resolveLacado(name) {
  const clean = normalize(name);
  const exact = table.find((item) => normalize(item.name) === clean);
  if (exact) return exact;
  // Variantes sin código R- (p. ej. "BURDEOS") o con espacios raros del Excel.
  const partial = table.find((item) => clean && normalize(item.name).startsWith(clean));
  return partial || table[0];
}

export function crankSuffix(lacado) {
  return lacado.crank === 'BLANCA' ? 'BL16' : 'NE11';
}

export function machineCode(lacado) {
  return lacado.crank === 'BLANCA' ? 'MAQMB9L13BLANBL16' : 'MAQMB9L13NEGRNE11';
}
