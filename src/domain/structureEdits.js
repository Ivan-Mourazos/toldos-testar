const text = (value) => String(value ?? '').trim();
const code = (value) => text(value).toUpperCase();
const round = (value) => Math.round(value * 1000000) / 1000000;

export function normalizeStructureEdit(input) {
  if (!input || typeof input !== 'object') return null;
  if (!Array.isArray(input.rows) || input.rows.length > 100) throw new Error('El despiece admite hasta 100 líneas.');
  return {
    signature: text(input.signature),
    rows: input.rows.map((row) => ({
      id: text(row.id), num: Number(row.num), name: text(row.name),
      reference: code(row.reference) || null, units: Number(row.units),
      length: row.length === null || row.length === undefined || row.length === '' ? null : Number(row.length),
      reservationQuantity: Number(row.reservationQuantity), unitCode: text(row.unitCode),
      kind: row.kind === 'anchoring' ? 'anchoring' : 'piece'
    }))
  };
}

export function applyStructureEdit(awning, result) {
  if (!result.despiece || !result.calculation?.valid) return result;
  const materials = result.materials || [];
  const rawRows = result.despiece.rows.map((row, index) => ({ ...row, id: 'piece:' + row.num + ':' + index, kind: 'piece' }));
  if (result.despiece.anchoring) rawRows.push({ ...result.despiece.anchoring, id: 'anchoring', num: 0, length: null, kind: 'anchoring' });
  const baseRows = rawRows.map((row) => {
    const matches = materials.filter((item) => code(item.code) === code(row.reference) && row.reference);
    const totalQuantity = matches.reduce((sum, item) => sum + Number(item.quantity), 0);
    const totalUnits = rawRows.filter((item) => item.reference && code(item.reference) === code(row.reference)).reduce((sum, item) => sum + Number(item.units), 0);
    return { ...row, reservationQuantity: totalUnits ? round(totalQuantity * row.units / totalUnits) : 0, unitCode: '' };
  });
  const signature = JSON.stringify({ model: awning.model, width: awning.width, projection: awning.projection, units: awning.units, rows: baseRows, materials });
  const edit = normalizeStructureEdit(awning.structureEdit);
  const editor = { signature, baseRows, rows: edit?.rows ?? baseRows, modified: Boolean(edit), stale: Boolean(edit && edit.signature !== signature), referencesToCheck: [] };
  const errors = [];
  const changedAnticaArms = awning.model === 'ANTICA' && awning.structureArmCount != null && Number(awning.structureArmCount) !== (Number(awning.width) > 400 ? 3 : 2);
  if (changedAnticaArms && !(editor.rows.find((row) => row.name === 'BRAZO ANTICA' || row.id === baseRows.find((base) => base.name === 'BRAZO ANTICA')?.id)?.reference)) errors.push('Has cambiado el número de brazos. En Editar despiece, selecciona su referencia de RPS e indica la cantidad a reservar.');
  if (!edit) return errors.length ? {
    ...result, structureEditor: editor, materials: [], calculation: { ...result.calculation, valid: false },
    diagnostics: [...(result.diagnostics || []), ...errors.map((message) => ({ level: 'error', awningId: awning.id, message }))]
  } : { ...result, structureEditor: editor };
  if (editor.stale) errors.push('Han cambiado los datos del toldo. Revisa y confirma el despiece editado o restaura el cálculo automático.');
  const ids = new Set();
  const numbers = new Set();
  for (const row of edit.rows) {
    if (!row.id || ids.has(row.id)) errors.push('Hay identificadores de línea duplicados.');
    ids.add(row.id);
    if (!row.name || !Number.isFinite(row.units) || row.units <= 0 || !Number.isFinite(row.reservationQuantity) || row.reservationQuantity < 0 || (row.length !== null && (!Number.isFinite(row.length) || row.length < 0))) errors.push('Completa descripción, unidades y cantidades válidas en cada línea.');
    if (row.kind === 'piece') {
      if (!Number.isInteger(row.num) || row.num < 1 || numbers.has(row.num)) errors.push('La numeración de piezas debe ser positiva y sin duplicados.');
      numbers.add(row.num);
    }
    const original = baseRows.find((item) => item.id === row.id);
    if (!row.reference && (row.reservationQuantity > 0 || !original || row.units !== original.units)) errors.push('Selecciona un artículo de RPS para las piezas añadidas o con cantidad modificada que no tienen referencia.');
    if (row.reference && row.reservationQuantity <= 0 && (!original || row.reference !== original.reference || row.units !== original.units)) errors.push('Indica la cantidad a reservar del artículo seleccionado.');
    if (row.reference && (!original || code(row.reference) !== code(original.reference) || original.reservationQuantity === 0 && row.reservationQuantity > 0)) editor.referencesToCheck.push(row.reference);
  }
  if (edit.rows.filter((row) => row.kind === 'anchoring').length > 1) errors.push('Solo puede haber una línea de anclaje.');
  if (errors.length) return {
    ...result, structureEditor: editor, materials: [],
    calculation: { ...result.calculation, valid: false },
    diagnostics: [...(result.diagnostics || []), ...[...new Set(errors)].map((message) => ({ level: 'error', awningId: awning.id, message: awning.model + ': ' + message }))]
  };
  const linkedCodes = new Set(baseRows.filter((row) => row.reference && row.reservationQuantity > 0).map((row) => code(row.reference)));
  const nextMaterials = materials.filter((item) => !linkedCodes.has(code(item.code))).map((item) => ({ ...item }));
  // Keep material units and aggregation rules; cut length never becomes stock quantity.
  const editedMaterials = new Map();
  for (const row of edit.rows) {
    if (!row.reference || row.reservationQuantity <= 0) continue;
    const ref = code(row.reference);
    const original = materials.find((item) => code(item.code) === ref);
    const entry = editedMaterials.get(ref) || { ...original, code: ref, description: row.name, quantity: 0 };
    entry.quantity = round(entry.quantity + row.reservationQuantity);
    editedMaterials.set(ref, entry);
  }
  nextMaterials.push(...editedMaterials.values());
  const anchor = edit.rows.find((row) => row.kind === 'anchoring');
  return {
    ...result, structureEditor: editor, materials: nextMaterials,
    despiece: { ...result.despiece, rows: edit.rows.filter((row) => row.kind !== 'anchoring'), anchoring: anchor || null }
  };
}

export async function verifyStructureArticles(calculation, findArticle) {
  const codes = [...new Set(calculation.ofs.flatMap((block) => block.structureEditor?.referencesToCheck || []))];
  const resolved = new Map(await Promise.all(codes.map(async (ref) => {
    try { return [ref, await findArticle(ref)]; } catch { return [ref, undefined]; }
  })));
  for (const block of calculation.ofs) {
    for (const ref of block.structureEditor?.referencesToCheck || []) {
      if (resolved.get(ref)) continue;
      calculation.diagnostics.push({ level: 'error', awningId: block.awningId, message: resolved.get(ref) === undefined ? 'No se pudo comprobar en RPS el artículo ' + ref + '. Reintenta antes de producir.' : 'El artículo ' + ref + ' no existe o está inactivo en RPS.' });
      block.calculation.valid = false;
      block.materials = [];
    }
  }
  calculation.totals.materials = calculation.ofs.reduce((sum, block) => sum + block.materials.length, 0);
  return calculation;
}
