// AR2605319: marca 10EE4 y corte 10EE7, en metros en el CAD. Mismo cuadrilátero
// en AR2605157 18B41/18B70 y AR2601621 160C4/160F3. No se regulariza ni escala.
// Coordenadas en mm: retroceso desde el extremo delantero de la diagonal e interior.
export const REFUERZO_MFD_CAL = [
  [26.713244933575, 0.221641245387],
  [29.709380332425, 54.740541304529],
  [223.591009140815, 53.446239551652],
  [224.523070364638, -0.28785737958],
];

export function colocarRefuerzoMfd(a, b) {
  const largo = Math.hypot(b[0] - a[0], b[1] - a[1]);
  if (largo < 224.524) throw Error('No cabe el refuerzo MFD de Cal en la diagonal.');
  const u = [(b[0] - a[0]) / largo, (b[1] - a[1]) / largo];
  const interior = [u[1], -u[0]];
  return REFUERZO_MFD_CAL.map(([retroceso, fondo]) => b.map((x, k) => x - retroceso * u[k] + fondo * interior[k]));
}
