import { useMemo } from 'react';
import { getFieldVisibility, getModelBehavior } from '../../domain/modelBehavior.js';
import type { Awning } from '../types';

export function useVisibleFields(awning: Awning) {
  return useMemo(() => {
    const behavior = getModelBehavior(awning.model);
    return {
      ...getFieldVisibility({ model: awning.model, device: awning.device }),
      tubeOptions: behavior.tubeOptions || [],
      submodelOptions: behavior.submodelOptions || [],
      implemented: behavior.implemented
    };
  }, [awning.model, awning.device]);
}
