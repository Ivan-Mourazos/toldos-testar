import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const fabrics = JSON.parse(fs.readFileSync(path.join(__dirname, 'data', 'fabrics.json'), 'utf8'));

const fabricsByName = new Map();
for (const fabric of fabrics) {
  const key = normalize(fabric.description);
  if (!fabricsByName.has(key)) fabricsByName.set(key, fabric);
}

export function resolveFabric(name) {
  const key = normalize(name);
  if (!key) return null;
  return fabricsByName.get(key) || null;
}

function normalize(value) {
  return String(value || '').trim().toUpperCase().replace(/\s+/g, ' ');
}
