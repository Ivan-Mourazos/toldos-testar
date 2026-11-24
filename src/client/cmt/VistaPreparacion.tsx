import type { CSSProperties } from 'react';
import { barridoArco, cajaPieza } from '../../cmt/preparacion/marco.ts';
import type { ResultadoPreparacion } from '../../cmt/preparacion/index.ts';
import type { Caja } from '../../cmt/preparacion/tipos.ts';
import type { GrupoSolape } from '../../cmt/preparacion/solapes.ts';
import { caracteresCad } from '../../cmt/caracteres-cad.ts';
import { legible } from '../../cmt/colorAci.ts';
import { ETIQUETAS } from './Pendientes';

type PiezaVista = ResultadoPreparacion['vista'][number];
const RAD = Math.PI / 180;
const estilos: Record<string, string> = {
  DISCO1: 'disco1', DISCO2: 'disco2', CUTTER: 'cutter', ROTULADOR: 'rotulador', taladro: 'taladro', texto: 'texto',
};
const estilo = (capa: string) => Object.hasOwn(estilos, capa) ? estilos[capa] : 'desconocida';

/** El color que tiene en el plano. DISCO1 va siempre con la tinta (negro en claro, blanco en oscuro), como pidió Iván el 24/11/2026. */
const color = (p: PiezaVista) => p.cruza || p.capa === 'DISCO1' ? undefined : p.color;
/** Lleva el color en las dos versiones; la hoja de estilos (cmt-plano) usa la del modo en que esté la web. */
const pintura = (c?: string) => c ? { '--cmt-claro': legible(c, 'claro'), '--cmt-oscuro': legible(c, 'oscuro') } as CSSProperties : undefined;
const clase = (base: string, c?: string) => c ? `${base} cmt-plano` : base;

type TextoVista = Extract<PiezaVista, { tipo: 'texto' }>;
/** En el CAD la altura (40) es la de la «H»; en Arial la «H» mide 0,716 del cuerpo de letra. */
const ALTO_MAYUSCULA = 0.716;
const ALINEACIONES: Record<number, 'start' | 'middle' | 'end'> = { 1: 'middle', 2: 'end', 4: 'middle' };
const BASES: Record<number, 'text-after-edge' | 'central' | 'hanging'> ={ 1: 'text-after-edge', 2: 'central', 3: 'hanging' };

/** Coloca el texto como en el CMT (textos-cad.ts): punto de inserción, justificación, giro y factor de anchura. */
export function textoVista(p: TextoVista) {
  const n = (codigo: number, defecto = 0) => {
    const v = Number(p.pares.find(([c]) => c === codigo)?.[1]);
    return Number.isFinite(v) ? v : defecto;
  };
  const h = n(72), v = n(73), ajustado = (h === 3 || h === 5) && v === 0;
  const segundo = (h || v) && !ajustado;
  const x = segundo ? n(11) : n(10), y = segundo ? n(21) : n(20);
  const longitud = ajustado ? Math.hypot(n(11) - n(10), n(21) - n(20)) : 0;
  const giro = longitud ? Math.atan2(n(21) - n(20), n(11) - n(10)) / RAD : n(50);
  return {
    x, y: -y, tamano: n(40) / ALTO_MAYUSCULA, giro: giro ? -giro : 0, ancho: n(41, 1) || 1,
    texto: caracteresCad(p.pares.filter(([c]) => c === 1).map(([, t]) => t).join('')),
    alineacion: ALINEACIONES[h] ?? 'start', base: h === 4 ? 'central' as const : BASES[v] ?? 'alphabetic' as const,
    ...(longitud ? { longitud } : {}),
  };
}

function letra(p: TextoVista) {
  const t = textoVista(p);
  if (!t.texto.trim() || !(t.tamano > 0)) return null;
  const giro = t.giro ? ` rotate(${t.giro})` : '';
  const ancho = t.ancho !== 1 ? ` scale(${t.ancho} 1)` : '';
  const ajuste = t.longitud ? { textLength: t.longitud / t.ancho, lengthAdjust: 'spacingAndGlyphs' } : {};
  return <text className={clase(`cmt-letra cmt-${p.cruza ? 'cruce' : estilo(p.capa)}`, color(p))} transform={`translate(${t.x} ${t.y})${giro}${ancho}`}
    fontSize={t.tamano} textAnchor={t.alineacion} dominantBaseline={t.base} style={pintura(color(p))} {...ajuste}>{t.texto}</text>;
}

function trazo(p: PiezaVista) {
  const props = { className: clase(`cmt-trazo cmt-${p.cruza ? 'cruce' : estilo(p.capa)}`, color(p)), vectorEffect: 'non-scaling-stroke', style: pintura(color(p)) };
  if (p.tipo === 'linea') return <line {...props} x1={p.a.x} y1={-p.a.y} x2={p.b.x} y2={-p.b.y} />;
  if (p.tipo === 'texto') return letra(p);
  const barrido = barridoArco(p);
  if (barrido === 360) return <circle {...props} cx={p.c.x} cy={-p.c.y} r={p.r} />;
  const punto = (g: number) => `${p.c.x + p.r * Math.cos(g * RAD)} ${-p.c.y - p.r * Math.sin(g * RAD)}`;
  return <path {...props} d={`M ${punto(p.desde)} A ${p.r} ${p.r} 0 ${barrido > 180 ? 1 : 0} 0 ${punto(p.hasta)}`} />;
}

function limites(cajas: Caja[]): Caja {
  return cajas.reduce((a, b) => ({
    x0: Math.min(a.x0, b.x0), y0: Math.min(a.y0, b.y0),
    x1: Math.max(a.x1, b.x1), y1: Math.max(a.y1, b.y1),
  }));
}

function rectangulo(c: Caja, min = 0) {
  return { x: c.x0, y: -c.y1, width: Math.max(min, c.x1 - c.x0), height: Math.max(min, c.y1 - c.y0), vectorEffect: 'non-scaling-stroke' };
}

interface Props {
  vista: PiezaVista[];
  marcos?: Caja[];
  marco?: number;
  zonas?: GrupoSolape[];
}

export function VistaPreparacion({ vista, marcos = [], marco, zonas = [] }: Props) {
  const cajas = [...vista.map(cajaPieza), ...marcos];
  if (!cajas.length) return null;
  const c = limites(cajas);
  const margen = Math.max(c.x1 - c.x0, c.y1 - c.y0, 10) * 0.05;
  const capas = new Map<string, { nombre: string; color?: string }>();
  for (const p of vista) {
    const clase = estilo(p.capa);
    if (p.cruza || capas.get(clase)?.color) continue;
    capas.set(clase, { nombre: clase === 'desconocida' ? 'Capa pendiente' : ETIQUETAS[p.capa as keyof typeof ETIQUETAS], color: color(p) });
  }
  if (vista.some(p => p.cruza)) capas.set('cruce', { nombre: 'Cruza el marco' });
  if (zonas.length) capas.set('solape', { nombre: 'Solape' });
  return <figure className="cmt-vista-corte">
    <figcaption>Vista previa del corte</figcaption>
    <svg role="img" aria-label="Geometría del corte en milímetros" viewBox={`${c.x0 - margen} ${-c.y1 - margen} ${c.x1 - c.x0 + 2 * margen} ${c.y1 - c.y0 + 2 * margen}`}>
      {marcos.map((m, i) => <rect key={i} {...rectangulo(m)}
        className={`cmt-marco${marco === i ? ' cmt-marco-elegido' : ''}`} />)}
      {vista.map((p, i) => <g key={`${p.id}-${i}`}>{trazo(p)}</g>)}
      {zonas.flatMap(({ clave, zonas: cajas }) => cajas.map((m, i) =>
        <rect key={`${clave}-${i}`} {...rectangulo(m, margen * 0.035)} className="cmt-zona" />))}
    </svg>
    {!!capas.size && <ul aria-label="Colores de la vista previa">
      {[...capas].map(([nombreClase, { nombre, color }]) => <li key={nombreClase}><i className={clase(`cmt-${nombreClase}`, color)} style={pintura(color)} aria-hidden="true" />{nombre}</li>)}
    </ul>}
  </figure>;
}
