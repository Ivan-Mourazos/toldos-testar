import fabrics from './data/fabrics.json' with { type: 'json' };
import { rankFabricMatches } from './fabricSearch.js';

const fabricsByName = new Map();
const fabricsByCode = new Map();
for (const fabric of fabrics) {
  const key = normalize(fabric.description);
  if (!fabricsByName.has(key)) fabricsByName.set(key, fabric);
  if (!fabricsByCode.has(normalize(fabric.code))) fabricsByCode.set(normalize(fabric.code), fabric);
}

export function resolveFabric(selection) {
  const encoded = parseFabricSelection(selection);
  if (encoded) {
    const catalogFabric = fabricsByCode.get(normalize(encoded.code));
    // La selección codificada no lleva color y trae `material` sólo a veces, así
    // que sus vacíos no deben pisar lo que sí sabe el catálogo. `description`
    // sigue viniendo de la selección: es la que viaja a RPS en la reserva.
    return catalogFabric
      ? {
        ...catalogFabric,
        ...encoded,
        material: encoded.material || catalogFabric.material || '',
        color: encoded.color || catalogFabric.color || ''
      }
      : encoded;
  }

  const key = normalize(selection);
  if (!key) return null;
  return fabricsByCode.get(key) || fabricsByName.get(key) || null;
}

export function serializeFabricSelection(fabric) {
  if (!fabric?.code) return '';
  return [
    fabric.code,
    Number(fabric.width) || inferRollWidth(fabric.code),
    fabric.description || fabric.code,
    fabric.material || fabric.subfamily || ''
  ].join('|||');
}

export function parseFabricSelection(value) {
  const parts = String(value || '').split('|||');
  if (parts.length < 3 || !parts[0]) return null;
  return {
    code: parts[0].trim().toUpperCase(),
    width: Number(parts[1]) || inferRollWidth(parts[0]),
    description: parts[2].trim() || parts[0].trim().toUpperCase(),
    material: parts[3]?.trim() || '',
    color: ''
  };
}

// El campo del formulario no parte el texto, así que la descripción larga de RPS
// se corta justo donde va el color. Material y color son lo que se quiere leer de
// un vistazo, y entran enteros. Sin catálogo detrás no hay más remedio que la
// descripción.
// El nombre corto sale SIEMPRE del catálogo, nunca del objeto ya fusionado por
// resolveFabric: ese objeto puede traer en `material` la subfamilia de RPS (que
// no distingue material de color), y dejarla competir con el material real del
// catálogo puede acabar mostrando la subfamilia sola y perdiendo el color.
export function fabricSelectionLabel(value) {
  const fabric = resolveFabric(value);
  if (!fabric) return String(value || '');
  const catalogFabric = fabricsByCode.get(normalize(fabric.code));
  const shortName = catalogFabric ? [catalogFabric.material, catalogFabric.color].filter(Boolean).join(' ') : '';
  return `${fabric.code} · ${shortName || fabric.description}`;
}

export function searchStaticFabrics(query = '', limit = 25) {
  return rankFabricMatches(fabrics, query, limit);
}

function inferRollWidth(code) {
  const match = /P(\d{2,3})$/i.exec(String(code || '').trim());
  return match ? Number(match[1]) : 120;
}

function normalize(value) {
  return String(value || '').trim().toUpperCase().replace(/\s+/g, ' ');
}
