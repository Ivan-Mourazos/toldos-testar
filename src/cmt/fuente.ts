// Lector TrueType mínimo: contornos de glyf, métricas y mapa Unicode.
import fs from 'node:fs';
import type { Punto } from './tipos.ts';
interface Nodo {
    x: number;
    y: number;
    on: boolean;
}
interface Glifo {
    contours: Nodo[][];
    advance: number;
}
export type Fuente = ReturnType<typeof leerFuente>;
export function leerFuente(file: string) {
    const b = fs.readFileSync(file), tables: Record<string, number> = {};
    for (let i = 0; i < b.readUInt16BE(4); i++) {
        const p = 12 + 16 * i;
        tables[b.toString('ascii', p, p + 4)] = b.readUInt32BE(p + 8);
    }
    for (const name of ['head', 'hhea', 'hmtx', 'loca', 'glyf', 'cmap'])
        if (tables[name] === undefined)
            throw new Error('Tabla TrueType ausente: ' + name);
    const h = tables.head, units = b.readUInt16BE(h + 18), locFormat = b.readInt16BE(h + 50), metrics = b.readUInt16BE(tables.hhea + 34), cache = new Map<number, Glifo>();
    const off = (g: number) => locFormat ? b.readUInt32BE(tables.loca + g * 4) : b.readUInt16BE(tables.loca + g * 2) * 2;
    const cmap = tables.cmap;
    let mapping: {
        p: number;
        format: number;
    } | undefined;
    for (let i = 0; i < b.readUInt16BE(cmap + 2); i++) {
        const p = cmap + 4 + 8 * i, c = cmap + b.readUInt32BE(p + 4), format = b.readUInt16BE(c);
        if (format === 12) {
            mapping = { p: c, format };
            break;
        }
        if (format === 4)
            mapping = { p: c, format };
    }
    function glyphId(code: number) {
        if (!mapping)
            throw new Error('La fuente no tiene mapa Unicode compatible');
        const { p, format } = mapping;
        if (format === 12) {
            for (let i = 0; i < b.readUInt32BE(p + 12); i++) {
                const q = p + 16 + 12 * i, a = b.readUInt32BE(q), z = b.readUInt32BE(q + 4);
                if (code >= a && code <= z)
                    return b.readUInt32BE(q + 8) + code - a;
            }
            return 0;
        }
        const n = b.readUInt16BE(p + 6) / 2, e = p + 14, s = e + 2 * n + 2, delta = s + 2 * n, range = delta + 2 * n;
        for (let i = 0; i < n; i++)
            if (code <= b.readUInt16BE(e + 2 * i) && code >= b.readUInt16BE(s + 2 * i)) {
                const d = b.readInt16BE(delta + 2 * i), r = b.readUInt16BE(range + 2 * i);
                if (!r)
                    return (code + d) & 65535;
                const g = b.readUInt16BE(range + 2 * i + r + 2 * (code - b.readUInt16BE(s + 2 * i)));
                return g ? (g + d) & 65535 : 0;
            }
        return 0;
    }
    function glyph(g: number, depth = 0): Glifo {
        if (cache.has(g))
            return cache.get(g)!;
        if (depth > 10)
            throw new Error('Glifo compuesto cíclico');
        const start = off(g), end = off(g + 1), advance = b.readUInt16BE(tables.hmtx + 4 * Math.min(g, metrics - 1));
        if (start === end)
            return { contours: [], advance };
        let p = tables.glyf + start;
        const n = b.readInt16BE(p);
        p += 10;
        const contours: Nodo[][] = [];
        if (n >= 0) {
            const ends = [];
            for (let i = 0; i < n; i++) {
                ends.push(b.readUInt16BE(p));
                p += 2;
            }
            const count = (ends.at(-1) ?? -1) + 1, instructions = b.readUInt16BE(p);
            p += 2 + instructions;
            const flags = [];
            while (flags.length < count) {
                const f = b[p++];
                flags.push(f);
                if (f & 8) {
                    const repeat = b[p++];
                    for (let j = 0; j < repeat; j++)
                        flags.push(f);
                }
            }
            let x = 0, y = 0;
            const points = flags.map(f => { let dx = 0; if (f & 2) {
                dx = b[p++];
                if (!(f & 16))
                    dx = -dx;
            }
            else if (!(f & 16)) {
                dx = b.readInt16BE(p);
                p += 2;
            } x += dx; return { x, y: 0, on: !!(f & 1) }; });
            for (let i = 0; i < count; i++) {
                const f = flags[i];
                let dy = 0;
                if (f & 4) {
                    dy = b[p++];
                    if (!(f & 32))
                        dy = -dy;
                }
                else if (!(f & 32)) {
                    dy = b.readInt16BE(p);
                    p += 2;
                }
                y += dy;
                points[i].y = y;
            }
            let from = 0;
            for (const last of ends) {
                contours.push(points.slice(from, last + 1));
                from = last + 1;
            }
        }
        else {
            let flags;
            do {
                flags = b.readUInt16BE(p);
                const gid = b.readUInt16BE(p + 2);
                p += 4;
                let a1, a2;
                if (flags & 1) {
                    a1 = b.readInt16BE(p);
                    a2 = b.readInt16BE(p + 2);
                    p += 4;
                }
                else {
                    a1 = b.readInt8(p);
                    a2 = b.readInt8(p + 1);
                    p += 2;
                }
                if (!(flags & 2))
                    throw new Error('Glifo compuesto con anclajes por puntos no implementado');
                let a = 1, d = 1, c = 0, e = 0;
                const f2 = () => { const v = b.readInt16BE(p) / 16384; p += 2; return v; };
                if (flags & 8)
                    a = d = f2();
                else if (flags & 64) {
                    a = f2();
                    d = f2();
                }
                else if (flags & 128) {
                    a = f2();
                    c = f2();
                    e = f2();
                    d = f2();
                }
                for (const contour of glyph(gid, depth + 1).contours)
                    contours.push(contour.map(q => ({ x: a * q.x + c * q.y + a1, y: e * q.x + d * q.y + a2, on: q.on })));
            } while (flags & 32);
        }
        const result = { contours, advance };
        cache.set(g, result);
        return result;
    }
    function paths(char: string) {
        const id = glyphId(char.codePointAt(0) ?? 0);
        if (!id && char !== '\0')
            throw new Error('Glifo ausente: ' + char);
        const g = glyph(id), paths: Punto[][] = [];
        for (const contour of g.contours) {
            const expanded: Nodo[] = [];
            for (let i = 0; i < contour.length; i++) {
                const a = contour[i], z = contour[(i + 1) % contour.length];
                expanded.push(a);
                if (!a.on && !z.on)
                    expanded.push({ x: Math.trunc((a.x + z.x) / 2), y: Math.trunc((a.y + z.y) / 2), on: true });
            }
            const first = expanded.findIndex(p => p.on);
            if (first < 0)
                continue;
            const q = [...expanded.slice(first), ...expanded.slice(0, first)];
            q.push(q[0]);
            const out = [{ x: q[0].x, y: q[0].y, type: 0, mark: 0 }];
            let i = 1;
            while (i < q.length) {
                const prev = out.at(-1)!, a = q[i];
                if (a.on) {
                    out.push({ x: a.x, y: a.y, type: 4, mark: 0 });
                    i++;
                }
                else {
                    const z = q[i + 1]!;
                    out.push({ x: prev.x + (a.x - prev.x) * 2 / 3, y: prev.y + (a.y - prev.y) * 2 / 3, type: 1, mark: 0 }, { x: z.x + (a.x - z.x) * 2 / 3, y: z.y + (a.y - z.y) * 2 / 3, type: 2, mark: 0 }, { x: z.x, y: z.y, type: 3, mark: 0 });
                    i += 2;
                }
            }
            paths.push(out);
        }
        return { paths, advance: g.advance / units };
    }
    const kernPairs = new Map<number, number>();
    if (tables.kern) {
        let p = tables.kern + 4;
        const n = b.readUInt16BE(tables.kern + 2);
        for (let j = 0; j < n; j++) {
            const len = b.readUInt16BE(p + 2), coverage = b.readUInt16BE(p + 4);
            if ((coverage >> 8) === 0 && (coverage & 1)) {
                const count = b.readUInt16BE(p + 6);
                for (let i = 0; i < count; i++) {
                    const q = p + 14 + 6 * i;
                    kernPairs.set(b.readUInt16BE(q) * 65536 + b.readUInt16BE(q + 2), b.readInt16BE(q + 4));
                }
            }
            p += len;
        }
    }
    const kern = (left: string, right: string) => (kernPairs.get(glyphId(left.codePointAt(0) ?? 0) * 65536 + glyphId(right.codePointAt(0) ?? 0)) ?? 0) / units;
    const ascenso=b.readInt16BE(tables.hhea+4)/units,descenso=b.readInt16BE(tables.hhea+6)/units;
    return { units, paths, glyphId, glyph, file, kern, ascenso, descenso };
}
