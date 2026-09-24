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

const fabricClauseExpression = /FABRICAD[OA]S?\s+EN\s+([\s\S]*?)(?:\.|$)/i;
const colorExpression = /COLOR\s+([^,.]+?)(?=[,.]|\s+CON\b|$)/i;
const weightExpression = /(\d{2,4})\s*GR\s*\/?\s*M[²2]/i;

export function fabricHintFromText(text) {
  const raw = String(text || '');
  const clauseMatch = fabricClauseExpression.exec(raw);
  if (!clauseMatch) return null;
  const clause = clauseMatch[1];
  const clauseNormalized = stripAccents(clause).toUpperCase();

  const material = materialPatterns.find(([, pattern]) => pattern.test(clauseNormalized))?.[0] || '';
  if (!material) return null;

  const colorMatch = colorExpression.exec(clause);
  const color = colorMatch ? stripAccents(colorMatch[1]).toUpperCase().trim().replace(/\s+/g, ' ') : '';
  const weightMatch = weightExpression.exec(clause);
  const weight = weightMatch ? weightMatch[1] : '';

  const phraseEnd = colorMatch ? colorMatch.index + colorMatch[0].length : clause.length;
  const phrase = clause
    .slice(0, phraseEnd)
    .replace(/,(?=\S)/g, ', ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();

  const query = [material, weight, color].filter(Boolean).join(' ');
  return { material, color, weight, query, phrase };
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
      groups.set(hint.query, { awningIds: [], query: hint.query, phrase: hint.phrase });
      order.push(hint.query);
    }
    groups.get(hint.query).awningIds.push(awning.id);
  }
  return order.map((query) => groups.get(query));
}

// `search(query, limit)` es la búsqueda inyectada: en el servidor es
// `searchRpsFabrics`, con `searchStaticFabrics` como reserva si RPS falla.
export async function buildFabricProposals(awnings, textsById, { search, limit = 5 } = {}) {
  const groups = groupFabricHints(awnings, textsById);
  const proposals = [];
  for (const group of groups) {
    const fabrics = (await search(group.query, limit)) || [];
    const options = fabrics.map((fabric) => {
      const selection = serializeFabricSelection(fabric);
      return { selection, label: fabricSelectionLabel(selection) };
    });
    proposals.push({ awningIds: group.awningIds, phrase: group.phrase, options });
  }
  return proposals;
}

function stripAccents(value) {
  return String(value || '').normalize('NFD').replace(/[̀-ͯ]/g, '');
}
