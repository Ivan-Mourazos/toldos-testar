const collator = new Intl.Collator('es', { sensitivity: 'base', numeric: true });

export function rankFabricMatches(items = [], query = '', limit = 30) {
  const safeLimit = Math.max(1, Math.min(Number(limit) || 30, 100));
  const normalizedQuery = normalizeSearchText(query);
  if (!normalizedQuery) {
    return items
      .map((item) => ({ item, score: fabricPreferenceScore(item) }))
      .sort(compareRankedFabrics)
      .slice(0, safeLimit)
      .map((entry) => entry.item);
  }

  const tokens = [...new Set(normalizedQuery.split(' ').filter(Boolean))];
  return items
    .map((item) => ({ item, score: scoreFabric(item, normalizedQuery, tokens) }))
    .filter((entry) => Number.isFinite(entry.score))
    .sort(compareRankedFabrics)
    .slice(0, safeLimit)
    .map((entry) => entry.item);
}

export function normalizeSearchText(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ');
}

function scoreFabric(item, query, tokens) {
  const code = normalizeSearchText(item.code);
  const description = normalizeSearchText(item.description);
  const material = normalizeSearchText(`${item.material || ''} ${item.family || ''} ${item.subfamily || ''}`);
  const color = normalizeSearchText(item.color);
  const aliases = materialAliases(`${material} ${description} ${code}`);
  const searchable = `${code} ${description} ${material} ${color} ${Number(item.width) || ''} ${aliases}`.trim();
  const words = [...new Set(searchable.split(' ').filter(Boolean))];
  let score = 0;

  for (const token of tokens) {
    const tokenScore = scoreToken(token, words, searchable);
    if (!Number.isFinite(tokenScore)) return Number.POSITIVE_INFINITY;
    score += tokenScore;
  }

  if (code === query) score -= 40;
  else if (description === query) score -= 36;
  else if (code.startsWith(query)) score -= 22;
  else if (description.startsWith(query)) score -= 18;
  else if (searchable.includes(query)) score -= 10;

  return score + fabricPreferenceScore(item);
}

function fabricPreferenceScore(item) {
  const text = normalizeSearchText(`${item.code || ''} ${item.description || ''} ${item.material || ''} ${item.subfamily || ''}`);
  let score = 0;
  if (/\bACR(?:ILI|ILICA|ILICO)?\b/.test(text) || text.includes('ACRILI')) score -= 0.3;
  if (Number(item.width) === 120) score -= 0.2;
  if (text.includes('MASACRIL')) score -= 0.1;
  return score;
}

function compareRankedFabrics(left, right) {
  return left.score - right.score
    || collator.compare(left.item.description || '', right.item.description || '')
    || Number(left.item.width || 0) - Number(right.item.width || 0)
    || collator.compare(left.item.code || '', right.item.code || '');
}

function scoreToken(token, words, searchable) {
  if (words.includes(token)) return 0;
  if (words.some((word) => word.startsWith(token))) return 2;
  if (token.length >= 4 && words.some((word) => word.length >= 4 && token.startsWith(word) && token.length - word.length <= 2)) return 3;
  if (searchable.includes(token)) return 4;
  if (token.length < 4) return Number.POSITIVE_INFINITY;

  const threshold = token.length <= 5 ? 1 : token.length <= 8 ? 2 : 3;
  let closest = threshold + 1;
  for (const word of words) {
    if (Math.abs(word.length - token.length) > threshold) continue;
    closest = Math.min(closest, levenshteinWithin(token, word, threshold));
    if (closest === 1) break;
  }
  return closest <= threshold ? 7 + closest : Number.POSITIVE_INFINITY;
}

function levenshteinWithin(left, right, maximum) {
  if (left === right) return 0;
  if (Math.abs(left.length - right.length) > maximum) return maximum + 1;
  let previous = Array.from({ length: right.length + 1 }, (_, index) => index);

  for (let row = 1; row <= left.length; row += 1) {
    const current = [row];
    let rowMinimum = current[0];
    for (let column = 1; column <= right.length; column += 1) {
      const substitution = previous[column - 1] + (left[row - 1] === right[column - 1] ? 0 : 1);
      current[column] = Math.min(previous[column] + 1, current[column - 1] + 1, substitution);
      rowMinimum = Math.min(rowMinimum, current[column]);
    }
    if (rowMinimum > maximum) return maximum + 1;
    previous = current;
  }
  return previous[right.length];
}

function materialAliases(text) {
  const aliases = ['LONA'];
  if (/\bACR(?:ILI|ILICA|ILICO)?\b/.test(text)) aliases.push('ACR ACRILICO ACRILICA');
  if (/\bPVC\b|PLASTICA|PLASTICO/.test(text)) aliases.push('PVC PLASTICO PLASTICA');
  if (/\bSOLTIS\b/.test(text)) aliases.push('SOLTIS MICROPERFORADO MICROPERFORADA');
  return aliases.join(' ');
}
