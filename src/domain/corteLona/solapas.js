// Piezas de lona de PVC de un juego de solapas con velcro (pieza SOLAPACONVELCROS;
// docs/modelos/cortina-pvc-corte.md, apartado «Solapa con velcro», AR2604205 y AR2604890).
// Medidas de entrada en cm; las piezas salen en mm para el DXF del bot.

export const REGLAS_SOLAPAS = {
  empate: 2,
  borde: 10
};

/**
 * Despiece de las solapas de una OF. Cada solapa va al corte por defecto; si es oblicua y su
 * largo supera el ancho del rollo, se parte al ancho del rollo con 2 cm de empate (como la D
 * de AR2604205: 275 × 40..85 → D1 de 250 × 85..44,1 y D2 de 27 × 44,4..40).
 */
export function piezasSolapas({ solapas = [], anchoRollo }) {
  if (!Number.isFinite(anchoRollo) || anchoRollo <= 0) throw new Error('Medida no válida: anchoRollo.');
  if (!Array.isArray(solapas) || !solapas.length) throw new Error('Añade al menos una solapa.');
  const R = REGLAS_SOLAPAS;
  const piezas = [];
  for (const [idx, s] of solapas.entries()) {
    if (s?.bastilla) throw new Error('Solapa con bastilla: pendiente de Oficina Técnica.');
    const nombre = String(s?.nombre || '').trim().toUpperCase() || letraIndice(idx);
    const L = Number(s?.largo);
    const wA = Number(s?.ancho);
    const wB = s?.oblicua ? Number(s?.ancho2) : wA;
    if (!Number.isFinite(L) || L <= 0 || !Number.isFinite(wA) || wA <= 0 || !Number.isFinite(wB) || wB <= 0) {
      throw new Error(`Faltan medidas válidas en la solapa ${nombre}.`);
    }
    const oblicua = Boolean(s?.oblicua) && Math.abs(wA - wB) > 1e-6;
    const w0 = Math.max(wA, wB);
    const w1 = Math.min(wA, wB);
    if (w0 > anchoRollo && L > anchoRollo) {
      throw new Error(`La solapa ${nombre} supera el ancho del rollo en ambas medidas.`);
    }
    if (!oblicua) {
      piezas.push({
        nombre, rotulo: nombre, letra: nombre, solapaNombre: nombre, rotuloCortina: true,
        largo: mm(L), alto: mm(w0), marcas: [], uniones: []
      });
      continue;
    }
    if (w0 > anchoRollo) throw new Error(`El ancho de la solapa oblicua ${nombre} no cabe en el rollo.`);
    if (L <= anchoRollo) {
      piezas.push({
        nombre, rotulo: nombre, letra: nombre, solapaNombre: nombre, rotuloCortina: true,
        oblicua: true, ancho0: mm(w0), ancho1: mm(w1),
        largo: mm(L), alto: mm(w0), marcas: [], uniones: []
      });
      continue;
    }
    const tramos = [];
    let z0 = 0;
    while (L - z0 > anchoRollo) {
      tramos.push([z0, z0 + anchoRollo]);
      z0 += anchoRollo - R.empate;
    }
    tramos.push([z0, L]);
    const creadas = tramos.map(([za, zb], k) => {
      const wa = round1(w0 + (w1 - w0) * (za / L));
      const wb = round1(w0 + (w1 - w0) * (zb / L));
      const id = `${nombre}${k + 1}`;
      return {
        nombre: id, rotulo: id, letra: nombre, solapaNombre: nombre, rotuloCortina: true,
        oblicua: true, ancho0: mm(wa), ancho1: mm(wb),
        largo: mm(zb - za), alto: mm(Math.max(wa, wb)), marcas: [], uniones: []
      };
    });
    for (let k = 0; k < creadas.length - 1; k++) {
      const valor = `${nombre}${k + 1}`;
      creadas[k].uniones.push({ valor, u: creadas[k].largo - R.borde, v: R.borde });
      creadas[k + 1].uniones.push({ valor, u: R.borde, v: R.borde });
    }
    piezas.push(...creadas);
  }
  return piezas;
}

function letraIndice(index) {
  let n = index + 1;
  let out = '';
  while (n > 0) {
    n -= 1;
    out = String.fromCharCode(65 + (n % 26)) + out;
    n = Math.floor(n / 26);
  }
  return out;
}

const round1 = (v) => Math.round(v * 10) / 10;
const mm = (cm) => Math.round(cm * 100) / 10;
