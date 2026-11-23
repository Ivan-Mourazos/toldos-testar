import { barridoArco, cajaPieza } from '../../cmt/preparacion/marco.ts';
import type { ResultadoPreparacion } from '../../cmt/preparacion/index.ts';
import type { Caja } from '../../cmt/preparacion/tipos.ts';
import type { GrupoSolape } from '../../cmt/preparacion/solapes.ts';
import { ETIQUETAS } from './Pendientes';

type PiezaVista = ResultadoPreparacion['vista'][number];
const RAD = Math.PI / 180;
const estilos: Record<string, string> = {
  DISCO1: 'disco1', DISCO2: 'disco2', CUTTER: 'cutter', ROTULADOR: 'rotulador', taladro: 'taladro', texto: 'texto',
};
const estilo = (capa: string) => Object.hasOwn(estilos, capa) ? estilos[capa] : 'desconocida';

function trazo(p: PiezaVista) {
  const props = { className: `cmt-trazo cmt-${p.cruza ? 'cruce' : estilo(p.capa)}`, vectorEffect: 'non-scaling-stroke' };
  if (p.tipo === 'linea') return <line {...props} x1={p.a.x} y1={-p.a.y} x2={p.b.x} y2={-p.b.y} />;
  if (p.tipo === 'texto') return null;
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
  const capas = new Map<string, string>();
  for (const p of vista) {
    const clase = estilo(p.capa);
    capas.set(clase, clase === 'desconocida' ? 'Capa pendiente' : ETIQUETAS[p.capa as keyof typeof ETIQUETAS]);
  }
  if (vista.some(p => p.cruza)) capas.set('cruce', 'Cruza el marco');
  if (zonas.length) capas.set('solape', 'Solape');
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
      {[...capas].map(([clase, nombre]) => <li key={clase}><i className={`cmt-${clase}`} aria-hidden="true" />{nombre}</li>)}
    </ul>}
  </figure>;
}
