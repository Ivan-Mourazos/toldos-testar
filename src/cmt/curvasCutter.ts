import { value } from './dxf.ts';
import type { Dxf, Duda, EntidadDxf } from './tipos.ts';

// Remolques en la máquina vieja (producción, 16/11/2026): el disco no corta las curvas cerradas, van con la
// cuchilla (CUTTER). La máquina nueva corta el DXF con todo en DISCO1 y no pasa por aquí; el CMT es solo de la vieja.
// Las curvas muy abiertas (radio de 30 cm o más) siguen en DISCO1. Las rectas, siempre en DISCO1.
export const RADIO_CUTTER_REMOLQUES = 300;

const escalaDe = (e: EntidadDxf) => { const m = e.transformacion; return m ? Math.sqrt(Math.abs(m[0] * m[3] - m[1] * m[2])) : 1; };
const conCapa = (e: EntidadDxf, capa: string): EntidadDxf => ({ ...e, pairs: e.pairs.map(([c, v]) => [c, c === 8 ? capa : v] as [number, string]) });

type Vertice = { x: string; y: string; bulge: number; extra: [number, string][] };

function vertices(e: EntidadDxf) {
  const cabecera: [number, string][] = [], lista: Vertice[] = [];
  for (const [c, v] of e.pairs) {
    if (c === 10) lista.push({ x: v, y: '0', bulge: 0, extra: [] });
    else if (!lista.length) cabecera.push([c, v]);
    else if (c === 20) lista.at(-1)!.y = v;
    else if (c === 42) lista.at(-1)!.bulge = Number(v);
    else if ([40, 41, 91].includes(c)) lista.at(-1)!.extra.push([c, v]);
    else cabecera.push([c, v]);
  }
  return { cabecera, lista };
}

/** Radio de un tramo de polilínea con curvatura: cuerda · (1 + b²) / (4·|b|). */
function radioTramo(a: Vertice, z: Vertice) {
  const cuerda = Math.hypot(Number(z.x) - Number(a.x), Number(z.y) - Number(a.y)), b = Math.abs(a.bulge);
  return cuerda * (1 + b * b) / (4 * b);
}

/** Parte la polilínea: los tramos rectos y las curvas abiertas siguen en su capa; cada curva cerrada, aparte en CUTTER. */
function partirPolilinea(e: EntidadDxf, radioMaximo: number): EntidadDxf[] | null {
  const { cabecera, lista } = vertices(e), cerrada = (Number(cabecera.find(([c]) => c === 70)?.[1] ?? 0) & 1) === 1;
  const n = cerrada ? lista.length : lista.length - 1, k = escalaDe(e);
  const cuchilla = (i: number) => Math.abs(lista[i].bulge) > 1e-10 && radioTramo(lista[i], lista[(i + 1) % lista.length]) * k < radioMaximo;
  const tramos = Array.from({ length: Math.max(n, 0) }, (_, i) => cuchilla(i));
  if (!tramos.some(Boolean)) return null;
  const capa = value(e, 8), handle = value(e, 5), base = cabecera.filter(([c]) => ![5, 8, 70, 90].includes(c));
  const piezas: EntidadDxf[] = [];
  const pieza = (desde: number, hasta: number, enCuchilla: boolean) => {
    const vs: Vertice[] = [];
    for (let i = desde; i <= hasta; i++) vs.push({ ...lista[i % lista.length], bulge: i < hasta ? lista[i % lista.length].bulge : 0 });
    const pares: [number, string][] = [[5, `${handle}.${piezas.length + 1}`], [8, enCuchilla ? 'CUTTER' : capa], [90, String(vs.length)], [70, '0'], ...base];
    for (const v of vs) pares.push([10, v.x], [20, v.y], ...v.extra, ...(v.bulge ? [[42, String(v.bulge)] as [number, string]] : []));
    piezas.push({ ...e, pairs: pares });
  };
  // Se agrupan los tramos seguidos de la misma herramienta para no trocear las rectas.
  let inicio = 0;
  for (let i = 1; i <= tramos.length; i++) if (i === tramos.length || tramos[i] !== tramos[inicio]) { pieza(inicio, i, tramos[inicio]); inicio = i; }
  return piezas;
}

/** Pasa a CUTTER los arcos, círculos y tramos curvos de polilínea de DISCO1 con radio menor que `radioMaximo` (unidades del DXF, mm). */
export function curvasACutter(d: Dxf, radioMaximo: number, avisos: Duda[]): void {
  let cambiadas = 0;
  d.entities = d.entities.flatMap((e) => {
    if (value(e, 8).toUpperCase() !== 'DISCO1') return [e];
    if (e.type === 'ARC' || e.type === 'CIRCLE') {
      const r = Number(e.pairs.find(([c]) => c === 40)?.[1] ?? NaN) * escalaDe(e);
      if (Number.isFinite(r) && r < radioMaximo) { cambiadas++; return [conCapa(e, 'CUTTER')]; }
      return [e];
    }
    if (e.type === 'LWPOLYLINE') {
      const piezas = partirPolilinea(e, radioMaximo);
      if (!piezas) return [e];
      cambiadas += piezas.filter((p) => value(p, 8) === 'CUTTER').length;
      return piezas;
    }
    return [e];
  });
  if (cambiadas) avisos.push({ motivo: `Remolque: ${cambiadas} curva${cambiadas === 1 ? '' : 's'} de DISCO1 con radio menor de ${radioMaximo / 10} cm pasa${cambiadas === 1 ? '' : 'n'} a CUTTER para la máquina vieja` });
}
