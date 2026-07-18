const aliases = new Map([
  ['MICROBOX', 'AMBAR BOX'],
  ['STORBOX 250', 'CUARZO BOX'],
  ['STORBOX 400', 'CORAL BOX'],
  ['CORALBOX', 'CORAL BOX'],
  ['PERLABOX', 'PERLA BOX'],
  ['STORBOX S-300', 'PERLA BOX'],
  ['STORBOX S300', 'PERLA BOX'],
  ['MODUL400', 'AGATA BOX'],
  ['MODULBOX', 'AGATA BOX']
]);

export function normalizeModelName(value) {
  const code = String(value || '').trim().toUpperCase();
  return aliases.get(code) || code;
}
