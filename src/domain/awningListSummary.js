// Estado de cada toldo de un pedido para la lista de Pedidos (Iván, 28/09/2026): en la
// fila se ven las letras (A ✓, D 1 aviso…) y, al desplegar, qué le pasa a cada uno.
// Se calcula al listar, desde el pedido guardado, así que vale también para los pedidos
// que se guardaron antes de existir.
import { awningLetter } from './awningCompleteness.js';

const prefix = /^[^:]{0,80}\bOF\s*[\w-]+\)?\s*:\s*/i;

function cleanMessage(message) {
  const text = String(message || '');
  const match = prefix.exec(text);
  const rest = match ? text.slice(match[0].length) : text;
  return rest ? rest.charAt(0).toLocaleUpperCase('es-ES') + rest.slice(1) : text;
}

/**
 * @returns {{ letter: string, model: string, of: string, state: 'ok' | 'warn' | 'error', notes: string[] }[]}
 */
export function summarizeAwnings(order, calculation) {
  const diagnostics = calculation?.diagnostics || [];
  return (order?.awnings || []).map((awning, index) => {
    const own = diagnostics.filter((item) => item.awningId === awning.id || (item.awningId === undefined && item.awningIndex === index));
    const block = (calculation?.ofs || []).find((item) => item.awningId === awning.id);
    const errors = own.filter((item) => item.level === 'error' || item.level === 'pending');
    const warnings = own.filter((item) => item.level === 'warn' || item.level === 'warning');
    const invalid = block?.calculation && block.calculation.valid === false;
    return {
      letter: awningLetter(index),
      model: String(awning.model || ''),
      of: String(awning.of || ''),
      state: errors.length || invalid ? 'error' : warnings.length ? 'warn' : 'ok',
      notes: [...errors, ...warnings].map((item) => cleanMessage(item.message))
    };
  });
}
