const preferredLabels: Record<string, string> = {
  'ARZUA PRO': 'Arzúa Pro',
  'AMBAR BOX': 'Ambar Box',
  'AGATA BOX': 'Agata Box',
  'CUARZO BOX': 'Cuarzo Box',
  'PERLA BOX': 'Perla Box',
  'CORAL BOX': 'Coral Box',
  'MAXISCREEM': 'Maxiscreem',
  'HOSTELERÍA / EMPRESA': 'Hostelería / empresa',
  'TUBO DE CARGA EVO 80': 'Evo 80',
  'TUBO DE CARGA UNIVERS 280': 'Univers 280',
  'MAQ. INTERIOR': 'Máq. interior',
  'MAQ. EXTERIOR': 'Máq. exterior',
  'MAQUINA': 'Máquina',
  'M.F.DER': 'M.F. derecha',
  'M.F IZQ': 'M.F. izquierda',
  'SIN SENSOR': 'Sin sensor',
  'VIENTO -SOL': 'Viento y sol',
  'ENTRE PAREDES': 'Entre paredes',
  'SI': 'Sí',
  'NO': 'No'
};

const legacyModelNames: Record<string, string> = {
  'AMBAR BOX': 'Microbox 300',
  'AGATA BOX': 'Modul 400 / Modulbox',
  'CUARZO BOX': 'Storbox 250',
  'PERLA BOX': 'Storbox S-300',
  'CORAL BOX': 'Storbox 400',
  'MAXISCREEM': 'Diana vertical'
};

export function controlLabel(value: string) {
  if (preferredLabels[value]) return preferredLabels[value];
  if (!value || value !== value.toLocaleUpperCase('es-ES')) return value;

  const sentence = value.toLocaleLowerCase('es-ES');
  return `${sentence.charAt(0).toLocaleUpperCase('es-ES')}${sentence.slice(1)}`
    .replace(/\b(r|ral)-(?=\d)/g, (code) => code.toLocaleUpperCase('es-ES'));
}

export function legacyModelName(value: string) {
  return legacyModelNames[String(value || '').toUpperCase()] || '';
}
