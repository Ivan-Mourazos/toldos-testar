// Primera fase: lona de PVC recta de estos cuatro modelos de fachada.
// Desde el 22/10/2026 también la cortina de PVC, con su ventana (docs/modelos/cortina-pvc-corte.md).
export const modelosConCorte = Object.freeze(['ARZUA PRO', 'GALICIA', 'MONOBLOCK 350', 'CAMBIO TELA', 'CORTINA', 'CAMBIO CORTINA', 'SOLAPAS']);

export function corteReadiness(modelo) {
  const ready = modelosConCorte.includes(String(modelo || '').trim().toUpperCase());
  return { ready, notes: ready ? [] : ['El corte de lona de este modelo está pendiente.'] };
}

export function motivoCorteManual(toldo) {
  if (toldo.hasValance && toldo.valanceCurve && toldo.valanceCurve !== 'RECTA') return 'bamba con onda: el corte se hace a mano por ahora.';
  const modelo = String(toldo.model || '').trim().toUpperCase();
  if (toldo.curtainHasWindow === true && modelo !== 'CORTINA' && modelo !== 'CAMBIO CORTINA') return 'ventana: el corte se hace a mano por ahora.';
  if (modelo === 'SOLAPAS' && (toldo.bastilla || (Array.isArray(toldo.solapas) && toldo.solapas.some((s) => s?.bastilla)))) return 'pendiente de Oficina Técnica: solapa con bastilla.';
  return null;
}
