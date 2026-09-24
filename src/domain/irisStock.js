import { barsForCuts } from './math.js';

// Lo que existe de verdad en RPS para el cofre y las guías del Iris, consultado con
// InactiveDate el 24/09/2026. Los perfiles de BAT no siguen la tabla de lacados: el
// blanco es BLAN o BL10 (9010), el negro NEGR o NE05 (9005) y cada familia tiene sus
// colores y sus largos. Componer el código con el sufijo del lacado emitiría
// referencias que no existen (no hay cofre superior 130 en negro 9005, ni perfil de
// guía solo motor en negro), y una referencia de baja no bloquea la subida a RPS.
//
// Cuando el lacado no está en la familia, el taller gasta el perfil en bruto y lo
// laca fuera (EXT_LACAR): OF 0213064 (marrón 8003), 0214385 (plata 9006), 0206880
// (marrón óxido), 0201769 (verde) y 0200344 (gris). Si tampoco hay bruto, no se
// reserva y el cálculo avisa para añadirlo a mano.

// Perfiles: familia → color → largos (cm). "600CM" es un código que termina en CM
// en vez de en C (PECOSSU1NEMA600CM, PEMoSU13GR16600CM).
const profiles = Object.freeze({
  // Cofre superior (común a redondo y cuadrado)
  PECOSSU1: { BL06: [400], BLAN: [500, 700], BRUT: [400, 500, 700], GR16: [400, 500, 600, 700], MR14: [700], MR17: [500, 600], NEGR: [700], NEMA: [400, 500, '600CM', 700], OXMR: [500, 700], PL06: [700], VE05: [700], VE09: [400] },
  PECOSSU3: { BLAN: [500, 700], BRUT: [500], G16M: [500, 700], GR16: [500], MR02: [500, 700], MR14: [500, 700], MR17: [500], NEM1: [500, 700] },
  PECOSSU5: { BL10: [600, 800], BRUT: [800], GR12: [600, 800], NE05: [800] },
  // Cofre inferior redondo
  PECORSU1: { BL06: [400, 500], BLAN: [700], BRUT: [400, 500, 700], GR16: [400, 500, 600, 700], MR14: [700], NE05: [400, 700], NEMA: [400, 500, '600CM', 700], OXMR: [500, 700], PL06: [700], VE05: [700], VE09: [500] },
  PECORSU3: { BLAN: [500, 700], BRUT: [500], G16M: [500], GR16: [500], MR14: [500], MR17: [500] },
  PECORSU5: { BL10: [600, 800], GR12: [600, 800], NE05: [800] },
  // Cofre inferior cuadrado (el 150 no lo tiene: su cofre es siempre redondo)
  PECOCSU1: { BL10: [500], GR16: [400, 500], MR02: [500, 700], MR17: [500, 600], PL06: [700] },
  PECOCSU3: { BLAN: [500, 700], BRUT: [500], G16M: [500, 700], GR16: [500], MR02: [500, 700], MR14: [500, 700], MR17: [500], NEM1: [500, 700] },
  // Guía ÚNICA a máquina o motor (estándar), guía ÚNICA solo motor (pequeña) y su tapa
  PEMMSU13: { BL06: [500], BLAN: [600, 700], BRUT: [400, 500, 600], G16M: [500], GR12: [500], GR16: [500, 600], MR14: [500, 600], MR17: [500], NEGR: [600, 700], NEMA: [600], NM05: [500], OXMR: [600], PL06: [600], VE05: [500, 600], VE09: [500, 600] },
  PEMoSU13: { BLAN: [600], GR16: ['600CM'], MR02: [600], NEM1: [600] },
  PECGSU13: { BL06: [500], BLAN: [600, 700], BRUT: [400, 500, 600], G16M: [500], GR12: [500], GR16: [500, 600], MR02: [600], MR14: [500, 600], MR17: [500], NEGR: [600, 700], NEM1: [500], NEMA: [600], OXMR: [600], PL06: [600], VE05: [500, 600], VE09: [500, 600] },
  // Guía GPZ C (compensadora): perfil de guía y perfil compensador entreparedes
  PEGSZ13: { BLAN: [500, 600], BRUT: [500, 600], MA13: [500], MR17: [600], NEGR: [600], NEMA: [600], PL06: [600] },
  PEGCZ13: { BLAN: [600], BRUT: [500, 600], MA13: [500], MR14: [600], NEGR: [600], NEMA: [600], PL06: [600], VE05: [600] }
});

// Juegos de tapas del cofre: familia → colores.
const caps = Object.freeze({
  TAPASSUN1: ['BLAN', 'BRUT', 'GR12', 'GR16', 'MR14', 'NE05', 'NEMA', 'OXMR', 'PL06', 'VE05', 'VE09'],
  TAPASCOR3: ['BLAN', 'BRUT', 'G16M', 'GR16', 'MR14', 'MR17'],
  TAPASSUN5: ['BL10', 'GR12', 'NEGR', 'PL06'],
  TAPASCOU1: ['BLAN', 'BRUT', 'GR16', 'MR17', 'PL06'],
  TAPASCOU3: ['BLAN', 'BU05', 'G16M', 'GR16', 'MR02', 'MR14', 'NEM1']
});

// Sufijo de la tabla de lacados → colores de BAT que le corresponden, por preferencia.
// Lo que no está aquí (bronce, gris 7022, gris plata R-00027, marfil 1015, corten,
// lacado especial) no tiene perfil lacado de BAT: va en bruto.
const lacadoColors = Object.freeze({
  BL16: ['BLAN', 'BL10'],
  NE11: ['NEGR', 'NE05'],
  GR16: ['GR16'],
  GT16: ['G16M'],
  GR12: ['GR12'],
  MR14: ['MR14'],
  VE05: ['VE05'],
  BU05: ['BU05'],
  NEM1: ['NEM1'],
  NM05: ['NEMA', 'NM05']
});

function colorsFor(lacado) {
  return lacadoColors[String(lacado?.suffix || '')] || [];
}

function lengthOf(entry) {
  return typeof entry === 'number' ? entry : Number.parseInt(entry, 10);
}

/**
 * Perfil del Iris en el color del lacado y el largo que menos material gasta para
 * `pieces` piezas: dos guías de 270 salen de una barra de 600 y no de dos de 500. Si
 * el lacado no está en la familia, o no llega a la pieza, el bruto. Sin código si no
 * hay ninguno: lo que falta se avisa, no se inventa.
 * `reason` dice por qué no sale lacado: 'color' si BAT no tiene ese color en la
 * familia y 'length' si lo tiene pero ningún largo llega al corte; '' si sale lacado.
 * @returns {{ code: string | null, stock: number, raw: boolean, reason: '' | 'color' | 'length' }}
 */
export function irisProfile(family, lacado, pieceLength, pieces = 1) {
  const byColor = profiles[family];
  if (!byColor) return { code: null, stock: 0, raw: false, reason: 'color' };
  const needed = Number(pieceLength) || 0;
  const used = (item) => barsForCuts(needed, pieces, lengthOf(item)) * lengthOf(item);
  const pick = (color) => {
    const fitting = (byColor[color] || []).filter((item) => lengthOf(item) >= needed);
    if (!fitting.length) return null;
    const entry = fitting.reduce((best, item) => (used(item) < used(best) ? item : best));
    const stock = lengthOf(entry);
    const tail = typeof entry === 'number' ? `${entry}C` : entry;
    return { code: `${family}${color}${tail}`, stock, raw: color === 'BRUT' };
  };
  const colors = colorsFor(lacado).filter((color) => byColor[color]);
  for (const color of colors) {
    const found = pick(color);
    if (found) return { ...found, reason: '' };
  }
  const reason = colors.length ? 'length' : 'color';
  return { ...(pick('BRUT') || { code: null, stock: 0, raw: false }), reason };
}

/**
 * Juego de tapas del cofre en el color del lacado, o en bruto.
 * @returns {{ code: string, raw: boolean } | null}
 */
export function irisCaps(family, lacado) {
  const colors = caps[family];
  if (!colors) return null;
  const color = colorsFor(lacado).find((item) => colors.includes(item)) || (colors.includes('BRUT') ? 'BRUT' : null);
  return color ? { code: `${family}${color}`, raw: color === 'BRUT' } : null;
}
