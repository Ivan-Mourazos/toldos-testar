// Qué modelos están completos y qué les falta a los demás, para enseñarlo en los
// selectores de «Añadir toldo» y «Añadir trabajo de tela» (Iván, 25/09/2026).
// Completo = reglas, reserva según el consumo real, formulario y PDF revisados, sin
// dudas abiertas propias. Lo pendiente es lo que falta por contestar en el taller.
// Se mantiene a la par que docs/modelos/dudas-abiertas.md: al cerrar una duda, se
// quita de aquí. Las dudas comunes a todos (casquillo de eje 50 o 63, largo de barra)
// no se repiten en cada modelo.
// Taller, 30/09/2026: salen las dudas de Galicia, Electra, Diana, Monoblock 350 y Punto
// Recto, y los patines del Ágata (contestadas y ya aplicadas en la web).
const pending = {
  'AGATA BOX': ['Si el motor pasa del Sunilus al Sunea (lo decide Oficina Técnica).'],
  CORTINA: ['Si la altura del velcro sigue restando 18 cm con las reglas nuevas de la tela.'],
  SELENA: ['A motor nunca se ha fabricado: confirmar el kit con el taller.'],
  IRIS: ['El motor y el mando todavía no se reservan: se ponen a mano.'],
  HERA: ['El motor y el mando todavía no se reservan: se ponen a mano.'],
  ANTICA: [
    'Fabricación propia: la reserva aún no lleva escuadras, kits, tornillería ni cincado.',
    'Quedan 28 preguntas para el encargado de taller.'
  ]
};

/** @returns {{ ready: boolean, notes: string[] }} */
export function modelReadiness(model) {
  const notes = pending[String(model || '').trim().toUpperCase()] || [];
  return { ready: notes.length === 0, notes };
}

export function modelReadinessText(model) {
  const { ready, notes } = modelReadiness(model);
  return ready
    ? 'Completo: medidas, reserva, formulario y PDF revisados.'
    : `Falta confirmar con el taller:\n${notes.map((note) => `· ${note}`).join('\n')}`;
}

export const modelsWithPendingNotes = Object.keys(pending);
