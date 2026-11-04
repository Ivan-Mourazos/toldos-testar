import { lacadoLabel } from '../../domain/lacados.js';

const preferredLabels: Record<string, string> = {
  'GENERAL WOLDER': 'General Wolder',
  'HERA 43 máquina': 'Hera 43 máquina',
  'HERA 56 máquina': 'Hera 56 máquina',
  'HERA 56 motor': 'Hera 56 motor',
  'IRIS 130 sin cofre': 'Iris 130 sin cofre',
  'Tubo de carga univers 280': 'Tubo de carga Univers 280',
  'Tubo de carga evo 80': 'Tubo de carga Evo 80',
  'PUENTES LATERALES': 'Puentes laterales',
  'PUENTES ESVA': 'Puentes Esva',
  'PUENTES HIJOS DE PEDRO LOPEZ': 'Puentes Hijos de Pedro López',
  'HIJOS DE PEDRO LOPEZ': 'Hijos de Pedro López',
  'TUBO DE CARGA UNIVERS 80': 'Tubo de carga Univers 80',
  'SOPORTE MAXISCREEM BOX': 'Soporte Maxiscreen Box',
  'SOPORTE ELIT VERTICAL': 'Soporte Elit vertical',
  'SOPORTES ALMAGRO': 'Soportes Almagro',
  'SOPORTE MAXISCREEN': 'Soporte Maxiscreen',
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
  'SOLAPAS': 'Solapas',
  'EMBUDO': 'Embudo',
  'CAMBIO TELA': 'Cambio de tela',
  'CAMBIO ANTICA': 'Cambio Antica',
  'HERA': 'Hera',
  'HERA 43 MAQUINA': 'Hera 43 máquina',
  'HERA 56 MAQUINA': 'Hera 56 máquina',
  'HERA 56 MOTOR': 'Hera 56 motor',
  'IVAN': 'Iván',
  'IVÁN': 'Iván',
  'JAIME': 'Jaime',
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
  'ET': 'ET · entrada de tubo',
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
  SOLAPAS: 'SOLAPA CON VELCRO PARA TOLDOS CORTINA',
  EMBUDO: 'EMBUDO DE BOCA DE DESCARGA',
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

export function controlLabel(value: string = ''): string {
  if (preferredLabels[value]) return preferredLabels[value];
  if (value.includes(' / ')) return value.split(' / ').map(controlLabel).join(' / ');
  if (!value || value !== value.toLocaleUpperCase('es-ES')) return value;

  const sentence = value.toLocaleLowerCase('es-ES');
  return `${sentence.charAt(0).toLocaleUpperCase('es-ES')}${sentence.slice(1)}`
    .replace(/\b(r|ral)-(?=\d)/g, (code) => code.toLocaleUpperCase('es-ES'))
    .replace(/\b(rps|of|mfi|mfd|pvc|ral|sate|bat|pdf|dxf|dwg)\b/gi, (code) => code.toLocaleUpperCase('es-ES'))
    .replace(/\be\.t\./gi, 'E.T.');
}

// Solo para avisos de pantalla: los diagnósticos originales siguen disponibles para taller.
export function diagnosticLabel(message: string) {
  if (message.includes('Tela no encontrada en el catálogo:')) return message;
  return message.replace(/NEGRO \(R-09011\)|(?<![\p{L}\p{N}_])(?:ARZUA PRO|ÁGATA BOX|AGATA BOX|ÁMBAR BOX|AMBAR BOX|PERLA BOX|CORAL BOX|CUARZO BOX|MONOBLOCK 350|PUNTO RECTO|MAXISCREEM|GALICIA|XACOBEO|ANTICA|CORTINA|SELENA|ELECTRA|EMBUDO|HERA|IRIS|SOLAPAS|MOTOR|MAQUINA|BLANCO)(?![\p{L}\p{N}_])/gu, (name) => {
    if (name === 'BLANCO' || name.startsWith('NEGRO (')) return lacadoLabel(name);
    if (name === 'ÁGATA BOX') return 'Ágata Box';
    if (name === 'ÁMBAR BOX') return 'Ámbar Box';
    if (name === 'MOTOR' || name === 'MAQUINA') return controlLabel(name).toLocaleLowerCase('es-ES');
    return controlLabel(name);
  });
}

// Modelos en los que el nombre de RPS no aporta nada en pantalla: es el mismo
// ("MODELO GALICIA") o la descripción del artículo ("CORTINA UNIVERSAL").
// Se revisa en cada modelo al darlo por terminado (Iván, 22/09/2026).
const redundantLegacyNames = new Set([
  'CORTINA', 'CAMBIO CORTINA', 'SOLAPAS', 'CAMBIO TELA', 'CAMBIO ANTICA', 'ENROLLABLE', 'BAMBALINA', 'GALICIA', 'PUNTO RECTO', 'ANTICA'
]);

export function rpsModelName(value: string) {
  return legacyModelNames[String(value || '').toUpperCase()] || '';
}

// Nombre anterior que se enseña como "antes …": solo si el modelo cambió de nombre.
export function legacyModelName(value: string) {
  const model = String(value || '').toUpperCase();
  const names: Record<string, string> = {
    'ARZUA PRO': 'Arond-350 (Llaza)', XACOBEO: 'Art 250 (Llaza)',
    'MONOBLOCK 350': 'Monobloc 350 (Llaza)', MAXISCREEM: 'Maxiscreen',
    ELECTRA: 'Elit vertical', HERA: 'Screen Roll-System', SELENA: 'Stor-21 (Llaza)',
    IRIS: 'Screeny (BAT)', 'AMBAR BOX': 'Microbox', 'AGATA BOX': 'Modulbox',
    'CUARZO BOX': 'Storbox 250', 'PERLA BOX': 'Storbox S-300', 'CORAL BOX': 'Storbox 400'
  };
  return redundantLegacyNames.has(model) ? '' : names[model] || controlLabel(rpsModelName(model));
}
