/**
 * Lógica pura de `validate:reserva`: compara lo que reserva la web con lo que
 * sale del almacén (`CPRImputationMaterialMO`). La consulta SQL vive en el
 * script; aquí solo se clasifica, para poder probarlo sin RPS.
 */

// Artículo de venta de RPS con el que se identifican las OF de cada modelo.
// GALICIA no tiene uno propio: se vende como ARZUA y se distingue por los soportes
// SOPARTGL (condicionDeOF, más abajo).
export const articuloDeVenta = {
  'ARZUA PRO': "= 'ARZUA'",
  // En RPS no hay artículo GALICIA: se vende como ARZUA y se distingue por el soporte.
  GALICIA: "= 'ARZUA'",
  XACOBEO: "= 'XACOBEO'",
  'MONOBLOCK 350': "= 'MONOB'",
  ANTICA: "= 'ANTICA'",
  SELENA: "LIKE 'SELENA%'",
  HERA: "LIKE 'HERA%'",
  MAXISCREEM: "LIKE 'DIANA%'",
  ELECTRA: "LIKE 'ELECTR%'",
  IRIS: "LIKE 'IRIS%'",
  CORTINA: "= 'CORTINAUNI'",
  'PUNTO RECTO': "= 'PUNREC'",
  'AMBAR BOX': "= 'AMBARBOX'",
  'AGATA BOX': "IN ('AGATABOX', 'AGATASCLOSE', 'AGATASOPEN', 'ASTORGA')",
  'CUARZO BOX': "= 'CUARZOBOX'",
  'PERLA BOX': "= 'PERLABOX'",
  'CORAL BOX': "= 'CORALBOX'"
};

// Condición extra sobre la OF (alias mo) cuando el artículo de venta no basta.
const conSoporteGalicia = `EXISTS (SELECT 1 FROM dbo.CPRImputationMaterialMO g
  JOIN dbo.STKArticle ga ON ga.IDArticle = g.IDArticle AND ga.CodCompany = g.CodCompany
  WHERE g.IDManufacturingOrder = mo.IDManufacturingOrder AND ga.CodArticle LIKE 'SOPARTGL%')`;
// El proyecto especial de Madrid (2024, más de 600 toldos con brazos BANTICA de 44 cm,
// soportes propios y tubo Screen Ø43) se vendió como ANTICA pero no es el modelo habitual:
// sin excluirlo tapa las 39 OF del Antica normal.
const proyectoAnticaMadrid = `EXISTS (SELECT 1 FROM dbo.CPRImputationMaterialMO m
  JOIN dbo.STKArticle ma ON ma.IDArticle = m.IDArticle AND ma.CodCompany = m.CodCompany
  WHERE m.IDManufacturingOrder = mo.IDManufacturingOrder
    AND (ma.CodArticle LIKE 'BANTICA%' OR ma.CodArticle LIKE 'SOP_ANTICA%' OR ma.CodArticle LIKE 'SOPO_ANTICA%' OR ma.CodArticle LIKE 'SCRTUBO43%'))`;
export const condicionDeOF = {
  'ARZUA PRO': `NOT ${conSoporteGalicia}`,
  GALICIA: conSoporteGalicia,
  ANTICA: `NOT ${proyectoAnticaMadrid}`
};

// Consumo real que no debe reservar el planteamiento, con el motivo.
const aparteConMotivo = [
  { patron: /^TUBOTRA/, motivo: 'Embalaje: lo pone almacén, no el planteamiento (decisión de OT, 04/09/2026).' },
  { patron: /^FILMEMBALAR/, motivo: 'Film de embalar: embalaje, como el tubo transparente (decisión de OT, 04/09/2026).' },
  { patron: /^EXT_LACAR/, motivo: 'Lacado exterior de un color especial: servicio, no pieza del toldo; el planteamiento no lo sabe.' },
  { patron: /^V504/, motivo: 'Vinilo de rotulación: la cantidad no depende del toldo (decisión de OT, 04/09/2026).' },
  { patron: /^RESTO/, motivo: 'Resto de almacén: sobrante de una pieza que se reserva nueva. Informativo.' }
];

// Los perfiles de BAT (Iris) usan además NEGR, NEMA, G16M y BRUT (bruto, para lacar
// fuera), y algún largo termina en CM (PEMoSU13GR16600CM).
const colorSuffix = '(BL\\d\\d|NE\\d\\d|NEGRO|NEGR|NEMA|G16M|BRUT|BLAN|MR\\d\\d|VE\\d\\d|GR\\d\\d|PL\\d\\d|O5\\d\\d|MA\\d\\d|BU\\d\\d|NEM\\d|NM\\d\\d|GT\\d\\d|BR\\d\\d)';

// Una referencia es "la misma pieza en otro color o largo" si comparte raíz.
export function rootCode(code) {
  return String(code).toUpperCase()
    .replace(new RegExp(`${colorSuffix}?\\d{3,4}CM?$`), '')
    .replace(new RegExp(`${colorSuffix}$`), '');
}

export function classifyGap({ consumido, nuestras }) {
  const reservadas = new Set([...nuestras].map((code) => code.toUpperCase()));
  const raices = new Set([...reservadas].map(rootCode));
  const ofsMedidas = consumido.length ? Math.max(...consumido.map((x) => x.ofs)) : 0;
  if (!ofsMedidas) {
    return {
      ofsMedidas, articulosQueReservamos: reservadas.size, falta: [], sobra: [], aparte: [],
      sinDatos: 'Ninguna OF con este artículo de venta desde 2025: revisar el filtro antes de concluir nada.'
    };
  }
  const cubierta = (code) => reservadas.has(code.toUpperCase()) || raices.has(rootCode(code));
  const motivoAparte = (code) => aparteConMotivo.find(({ patron }) => patron.test(code))?.motivo;
  // Solo lo que aparece en al menos el 20 % de las OF: por debajo suele ser
  // material puntual, sustituciones o reprocesos.
  const frecuentes = consumido.filter((x) => x.ofs >= Math.max(3, ofsMedidas * 0.2));
  return {
    ofsMedidas,
    articulosQueReservamos: reservadas.size,
    falta: frecuentes
      .filter((x) => !motivoAparte(x.CodArticle) && !cubierta(x.CodArticle))
      .map((x) => ({ code: x.CodArticle, ofs: x.ofs, descripcion: String(x.Description).trim() })),
    aparte: frecuentes
      .filter((x) => motivoAparte(x.CodArticle))
      .map((x) => ({ code: x.CodArticle, ofs: x.ofs, motivo: motivoAparte(x.CodArticle) })),
    sobra: [...reservadas].filter((code) => !consumido.some((x) => rootCode(x.CodArticle) === rootCode(code)))
  };
}
