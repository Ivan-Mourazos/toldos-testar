import { approvalReviewers, generationBlock, normalizeOf } from './reviewRules.js';

export const AVISO_APROBADO = 'Ya está aprobado en CoordinaOT; estos cambios no los ha revisado nadie.';
export const CORTE_NO_REGENERADO = 'El corte no está regenerado con los últimos datos';

/** Solo toldos: una OF ya pasada también permite generar. */
export const aprobadaOPasada = estado => estado === 'aprobada' || estado === 'pasada';

export function aprobacionToldos(estado) {
  const ofs = Object.fromEntries(Object.entries(estado?.ofs || {}).map(([of, valor]) => [of,
    valor.estado === 'pasada' ? { ...valor, estado: 'aprobada' } : valor]));
  return estado ? { ...estado, ofs } : estado;
}

export const generarToldosPermitido = (elementos, estado) => generationBlock(elementos, aprobacionToldos(estado));

/** Editar y guardar no es revisar: el cajetín solo recoge revisores de CoordinaOT. */
export function autoriaToldos(order, savedBy, estado, tecnicos = []) {
  return { technician: order.technician || savedBy || '',
    reviewer: approvalReviewers(order.awnings || [], aprobacionToldos(estado), tecnicos) };
}

export function avisoAprobacionToldos(awnings, estado) {
  if (!estado?.disponible) return '';
  const aprobadas = [...new Set(awnings.map(a => normalizeOf(a.of)).filter(of => of && aprobadaOPasada(estado.ofs?.[of]?.estado)))];
  return aprobadas.length ? `${AVISO_APROBADO} OF aprobadas o pasadas: ${aprobadas.join(', ')}.` : '';
}

/** Ignora el cajetín y la versión de parámetros; los valores de cálculo sí cuentan. */
export function datosEditables(order) {
  const datos = Object.fromEntries(Object.entries(order || {}).filter(([k]) => !['technician', 'reviewer', 'parametersVersion'].includes(k)));
  const estable = v => Array.isArray(v) ? v.map(estable) : v && typeof v === 'object'
    ? Object.fromEntries(Object.keys(v).sort().map(k => [k, estable(v[k])])) : v;
  return JSON.stringify(estable(datos));
}

export function decisionRegenerar(existing, order, hayCorte, eleccion, ajustesCambiados = false) {
  if (hayCorte && eleccion === 'regenerar') return 'regenerar';
  if (!hayCorte || (!ajustesCambiados && existing && datosEditables(existing.order) === datosEditables(order))) return 'seguir';
  return eleccion === 'mantener' || eleccion === 'regenerar' ? eleccion : 'preguntar';
}
