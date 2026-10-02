// Motor de la Cortina según su tamaño (Iván, 02/10/2026). Sale de los motores gastados en RPS
// (docs/modelos/cortina.md, Q-CO04): la potencia depende de la salida, el frente y el peso de la
// tela. Con el candado el técnico puede poner otro.
//   · 55/17 con frente de más de 800.
//   · 35/17 con salida de más de 350, o de más de 300 con PVC y ventana de cristal.
//   · 15/17 en lo demás.
import { shortFabricName } from './fabricShortName.js';

export const cortinaMotorPowers = ['15/17', '35/17', '55/17'];

export function isPvcFabric(fabric) {
  if (!fabric) return false;
  if (/PLASTICA/i.test(String(fabric.material || fabric.subfamily || ''))) return true;
  return shortFabricName(fabric.description).startsWith('LONA PVC');
}

export function cortinaMotorPower({ width, projection, curtainHasWindow, fabric }) {
  const frente = Number(width) || 0;
  const salida = Number(projection) || 0;
  if (frente > 800) return '55/17';
  if (salida > 350) return '35/17';
  if (salida > 300 && curtainHasWindow === true && isPvcFabric(fabric)) return '35/17';
  return '15/17';
}
