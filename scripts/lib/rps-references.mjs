/**
 * Lógica pura de `validate:rps-refs`. Una referencia inexistente o de baja no
 * bloquea la subida a RPS, así que el fallo no avisa solo: hay que buscarlo.
 */

// Los dos lacados que se piden a diario. Un código roto aquí es un fallo seguro;
// en los demás lacados puede ser un color que el modelo ya no ofrece, y eso se
// decide en la tarea de cada modelo.
export const HABITUALES = ['BLANCO', 'NEGRO (R-09011)'];

export function referenceStatus(code, maestro) {
  if (!maestro.has(code)) return 'no existe';
  const baja = maestro.get(code);
  return baja ? `de baja el ${new Date(baja).toISOString().slice(0, 10)}` : '';
}

export function isPrefixOfExisting(literal, maestro) {
  for (const code of maestro.keys()) {
    if (code !== literal && code.startsWith(literal)) return true;
  }
  return false;
}

export function groupProblems({ found, maestro, aceptadas }) {
  const porModelo = {};
  let fallanHabituales = 0;
  for (const [code, donde] of found) {
    const estado = referenceStatus(code, maestro);
    if (!estado) continue;
    const aceptada = aceptadas.get(code) || null;
    const porEsteModelo = new Map();
    for (const lugar of donde) {
      const [model, lacado = ''] = lugar.split('/');
      if (!porEsteModelo.has(model)) porEsteModelo.set(model, new Set());
      porEsteModelo.get(model).add(lacado);
    }
    for (const [model, lacados] of porEsteModelo) {
      const entry = (porModelo[model] ??= { habituales: [], otros: [] });
      const problema = { code, estado, lacados: [...lacados], aceptada };
      if ([...lacados].some((lacado) => HABITUALES.includes(lacado))) {
        entry.habituales.push(problema);
        if (!aceptada) fallanHabituales += 1;
      } else {
        entry.otros.push(problema);
      }
    }
  }
  return { porModelo, fallanHabituales };
}
