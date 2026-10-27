const curtainModels = new Set(['CORTINA', 'CAMBIO CORTINA']);
export const curtainFabricAdjustments = ['NINGUNO', 'TUBO DE CARGA', 'ET', 'PERSONALIZADO'];
export const curtainVelcroTypes = ['SUAVE', 'BRAVO'];
export const curtainVelcroSides = ['POR DERECHO', 'POR REVÉS'];
export const curtainVelcroColors = ['BLANCO', 'NEGRO'];

export function isConfiguredCurtain(awning = {}) {
  return curtainModels.has(String(awning.model || '').toUpperCase());
}

// Laterales, acabado inferior, referencia de ventana, ajuste de tela y opciones de velcro son elecciones independientes.
/** @returns {Required<Pick<import('../client/types').Awning, 'curtainBottomFinish' | 'curtainWindowReference' | 'curtainFabricAdjustment' | 'curtainFabricAdjustmentCm' | 'curtainVelcroType' | 'curtainVelcroSide' | 'curtainVelcroColor' | 'curtainVelcroWidth' | 'curtainVelcroHeight'>>} */
export function normalizeCurtainConfiguration(awning = {}) {
  if (!isConfiguredCurtain(awning)) return {
    curtainBottomFinish: '',
    curtainWindowReference: awning.model === 'IRIS' ? awning.curtainWindowReference === 'TUBO DE CARGA' ? 'TUBO DE CARGA' : 'SUELO' : '',
    curtainFabricAdjustment: '', curtainFabricAdjustmentCm: null,
    curtainVelcroType: '', curtainVelcroSide: '', curtainVelcroColor: '',
    curtainVelcroWidth: null, curtainVelcroHeight: null
  };
  const oldDeduction = awning.reglasModificadas && awning.curtainFabricDeductionCm != null
    && Number.isFinite(Number(awning.curtainFabricDeductionCm));
  const adjustment = curtainFabricAdjustments.includes(awning.curtainFabricAdjustment)
    ? awning.curtainFabricAdjustment : oldDeduction ? 'PERSONALIZADO' : 'NINGUNO';
  const custom = adjustment === 'PERSONALIZADO'
    ? awning.curtainFabricAdjustment === 'PERSONALIZADO'
      ? finiteOrNull(awning.curtainFabricAdjustmentCm) : -Number(awning.curtainFabricDeductionCm)
    : 0;
  const velcroSide = String(awning.curtainVelcroSide || '').trim().toUpperCase().replace('REVES', 'REVÉS');
  const velcroWidth = finiteOrNull(awning.curtainVelcroWidth);
  const velcroHeight = finiteOrNull(awning.curtainVelcroHeight);
  return {
    curtainBottomFinish: awning.curtainBottomFinish === 'ET' || (!awning.curtainBottomFinish && awning.curtainFinish === 'TUBO') ? 'ET' : 'TUBO DE CARGA',
    curtainWindowReference: awning.curtainWindowReference === 'TUBO DE CARGA' ? 'TUBO DE CARGA' : 'SUELO',
    curtainFabricAdjustment: adjustment,
    curtainFabricAdjustmentCm: custom,
    curtainVelcroType: String(awning.curtainVelcroType || '').trim().toUpperCase() === 'BRAVO' ? 'BRAVO' : 'SUAVE',
    curtainVelcroSide: velcroSide === 'POR REVÉS' || velcroSide === 'REVÉS' ? 'POR REVÉS' : 'POR DERECHO',
    curtainVelcroColor: String(awning.curtainVelcroColor || '').trim().toUpperCase() === 'NEGRO' ? 'NEGRO' : 'BLANCO',
    curtainVelcroWidth: velcroWidth != null && velcroWidth > 0 ? velcroWidth : 5,
    curtainVelcroHeight: velcroHeight != null && velcroHeight > 0 ? velcroHeight : null
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

// Cortina y Cambio de cortina (Iván, 02/10/2026, Q-CO06): salida + 8 y el ajuste de tela elegido
// en la tarjeta (−18, −11 o el propio). Si el técnico indica otro alto en la tarjeta, manda ese.
export function defaultCurtainVelcroHeight(awning = {}) {
  const projection = Number(awning.projection);
  return Number.isFinite(projection) ? Math.max(0, projection + 8 + curtainFabricAdjustmentCm(awning)) : null;
}

export function configuredCurtainVelcroHeight(awning = {}) {
  const custom = normalizeCurtainConfiguration(awning).curtainVelcroHeight;
  if (custom != null && custom > 0) return custom;
  return defaultCurtainVelcroHeight(awning);
}

export function formatVelcroLabel({ tipo = 'SUAVE', ancho = 5, color = 'BLANCO', lado = 'POR DERECHO', alCorte = false } = {}) {
  const t = String(tipo || '').trim().toUpperCase() === 'BRAVO' ? 'BRAVO' : 'SUAVE';
  const c = String(color || '').trim().toUpperCase() === 'NEGRO' ? 'NEGRO' : 'BLANCO';
  const w = Number.isFinite(Number(ancho)) && Number(ancho) > 0 ? String(Math.round(Number(ancho) * 10) / 10).replace('.', ',') : '5';
  const rawSide = String(lado || '').trim().toUpperCase().replace('REVES', 'REVÉS');
  const face = rawSide.includes('REVÉS') ? 'REVÉS' : 'DERECHO';
  return `VELCRO ${t} (${w}) ${c} ${alCorte ? `AL CORTE ${face}` : `POR ${face}`}`;
}

export function formatCurtainVelcroLabel(awning = {}) {
  const config = normalizeCurtainConfiguration(awning);
  return formatVelcroLabel({
    tipo: config.curtainVelcroType,
    ancho: config.curtainVelcroWidth,
    color: config.curtainVelcroColor,
    lado: config.curtainVelcroSide,
    alCorte: false
  });
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
