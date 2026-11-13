import leyendaBot from '../domain/corteLona/plantillas/leyenda-bot.json' with { type: 'json' };
import leyendaOficina from './leyenda-oficina.json' with { type: 'json' };
import { value, number } from './dxf.ts';
import type { Dxf, EntidadDxf, ObjetoGeometrico } from './tipos.ts';
import { UNIDADES } from './geometria.ts';

// La leyenda del bot es una figura por capa en el origen. Sirve para comprobar a ojo que el plano
// no trae capas que el robot no procesa; en el corte sobra y hace que el dibujo abra desplazado
// en la máquina (Iván, 12/11/2026). Se exige el conjunto completo de figuras y rótulos.

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
function quitarWebExacta(d: Dxf): { entidades: EntidadDxf[]; quitada: boolean } {
  const pendientes = new Map<string, number>();
  for (const f of FIRMAS) if (f) pendientes.set(f, (pendientes.get(f) ?? 0) + 1);
  const apariciones=new Map<string,number>();
  for(const e of d.entities) {
    const f=firma(e.type,value(e,8),c=>e.pairs.find(p=>p[0]===c)?.[1]);
    if(f && pendientes.has(f)) {
      if(number(e,67) || number(e,50) && e.type==='TEXT' || number(e,51) && e.type==='TEXT' || number(e,71) && e.type==='TEXT' || number(e,72) && e.type==='TEXT' || number(e,73) && e.type==='TEXT' || number(e,41,1)!==1 && e.type==='TEXT') return {quitada:false,entidades:d.entities};
      if([30,31,38,39,210,220].some(c=>number(e,c)!==0)||number(e,230,1)!==1)return {quitada:false,entidades:d.entities};
      apariciones.set(f,(apariciones.get(f)??0)+1);
    }
  }
  if([...apariciones].some(([f,n])=>n!==pendientes.get(f)))return {quitada:false,entidades:d.entities};
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

const oficina = leyendaOficina as EntidadDxf[];
const web: EntidadDxf[] = (leyendaBot as {t: string; g: [string, string][]}[]).map(e => ({type:e.t, pairs:e.g.filter(([c])=>[1,8,10,20,11,21,40,41,42,43,50,51,70,71,72,73,90].includes(Number(c))).map(([c,v])=>[Number(c),v])}));
// La oficina conserva las figuras como polilíneas o descompuestas en LINE/ARC.
// Los TEXT antiguos tienen métricas de inserción distintas de los TEXT nuevos.
const figuras = [oficina.filter(e=>e.type!=='MTEXT'), web.filter(e=>e.type!=='TEXT')];
const rotulos = [web.filter(e=>e.type==='TEXT'), oficina.filter(e=>e.type==='MTEXT'), oficina.filter(e=>e.type==='MTEXT').map(e=>({
  type:'TEXT', pairs:e.pairs.filter(([c])=>![41,71,72,73].includes(c)).map(([c,v]): [number,string]=>[c,c===20?String(Number(v)-50):v])
}))];
const plantillas = figuras.flatMap(f=>rotulos.map(r=>[...f,...r]));

function coincide(e: EntidadDxf, patron: EntidadDxf, dx: number, dy: number): boolean {
  if (e.type!==patron.type || value(e,8).toUpperCase()!==value(patron,8).toUpperCase() || number(e,67)) return false;
  if ([30,31,38,39,210,220].some(c=>number(e,c)!==0) || number(e,230,1)!==1) return false;
  if (['TEXT','MTEXT'].includes(e.type) && (number(e,50)!==0 || number(e,51)!==0 || number(e,41,e.type==='TEXT'?1:0)!==(e.type==='TEXT'?1:number(patron,41)) || number(e,71,e.type==='MTEXT'?1:0)!==(e.type==='MTEXT'?1:0))) return false;
  if(e.type==='TEXT' && (number(e,72)!==0 || number(e,73)!==0))return false;
  if(e.type==='MTEXT' && (Math.abs(number(e,21))>1e-10 || number(e,11,1)<=0))return false;
  const codigos = new Set(patron.pairs.map(([c])=>c));
  for (const c of codigos) {
    if(c===8)continue;
    const a=e.pairs.filter(p=>p[0]===c).map(p=>p[1]), b=patron.pairs.filter(p=>p[0]===c).map(p=>p[1]);
    if(a.length!==b.length && !(a.length===0 && b.length===1 && Number(b[0])===0))return false;
    for(let i=0;i<b.length;i++) {
      if(c===1) {if(a[i]!==b[i])return false;}
      else {
        const n=Number(a[i]??0);
        if(!Number.isFinite(n)||Math.abs(n-Number(b[i])-(c===10||c===11?dx:c===20||c===21?dy:0))>.001)return false;
      }
    }
  }
  return true;
}

/** Conserva el nombre público anterior. Admite las dos plantillas de oficina y sus TEXT antiguos. */
export function quitarLeyendaWeb(d: Dxf): { entidades: EntidadDxf[]; quitada: boolean } {
  const exacta=quitarWebExacta(d);
  if(exacta.quitada)return exacta;
  for(const circulo of d.entities.filter(e=>e.type==='CIRCLE' && value(e,8).toUpperCase()==='TALADRO' && Math.abs(number(e,40)-28.52682595935192)<.001)) {
    const dx=number(circulo,10),dy=number(circulo,20);
    for(const plantilla of plantillas) {
      const elegidas=new Set<EntidadDxf>();
      for(const patron of plantilla) {
        const candidatas=d.entities.filter(e=>!elegidas.has(e)&&coincide(e,patron,dx,dy));
        // Si hay duplicados no sabemos cuál es la leyenda: no se elimina ninguno.
        if(candidatas.length!==1)break;
        elegidas.add(candidatas[0]);
      }
      if(elegidas.size===plantilla.length)return {quitada:true,entidades:d.entities.filter(e=>!elegidas.has(e))};
    }
  }
  return {quitada:false,entidades:d.entities};
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
