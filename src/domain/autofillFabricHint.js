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
//
// La opción más probable va primera y se devuelve en `preselected` para dejarla
// puesta (informe tela-0930): la lona más usada antes con la misma pista
// (`preferredCode(query)`, el historial de RPS) y, si no hay historial, la 1.ª del
// buscador. Si la del historial no salió en la búsqueda, se pide con
// `findFabric(code)` y se añade delante. Los sobrantes «RESTO…» nunca se proponen.
export async function buildFabricProposals(awnings, textsById, { search, limit = 5, preferredCode = null, findFabric = null } = {}) {
  const groups = groupFabricHints(awnings, textsById);
  return Promise.all(groups.map(async (group) => {
    let fabrics = [];
    for (const query of group.queries || [group.query]) {
      // Se piden unas pocas de más por si hay que quitar sobrantes.
      fabrics = ((await search(query, limit + 3)) || []).filter((fabric) => !isLeftover(fabric?.description));
      if (fabrics.length > 0) break;
    }
    const preferred = await historyFabric(group.query, fabrics, { preferredCode, findFabric });
    if (preferred) fabrics = [preferred, ...fabrics.filter((fabric) => fabric.code !== preferred.code)];
    const options = fabrics.slice(0, limit).map((fabric) => {
      const selection = serializeFabricSelection(fabric);
      return { selection, label: fabricSelectionLabel(selection) };
    });
    const proposal = { awningIds: group.awningIds, phrase: group.phrase, options };
    if (options[0]) proposal.preselected = options[0].selection;
    return proposal;
  }));
}

// La lona del historial para esa pista, si sigue en el catálogo. Si el historial
// falla, se sigue sin él: la propuesta vuelve a ser la 1.ª del buscador.
async function historyFabric(query, fabrics, { preferredCode, findFabric }) {
  if (!preferredCode) return null;
  try {
    const code = await preferredCode(query);
    if (!code) return null;
    const found = fabrics.find((fabric) => String(fabric.code).toUpperCase() === code);
    if (found) return found;
    const fabric = findFabric ? await findFabric(code) : null;
    return fabric && !isLeftover(fabric.description) ? fabric : null;
  } catch (error) {
    console.error('No se pudo consultar el historial de telas:', error?.message || error);
    return null;
  }
}

// Deja puesta en el pedido la tela propuesta de cada grupo (informe tela-0930):
// - Si, junto con las telas que ya traen las OF, todas son la misma: tela común.
//   También cuando hay elementos sin frase: el pedido con varias telas es la excepción.
// - Si hay dos o más distintas: «Por toldo», cada elemento con la suya; los que no
//   tienen ni OF ni propuesta se quedan vacíos para que salga su FALTA.
// Nunca pisa la tela de un elemento que ya la trae de la OF (esos no tienen propuesta).
export function applyPreselectedFabrics(order, proposals = []) {
  const preselected = proposals.filter((proposal) => proposal?.preselected);
  if (!order || preselected.length === 0) return order;
  const awnings = order.awnings || [];
  const byId = new Map(awnings.map((awning) => [awning.id, awning]));
  for (const proposal of preselected) {
    for (const id of proposal.awningIds) {
      const awning = byId.get(id);
      if (awning && !awning.fabric) awning.fabric = proposal.preselected;
    }
  }
  const fabrics = [...new Set(awnings.map((awning) => awning.fabric).filter(Boolean))];
  if (fabrics.length === 1) {
    order.sameFabric = true;
    order.fabric = fabrics[0];
  } else {
    order.sameFabric = false;
    order.fabric = '';
  }
  return order;
}

// Añade las propuestas de tela a la respuesta del autorrelleno y deja puesta la más
// probable de cada grupo. Si falla, el pedido se devuelve igual, sin propuestas.
// Quita los campos internos que solo sirven para calcularlas. El resumen dice qué
// tela se ha puesto y que hay que comprobarla.
export async function attachFabricProposals(result, { search, limit, preferredCode, findFabric } = {}) {
  const awnings = result?.order?.awnings || [];
  const textsById = new Map(awnings.map((awning) => [awning.id, awning._sourceText || '']));
  let fabricProposals = [];
  try {
    fabricProposals = await buildFabricProposals(awnings, textsById, { search, limit, preferredCode, findFabric });
  } catch (error) {
    console.error('No se pudieron calcular las propuestas de tela:', error?.message || error);
    fabricProposals = [];
  }
  // `_sourceText` solo sirve para calcular las propuestas: no forma parte del pedido.
  awnings.forEach((awning) => { delete awning._sourceText; });
  if (fabricProposals.length > 0) result.fabricProposals = fabricProposals;
  applyPreselectedFabrics(result?.order, fabricProposals);
  const placed = [...new Set(fabricProposals.map((proposal) => proposal.preselected).filter(Boolean))];
  if (placed.length > 0) {
    result.summary = [...(result.summary || []), `tela: puesta ${placed.map((selection) => fabricSelectionLabel(selection)).join(' / ')}, compruébala`];
  }
  return result;
}

// Los artículos «RESTO…» son sobrantes: ni se aprenden ni se proponen.
export function isLeftover(description) {
  return /^\s*RESTO/i.test(String(description || ''));
}

function stripAccents(value) {
  return String(value || '').normalize('NFD').replace(/[̀-ͯ]/g, '');
}
