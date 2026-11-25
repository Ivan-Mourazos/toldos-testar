// Renderizador DXF → SVG de las presentaciones (layouts de espacio papel) de un plano CAD.
// Reutiliza el parser DXF y los colores ACI de src/cmt, el giro exacto de TEXT/MTEXT (50/11-21/101)
// y la evaluación de SPLINE de src/flujoDwg/planoDxf.js. Salida SVG sobre fondo blanco.
import { leerDxf, number, value, values } from '../cmt/dxf.ts';
import { colorAci, colorVerdadero } from '../cmt/colorAci.ts';
import { giroMtext } from '../cmt/textos-cad.ts';
import { caracteresCad } from '../cmt/caracteres-cad.ts';
import type { EntidadDxf } from '../cmt/tipos.ts';
import { anchoArial } from '../domain/corteLona/texto.js';
import { puntosSpline, textoDxf } from '../flujoDwg/planoDxf.js';

export interface PaginaCadSvg {
  nombre: string;
  anchoMm: number;
  altoMm: number;
  svg: string;
  sinDibujar: Record<string, number>;
}

interface CapaInfo {
  color: number;
  trueColor?: number;
  imprime: boolean;
  visible: boolean;
  handle: string;
}

interface VentanaInfo {
  id: number;
  escala: number;
  centro: [number, number];
  modelo: [number, number];
  ancho: number;
  alto: number;
  giro: number;
  congeladas: Set<string>;
  zona: { x0: number; x1: number; y0: number; y1: number };
  handle: string;
}

interface Zona {
  x0: number;
  x1: number;
  y0: number;
  y1: number;
}

type Transform = (x: number, y: number) => [number, number];

type Primitiva =
  | { tipo: 'raya'; capa: string; color: string; a: [number, number]; b: [number, number]; curva: number; recorte?: VentanaInfo }
  | { tipo: 'arco'; capa: string; color: string; punto: [number, number]; r: number; desde: number; hasta: number; circulo: boolean; recorte?: VentanaInfo }
  | { tipo: 'texto'; capa: string; color: string; punto: [number, number]; h: number; ancho: number; escalaX: number; giro: number; ancla: number; valor: string; recorte?: VentanaInfo }
  | { tipo: 'relleno'; capa: string; color: string; bucles: Array<Array<[number, number]>>; solido: boolean; recorte?: VentanaInfo };

const DIBUJADAS = new Set([
  'LINE', 'LWPOLYLINE', 'POLYLINE', 'VERTEX', 'ARC', 'CIRCLE', 'ELLIPSE', 'SPLINE',
  'TEXT', 'MTEXT', 'ATTRIB', 'INSERT', 'DIMENSION', 'SOLID', 'TRACE', 'HATCH', 'VIEWPORT'
]);
const NO_SE_IMPRIMEN = new Set(['POINT', 'ATTDEF', 'SEQEND', 'BLOCK', 'ENDBLK', 'SECTION', 'ENDSEC', 'EOF', 'XLINE', 'RAY']);
const IDENTIDAD: Transform = (x, y) => [x, y];

const canales = (hex: string): [number, number, number] => [
  parseInt(hex.slice(1, 3), 16),
  parseInt(hex.slice(3, 5), 16),
  parseInt(hex.slice(5, 7), 16)
];
const aHex = (r: number, g: number, b: number) =>
  `#${[r, g, b].map(v => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('')}`;
const luminancia = ([r, g, b]: [number, number, number]) => {
  const [rl, gl, bl] = [r, g, b].map(v => {
    const s = v / 255;
    return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * rl + 0.7152 * gl + 0.0722 * bl;
};

/**
 * Color ACI o verdadero (420) legible sobre papel blanco (#ffffff).
 * ACI 7 es la tinta negra; los colores demasiado claros (amarillo ACI 2, cian ACI 4, blanco 255)
 * se oscurecen lo justo hacia negro para garantizar contraste ≥ 3 sin perder su tono.
 */
export function colorSobreBlanco(aci: number, trueColor?: number): string {
  const base = trueColor !== undefined ? colorVerdadero(trueColor) : colorAci(aci);
  if (!base) return '#111111';
  const rgb = canales(base);
  const contrasteBlanco = (c: [number, number, number]) => 1.05 / (luminancia(c) + 0.05);
  if (contrasteBlanco(rgb) >= 3) return base;
  for (let paso = 1; paso <= 40; paso++) {
    const f = 1 - paso / 40;
    const mezcla: [number, number, number] = [rgb[0] * f, rgb[1] * f, rgb[2] * f];
    if (contrasteBlanco(mezcla) >= 3) return aHex(...mezcla);
  }
  return '#111111';
}

const tieneCodigo = (e: EntidadDxf, c: number) => e.pairs.some(([k]) => k === c);

/** Primer valor de un código antes de 101 (Embedded Object de ZWCAD/AutoCAD). */
function numeroAntesDe101(e: EntidadDxf, codigo: number, defecto = 0): number {
  for (const [k, v] of e.pairs) {
    if (k === 101) break;
    if (k === codigo) {
      const n = Number(v);
      return Number.isFinite(n) ? n : defecto;
    }
  }
  return defecto;
}

/**
 * Giro exacto en grados (antihorario en CAD) de TEXT, ATTRIB o MTEXT.
 * - MTEXT: respeta código 50 y vector 11/21 según su orden, deteniéndose en 101 (AR2605701).
 * - TEXT/ATTRIB: código 50 antes de 101; si es alineado/ajustado (72 = 3 o 5), ángulo 10/20 → 11/21.
 */
export function giroEntidadTexto(e: EntidadDxf): number {
  if (e.type === 'MTEXT') return giroMtext(e);
  const h72 = number(e, 72, 0);
  if (h72 === 3 || h72 === 5) {
    const dx = number(e, 11, 0) - number(e, 10, 0);
    const dy = number(e, 21, 0) - number(e, 20, 0);
    if (Math.hypot(dx, dy) > 1e-9) return Math.atan2(dy, dx) * 180 / Math.PI;
  }
  return numeroAntesDe101(e, 50, 0);
}

/** Limpia códigos de formato MTEXT/TEXT conservando saltos de línea y caracteres CAD (Ø, °, ±, \U+XXXX). */
export function limpiarTextoCad(bruto: string): string {
  return caracteresCad(String(bruto ?? ''))
    .replace(/\\~/g, '\u00a0')
    .replace(/\\P|\\N|\^J/g, '\n')
    .replace(/\^I/g, '  ')
    .replace(/\\S([^;^#/]*)[\^#/]([^;]*);/g, '$1/$2')
    .replace(/\\[A-Za-z][^;{}]*;/g, '')
    .replace(/\\[LlOoKk]/g, '')
    .replace(/\\([{}\\])/g, '$1')
    .replace(/[{}]/g, '');
}

function verticesLwpolyline(e: EntidadDxf): Array<{ x: number; y: number; curva: number }> {
  const pts: Array<{ x: number; y: number; curva: number }> = [];
  let actual: { x: number; y: number; curva: number } | undefined;
  for (const [k, v] of e.pairs) {
    if (k === 10) {
      actual = { x: Number(v) || 0, y: 0, curva: 0 };
      pts.push(actual);
    } else if (k === 20 && actual) {
      actual.y = Number(v) || 0;
    } else if (k === 42 && actual) {
      actual.curva = Number(v) || 0;
    }
  }
  return pts;
}

function muestrearElipse(e: EntidadDxf): Array<[number, number]> {
  const cx = number(e, 10, 0), cy = number(e, 20, 0);
  const mx = number(e, 11, 1), my = number(e, 21, 0);
  const ratio = number(e, 40, 1);
  const t0 = number(e, 41, 0), t1Raw = number(e, 42, Math.PI * 2);
  const t1 = t1Raw <= t0 + 1e-9 ? t0 + Math.PI * 2 : t1Raw;
  const pasos = Math.max(16, Math.ceil(Math.abs(t1 - t0) / (Math.PI / 18)));
  const nx = -my * ratio, ny = mx * ratio;
  const pts: Array<[number, number]> = [];
  for (let i = 0; i <= pasos; i++) {
    const t = t0 + (t1 - t0) * (i / pasos);
    const c = Math.cos(t), s = Math.sin(t);
    pts.push([cx + mx * c + nx * s, cy + my * c + ny * s]);
  }
  return pts;
}

function muestrearArcoBulge(a: [number, number], b: [number, number], bulge: number): Array<[number, number]> {
  const ang = 4 * Math.atan(bulge);
  const d = Math.hypot(b[0] - a[0], b[1] - a[1]);
  if (d < 1e-9 || Math.abs(bulge) < 1e-6) return [a, b];
  const r = d / (2 * Math.sin(Math.abs(ang) / 2));
  const mx = (a[0] + b[0]) / 2, my = (a[1] + b[1]) / 2;
  const h = Math.sqrt(Math.max(0, r * r - (d / 2) ** 2));
  const ux = (b[0] - a[0]) / d, uy = (b[1] - a[1]) / d;
  const signo = (bulge > 0) === (Math.abs(ang) < Math.PI) ? 1 : -1;
  const cx = mx - signo * uy * h, cy = my + signo * ux * h;
  const inicio = Math.atan2(a[1] - cy, a[0] - cx);
  const pasos = Math.max(4, Math.ceil(Math.abs(ang) / (Math.PI / 12)));
  const pts: Array<[number, number]> = [];
  for (let i = 0; i <= pasos; i++) {
    const theta = inicio + ang * (i / pasos);
    pts.push([cx + r * Math.cos(theta), cy + r * Math.sin(theta)]);
  }
  return pts;
}

function extraerBuclesHatch(e: EntidadDxf, T: Transform): Array<Array<[number, number]>> {
  const bucles: Array<Array<[number, number]>> = [];
  const pairs = e.pairs;
  const idx91 = pairs.findIndex(([k]) => k === 91);
  if (idx91 < 0) return bucles;
  const numLoops = Number(pairs[idx91][1]) || 0;
  let i = idx91 + 1;
  for (let l = 0; l < numLoops && i < pairs.length; l++) {
    while (i < pairs.length && pairs[i][0] !== 92) i++;
    if (i >= pairs.length) break;
    const flags = Number(pairs[i++][1]) || 0;
    const esPolilinea = (flags & 2) !== 0;
    const pts: Array<[number, number]> = [];
    if (esPolilinea) {
      let nVerts = 0;
      while (i < pairs.length && pairs[i][0] !== 93) i++;
      if (i < pairs.length) nVerts = Number(pairs[i++][1]) || 0;
      const verts: Array<{ x: number; y: number; b: number }> = [];
      while (i < pairs.length && verts.length < nVerts) {
        if (pairs[i][0] === 10) {
          const x = Number(pairs[i++][1]) || 0;
          const y = pairs[i]?.[0] === 20 ? Number(pairs[i++][1]) || 0 : 0;
          const b = pairs[i]?.[0] === 42 ? Number(pairs[i++][1]) || 0 : 0;
          verts.push({ x, y, b });
        } else if (pairs[i][0] === 97 || pairs[i][0] === 92 || pairs[i][0] === 75) {
          break;
        } else {
          i++;
        }
      }
      for (let v = 0; v < verts.length; v++) {
        const cur = verts[v];
        const sig = verts[(v + 1) % verts.length];
        if (Math.abs(cur.b) > 1e-6 && verts.length > 1) {
          const arco = muestrearArcoBulge([cur.x, cur.y], [sig.x, sig.y], cur.b);
          for (let k = 0; k < arco.length - 1; k++) pts.push(T(arco[k][0], arco[k][1]));
        } else {
          pts.push(T(cur.x, cur.y));
        }
      }
    } else {
      let nEdges = 0;
      while (i < pairs.length && pairs[i][0] !== 93) i++;
      if (i < pairs.length) nEdges = Number(pairs[i++][1]) || 0;
      for (let edge = 0; edge < nEdges && i < pairs.length; edge++) {
        while (i < pairs.length && pairs[i][0] !== 72 && pairs[i][0] !== 97 && pairs[i][0] !== 92) i++;
        if (i >= pairs.length || pairs[i][0] !== 72) break;
        const tipoEdge = Number(pairs[i++][1]) || 0;
        if (tipoEdge === 1) {
          let x1 = 0, y1 = 0, x2 = 0, y2 = 0;
          while (i < pairs.length && ![72, 97, 92, 75].includes(pairs[i][0])) {
            const [k, v] = pairs[i++];
            if (k === 10) x1 = Number(v) || 0;
            else if (k === 20) y1 = Number(v) || 0;
            else if (k === 11) x2 = Number(v) || 0;
            else if (k === 21) y2 = Number(v) || 0;
          }
          pts.push(T(x1, y1), T(x2, y2));
        } else if (tipoEdge === 2) {
          let cx = 0, cy = 0, r = 0, a0 = 0, a1 = 360, ccw = 1;
          while (i < pairs.length && ![72, 97, 92, 75].includes(pairs[i][0])) {
            const [k, v] = pairs[i++];
            if (k === 10) cx = Number(v) || 0;
            else if (k === 20) cy = Number(v) || 0;
            else if (k === 40) r = Number(v) || 0;
            else if (k === 50) a0 = Number(v) || 0;
            else if (k === 51) a1 = Number(v) || 0;
            else if (k === 73) ccw = Number(v) || 0;
          }
          const desde = ccw ? a0 : 360 - a0;
          const hasta = ccw ? a1 : 360 - a1;
          let barrido = ((hasta - desde) % 360 + 360) % 360 || 360;
          if (!ccw) barrido = -barrido;
          const pasos = Math.max(8, Math.ceil(Math.abs(barrido) / 15));
          for (let s = 0; s <= pasos; s++) {
            const ang = (desde + barrido * (s / pasos)) * Math.PI / 180;
            pts.push(T(cx + r * Math.cos(ang), cy + r * Math.sin(ang)));
          }
        } else {
          // Otros bordes (elipse/spline): recolectar puntos 10/20 hasta el siguiente borde.
          while (i < pairs.length && ![72, 97, 92, 75].includes(pairs[i][0])) {
            if (pairs[i][0] === 10 && pairs[i + 1]?.[0] === 20) {
              pts.push(T(Number(pairs[i][1]) || 0, Number(pairs[i + 1][1]) || 0));
              i += 2;
            } else {
              i++;
            }
          }
        }
      }
    }
    if (pts.length >= 3) bucles.push(pts);
    // Saltar referencias 97/330 del bucle actual.
    while (i < pairs.length && pairs[i][0] !== 92 && pairs[i][0] !== 75) i++;
  }
  return bucles;
}

function cajaPrimitiva(p: Primitiva): Zona {
  if (p.tipo === 'raya') {
    return { x0: Math.min(p.a[0], p.b[0]), x1: Math.max(p.a[0], p.b[0]), y0: Math.min(p.a[1], p.b[1]), y1: Math.max(p.a[1], p.b[1]) };
  }
  if (p.tipo === 'arco') {
    const normal = (a: number) => ((a % 360) + 360) % 360;
    const barrido = p.circulo ? 360 : (normal(p.hasta - p.desde) || 360);
    const angulos = p.circulo ? [0, 90, 180, 270] : [p.desde, p.desde + barrido, ...[0, 90, 180, 270].filter(a => normal(a - p.desde) <= barrido)];
    const pts = angulos.map(a => [p.punto[0] + p.r * Math.cos(a * Math.PI / 180), p.punto[1] + p.r * Math.sin(a * Math.PI / 180)]);
    return { x0: Math.min(...pts.map(q => q[0])), x1: Math.max(...pts.map(q => q[0])), y0: Math.min(...pts.map(q => q[1])), y1: Math.max(...pts.map(q => q[1])) };
  }
  if (p.tipo === 'texto') {
    const m = Math.max(p.h, 0.001);
    return { x0: p.punto[0] - m, x1: p.punto[0] + m, y0: p.punto[1] - m, y1: p.punto[1] + m };
  }
  const pts = p.bucles.flat();
  return { x0: Math.min(...pts.map(q => q[0])), x1: Math.max(...pts.map(q => q[0])), y0: Math.min(...pts.map(q => q[1])), y1: Math.max(...pts.map(q => q[1])) };
}

const enZona = (p: Primitiva, z: Zona) => {
  const b = cajaPrimitiva(p);
  return b.x1 >= z.x0 && b.x0 <= z.x1 && b.y1 >= z.y0 && b.y0 <= z.y1;
};

function transformarPrimitiva(p: Primitiva, T: Transform, escala: number, giroVentana: number): Primitiva {
  if (p.tipo === 'raya') return { ...p, a: T(p.a[0], p.a[1]), b: T(p.b[0], p.b[1]) };
  if (p.tipo === 'arco') {
    return {
      ...p,
      punto: T(p.punto[0], p.punto[1]),
      r: p.r * escala,
      desde: p.circulo ? 0 : p.desde + giroVentana,
      hasta: p.circulo ? 360 : p.hasta + giroVentana
    };
  }
  if (p.tipo === 'texto') {
    return {
      ...p,
      punto: T(p.punto[0], p.punto[1]),
      h: p.h * escala,
      ancho: p.ancho * escala,
      giro: p.giro + giroVentana
    };
  }
  return { ...p, bucles: p.bucles.map(b => b.map(q => T(q[0], q[1]))) };
}

const esc = (s: string) => String(s).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');
const fmt = (n: number) => Number.isFinite(n) ? Number(n.toFixed(4)) : 0;

function construirSvg(primitivas: Primitiva[], zona: Zona, trazo: number, prefijoId: string): string {
  const ancho = Math.max(1, zona.x1 - zona.x0);
  const alto = Math.max(1, zona.y1 - zona.y0);
  const defs: string[] = [];
  const partes: Array<{ recorte: string; cuerpo: string }> = [];
  const recortesDefinidos = new Set<string>();

  for (const [i, p] of primitivas.entries()) {
    let cuerpo = '';
    if (p.tipo === 'raya') {
      if (Math.abs(p.curva) > 1e-6) {
        const largo = Math.hypot(p.b[0] - p.a[0], p.b[1] - p.a[1]);
        const r = largo * (1 + p.curva ** 2) / (4 * Math.abs(p.curva));
        cuerpo = `<path d="M ${fmt(p.a[0])} ${fmt(-p.a[1])} A ${fmt(r)} ${fmt(r)} 0 ${Math.abs(p.curva) > 1 ? 1 : 0} ${p.curva > 0 ? 0 : 1} ${fmt(p.b[0])} ${fmt(-p.b[1])}" fill="none" stroke="${p.color}"/>`;
      } else {
        cuerpo = `<line x1="${fmt(p.a[0])}" y1="${fmt(-p.a[1])}" x2="${fmt(p.b[0])}" y2="${fmt(-p.b[1])}" stroke="${p.color}"/>`;
      }
    } else if (p.tipo === 'arco') {
      const [x, y] = p.punto;
      if (p.circulo || Math.abs(p.hasta - p.desde) >= 359.999) {
        cuerpo = `<circle cx="${fmt(x)}" cy="${fmt(-y)}" r="${fmt(p.r)}" fill="none" stroke="${p.color}"/>`;
      } else {
        const a = p.desde * Math.PI / 180;
        const b = p.hasta * Math.PI / 180;
        const barrido = ((p.hasta - p.desde) % 360 + 360) % 360;
        cuerpo = `<path d="M ${fmt(x + p.r * Math.cos(a))} ${fmt(-y - p.r * Math.sin(a))} A ${fmt(p.r)} ${fmt(p.r)} 0 ${barrido > 180 ? 1 : 0} 0 ${fmt(x + p.r * Math.cos(b))} ${fmt(-y - p.r * Math.sin(b))}" fill="none" stroke="${p.color}"/>`;
      }
    } else if (p.tipo === 'texto') {
      if (!p.valor || p.h <= 0) continue;
      const lineas: string[] = [];
      for (const parrafo of p.valor.split('\n')) {
        let actual = '';
        for (const palabra of parrafo.split(/\s+/)) {
          if (p.ancho > 0 && actual && anchoArial(`${actual} ${palabra}`, p.h) > p.ancho) {
            lineas.push(actual);
            actual = palabra;
          } else {
            actual += (actual ? ' ' : '') + palabra;
          }
        }
        lineas.push(actual);
      }
      const ancla = Math.max(1, Math.min(9, Math.trunc(p.ancla) || 7));
      const columna = (ancla - 1) % 3;
      const fila = Math.floor((ancla - 1) / 3);
      const h = p.h;
      const base = fila === 0 ? h : fila === 1 ? -(lineas.length - 1) * h * 0.7 + h * 0.36 : -(lineas.length - 1) * h * 1.4;
      const escala = p.escalaX && Math.abs(p.escalaX - 1) > 1e-4 ? ` scale(${fmt(p.escalaX)} 1)` : '';
      const rot = Math.abs(p.giro) > 1e-4 ? ` rotate(${fmt(-p.giro)})` : '';
      const tspans = lineas.map((t, j) => `<tspan x="0" y="${fmt(base + j * h * 1.4)}">${esc(t)}</tspan>`).join('');
      cuerpo = `<g transform="translate(${fmt(p.punto[0])} ${fmt(-p.punto[1])})${rot}${escala}"><text fill="${p.color}" stroke="none" font-family="Arial, Helvetica, sans-serif" font-size="${fmt(h / 0.716)}" text-anchor="${['start', 'middle', 'end'][columna]}">${tspans}</text></g>`;
    } else if (p.tipo === 'relleno') {
      if (!p.bucles.length) continue;
      if (p.solido) {
        const d = p.bucles.map(b => `M ${b.map(([x, y]) => `${fmt(x)} ${fmt(-y)}`).join(' L ')} Z`).join(' ');
        cuerpo = `<path d="${d}" fill="${p.color}" fill-rule="evenodd" stroke="none"/>`;
      } else {
        const dClip = p.bucles.map(b => `M ${b.map(([x, y]) => `${fmt(x)} ${fmt(-y)}`).join(' L ')} Z`).join(' ');
        const todos = p.bucles.flat();
        const xs = todos.map(q => q[0]), ys = todos.map(q => -q[1]);
        const paso = Math.max(trazo * 5, 0.5);
        const [x0, x1, y0, y1] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
        let d = '';
        for (let k = Math.floor((x0 - y1) / paso) * paso; k <= x1 - y0; k += paso) {
          d += `M${fmt(k + y0)} ${fmt(y0)}L${fmt(k + y1)} ${fmt(y1)}`;
        }
        const cid = `${prefijoId}-h${i}`;
        defs.push(`<clipPath id="${cid}"><path d="${dClip}" clip-rule="evenodd"/></clipPath>`);
        cuerpo = `<path d="${d}" clip-path="url(#${cid})" fill="none" stroke="${p.color}" stroke-width="${fmt(trazo / 2)}"/>`;
      }
    }
    if (!cuerpo) continue;
    let recorte = '';
    if (p.recorte) {
      const v = p.recorte;
      recorte = `${prefijoId}-v${v.id}`;
      if (!recortesDefinidos.has(recorte)) {
        recortesDefinidos.add(recorte);
        defs.push(`<clipPath id="${recorte}"><rect x="${fmt(v.centro[0] - v.ancho / 2)}" y="${fmt(-v.centro[1] - v.alto / 2)}" width="${fmt(v.ancho)}" height="${fmt(v.alto)}"/></clipPath>`);
      }
    }
    partes.push({ recorte, cuerpo });
  }

  let cuerpo = '';
  for (let i = 0; i < partes.length;) {
    let j = i;
    while (j < partes.length && partes[j].recorte === partes[i].recorte) j++;
    const grupo = partes.slice(i, j).map(q => q.cuerpo).join('');
    cuerpo += partes[i].recorte ? `<g clip-path="url(#${partes[i].recorte})">${grupo}</g>` : grupo;
    i = j;
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${fmt(ancho)}mm" height="${fmt(alto)}mm" viewBox="${fmt(zona.x0)} ${fmt(-zona.y1)} ${fmt(ancho)} ${fmt(alto)}" stroke-width="${fmt(trazo)}" stroke-linecap="round" stroke-linejoin="round"><defs>${defs.join('')}</defs><rect x="${fmt(zona.x0)}" y="${fmt(-zona.y1)}" width="${fmt(ancho)}" height="${fmt(alto)}" fill="#ffffff"/>${cuerpo}</svg>`;
}

/**
 * Renderiza todas las presentaciones (layouts de espacio papel) de un DXF en páginas SVG sobre fondo blanco.
 * Si el DXF no tiene presentaciones de papel, devuelve una página «Modelo» encuadrada a su dibujo.
 */
export function renderizarPaginasDxf(entrada: string | Uint8Array): PaginaCadSvg[] {
  const src = typeof entrada === 'string' ? entrada : textoDxf(entrada);
  const dxf = leerDxf(src);

  const capas = new Map<string, CapaInfo>();
  for (const r of dxf.sections.TABLES ?? []) {
    if (r.type !== 'LAYER') continue;
    const colorRaw = number(r, 62, 7);
    const flags = number(r, 70, 0);
    const tc = tieneCodigo(r, 420) ? number(r, 420) : undefined;
    capas.set(value(r, 2), {
      color: Math.abs(colorRaw),
      trueColor: tc,
      imprime: number(r, 290, 1) !== 0,
      visible: colorRaw > 0 && !(flags & 1),
      handle: value(r, 5)
    });
  }

  const bloques = new Map<string, { base: [number, number]; entidades: EntidadDxf[] }>();
  let bloqueActual: { base: [number, number]; entidades: EntidadDxf[] } | undefined;
  for (const r of dxf.sections.BLOCKS ?? []) {
    if (r.type === 'BLOCK') {
      bloqueActual = { base: [number(r, 10, 0), number(r, 20, 0)], entidades: [] };
      bloques.set(value(r, 2), bloqueActual);
    } else if (r.type === 'ENDBLK') {
      bloqueActual = undefined;
    } else {
      bloqueActual?.entidades.push(r);
    }
  }

  const sinDibujar: Record<string, number> = {};
  const contarDesconocida = (tipo: string) => {
    if (!DIBUJADAS.has(tipo) && !NO_SE_IMPRIMEN.has(tipo)) sinDibujar[tipo] = (sinDibujar[tipo] ?? 0) + 1;
  };

  const resolverColor = (e: EntidadDxf, capa: string, colorPadre?: string): string => {
    if (tieneCodigo(e, 420)) return colorSobreBlanco(7, number(e, 420));
    const aci = number(e, 62, 256);
    if (aci === 0) {
      if (colorPadre) return colorPadre;
      const c = capas.get(capa);
      return colorSobreBlanco(c?.color ?? 7, c?.trueColor);
    }
    if (aci === 256) {
      const c = capas.get(capa);
      return colorSobreBlanco(c?.color ?? 7, c?.trueColor);
    }
    return colorSobreBlanco(aci);
  };

  const extraerPrimitivas = (
    regs: EntidadDxf[],
    T: Transform = IDENTIDAD,
    capaPadre = '',
    profundidad = 0,
    colorPadre?: string,
    giroPadre = 0,
    espejoPadre = false
  ): Primitiva[] => {
    if (profundidad > 16) return [];
    const salida: Primitiva[] = [];
    for (let idx = 0; idx < regs.length; idx++) {
      const r = regs[idx];
      if (r.type === 'VIEWPORT' || r.type === 'SEQEND' || r.type === 'ATTDEF' || r.type === 'POINT') continue;
      if (r.type === 'ATTRIB' && (number(r, 70, 0) & 1)) continue;

      const capaRaw = value(r, 8);
      const capa = (!capaRaw || capaRaw === '0') && capaPadre ? capaPadre : (capaRaw || capaPadre || '0');
      const color = resolverColor(r, capa, colorPadre);
      const P = (cx = 10, cy = 20): [number, number] => T(number(r, cx, 0), number(r, cy, 0));
      const agregarSegmento = (a: [number, number], b: [number, number], curva = 0) => {
        if (Math.hypot(a[0] - b[0], a[1] - b[1]) < 1e-10) return;
        salida.push({ tipo: 'raya', capa, color, a, b, curva: espejoPadre ? -curva : curva });
      };

      if (r.type === 'LINE') {
        agregarSegmento(P(10, 20), P(11, 21));
      } else if (r.type === 'LWPOLYLINE') {
        const pts = verticesLwpolyline(r);
        const cerrada = (number(r, 70, 0) & 1) !== 0;
        for (let i = 0; i < pts.length - (cerrada ? 0 : 1); i++) {
          const a = pts[i], b = pts[(i + 1) % pts.length];
          agregarSegmento(T(a.x, a.y), T(b.x, b.y), a.curva);
        }
      } else if (r.type === 'POLYLINE') {
        const cerrada = (number(r, 70, 0) & 1) !== 0;
        const pts: Array<{ x: number; y: number; curva: number }> = [];
        while (idx + 1 < regs.length && regs[idx + 1].type === 'VERTEX') {
          const v = regs[++idx];
          pts.push({ x: number(v, 10, 0), y: number(v, 20, 0), curva: number(v, 42, 0) });
        }
        if (regs[idx + 1]?.type === 'SEQEND') idx++;
        for (let i = 0; i < pts.length - (cerrada ? 0 : 1); i++) {
          const a = pts[i], b = pts[(i + 1) % pts.length];
          agregarSegmento(T(a.x, a.y), T(b.x, b.y), a.curva);
        }
      } else if (r.type === 'ARC' || r.type === 'CIRCLE') {
        const cx = number(r, 10, 0), cy = number(r, 20, 0), rad = number(r, 40, 0);
        const centro = T(cx, cy);
        const borde = T(cx + rad, cy);
        const rT = Math.hypot(borde[0] - centro[0], borde[1] - centro[1]);
        if (rT <= 1e-10) continue;
        if (r.type === 'CIRCLE') {
          salida.push({ tipo: 'arco', capa, color, punto: centro, r: rT, desde: 0, hasta: 360, circulo: true });
        } else {
          const d0 = number(r, 50, 0) * Math.PI / 180;
          const d1 = number(r, 51, 360) * Math.PI / 180;
          const p0 = T(cx + rad * Math.cos(d0), cy + rad * Math.sin(d0));
          const p1 = T(cx + rad * Math.cos(d1), cy + rad * Math.sin(d1));
          let desde = Math.atan2(p0[1] - centro[1], p0[0] - centro[0]) * 180 / Math.PI;
          let hasta = Math.atan2(p1[1] - centro[1], p1[0] - centro[0]) * 180 / Math.PI;
          if (espejoPadre) [desde, hasta] = [hasta, desde];
          salida.push({ tipo: 'arco', capa, color, punto: centro, r: rT, desde, hasta, circulo: false });
        }
      } else if (r.type === 'ELLIPSE') {
        const pts = muestrearElipse(r);
        for (let i = 1; i < pts.length; i++) agregarSegmento(T(pts[i - 1][0], pts[i - 1][1]), T(pts[i][0], pts[i][1]));
      } else if (r.type === 'SPLINE') {
        const pts = puntosSpline({ pares: r.pairs }) as Array<[number, number]>;
        for (let i = 1; i < pts.length; i++) agregarSegmento(T(pts[i - 1][0], pts[i - 1][1]), T(pts[i][0], pts[i][1]));
      } else if (r.type === 'TEXT' || r.type === 'MTEXT' || r.type === 'ATTRIB') {
        const h72 = number(r, 72, 0);
        const vAlign = r.type === 'ATTRIB'
          ? (tieneCodigo(r, 74) ? number(r, 74, 0) : number(r, 73, 0))
          : number(r, 73, 0);
        const alineado = r.type !== 'MTEXT' && (h72 !== 0 || vAlign !== 0) && h72 !== 3 && h72 !== 5;
        const punto = alineado ? P(11, 21) : P(10, 20);
        const origen = P(10, 20);
        const hRaw = number(r, 40, 0);
        const q = T(number(r, 10, 0), number(r, 20, 0) + hRaw);
        const h = Math.hypot(q[0] - origen[0], q[1] - origen[1]);
        const giro = giroEntidadTexto(r) + giroPadre;
        const anclaTexto = (vAlign === 3 ? 0 : vAlign === 2 || h72 === 4 ? 3 : 6) + (h72 === 2 ? 3 : h72 === 1 || h72 === 4 ? 2 : 1);
        const textoCrudo = (r.type === 'MTEXT' ? values(r, 3).join('') : '') + value(r, 1, '');
        const escalaX = r.type === 'MTEXT' ? 1 : (number(r, 41, 1) || 1);
        const anchoCaja = r.type === 'MTEXT'
          ? (() => {
            const w = number(r, 41, 0);
            if (!w) return 0;
            const qw = T(number(r, 10, 0) + w, number(r, 20, 0));
            return Math.hypot(qw[0] - origen[0], qw[1] - origen[1]);
          })()
          : 0;
        salida.push({
          tipo: 'texto',
          capa,
          color,
          punto,
          h,
          ancho: anchoCaja,
          escalaX,
          giro,
          ancla: r.type === 'MTEXT' ? number(r, 71, 1) : alineado ? anclaTexto : 7,
          valor: limpiarTextoCad(textoCrudo)
        });
      } else if (r.type === 'INSERT') {
        const bloque = bloques.get(value(r, 2));
        if (!bloque) continue;
        const rot = number(r, 50, 0);
        const a = rot * Math.PI / 180;
        const c = Math.cos(a), s = Math.sin(a);
        const sx = number(r, 41, 1) * (number(r, 230, 1) < 0 ? -1 : 1);
        const sy = number(r, 42, 1);
        const ix = number(r, 10, 0), iy = number(r, 20, 0);
        const [bx, by] = bloque.base;
        const t: Transform = (x, y) => {
          const u = (x - bx) * sx, v = (y - by) * sy;
          return T(ix + u * c - v * s, iy + u * s + v * c);
        };
        salida.push(...extraerPrimitivas(bloque.entidades, t, capa, profundidad + 1, color, giroPadre + rot, espejoPadre !== (sx * sy < 0)));
      } else if (r.type === 'DIMENSION') {
        const bloque = bloques.get(value(r, 2));
        if (bloque) salida.push(...extraerPrimitivas(bloque.entidades, T, capa, profundidad + 1, color, giroPadre, espejoPadre));
      } else if (r.type === 'SOLID' || r.type === 'TRACE') {
        // En DXF, los vértices de SOLID/TRACE van en orden 0-1-3-2 para formar un cuadrilátero sin cruce.
        const pts: Array<[number, number]> = [P(10, 20), P(11, 21), P(13, 23), P(12, 22)];
        salida.push({ tipo: 'relleno', capa, color, bucles: [pts], solido: true });
      } else if (r.type === 'HATCH') {
        const bucles = extraerBuclesHatch(r, T);
        if (bucles.length) salida.push({ tipo: 'relleno', capa, color, bucles, solido: number(r, 70, 0) === 1 });
      } else {
        contarDesconocida(r.type);
      }
    }
    return salida;
  };

  const imprime = (p: Primitiva) => {
    const c = capas.get(p.capa);
    return c?.imprime !== false && c?.visible !== false;
  };

  const capaPorHandle = new Map<string, string>();
  for (const [nombre, info] of capas) if (info.handle) capaPorHandle.set(info.handle, nombre);

  const ventanasDe = (regs: EntidadDxf[], handleHoja: string): VentanaInfo[] =>
    regs
      .filter(r => r.type === 'VIEWPORT' && number(r, 69, 0) > 1 && value(r, 5) !== handleHoja && number(r, 68, 1) !== 0)
      .map(r => {
        const altoVista = number(r, 45, 0);
        const ancho = number(r, 40, 0);
        const alto = number(r, 41, 0);
        const escala = altoVista > 0 ? alto / altoVista : 0;
        const centro: [number, number] = [number(r, 10, 0), number(r, 20, 0)];
        const giro = number(r, 51, 0);
        const a = giro * Math.PI / 180;
        const c = Math.cos(a), s = Math.sin(a);
        const vx = number(r, 12, 0), vy = number(r, 22, 0);
        const modelo: [number, number] = [number(r, 17, 0) + vx * c + vy * s, number(r, 27, 0) - vx * s + vy * c];
        const mx = escala > 0 ? ancho / escala / 2 : 0;
        const my = escala > 0 ? alto / escala / 2 : 0;
        const ex = Math.abs(mx * c) + Math.abs(my * s);
        const ey = Math.abs(mx * s) + Math.abs(my * c);
        const congeladas = new Set(values(r, 341).map(h => capaPorHandle.get(h)).filter((x): x is string => Boolean(x)));
        return {
          id: number(r, 69, 0),
          escala,
          centro,
          modelo,
          ancho,
          alto,
          giro,
          congeladas,
          zona: { x0: modelo[0] - ex, x1: modelo[0] + ex, y0: modelo[1] - ey, y1: modelo[1] + ey },
          handle: value(r, 5)
        };
      })
      .filter(v => v.escala > 0 && !(v.ancho >= 250 && v.alto >= 180));

  const modelo = extraerPrimitivas(dxf.entities.filter(r => value(r, 67) !== '1')).filter(imprime);

  const registrosBloques = new Map<string, string>();
  for (const r of dxf.sections.TABLES ?? []) {
    if (r.type === 'BLOCK_RECORD') registrosBloques.set(value(r, 5), value(r, 2));
  }

  const hojas = (dxf.sections.OBJECTS ?? [])
    .filter(r => r.type === 'LAYOUT')
    .map(r => {
      const bloque = registrosBloques.get(values(r, 330).at(-1) ?? '') ?? '';
      const limMinX = number(r, 10, 0), limMinY = number(r, 20, 0);
      const limMaxX = number(r, 11, 297), limMaxY = number(r, 21, 210);
      const zonaValida = limMaxX - limMinX >= 50 && limMaxY - limMinY >= 50;
      return {
        nombre: values(r, 1).at(-1) || 'Presentación',
        orden: number(r, 71, 0),
        bloque,
        hoja: value(r, 331),
        zona: zonaValida ? { x0: limMinX, x1: limMaxX, y0: limMinY, y1: limMaxY } : { x0: 0, x1: 297, y0: 0, y1: 210 }
      };
    })
    .filter(h => /^\*paper_space/i.test(h.bloque))
    .sort((a, b) => a.orden - b.orden);

  if (hojas.length === 0) {
    // Fallback para DXF sin presentaciones de espacio papel: encuadrar el modelo.
    const cajas = modelo.map(cajaPrimitiva);
    const zona: Zona = cajas.length
      ? (() => {
        const x0 = Math.min(...cajas.map(c => c.x0));
        const x1 = Math.max(...cajas.map(c => c.x1));
        const y0 = Math.min(...cajas.map(c => c.y0));
        const y1 = Math.max(...cajas.map(c => c.y1));
        const m = Math.max((x1 - x0) * 0.05, (y1 - y0) * 0.05, 0.1);
        return { x0: x0 - m, x1: x1 + m, y0: y0 - m, y1: y1 + m };
      })()
      : { x0: 0, x1: 297, y0: 0, y1: 210 };
    const trazo = Math.max((zona.x1 - zona.x0) / 1400, 0.002);
    return [{
      nombre: 'Modelo',
      anchoMm: 297,
      altoMm: 210,
      svg: construirSvg(modelo, zona, trazo, 'm0'),
      sinDibujar
    }];
  }

  return hojas.map((h, indice) => {
    const regs = /^\*paper_space$/i.test(h.bloque)
      ? dxf.entities.filter(r => value(r, 67) === '1')
      : (bloques.get(h.bloque)?.entidades ?? []);
    const ventanas = ventanasDe(regs, h.hoja);
    const papel = extraerPrimitivas(regs.filter(r => r.type !== 'VIEWPORT')).filter(imprime);
    const primitivas: Primitiva[] = [...papel];

    for (const v of ventanas) {
      const a = v.giro * Math.PI / 180;
      const c = Math.cos(a), s = Math.sin(a);
      const T: Transform = (x, y) => {
        const u = x - v.modelo[0], w = y - v.modelo[1];
        return [v.centro[0] + (u * c - w * s) * v.escala, v.centro[1] + (u * s + w * c) * v.escala];
      };
      for (const p of modelo) {
        if (v.congeladas.has(p.capa)) continue;
        if (!enZona(p, v.zona)) continue;
        primitivas.push({ ...transformarPrimitiva(p, T, v.escala, v.giro), recorte: v });
      }
    }

    const anchoMm = Math.round((h.zona.x1 - h.zona.x0) * 10) / 10;
    const altoMm = Math.round((h.zona.y1 - h.zona.y0) * 10) / 10;
    return {
      nombre: h.nombre,
      anchoMm,
      altoMm,
      svg: construirSvg(primitivas, h.zona, 0.2, `p${indice}`),
      sinDibujar
    };
  });
}
