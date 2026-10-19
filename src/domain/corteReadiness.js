// Primera fase: lona de PVC recta de estos cuatro modelos de fachada.
export const modelosConCorte = Object.freeze(['ARZUA PRO', 'GALICIA', 'MONOBLOCK 350', 'CAMBIO TELA']);

export function corteReadiness(modelo) {
  const ready = modelosConCorte.includes(String(modelo || '').trim().toUpperCase());
  return { ready, notes: ready ? [] : ['El corte de lona de este modelo está pendiente.'] };
}

export function motivoCorteManual(toldo) {
  if (toldo.hasValance && toldo.valanceCurve && toldo.valanceCurve !== 'RECTA') return 'bamba con onda: el corte se hace a mano por ahora.';
  if (toldo.curtainHasWindow === true) return 'ventana: el corte se hace a mano por ahora.';
  return null;
}
