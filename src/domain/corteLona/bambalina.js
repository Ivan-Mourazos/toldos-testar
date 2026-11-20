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

/** Los cm de bastilla de cada borde de la tira que se pueden cambiar (Iván, 19/11/2026); 0 es «al corte». */
export const BASTILLAS_TIRA = Object.freeze(['bambaPuntaIzqCm', 'bambaPuntaDerCm', 'bambaAbajoCm', 'bambaArribaCm']);

/**
 * Los cm de cada borde de la tira, con los ajustes del toldo. Sin tocar, lo de siempre: la mitad de
 * `tiraExtraLargoCm` en cada punta (B.N(2)), la B.N(2) abajo y el resto de `tiraExtraAltoCm` arriba, para la varilla.
 * Con onda no hay bastilla abajo: lleva remate, aparte.
 */
export function bastillasTira(a, onda) {
  const v = (clave, porDefecto) => a[clave] ?? porDefecto;
  return { izq: v('bambaPuntaIzqCm', a.tiraExtraLargoCm / 2), der: v('bambaPuntaDerCm', a.tiraExtraLargoCm / 2),
    abajo: onda ? 0 : v('bambaAbajoCm', BASTILLA_ABAJO_TIRA_CM), arriba: v('bambaArribaCm', a.tiraExtraAltoCm - BASTILLA_ABAJO_TIRA_CM) };
}

/** Cada borde de la bambalina suelta y su clave en los ajustes del corte. */
export const BORDES_TIRA = Object.freeze([['izq', 'bambaPuntaIzqCm'], ['der', 'bambaPuntaDerCm'], ['abajo', 'bambaAbajoCm'], ['arriba', 'bambaArribaCm']]);

/**
 * Las bastillas que se eligen en el formulario de la bambalina suelta (Iván, 20/11/2026: «tiene que salir en el
 * formulario»): { izq, der, abajo, arriba } en cm, 0 al corte. Solo los bordes cambiados; sin ninguno, undefined
 * para que el toldo (y la firma del corte) quede igual que antes.
 */
export function normalizarBastillasBamba(valor) {
  if (!valor || typeof valor !== 'object') return undefined;
  const limpio = Object.fromEntries(BORDES_TIRA.flatMap(([borde]) => {
    const n = valor[borde] === null || valor[borde] === '' ? NaN : Number(valor[borde]);
    return Number.isFinite(n) && n >= 0 ? [[borde, n]] : [];
  }));
  return Object.keys(limpio).length ? limpio : undefined;
}

/** Las bastillas del formulario como ajustes del corte; mandan sobre las guardadas en el corte. */
export function ajustesDeBastillas(valor) {
  const b = normalizarBastillasBamba(valor) ?? {};
  return Object.fromEntries(BORDES_TIRA.flatMap(([borde, clave]) => (borde in b ? [[clave, b[borde]]] : [])));
}

/** El alto de corte de la tira (cm): la bamba y las bastillas de arriba y de abajo. */
export const altoTiraCm = (bamba, b) => (bamba > 0 ? bamba + (b.arriba + b.abajo) : 0);

/** El largo de corte de la tira (cm): el frente y las bastillas de las puntas. */
export const largoTiraCm = (frente, b) => frente + (b.izq + b.der);

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
 * `margenMm` puede ser [izquierda, derecha] si las puntas llevan bastillas distintas.
 */
export function bordeOndulado(forma, largoMm, margenMm) {
  const [mi, md] = Array.isArray(margenMm) ? margenMm : [margenMm, margenMm];
  const d = ONDAS_BAMBALINA[forma];
  if (!d) throw new Error(`Bambalina sin forma conocida: ${forma}.`);
  const paso = d.paso * 10, nivel = d.nivel * 10;
  const n = Math.max(0, Math.floor((largoMm - mi - md + 1e-6) / paso));
  const desde = mi + (largoMm - mi - md - n * paso) / 2;
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
