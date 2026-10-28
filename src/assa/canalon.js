import largos from './canalones420150.json' with { type: 'json' };
import plantilla from './geometriasPlantilla.json' with { type: 'json' };

// Canalón de la 420150 como en los lotes de la oficina (LOTE 31-10, 2026): bloques fijos del ancho del rollo que se
// repiten con su «x» (Iván, 28/10/2026: «se ponen bloques y se cortan las cantidades que sean con el X tanto»).
// La mitad mide L (de la plantilla, «la plantilla manda»): 18 cm en la punta gruesa y 13 en la fina. El entero es la V de
// dos mitades. Combinado: 8 enteros cada 26 cm con 7 parejas de mitades encajadas (15 canalones). Mitades: su mitad
// izquierda, 15 mitades (7,5 canalones). Los costados van con DISCO2 y las puntas gruesas llevan una pestaña a 20 del
// borde; su largo también es el de la plantilla (84 mm, o 79 en las de 180).
// Lo que pide el pedido, justo (Iván, 28/10/2026: «podemos ajustar para cortar justo lo que se pide»): los combinados
// completos y, para lo que falta, una pila igual con menos filas: ⌈r/2⌉ enteros y ⌊r/2⌋ parejas de mitades encajadas.
const PASO = 260, GRUESO = 180, CAIDA = 50, FILAS = 8, A_PESTANA = 20;
export const CANALONES_POR_BLOQUE = { combinado: FILAS + (FILAS - 1), mitades: (2 * FILAS - 1) / 2 };
export const ALTO_BLOQUE_MM = (FILAS - 1) * PASO + GRUESO;

/**
 * Juego de la plantilla para la referencia y su NB. El entero suele medir NB + 16 cm (0090: 3450 → 3610; la 0002, 3600);
 * si la referencia tiene dos juegos, manda el que va con el NB, y sin ninguno cerca el canalón va a mano.
 * @returns {{ mitad: number, pestana: number } | null}
 */
export function canalonDe(codigo, NB) {
  if (/^430(?:127|129|172)-/.test(codigo)) {
    const margen = codigo.startsWith('430127') ? 160 : 200;
    const juegos = plantilla.canalones[codigo] ?? [];
    return juegos.filter(j => Math.abs(2 * j.mitad - NB - margen) <= 10)
      .sort((a, b) => Math.abs(2 * a.mitad - NB - margen) - Math.abs(2 * b.mitad - NB - margen))[0] ?? null;
  }
  const juegos = largos.canalonMm[codigo] ?? [], desvio = j => Math.abs(2 * j.mitad - NB - 160);
  return juegos.filter(j => desvio(j) <= 10).sort((a, b) => desvio(a) - desvio(b))[0] ?? null;
}

const raya = (capa, x1, y1, x2, y2) => ({ capa, x1, y1, x2, y2 });

/** Media V (0 ≤ x ≤ L): lo que el combinado y el bloque de mitades tienen en común. */
function mitadIzquierda(L, largoPestana, enteros = FILAS, parejas = FILAS - 1) {
  const s = CAIDA / L, e = [];
  // Pestaña desde el costado x0 hacia dentro (sentido ±1), a 20 del borde y hasta cortar con él.
  const pestana = (x0, sentido, yBorde, haciaDentro, pendiente) => {
    const x = x0 + sentido * largoPestana, yb = yBorde + pendiente * largoPestana;
    e.push(raya('DISCO1', x0, yBorde + haciaDentro * A_PESTANA, x, yb + haciaDentro * A_PESTANA), raya('DISCO1', x, yb + haciaDentro * A_PESTANA, x, yb));
  };
  for (let i = 0; i < enteros; i++) {
    const y = i * PASO;
    // Entero: punta gruesa en x = 0.
    e.push(raya('DISCO1', 0, y, L, y + CAIDA), raya('DISCO1', 0, y + GRUESO, L, y + GRUESO - CAIDA), raya('DISCO2', 0, y, 0, y + GRUESO));
    pestana(0, 1, y, 1, s);
    pestana(0, 1, y + GRUESO, -1, -s);
    if (i >= parejas) continue;
    // Mitad encajada: punta fina en x = 0 y gruesa en x = L.
    e.push(raya('DISCO2', 0, y + GRUESO, 0, y + PASO), raya('DISCO2', L, y + GRUESO - CAIDA, L, y + PASO + CAIDA));
    pestana(L, -1, y + GRUESO - CAIDA, 1, s);
    pestana(L, -1, y + PASO + CAIDA, -1, -s);
    // La pareja de arriba del todo, sin entero encima: su raya de arriba también se corta.
    if (i === enteros - 1) e.push(raya('DISCO1', 0, y + PASO, L, y + PASO + CAIDA));
  }
  return e;
}

const espejo = (L, e) => e.map(l => ({ ...l, x1: 2 * L - l.x1, x2: 2 * L - l.x2 }));
const clave = l => [l.capa, ...[[l.x1, l.y1], [l.x2, l.y2]].map(p => p.map(v => Math.round(v * 10)).join(',')).sort()].join('|');
const unicas = e => [...new Map(e.map(l => [clave(l), l])).values()];

/** Pila de `enteros` canalones en V con `parejas` parejas de mitades encajadas (parejas = enteros o enteros − 1). */
export function pilaCanalon({ mitad: L, pestana }, enteros, parejas) {
  const izquierda = mitadIzquierda(L, pestana, enteros, parejas);
  return { largoMm: 2 * L, altoMm: (enteros - 1) * PASO + (parejas === enteros ? PASO + CAIDA : GRUESO), canalones: enteros + parejas,
    lineas: unicas([...izquierda, ...espejo(L, izquierda)]) };
}

export const capacidadCanalon = canalon => 2 * (canalon?.filas ?? FILAS) - 1;

/** Los motivos medidos conservan las pestañas y la pendiente de cada referencia, también en fondo 900. */
export function pilaDePlantilla(canalon, enteros, parejas) {
  if (!canalon.entero) return pilaCanalon(canalon, enteros, parejas);
  const lineas = [];
  for (const [motivo, n] of [[canalon.entero, enteros], [canalon.pareja, parejas]]) {
    for (let i = 0; i < n; i++) lineas.push(...motivo.map(l => ({ ...l, y1: l.y1 + i * canalon.paso, y2: l.y2 + i * canalon.paso })));
  }
  return { largoMm: 2 * canalon.mitad,
    altoMm: (enteros - 1) * canalon.paso + (parejas === enteros ? canalon.paso + canalon.caida : canalon.grueso),
    canalones: enteros + parejas, lineas: unicas(lineas) };
}

/** @param {'combinado'|'mitades'} tipo */
export function bloqueCanalon(canalon, tipo) {
  if (canalon.entero && tipo === 'combinado') return pilaDePlantilla(canalon, canalon.filas, canalon.filas - 1);
  if (canalon.entero) throw new Error('Este juego se genera con enteros y parejas, sin bloque suelto de mitades.');
  const { mitad: L, pestana } = canalon, izquierda = mitadIzquierda(L, pestana);
  if (tipo === 'combinado') return pilaCanalon(canalon, FILAS, FILAS - 1);
  // En el bloque de mitades el entero se corta por el centro: su punta fina también va con DISCO2.
  const centros = Array.from({ length: FILAS }, (_, i) => raya('DISCO2', L, i * PASO + CAIDA, L, i * PASO + GRUESO - CAIDA));
  return { largoMm: L, lineas: unicas([...izquierda, ...centros]) };
}

/** n canalones justos: los combinados completos y, si falta, una pila con el resto. */
export function juegosCanalon(n, canalon) {
  const capacidad = capacidadCanalon(canalon);
  const completos = Math.floor(n / capacidad), resto = n - completos * capacidad;
  return { completos, resto: resto ? { enteros: Math.ceil(resto / 2), parejas: Math.floor(resto / 2) } : null };
}
