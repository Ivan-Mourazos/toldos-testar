import largos from './canalones420150.json' with { type: 'json' };

// Canalón de la 420150 como en los lotes de la oficina (LOTE 31-10, 2026): bloques fijos del ancho del rollo que se
// repiten con su «x» (Iván, 28/10/2026: «se ponen bloques y se cortan las cantidades que sean con el X tanto»).
// La mitad mide L (de la plantilla, «la plantilla manda»): 18 cm en la punta gruesa y 13 en la fina. El entero es la V de
// dos mitades. Combinado: 8 enteros cada 26 cm con 7 parejas de mitades encajadas (15 canalones). Mitades: su mitad
// izquierda, 15 mitades (7,5 canalones). Los costados van con DISCO2 y las puntas gruesas llevan una pestaña a 20 del
// borde; su largo también es el de la plantilla (84 mm, o 79 en las de 180).
const PASO = 260, GRUESO = 180, CAIDA = 50, FILAS = 8, A_PESTANA = 20;
export const CANALONES_POR_BLOQUE = { combinado: FILAS + (FILAS - 1), mitades: (2 * FILAS - 1) / 2 };
export const ALTO_BLOQUE_MM = (FILAS - 1) * PASO + GRUESO;

/**
 * Juego de la plantilla para la referencia y su NB. El entero suele medir NB + 16 cm (0090: 3450 → 3610; la 0002, 3600);
 * si la referencia tiene dos juegos, manda el que va con el NB, y sin ninguno cerca el canalón va a mano.
 * @returns {{ mitad: number, pestana: number } | null}
 */
export function canalonDe(codigo, NB) {
  const juegos = largos.canalonMm[codigo] ?? [], desvio = j => Math.abs(2 * j.mitad - NB - 160);
  return juegos.filter(j => desvio(j) <= 10).sort((a, b) => desvio(a) - desvio(b))[0] ?? null;
}

const raya = (capa, x1, y1, x2, y2) => ({ capa, x1, y1, x2, y2 });

/** Media V (0 ≤ x ≤ L): lo que el combinado y el bloque de mitades tienen en común. */
function mitadIzquierda(L, largoPestana) {
  const s = CAIDA / L, e = [];
  // Pestaña desde el costado x0 hacia dentro (sentido ±1), a 20 del borde y hasta cortar con él.
  const pestana = (x0, sentido, yBorde, haciaDentro, pendiente) => {
    const x = x0 + sentido * largoPestana, yb = yBorde + pendiente * largoPestana;
    e.push(raya('DISCO1', x0, yBorde + haciaDentro * A_PESTANA, x, yb + haciaDentro * A_PESTANA), raya('DISCO1', x, yb + haciaDentro * A_PESTANA, x, yb));
  };
  for (let i = 0; i < FILAS; i++) {
    const y = i * PASO;
    // Entero: punta gruesa en x = 0.
    e.push(raya('DISCO1', 0, y, L, y + CAIDA), raya('DISCO1', 0, y + GRUESO, L, y + GRUESO - CAIDA), raya('DISCO2', 0, y, 0, y + GRUESO));
    pestana(0, 1, y, 1, s);
    pestana(0, 1, y + GRUESO, -1, -s);
    if (i === FILAS - 1) continue;
    // Mitad encajada: punta fina en x = 0 y gruesa en x = L.
    e.push(raya('DISCO2', 0, y + GRUESO, 0, y + PASO), raya('DISCO2', L, y + GRUESO - CAIDA, L, y + PASO + CAIDA));
    pestana(L, -1, y + GRUESO - CAIDA, 1, s);
    pestana(L, -1, y + PASO + CAIDA, -1, -s);
  }
  return e;
}

const espejo = (L, e) => e.map(l => ({ ...l, x1: 2 * L - l.x1, x2: 2 * L - l.x2 }));
const clave = l => [l.capa, ...[[l.x1, l.y1], [l.x2, l.y2]].map(p => p.map(v => Math.round(v * 10)).join(',')).sort()].join('|');
const unicas = e => [...new Map(e.map(l => [clave(l), l])).values()];

/** @param {'combinado'|'mitades'} tipo */
export function bloqueCanalon({ mitad: L, pestana }, tipo) {
  const izquierda = mitadIzquierda(L, pestana);
  if (tipo === 'combinado') return { largoMm: 2 * L, lineas: unicas([...izquierda, ...espejo(L, izquierda)]) };
  // En el bloque de mitades el entero se corta por el centro: su punta fina también va con DISCO2.
  const centros = Array.from({ length: FILAS }, (_, i) => raya('DISCO2', L, i * PASO + CAIDA, L, i * PASO + GRUESO - CAIDA));
  return { largoMm: L, lineas: unicas([...izquierda, ...centros]) };
}

/** Juegos para n canalones: el lote cubre lo pedido con bloques enteros, el combinado antes que el de mitades. */
export function juegosCanalon(n) {
  const medios = Math.ceil(n / CANALONES_POR_BLOQUE.mitades);
  return { combinado: Math.floor(medios / 2), mitades: medios % 2 };
}
