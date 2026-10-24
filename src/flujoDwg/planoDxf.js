// Lectura y dibujo de un plano DXF: metros en modelo, mm en papel. Lo usan las herramientas de contraste (scripts/lib/plano-dxf.mjs)
// y el PDF de las presentaciones (flujo del DWG, fase 4). No convierte ni escribe DWG.
import { registrosDxf, valor } from '../domain/corteLona/dxfTestHelpers.js';
import { anchoArial } from '../domain/corteLona/texto.js';
const n = (r, c, defecto = 0) => valor(r, c) === undefined ? defecto : Number(valor(r, c));
const todos = (r, c) => r.pares.filter(([k]) => k === c).map(([, v]) => v);
export const limpiarTextoDxf = s => String(s ?? '').replace(/\\U\+([0-9A-F]{4})/gi, (_, h) => String.fromCharCode(parseInt(h, 16)))
  .replace(/\\P|\^J/g, '\n').replace(/\{\\[^;]*;|\}|\\[A-Za-z][^;]*;/g, '').replace(/%%c/gi, 'Ø');
const identidad = (x, y) => [x, y];
const vertices = r => {
  const pts = []; let actual;
  for (const [k, v] of r.pares) {
    if (k === 10) { actual = { x: +v, y: 0, curva: 0 }; pts.push(actual); }
    else if (k === 20 && actual) actual.y = +v;
    else if (k === 42 && actual) actual.curva = +v;
  }
  return pts;
};
const colores = { 1: '#ed1313', 2: '#c4bd00', 3: '#00a900', 4: '#009c9c', 5: '#0000e8', 6: '#d000d0', 7: '#111', 8: '#777', 9: '#bbb', 11: '#e57e7e', 23: '#a55252', 40: '#d38d00', 51: '#c9c97a', 106: '#58a858', 112: '#429d80' };
/** El DXF en bytes, como texto: UTF-8 si lo es, si no Windows-1252 (los DXF 2004 del bot). */
export function textoDxf(bytes) {
  try { return new TextDecoder('utf-8', { fatal: true }).decode(bytes); } catch { return new TextDecoder('windows-1252').decode(bytes); }
}
export function leerPlanoTexto(src) {
  const tablas = registrosDxf(src, 'TABLES'), entidades = registrosDxf(src), bloques = new Map();
  const capas = new Map(tablas.filter(r => r.tipo === 'LAYER').map(r => [valor(r, 2), { color: Math.abs(n(r, 62)), imprime: n(r, 290, 1) !== 0, visible: n(r, 62) > 0 && !(n(r, 70) & 1), handle: valor(r, 5) }]));
  let b;
  for (const r of registrosDxf(src, 'BLOCKS')) {
    if (r.tipo === 'BLOCK') { b = { base: [n(r, 10), n(r, 20)], entidades: [] }; bloques.set(valor(r, 2), b); }
    else if (r.tipo === 'ENDBLK') b = undefined;
    else b?.entidades.push(r);
  }
  const primitivas = (regs, T = identidad, padre = '', profundidad = 0, colorPadre) => {
    if (profundidad > 10) throw new Error('Bloque CAD recursivo o demasiado anidado.');
    const salida = [];
    for (const r of regs) {
      const capa = valor(r, 8) === '0' && padre ? padre : valor(r, 8) ?? padre;
      const color = n(r, 62, 256) === 256 ? capas.get(capa)?.color ?? 7 : n(r, 62) === 0 ? colorPadre ?? capas.get(capa)?.color ?? 7 : n(r, 62);
      const comun = { capa, color, handle: valor(r, 5) };
      const P = (a = 10, b = 20) => T(n(r, a), n(r, b));
      const segmento = (a, b, curva = 0) => {
        if (Math.hypot(a[0] - b[0], a[1] - b[1]) < 1e-10) return;
        salida.push({ ...comun, tipo: 'raya', a, b, curva });
      };
      if (r.tipo === 'LINE') segmento(P(), P(11, 21));
      else if (r.tipo === 'LWPOLYLINE') {
        const pts = vertices(r);
        for (let i = 0; i < pts.length - ((n(r, 70) & 1) ? 0 : 1); i++) {
          const a = pts[i], b = pts[(i + 1) % pts.length]; segmento(T(a.x, a.y), T(b.x, b.y), a.curva);
        }
      } else if (['TEXT', 'MTEXT', 'ATTRIB'].includes(r.tipo)) {
        const alineado = r.tipo !== 'MTEXT' && (n(r, 72) || n(r, 73));
        const punto = alineado ? P(11, 21) : P(), q = T(n(r, 10) + n(r, 40), n(r, 20)), origen = P();
        const h = Math.hypot(q[0] - origen[0], q[1] - origen[1]);
        const giro = r.tipo === 'MTEXT' ? Math.atan2(n(r, 21), n(r, 11, 1)) * 180 / Math.PI : n(r, 50);
        salida.push({ ...comun, tipo: 'texto', punto, h, ancho: n(r, 41), giro, ancla: r.tipo === 'MTEXT' ? n(r, 71, 1) : alineado ? 5 : 7,
          valor: limpiarTextoDxf((r.tipo === 'MTEXT' ? todos(r, 3).join('') : '') + (valor(r, 1) ?? '')) });
      } else if (r.tipo === 'INSERT') {
        const bloque = bloques.get(valor(r, 2)); if (!bloque) continue;
        const a = n(r, 50) * Math.PI / 180, sx = n(r, 41, 1), sy = n(r, 42, 1);
        const t = (x, y) => { const u = (x - bloque.base[0]) * sx, v = (y - bloque.base[1]) * sy; return T(n(r, 10) + u * Math.cos(a) - v * Math.sin(a), n(r, 20) + u * Math.sin(a) + v * Math.cos(a)); };
        salida.push({ ...comun, tipo: 'bloque', nombre: valor(r, 2), punto: P(), giro: n(r, 50), sx, sy });
        salida.push(...primitivas(bloque.entidades, t, capa, profundidad + 1, color));
      } else if (r.tipo === 'DIMENSION') {
        salida.push({ ...comun, tipo: 'cota', medida: n(r, 42), valor: valor(r, 1), estilo: valor(r, 3), a: P(13, 23), b: P(14, 24), punto: P(), texto: P(11, 21) });
        const bloque = bloques.get(valor(r, 2));
        if (bloque) salida.push(...primitivas(bloque.entidades, T, capa, profundidad + 1, color).map(p => ({ ...p, deCota: true })));
      } else if (r.tipo === 'SOLID') salida.push({ ...comun, tipo: 'relleno', puntos: [P(), P(11, 21), P(12, 22), P(13, 23)] });
      else if (r.tipo === 'HATCH') {
        const pares = r.pares.slice(r.pares.findIndex(([k]) => k === 93) + 1), puntos = [];
        for (let i = 0; i < pares.length; i++) {
          if ([97, 75, 78, 98].includes(pares[i][0])) break;
          if (pares[i][0] === 10 && pares[i + 1]?.[0] === 20) puntos.push(T(+pares[i][1], +pares[i + 1][1]));
        }
        if (puntos.length) salida.push({ ...comun, tipo: 'sombreado', patron: valor(r, 2), puntos, solido: n(r, 70) === 1 });
      } else if (['ARC', 'CIRCLE'].includes(r.tipo)) {
        const p = P(), q = T(n(r, 10) + n(r, 40), n(r, 20));
        salida.push({ ...comun, tipo: 'arco', punto: p, r: Math.hypot(q[0] - p[0], q[1] - p[1]), desde: n(r, 50), hasta: n(r, 51, 360) });
      }
    }
    return salida;
  };
  const modelo = primitivas(entidades.filter(r => valor(r, 67) !== '1'));
  const papel = primitivas(entidades.filter(r => valor(r, 67) === '1' && r.tipo !== 'VIEWPORT'));
  const ventanasDe = (regs) => regs.filter(r => r.tipo === 'VIEWPORT' && n(r, 69) > 1).map(r => {
    const escala = n(r, 41) / n(r, 45), centro = [n(r, 10), n(r, 20)], ancho = n(r, 40), alto = n(r, 41);
    // Vista girada (51, en grados, antihorario): centrada en su objetivo (17/27) más el centro de la vista.
    const giro = n(r, 51), a = giro * Math.PI / 180, [c, s] = [Math.cos(a), Math.sin(a)], [vx, vy] = [n(r, 12), n(r, 22)];
    const modelo = [n(r, 17) + vx * c + vy * s, n(r, 27) - vx * s + vy * c];
    const [mx, my] = [ancho / escala / 2, alto / escala / 2], [ex, ey] = [Math.abs(mx * c) + Math.abs(my * s), Math.abs(mx * s) + Math.abs(my * c)];
    return { id: n(r, 69), escala, centro, modelo, ancho, alto, giro, congeladas: todos(r, 341).map(h => [...capas].find(([, c]) => c.handle === h)?.[0]),
      zona: { x0: modelo[0] - ex, x1: modelo[0] + ex, y0: modelo[1] - ey, y1: modelo[1] + ey }, handle: valor(r, 5) };
  });
  const ventanas = ventanasDe(entidades.filter(r => valor(r, 67) === '1'));
  const imprime = p => capas.get(p.capa)?.imprime !== false && capas.get(p.capa)?.visible !== false;
  return { src, entidades, bloques, capas, modelo, papel, ventanas, imprime, primitivas, ventanasDe };
}

/**
 * Todas las presentaciones del plano, en su orden de pestañas, con lo que se imprime en cada una (su papel y lo que enseñan
 * sus ventanas). La activa tiene su papel en ENTITIES (67 = 1); las demás, en su bloque *Paper_SpaceN. La ventana que es la
 * hoja entera (la del LAYOUT, 331) no enseña el modelo.
 */
export function presentacionesDxf(src) {
  const plano = leerPlanoTexto(src);
  const registros = new Map(registrosDxf(src, 'TABLES').filter(r => r.tipo === 'BLOCK_RECORD').map(r => [valor(r, 5), valor(r, 2)]));
  const hojas = registrosDxf(src, 'OBJECTS').filter(r => r.tipo === 'LAYOUT').map(r => ({
    nombre: todos(r, 1).at(-1) ?? '', orden: n(r, 71), bloque: registros.get(todos(r, 330).at(-1)) ?? '', hoja: valor(r, 331),
  })).filter(h => /^\*paper_space/i.test(h.bloque)).sort((a, b) => a.orden - b.orden);
  return hojas.map(h => {
    const regs = /^\*paper_space$/i.test(h.bloque) ? plano.entidades.filter(r => valor(r, 67) === '1') : plano.bloques.get(h.bloque)?.entidades ?? [];
    const ventanas = plano.ventanasDe(regs).filter(v => v.handle !== h.hoja && !(v.ancho >= 250 && v.alto >= 180));
    const papel = plano.primitivas(regs.filter(r => r.tipo !== 'VIEWPORT'));
    return { nombre: h.nombre, primitivas: proyectarPagina({ ...plano, papel, ventanas }) };
  });
}

/**
 * El cajetín con quien revisó, en todas las presentaciones: el borrador se hizo antes de la revisión y su campo REVISOR
 * está vacío. Solo cambia el valor (1) de los ATTRIB con etiqueta (2) REVISOR; el resto del DXF queda igual.
 */
export function conRevisor(dxf, revisor) {
  if (!revisor) return dxf;
  const limpio = String(revisor).replace(/[\r\n]+/g, ' ').trim();
  return String(dxf).replace(/\r\n/g, '\n').split('\n  0\n').map((trozo) => {
    if (!trozo.startsWith('ATTRIB\n')) return trozo;
    const lineas = trozo.split('\n');
    const etiqueta = lineas.findIndex((l, i) => i % 2 === 1 && l.trim() === '2' && lineas[i + 1]?.trim() === 'REVISOR');
    const valor = lineas.findIndex((l, i) => i % 2 === 1 && l.trim() === '1');
    if (etiqueta < 0 || valor < 0) return trozo;
    lineas[valor + 1] = limpio;
    return lineas.join('\n');
  }).join('\n  0\n');
}

/**
 * Las presentaciones en una página HTML, una A4 apaisada por hoja, para que Chromium la pase a PDF. Avisa con
 * `window.hojaLista` cuando está pintada, como la hoja de taller de remolques.
 */
export function htmlPresentaciones(src, titulo = 'Presentaciones') {
  const paginas = presentacionesDxf(src).map(p => `<section class="hoja" aria-label="${esc(p.nombre)}">${svgPrimitivas(p.primitivas, { ancho: '297mm', alto: '210mm', trazo: .2 })}</section>`);
  return `<!doctype html><html lang="es"><head><meta charset="utf-8"><title>${esc(titulo)}</title><style>@page{size:A4 landscape;margin:0}html,body{margin:0;background:#fff}.hoja{width:297mm;height:210mm;overflow:hidden;break-after:page}.hoja:last-child{break-after:auto}svg{display:block}</style></head><body>${paginas.join('')}<script>window.hojaLista=true</script></body></html>`;
}
export function cajaPrimitiva(p) {
  const pts = p.puntos ?? (p.a ? [p.a, p.b] : p.punto ? [p.punto] : []);
  return { x0: Math.min(...pts.map(q => q[0])), x1: Math.max(...pts.map(q => q[0])), y0: Math.min(...pts.map(q => q[1])), y1: Math.max(...pts.map(q => q[1])) };
}
export const enZona = (p, z) => { const b = cajaPrimitiva(p); return b.x1 >= z.x0 && b.x0 <= z.x1 && b.y1 >= z.y0 && b.y0 <= z.y1; };
export function transformarPrimitiva(p, T, escala = 1) {
  return { ...p, ...(p.a ? { a: T(...p.a), b: T(...p.b) } : {}), ...(p.punto ? { punto: T(...p.punto) } : {}),
    ...(p.texto ? { texto: T(...p.texto) } : {}), ...(p.puntos ? { puntos: p.puntos.map(q => T(...q)) } : {}),
    ...(p.h == null ? {} : { h: p.h * escala, ancho: p.ancho * escala }), ...(p.r == null ? {} : { r: p.r * escala }) };
}
export function proyectarPagina(dxf) {
  const pagina = dxf.papel.filter(dxf.imprime).map(p => ({ ...p, espacio: 'papel' }));
  for (const v of dxf.ventanas) {
    const a = (v.giro ?? 0) * Math.PI / 180, [c, s] = [Math.cos(a), Math.sin(a)];
    const T = (x, y) => { const [u, w] = [x - v.modelo[0], y - v.modelo[1]]; return [v.centro[0] + (u * c - w * s) * v.escala, v.centro[1] + (u * s + w * c) * v.escala]; };
    pagina.push(...dxf.modelo.filter(p => dxf.imprime(p) && !v.congeladas.includes(p.capa) && enZona(p, v.zona))
      .map(p => ({ ...transformarPrimitiva(p, T, v.escala), ...(p.giro == null || !v.giro ? {} : { giro: p.giro + v.giro }), espacio: `ventana ${v.id}`, recorte: v })));
  }
  return pagina;
}
const esc = s => String(s).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('"', '&quot;');
export function svgPrimitivas(primitivas, { zona = { x0: 0, y0: 0, x1: 297, y1: 210 }, ancho = 1754, alto = 1240, trazo = .15 } = {}) {
  const defs = [], partes = [];
  for (const [i, p] of primitivas.entries()) {
    const c = colores[p.color] ?? '#666'; let cuerpo = '';
    if (p.tipo === 'raya') {
      if (p.curva) {
        const largo = Math.hypot(p.b[0] - p.a[0], p.b[1] - p.a[1]), r = largo * (1 + p.curva ** 2) / (4 * Math.abs(p.curva));
        cuerpo = `<path d="M ${p.a[0]} ${-p.a[1]} A ${r} ${r} 0 ${Math.abs(p.curva) > 1 ? 1 : 0} ${p.curva > 0 ? 0 : 1} ${p.b[0]} ${-p.b[1]}" fill="none" stroke="${c}"/>`;
      } else cuerpo = `<line x1="${p.a[0]}" y1="${-p.a[1]}" x2="${p.b[0]}" y2="${-p.b[1]}" stroke="${c}"/>`;
    } else if (p.tipo === 'texto') {
      // CAD mide la mayúscula, SVG el cuerpo de Arial. Se respeta el ancho y el anclaje MTEXT.
      const lineas = [];
      for (const parrafo of p.valor.split('\n')) {
        let actual = '';
        for (const palabra of parrafo.split(/\s+/)) {
          if (p.ancho && actual && anchoArial(`${actual} ${palabra}`, p.h) > p.ancho) { lineas.push(actual); actual = palabra; }
          else actual += (actual ? ' ' : '') + palabra;
        }
        lineas.push(actual);
      }
      const columna = (p.ancla - 1) % 3, fila = Math.floor((p.ancla - 1) / 3), h = p.h;
      const base = fila === 0 ? h : fila === 1 ? -(lineas.length - 1) * h * .7 + h * .36 : -(lineas.length - 1) * h * 1.4;
      cuerpo = `<g transform="translate(${p.punto[0]} ${-p.punto[1]}) rotate(${-p.giro})"><text fill="${c}" font-family="Arial" font-size="${h / .716}" text-anchor="${['start', 'middle', 'end'][columna]}">${lineas.map((t, j) => `<tspan x="0" y="${base + j * h * 1.4}">${esc(t)}</tspan>`).join('')}</text></g>`;
    } else if (['relleno', 'sombreado'].includes(p.tipo)) {
      const puntos = p.puntos.map(([x, y]) => `${x},${-y}`).join(' ');
      if (p.tipo === 'sombreado' && !p.solido) {
        // Rayado con líneas de verdad recortadas a la forma: un <pattern> lo trocea Chromium en el PDF (1,4 MB por hoja).
        const xs = p.puntos.map((q) => q[0]), ys = p.puntos.map((q) => -q[1]), paso = trazo * 5;
        const [x0, x1, y0, y1] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
        let d = '';
        for (let k = Math.floor((x0 - y1) / paso) * paso; k <= x1 - y0; k += paso) d += `M${k + y0} ${y0}L${k + y1} ${y1}`;
        defs.push(`<clipPath id="s${i}"><polygon points="${puntos}"/></clipPath>`);
        cuerpo = `<path d="${d}" clip-path="url(#s${i})" fill="none" stroke="${c}" stroke-width="${trazo / 2}"/>`;
      } else cuerpo = `<polygon points="${puntos}" fill="${c}"/>`;
    } else if (p.tipo === 'arco') {
      const [x, y] = p.punto;
      if (p.hasta - p.desde >= 359.999) cuerpo = `<circle cx="${x}" cy="${-y}" r="${p.r}" fill="none" stroke="${c}"/>`;
      else { const a = p.desde * Math.PI / 180, b = p.hasta * Math.PI / 180; cuerpo = `<path d="M ${x + p.r * Math.cos(a)} ${-y - p.r * Math.sin(a)} A ${p.r} ${p.r} 0 ${(p.hasta - p.desde + 360) % 360 > 180 ? 1 : 0} 0 ${x + p.r * Math.cos(b)} ${-y - p.r * Math.sin(b)}" fill="none" stroke="${c}"/>`; }
    }
    let recorte = '';
    if (p.recorte) { const v = p.recorte; recorte = `v${v.id}`; if (!defs.some(s => s.includes(`id="${recorte}"`))) defs.push(`<clipPath id="${recorte}"><rect x="${v.centro[0] - v.ancho / 2}" y="${-v.centro[1] - v.alto / 2}" width="${v.ancho}" height="${v.alto}"/></clipPath>`); }
    partes.push({ recorte, cuerpo });
  }
  // Lo de una misma ventana, en un solo grupo recortado: un recorte por elemento multiplicaba el tamaño del PDF (5,9 MB en 4 hojas).
  let cuerpo = '';
  for (let i = 0; i < partes.length;) {
    let j = i;
    while (j < partes.length && partes[j].recorte === partes[i].recorte) j++;
    const grupo = partes.slice(i, j).map((q) => q.cuerpo).join('');
    cuerpo += partes[i].recorte ? `<g clip-path="url(#${partes[i].recorte})">${grupo}</g>` : grupo;
    i = j;
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${ancho}" height="${alto}" viewBox="${zona.x0} ${-zona.y1} ${zona.x1 - zona.x0} ${zona.y1 - zona.y0}" style="stroke-width:${trazo}"><defs>${defs.join('')}</defs>${cuerpo}</svg>`;
}
