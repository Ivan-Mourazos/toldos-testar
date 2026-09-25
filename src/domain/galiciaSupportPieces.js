// Brazos Onyx y soportes Galicia: en RPS `BONYX{lacado}{salida}C` y `SOPARTGL{lacado}`
// son JUEGOS (dos piezas). Las sueltas llevan I o D detrás de la familia. Un toldo de
// tres brazos consume un juego y una pieza suelta de cada: así salen 100 de las 132
// OF de Arzúa con soporte Galicia desde 2024. El lado del suelto no sigue ninguna
// regla (56 izquierdos y 56 derechos) y los libros no lo reservan.
// Piezas sueltas activas en RPS (InactiveDate), consultado el 23/09/2026.
const singleArmsBySuffix = Object.freeze({
  BL06: { D: [300], I: [300] },
  BL16: { D: [150, 175, 200, 225, 250, 275, 300, 325, 350, 375, 400], I: [150, 175, 200, 225, 250, 275, 300, 325, 350, 375, 400] },
  BR28: { D: [225, 250, 300], I: [225] },
  BU05: { D: [200, 275, 350, 400], I: [200, 350] },
  GR12: { D: [275, 300, 400], I: [250, 275, 300, 400] },
  GR16: { D: [225, 275, 300, 350], I: [225, 300, 350] },
  GR22: { D: [225, 250, 400], I: [250, 400] },
  MA15: { D: [200, 225, 250, 275, 300], I: [200, 250, 275, 300] },
  MR14: { D: [200, 225, 250, 275, 300, 400], I: [200, 225, 250, 300, 400] },
  NE11: { D: [200, 225, 250, 275, 300, 325, 350, 400], I: [200, 225, 250, 275, 300, 325, 350, 400] },
  NEM1: { D: [250, 275, 300, 350], I: [250, 275, 300, 350, 400] },
  NM05: { D: [400], I: [400] },
  O516: { D: [250], I: [250] },
  PL06: { D: [300], I: [300] },
  PL27: { D: [225, 300, 350], I: [300, 350] },
  VE05: { D: [200, 300, 350], I: [300, 350] },
  VE09: { D: [300, 400], I: [300, 400] }
});

// Soporte Galicia suelto: solo existe en blanco y en negro.
const singleSupportSides = Object.freeze({ BL16: ['D', 'I'], NE11: ['D', 'I'] });

// Lado del suelto: el que diga el pedido («IZQUIERDO» / «DERECHO»). Iván, 25/09/2026
// (Q-A04): no es de un lado concreto; si no se indica, lo decide el taller y se reserva
// uno cualquiera. Si el elegido no existe en ese color, la reserva lo pide en blanco
// para lacar (lacadoFallback.js).
export function looseSideLetter(value) {
  const clean = String(value || '').toUpperCase();
  if (clean.startsWith('IZQ')) return 'I';
  if (clean.startsWith('DER')) return 'D';
  return '';
}

export function looseSideName(piece, side, chosen) {
  return chosen ? `${piece} ${side === 'D' ? 'DERECHO' : 'IZQUIERDO'}` : `${piece} SUELTO · LADO A ELEGIR EN TALLER`;
}

// Sin lado elegido se reserva el derecho y, si no existe en ese lacado y salida, el
// izquierdo. Un lacado sin ninguno conserva el derecho para que lo detecte `pnpm validate:rps-refs`.
function singleArmSide(colorSuffix, projection) {
  const sides = singleArmsBySuffix[String(colorSuffix || '')];
  if (!sides) return 'D';
  if (sides.D.includes(Number(projection))) return 'D';
  return sides.I.includes(Number(projection)) ? 'I' : 'D';
}

// Solo se sabe para los lacados de la tabla; uno que no esté no se bloquea y lo
// detecta `pnpm validate:rps-refs`.
export function galiciaSingleArmExists(colorSuffix, projection) {
  const sides = singleArmsBySuffix[String(colorSuffix || '')];
  return sides ? [...sides.D, ...sides.I].includes(Number(projection)) : true;
}

function singleSupportSide(colorSuffix, chosen = '') {
  return chosen || singleSupportSides[String(colorSuffix || '')]?.[0] || 'D';
}

// Brazos Onyx por juegos: dos brazos son un juego y un número impar añade uno suelto.
// Lo usan Galicia (2 o 3) y Monoblock 350 (2, 3 o 4: cuatro son dos juegos).
export function onyxArmLines(colorSuffix, projection, armCount, units, looseSide = '') {
  const arms = Number(armCount) || 2;
  const lines = [{ code: `BONYX${colorSuffix}${projection}C`, quantity: Math.floor(arms / 2) * units, description: 'JUEGO DE BRAZOS ONYX' }];
  if (arms % 2 === 1) {
    const chosen = looseSideLetter(looseSide);
    const side = chosen || singleArmSide(colorSuffix, projection);
    lines.push({ code: `BONYX${side}${colorSuffix}${projection}C`, quantity: units, description: looseSideName('BRAZO ONYX', side, chosen) });
  }
  return lines;
}

export function galiciaArmLines(colorSuffix, projection, armCount, units, looseSide = '') {
  return onyxArmLines(colorSuffix, projection, armCount, units, looseSide);
}

export function galiciaSupportLines(colorSuffix, armCount, units, looseSide = '') {
  const lines = [{ code: `SOPARTGL${colorSuffix}`, quantity: units, description: 'JUEGO SOPORTE GALICIA' }];
  if (Number(armCount) === 3) {
    const chosen = looseSideLetter(looseSide);
    const side = singleSupportSide(colorSuffix, chosen);
    lines.push({ code: `SOPARTGL${side}${colorSuffix}`, quantity: units, description: looseSideName('SOPORTE GALICIA', side, chosen) });
  }
  return lines;
}
