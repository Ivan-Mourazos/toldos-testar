import type { Punto } from './tipos.ts';

// Contornos SOLID medidos en los DWG aprobados, cm desde el bajo del faldón.
// Se conservan sus irregularidades; no son una regla nueva de impresión.
interface Referencia { revision: string; letra: string; frente: number; alto: number; bandas: Array<{ capa: string; puntos: Punto[] }> }
const REFERENCIAS: Referencia[] = [
  { revision: "4815", letra: "A", frente: 281.5, alto: 35, bandas: [
    {"capa":"referencias","puntos":[[6.163608,35],[0,35],[0,28.836392],[6.163608,35]]},
    {"capa":"referencias","puntos":[[126.192829,35],[96.192829,0],[110.334964,0],[140.334964,35]]},
    {"capa":"cortes - lona","puntos":[[258.648456,0],[272.790592,0],[281.5,8.709408],[281.5,27.851544]]},
    {"capa":"referencias","puntos":[[48.590015,35],[18.590015,0],[32.732151,0],[55.482151,35]]}
  ] },
  { revision: "4815", letra: "B", frente: 163.5, alto: 35, bandas: [
    {"capa":"referencias","puntos":[[0,5],[14.142136,5],[39.856421,35],[25.714286,35]]}
  ] },
  { revision: "5363", letra: "A", frente: 197, alto: 35, bandas: [
    {"capa":"referencias","puntos":[[0,9.694256],[0,0],[4.447879,0],[34.447879,35],[20.305744,35]]},
    {"capa":"referencias","puntos":[[83.942829,35],[53.942829,0],[68.084964,0],[98.084964,35]]},
    {"capa":"cortes - lona","puntos":[[174.148456,0],[188.290592,0],[197,8.709408],[197,27.851544]]},
    {"capa":"referencias","puntos":[[48.590015,35],[18.590015,0],[32.732151,0],[55.482151,35]]}
  ] },
  { revision: "5363", letra: "B", frente: 216, alto: 35, bandas: [
    {"capa":"referencias","puntos":[[0,9.694256],[0,0],[4.447879,0],[34.447879,35],[20.305744,35]]},
    {"capa":"referencias","puntos":[[92.5,0.7729],[92.5,0],[105.869236,0],[135.869236,35],[121.7271,35]]},
    {"capa":"cortes - lona","puntos":[[193.148456,0],[207.290592,0],[216,8.709408],[216,27.851544]]},
    {"capa":"referencias","puntos":[[48.590015,35],[18.590015,0],[32.732151,0],[55.482151,35]]}
  ] }
];

/** Recorta por un semiplano; no escala los lados de la franja. */
function recortar(ps: Punto[], a: Punto, b: Punto, signo: number): Punto[] {
  const d = (p: Punto) => signo * ((b[0] - a[0]) * (p[1] - a[1]) - (b[1] - a[1]) * (p[0] - a[0]));
  const salida: Punto[] = [];
  ps.forEach((p, i) => {
    const q = ps[(i + 1) % ps.length], u = d(p), v = d(q);
    if (u >= -1e-8) salida.push(p);
    if ((u >= 0) !== (v >= 0)) { const t = u / (u - v); salida.push([p[0] + t * (q[0] - p[0]), p[1] + t * (q[1] - p[1])]); }
  });
  return salida;
}

/** La referencia de cada ancho conserva ángulos, anchos, fase y separación.
 * Para otras medidas, se traslada la muestra más próxima y se recorta al saco:
 * nunca se estiran las diagonales ni se añaden al corte de máquina.
 */
export function franjasSantaPau(frente: number, alto: number, revision: string) {
  const referencia = REFERENCIAS.filter(r => r.revision === revision).sort((a, b) => Math.abs(a.frente - frente) - Math.abs(b.frente - frente))[0];
  return referencia.bandas.flatMap(banda => {
    const ps = banda.puntos.filter((p, i, todos) => i === 0 || Math.hypot(p[0] - todos[i - 1][0], p[1] - todos[i - 1][1]) > 1e-7);
    const centro: Punto = [ps.reduce((s, p) => s + p[0], 0) / ps.length, ps.reduce((s, p) => s + p[1], 0) / ps.length];
    const ancla = ps.some(p => Math.abs(p[0]) < 1e-6) ? 0 : ps.some(p => Math.abs(p[0] - referencia.frente) < 1e-6) ? 1 : centro[0] / referencia.frente;
    const dx = (frente - referencia.frente) * ancla;
    let caja: Punto[] = [[0, 0], [frente, 0], [frente, alto], [0, alto]];
    ps.forEach((a, i) => {
      const b = ps[(i + 1) % ps.length];
      if (Math.hypot(b[0] - a[0], b[1] - a[1]) < 1e-7) return;
      // Los lados que ya eran el borde del saco los sustituye la caja nueva.
      if ([0, referencia.frente].some(x => Math.abs(a[0] - x) < 1e-6 && Math.abs(b[0] - x) < 1e-6)
        || [0, referencia.alto].some(y => Math.abs(a[1] - y) < 1e-6 && Math.abs(b[1] - y) < 1e-6)) return;
      const signo = Math.sign((b[0] - a[0]) * (centro[1] - a[1]) - (b[1] - a[1]) * (centro[0] - a[0])) || 1;
      caja = recortar(caja, [a[0] + dx, a[1]], [b[0] + dx, b[1]], signo);
    });
    return caja.length < 3 ? [] : [{ capa: banda.capa, puntos: caja }];
  });
}
