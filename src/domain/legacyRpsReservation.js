import { resolveFabric } from './fabricCatalog.js';
import { calculateLegacyRpsFabricUsage } from './legacyRpsFabricMath.js';

// Modelos cuya lona pasaba por ESTR.01-04!Q28 en el Excel maestro.
// HERA y ANTICA completo tienen fuentes y reglas propias y quedan fuera.
const legacyRpsModels = new Set([
  'ARZUA PRO',
  'GALICIA',
  'XACOBEO',
  'CORTINA',
  'CUARZO BOX',
  'PERLA BOX',
  'CORAL BOX',
  'AGATA BOX',
  'PUNTO RECTO',
  'MAXISCREEM',
  'MONOBLOCK 350',
  'AMBAR BOX',
  'CAMBIO TELA',
  'CAMBIO CORTINA',
  'CAMBIO ANTICA',
  'ENROLLABLE',
  'BAMBALINA'
]);

export function applyLegacyRpsFabricReservation({ awning, result }) {
  const calculation = result?.calculation;
  const model = String(calculation?.model || awning?.model || '').toUpperCase();
  if (!calculation?.valid || !legacyRpsModels.has(model) || !calculation.fabricCode) return result;

  const mainUsage = calculateLegacyRpsFabricUsage({
    width: calculation.fabricWidth,
    drop: calculation.fabricUsageDrop ?? calculation.fabricDrop,
    units: awning.units,
    rollWidth: calculation.fabricRollWidth || resolveFabric(calculation.fabricCode)?.width || 120
  });
  const valanceFabric = calculation.valanceFabricCode
    ? resolveFabric(awning.valanceFabric || calculation.valanceFabricCode)
    : null;
  const valanceUsage = calculation.valanceFabricCode && Number(calculation.valanceDrop) > 0
    ? calculateLegacyRpsFabricUsage({
      width: calculation.valanceFabricWidth,
      drop: calculation.valanceDrop,
      units: awning.units,
      rollWidth: valanceFabric?.width || 120
    })
    : { panels: 0, ml: 0 };

  const mainCode = normalize(calculation.fabricCode);
  const valanceCode = normalize(calculation.valanceFabricCode);
  const materials = (result.materials || []).map((line) => {
    const code = normalize(line.code);
    const isValance = String(line.description || '').trim().endsWith('· BAMBA');
    if (isValance && valanceCode && code === valanceCode) return { ...line, quantity: valanceUsage.ml };
    if (!isValance && code === mainCode) return { ...line, quantity: mainUsage.ml };
    return line;
  });

  return {
    ...result,
    materials,
    calculation: {
      ...calculation,
      reservedFabricMl: mainUsage.ml,
      reservedFabricPanels: mainUsage.panels,
      reservedValanceFabricMl: valanceUsage.ml,
      reservedValanceFabricPanels: valanceUsage.panels,
      totalReservedFabricMl: round6(mainUsage.ml + valanceUsage.ml)
    }
  };
}

function normalize(value) {
  return String(value || '').trim().toUpperCase();
}

function round6(value) {
  return Math.round((Number(value) + Number.EPSILON) * 1_000_000) / 1_000_000;
}
