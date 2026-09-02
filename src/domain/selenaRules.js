import { formatNumber } from './math.js';
import { calculateCortina } from './cortinaRules.js';
import { normalizeSelenaParameters } from './selenaParameters.js';

const valanceFinishAllowanceCm = 5;

export function calculateSelena({ order, awning }) {
  const parameters = normalizeSelenaParameters(order.parameters?.selena);
  const device = String(awning.device || '').trim().toUpperCase();
  const hasIntegratedValance = Number(awning.valanceHeight) > 0
    && !String(awning.valanceFabric || '').trim();
  const hasSeparateValance = Number(awning.valanceHeight) > 0
    && Boolean(String(awning.valanceFabric || '').trim());
  // AR.26.03959 / CORT!K25: caída + 50; si la bamba va integrada,
  // se suma además su alto confeccionado y 5 cm de remate.
  const cortinaAllowance = parameters.fabricDropAllowanceCm
    + (hasIntegratedValance || hasSeparateValance ? valanceFinishAllowanceCm : 0);
  const syntheticAwning = {
    ...awning,
    curtainHasWindow: false,
    curtainFinish: 'NORMAL',
    curtainSupport: 'UNIVERSAL 3 AGUJEROS'
  };
  const result = calculateCortina({
    order: {
      ...order,
      parameters: {
        ...order.parameters,
        cortina: { ...parameters, fabricDropAllowanceCm: cortinaAllowance }
      }
    },
    awning: syntheticAwning
  });
  const unsupportedDevice = device && device !== 'MAQ. INTERIOR' && device !== 'MAQUINA';
  const missingMachineSide = !String(awning.machineSide || '').trim();
  const calculation = {
    ...result.calculation,
    model: 'SELENA',
    armCount: 2,
    selenaFabricDropAllowanceCm: parameters.fabricDropAllowanceCm,
    selenaValanceFinishAllowanceCm: valanceFinishAllowanceCm,
    valid: result.calculation.valid && !unsupportedDevice && !missingMachineSide
  };
  const diagnostics = result.diagnostics.map((item) => ({
    ...item,
    message: item.message.replaceAll('CORTINA', 'SELENA').replaceAll('Cortina', 'Selena')
  }));

  if (missingMachineSide) {
    diagnostics.push({
      level: 'error',
      awningId: awning.id,
      message: `SELENA incompleta en OF ${awning.of}: falta confirmar el lado de la máquina.`
    });
  }
  if (unsupportedDevice) {
    diagnostics.push({
      level: 'error',
      awningId: awning.id,
      message: `SELENA en OF ${awning.of}: la configuración inicial solo está verificada con máquina interior.`
    });
  }

  return {
    ...result,
    description: buildDescription(awning, calculation),
    materials: calculation.valid ? result.materials : [],
    despiece: calculation.valid ? result.despiece : null,
    diagnostics,
    calculation
  };
}

function buildDescription(awning, calculation) {
  return `Toldo SELENA ${formatNumber(awning.width)}x${formatNumber(awning.projection)} · brazos Stor · tela ${formatNumber(calculation.fabricWidth)}x${formatNumber(calculation.fabricDrop)} · ${formatNumber(calculation.fabricMl)} ml`;
}
