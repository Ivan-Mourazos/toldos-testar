/**
 * Lógica pura de `validate:reserva`: compara lo que reserva la web con lo que
 * sale del almacén (`CPRImputationMaterialMO`). La consulta SQL vive en el
 * script; aquí solo se clasifica, para poder probarlo sin RPS.
 */

// Artículo de venta de RPS con el que se identifican las OF de cada modelo.
// GALICIA no tiene uno propio: se vende como ARZUA y su validador lo reconoce
// por los soportes SOPARTGL, que también llevan algunos Arzúa. Se resuelve en
// la tarea del modelo, no aquí.
export const articuloDeVenta = {
  'ARZUA PRO': "= 'ARZUA'",
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

// Consumo real que no debe reservar el planteamiento, con el motivo.
const aparteConMotivo = [
  { patron: /^TUBOTRA/, motivo: 'Embalaje: lo pone almacén, no el planteamiento (decisión de OT, 04/09/2026).' },
  { patron: /^V504/, motivo: 'Vinilo de rotulación: la cantidad no depende del toldo (decisión de OT, 04/09/2026).' },
  { patron: /^RESTO/, motivo: 'Resto de almacén: sobrante de una pieza que se reserva nueva. Informativo.' }
];

const colorSuffix = '(BL\\d\\d|NE\\d\\d|NEGRO|BLAN|MR\\d\\d|VE\\d\\d|GR\\d\\d|PL\\d\\d|O5\\d\\d|MA\\d\\d|BU\\d\\d|NEM\\d|NM\\d\\d|GT\\d\\d|BR\\d\\d)';

// Una referencia es "la misma pieza en otro color o largo" si comparte raíz.
export function rootCode(code) {
  return String(code).toUpperCase()
    .replace(new RegExp(`${colorSuffix}?\\d{3,4}C$`), '')
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
