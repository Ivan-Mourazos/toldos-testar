import type { CSSProperties } from 'react';
import { barridoArco, cajaPieza } from '../../cmt/preparacion/marco.ts';
import type { ResultadoPreparacion } from '../../cmt/preparacion/index.ts';
import type { Caja } from '../../cmt/preparacion/tipos.ts';
import type { CotaVista } from '../../cmt/preparacion/lonasCorte.ts';
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

/**
 * Cota del bloque del corte (Iván, 25/11/2026): la misma que lleva el plano, con su número, pero dibujada
 * a un tamaño que se lea en la pantalla. La letra va en proporción a la vista, no a la del CAD.
 */
function geometriaCota(c: CotaVista, letra: number, empuje = 0) {
  const x = c.eje === 'x';
  const lado = (x ? c.linea.y - (c.a.y + c.b.y) / 2 : c.linea.x - (c.a.x + c.b.x) / 2) >= 0 ? 1 : -1;
  const pasa = letra * 0.3, hueco = letra * 0.75, raya = letra * 0.3;
  // `empuje`: la cota se aparta hacia fuera si su número pisa un texto del plano u otra cota.
  const linea = x ? { x: c.linea.x, y: c.linea.y + lado * empuje } : { x: c.linea.x + lado * empuje, y: c.linea.y };
  const [p, q] = x ? [{ x: c.a.x, y: linea.y }, { x: c.b.x, y: linea.y }] : [{ x: linea.x, y: c.a.y }, { x: linea.x, y: c.b.y }];
  const extension = (desde: { x: number; y: number }, hasta: { x: number; y: number }) => x
    ? { a: desde, b: { x: hasta.x, y: hasta.y + lado * pasa } } : { a: desde, b: { x: hasta.x + lado * pasa, y: hasta.y } };
  const centro = x ? { x: (p.x + q.x) / 2, y: linea.y + lado * hueco } : { x: linea.x + lado * hueco, y: (p.y + q.y) / 2 };
  const largo = c.texto.length * letra * 0.6;
  const cajaNumero: Caja = x
    ? { x0: centro.x - largo / 2, x1: centro.x + largo / 2, y0: centro.y - letra / 2, y1: centro.y + letra / 2 }
    : { x0: centro.x - letra / 2, x1: centro.x + letra / 2, y0: centro.y - largo / 2, y1: centro.y + largo / 2 };
  const caja: Caja = x
    ? { x0: Math.min(p.x, q.x, centro.x - largo / 2), x1: Math.max(p.x, q.x, centro.x + largo / 2), y0: Math.min(c.a.y, c.b.y, centro.y - letra / 2), y1: Math.max(c.a.y, c.b.y, centro.y + letra / 2) }
    : { y0: Math.min(p.y, q.y, centro.y - largo / 2), y1: Math.max(p.y, q.y, centro.y + largo / 2), x0: Math.min(c.a.x, c.b.x, centro.x - letra / 2), x1: Math.max(c.a.x, c.b.x, centro.x + letra / 2) };
  // Trazo oblicuo en cada extremo, como las cotas de arquitectura del CAD.
  const marca = (m: { x: number; y: number }) => ({ a: { x: m.x - raya, y: m.y - raya }, b: { x: m.x + raya, y: m.y + raya } });
  return { lineas: [{ a: p, b: q }, extension(c.a, p), extension(c.b, q), marca(p), marca(q)], centro, caja, cajaNumero };
}

type GeometriaCota = ReturnType<typeof geometriaCota>;
const chocan = (a: Caja, b: Caja) => a.x0 < b.x1 && b.x0 < a.x1 && a.y0 < b.y1 && b.y0 < a.y1;

/** Lo que ocupa un texto del plano, en mm (aproximado: 0,6 de la altura por letra), girado si va girado. */
function cajaTexto(p: TextoVista): Caja | null {
  const t = textoVista(p);
  if (!t.texto.trim() || !(t.tamano > 0)) return null;
  const ancho = t.longitud ?? t.texto.length * t.tamano * 0.55 * t.ancho;
  const x0 = t.alineacion === 'middle' ? -ancho / 2 : t.alineacion === 'end' ? -ancho : 0;
  const y0 = t.base === 'central' ? -t.tamano / 2 : t.base === 'hanging' ? 0 : -t.tamano * 0.8;
  const giro = (t.giro || 0) * RAD;
  const esquinas = [[x0, y0], [x0 + ancho, y0], [x0, y0 + t.tamano], [x0 + ancho, y0 + t.tamano]]
    .map(([u, v]) => [t.x + u * Math.cos(giro) - v * Math.sin(giro), t.y + u * Math.sin(giro) + v * Math.cos(giro)]);
  // En pantalla y va hacia abajo: se vuelve a las coordenadas del plano.
  const xs = esquinas.map(e => e[0]), ys = esquinas.map(e => -e[1]);
  return { x0: Math.min(...xs), x1: Math.max(...xs), y0: Math.min(...ys), y1: Math.max(...ys) };
}

/**
 * Coloca las cotas ordenadas (Iván, 26/11/2026: «las cotas se mezclan con textos… iguala textos y posiciones para que
 * se vea ordenado»): todas con la misma letra, en su lado del plano, y apartadas hacia fuera si el número pisa algo.
 */
function colocarCotas(cotas: CotaVista[], vista: PiezaVista[], letra: number): GeometriaCota[] {
  // Los textos y las rayas del corte: el número no puede caer encima de nada.
  const ocupado = vista.flatMap(p => p.tipo === 'texto' ? [cajaTexto(p)].filter((c): c is Caja => c !== null) : [cajaPieza(p)]);
  return cotas.map(c => {
    const libre = (g: GeometriaCota) => !ocupado.some(o => chocan(o, g.cajaNumero));
    let g = geometriaCota(c, letra);
    for (let paso = 1; paso <= 10 && !libre(g); paso++) {
      const otra = geometriaCota(c, letra, paso * letra * 0.5);
      if (libre(otra)) g = otra;
    }
    ocupado.push(g.cajaNumero);
    return g;
  });
}

function cota(c: CotaVista, g: GeometriaCota, letra: number, i: number) {
  return <g key={`cota-${i}`} className="cmt-cota">
    {g.lineas.map((l, j) => <line key={j} x1={l.a.x} y1={-l.a.y} x2={l.b.x} y2={-l.b.y} vectorEffect="non-scaling-stroke" />)}
    <text className="cmt-cota-texto" transform={`translate(${g.centro.x} ${-g.centro.y})${c.eje === 'y' ? ' rotate(-90)' : ''}`}
      fontSize={letra} textAnchor="middle" dominantBaseline="central">{c.texto}</text>
  </g>;
}

interface Props {
  vista: PiezaVista[];
  cotas?: CotaVista[];
  marcos?: Caja[];
  marco?: number;
  zonas?: GrupoSolape[];
}

export function VistaPreparacion({ vista, cotas = [], marcos = [], marco, zonas = [] }: Props) {
  const cajas = [...vista.map(cajaPieza), ...marcos];
  if (!cajas.length) return null;
  const pieza = limites(cajas);
  const letra = Math.max(pieza.x1 - pieza.x0, pieza.y1 - pieza.y0, 10) * 0.03;
  const colocadas = colocarCotas(cotas, vista, letra);
  const c = limites([pieza, ...colocadas.map(g => g.caja)]);
  const margen = Math.max(c.x1 - c.x0, c.y1 - c.y0, 10) * 0.05;
  const capas = new Map<string, { nombre: string; color?: string }>();
  for (const p of vista) {
    const clase = estilo(p.capa);
    if (p.cruza || capas.get(clase)?.color) continue;
    capas.set(clase, { nombre: clase === 'desconocida' ? 'Capa pendiente' : ETIQUETAS[p.capa as keyof typeof ETIQUETAS], color: color(p) });
  }
  if (vista.some(p => p.cruza)) capas.set('cruce', { nombre: 'Cruza el marco' });
  if (zonas.length) capas.set('solape', { nombre: 'Solape' });
  if (cotas.length) capas.set('cota', { nombre: 'Cota' });
  return <figure className="cmt-vista-corte">
    <figcaption>Vista previa del corte</figcaption>
    <svg role="img" aria-label="Geometría del corte en milímetros" viewBox={`${c.x0 - margen} ${-c.y1 - margen} ${c.x1 - c.x0 + 2 * margen} ${c.y1 - c.y0 + 2 * margen}`}>
      {marcos.map((m, i) => <rect key={i} {...rectangulo(m)}
        className={`cmt-marco${marco === i ? ' cmt-marco-elegido' : ''}`} />)}
      {vista.map((p, i) => <g key={`${p.id}-${i}`}>{trazo(p)}</g>)}
      {cotas.map((x, i) => cota(x, colocadas[i], letra, i))}
      {zonas.flatMap(({ clave, zonas: cajas }) => cajas.map((m, i) =>
        <rect key={`${clave}-${i}`} {...rectangulo(m, margen * 0.035)} className="cmt-zona" />))}
    </svg>
    {!!capas.size && <ul aria-label="Colores de la vista previa">
      {[...capas].map(([nombreClase, { nombre, color }]) => <li key={nombreClase}><i className={clase(`cmt-${nombreClase}`, color)} style={pintura(color)} aria-hidden="true" />{nombre}</li>)}
    </ul>}
  </figure>;
}
