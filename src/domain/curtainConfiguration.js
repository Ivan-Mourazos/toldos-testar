const curtainModels = new Set(['CORTINA', 'CAMBIO CORTINA']);
export const curtainFabricAdjustments = ['NINGUNO', 'TUBO DE CARGA', 'ET', 'PERSONALIZADO'];

export function isConfiguredCurtain(awning = {}) {
  return curtainModels.has(String(awning.model || '').toUpperCase());
}

// Laterales, acabado inferior, referencia de ventana y ajuste de tela son elecciones independientes.
/** @returns {Required<Pick<import('../client/types').Awning, 'curtainBottomFinish' | 'curtainWindowReference' | 'curtainFabricAdjustment' | 'curtainFabricAdjustmentCm'>>} */
export function normalizeCurtainConfiguration(awning = {}) {
  if (!isConfiguredCurtain(awning)) return {
    curtainBottomFinish: '', curtainWindowReference: '', curtainFabricAdjustment: '', curtainFabricAdjustmentCm: null
  };
  const oldDeduction = awning.reglasModificadas && awning.curtainFabricDeductionCm != null
    && Number.isFinite(Number(awning.curtainFabricDeductionCm));
  const adjustment = curtainFabricAdjustments.includes(awning.curtainFabricAdjustment)
    ? awning.curtainFabricAdjustment : oldDeduction ? 'PERSONALIZADO' : 'NINGUNO';
  const custom = adjustment === 'PERSONALIZADO'
    ? awning.curtainFabricAdjustment === 'PERSONALIZADO'
      ? finiteOrNull(awning.curtainFabricAdjustmentCm) : -Number(awning.curtainFabricDeductionCm)
    : 0;
  return {
    curtainBottomFinish: awning.curtainBottomFinish === 'ET' || (!awning.curtainBottomFinish && awning.curtainFinish === 'TUBO') ? 'ET' : 'TUBO DE CARGA',
    curtainWindowReference: awning.curtainWindowReference === 'TUBO DE CARGA' ? 'TUBO DE CARGA' : 'SUELO',
    curtainFabricAdjustment: adjustment,
    curtainFabricAdjustmentCm: custom
  };
}

export function curtainFabricAdjustmentCm(awning = {}) {
  const config = normalizeCurtainConfiguration(awning);
  if (config.curtainFabricAdjustment === 'TUBO DE CARGA') return -18;
  if (config.curtainFabricAdjustment === 'ET') return -11;
  return config.curtainFabricAdjustment === 'PERSONALIZADO' ? config.curtainFabricAdjustmentCm || 0 : 0;
}

export function curtainWindowDrawingHeight(awning = {}) {
  const measure = Number(awning.curtainWindowFloorHeight) || 0;
  return measure - (normalizeCurtainConfiguration(awning).curtainWindowReference === 'SUELO' ? 18 : 0);
}

export function curtainBottomAllowanceCm(awning = {}) {
  return normalizeCurtainConfiguration(awning).curtainBottomFinish === 'ET' ? 10 : 0;
}

export function curtainConfigurationError(awning = {}) {
  const config = normalizeCurtainConfiguration(awning);
  if (config.curtainFabricAdjustment === 'PERSONALIZADO' && config.curtainFabricAdjustmentCm == null) return 'ajuste de salida de tela';
  if (awning.curtainHasWindow && Number(awning.curtainWindowFloorHeight) > 0 && curtainWindowDrawingHeight(awning) <= 0) return 'distancia a ventana mayor que el descuento de suelo';
  return '';
}

function finiteOrNull(value) {
  if (value == null || value === '') return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}
