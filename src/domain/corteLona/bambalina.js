// Bambalinas con onda: el borde de abajo de la tira con la forma de la plantilla de la oficina (bambalinasDatos.js,
// sacado de BAMBALINAS.dwg). Iván, 28/10/2026: «se cortan en la máquina con su forma y listo; siempre las medidas de
// la plantilla». Como en AR2603936, cortada en la máquina: solo ondas enteras dentro de lo terminado, centradas, y
// recto en las puntas, a la altura donde arranca la onda. La onda se corta con la cuchilla (CUTTER).
import { ONDAS_BAMBALINA } from './bambalinasDatos.js';

/** La onda va 1 cm por encima del borde de abajo de la tira: la cuchilla no corta a menos de 1 cm de otro corte (el
 * del paño de al lado o el orillo; en AR2603936, a 2,75 del orillo). Ese centímetro se tira. */
export const HOLGURA_ONDA_MM = 10;

/** Solo la bamba recta lleva bastilla abajo, la B.N(2) de los 5 cm que se le suman; con onda lleva remate, que se
 * corta aparte (puede ser de otra tela) y no va en este corte (Iván, 28/10/2026). */
export const BASTILLA_ABAJO_TIRA_CM = 2;

/** El alto de corte de la tira (cm): la bamba y lo que se le suma, sin la bastilla de abajo si lleva onda. */
export const altoTiraCm = (bamba, extraAltoCm, onda) => (bamba > 0 ? bamba + extraAltoCm - (onda ? BASTILLA_ABAJO_TIRA_CM : 0) : 0);

/** Las formas de la plantilla; la EXTRASUAVE de la web es la SUPERSUAVE de la plantilla. */
export const FORMAS_BAMBALINA = Object.freeze(Object.keys(ONDAS_BAMBALINA));

/** La forma de la plantilla de una curva de bamba de la web, o null si va recta o no se conoce. */
export function formaBambalina(curva) {
  const c = String(curva || '').trim().toUpperCase();
  const forma = c === 'EXTRASUAVE' ? 'SUPERSUAVE' : c;
  return ONDAS_BAMBALINA[forma] ? forma : null;
}

/**
 * El borde de abajo de una tira de `largoMm` con la onda `forma`, de punta a punta: [[u, v]] en mm, con v = 0 en
 * lo más bajo de la onda. Las ondas, enteras, en lo que queda entre `margenMm` de cada punta, centradas.
 */
export function bordeOndulado(forma, largoMm, margenMm) {
  const d = ONDAS_BAMBALINA[forma];
  if (!d) throw new Error(`Bambalina sin forma conocida: ${forma}.`);
  const paso = d.paso * 10, nivel = d.nivel * 10;
  const n = Math.max(0, Math.floor((largoMm - 2 * margenMm + 1e-6) / paso));
  const desde = (largoMm - n * paso) / 2;
  const r = (v) => Math.round(v * 10) / 10;
  if (!n) return [[0, r(nivel)], [r(largoMm), r(nivel)]];
  const puntos = [[0, nivel], [desde, nivel]];
  for (let k = 0; k < n; k++) {
    for (const [x, y] of d.onda.slice(1)) puntos.push([desde + k * paso + x * 10, nivel + y * 10]);
  }
  puntos.push([largoMm, nivel]);
  // Sin repetir puntos seguidos (el final de cada onda es el arranque de la siguiente).
  return puntos.map(([u, v]) => [r(u), r(v)]).filter(([u, v], i, a) => i === 0 || u !== a[i - 1][0] || v !== a[i - 1][1]);
}
