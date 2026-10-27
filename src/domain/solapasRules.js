import { formatVelcroLabel } from './curtainConfiguration.js';
import { resolveFabric } from './fabricCatalog.js';
import { formatNumber } from './math.js';
import { colocar } from './corteLona/colocacion.js';
import { piezasSolapas } from './corteLona/solapas.js';

/**
 * @returns {import('../client/types').SolapaItem}
 */
export function createDefaultSolapa(index = 0, patch = {}) {
  return normalizeSolapaItem(patch, index);
}

/**
 * @returns {import('../client/types').SolapaItem}
 */
export function normalizeSolapaItem(item = {}, index = 0, awningBastilla = false) {
  const oblicua = Boolean(item?.oblicua);
  const largo = finitePositiveOrNull(item?.largo ?? item?.largoCm);
  const ancho = finitePositiveOrNull(item?.ancho ?? item?.anchoCm ?? item?.anchoIzqCm ?? item?.anchoIzq);
  const ancho2 = oblicua ? finitePositiveOrNull(item?.ancho2 ?? item?.anchoDerCm ?? item?.anchoDer) : ancho;
  const velcroTipo = String(item?.velcroTipo ?? item?.velcroIzq?.tipo ?? '').trim().toUpperCase() === 'SUAVE' ? 'SUAVE' : 'BRAVO';
  const velcroLado = normalizeVelcroSide(item?.velcroLado ?? item?.velcroIzq?.lado, 'POR REVÉS');
  const velcroColor = String(item?.velcroColor ?? item?.velcroIzq?.color ?? '').trim().toUpperCase() === 'NEGRO' ? 'NEGRO' : 'BLANCO';
  const velcroAncho = finitePositiveOrNull(item?.velcroAncho ?? item?.velcroIzq?.anchoCm) ?? 5;
  const raw2Tipo = item?.velcro2Tipo ?? item?.velcroDer?.tipo;
  const velcro2Tipo = raw2Tipo
    ? String(raw2Tipo).trim().toUpperCase() === 'SUAVE' ? 'SUAVE' : 'BRAVO'
    : velcroTipo;
  const raw2Lado = item?.velcro2Lado ?? item?.velcroDer?.lado;
  const velcro2Lado = raw2Lado ? normalizeVelcroSide(raw2Lado, velcroLado) : velcroLado;
  const raw2Color = item?.velcro2Color ?? item?.velcroDer?.color;
  const velcro2Color = raw2Color
    ? String(raw2Color).trim().toUpperCase() === 'NEGRO' ? 'NEGRO' : 'BLANCO'
    : velcroColor;
  const velcro2Ancho = finitePositiveOrNull(item?.velcro2Ancho ?? item?.velcroDer?.anchoCm) ?? velcroAncho;
  const velcroDerDistinto = typeof item?.velcroDerDistinto === 'boolean'
    ? item.velcroDerDistinto
    : (velcro2Tipo !== velcroTipo || velcro2Lado !== velcroLado || velcro2Color !== velcroColor || velcro2Ancho !== velcroAncho);
  return {
    nombre: String(item?.nombre || '').trim().toUpperCase() || solapaLetter(index),
    largo,
    ancho,
    oblicua,
    ancho2,
    anchoIzq: oblicua && ancho != null && ancho2 != null ? Math.max(ancho, ancho2) : ancho,
    anchoDer: oblicua && ancho != null && ancho2 != null ? Math.min(ancho, ancho2) : (oblicua ? ancho2 : ancho),
    bastilla: Boolean(item?.bastilla || awningBastilla),
    velcroTipo,
    velcroLado,
    velcroColor,
    velcroAncho,
    velcro2Tipo: velcroDerDistinto ? velcro2Tipo : velcroTipo,
    velcro2Lado: velcroDerDistinto ? velcro2Lado : velcroLado,
    velcro2Color: velcroDerDistinto ? velcro2Color : velcroColor,
    velcro2Ancho: velcroDerDistinto ? velcro2Ancho : velcroAncho,
    velcroDerDistinto
  };
}

/**
 * @returns {import('../client/types').SolapaItem[]}
 */
export function normalizeSolapas(solapas, awningBastilla = false) {
  if (!Array.isArray(solapas) || solapas.length === 0) return [normalizeSolapaItem({}, 0, awningBastilla)];
  return solapas.map((item, index) => normalizeSolapaItem(item, index, awningBastilla));
}

export function formatSolapaVelcroLabels(solapa = {}, alCorteOverride = undefined) {
  const s = normalizeSolapaItem(solapa, 0);
  const alCorte = typeof alCorteOverride === 'boolean' ? alCorteOverride : !s.bastilla;
  const izquierda = formatVelcroLabel({ tipo: s.velcroTipo, ancho: s.velcroAncho, color: s.velcroColor, lado: s.velcroLado, alCorte });
  const derecha = formatVelcroLabel({ tipo: s.velcro2Tipo, ancho: s.velcro2Ancho, color: s.velcro2Color, lado: s.velcro2Lado, alCorte });
  return [izquierda, derecha];
}

export function solapaCompletenessIssues(awning = {}) {
  const solapas = Array.isArray(awning.solapas) ? awning.solapas : [];
  if (!solapas.length) return [{ field: 'solapas', label: 'solapas' }];
  const missing = [];
  solapas.forEach((raw, i) => {
    const s = normalizeSolapaItem(raw, i);
    const letra = s.nombre || solapaLetter(i);
    if (!(Number(s.largo) > 0)) missing.push({ field: `solapa_${i}_largo`, label: `Solapa ${letra} · largo (cm)` });
    if (!(Number(s.ancho) > 0)) missing.push({ field: `solapa_${i}_ancho`, label: s.oblicua ? `Solapa ${letra} · ancho punta 1 (cm)` : `Solapa ${letra} · ancho (cm)` });
    if (s.oblicua && !(Number(s.ancho2) > 0)) missing.push({ field: `solapa_${i}_ancho2`, label: `Solapa ${letra} · ancho punta 2 (cm)` });
  });
  return missing;
}

export function calculateSolapas({ order, awning }) {
  const fabricSelection = order.sameFabric !== false ? order.fabric : awning.fabric;
  const fabric = resolveFabric(fabricSelection);
  const rollWidth = fabric?.width || 250;
  const solapas = normalizeSolapas(awning.solapas, awning.bastilla);
  const units = Math.max(1, Number(awning.units) || 1);
  const diagnostics = [];

  if (!fabric) {
    diagnostics.push({
      level: 'error',
      awningId: awning.id,
      message: fabricSelection ? `Tela no encontrada en el catálogo: "${fabricSelection}".` : `Falta indicar la tela en SOLAPAS, OF ${awning.of}.`
    });
  }

  const incomplete = solapas.filter((s) => !(Number(s.largo) > 0) || !(Number(s.ancho) > 0) || (s.oblicua && !(Number(s.ancho2) > 0)));
  if (incomplete.length > 0) {
    diagnostics.push({
      level: 'error',
      awningId: awning.id,
      message: `SOLAPAS incompleto en OF ${awning.of}: indica largo y ancho de cada solapa.`
    });
  }

  const conBastilla = Boolean(awning.bastilla) || solapas.some((s) => s.bastilla);
  if (conBastilla) {
    diagnostics.push({
      level: 'warn',
      awningId: awning.id,
      message: `Solapa con bastilla en OF ${awning.of}: pendiente de Oficina Técnica.`
    });
  }

  let placedMl = 0;
  let totalPieces = 0;
  let cutError = '';
  if (incomplete.length === 0 && !conBastilla) {
    try {
      const piezas = piezasSolapas({ solapas, anchoRollo: rollWidth });
      const todas = Array.from({ length: units }, () => piezas.map((q) => ({ ...q }))).flat();
      const colocadas = colocar(todas, rollWidth * 10);
      const largoMm = Math.max(0, ...colocadas.map((p) => p.x + p.ancho));
      placedMl = round2(largoMm / 1000);
      totalPieces = piezas.length;
    } catch (error) {
      cutError = error.message;
      diagnostics.push({ level: 'error', awningId: awning.id, message: cutError });
    }
  } else if (incomplete.length === 0 && conBastilla) {
    // Con bastilla queda pendiente de Oficina Técnica: se estima el ancho total para no bloquear la vista,
    // pero el corte queda bloqueado en motivoCorteManual.
    const sumWidth = solapas.reduce((acc, s) => acc + Math.max(s.ancho || 0, s.oblicua ? s.ancho2 || 0 : 0), 0);
    const maxLargo = Math.max(0, ...solapas.map((s) => s.largo || 0));
    placedMl = round2(((sumWidth <= rollWidth ? maxLargo : sumWidth) / 100) * units);
    totalPieces = solapas.length;
  }

  const valid = Boolean(fabric) && incomplete.length === 0 && !cutError && placedMl > 0;
  if (valid) {
    diagnostics.push({
      level: 'warn',
      awningId: awning.id,
      message: `OF ${awning.of}: velcro sin reserva automática.`
    });
  }

  const fabricWidth = round1(solapas.reduce((acc, s) => acc + Math.max(s.ancho || 0, s.oblicua ? s.ancho2 || 0 : 0), 0));
  const fabricDrop = round1(Math.max(0, ...solapas.map((s) => s.largo || 0)));
  const calculation = {
    model: 'SOLAPAS',
    valid,
    minimumLine: 0,
    width: fabricWidth,
    projection: fabricDrop,
    fabricWidth,
    fabricDrop,
    fabricMl: placedMl,
    fabricPanels: totalPieces,
    totalFabricMl: placedMl,
    fabricCode: fabric?.code || '',
    fabricDescription: fabric?.description || '',
    fabricRollWidth: rollWidth,
    mainFabricMl: placedMl,
    mainFabricPanels: totalPieces,
    valanceFabricCode: '',
    valanceFabricDescription: '',
    valanceFabricWidth: 0,
    valanceFabricMl: 0,
    valanceFabricPanels: 0,
    valanceDrop: 0,
    structureLength: 0,
    stockLength: 0,
    solapasCount: solapas.length
  };

  return {
    of: awning.of,
    description: `SOLAPAS (${solapas.length}) · ${formatNumber(placedMl)} ml`,
    materials: valid ? [{ code: fabric.code, quantity: placedMl, description: fabric.description }] : [],
    despiece: null,
    diagnostics,
    calculation
  };
}

function normalizeVelcroSide(value, fallback = 'POR REVÉS') {
  const v = String(value || '').trim().toUpperCase().replace('REVES', 'REVÉS');
  if (v.includes('DERECHO') || v.includes('DEREITO')) return 'POR DERECHO';
  if (v.includes('REVÉS')) return 'POR REVÉS';
  return fallback;
}

function finitePositiveOrNull(value) {
  if (value == null || value === '') return null;
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : null;
}

export function solapaLetter(index) {
  let n = index + 1;
  let out = '';
  while (n > 0) {
    n -= 1;
    out = String.fromCharCode(65 + (n % 26)) + out;
    n = Math.floor(n / 26);
  }
  return out;
}

function round1(value) { return Math.round((Number(value) + Number.EPSILON) * 10) / 10; }
function round2(value) { return Math.round((Number(value) + Number.EPSILON) * 100) / 100; }
