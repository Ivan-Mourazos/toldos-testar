// Motor de rótulos en papel: no modifica contornos ni anidados.
import { escribirDxfPlano } from './presentacion.js';
import { cajasRotulos, crucesRotulosLineas } from './auditoriaRotulos.ts';
import { transformarPrimitiva } from '../../flujoDwg/planoDxf.js';

const PAPEL = { ancho: 276, alto: 151, centro: [148.5, 118.5] }, LETRA = 2.2;
const interseca = (a, b, margen = .3) => Math.min(a.x1, b.x1) + margen > Math.max(a.x0, b.x0) && Math.min(a.y1, b.y1) + margen > Math.max(a.y0, b.y0);
const cajaPuntos = ps => ({ x0: Math.min(...ps.map(p => p[0])), x1: Math.max(...ps.map(p => p[0])), y0: Math.min(...ps.map(p => p[1])), y1: Math.max(...ps.map(p => p[1])) });
const cajaLinea = p => ({ x0: Math.min(p.a[0], p.b[0]), x1: Math.max(p.a[0], p.b[0]), y0: Math.min(p.a[1], p.b[1]), y1: Math.max(p.a[1], p.b[1]) });
const coma = v => String(Math.round(v * 10) / 10).replace('.', ',');
// Intersección con las cajas ya medidas: evita recalcular todos los MTEXT al buscar un enlace.
function cruzaCaja(l, b) {
  let desde = 0, hasta = 1;
  for (const [i, lo, hi] of [[0, b.x0 - .15, b.x1 + .15], [1, b.y0 - .15, b.y1 + .15]]) {
    const d = l.b[i] - l.a[i];
    if (Math.abs(d) < 1e-10) { if (l.a[i] < lo || l.a[i] > hi) return false; }
    else {
      const t0 = (lo - l.a[i]) / d, t1 = (hi - l.a[i]) / d;
      desde = Math.max(desde, Math.min(t0, t1)); hasta = Math.min(hasta, Math.max(t0, t1));
      if (desde > hasta) return false;
    }
  }
  return true;
}
function atraviesa(a, b, c, d) {
  const u = [b[0] - a[0], b[1] - a[1]], v = [d[0] - c[0], d[1] - c[1]], w = [c[0] - a[0], c[1] - a[1]];
  const cruz = (p, q) => p[0] * q[1] - p[1] * q[0], divisor = cruz(u, v);
  if (Math.abs(divisor) < 1e-9) return false;
  const t = cruz(w, v) / divisor, s = cruz(w, u) / divisor;
  return t > 1e-6 && t < 1 - 1e-6 && s >= -1e-6 && s <= 1 + 1e-6;
}
// Cara del corte que contiene el ancla original. Un identificador no debe saltar a la pieza vecina para crecer.
function caraEn(p, lineas) {
  const marco = cajaPuntos(lineas.flatMap(l => [l.a, l.b]));
  if (p[0] < marco.x0 || p[0] > marco.x1 || p[1] < marco.y0 || p[1] > marco.y1) return null;
  const intersecciones = eje => {
    const otro = 1 - eje;
    return [...new Set(lineas.filter(l => (l.a[otro] > p[otro]) !== (l.b[otro] > p[otro])).map(l =>
      Math.round((l.a[eje] + (p[otro] - l.a[otro]) * (l.b[eje] - l.a[eje]) / (l.b[otro] - l.a[otro])) * 1e5) / 1e5))].sort((a, b) => a - b);
  };
  // El borde del rollo puede no llevar línea de máquina: también limita el hueco disponible.
  const xs = [marco.x0, ...intersecciones(0), marco.x1], ys = [marco.y0, ...intersecciones(1), marco.y1];
  const b = { x0: Math.max(...xs.filter(x => x < p[0])), x1: Math.min(...xs.filter(x => x > p[0])),
    y0: Math.max(...ys.filter(y => y < p[1])), y1: Math.min(...ys.filter(y => y > p[1])) };
  return Object.values(b).every(Number.isFinite) ? b : null;
}
function repartirCara(cara, p, vecinos) {
  const b = { ...cara }, w = cara.x1 - cara.x0, h = cara.y1 - cara.y0;
  const columnas = [p[0]], filas = [p[1]];
  for (const q of vecinos) {
    const dx = q[0] - p[0], dy = q[1] - p[1];
    if (Math.hypot(dx, dy) < 1e-5 || q[0] <= cara.x0 || q[0] >= cara.x1 || q[1] <= cara.y0 || q[1] >= cara.y1) continue;
    if (Math.abs(dx) / w > Math.abs(dy) / h) {
      columnas.push(q[0]);
    } else {
      filas.push(q[1]);
    }
  }
  const dividir = (xs, posicion, inicio, largo) => {
    const niveles = [...new Set(xs.map(x => Math.round(x * 1e4)))].sort((a, b) => a - b);
    const i = niveles.indexOf(Math.round(posicion * 1e4));
    return [inicio + largo * i / niveles.length, inicio + largo * (i + 1) / niveles.length];
  };
  [b.x0, b.x1] = dividir(columnas, p[0], cara.x0, w);
  [b.y0, b.y1] = dividir(filas, p[1], cara.y0, h);
  return b;
}
function puntosArco(a) {
  const desde = a.desde ?? 0, hasta = a.hasta ?? 360, barrido = ((hasta - desde) % 360 + 360) % 360 || 360;
  return [desde, hasta, ...[0, 90, 180, 270].filter(g => ((g - desde) % 360 + 360) % 360 <= barrido)]
    .map(g => [a.x + a.r * Math.cos(g * Math.PI / 180), a.y + a.r * Math.sin(g * Math.PI / 180)]);
}

function limites(g) {
  const ps = [...g.lineas.flatMap(l => [[l.x1, l.y1], [l.x2, l.y2]]), ...g.polilineas.flatMap(p => p.puntos),
    ...[...g.arcos, ...g.circulos].flatMap(puntosArco),
    ...g.textos.filter(t => !t.papel).map(t => [t.x, t.y]), ...g.cotas.filter(c => c.capa !== 'vent-pre-noimpr').flatMap(c => c.alineada
      ? [[c.x1, c.y1], [c.x2, c.y2]] : c.giro === 90 ? [[c.d, c.y1], [c.d, c.y2]] : [[c.x1, c.d], [c.x2, c.d]])];
  return cajaPuntos(ps);
}

function segmentos(p, error) {
  if (p.tipo === 'raya' && !p.curva) return [p];
  if (p.tipo === 'raya' && p.curva) {
    const [x, y] = p.a, dx = p.b[0] - x, dy = p.b[1] - y, b = p.curva;
    const centro = [(x + p.b[0]) / 2 - dy * (1 - b * b) / (4 * b), (y + p.b[1]) / 2 + dx * (1 - b * b) / (4 * b)];
    const desde = Math.atan2(y - centro[1], x - centro[0]) * 180 / Math.PI, giro = 4 * Math.atan(b) * 180 / Math.PI;
    return segmentos({ ...p, tipo: 'arco', punto: centro, r: Math.hypot(x - centro[0], y - centro[1]), desde: giro > 0 ? desde : desde + giro, hasta: giro > 0 ? desde + giro : desde }, error);
  }
  if (p.tipo !== 'arco') return [];
  const grados = ((p.hasta - p.desde) % 360 + 360) % 360 || 360;
  const pasos = Math.max(8, Math.ceil(grados * Math.PI / 180 / (2 * Math.acos(Math.max(-1, 1 - error / p.r)))));
  const puntos = Array.from({ length: pasos + 1 }, (_, i) => {
    const a = (p.desde + grados * i / pasos) * Math.PI / 180;
    return [p.punto[0] + p.r * Math.cos(a), p.punto[1] + p.r * Math.sin(a)];
  });
  return puntos.slice(1).map((b, i) => ({ ...p, tipo: 'raya', a: puntos[i], b }));
}

// Índice en mm de papel: la búsqueda de huecos conserva distancia real a líneas y otras anotaciones.
function indiceLineas(lineas) {
  const celdas = new Map();
  const claves = c => {
    const ks = [];
    for (let x = Math.floor(c.x0 / 10); x <= Math.floor(c.x1 / 10); x++) for (let y = Math.floor(c.y0 / 10); y <= Math.floor(c.y1 / 10); y++) ks.push(`${x},${y}`);
    return ks;
  };
  const anadir = l => { for (const k of claves(cajaLinea(l))) { const ls = celdas.get(k) ?? []; ls.push(l); celdas.set(k, ls); } };
  for (const l of lineas) anadir(l);
  const consultar = c => [...new Set(claves(c).flatMap(k => celdas.get(k) ?? []))];
  consultar.anadir = anadir;
  return consultar;
}

const desplazamientos = [[0, 0]];
for (let radio = 1; radio <= 16; radio++) {
  const fila = [];
  for (let x = -radio; x <= radio; x++) for (const y of [-radio, radio]) fila.push([x, y]);
  for (let y = -radio + 1; y < radio; y++) for (const x of [-radio, radio]) fila.push([x, y]);
  desplazamientos.push(...fila.sort((a, b) => Math.hypot(...a) - Math.hypot(...b)).map(([x, y]) => [x * 1.5, y * 1.5]));
}

const cajaTexto = t => cajasRotulos([{ tipo: 'texto', valor: t.valor, punto: [t.x, t.y], h: t.h, giro: t.giro, ancho: t.ancho, ancla: t.ancla ?? (t.centrado ? 5 : 7) }])[0];
const unir = cajas => ({ x0: Math.min(...cajas.map(b => b.x0)), x1: Math.max(...cajas.map(b => b.x1)), y0: Math.min(...cajas.map(b => b.y0)), y1: Math.max(...cajas.map(b => b.y1)) });
function ejeCota(c) {
  const dx = c.x2 - c.x1, dy = c.y2 - c.y1, l = Math.hypot(dx, dy);
  const u = c.alineada ? [dx / l, dy / l] : c.giro === 90 ? [0, 1] : [1, 0];
  const normal = c.alineada ? [-u[1], u[0]] : c.giro === 90 ? [1, 0] : [0, 1];
  const origen = c.alineada ? [c.x1 + normal[0] * c.desvio, c.y1 + normal[1] * c.desvio] : c.giro === 90 ? [c.d, c.y1] : [c.x1, c.d];
  const largo = c.alineada ? l : c.giro === 90 ? Math.abs(dy) : Math.abs(dx);
  if (!c.alineada && (c.giro === 90 ? dy : dx) < 0) { origen[0] -= u[0] * largo; origen[1] -= u[1] * largo; }
  return { origen, u, normal, largo, punto: s => [origen[0] + u[0] * s, origen[1] + u[1] * s] };
}
function limitesVista(g) {
  const base = limites(g), cajas = g.textos.map(cajaTexto).filter(Boolean);
  return unir([base, ...cajas, ...cajasRotulos(g.fijos ?? []), ...g.cotas.filter(c => c.capa !== 'vent-pre-noimpr').flatMap(c => {
    const e = ejeCota(c), p = e.punto(e.largo), t = c.posicionTexto;
    return [cajaPuntos([e.origen, p]), ...(t ? cajasRotulos([{ tipo: 'texto', valor: c.rotulo ?? coma(c.valor), punto: t, h: c.alturaTexto, ancla: 5, giro: c.textoGirado ? -90 : c.giro ?? 0 }]) : [])];
  })]);
}
function prepararGrupo(g, area) {
  const geomet = { ...g.entidades, textos: [], cotas: [] }, pieza = limites(geomet);
  const titulo = !g.corte && !g.sinTitulo ? g.entidades.textos.find(t => t.capa === 'texto') : null;
  const originales = g.entidades.cotas.map(c => ({ c, d: c.d }));
  const z0 = limites(g.entidades);
  const sinGiro = Math.min(area.ancho / (z0.x1 - z0.x0), area.alto / (z0.y1 - z0.y0));
  const conGiro = Math.min(area.ancho / (z0.y1 - z0.y0), area.alto / (z0.x1 - z0.x0));
  const giro = g.giroFijo ?? (g.corte && conGiro > sinGiro ? 90 : 0);
  const escalaDe = z => .94 * Math.min(area.ancho / (giro ? z.y1 - z.y0 : z.x1 - z.x0), area.alto / (giro ? z.x1 - z.x0 : z.y1 - z.y0));
  let escala = escalaDe(z0), zona;
  const origenes = new Map(g.entidades.textos.map(t => [t, { x: t.x, y: t.y, giro: t.giro ?? 0 }]));
  for (let vuelta = 0; vuelta < 6; vuelta++) {
    if (!g.cotasFijas) for (const { c, d } of originales) { c.d = d; delete c.enlaceTexto; c.huecoTexto = true; }
    for (const t of g.entidades.textos) {
      if (t.capa !== 'texto') continue;
      t.h = (t === titulo ? 2.5 : LETRA) / escala;
      t.giro = origenes.get(t).giro;
      if (giro && ((t.giro + giro) % 360 + 360) % 360 > 90 && ((t.giro + giro) % 360 + 360) % 360 <= 270) t.giro += 180;
      t.ancla = t.ancla ?? (t.centrado ? 5 : 7);
      const central = Math.abs(t.x - (pieza.x0 + pieza.x1) / 2) < (pieza.x1 - pieza.x0) * .18;
      t.ancho = (t === titulo ? Math.min(area.ancho - 8, Math.max(35, (pieza.x1 - pieza.x0) * escala * .9)) : !g.corte && g.anchoRotulosDibujo && central ? g.anchoRotulosDibujo : g.corte && g.anchoRotulosCorte ? g.anchoRotulosCorte : (g.corte || t.valor.length > 45) && !t.valor.startsWith('Bajos ') ? 22 : /\s/.test(t.valor) ? 45 : 30) / escala;
      if (t.encimaDe != null) t.y = t.encimaDe + 2 * t.h;
    }
    const escaleras = Map.groupBy(g.cotasFijas ? [] : g.entidades.cotas.filter(c => c.capa !== 'vent-pre-noimpr' && !c.alineada), c => [c.giro, c.x1.toFixed(5), c.y1.toFixed(5), Math.sign(c.d - (c.giro === 90 ? c.x1 : c.y1))].join('|'));
    for (const cs of escaleras.values()) {
      const normal = cs[0].giro === 90 ? cs[0].x1 : cs[0].y1, signo = Math.sign(cs[0].d - normal) || 1;
      const ordenadas = cs.toSorted((a, b) => Math.abs(a.d - normal) - Math.abs(b.d - normal));
      let anterior = -Infinity;
      for (const [i, c] of ordenadas.entries()) {
        const distancia = Math.max(Math.abs(c.d - normal), anterior + LETRA * 2 / escala);
        c.d = c.techoEscalera != null ? c.techoEscalera + LETRA * 2 * (i + 1) / escala
          : c.escaleraInterior ? normal + c.escaleraInterior * LETRA * 2 * (i + 1) / escala : normal + signo * distancia;
        anterior = distancia;
      }
    }
    if (!g.cotasFijas) for (const c of g.entidades.cotas.filter(c => c.capa !== 'vent-pre-noimpr')) {
      c.alturaTexto = LETRA / escala; c.textoGirado = Boolean(giro && c.giro === 90);
      const e = ejeCota(c); c.posicionTexto = e.punto(e.largo / 2);
    }
    if (titulo) { titulo.ancla = 5; titulo.centrado = true; titulo.giro = 0; titulo.x = (pieza.x0 + pieza.x1) / 2; titulo.y = Math.max(pieza.y1, ...g.entidades.cotas.filter(c => !c.alineada && c.giro !== 90).map(c => c.d)) + titulo.h * (g.nombre.startsWith('GANADO') ? 5 : 3); }
    zona = limitesVista(g.entidades);
    const margen = (g.margenPapel ?? 9) / escala;
    zona = { x0: zona.x0 - margen, x1: zona.x1 + margen, y0: zona.y0 - margen, y1: zona.y1 + margen };
    if (g.banda) { zona.y0 = Math.max(zona.y0, g.banda.y0); zona.y1 = Math.min(zona.y1, g.banda.y1); }
    escala = escalaDe(zona);
  }
  return { ...g, zona, escala, giro, area, titulo, pieza, origenes };
}

function bordeCercano(p, lineas, ocupadas = []) {
  let mejor;
  for (const l of lineas) {
    const dx = l.b[0] - l.a[0], dy = l.b[1] - l.a[1], ll = dx * dx + dy * dy;
    const t = ll ? Math.max(0, Math.min(1, ((p[0] - l.a[0]) * dx + (p[1] - l.a[1]) * dy) / ll)) : 0;
    for (const desplazamiento of [0, 1.5, -1.5, 3, -3]) {
      const u = Math.max(0, Math.min(1, t + desplazamiento / (Math.sqrt(ll) || 1)));
      const q = [l.a[0] + u * dx, l.a[1] + u * dy], d = Math.hypot(q[0] - p[0], q[1] - p[1]);
      if (ocupadas.some(b => q[0] >= b.x0 - .4 && q[0] <= b.x1 + .4 && q[1] >= b.y0 - .4 && q[1] <= b.y1 + .4)) continue;
      if (!mejor || d < mejor.d) mejor = { punto: q, d };
    }
  }
  return mejor?.punto ?? p;
}
function hastaCaja(origen, c) {
  const centro = [(c.x0 + c.x1) / 2, (c.y0 + c.y1) / 2], dx = centro[0] - origen[0], dy = centro[1] - origen[1];
  let t = 0;
  for (const [v, d, lo, hi] of [[origen[0], dx, c.x0 - .35, c.x1 + .35], [origen[1], dy, c.y0 - .35, c.y1 + .35]]) {
    if (d > 0 && v < lo) t = Math.max(t, (lo - v) / d);
    if (d < 0 && v > hi) t = Math.max(t, (hi - v) / d);
  }
  return [origen[0] + dx * t, origen[1] + dy * t];
}

function colocar(v, lineas, plano) {
  const z = v.zona, s = v.escala, cx = (z.x0 + z.x1) / 2, cy = (z.y0 + z.y1) / 2;
  const T = (x, y) => [(x - cx) * s, (y - cy) * s], M = p => [cx + p[0] / s, cy + p[1] / s];
  const limite = { x0: -(z.x1 - z.x0) * s / 2 + .7, x1: (z.x1 - z.x0) * s / 2 - .7, y0: -(z.y1 - z.y0) * s / 2 + .7, y1: (z.y1 - z.y0) * s / 2 - .7 };
  const ls = lineas.filter(l => interseca(cajaLinea(l), z, .001)).map(l => transformarPrimitiva(l, T, s));
  const cerca = indiceLineas(ls), ocupadas = v.entidades.textos.filter(t => t.capa !== 'texto').flatMap(t => cajasRotulos([
    { tipo: 'texto', valor: t.valor, punto: T(t.x, t.y), h: t.h * s, giro: t.giro ?? 0, ancho: t.ancho == null ? undefined : t.ancho * s, ancla: t.ancla ?? (t.centrado ? 5 : 7) }
  ]));
  ocupadas.push(...cajasRotulos((v.entidades.fijos ?? []).map(p => transformarPrimitiva(p, T, s))));
  const libre = (p, cota, enlace) => {
    const b = cajasRotulos([p])[0];
    const separacion = v.interioresObligatorios ? Math.min(.25, p.h * .1) : .25;
    const guardia = v.interioresObligatorios ? Math.min(.22, p.h * .08) : .22;
    if (!b || b.x0 < limite.x0 || b.x1 > limite.x1 || b.y0 < limite.y0 || b.y1 > limite.y1 || ocupadas.some(c => interseca(b, c, separacion))) return null;
    if (crucesRotulosLineas([p, ...cerca(b).filter(l => !(l.esBase && l.cota === cota && !enlace))], -guardia).length) return null;
    if (enlace && ocupadas.some(b => cruzaCaja(enlace, b))) return null;
    return b;
  };
  const guardar = b => { ocupadas.push(b); };
  const enlaces = [];
  if (v.cotasRecolocables?.length) colocarCotas(v.cotasRecolocables, true);
  if (v.corte && !v.cotasFijas) colocarCotas();
  const bordes = ls.filter(l => ['DISCO1', ...(v.interioresObligatorios ? ['CUTTER', 'DISCO2'] : [])].includes(l.capa) && !l.deCota);
  const identificador = t => v.corte && /^(?:[a-z]\d+|[A-Z]\d+(?:-\d+)?|\d{7})$/.test(t.valor);
  const textos = v.entidades.textos.filter(t => t.capa === 'texto').sort((a, b) => Number(b === v.titulo) - Number(a === v.titulo)
    || Number(identificador(b)) - Number(identificador(a)) || b.valor.length - a.valor.length);
  for (const t of textos) {
    const original = v.origenes.get(t), origen = T(t.x, t.y), h = t.h * s, ancla = t.ancla ?? (t.centrado ? 5 : 7);
    const base = { tipo: 'texto', valor: t.valor, h, giro: t.giro ?? 0, ancla, ancho: t.ancho * s };
    const caraOriginal = v.interioresObligatorios ? caraEn(origen, bordes) : null;
    const cara = caraOriginal ? repartirCara(caraOriginal, origen, [...v.origenes].filter(([t]) => t.capa === 'texto').map(([, t]) => T(t.x, t.y))) : null;
    const centro = cara && ancla === 5 ? [(cara.x0 + cara.x1) / 2, (cara.y0 + cara.y1) / 2] : origen;
    const margenCara = cara ? Math.min(.15, .04 * Math.min(cara.x1 - cara.x0, cara.y1 - cara.y0)) : 0;
    if (cara) {
      const opciones = [base.giro, base.giro + 90].map(giro => {
        const papel = ((giro + (v.giro ?? 0)) % 360 + 360) % 360;
        if (papel > 90 && papel <= 270) giro += 180;
        const b = cajasRotulos([{ ...base, punto: [0, 0], h: 1, giro }])[0];
        const cabe = Math.min((cara.x1 - cara.x0 - 2 * margenCara) / (b.x1 - b.x0), (cara.y1 - cara.y0 - 2 * margenCara) / (b.y1 - b.y0));
        return { giro, cabe };
      }).sort((a, b) => b.cabe - a.cabe);
      base.giro = opciones[0].giro;
      base.h = Math.min(base.h, opciones[0].cabe * .92);
    }
    const encabezadoCorte = v.corte && (/^(DERECHO|LONA |CRISTAL|PVC |OPCIÓN |SI NO HAY RESTO)/.test(t.valor)
      || v.cabecerasAmpliadas && /OPCIÓN|^PVC[: ]/.test(t.valor)
      || v.interioresObligatorios && !cara && /^(LAC|TRANSP|CORTAR POR EL REVÉS)/.test(t.valor));
    const referencia = T(...(t.referencia ?? [original.x, original.y]));
    const referencias = [[0, 0], [3, 0], [-3, 0], [0, 3], [0, -3], [6, 0], [-6, 0], [0, 6], [0, -6]]
      .map(([x, y]) => bordeCercano([referencia[0] + x, referencia[1] + y], bordes, ocupadas));
    let elegida, enlaceElegido;
    const maximo = t === v.titulo ? 20 : 24;
    const factores = v.factoresTexto ?? [1, .92, .84, .76, .68, .6, .52, .44, .36, .28, .2];
    const fases = v.cercaPrimero && v.corte ? [{ radio: 4.5, factores: factores.slice(0, 6) }, { radio: maximo, factores }]
      : [{ radio: maximo, factores: t === v.titulo ? [1] : factores }];
    const pasos = cara ? Array.from({ length: 81 }, (_, i) => [(i % 9 - 4) * (cara.x1 - cara.x0) / 10, (Math.floor(i / 9) - 4) * (cara.y1 - cara.y0) / 10])
      .sort((a, b) => Math.hypot(...a) - Math.hypot(...b)) : desplazamientos;
    for (const fase of fases) {
    for (const factor of fase.factores) {
    for (const [dx, dy] of pasos) {
      if (Math.hypot(dx, dy) > fase.radio) continue;
      const p = { ...base, h: base.h * factor, punto: [centro[0] + dx, centro[1] + dy] }, b0 = cajasRotulos([p])[0];
      if (cara && (b0.x0 < cara.x0 + margenCara || b0.x1 > cara.x1 - margenCara || b0.y0 < cara.y0 + margenCara || b0.y1 > cara.y1 - margenCara
        || bordes.some(l => atraviesa(origen, p.punto, l.a, l.b)))) continue;
      if (t === v.titulo && b0.y0 < (v.pieza.y1 - cy) * s + 1) continue;
      if (t.encimaDe != null && b0.y0 < (t.encimaDe - cy) * s + .4) continue;
      if (!libre(p, null)) continue;
      let enlace;
      const desplazamientoSinEnlace = v.notasSinReferencia ? 8 : /\s/.test(t.valor) ? 5.5 : 1.8;
      const interior = Boolean(cara) || v.interiores && /^(?:[A-Z]\d*(?:-\d+)?|\d{6,}|\d+X\d+)$/.test(t.valor)
        && !bordes.some(l => atraviesa(origen, p.punto, l.a, l.b));
      if (!interior && t !== v.titulo && !encabezadoCorte && (t.referencia || Math.hypot(dx, dy) > desplazamientoSinEnlace)) {
        const a = referencias.find(a => !(a[0] >= b0.x0 - .4 && a[0] <= b0.x1 + .4 && a[1] >= b0.y0 - .4 && a[1] <= b0.y1 + .4)
          && !ocupadas.some(b => cruzaCaja({ a, b: hastaCaja(a, b0) }, b))
          && (!v.enlacesSinCruces || !enlaces.some(l => atraviesa(a, hastaCaja(a, b0), l.a, l.b))));
        if (!a) continue;
        enlace = { a, b: hastaCaja(a, b0), capa: 'cotas' };
      }
      const b = libre(p, null, enlace);
      if (b) { elegida = p; enlaceElegido = enlace; guardar(b); break; }
    }
    if (elegida) break;
    }
    if (elegida) break;
    }
    if (!elegida) throw Error(`La nota «${t.valor}» necesita ampliar su pieza en ${v.nombre}`);
    [t.x, t.y] = M(elegida.punto);
    t.h = elegida.h / s;
    if (v.interioresObligatorios) t.giro = elegida.giro;
    if (enlaceElegido) {
      const [x1, y1] = M(enlaceElegido.a), [x2, y2] = M(enlaceElegido.b);
      plano.lineas.push({ capa: 'cotas', x1, y1, x2, y2 });
      cerca.anadir({ ...enlaceElegido, tipo: 'raya', deCota: true });
      enlaces.push(enlaceElegido);
    }
  }
  function colocarCotas(cotas = v.entidades.cotas, conservarAltura = false) {
  // Cada valor permanece sobre su línea; los de un tramo demasiado corto llevan su propio enlace.
  for (const c of cotas.filter(c => c.capa !== 'vent-pre-noimpr')) {
    const e = ejeCota(c), alturaObjetivo = c.alturaTexto * s, giro = c.textoGirado ? -90 : c.alineada ? Math.atan2(e.u[1], e.u[0]) * 180 / Math.PI : c.giro ?? 0;
    let elegida;
    const valor = c.rotulo ?? coma(c.valor);
    for (const factor of conservarAltura ? [1] : [1, .92, .84, .76, .68, .6, .52, .44, .36, .28, .2]) {
    const h = alturaObjetivo * factor;
    c.alturaTexto = h / s;
    const medir = cajasRotulos([{ tipo: 'texto', valor, punto: [0, 0], h, ancla: 5 }])[0];
    const ancho = medir.x1 - medir.x0, guardia = ((c.estilo === 'XERAL 5' ? .015 : .025) + .003) * s + .6 * h + .2;
    const lo = ancho / 2 + guardia, hi = e.largo * s - lo;
    const posiciones = [0.5, .72, .28, .88, .12].map(f => e.largo * s * f);
    if (lo < hi) for (let t = lo; t <= hi; t += h * .6) posiciones.push(t);
    for (const along of posiciones.filter(t => t >= lo && t <= hi)) {
      const p = { tipo: 'texto', valor, punto: T(...e.punto(along / s)), h, giro, ancla: 5 };
      const b = libre(p, c); if (b) { elegida = p; guardar(b); break; }
    }
    if (!elegida) {
      for (const distancia of [1.3, 2, 2.8, 3.6, 5, 7, 10, 14]) { for (const f of [.5, .8, .2, 1, 0, -(ancho / 2 + 1) / (e.largo * s), 1 + (ancho / 2 + 1) / (e.largo * s)]) { for (const signo of [1, -1]) {
        const ancla = T(...e.punto(e.largo * Math.max(0, Math.min(1, f)))), centro = T(...e.punto(e.largo * f));
        const punto = [centro[0] + e.normal[0] * h * distancia * signo, centro[1] + e.normal[1] * h * distancia * signo];
        const p = { tipo: 'texto', valor, punto, h, giro, ancla: 5 }, b0 = cajasRotulos([p])[0];
        if (ancla[0] >= b0.x0 - .4 && ancla[0] <= b0.x1 + .4 && ancla[1] >= b0.y0 - .4 && ancla[1] <= b0.y1 + .4) continue;
        const enlace = { a: ancla, b: hastaCaja(ancla, b0), capa: 'cotas' }, b = libre(p, c, enlace);
        if (b) { elegida = p; guardar(b); c.enlaceTexto = [M(enlace.a), M(enlace.b)]; cerca.anadir({ ...enlace, tipo: 'raya', deCota: true }); break; }
      } if (elegida) break; } if (elegida) break; }
    }
    if (elegida) break;
    }
    if (!elegida) throw Error(`No hay sitio junto a la línea de cota ${valor} en ${v.nombre}`);
    c.posicionTexto = M(elegida.punto);
  }
  }
  if (!v.corte && !v.cotasFijas) colocarCotas();
  const b = limitesVista(v.entidades), margen = 2 / s;
  v.zona = { x0: b.x0 - margen, x1: b.x1 + margen, y0: b.y0 - margen, y1: b.y1 + margen };
  if (v.banda) { v.zona.y0 = Math.max(v.zona.y0, v.banda.y0); v.zona.y1 = Math.min(v.zona.y1, v.banda.y1); }
}

function escribirVistas(plano, cabecera, paginas) {
  const hojas = paginas.map(pagina => {
    const ventanas = {};
    pagina.vistas.forEach(({ vista: v, area }, i) => {
    const z = v.zona, w = v.giro ? z.y1 - z.y0 : z.x1 - z.x0, h = v.giro ? z.x1 - z.x0 : z.y1 - z.y0;
    const escala = Math.min(v.escala, .96 * Math.min(area.ancho / w, area.alto / h));
    ventanas[2 + i] = { z, giro: v.giro, escala, centro: area.centro, ancho: w * escala, alto: h * escala };
    });
    return { nombre: pagina.nombre, zona: pagina.vistas[0].vista.zona, ventanas,
      textos: [{ valor: pagina.nombre, x: 10, y: 199, h: 2.4, ancho: 276 }] };
  });
  plano.hojas = hojas.map((h, i) => ({ ...h, cajetin: { HOJA: `${i + 1}/${hojas.length}` } }));
  plano.presentacion = { ventanas: {}, textos: [] }; plano.soloVentanasDeclaradas = true;
  return escribirDxfPlano(plano, cabecera).dxf;
}

export { PAPEL, cajaPuntos, limites, ejeCota, segmentos, prepararGrupo, colocar, escribirVistas };
