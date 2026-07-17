import { useMemo } from 'react';
import { getFieldVisibility, getModelBehavior, getEstablishedProjections } from '../../domain/modelBehavior.js';
import type { Awning } from '../types';

export function useVisibleFields(awning: Awning) {
  return useMemo(() => {
    const behavior = getModelBehavior(awning.model);
    return {
      ...getFieldVisibility({ model: awning.model, device: awning.device }),
      arzua: awning.model === 'ARZUA PRO',
      galicia: awning.model === 'GALICIA',
      curtain: awning.model.includes('CORTINA'),
      tubeOptions: behavior.tubeOptions || [],
      submodelOptions: behavior.submodelOptions || [],
      armOptions: behavior.armOptions || formArmOptions,
      establishedProjections: getEstablishedProjections(awning.model),
      implemented: behavior.implemented
    };
  }, [awning.model, awning.device]);
}

const formArmOptions = [2, 3, 4];
