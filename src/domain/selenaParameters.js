import { defaultCortinaParameters, normalizeCortinaParameters } from './cortinaParameters.js';

export const defaultSelenaParameters = {
  ...defaultCortinaParameters,
  fabricDropAllowanceCm: 50,
  // Selena conserva el cálculo y la reserva de Cortina anteriores al 22/09/2026
  // (sin −18 y barra de 600) hasta que se revise con sus propios datos.
  bottomDeductionCm: 0,
  legacyReservation: true,
  fabricWidthDiscounts: { ...defaultCortinaParameters.fabricWidthDiscounts },
  rollTubeDiscounts: { ...defaultCortinaParameters.rollTubeDiscounts },
  loadProfileDiscounts: { ...defaultCortinaParameters.loadProfileDiscounts },
  stockLengths: [600]
};

export function normalizeSelenaParameters(input = {}) {
  const source = input && typeof input === 'object' ? input : {};
  return normalizeCortinaParameters({
    ...defaultSelenaParameters,
    ...source,
    fabricWidthDiscounts: {
      ...defaultSelenaParameters.fabricWidthDiscounts,
      ...source.fabricWidthDiscounts
    },
    rollTubeDiscounts: {
      ...defaultSelenaParameters.rollTubeDiscounts,
      ...source.rollTubeDiscounts
    },
    loadProfileDiscounts: {
      ...defaultSelenaParameters.loadProfileDiscounts,
      ...source.loadProfileDiscounts
    }
  });
}
