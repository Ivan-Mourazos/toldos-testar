// Qué modelos están completos y qué les falta a los demás, para enseñarlo en los
// selectores de «Añadir toldo» y «Añadir trabajo de tela» (Iván, 25/09/2026).
// Completo = reglas, reserva según el consumo real, formulario y PDF revisados, sin
// dudas abiertas propias. Lo pendiente es lo que falta por contestar en el taller.
// Se mantiene a la par que docs/modelos/dudas-abiertas.md: al cerrar una duda, se
// quita de aquí. Las dudas comunes a todos (casquillo de eje 50 o 63, largo de barra)
// no se repiten en cada modelo.
const pending = {
  'AGATA BOX': [
    'Cuándo lleva patines, regleta de unión y pasadores.',
    'Qué motor lleva (casi siempre se ha puesto el 85/17).'
  ],
  CORTINA: [
    'Qué motor lleva cada cortina (15/17, 35/17 o 55/17).',
    'Cuándo lleva tubo de Ø70 en vez de Ø78.'
  ],
  ELECTRA: [
    'Qué tapas lleva el perfil de carga sin cofre, y de qué color.',
    'Cuándo lleva tubo de Ø70 en vez de Ø78.',
    'Con cofre, con qué montaje lleva el puente abatible.'
  ],
  MAXISCREEM: ['Cuándo lleva el kit de montaje del cable.'],
  SELENA: ['A motor nunca se ha fabricado: confirmar el kit con el taller.'],
  IRIS: ['El motor y el mando todavía no se reservan: se ponen a mano.'],
  HERA: ['El motor y el mando todavía no se reservan: se ponen a mano.'],
  GALICIA: [
    'Qué máquina lleva: MB-11 o Geiger.',
    'Cuándo lleva el motor 70/17 en vez del 55/17.',
    'Si se hace con 3,50 m de salida y tres brazos.'
  ],
  'MONOBLOCK 350': ['Cómo se hace la barra de carga entre 7,10 y 7,25 m de frente.'],
  'PUNTO RECTO': [
    'Qué kit de motor lleva con tubo de Ø70.',
    'Qué barra de carga lleva: Univers 280 o 270.',
    'Si se sigue haciendo con 1,60 m de salida.'
  ],
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
