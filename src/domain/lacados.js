// Identidades históricas de reserva: no cambiar sufijos ni manivelas al renombrar.
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
  // Pedido de compra 091076, OF 0232215: antracita 7016 usa GR16.
  Object.freeze({ name: 'ANTRACITA (RAL 7016)', suffix: 'GR16', crank: 'NEGRA' }),
  Object.freeze({ name: 'GRIS 7016 MATE TEXT.', suffix: 'GT16', crank: 'NEGRA' }),
  Object.freeze({ name: 'NEGRO MATE 9111', suffix: 'NEM1', crank: 'NEGRA' }),
  // Iván, 08/10/2026 (AR2604748): el negro 9005 brillo, junto al mate. En el Iris es el negro de
  // BAT (NEGR, NE05); donde la pieza no existe en NE05 se reserva en blanco para lacar fuera.
  Object.freeze({ name: 'NEGRO 9005', suffix: 'NE05', crank: 'NEGRA' }),
  Object.freeze({ name: 'NEGRO MATE 9005-9405', suffix: 'NM05', crank: 'NEGRA' }),
  Object.freeze({ name: 'CORTEN OXIDO 516', suffix: 'O516', crank: 'NEGRA' }),
  // Iván, 08/10/2026: los colores con piezas lacadas en RPS que faltaban (familias con color que
  // compone la web, maestro del 08/10/2026), y el blanco mate 9003, que se pide mucho y solo
  // tiene piezas del Antica. Donde una pieza no existe en el color, va en blanco para lacar fuera.
  // Manivela blanca en blancos y marfiles, negra en el resto.
  Object.freeze({ name: 'AZUL 5004 MATE', suffix: 'AZM4', crank: 'NEGRA' }),
  Object.freeze({ name: 'BLANCO 9016 MATE TEXT.', suffix: 'B16M', crank: 'BLANCA' }),
  Object.freeze({ name: 'BLANCO ALUMINIO 9006 TEXT.', suffix: 'BT06', crank: 'NEGRA' }),
  Object.freeze({ name: 'BLANCO ALUMINIO 99006', suffix: 'BL06', crank: 'NEGRA' }),
  Object.freeze({ name: 'BLANCO MATE 9003', suffix: 'BL3M', crank: 'BLANCA' }),
  Object.freeze({ name: 'GRIS 7016 MATE', suffix: 'G16M', crank: 'NEGRA' }),
  Object.freeze({ name: 'MARFIL BLANCO OSTRA 1013 TEXT.', suffix: 'MATX', crank: 'BLANCA' }),
  Object.freeze({ name: 'MARFIL MATE 1013', suffix: 'MM13', crank: 'BLANCA' }),
  Object.freeze({ name: 'MARRON 8002', suffix: 'MR02', crank: 'NEGRA' }),
  Object.freeze({ name: 'MARRON 8007', suffix: 'MR07', crank: 'NEGRA' }),
  Object.freeze({ name: 'MARRON 8014 TEXT.', suffix: 'MT14', crank: 'NEGRA' }),
  Object.freeze({ name: 'MARRON 8017', suffix: 'MR17', crank: 'NEGRA' }),
  Object.freeze({ name: 'MARRON 8019', suffix: 'MR19', crank: 'NEGRA' }),
  Object.freeze({ name: 'PARDO 8019', suffix: 'PA19', crank: 'NEGRA' }),
  Object.freeze({ name: 'PLATA 9006', suffix: 'PL06', crank: 'NEGRA' }),
  Object.freeze({ name: 'PLATA ANODIZADO 537', suffix: 'P537', crank: 'NEGRA' }),
  Object.freeze({ name: 'VERDE 6009', suffix: 'VE09', crank: 'NEGRA' })
]);

const normalize = (value) => String(value || '').toUpperCase().replace(/\s+/g, '');
// Nombre sin el codigo "(R-XXXXX)" final, p. ej. "GRIS (R-07022)" -> "GRIS".
const stripCode = (value) => normalize(value).replace(/\(R-\d+\)$/, '');

// Tarifa Llaza 2026, página impresa 11. Los nombres visibles se separan de la
// identidad histórica para abrir pedidos antiguos sin cambiar ninguna reserva.
// Números alternativos del acabado tras el RAL (Iván, 04/11/2026).
const groups = [
  ['Precio base', [
    ['Blanco tráfico brillo 9016', 'BL16']
  ]],
  ['Básicos +15 %', [
    ['Blanco tráfico textura 9016-9416', 'B16M'],
    ['Gris antracita textura 7016-7416', 'GT16'],
    ['Marrón sepia textura 8014-8414', 'MT14'],
    ['Negro intenso textura 9005-9405', 'NM05'],
    ['Blanco puro brillo 9010', 'BL10'],
    ['Blanco ostra textura 1013-1413', 'MATX'],
    ['Marfil claro brillo 1015', 'MA15'],
    ['Gris basalto brillo 7012', 'GR12'],
    ['Gris sombra textura 7022-7422', ''],
    ['Plata europeo metal 9006', 'PL06'],
    ['Negro grafito mate 9011-9111', 'NEM1'],
    ['Negro grafito brillo 9011', 'NE11']
  ]],
  ['Selección +25 %', [
    ['Blanco ostra mate 1013-1113', 'MM13'],
    ['Gris 150 sablé textura', 'PTM'],
    ['Aluminio blanco textura 9006-9406', 'BT06'],
    ['Plata Llaza metal', 'PL27'],
    ['Gris antracita brillo 7016', 'GR16'],
    ['Gris sombra brillo 7022', 'GR22'],
    ['Antracita metálico DB703', ''],
    ['Rojo vino brillo 3005', 'BU05'],
    ['Verde musgo brillo 6005', 'VE05'],
    ['Marrón sepia brillo 8014', 'MR14'],
    ['Marrón chocolate brillo 8017', 'MR17'],
    ['Bronce Llaza metal', 'BR28'],
    ['Corten óxido textura', 'O516'],
    ['Negro intenso brillo 9005', 'NE05']
  ]],
  ['Otros colores (fuera de la tarifa Llaza)', [
    // Si el acabado no está acreditado, no se inventa brillo ni mate.
    // BL06 ≠ PL06, G16M ≠ GT16 y MR19 ≠ PA19: deben seguir separados.
    ['Azul mate 5004-5104', 'AZM4'],
    ['Aluminio blanco 9006-99006', 'BL06'],
    ['Blanco mate 9003', 'BL3M'],
    ['Gris antracita mate 7016', 'G16M'],
    ['Marrón 8002', 'MR02'],
    ['Marrón 8007', 'MR07'],
    ['Marrón 8019', 'MR19'],
    ['Pardo 8019', 'PA19'],
    ['Plata anodizado 537', 'P537'],
    ['Verde 6009', 'VE09']
  ]],
  ['', [['Lacado especial (RAL)', '']]]
];

export const lacadoCatalog = Object.freeze(groups.flatMap(([group, colors]) => colors.map(([name, suffix]) => {
  // BL10 y PTM comprobados en STKArticle (04/11/2026). DB703 solo tiene
  // AN03 de baja; 7022 textura no tiene piezas: ambos se lacan como el especial.
  const lacado = suffix ? table.find(item => item.suffix === suffix) : null;
  return Object.freeze({ name, group, lacado: lacado || Object.freeze({
    name, suffix, crank: suffix === 'BL10' ? 'BLANCA' : 'NEGRA'
  }) });
})));

export const lacadoNames = lacadoCatalog.map(item => item.name);

function findLacado(name) {
  const clean = normalize(name);
  const catalog = lacadoCatalog.find(item => normalize(item.name) === clean);
  if (catalog) return catalog.lacado;
  const exact = table.find(item => normalize(item.name) === clean);
  if (exact) return exact;
  return clean ? table.find(item => stripCode(item.name) === clean) : undefined;
}

export function lacadoLabel(name) {
  if (!name) return '';
  const lacado = findLacado(name);
  const entry = lacado && lacadoCatalog.find(item => item.lacado.suffix === lacado.suffix
    && (lacado.suffix || item.lacado.name === lacado.name || (lacado.name === 'LACADO ESPECIAL' && item.group === '')));
  return entry?.name || String(name);
}

export function lacadoGroup(name) {
  return lacadoCatalog.find(item => item.name === lacadoLabel(name))?.group || '';
}

export function lacadoPrintName(name) {
  return lacadoLabel(name).toLocaleUpperCase('es-ES');
}

export function isKnownLacado(name) {
  return Boolean(findLacado(name));
}

export function resolveLacado(name) {
  // Un nombre desconocido mantiene el comportamiento histórico: blanco.
  return findLacado(name) || table[0];
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
