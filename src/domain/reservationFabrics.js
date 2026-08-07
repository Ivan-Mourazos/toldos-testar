import { resolveFabric } from './fabricCatalog.js';

export function roundFabricMeters(value) {
  const quantity = Number(value);
  if (!Number.isFinite(quantity) || quantity <= 0) return quantity;
  return Math.ceil((quantity * 2) - 1e-9) / 2;
}

export function collectFabricMaterialKeys(ofs = []) {
  const keys = new Set();

  for (const ofBlock of ofs) {
    const of = normalize(ofBlock?.of);
    const calculation = ofBlock?.calculation || {};
    const calculationCodes = new Set([
      calculation.fabricCode,
      calculation.valanceFabricCode
    ].map(normalize).filter(Boolean));

    for (const line of ofBlock?.materials || []) {
      const code = normalize(line?.code);
      if (!code) continue;
      if (calculationCodes.has(code) || resolveFabric(code)) keys.add(materialKey(of, code));
    }
  }

  return keys;
}

export function findNonAcrylicReservationFabrics(order, calculation) {
  const found = new Map();

  for (const ofBlock of calculation?.ofs || []) {
    const awning = findAwning(order?.awnings || [], ofBlock);
    if (!awning) continue;

    const primarySelection = order?.sameFabric !== false ? order?.fabric : awning.fabric;
    addNonAcrylic(found, {
      selection: primarySelection,
      code: ofBlock.calculation?.fabricCode,
      description: ofBlock.calculation?.fabricDescription,
      of: ofBlock.of
    });

    if (ofBlock.calculation?.valanceFabricCode) {
      addNonAcrylic(found, {
        selection: awning.valanceFabric,
        code: ofBlock.calculation.valanceFabricCode,
        description: ofBlock.calculation.valanceFabricDescription,
        of: ofBlock.of
      });
    }
  }

  return Array.from(found.values()).map((item) => ({
    ...item,
    ofs: Array.from(item.ofs)
  }));
}

export function excludeFabricCodes(reservation, fabrics = []) {
  const excludedCodes = new Set(fabrics.map((fabric) => normalize(fabric.code)).filter(Boolean));
  if (excludedCodes.size === 0) return reservation;

  return {
    ...reservation,
    ofs: reservation.ofs.map((ofBlock) => ({
      ...ofBlock,
      materials: ofBlock.materials.filter((line) => !excludedCodes.has(normalize(line.code)))
    })).filter((ofBlock) => ofBlock.materials.length > 0)
  };
}

function addNonAcrylic(found, { selection, code, description, of }) {
  const fabric = resolveFabric(selection || code);
  if (!fabric || isAcrylic(fabric)) return;

  const normalizedCode = normalize(code || fabric.code);
  if (!normalizedCode) return;
  const current = found.get(normalizedCode) || {
    code: normalizedCode,
    description: description || fabric.description || normalizedCode,
    material: fabric.material || '',
    ofs: new Set()
  };
  if (of) current.ofs.add(String(of).trim());
  found.set(normalizedCode, current);
}

function isAcrylic(fabric) {
  const material = normalize(fabric?.material);
  if (material) return material.startsWith('ACR') || material.includes('ACRIL');
  const text = normalize(`${fabric?.code || ''} ${fabric?.description || ''}`);
  return text.includes('ACRIL');
}

function findAwning(awnings, ofBlock) {
  return awnings.find((awning) => awning.id && awning.id === ofBlock.awningId)
    || (Number.isInteger(ofBlock.awningIndex) ? awnings[ofBlock.awningIndex] : null)
    || awnings.find((awning) => normalize(awning.of) === normalize(ofBlock.of));
}

function materialKey(of, code) {
  return `${normalize(of)}||${normalize(code)}`;
}

function normalize(value) {
  return String(value || '').trim().toUpperCase();
}
