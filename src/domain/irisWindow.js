import { squareIrisOpening } from './irisGeometry.js';
import { curtainWindowDrawingHeight, normalizeCurtainConfiguration } from './curtainConfiguration.js';

// La ventana del Iris llega a los dos bordes: no tiene esquinas ni laterales de lona.
export function getIrisWindow(awning = {}, opening = squareIrisOpening({
  frontTop: awning.irisFrontTop, frontBottom: awning.irisFrontBottom,
  exitLeft: awning.irisExitLeft, exitRight: awning.irisExitRight,
  diagonal1: awning.irisDiagonal1, diagonal2: awning.irisDiagonal2,
  assumeSquare: awning.irisAssumeSquare === true
})) {
  const enabled = awning.curtainHasWindow === true && awning.irisGlassCurtain !== true;
  const height = positive(awning.curtainWindowHeight);
  const measure = positive(awning.curtainWindowFloorHeight);
  const reference = normalizeCurtainConfiguration({ ...awning, model: 'IRIS' }).curtainWindowReference;
  // Iván, 22/10/2026: de momento igual que la cortina; pendiente de taller (Q-I11).
  const floor = measure ? curtainWindowDrawingHeight({ ...awning, model: 'IRIS' }) : 0;
  const drop = opening.valid ? opening.dropOpening : 0;
  const errors = [];
  if (enabled) {
    if (!height) errors.push({ field: 'curtainWindowHeight', label: 'altura ventana' });
    if (!Number.isFinite(floor) || floor <= 0) errors.push({ field: 'curtainWindowFloorHeight', label: reference === 'SUELO' ? 'suelo-ventana mayor que 18 cm' : 'tubo-ventana' });
    if (height && floor && drop && floor + height >= drop) {
      errors.push({ field: 'curtainWindowHeight', label: 'ventana dentro del hueco, con lona por encima' });
    }
  }
  return { enabled, height, floor, measure, reference, drop, top: drop - floor - height, errors, valid: enabled && !errors.length && drop > 0 };
}

function positive(value) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : 0;
}
