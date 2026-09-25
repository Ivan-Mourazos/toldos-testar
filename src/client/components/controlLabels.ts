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
  'ELECTRA': 'Electra',
  'SELENA': 'Selena',
  'CAMBIO CORTINA': 'Cambio de cortina',
  'CAMBIO TELA': 'Cambio de tela',
  'CAMBIO ANTICA': 'Cambio antica',
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
  'SUPLEMENTO': 'Suplemento',
  'REMACHADO': 'Remachado · bastilla',
  'BASE': 'Salida base',
  'FINISHED': 'Tela terminada',
  'STANDARD': 'Estándar',
  'VERTICAL_170': 'Bajada vertical 170°',
  'SI': 'Sí',
  'NO': 'No'
};

const legacyModelNames: Record<string, string> = {
  // Nombre del producto del proveedor (Iván, 25/09/2026). El ART 325 era el soporte
  // del Arzúa antiguo (hasta 2021); hoy es el AROND-350 de Llaza.
  'ARZUA PRO': 'AROND-350 (LLAZA)',
  GALICIA: 'MODELO GALICIA',
  XACOBEO: 'ART 250 (LLAZA)',
  'PUNTO RECTO': 'PUNTO RECTO',
  'MONOBLOCK 350': 'MONOBLOC 350 (LLAZA)',
  MAXISCREEM: 'MAXISSCREEN',
  ELECTRA: 'ELIT VERTICAL',
  CORTINA: 'CORTINA UNIVERSAL',
  'CAMBIO CORTINA': 'CAMBIO DE TELA A TOLDO CORTINA',
  'CAMBIO TELA': 'CAMBIO DE TELA A TOLDO DE FACHADA',
  ENROLLABLE: 'LONA PARA PUERTA ENROLLABLE',
  BAMBALINA: 'BAMBALINA NUEVA',
  'CAMBIO ANTICA': 'CAMBIO DE TELA A TOLDO ANTICA',
  HERA: 'SCREEN ROLL-SYSTEM',
  SELENA: 'STOR-21 (LLAZA)',
  // Iris es el nombre comercial de TGM para la línea Screeny de BAT (docs/rps-iris-evidence.md).
  IRIS: 'SCREENY (BAT)',
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

// Modelos en los que el nombre de RPS no aporta nada en pantalla: es el mismo
// ("MODELO GALICIA") o la descripción del artículo ("CORTINA UNIVERSAL").
// Se revisa en cada modelo al darlo por terminado (Iván, 22/09/2026).
const redundantLegacyNames = new Set([
  'CORTINA', 'CAMBIO CORTINA', 'CAMBIO TELA', 'ENROLLABLE', 'BAMBALINA', 'GALICIA', 'PUNTO RECTO', 'ANTICA'
]);

export function rpsModelName(value: string) {
  return legacyModelNames[String(value || '').toUpperCase()] || '';
}

// Nombre anterior que se enseña como "antes …": solo si el modelo cambió de nombre.
export function legacyModelName(value: string) {
  const model = String(value || '').toUpperCase();
  return redundantLegacyNames.has(model) ? '' : rpsModelName(model);
}
