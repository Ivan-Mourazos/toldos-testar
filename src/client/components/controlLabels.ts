const preferredLabels: Record<string, string> = {
  'ARZUA PRO': 'Arzúa Pro',
  'AMBAR BOX': 'Ambar Box',
  'AGATA BOX': 'Agata Box',
  'CUARZO BOX': 'Cuarzo Box',
  'CORAL BOX': 'Coral Box',
  'MAXISCREEM': 'Diana vertical',
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

export function controlLabel(value: string) {
  if (preferredLabels[value]) return preferredLabels[value];
  if (!value || value !== value.toLocaleUpperCase('es-ES')) return value;

  const sentence = value.toLocaleLowerCase('es-ES');
  return `${sentence.charAt(0).toLocaleUpperCase('es-ES')}${sentence.slice(1)}`
    .replace(/\b(r|ral)-(?=\d)/g, (code) => code.toLocaleUpperCase('es-ES'));
}
