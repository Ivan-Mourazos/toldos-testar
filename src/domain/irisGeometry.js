/**
 * Escuadrado del hueco de un toldo IRIS.
 *
 * Replica la hoja `Cálculos de escuadrado` de Y:\PROGRAMAS CALCULO\IRIS.xlsx.
 * El hueco se parte en dos triángulos que comparten el frente superior: el
 * izquierdo lo cierran la diagonal 1 y la salida izquierda, el derecho la
 * diagonal 2 y la salida derecha. De cada uno sale la altura por la fórmula
 * de Herón y la holgura que sobra respecto de la salida medida.
 */
export function squareIrisOpening(measures = {}) {
  const frontTop = positive(measures.frontTop);
  const exitLeft = positive(measures.exitLeft);
  const assumeSquare = measures.assumeSquare === true;

  if (!frontTop || !exitLeft) return failure('Faltan el frente superior o la salida izquierda.');

  const squaredDiagonal = Math.sqrt(frontTop * frontTop + exitLeft * exitLeft);
  const frontBottom = assumeSquare ? frontTop : positive(measures.frontBottom);
  const exitRight = assumeSquare ? exitLeft : positive(measures.exitRight);
  const diagonal1 = assumeSquare ? squaredDiagonal : positive(measures.diagonal1);
  const diagonal2 = assumeSquare ? squaredDiagonal : positive(measures.diagonal2);

  if (!frontBottom || !exitRight || !diagonal1 || !diagonal2) {
    return failure('Faltan medidas del hueco: se necesitan los dos frentes, las dos salidas y las dos diagonales.');
  }

  const left = solveTriangle(frontTop, diagonal1, exitLeft);
  const right = solveTriangle(frontTop, diagonal2, exitRight);
  if (!left || !right) {
    return failure('Las medidas del hueco no forman un triángulo: revisa frentes, salidas y diagonales.');
  }

  const negativeDisplacement = [left.displacement, right.displacement]
    .filter((value) => value < 0)
    .reduce((total, value) => total + value, 0);

  return {
    valid: true,
    error: '',
    frontTop,
    frontBottom,
    frontToldo: frontTop + negativeDisplacement,
    dropOpening: Math.min(left.height, right.height),
    heightLeft: left.height,
    heightRight: right.height,
    slackLeft: left.slack,
    slackRight: right.slack,
    displacementLeft: left.displacement,
    displacementRight: right.displacement
  };
}

function solveTriangle(front, diagonal, exit) {
  const semiPerimeter = (front + diagonal + exit) / 2;
  const radicand = semiPerimeter
    * (semiPerimeter - front)
    * (semiPerimeter - diagonal)
    * (semiPerimeter - exit);
  if (!(radicand > 0)) return null;

  const area = Math.sqrt(radicand);
  const height = 2 * area / front;
  const slack = Math.sqrt(Math.max(0, exit * exit - height * height));
  const cosine = (exit * exit + front * front - diagonal * diagonal) / (2 * exit * front);
  const angle = Math.acos(Math.min(1, Math.max(-1, cosine))) * 180 / Math.PI;

  return { height, slack, angle, displacement: angle > 90 ? slack : -slack };
}

function positive(value) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : 0;
}

function failure(error) {
  return {
    valid: false,
    error,
    frontTop: 0,
    frontBottom: 0,
    frontToldo: 0,
    dropOpening: 0,
    heightLeft: 0,
    heightRight: 0,
    slackLeft: 0,
    slackRight: 0,
    displacementLeft: 0,
    displacementRight: 0
  };
}
