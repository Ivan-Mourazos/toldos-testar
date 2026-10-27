// Genera src/remolques/ganado/economicoDatos.ts: el corte y el dibujo de confección del remolque económico de
// Remolcar, sacados de los originales (docs/modelos/remolque-ganado.md):
// - el corte, del DXF real del bot de AR2600752 (mm), que es el de la plantilla «POR MEDIDAS» más las dos
//   solapas cortadas aparte, igual que en AR2601976;
// - el dibujo, de la zona «POR MEDIDAS (SE HIZO ASÍ) AR2202089» de REMOLQUE 3M ECO 3X150 (BUENO).dwg (metros).
// Solo lee: las copias están en tmp/dxf-estudio/ganado (convertidas con ODA). Uso:
//   node scripts/ganado/extraer-economico.mjs [--comprobar]
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const ESTUDIO = path.join(raiz, 'tmp/dxf-estudio/ganado');
const BOT = path.join(ESTUDIO, 'originales/AR2600752-bot.dxf');
const PLANTILLA = path.join(ESTUDIO, 'plantillas/dxf/t164.dxf');
const SALIDA = path.join(raiz, 'src/remolques/ganado/economicoDatos.ts');
// Zona del dibujo dentro de la zona «POR MEDIDAS» de la plantilla (metros): el corte colocado va debajo (y < 580).
const ZONA_DIBUJO = { x0: 1278, x1: 1296, y0: 582.3, y1: 586.6 };

// --- Lector de DXF en texto: entidades con todos sus códigos, bloques y polilíneas con curvas ---
function leer(ruta) {
  const bruto = fs.readFileSync(ruta);
  const texto = bruto.toString('utf8').includes('�') ? bruto.toString('latin1') : bruto.toString('utf8');
  const ls = texto.split(/\r?\n/);
  const pares = [];
  for (let i = 0; i + 1 < ls.length; i += 2) pares.push([ls[i].trim(), ls[i + 1]]);
  const entidades = [], bloques = new Map();
  let seccion = '', bloque = null, actual = null;
  const cerrar = () => {
    if (!actual) return;
    if (actual.t === 'BLOCK') { bloque = { nombre: actual.g['2']?.trim(), origen: [+actual.g['10'] || 0, +actual.g['20'] || 0], ents: [] }; }
    else if (actual.t === 'ENDBLK') { if (bloque) bloques.set(bloque.nombre, bloque); bloque = null; }
    else if (seccion === 'ENTITIES' || (seccion === 'BLOCKS' && bloque)) (bloque ? bloque.ents : entidades).push(actual);
    actual = null;
  };
  for (let i = 0; i < pares.length; i++) {
    const [c, v] = pares[i];
    if (c === '0') {
      cerrar();
      const t = v.trim();
      if (t === 'SECTION') { seccion = pares[i + 1]?.[1]?.trim() ?? ''; continue; }
      if (t === 'ENDSEC') { seccion = ''; continue; }
      actual = { t, g: {}, todos: [] };
      continue;
    }
    if (!actual) continue;
    actual.todos.push([c, v]);
    if (!(c in actual.g)) actual.g[c] = v;
  }
  cerrar();
  return { entidades, bloques };
}

// Vértices de una LWPOLYLINE con su curva (código 42) en cada uno.
function vertices(e) {
  const out = [];
  for (const [c, v] of e.todos) {
    if (c === '10') out.push([+v, 0, 0]);
    else if (c === '20' && out.length) out.at(-1)[1] = +v;
    else if (c === '42' && out.length) out.at(-1)[2] = +v;
  }
  return out;
}

// Expande los INSERT (traslación, giro y escala) y devuelve entidades sueltas con una transformación aplicada.
function expandir({ entidades, bloques }) {
  const out = [];
  const paso = (es, T, giroT, escala, capaPadre, prof) => {
    for (const e of es) {
      const capa = e.g['8']?.trim() === '0' ? capaPadre : (e.g['8']?.trim() ?? capaPadre);
      if (e.t === 'INSERT' && prof < 8) {
        const b = bloques.get(e.g['2']?.trim()); if (!b) continue;
        const a = (+e.g['50'] || 0) * Math.PI / 180, sx = +(e.g['41'] ?? 1), sy = +(e.g['42'] ?? 1), c = Math.cos(a), s = Math.sin(a);
        const tx = +e.g['10'] || 0, ty = +e.g['20'] || 0;
        paso(b.ents, (p) => T([tx + (p[0] - b.origen[0]) * sx * c - (p[1] - b.origen[1]) * sy * s, ty + (p[0] - b.origen[0]) * sx * s + (p[1] - b.origen[1]) * sy * c]),
          giroT + (+e.g['50'] || 0), escala * sx, capa, prof + 1);
        continue;
      }
      out.push({ ...e, capa, T, giroT, escala });
    }
  };
  paso(entidades, (p) => p, 0, 1, '0', 0);
  return out;
}

const r = (v, d = 1) => Math.round(v * 10 ** d) / 10 ** d;
const limpiarMtext = (v) => String(v).replace(/\\P/g, ' ').replace(/\\[ACcFfHhLlOoQqTtWw][^;\\]*;/g, '').replace(/\\[LlOoKk]/g, '').replace(/[{}]/g, '')
  .replace(/%%[cC]/g, 'Ø').replace(/\\U\+([0-9A-Fa-f]{4})/g, (_, h) => String.fromCharCode(parseInt(h, 16))).replace(/\s+/g, ' ').trim();

// --- 1. El corte del bot (mm) ---
const bot = expandir(leer(BOT)).filter((e) => ['LINE', 'ARC', 'CIRCLE'].includes(e.t) && (+e.g['10'] || 0) > 300); // sin la leyenda de capas
const pts = bot.flatMap((e) => (e.t === 'LINE' ? [[+e.g['10'], +e.g['20']], [+e.g['11'], +e.g['21']]] : [[+e.g['10'] - +e.g['40'], +e.g['20'] - +e.g['40']], [+e.g['10'] + +e.g['40'], +e.g['20'] + +e.g['40']]]));
const ox = Math.min(...pts.map((p) => p[0])), oy = Math.min(...pts.map((p) => p[1]));
const capaDe = (e) => e.capa.toUpperCase();
const corte = { lineas: [], arcos: [], ollaos: [], rot: [] };
for (const e of bot) {
  if (e.t === 'LINE') {
    const l = [r(+e.g['10'] - ox), r(+e.g['20'] - oy), r(+e.g['11'] - ox), r(+e.g['21'] - oy)];
    (capaDe(e) === 'ROTULADOR' ? corte.rot : corte.lineas).push(l);
  } else if (e.t === 'ARC') corte.arcos.push({ x: r(+e.g['10'] - ox), y: r(+e.g['20'] - oy), r: r(+e.g['40']), desde: r(+e.g['50'], 3), hasta: r(+e.g['51'], 3) });
  else if (capaDe(e) === 'ROTULADOR') corte.ollaos.push([r(+e.g['10'] - ox), r(+e.g['20'] - oy)]);
}
const W = r(Math.max(...pts.map((p) => p[0])) - ox), H = r(Math.max(...pts.map((p) => p[1])) - oy);

// Distancia y dirección de cada ollao a su borde más cercano: un tramo de corte o el orillo (y = 0), por donde no
// pasa la sierra. Con eso el corte los pone a la distancia de la regla (Iván, 23/10/2026: 4 cm del borde de corte).
function bordeMasCercano([x, y]) {
  let mejor = { d: y, nx: 0, ny: -1 }; // el orillo
  for (const [x1, y1, x2, y2] of corte.lineas) {
    const L2 = (x2 - x1) ** 2 + (y2 - y1) ** 2; if (L2 < 1) continue;
    const u = ((x - x1) * (x2 - x1) + (y - y1) * (y2 - y1)) / L2;
    if (u < 0 || u > 1) continue;
    const px = x1 + u * (x2 - x1), py = y1 + u * (y2 - y1), d = Math.hypot(px - x, py - y);
    if (d < mejor.d) mejor = { d, nx: (px - x) / d, ny: (py - y) / d };
  }
  return mejor;
}
const ollaos = corte.ollaos.map((p) => { const b = bordeMasCercano(p); return [p[0], p[1], r(b.nx, 4), r(b.ny, 4), r(b.d)]; });

// El cuerpo (el rectángulo grande, con «DERECHO», la OF y «X2» dentro en el original).
const verticales = corte.lineas.filter(([x1, , x2]) => Math.abs(x1 - x2) < 0.05).sort((a, b) => Math.abs(b[3] - b[1]) - Math.abs(a[3] - a[1]));
const derecha = Math.max(...corte.lineas.flatMap((l) => [l[0], l[2]]));
const ladoCuerpo = verticales.find((l) => Math.abs(l[0] - derecha) > 2000 && Math.abs(l[3] - l[1]) > 1900);
// Arriba, la raya horizontal que llega al lado derecho (la del lado izquierdo sigue hacia las solapas).
const techo = corte.lineas.filter(([x1, y1, x2, y2]) => Math.abs(y1 - y2) < 0.05 && Math.abs(Math.max(x1, x2) - derecha) < 0.05)
  .reduce((m, l) => Math.max(m, l[1]), 0);
const cuerpo = { x0: ladoCuerpo[0], x1: derecha, y0: 0, y1: techo };
// Las piezas que van contra el orillo no tienen corte abajo; si el colocador las sube del orillo, hace falta.
const abajo = corte.lineas.filter((l) => Math.abs(l[0] - l[2]) < 0.05 && Math.min(l[1], l[3]) < 0.05).map((l) => l[0]);
const cierreOrillo = [Math.min(...abajo), 0, Math.max(...abajo), 0];

// --- 2. El dibujo de confección de la plantilla (metros → cm) ---
const plantilla = expandir(leer(PLANTILLA));
const enZona = ([x, y]) => x >= ZONA_DIBUJO.x0 && x <= ZONA_DIBUJO.x1 && y >= ZONA_DIBUJO.y0 && y <= ZONA_DIBUJO.y1;
const CAPAS = { corte: 'DISCO1', referencias: 'referencias', 'referencia-1': 'referencias', marca: 'ROTULADOR', texto: 'texto', ejes: 'ejes' };
const dibujo = { lineas: [], polilineas: [], arcos: [], circulos: [], textos: [], cotas: [] };
const crudo = [];
for (const e of plantilla) {
  const capa = CAPAS[e.capa];
  const T = e.T;
  if (e.t === 'LINE' && capa) {
    const a = T([+e.g['10'], +e.g['20']]), b = T([+e.g['11'], +e.g['21']]);
    if (enZona(a) && enZona(b)) crudo.push({ tipo: 'linea', capa, a, b });
  } else if (e.t === 'LWPOLYLINE' && capa) {
    const vs = vertices(e).map(([x, y, q]) => [...T([x, y]), q]);
    if (vs.length && vs.every(enZona)) crudo.push({ tipo: 'polilinea', capa, vs, cerrada: (+e.g['70'] & 1) === 1 });
  } else if ((e.t === 'ARC' || e.t === 'CIRCLE') && capa) {
    const c = T([+e.g['10'], +e.g['20']]);
    if (enZona(c)) crudo.push({ tipo: e.t === 'ARC' ? 'arco' : 'circulo', capa, c, rad: +e.g['40'] * e.escala, desde: +e.g['50'] + e.giroT, hasta: +e.g['51'] + e.giroT });
  } else if ((e.t === 'TEXT' || e.t === 'MTEXT') && e.capa === 'texto') {
    const usaAlineacion = e.t === 'TEXT' && ((+e.g['72'] || 0) !== 0 || (+e.g['73'] || 0) !== 0);
    const p = T(usaAlineacion ? [+e.g['11'], +e.g['21']] : [+e.g['10'], +e.g['20']]);
    if (!enZona(p)) continue;
    const valor = e.t === 'MTEXT' ? limpiarMtext(e.todos.filter(([c]) => c === '3' || c === '1').map(([, v]) => v).join('')) : limpiarMtext(e.g['1'] ?? '');
    crudo.push({ tipo: 'texto', p, valor, h: +e.g['40'] * e.escala, giro: (+e.g['50'] || 0) + e.giroT, mtext: e.t === 'MTEXT', anclaje: +e.g['71'] || 0, alin: [+e.g['72'] || 0, +e.g['73'] || 0] });
  } else if (e.t === 'DIMENSION' && e.capa === 'cotas') {
    const p1 = T([+e.g['13'], +e.g['23']]), p2 = T([+e.g['14'], +e.g['24']]), dl = T([+e.g['10'], +e.g['20']]);
    if (!enZona(p1) || !enZona(p2)) continue;
    crudo.push({ tipo: 'cota', p1, p2, dl, giro: (+e.g['50'] || 0) + e.giroT, clase: (+e.g['70'] || 0) & 7, medida: +e.g['42'], texto: limpiarMtext(e.g['1'] ?? '') });
  }
}
const dpts = crudo.flatMap((c) => (c.tipo === 'linea' ? [c.a, c.b] : c.tipo === 'polilinea' ? c.vs : c.tipo === 'cota' ? [c.p1, c.p2] : c.tipo === 'texto' ? [c.p] : [c.c]));
const dx0 = Math.min(...dpts.map((p) => p[0])), dy0 = Math.min(...dpts.map((p) => p[1]));
const cm = ([x, y]) => [r((x - dx0) * 100, 2), r((y - dy0) * 100, 2)];
for (const c of crudo) {
  if (c.tipo === 'linea') { const [x1, y1] = cm(c.a), [x2, y2] = cm(c.b); dibujo.lineas.push({ capa: c.capa, x1, y1, x2, y2 }); }
  else if (c.tipo === 'polilinea') {
    const curvas = c.vs.map((v) => r(v[2], 6));
    dibujo.polilineas.push({ capa: c.capa, puntos: c.vs.map((v) => cm(v)), cerrada: c.cerrada, ...(curvas.some((q) => q !== 0) ? { curvas } : {}) });
  } else if (c.tipo === 'arco') { const [x, y] = cm(c.c); dibujo.arcos.push({ capa: c.capa, x, y, r: r(c.rad * 100, 2), desde: r(c.desde, 3), hasta: r(c.hasta, 3) }); }
  else if (c.tipo === 'circulo') { const [x, y] = cm(c.c); dibujo.circulos.push({ capa: c.capa, x, y, r: r(c.rad * 100, 2) }); }
  else if (c.tipo === 'texto') {
    // MTEXT con anclaje 1-9 (3 x 3) y TEXT con su alineación: se guarda el centro para escribirlo centrado.
    let [x, y] = cm(c.p);
    const h = r(c.h * 100, 2), ancho = c.valor.length * h * 0.6, a = (c.giro * Math.PI) / 180;
    let ux = 0, uy = 0;
    if (c.mtext) { const k = c.anclaje || 1; ux = [0.5, 0, -0.5][(k - 1) % 3]; uy = [-0.5, 0, 0.5][Math.floor((k - 1) / 3)]; }
    else if (!c.alin[0] && !c.alin[1]) { ux = 0.5; uy = 0.5; }
    else { ux = [0.5, 0, -0.5, 0, 0, 0][c.alin[0]] ?? 0; uy = [0.5, 0.5, 0, -0.5][c.alin[1]] ?? 0; }
    const sx = ux * ancho, sy = uy * h;
    x = r(x + sx * Math.cos(a) - sy * Math.sin(a), 2); y = r(y + sx * Math.sin(a) + sy * Math.cos(a), 2);
    dibujo.textos.push({ valor: c.valor, x, y, h, giro: r(((c.giro % 360) + 360) % 360, 2) });
  } else if (c.tipo === 'cota') {
    const [x1, y1] = cm(c.p1), [x2, y2] = cm(c.p2), [lx, ly] = cm(c.dl);
    const valor = r(c.texto && /^[\d.,]+$/.test(c.texto) ? Number(c.texto.replace(',', '.')) : c.medida, 2);
    const giro = ((Math.round(c.giro) % 180) + 180) % 180;
    // Una cota girada en la dirección de sus dos puntos mide lo mismo que una alineada (los 112,5 del lateral de
    // la zona en cuña, a 19°).
    const direccion = ((Math.atan2(y2 - y1, x2 - x1) * 180) / Math.PI + 180) % 180;
    if (c.clase === 1 || (giro !== 0 && giro !== 90 && Math.abs(direccion - (((c.giro % 180) + 180) % 180)) < 1)) {
      // Alineada: la línea de cota a `desvio` cm, a la izquierda de 1 → 2.
      const L = Math.hypot(x2 - x1, y2 - y1), nx = -(y2 - y1) / L, ny = (x2 - x1) / L;
      dibujo.cotas.push({ x1, y1, x2, y2, valor, alineada: true, desvio: r((lx - x1) * nx + (ly - y1) * ny, 2) });
    } else if (giro === 90) dibujo.cotas.push({ x1, y1, x2, y2, valor, giro: 90, d: lx });
    else dibujo.cotas.push({ x1, y1, x2, y2, valor, giro: 0, d: ly });
  }
}
const dw = r(Math.max(...dpts.map((p) => p[0])) * 100 - dx0 * 100, 1), dh = r(Math.max(...dpts.map((p) => p[1])) * 100 - dy0 * 100, 1);

const resumen = {
  corte: { ancho: W, alto: H, lineas: corte.lineas.length, arcos: corte.arcos.length, ollaos: ollaos.length, rotulador: corte.rot.length, cuerpo, cierreOrillo,
    distanciasOllaos: [...new Set(ollaos.map((o) => o[4]))].sort((a, b) => a - b) },
  dibujo: { ancho: dw, alto: dh, lineas: dibujo.lineas.length, polilineas: dibujo.polilineas.length, arcos: dibujo.arcos.length, circulos: dibujo.circulos.length, textos: dibujo.textos.length, cotas: dibujo.cotas.map((c) => c.valor) },
};
console.log(JSON.stringify(resumen, null, 1));

const contenido = `// Generado por scripts/ganado/extraer-economico.mjs a partir de los originales; no se edita a mano.
// Corte: DXF real del bot de AR2600752 (mm, origen abajo a la izquierda, el orillo en y = 0). Dibujo: zona
// «POR MEDIDAS (SE HIZO ASÍ) AR2202089» de REMOLQUE 3M ECO 3X150 (BUENO).dwg (cm, origen abajo a la izquierda).

/** Ollao: [x, y, nx, ny, d]: posición original, dirección hacia su borde más cercano y distancia a él (mm). */
export type OllaoGanado = [number, number, number, number, number];

export const CORTE_ECONOMICO = {
  ancho: ${W},
  alto: ${H},
  /** El cuerpo, donde van la OF y la cantidad. */
  cuerpo: ${JSON.stringify(cuerpo)},
  /** Corte por el orillo: solo hace falta si el bloque no va pegado a él. */
  cierreOrillo: ${JSON.stringify(cierreOrillo)} as [number, number, number, number],
  lineas: ${JSON.stringify(corte.lineas)} as [number, number, number, number][],
  arcos: ${JSON.stringify(corte.arcos)},
  ollaos: ${JSON.stringify(ollaos)} as OllaoGanado[],
  rot: ${JSON.stringify(corte.rot)} as [number, number, number, number][],
};

export const DIBUJO_ECONOMICO = {
  ancho: ${dw},
  alto: ${dh},
  lineas: ${JSON.stringify(dibujo.lineas)},
  polilineas: ${JSON.stringify(dibujo.polilineas)} as { capa: string; puntos: [number, number][]; cerrada: boolean; curvas?: number[] }[],
  arcos: ${JSON.stringify(dibujo.arcos)},
  circulos: ${JSON.stringify(dibujo.circulos)},
  textos: ${JSON.stringify(dibujo.textos)},
  cotas: ${JSON.stringify(dibujo.cotas)} as ({ x1: number; y1: number; x2: number; y2: number; valor: number } & ({ giro: 0 | 90; d: number } | { alineada: true; desvio: number }))[],
};
`;
if (process.argv.includes('--comprobar')) {
  const actual = fs.existsSync(SALIDA) ? fs.readFileSync(SALIDA, 'utf8') : '';
  if (actual !== contenido) { console.error('economicoDatos.ts no coincide con los originales: vuelve a generarlo.'); process.exit(1); }
  console.log('economicoDatos.ts coincide con los originales.');
} else {
  fs.mkdirSync(path.dirname(SALIDA), { recursive: true });
  fs.writeFileSync(SALIDA, contenido);
  console.log('escrito', path.relative(raiz, SALIDA));
}
