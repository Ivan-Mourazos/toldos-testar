import { defaultCortinaParameters, normalizeCortinaParameters } from './cortinaParameters.js';

export const defaultSelenaParameters = {
  ...defaultCortinaParameters,
  fabricDropAllowanceCm: 50,
  fabricWidthDiscounts: { ...defaultCortinaParameters.fabricWidthDiscounts },
  rollTubeDiscounts: { ...defaultCortinaParameters.rollTubeDiscounts },
  loadProfileDiscounts: { ...defaultCortinaParameters.loadProfileDiscounts },
  stockLengths: [...defaultCortinaParameters.stockLengths]
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
