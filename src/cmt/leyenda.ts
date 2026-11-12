import leyendaBot from '../domain/corteLona/plantillas/leyenda-bot.json' with { type: 'json' };
import { value } from './dxf.ts';
import type { Dxf, EntidadDxf, ObjetoGeometrico } from './tipos.ts';
import { UNIDADES } from './geometria.ts';

// La leyenda del bot es una figura por capa en el origen. Sirve para comprobar a ojo que el plano
// no trae capas que el robot no procesa; en el corte sobra y hace que el dibujo abra desplazado
// en la máquina (Iván, 12/11/2026). Solo se reconoce la que escribe la web, entidad por entidad.

const CODIGOS: Record<string, number[]> = { LINE: [10, 20, 11, 21], ARC: [10, 20, 40, 50, 51], CIRCLE: [10, 20, 40], TEXT: [10, 20, 40] };
const num = (v: string | undefined) => (Math.round(Number(v) * 1000) / 1000).toFixed(3);

function firma(tipo: string, capa: string, valor: (codigo: number) => string | undefined): string | null {
  const codigos = CODIGOS[tipo];
  if (!codigos) return null;
  return [tipo, capa.toUpperCase(), ...codigos.map(c => num(valor(c))), tipo === 'TEXT' ? valor(1) ?? '' : ''].join('|');
}

const FIRMAS = (leyendaBot as { t: string; g: [string, string][] }[]).map(e => {
  const v = (c: number) => e.g.find(x => x[0] === String(c))?.[1];
  return firma(e.t, v(8) ?? '', v);
});

/** Quita las entidades de la leyenda de la web. Solo si está entera: una leyenda a medias no es la nuestra y no se toca. */
export function quitarLeyendaWeb(d: Dxf): { entidades: EntidadDxf[]; quitada: boolean } {
  const pendientes = new Map<string, number>();
  for (const f of FIRMAS) if (f) pendientes.set(f, (pendientes.get(f) ?? 0) + 1);
  const resto: EntidadDxf[] = [];
  for (const e of d.entities) {
    const f = firma(e.type, value(e, 8), c => e.pairs.find(p => p[0] === c)?.[1]);
    const quedan = f ? pendientes.get(f) ?? 0 : 0;
    if (f && quedan > 0) pendientes.set(f, quedan - 1);
    else resto.push(e);
  }
  const quitada = [...pendientes.values()].every(n => n === 0);
  return { entidades: quitada ? resto : d.entities, quitada };
}

/** Lleva la esquina inferior izquierda de lo dibujado a 300 y 20 mm, donde el robot deja el conjunto. */
export function recolocar(objetos: ObjetoGeometrico[]): void {
  let minX = Infinity, minY = Infinity;
  const ver = (x: number, y: number) => { if (x < minX) minX = x; if (y < minY) minY = y; };
  for (const o of objetos) for (const p of o.paths) {
    let c = p[0];
    if (c) ver(c.x, c.y);
    for (let i = 1; i < p.length;) {
      if (p[i].type === 4) { c = p[i]; ver(c.x, c.y); i++; continue; }
      // Curva: los puntos de control pueden quedar fuera del trazo; se mide el trazo.
      const [a, b, e] = [p[i], p[i + 1], p[i + 2]];
      for (let k = 1; k <= 16; k++) {
        const t = k / 16, u = 1 - t;
        ver(u * u * u * c.x + 3 * u * u * t * a.x + 3 * u * t * t * b.x + t * t * t * e.x, u * u * u * c.y + 3 * u * u * t * a.y + 3 * u * t * t * b.y + t * t * t * e.y);
      }
      c = e; i += 3;
    }
  }
  if (!Number.isFinite(minX) || !Number.isFinite(minY)) return;
  const dx = 300 * UNIDADES - minX, dy = 20 * UNIDADES - minY;
  for (const o of objetos) for (const p of o.paths) for (const q of p) { q.x += dx; q.y += dy; }
}
