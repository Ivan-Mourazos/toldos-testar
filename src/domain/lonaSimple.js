// Nombre simple de una lona de PVC (Iván, 26/11/2026): «PVC 580 AZUL 5015 · 250 AN».
//
// Es la misma lona aunque sea de otra marca: ALPHA, MONZA, STARPLUS y NS86 son 580;
// G650, B8000 y LAC640 son 650; PANAMA, LAC900 y B6000 son 900. Las ignífugas (M2, B1)
// van aparte. Lo que manda es el RAL:
//   · Con RAL, el nombre es el color y su RAL («GRIS 7038»), diga lo que diga la marca
//     («GRIS CLARO 7374 RAL7038» o «GRIS 095 7038 (CLARO)»). Las «similar a 5015» cuentan
//     como 5015: en remolques se gastan así (54 OF desde 2025).
//   · Sin RAL, el color tal cual («AZUL EUROPA», «BLANCO»): es otra opción, no se junta
//     con las que tienen RAL.
// El ancho forma parte del nombre: de él depende el corte.

const FAMILIAS = [
  [/\bALPHA\b|\bMONZA\b|\bSTARPLUS\b|\bNS86\b|\bRECORD\b|\bPOLYMAR 82[15]0\b/, '580'],
  [/\bG650\b|\bB8000\b|\bLAC ?6[45]0\b|\bGAMMA2 IGN|\bB8103/, '650'],
  [/\bPANAMA\b|\bLAC ?900\b|\bB6000\b/, '900'],
];
const IGNIFUGA = /IGN|\bM2\b|-B1\b|\bB1\b|\bFR\b/;
const ANCHO = /(\d{3})\s*(?:AN|CM)\b/g;
// RAL clásicos: 1000-9023, con el segundo dígito 0 (descarta las referencias del fabricante
// que se le parecen, como «AZUL 7290» o «GRIS 7705»).
const RAL_VALIDO = /^[1-9]0[0-4]\d$/;

const normalizar = texto => String(texto ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '')
  .toUpperCase().replace(/²/g, '2').replace(/\s+/g, ' ').trim();

function ralDe(...textos) {
  for (const texto of textos) {
    const conRal = /\bRAL\s*-?\s*(\d{4})\b|\bRA(\d{4})\b/.exec(texto);
    const ral = conRal?.[1] ?? conRal?.[2]
      ?? /(?:SIMILAR|PARECIDO)\s*(?:A\s*)?(?:RAL\s*)?(\d{4})\b/.exec(texto)?.[1]
      ?? /\(\s*(?:RAL\s*)?(\d{4})\s*\)/.exec(texto)?.[1];
    if (ral) return ral;
  }
  for (const texto of textos) {
    const suelto = [...texto.matchAll(/(?<![\d/-])(\d{4})(?![\d/-])/g)].map(m => m[1]).find(n => RAL_VALIDO.test(n));
    if (suelto) return suelto;
  }
  return null;
}

function palabrasColor(texto) {
  return texto.replace(/\([^)]*\)/g, ' ').split(/[\s:]+/).flatMap(token => {
    const limpio = token.replace(/^[-.,]+|[-.,]+$/g, '');
    if (!limpio || /^(RAL|RA|SIMILAR|PARECIDO|REF|A)$/.test(limpio)) return [];
    const pegado = /^([A-ZÑ]{4,})\d+$/.exec(limpio);
    if (pegado) return [pegado[1]];
    return /\d/.test(limpio) ? [] : [limpio];
  });
}

/** @typedef {{ gramaje: string, ignifuga: boolean, color: string, ral: string | null, ancho: number | null }} LonaSimple */

/** @param {LonaSimple} lona */
const nombreColor = ({ color, ral }) => ral ? `${color.split(' ')[0]} ${ral}`.trim() : color;

/** Lee la descripción de RPS («LONA MONZA 1L 580g/m² :AZUL RAL5015 :250AN»), el nombre del
 * catálogo de toldos («PVC 580 AZUL 5015») o el propio nombre simple («PVC 580 AZUL 5015 · 250 AN»).
 * null si no es una lona de PVC de las de siempre.
 * @param {string} descripcion @param {number | null} [anchoSiFalta] @returns {LonaSimple | null} */
export function leerLona(descripcion, anchoSiFalta = null) {
  const texto = normalizar(descripcion);
  const simple = /^PVC (\d{3})( IGN(?:IFUGA)?)? (.+?)(?: · (\d{3}) AN)?$/.exec(texto);
  if (simple) {
    const ral = ralDe(simple[3]);
    const color = palabrasColor(simple[3]).join(' ');
    if (!color && !ral) return null;
    return { gramaje: simple[1], ignifuga: Boolean(simple[2]), color, ral, ancho: simple[4] ? Number(simple[4]) : anchoSiFalta };
  }
  if (!/^LONA\b/.test(texto) || /PISCINA/.test(texto)) return null;
  const dosPuntos = texto.indexOf(':');
  if (dosPuntos < 0) return null;
  const familia = texto.slice(0, dosPuntos);
  const gramaje = FAMILIAS.find(([patron]) => patron.test(familia))?.[1]
    ?? (/[([]\s*580\s*[)\]]/.test(texto) ? '580' : null);
  if (!gramaje) return null;
  const resto = texto.slice(dosPuntos + 1);
  const anchos = [...resto.matchAll(ANCHO)];
  const ultimo = anchos.at(-1);
  const colorTexto = ultimo ? resto.slice(0, ultimo.index) : resto;
  const detras = ultimo ? resto.slice(ultimo.index + ultimo[0].length) : '';
  const ral = ralDe(colorTexto, detras);
  const color = palabrasColor(colorTexto).join(' ');
  if (!color && !ral) return null;
  return { gramaje, ignifuga: IGNIFUGA.test(familia.replace(/G\s*\/\s*M2/g, '')), color, ral, ancho: ultimo ? Number(ultimo[1]) : anchoSiFalta };
}

/** «PVC 580 AZUL 5015 · 250 AN». @param {LonaSimple} lona */
export function nombreLona(lona) {
  const base = ['PVC', lona.gramaje, lona.ignifuga ? 'IGNÍFUGA' : '', nombreColor(lona)].filter(Boolean).join(' ');
  return lona.ancho ? `${base} · ${lona.ancho} AN` : base;
}

/** Lo que hace que dos lonas sean la misma, sin el ancho. @param {LonaSimple} lona */
export const colorLona = lona => [lona.gramaje, lona.ignifuga ? 'IGN' : '', lona.ral ? `RAL${lona.ral}` : lona.color].join('|');

/** Lo que hace que dos lonas sean la misma, con el ancho. @param {LonaSimple} lona */
export const claveLona = lona => `${colorLona(lona)}|${lona.ancho ?? ''}`;

/** Códigos con stock que son la misma lona que `codigo`: del mismo ancho y más anchos.
 * `filas`: las de stock de RPS, con su descripción. Si la lona no se reconoce, solo ella.
 * @param {{ code: string, description?: string }[]} filas @param {string} codigo
 * Sin stock de la propia lona, se lee la primera de `descripcion` que se entienda (catálogo, pedido…).
 * @param {string | string[]} [descripcion] @param {number | null} [anchoSiFalta]
 * @returns {{ nombre: string | null, mismoAncho: string[], masAnchas: { codigo: string, ancho: number }[] }} */
export function lonasDelGrupo(filas, codigo, descripcion = '', anchoSiFalta = null) {
  const descripciones = new Map();
  for (const fila of filas) if (fila.description && !descripciones.has(fila.code)) descripciones.set(fila.code, fila.description);
  const candidatas = [descripciones.get(codigo), ...[descripcion].flat()].filter(Boolean);
  const propia = candidatas.map(texto => leerLona(texto, anchoSiFalta)).find(Boolean) ?? null;
  if (!propia?.ancho) return { nombre: propia ? nombreLona(propia) : null, mismoAncho: [codigo], masAnchas: [] };
  const mismoAncho = new Set([codigo]);
  const masAnchas = [];
  for (const [otro, texto] of descripciones) {
    const lona = leerLona(texto);
    if (!lona?.ancho || colorLona(lona) !== colorLona(propia)) continue;
    if (lona.ancho === propia.ancho) mismoAncho.add(otro);
    else if (lona.ancho > propia.ancho) masAnchas.push({ codigo: otro, ancho: lona.ancho });
  }
  return { nombre: nombreLona(propia), mismoAncho: [...mismoAncho], masAnchas };
}
