import { fabricSelectionLabel, serializeFabricSelection } from './fabricCatalog.js';

// Del texto de una línea de RPS se saca una pista de tela: material, peso y color,
// más la frase original para enseñarla al técnico. No se busca en el catálogo
// aquí; eso lo hace `buildFabricProposals`, que además admite una función de
// búsqueda inyectada para poder probarla sin RPS.

const materialPatterns = [
  ['ACR', /ACRILIC/],
  ['PVC', /\bPVC\b|PLASTIFICAD|RECUBIERTA\s+DE\s+PVC/],
  ['SOLTIS', /SOLTIS|MICROPERFORAD/]
];

// La frase de tela acaba en el primer punto que no sea decimal («1.20 M» sigue).
const fabricClauseExpression = /FABRICAD[OA]S?\s+EN\s+([\s\S]*?)(?:\.(?!\d)|$)/g;
// Sin «FABRICADO EN» con material, la frase empieza en «LONA/TEJIDO + material»;
// cubre también «LONAPOLIESTER» escrito junto.
const fabricStartExpression = /\b(?:LONA|TEJIDO)\s*(?:DE\s+)?(?:ACRILIC|PVC|SOLTIS|PLASTIFICAD|MICROPERFORAD|POLIESTER)/;
// «VENTANA EN PVC» es la ventana de la cortina, no el material de la tela.
const windowPvcExpression = /VENTANAS?\s+(?:EN|DE)\s+PVC[^,.]*/g;
const colorExpression = /COLOR\s+([^,.]+?)(?=[,.]|\s+CON\b|$)/;
const weightExpression = /(\d{2,4})\s*GR[S.]?(?:\s*\/\s*M[²2])?\b/;
const soltisReferenceExpression = /SOLTIS\s*(\d{2,3})/;

export function fabricHintFromText(text) {
  const normalized = stripAccents(String(text || '')).toUpperCase().replace(windowPvcExpression, ' ');
  const found = findFabricClause(normalized);
  if (!found) return null;
  const { clause, material, materialIndex } = found;

  // El color se lee después del material: en «ALUMINIO LACADO COLOR BLANCO, CON
  // LONA ACRILICA COLOR AZUL» el blanco es de la estructura.
  const afterMaterial = clause.slice(materialIndex);
  const colorMatch = colorExpression.exec(afterMaterial);
  const color = colorMatch ? colorMatch[1].trim().replace(/\s+/g, ' ') : '';
  const weight = weightExpression.exec(clause)?.[1] || '';
  const reference = material === 'SOLTIS' ? soltisReferenceExpression.exec(clause)?.[1] || '' : '';

  const startMatch = fabricStartExpression.exec(clause);
  const phraseStart = startMatch && startMatch.index <= materialIndex ? startMatch.index : 0;
  const phraseEnd = colorMatch ? materialIndex + colorMatch.index + colorMatch[0].length : clause.length;
  const phrase = clause
    .slice(phraseStart, phraseEnd)
    .replace(/,(?=[^\s\d])/g, ', ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();

  const materialToken = [material, reference].filter(Boolean).join(' ');
  const query = [materialToken, weight, color].filter(Boolean).join(' ');
  return { material, color, weight, reference, query, queries: fabricQueries(material, materialToken, weight, color), phrase };
}

// Primero cada frase «FABRICADO EN …» que nombre un material de tela; si no hay
// ninguna, la que empieza en «LONA/TEJIDO + material».
function findFabricClause(normalized) {
  for (const match of normalized.matchAll(fabricClauseExpression)) {
    const clause = match[1];
    const found = detectMaterial(clause);
    if (found) return { clause, ...found };
  }
  const start = fabricStartExpression.exec(normalized);
  if (!start) return null;
  const rest = normalized.slice(start.index);
  const endMatch = /\.(?!\d)/.exec(rest);
  const clause = endMatch ? rest.slice(0, endMatch.index) : rest;
  const found = detectMaterial(clause);
  return found ? { clause, ...found } : null;
}

function detectMaterial(clause) {
  for (const [material, pattern] of materialPatterns) {
    const match = pattern.exec(clause);
    if (match) return { material, materialIndex: match.index };
  }
  return null;
}

// Búsquedas de más a menos concreta, por si el catálogo no tiene la primera:
// material + peso + color → material + color → material + primera palabra del
// color. Con referencia Soltis, al final se prueba también sin ella.
function fabricQueries(material, materialToken, weight, color) {
  const firstColorWord = color.split(' ')[0] || '';
  const candidates = [
    [materialToken, weight, color],
    [materialToken, color],
    [materialToken, firstColorWord],
    [material, color]
  ].map((parts) => parts.filter(Boolean).join(' '));
  return [...new Set(candidates.filter(Boolean))];
}

// Agrupa los toldos sin tela por la misma pista, de modo que a cada frase
// distinta de RPS le corresponda un único bloque de propuestas.
export function groupFabricHints(awnings = [], textsById = new Map()) {
  const groups = new Map();
  const order = [];
  for (const awning of awnings) {
    if (awning?.fabric) continue;
    const text = textsById.get(awning?.id) || '';
    const hint = fabricHintFromText(text);
    if (!hint || !hint.query) continue;
    if (!groups.has(hint.query)) {
      groups.set(hint.query, { awningIds: [], query: hint.query, queries: hint.queries, phrase: hint.phrase });
      order.push(hint.query);
    }
    groups.get(hint.query).awningIds.push(awning.id);
  }
  return order.map((query) => groups.get(query));
}

// `search(query, limit)` es la búsqueda inyectada: en el servidor es
// `searchRpsFabrics`, con `searchStaticFabrics` como reserva si RPS falla. Los
// grupos se buscan a la vez; cada uno prueba sus búsquedas en orden hasta que
// una devuelve algo. Un grupo que se queda sin opciones se devuelve igual, con
// `options: []`: el cliente enseña «sin coincidencias en el catálogo».
export async function buildFabricProposals(awnings, textsById, { search, limit = 5 } = {}) {
  const groups = groupFabricHints(awnings, textsById);
  return Promise.all(groups.map(async (group) => {
    let fabrics = [];
    for (const query of group.queries || [group.query]) {
      fabrics = (await search(query, limit)) || [];
      if (fabrics.length > 0) break;
    }
    const options = fabrics.map((fabric) => {
      const selection = serializeFabricSelection(fabric);
      return { selection, label: fabricSelectionLabel(selection) };
    });
    return { awningIds: group.awningIds, phrase: group.phrase, options };
  }));
}

// Añade las propuestas de tela a la respuesta del autorrelleno. Si falla, el
// pedido se devuelve igual, sin propuestas. Quita los campos internos que solo
// sirven para calcularlas. «tela: elige entre las propuestas» solo se añade al
// resumen si algún grupo tiene opciones que elegir.
export async function attachFabricProposals(result, { search, limit } = {}) {
  const awnings = result?.order?.awnings || [];
  const textsById = new Map(awnings.map((awning) => [awning.id, awning._sourceText || '']));
  let fabricProposals = [];
  try {
    fabricProposals = await buildFabricProposals(awnings, textsById, { search, limit });
  } catch (error) {
    console.error('No se pudieron calcular las propuestas de tela:', error?.message || error);
    fabricProposals = [];
  }
  // `_sourceText` solo sirve para calcular las propuestas: no forma parte del pedido.
  awnings.forEach((awning) => { delete awning._sourceText; });
  if (fabricProposals.length > 0) result.fabricProposals = fabricProposals;
  if (fabricProposals.some((proposal) => proposal.options.length > 0)) {
    result.summary = [...(result.summary || []), 'tela: elige entre las propuestas'];
  }
  return result;
}

function stripAccents(value) {
  return String(value || '').normalize('NFD').replace(/[̀-ͯ]/g, '');
}
