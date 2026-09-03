const aliases = new Map([
  ['MICROBOX', 'AMBAR BOX'],
  ['STORBOX 250', 'CUARZO BOX'],
  ['STORBOX 400', 'CORAL BOX'],
  ['CORALBOX', 'CORAL BOX'],
  ['PERLABOX', 'PERLA BOX'],
  ['STORBOX S-300', 'PERLA BOX'],
  ['STORBOX S300', 'PERLA BOX'],
  ['MODUL400', 'AGATA BOX'],
  ['MODULBOX', 'AGATA BOX'],
  ['MAXISCREEN', 'MAXISCREEM'],
  ['DIANA', 'MAXISCREEM'],
  ['DIANA VERTICAL', 'MAXISCREEM'],
  ['ELECTR', 'ELECTRA'],
  ['ELITV', 'ELECTRA'],
  ['ELIT VERTICAL', 'ELECTRA'],
  ['ELECTRA / ELIT VERTICAL', 'ELECTRA'],
  ['SCREENY', 'IRIS'],
  ['SCREENY 110', 'IRIS'],
  ['SCREENY 130', 'IRIS'],
  ['SCREENY 150', 'IRIS'],
  ['IRIS 110', 'IRIS'],
  ['IRIS 130', 'IRIS'],
  ['IRIS 150', 'IRIS'],
  ['HERA43', 'HERA'],
  ['HERA 43', 'HERA'],
  ['HERA56', 'HERA'],
  ['HERA 56', 'HERA'],
  ['ROLLSYS', 'HERA'],
  ['ROLL-SYSTEM', 'HERA']
]);

export function normalizeModelName(value) {
  const code = String(value || '').trim().toUpperCase();
  return aliases.get(code) || code;
}
