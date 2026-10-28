import { formaBambalina } from './corteLona/bambalina.js';
// Primera fase: lona de PVC recta de estos cuatro modelos de fachada.
// Desde el 22/10/2026 también la cortina de PVC, con su ventana (docs/modelos/cortina-pvc-corte.md).
export const modelosConCorte = Object.freeze(['ARZUA PRO', 'GALICIA', 'MONOBLOCK 350', 'CAMBIO TELA', 'CORTINA', 'CAMBIO CORTINA', 'SOLAPAS']);

export function corteReadiness(modelo) {
  const ready = modelosConCorte.includes(String(modelo || '').trim().toUpperCase());
  return { ready, notes: ready ? [] : ['El corte de lona de este modelo está pendiente.'] };
}

export function motivoCorteManual(toldo) {
  const modelo = String(toldo.model || '').trim().toUpperCase();
  // La bamba con onda se corta con la forma de la plantilla de la oficina (corteLona/bambalina.js); la de la cortina,
  // todavía a mano.
  if (toldo.hasValance && toldo.valanceCurve && toldo.valanceCurve !== 'RECTA') {
    if (!formaBambalina(toldo.valanceCurve)) return 'bamba con una onda que no está en la plantilla: el corte se hace a mano.';
    if (modelo === 'CORTINA' || modelo === 'CAMBIO CORTINA') return 'bamba con onda en una cortina: el corte se hace a mano por ahora.';
  }
  if (toldo.curtainHasWindow === true && modelo !== 'CORTINA' && modelo !== 'CAMBIO CORTINA') return 'ventana: el corte se hace a mano por ahora.';
  if (modelo === 'SOLAPAS' && (toldo.bastilla || (Array.isArray(toldo.solapas) && toldo.solapas.some((s) => s?.bastilla)))) return 'pendiente de Oficina Técnica: solapa con bastilla.';
  return null;
}
