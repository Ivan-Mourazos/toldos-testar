import { squareIrisOpening } from './irisGeometry.js';
import { normalizeIrisGuideType, normalizeIrisParameters } from './irisParameters.js';
import { formatNumber } from './math.js';

/**
 * Lo que necesita el dibujo del escuadrado del Iris en la tarjeta (Iván, 08/10/2026): el hueco
 * tal como se ha medido, el rectángulo del toldo, la altura de cada guía, el desfase de cada
 * esquina de abajo y las comprobaciones. Sale del mismo escuadrado que el cálculo
 * (irisGeometry.js), así que el dibujo no puede decir otra cosa que la reserva.
 *
 * Coordenadas en cm, con la esquina superior izquierda del hueco en (0, 0) y la y hacia abajo.
 * Los desfases son de centímetros en huecos de metros: `drawCorners` los exagera
 * `exaggeration` veces para que se vean; las cotas dicen siempre la medida real.
 *
 * @returns {null | object} null mientras falten medidas o no formen un hueco.
 */
export function buildIrisSquaringView(awning = {}, parameters = {}) {
  const params = normalizeIrisParameters(parameters);
  const assumeSquare = awning.irisAssumeSquare === true;
  const opening = squareIrisOpening({
    frontTop: awning.irisFrontTop,
    frontBottom: awning.irisFrontBottom,
    exitLeft: awning.irisExitLeft,
    exitRight: awning.irisExitRight,
    diagonal1: awning.irisDiagonal1,
    diagonal2: awning.irisDiagonal2,
    assumeSquare
  });
  if (!opening.valid) return null;

  const front = opening.frontTop;
  // Un desplazamiento negativo es una esquina de abajo que entra hacia el hueco.
  const corners = {
    topLeft: { x: 0, y: 0 },
    topRight: { x: front, y: 0 },
    bottomLeft: { x: -opening.displacementLeft, y: opening.heightLeft },
    bottomRight: { x: front + opening.displacementRight, y: opening.heightRight }
  };
  const left = Math.max(0, corners.bottomLeft.x);
  const right = Math.min(front, corners.bottomRight.x);
  const slackLeft = Math.abs(opening.displacementLeft);
  const slackRight = Math.abs(opening.displacementRight);
  const maxSlack = Math.max(slackLeft, slackRight, Math.abs(opening.heightLeft - opening.heightRight));
  // Que el mayor desfase ocupe en el dibujo alrededor del 12 % del frente, sin pasar de ×40.
  const exaggeration = maxSlack > 0.05 ? Math.max(1, Math.min(40, Math.round((front * 0.12) / maxSlack))) : 1;
  const baseDrop = Math.min(opening.heightLeft, opening.heightRight);
  const drawPoint = ({ x, y }) => ({
    x: x < front / 2 ? x * exaggeration : front - (front - x) * exaggeration,
    y: y === 0 ? 0 : baseDrop + (y - baseDrop) * exaggeration
  });
  const drawCorners = Object.fromEntries(Object.entries(corners).map(([key, point]) => [key, drawPoint(point)]));

  const view = {
    assumeSquare,
    exaggeration,
    corners,
    drawCorners,
    drawToldo: {
      left: Math.max(0, drawCorners.bottomLeft.x),
      right: Math.min(front, drawCorners.bottomRight.x),
      drop: Math.min(drawCorners.bottomLeft.y, drawCorners.bottomRight.y)
    },
    measures: {
      frontTop: front,
      frontBottom: opening.frontBottom,
      exitLeft: Number(awning.irisExitLeft) || 0,
      exitRight: assumeSquare ? Number(awning.irisExitLeft) || 0 : Number(awning.irisExitRight) || 0,
      diagonal1: assumeSquare ? Math.hypot(front, Number(awning.irisExitLeft) || 0) : Number(awning.irisDiagonal1) || 0,
      diagonal2: assumeSquare ? Math.hypot(front, Number(awning.irisExitLeft) || 0) : Number(awning.irisDiagonal2) || 0
    },
    toldo: { left: round1(left), width: round1(right - left), drop: round1(baseDrop) },
    guides: { left: round1(opening.heightLeft), right: round1(opening.heightRight) },
    slack: { left: round1(slackLeft), right: round1(slackRight) },
    frontBottomFromDiagonals: opening.frontBottomFromDiagonals
  };
  view.checks = buildChecks(view, awning, params);
  return view;
}

function buildChecks(view, awning, params) {
  const checks = [];
  if (view.assumeSquare) {
    checks.push({ id: 'cuadran', level: 'ok', text: 'Hueco escuadrado: frente inferior, salida derecha y diagonales salen por Pitágoras.' });
  } else {
    const mismatch = Math.abs(view.frontBottomFromDiagonals - view.measures.frontBottom);
    const computed = formatNumber(round1(view.frontBottomFromDiagonals));
    checks.push(mismatch > params.squaringToleranceCm
      ? { id: 'cuadran', level: 'error', text: `Las medidas no cuadran: con las salidas y las diagonales, el frente inferior sería de ${computed} cm y has puesto ${formatNumber(view.measures.frontBottom)}.` }
      : { id: 'cuadran', level: 'ok', text: `Las seis medidas cuadran: el frente inferior calculado es de ${computed} cm (medido ${formatNumber(view.measures.frontBottom)}).` });
  }

  const slack = Math.max(view.slack.left, view.slack.right);
  const compensator = normalizeIrisGuideType(awning.irisGuideType) === 'COMPENSADORA';
  const text = `${formatNumber(view.slack.left)} cm fuera de escuadra a la izquierda y ${formatNumber(view.slack.right)} a la derecha`;
  if (slack <= params.compensatorNeededCm) {
    checks.push({ id: 'escuadra', level: 'ok', text: `${text}: no hace falta guía compensadora.` });
  } else if (slack > params.compensatorMaxCm) {
    checks.push({ id: 'escuadra', level: 'error', text: `${text}: la guía compensadora solo absorbe ${formatNumber(params.compensatorMaxCm)} cm por guía. Revisa las medidas con comercial.` });
  } else if (compensator) {
    checks.push({ id: 'escuadra', level: 'ok', text: `${text}: lo absorbe la guía compensadora (hasta ${formatNumber(params.compensatorMaxCm)} cm).` });
  } else {
    checks.push({ id: 'escuadra', level: 'warn', text: `${text}: debería llevar guía compensadora; avisar a comercial.` });
  }
  return checks;
}

function round1(value) {
  return Math.round((Number(value) + Number.EPSILON) * 10) / 10;
}
