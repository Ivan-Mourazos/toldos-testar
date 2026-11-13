import { value, number } from './dxf.ts';
import type { Fuente } from './fuente.ts';
import type { Dxf, EntidadDxf, Duda, Punto, ObjetoGeometrico } from './tipos.ts';
import { redondearComoRobot } from './compatibilidad.ts';
import { splineCubica } from './entidades.ts';
import { contornosTexto } from './textos.ts';
import { descomponerMtext } from './textos-cad.ts';
type Trazo = Pick<ObjetoGeometrico, 'paths' | 'source' | 'entity' | 'serial' | 'firstSteps'>;
// Geometría: razón observada de 72/25,4 unidades CMT por mm DXF.
// Los parámetros del controlador usan otra razón: 600/25,4.
export const UNIDADES = 72 / 25.4, ESCALA = 1;
const punto = (x: number, y: number, type = 4, mark = 0): Punto => ({ x, y, type, mark });
const dist = (a: Punto, b: Punto) => Math.hypot(a.x - b.x, a.y - b.y);
const igual = (a: Punto, b: Punto) => dist(a, b) < .02;
export function herramienta(layer: string) { const l = layer.toUpperCase(); if (l === 'DISCO1')
    return 'CM-CUTW-Def'; if (l === 'DISCO2')
    return 'CM-CUTW-6'; if (l === 'ROTULADOR' || l === 'TALADRO')
    return 'CM-PEN-Def'; if (l === 'CUTTER')
    return 'CM-CUTK-Def'; return ''; }
export function arco(cx: number, cy: number, r: number, start: number, sweep: number) {
    let n = Math.max(1, Math.ceil(Math.abs(sweep) / (Math.PI / 2) - 1e-8));
    // Ajuste experimental observado en el arco más pequeño de la leyenda.
    // Para ángulos mayores de 90°, admite una sola cúbica si el error radial es < 0,001 DXF.
    if (n === 2 && Math.abs(sweep) < Math.PI) {
        const a = sweep, k = 4 / 3 * Math.tan(a / 4), c = [1, k, Math.cos(a) + k * Math.sin(a), Math.sin(a) - k * Math.cos(a), Math.cos(a), Math.sin(a)];
        let error = 0;
        for (let j = 1; j < 100; j++) {
            const t = j / 100, u = 1 - t, x = u * u * u + 3 * u * u * t + 3 * u * t * t * c[2] + t * t * t * c[4], y = 3 * u * u * t * k + 3 * u * t * t * c[3] + t * t * t * c[5];
            error = Math.max(error, Math.abs(Math.hypot(x, y) - 1) * r);
        }
        if (error < .001)
            n = 1;
    }
    const da = sweep / n, points = [punto(cx + r * Math.cos(start), cy + r * Math.sin(start), 0)];
    for (let i = 0; i < n; i++) {
        const a = start + i * da, z = a + da, k = 4 / 3 * Math.tan(da / 4);
        points.push(punto(cx + r * (Math.cos(a) - k * Math.sin(a)), cy + r * (Math.sin(a) + k * Math.cos(a)), 1), punto(cx + r * (Math.cos(z) + k * Math.sin(z)), cy + r * (Math.sin(z) - k * Math.cos(z)), 2), punto(cx + r * Math.cos(z), cy + r * Math.sin(z), 3));
    }
    return points;
}
export function invertir(p: Punto[]): Punto[] { const out = [{ ...p.at(-1)!, type: 0 }], segments: Punto[][] = []; for (let i = 1; i < p.length;) {
    if (p[i].type === 4) {
        segments.push([p[i - 1], p[i]]);
        i++;
    }
    else if (p[i].type === 1 && p[i + 1]?.type === 2 && p[i + 2]?.type === 3) {
        segments.push([p[i - 1], p[i], p[i + 1], p[i + 2]]);
        i += 3;
    }
    else
        throw new Error('Secuencia de curva incorrecta');
} for (const s of segments.reverse()) {
    if (s.length === 2)
        out.push({ ...s[0], type: 4, lineaDxf: s[1].lineaDxf });
    else
        out.push({ ...s[2], type: 1 }, { ...s[1], type: 2 }, { ...s[0], type: 3 });
} return out; }
export function polilinea(e: EntidadDxf) { const vertices: {
    x: number;
    y: number;
    bulge: number;
}[] = []; for (const [code, v] of e.pairs) {
    if (code === 10)
        vertices.push({ x: Number(v), y: 0, bulge: 0 });
    else if (code === 20 && vertices.length)
        vertices.at(-1)!.y = Number(v);
    else if (code === 42 && vertices.length)
        vertices.at(-1)!.bulge = Number(v);
} if (!vertices.length)
    return []; const closed = number(e, 70) & 1, points = [punto(vertices[0].x, vertices[0].y, 0)]; for (let i = 0; i < vertices.length - (closed ? 0 : 1); i++) {
    const a = vertices[i], z = vertices[(i + 1) % vertices.length];
    if (Math.abs(a.bulge) < 1e-10)
        points.push(punto(z.x, z.y));
    else {
        const dx = z.x - a.x, dy = z.y - a.y, b = a.bulge, k = (1 - b * b) / (4 * b), cx = (a.x + z.x) / 2 - dy * k, cy = (a.y + z.y) / 2 + dx * k;
        points.push(...arco(cx, cy, Math.hypot(a.x - cx, a.y - cy), Math.atan2(a.y - cy, a.x - cx), 4 * Math.atan(b)).slice(1));
    }
} return points; }
export function limitesCabecera(d: Dxf) { const p = d.sections.HEADER?.[0]?.pairs ?? [], i = p.findIndex(x => x[0] === 9 && x[1] === '$EXTMIN'); if (i < 0)
    return [0, 0]; return [Number(p[i + 1][1]), Number(p[i + 2][1])]; }
function transformar(p:Punto[],e:EntidadDxf,reflejar=true):Punto[]{
 const m=e.transformacion,negativa=reflejar&&number(e,230,1)<0&&e.type!=='LINE';
 if(!m&&!negativa)return p;
 return p.map(q=>{const x=negativa?-q.x:q.x,y=q.y;return {...q,x:m?m[0]*x+m[2]*y+m[4]:x,y:m?m[1]*x+m[3]*y+m[5]:y};});
}
export function generarGeometria(d: Dxf, options: {
    font?: Fuente;
    translation?: number[];
    scale?: number;
    compatibilidadRobot?: boolean;
    preparacionMtext?: 'directa'|'textos';
} = {}) {
    const issues: Duda[] = [], avisos: Duda[] = [], objects: ObjetoGeometrico[] = [];
    let serial = 0;
    const layers = [...new Set([...Object.keys(d.layers), ...d.entities.map(e => value(e, 8))])];
    for (const layer of layers) {
        const group: Trazo[] = [], tool = herramienta(layer);
        let geo: Trazo[] = [];
        const flush = () => { group.push(...geo); geo = []; };
        for (const e of d.entities.filter(e => value(e, 8) === layer && !number(e, 67) && e.type !== 'VIEWPORT')) {
            if (e.type === 'TEXT' || e.type === 'MTEXT') {
                flush();
                // Se conserva la ausencia comprobada de estos indicadores en el CMT, fuera del modelo SVG.
                if(e.type==='MTEXT'&&value(e,1)==='1'&&Math.abs(number(e,11))<1e-10&&number(e,21)===-1){avisos.push({handle:value(e,5),tipo:e.type,capa:layer,motivo:'El texto MTEXT «1» girado no se dibuja, igual que en los ejemplos del robot'});continue;}
                try {
                    let textos=[e];
                    if(e.type==='MTEXT'&&options.preparacionMtext==='textos'){
                        const descompuestos=descomponerMtext(e,d,options.font!);
                        if(descompuestos)textos=descompuestos;
                        avisos.push({handle:value(e,5),tipo:e.type,capa:layer,motivo:descompuestos
                            ?'MTEXT preparado como TEXT: cuadro de tinta Arial, plegado por palabras y avance de párrafo CAD contrastados'
                            :'La preparación CAD no está contrastada para este formato o anclaje; se conserva la importación directa del MTEXT'});
                    }
                    for (const texto of textos)for (const path of contornosTexto(texto,d,options.font!)) {
                        const p=transformar(path,e,false);
                        group.push({paths:[p],source:[value(e,5)],entity:e.type,serial:serial++});
                    }
                } catch(error) {
                    issues.push({handle:value(e,5),tipo:e.type,capa:layer,motivo:`El texto en la capa ${layer} no se puede dibujar: ${error instanceof Error?error.message:String(error)}. Descompón el texto a TEXT con Arial en ZWCAD o elige «sin textos»`});
                }
                continue;
            }
            let p: Punto[] | undefined, closed = false;
            if (e.type === 'LINE')
                p = [punto(number(e, 10), number(e, 20), 0), punto(number(e, 11), number(e, 21))].map(q => ({...q, lineaDxf: true}));
            else if (e.type === 'CIRCLE') {
                p = arco(number(e, 10), number(e, 20), number(e, 40), 0, 2 * Math.PI);
                closed = true;
            }
            else if (e.type === 'ARC') {
                const start = number(e, 50) * Math.PI / 180, end = number(e, 51) * Math.PI / 180;
                let sweep = end - start;
                while (sweep <= 0)
                    sweep += 2 * Math.PI;
                p = arco(number(e, 10), number(e, 20), number(e, 40), start, sweep);
            }
            else if(e.type==='SPLINE')p=splineCubica(e);
            else if (e.type === 'LWPOLYLINE') {
                p = polilinea(e);
                closed = !!(number(e, 70) & 1);
            }
            else {
                issues.push({ handle: value(e, 5), tipo: e.type, motivo: 'Entidad no implementada' });
                continue;
            }
            if(p&&e.transformacion&&e.type==='LWPOLYLINE'&&!closed&&igual(p[0],p.at(-1)!))p=[{...p.at(-1)!,type:0},...p.slice(1)];
            if(p)p=transformar(p,e);
            if (!p || p.length<2)
                continue;
            const incoming: Trazo = { paths: [p], firstSteps: p.length - 1, source: [value(e, 5)], entity: e.type, serial: serial++ };
            if (closed) {
                geo.push(incoming);
                continue;
            }
            // Une extremos en el orden del DXF, sin atravesar cambios a entidades de texto.
            let merged = incoming;
            let changed = true;
            while (changed) {
                changed = false;
                for (let i = 0; i < geo.length; i++) {
                    const q = geo[i].paths[0], r = merged.paths[0];
                    if (igual(q[0], q.at(-1)!))
                        continue;
                    let joined: Punto[] | undefined;
                    if (igual(q.at(-1)!, r[0]))
                        joined = [...q, ...r.slice(1)];
                    else if (igual(q[0], r.at(-1)!))
                        joined = [...r, ...q.slice(1)];
                    else if (igual(q[0], r[0]))
                        joined = [...invertir(r), ...q.slice(1)];
                    else if (igual(q.at(-1)!, r.at(-1)!))
                        joined = [...q, ...invertir(r).slice(1)];
                    if (joined) {
                        const qFirst = igual(joined[0], q[0]);
                        merged = { ...merged, firstSteps: qFirst ? geo[i].firstSteps : merged.firstSteps, paths: [joined], source: [...geo[i].source, ...merged.source], serial: Math.min(geo[i].serial, merged.serial) };
                        geo.splice(i, 1);
                        changed = true;
                        break;
                    }
                }
            }
            if (igual(merged.paths[0][0], merged.paths[0].at(-1)!)) {
                const q = merged.paths[0], steps = merged.firstSteps!;
                merged.paths[0] = [{ ...q[steps], type: 0 }, ...q.slice(steps + 1), ...q.slice(1, steps + 1)];
            }
            geo.push(merged);
            geo.sort((a, b) => a.serial - b.serial);
        }
        flush();
        group.sort((a, b) => Number(a.entity === 'CIRCLE') - Number(b.entity === 'CIRCLE'));
        for (const o of group)
            objects.push({ ...o, layer, tool, flags: 0 });
    }
    if (options.compatibilidadRobot !== false) redondearComoRobot(objects, d);
    const min = limitesCabecera(d), translation = options.translation ?? [300 - min[0], 20 - min[1]], scale = options.scale ?? ESCALA;
    for (const o of objects)
        for (const p of o.paths)
            for (const q of p) {
                q.x = (q.x * scale + translation[0]) * UNIDADES;
                q.y = (q.y * scale + translation[1]) * UNIDADES;
            }
    return { objects, issues, avisos, translation, scale, dxf: d };
}
