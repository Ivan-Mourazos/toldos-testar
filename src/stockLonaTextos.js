import { normalizeSearchText } from './domain/fabricSearch.js';

// Palabras que el técnico escribe junto a la lona pero que no están en la descripción de RPS.
const SOBRAN = new Set(['PVC', 'LONA', 'GR', 'GRS', 'GRAMOS', 'EN', 'DE', 'COLOR', 'RAL', 'TELA']);
// Un texto es de lona si dice el material: PVC, LONA, REJILLA, acrílico, Soltis, micro…, o el gramaje (G650, 900 GR).
const MATERIAL = /\b(PVC|LONA|REJILLA|ACRIL\w*|SOLTIS|MICRO\w*|G\d{3,4}|\d{3,4}\s?GRS?)\b/;
// Y el color, para no confundir una nota («ACRÍLICO», «LONA ENTERA») con la lona del corte.
const COLOR = /\b(BLANC\w*|NEGR\w*|GRIS\w*|AZUL\w*|VERDE\w*|ROJ\w*|AMARILL\w*|NARANJ\w*|MARRON\w*|BEIGE|CREMA|MARFIL|GRANATE|BURDEOS|FUCSIA|PLATA|TRANSPARENTE|CRISTAL|\d{4})\b/;

/** Búsqueda para el catálogo a partir de lo que pone en el plano, o null si el texto no es de lona. */
export function consultaLona(texto) {
  const limpio = normalizeSearchText(texto);
  if (!MATERIAL.test(limpio) || !COLOR.test(limpio)) return null;
  const palabras = limpio.split(' ').filter(p => !SOBRAN.has(p)).map(p => p.replace(/^G(\d{3,4})$/, '$1'));
  return palabras.length >= 2 ? palabras.join(' ') : null;
}

const ancho = tela => Number(tela.width) || 0;
// La misma lona en otro ancho: la descripción sin el último tramo («:300AN»).
const base = tela => String(tela.description ?? '').replace(/:[^:]*$/, '').trim();

/** El rollo más estrecho que cubre el alto del tramo; si ninguno llega, el más ancho. */
function rolloPara(telas, altoCm) {
  const caben = telas.filter(t => ancho(t) >= altoCm - 1).sort((a, b) => ancho(a) - ancho(b));
  return caben[0] ?? [...telas].sort((a, b) => ancho(b) - ancho(a))[0];
}

/**
 * Lona de un trozo del corte por lo que pone escrito en él.
 * Si el pedido ya tiene asignada en RPS una de las lonas que encajan con el texto, gana esa.
 * @param {{ textos: string[], altoCm: number }} tramo
 * @param {{ buscar: (consulta: string) => Promise<any[]>, asignadas?: string[] }} opciones
 * @returns {Promise<{ codigo: string, descripcion: string, texto: string } | null>}
 */
export async function lonaDeTramo({ textos, altoCm }, { buscar, asignadas = [] }) {
  const candidatas = [];
  for (const texto of textos) {
    const consulta = consultaLona(texto);
    if (!consulta) continue;
    let telas = (await buscar(consulta)).filter(t => ancho(t) > 0 && !/^RESTO/i.test(t.code));
    // La de segunda calidad solo si el plano lo dice («REJILLA 2ª»).
    const primeras = telas.filter(t => !/2ª/.test(t.description ?? ''));
    if (!/\b2\b|SEGUNDA/.test(consulta) && primeras.length) telas = primeras;
    if (telas.length) candidatas.push({ texto, telas });
  }
  for (const { texto, telas } of candidatas) {
    const delPedido = telas.filter(t => asignadas.includes(t.code));
    if (delPedido.length) {
      const tela = rolloPara(delPedido, altoCm);
      return { codigo: tela.code, descripcion: tela.description, texto };
    }
  }
  const primera = candidatas[0];
  if (!primera) return null;
  const tela = rolloPara(primera.telas.filter(t => base(t) === base(primera.telas[0])), altoCm);
  return { codigo: tela.code, descripcion: tela.description, texto: primera.texto };
}
