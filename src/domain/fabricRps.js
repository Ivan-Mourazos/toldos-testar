// Anchuras en centímetros. Un código genérico, gramos o una unidad de superficie
// no dicen cuánto mide el rollo: en ese caso hay que medirlo o consultar su ficha.
export function inferRollWidth(code, unitCode = '') {
  const codeMatch = /P(\d{2,3})$/i.exec(String(code || '').trim());
  if (codeMatch) return Number(codeMatch[1]);
  const unitMatch = /^ML?(\d{2,3}(?:[.,]\d+)?)$/i.exec(String(unitCode || '').trim());
  return unitMatch ? Number(unitMatch[1].replace(',', '.')) : null;
}

export function inferFabricDetails({ description = '', subfamily = '' }) {
  const text = String(description || '').trim().toUpperCase();
  let material = String(subfamily || '').trim();
  // «PLASTICA (LONA)» decide el corte y los embudos, y eso lo dice solo la subfamilia de RPS: el
  // texto no sirve («SCREEN SIN PVC» no es PVC, y las rejillas de esa subfamilia sí se cortan).
  if (material.toUpperCase() !== 'PLASTICA (LONA)') {
    if (/\bACR[IÍ]LIC[AO]\b/.test(text)) material = /\bRESINAD[OA]\b/.test(text) ? 'ACR RES' : 'ACR';
    else if (/\bSOLTIS\s+(86|92|96|99)\b/.test(text)) material = text.match(/\bSOLTIS\s+(86|92|96|99)\b/)[0];
    else if (/\bCRISTAL\b/.test(text)) material = 'CRISTAL';
    else if (/\bREJILLA\b/.test(text)) material = 'REJILLA';
  }
  // Solo el tramo delimitado para el color. No se intenta partir descripciones
  // libres: sus números pueden ser referencias, gramajes o tratamientos.
  const candidate = text.split(':')[1]?.trim() || '';
  const color = /[A-ZÁÉÍÓÚÑ]/.test(candidate) && !/^(?:P?\d|\d.*(?:AN|CM)|M[012]|IGN|REF\b)/.test(candidate)
    ? candidate.replace(/^COLOR\s+/, '') : '';
  return { material, color };
}
