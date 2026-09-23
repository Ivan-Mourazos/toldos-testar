import { awningLetter, describeMissing, getMissingFields } from '../domain/awningCompleteness.js';
import { controlLabel } from './components/controlLabels';
import type { Awning } from './types';

// Una línea por toldo incompleto, como la lee el técnico en la tarjeta.
export function incompleteAwningLines(awnings: Awning[], order: { fabric: string; sameFabric: boolean } | null = null): string[] {
  return awnings.flatMap((awning, index) => {
    const missing = getMissingFields(awning, order);
    if (!missing.length) return [];
    const kind = awning.workType === 'FABRIC_ONLY' ? 'Tela' : 'Toldo';
    return [`${kind} ${awningLetter(index)} · ${controlLabel(awning.model) || 'sin modelo'}: falta ${describeMissing(missing)}`];
  });
}
