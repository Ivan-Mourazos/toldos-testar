const preferredLabels: Record<string, string> = {
  'ARZUA PRO': 'Arzúa Pro',
  'PUNTO RECTO': 'Punto Recto',
  'MONOBLOCK 350': 'Monoblock 350',
  'AMBAR BOX': 'Ámbar Box',
  'AGATA BOX': 'Ágata Box',
  'CUARZO BOX': 'Cuarzo Box',
  'PERLA BOX': 'Perla Box',
  'CORAL BOX': 'Coral Box',
  'MAXISCREEM': 'Diana vertical',
  'CAMBIO CORTINA': 'Cambio de cortina',
  'CAMBIO TELA': 'Cambio de tela',
  'CAMBIO ANTICA': 'Cambio Antica',
  'HERA': 'HERA',
  'HERA 43 MAQUINA': 'HERA 43 máquina',
  'HERA 56 MAQUINA': 'HERA 56 máquina',
  'HERA 56 MOTOR': 'HERA 56 motor',
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
  'ENTRADA TUBO Ø33 MM': 'Entrada tubo Ø33 mm',
  'ENTRADA TUBO Ø42 MM': 'Entrada tubo Ø42 mm',
  'TOLDO-VELCRO': 'Toldo con velcro',
  'CAMBIO ENROLLABLE': 'Cambio de enrollable',
  'SUPLEMENTO': 'Suplemento con broches',
  'BASE': 'Salida base',
  'FINISHED': 'Tela terminada',
  'STANDARD': 'Estándar',
  'VERTICAL_170': 'Bajada vertical 170°',
  'SI': 'Sí',
  'NO': 'No'
};

const legacyModelNames: Record<string, string> = {
  'ARZUA PRO': 'ART 325 / ARZUA',
  GALICIA: 'MODELO GALICIA',
  XACOBEO: 'ART 250 / XACOBEO',
  'PUNTO RECTO': 'PUNTO RECTO',
  'MONOBLOCK 350': 'ARZUA MONOBLOC',
  MAXISCREEM: 'MAXISCREEN',
  CORTINA: 'CORTINA UNIVERSAL',
  'CAMBIO CORTINA': 'CAMBIO DE TELA A TOLDO CORTINA',
  'CAMBIO TELA': 'CAMBIO DE TELA A TOLDO DE FACHADA',
  ENROLLABLE: 'LONA PARA PUERTA ENROLLABLE',
  BAMBALINA: 'BAMBALINA NUEVA',
  'CAMBIO ANTICA': 'CAMBIO DE TELA A TOLDO ANTICA',
  HERA: 'ROLL-SYSTEM',
  ANTICA: 'ANTICA',
  'AMBAR BOX': 'MICROBOX',
  'AGATA BOX': 'MODULBOX',
  'CUARZO BOX': 'STORBOX 250',
  'PERLA BOX': 'STORBOX S-300',
  'CORAL BOX': 'STORBOX 400'
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
