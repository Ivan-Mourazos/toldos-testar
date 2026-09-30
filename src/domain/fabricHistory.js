import { fabricHintFromText, isLeftover } from './autofillFabricHint.js';

// Historial de la frase de tela (informe tmp/tela-0930, sección a): para cada pista
// que sale del texto de una línea de RPS («ACR NEGRO», «ACR VERDE BOTELLA»…), qué
// lonas llevaron de verdad las OF de esas líneas. Medido sobre 281 elementos reales,
// proponer la más usada con la misma pista acierta el 96 %, frente al 89 % de la 1.ª
// opción del buscador (que, por ejemplo, nunca da ACRILI2245 para «verde botella»,
// porque su descripción no dice «VERDE»).
//
// `rows`: una fila por material de lona de OF, con el texto de su línea de pedido
// (`comment` y `notes`, los mismos que lee el autorrelleno), `code`, `description` y
// `quantity`. Devuelve Map(pista → Map(código → nº de OF)).
export function buildFabricHistory(rows = []) {
  const byOf = new Map();
  for (const row of rows) {
    const code = String(row?.code || '').trim().toUpperCase();
    if (!code || isLeftover(row?.description)) continue;
    const of = String(row?.of || '').trim();
    if (!of) continue;
    const quantity = Number(row?.quantity) || 0;
    const current = byOf.get(of);
    // Una OF cuenta una vez, con su lona principal: la de más metros (la otra suele
    // ser la de la bamba).
    if (!current || quantity > current.quantity) {
      byOf.set(of, { code, quantity, text: [row?.comment, row?.notes].filter(Boolean).join('\n') });
    }
  }

  const history = new Map();
  for (const { code, text } of byOf.values()) {
    const query = fabricHintFromText(text)?.query;
    if (!query) continue;
    const counts = history.get(query) || new Map();
    counts.set(code, (counts.get(code) || 0) + 1);
    history.set(query, counts);
  }
  return history;
}

// La lona más usada con esa pista; a igualdad, la de código menor. null si no hay.
export function preferredFabricCode(history, query) {
  const counts = history?.get(query);
  if (!counts || counts.size === 0) return null;
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0][0];
}

