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

/**
 * Qué decir cuando no hay cálculo con el que guardar o ver el planteamiento. Un cálculo que ha fallado no es un
 * pedido sin toldos: decía «Añade al menos un toldo» con el toldo A completo (AR2605535, 16/11/2026).
 */
export function avisoSinCalculo(awnings: Awning[], order: { fabric: string; sameFabric: boolean } | null,
  calculo: { estado: 'idle' | 'validating' | 'ready' | 'error'; error: string }, paraQue: string): { title: string; message: string } {
  const incomplete = incompleteAwningLines(awnings, order);
  if (incomplete.length) return { title: 'Faltan datos', message: incomplete.join('. ') };
  if (awnings.length && calculo.estado === 'error') return { title: 'No se pudo calcular',
    message: `No se ha podido calcular el pedido${calculo.error ? `: ${calculo.error.replace(/\.$/, '')}` : ''}. Se vuelve a intentar ahora; espera unos segundos y repite.` };
  if (awnings.length && calculo.estado === 'validating') return { title: 'Calculando', message: 'El pedido se está calculando. Espera un momento y repite.' };
  return { title: 'Faltan datos', message: `Añade al menos un toldo ${paraQue}.` };
}
