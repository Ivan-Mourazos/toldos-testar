import fabrics from './data/fabrics.json' with { type: 'json' };

const fabricsByName = new Map();
const fabricsByCode = new Map();
for (const fabric of fabrics) {
  const key = normalize(fabric.description);
  if (!fabricsByName.has(key)) fabricsByName.set(key, fabric);
  if (!fabricsByCode.has(normalize(fabric.code))) fabricsByCode.set(normalize(fabric.code), fabric);
}

export function resolveFabric(selection) {
  const encoded = parseFabricSelection(selection);
  if (encoded) return encoded;

  const key = normalize(selection);
  if (!key) return null;
  return fabricsByCode.get(key) || fabricsByName.get(key) || null;
}

export function serializeFabricSelection(fabric) {
  if (!fabric?.code) return '';
  return [fabric.code, Number(fabric.width) || inferRollWidth(fabric.code), fabric.description || fabric.code].join('|||');
}

export function parseFabricSelection(value) {
  const parts = String(value || '').split('|||');
  if (parts.length !== 3 || !parts[0]) return null;
  return {
    code: parts[0].trim().toUpperCase(),
    width: Number(parts[1]) || inferRollWidth(parts[0]),
    description: parts[2].trim() || parts[0].trim().toUpperCase(),
    material: '',
    color: ''
  };
}

export function fabricSelectionLabel(value) {
  const fabric = resolveFabric(value);
  return fabric ? `${fabric.code} · ${fabric.description}` : String(value || '');
}

export function searchStaticFabrics(query = '', limit = 25) {
  const tokens = normalize(query).split(' ').filter(Boolean);
  return fabrics
    .filter((fabric) => {
      const text = normalize(`${fabric.code} ${fabric.description}`);
      return tokens.every((token) => text.includes(token));
    })
    .slice(0, Math.max(1, Math.min(Number(limit) || 25, 100)));
}

function inferRollWidth(code) {
  const match = /P(\d{2,3})$/i.exec(String(code || '').trim());
  return match ? Number(match[1]) : 120;
}

function normalize(value) {
  return String(value || '').trim().toUpperCase().replace(/\s+/g, ' ');
}
