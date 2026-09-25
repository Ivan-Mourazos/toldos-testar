export const xacobeoDevices = ['MAQ. EXTERIOR', 'MAQ. INTERIOR', 'MOTOR'];

export const xacobeoMinimumLineByProjection = [125, 150, 175, 200, 225, 250]
  .map((projection) => ({
    projection,
    // Manual ART 250 (rev. 23-10-14), pág. 8: la línea mínima es salida + 37 con
    // máquina exterior y salida + 32 con máquina interior o motor. La web los tenía
    // al revés; ningún pedido real quedaba por debajo (29 xacobeos de 2025-2026).
    values: {
      'MAQ. EXTERIOR': projection + 37,
      'MAQ. INTERIOR': projection + 32,
      MOTOR: projection + 32
    }
  }));

export const xacobeoEstablishedProjections = xacobeoMinimumLineByProjection
  .map((item) => item.projection);

// Manual ART 250 (rev. 23-10-14), pág. 8: la línea máxima es 4,50 m hasta brazo
// de 2,00 y 4,00 m con brazos de 2,25 y 2,50. Ningún pedido real de 2025-2026 se
// sale (el mayor con salida 250 mide 375,5).
export const xacobeoMaxWidthByProjection = Object.freeze({ 225: 400, 250: 400 });

export const defaultXacobeoParameters = {
  standardMaxWidth: 450,
  maxWidthByProjection: { ...xacobeoMaxWidthByProjection },
  fabricDropAllowanceCm: 45,
  seamAllowanceCm: 2.5,
  seamBaseCm: 6.5,
  stockLengths: [600, 700],
  // Lona según el manual ART 250 (Iván, 25/09/2026, Q-X01). El taller cortaba con
  // 12,5 / 12 / 11; si esos valores siguen guardados en el servidor, se migran.
  fabricWidthDiscounts: {
    'MAQ. EXTERIOR': 11.9,
    'MAQ. INTERIOR': 11.6,
    MOTOR: 9.9
  },
  rollTubeDiscounts: {
    'MAQ. EXTERIOR': 10.9,
    'MAQ. INTERIOR': 10.6,
    MOTOR: 8.9
  },
  loadBarDiscounts: {
    'MAQ. EXTERIOR': 9.9,
    'MAQ. INTERIOR': 9.6,
    MOTOR: 8.7
  },
  minimumLineByProjection: xacobeoMinimumLineByProjection
};

/** @returns {import('../client/types').XacobeoParameters} */
export function normalizeXacobeoParameters(input = {}) {
  const defaults = defaultXacobeoParameters;
  return {
    ...defaults,
    ...input,
    standardMaxWidth: positive(input.standardMaxWidth, defaults.standardMaxWidth),
    fabricDropAllowanceCm: nonNegative(input.fabricDropAllowanceCm, defaults.fabricDropAllowanceCm),
    seamAllowanceCm: nonNegative(input.seamAllowanceCm, defaults.seamAllowanceCm),
    seamBaseCm: nonNegative(input.seamBaseCm, defaults.seamBaseCm),
    stockLengths: normalizeStockLengths(input.stockLengths, defaults.stockLengths),
    fabricWidthDiscounts: migrateLegacyDiscounts(normalizeDiscounts(input.fabricWidthDiscounts, defaults.fabricWidthDiscounts), legacyFabricWidthDiscounts, defaults.fabricWidthDiscounts),
    rollTubeDiscounts: normalizeDiscounts(input.rollTubeDiscounts, defaults.rollTubeDiscounts),
    loadBarDiscounts: normalizeDiscounts(input.loadBarDiscounts, defaults.loadBarDiscounts),
    minimumLineByProjection: normalizeMinimumLines(input.minimumLineByProjection, defaults.minimumLineByProjection)
  };
}

const legacyFabricWidthDiscounts = Object.freeze({ 'MAQ. EXTERIOR': 12.5, 'MAQ. INTERIOR': 12, MOTOR: 11 });

// Un descuento guardado igual al de antes pasa al del manual; uno cambiado a mano se respeta.
function migrateLegacyDiscounts(values, legacy, manual) {
  return Object.fromEntries(Object.entries(values).map(([device, value]) => [
    device,
    value === legacy[device] && value !== manual[device] ? manual[device] : value
  ]));
}

function normalizeDiscounts(input, defaults) {
  return Object.fromEntries(xacobeoDevices.map((device) => [
    device,
    nonNegative(input?.[device], defaults[device])
  ]));
}

function normalizeMinimumLines(input, defaults) {
  if (!Array.isArray(input)) return structuredClone(defaults);
  return defaults.map((row) => {
    const candidate = input.find((item) => Number(item?.projection) === row.projection);
    return {
      projection: row.projection,
      values: Object.fromEntries(xacobeoDevices.map((device) => [
        device,
        positive(candidate?.values?.[device], row.values[device])
      ]))
    };
  });
}

function normalizeStockLengths(input, defaults) {
  if (!Array.isArray(input)) return [...defaults];
  const values = [...new Set(input.map(Number).filter((value) => Number.isFinite(value) && value > 0))]
    .sort((left, right) => left - right);
  return values.length ? values : [...defaults];
}

function positive(value, fallback) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function nonNegative(value, fallback) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
}
