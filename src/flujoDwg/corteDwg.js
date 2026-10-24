import { createHash } from 'node:crypto';

// Flujo del DWG (plan del 24/10/2026, fases 2 y 3): lo que hay dentro del recuadro CORTE del plano es el corte, aunque
// el autor lo haya tocado en ZWCAD. Se lee el DXF del plano (el DWG pasado por ODA), se busca el recuadro por su
// texto «CORTE» en la capa RECUADROS y se sacan las entidades del modelo que caen dentro, sin cotas ni el recuadro.
// La huella resume ese corte sin depender del orden ni del sentido de las líneas, de que una polilínea se haya partido
// en líneas sueltas ni de dónde esté el corte: cambia si cambia una pieza, una raya o un texto.

/** Capas que corta, marca o taladra la máquina: si alguna entidad suya queda fuera de los recuadros, se avisa. */
export const CAPAS_MAQUINA = ['DISCO1', 'DISCO2', 'CUTTER', 'ROTULADOR', 'taladro'];
const CAPAS_FUERA_DEL_CORTE = new Set(['RECUADROS', 'cotas', 'vent-pre-noimpr']);
const PRECISION = 1e4;   // el modelo va en metros: 0,1 mm
const r = (v) => Math.round(v * PRECISION) / PRECISION || 0;

/** Pares (código, valor) del DXF y sus entidades del modelo (sin las del papel, 67 = 1). */
export function entidadesModelo(dxf) {
  const lineas = String(dxf).replace(/\r\n?/g, '\n').split('\n');
  const pares = [];
  for (let i = 0; i + 1 < lineas.length; i += 2) pares.push([Number(lineas[i].trim()), lineas[i + 1]]);
  const inicio = pares.findIndex(([c, v], i) => c === 2 && v.trim() === 'ENTITIES' && pares[i - 1]?.[1].trim() === 'SECTION');
  if (inicio < 0) return [];
  const salida = [];
  for (const [c, v] of pares.slice(inicio + 1)) {
    if (c === 0) {
      if (v.trim() === 'ENDSEC') break;
      salida.push({ tipo: v.trim(), pares: [] });
    } else salida.at(-1)?.pares.push([c, v]);
  }
  return salida.filter((e) => valor(e, 67)?.trim() !== '1').map(interpretar).filter(Boolean);
}
const valor = (e, codigo) => e.pares.find(([c]) => c === codigo)?.[1];
const numero = (e, codigo, porDefecto = 0) => {
  const v = valor(e, codigo);
  return v === undefined ? porDefecto : Number(v);
};

/** Cada entidad, con su capa, sus piezas geométricas y los puntos que la sitúan. */
function interpretar(e) {
  const capa = valor(e, 8)?.trim() ?? '0';
  const base = { tipo: e.tipo, capa };
  switch (e.tipo) {
    case 'LINE': {
      const p = [numero(e, 10), numero(e, 20)], q = [numero(e, 11), numero(e, 21)];
      return { ...base, segmentos: [[p, q]], puntos: [p, q] };
    }
    case 'LWPOLYLINE': {
      const xs = e.pares.filter(([c]) => c === 10).map(([, v]) => Number(v));
      const ys = e.pares.filter(([c]) => c === 20).map(([, v]) => Number(v));
      // Los abombamientos (42) van detrás de su vértice.
      const bulges = [];
      let vertice = -1;
      for (const [c, v] of e.pares) {
        if (c === 10) vertice += 1;
        if (c === 42 && vertice >= 0) bulges[vertice] = Number(v);
      }
      const puntos = xs.map((x, i) => [x, ys[i]]);
      const cerrada = (numero(e, 70) & 1) === 1;
      const segmentos = [], arcos = [];
      const tramos = cerrada ? puntos.length : puntos.length - 1;
      for (let i = 0; i < tramos; i++) {
        const p = puntos[i], q = puntos[(i + 1) % puntos.length], b = bulges[i] ?? 0;
        if (Math.abs(b) < 1e-9) segmentos.push([p, q]);
        else arcos.push(arcoDesdeBulge(p, q, b));
      }
      return { ...base, segmentos, arcos, puntos };
    }
    case 'ARC': {
      const a = { x: numero(e, 10), y: numero(e, 20), r: numero(e, 40), desde: numero(e, 50), hasta: numero(e, 51) };
      return { ...base, arcos: [a], puntos: puntosArco(a) };
    }
    case 'CIRCLE': {
      const c = { x: numero(e, 10), y: numero(e, 20), r: numero(e, 40) };
      return { ...base, circulos: [c], puntos: [[c.x - c.r, c.y - c.r], [c.x + c.r, c.y + c.r]] };
    }
    case 'MTEXT':
    case 'TEXT': {
      const texto = e.pares.filter(([c]) => c === 3 || c === 1).map(([, v]) => v).join('');
      const p = [numero(e, 10), numero(e, 20)];
      return { ...base, texto: { valor: texto.trim(), x: p[0], y: p[1], h: numero(e, 40) }, puntos: [p] };
    }
    case 'INSERT': {
      const p = [numero(e, 10), numero(e, 20)];
      return { ...base, insercion: { nombre: valor(e, 2)?.trim() ?? '', x: p[0], y: p[1], giro: numero(e, 50), sx: numero(e, 41, 1) }, puntos: [p] };
    }
    case 'DIMENSION':
      return { ...base, cota: true, puntos: [[numero(e, 13), numero(e, 23)], [numero(e, 14), numero(e, 24)]] };
    default: {
      // Lo que no se sabe leer se sitúa por sus puntos 10/20 y entra en la huella por su tipo y su sitio.
      const xs = e.pares.filter(([c]) => c === 10).map(([, v]) => Number(v));
      const ys = e.pares.filter(([c]) => c === 20).map(([, v]) => Number(v));
      const puntos = xs.map((x, i) => [x, ys[i] ?? 0]).filter(([x, y]) => Number.isFinite(x) && Number.isFinite(y));
      return puntos.length ? { ...base, otro: true, puntos } : null;
    }
  }
}

function arcoDesdeBulge([x1, y1], [x2, y2], b) {
  const ang = 4 * Math.atan(b), d = Math.hypot(x2 - x1, y2 - y1), radio = d / (2 * Math.sin(ang / 2));
  const [mx, my] = [(x1 + x2) / 2, (y1 + y2) / 2], h = Math.sqrt(Math.max(0, radio * radio - (d / 2) ** 2));
  const [ux, uy] = [(x2 - x1) / d, (y2 - y1) / d], signo = (b > 0) === (Math.abs(ang) < Math.PI) ? 1 : -1;
  const [cx, cy] = [mx - signo * uy * h, my + signo * ux * h];
  let desde = Math.atan2(y1 - cy, x1 - cx) * 180 / Math.PI, hasta = Math.atan2(y2 - cy, x2 - cx) * 180 / Math.PI;
  if (b < 0) [desde, hasta] = [hasta, desde];
  return { x: cx, y: cy, r: Math.abs(radio), desde, hasta };
}
const puntosArco = (a) => [a.desde, a.hasta].map((g) => [a.x + a.r * Math.cos(g * Math.PI / 180), a.y + a.r * Math.sin(g * Math.PI / 180)]);

/** Los recuadros del plano: el polígono de la capa RECUADROS con su nombre («DIBUJO», «CORTE») encima. */
export function recuadros(entidades) {
  const marcos = entidades.filter((e) => e.capa === 'RECUADROS' && e.tipo === 'LWPOLYLINE').map((e) => caja(e.puntos));
  const nombres = entidades.filter((e) => e.capa === 'RECUADROS' && e.texto);
  const salida = {};
  for (const n of nombres) {
    // El de encima del nombre: su borde de arriba por debajo del texto y su esquina izquierda en la del texto.
    const candidatos = marcos.filter((m) => m.y1 <= n.texto.y + 1e-6);
    const marco = candidatos.sort((a, b) => (Math.abs(a.x0 - n.texto.x) + (n.texto.y - a.y1)) - (Math.abs(b.x0 - n.texto.x) + (n.texto.y - b.y1)))[0];
    if (marco) salida[n.texto.valor.toUpperCase()] = marco;
  }
  return salida;
}
const caja = (puntos) => ({ x0: Math.min(...puntos.map((p) => p[0])), y0: Math.min(...puntos.map((p) => p[1])),
  x1: Math.max(...puntos.map((p) => p[0])), y1: Math.max(...puntos.map((p) => p[1])) });
const dentro = (e, z) => e.puntos.every(([x, y]) => x >= z.x0 - 1e-6 && x <= z.x1 + 1e-6 && y >= z.y0 - 1e-6 && y <= z.y1 + 1e-6);

/**
 * El corte de un plano: lo que hay dentro del recuadro CORTE, sin el recuadro, sus textos ni las cotas. `fuera` son las
 * entidades de las capas de la máquina que no están en ningún recuadro (el autor las ha sacado): no se manda nada así.
 */
export function corteDelPlano(dxf) {
  const entidades = entidadesModelo(dxf);
  const marcos = recuadros(entidades);
  if (!marcos.CORTE) {
    return { error: 'No se encuentra el recuadro CORTE en el plano: no se puede saber qué es el corte.', entidades: [], fuera: [] };
  }
  const corte = entidades.filter((e) => dentro(e, marcos.CORTE) && !e.cota && !CAPAS_FUERA_DEL_CORTE.has(e.capa));
  const fuera = entidades.filter((e) => CAPAS_MAQUINA.includes(e.capa)
    && !Object.values(marcos).some((z) => dentro(e, z)));
  const error = !corte.some((e) => CAPAS_MAQUINA.includes(e.capa))
    ? 'El recuadro CORTE está vacío: no hay nada que cortar.'
    : fuera.length ? `Hay ${fuera.length} ${fuera.length === 1 ? 'línea' : 'líneas'} de corte o rotulador fuera de los recuadros: mételas en el recuadro CORTE o bórralas.` : null;
  return { error, entidades: corte, fuera, recuadro: marcos.CORTE, huella: huellaCorte(corte) };
}

/** La huella del corte: piezas y rayas normalizadas, sin orden, sentido ni posición. */
export function huellaCorte(entidades) {
  const puntos = entidades.flatMap((e) => e.puntos);
  if (!puntos.length) return '';
  const [ox, oy] = [Math.min(...puntos.map((p) => p[0])), Math.min(...puntos.map((p) => p[1]))];
  const lineas = [];
  // Los segmentos rectos de cada capa, unidos por recta: da igual que vengan en una polilínea o partidos.
  const rectas = new Map();
  for (const e of entidades) for (const [[x1, y1], [x2, y2]] of e.segmentos ?? []) {
    const largo = Math.hypot(x2 - x1, y2 - y1);
    if (largo < 1 / PRECISION) continue;
    let [ux, uy] = [(x2 - x1) / largo, (y2 - y1) / largo];
    if (ux < -1e-9 || (Math.abs(ux) <= 1e-9 && uy < 0)) [ux, uy] = [-ux, -uy];
    const [px, py] = [x1 - ox, y1 - oy], c = r(px * -uy + py * ux), t1 = px * ux + py * uy, t2 = (x2 - ox) * ux + (y2 - oy) * uy;
    const clave = `${e.capa}|${r(ux)}|${r(uy)}|${c}`;
    rectas.set(clave, [...rectas.get(clave) ?? [], [Math.min(t1, t2), Math.max(t1, t2)]]);
  }
  for (const [clave, tramos] of rectas) {
    tramos.sort((a, b) => a[0] - b[0]);
    let [a, b] = tramos[0];
    for (const [c, d] of tramos.slice(1)) {
      if (c <= b + 1 / PRECISION) b = Math.max(b, d);
      else { lineas.push(`L|${clave}|${r(a)}|${r(b)}`); [a, b] = [c, d]; }
    }
    lineas.push(`L|${clave}|${r(a)}|${r(b)}`);
  }
  for (const e of entidades) {
    for (const a of e.arcos ?? []) lineas.push(`A|${e.capa}|${r(a.x - ox)}|${r(a.y - oy)}|${r(a.r)}|${r(((a.desde % 360) + 360) % 360)}|${r(((a.hasta % 360) + 360) % 360)}`);
    for (const c of e.circulos ?? []) lineas.push(`C|${e.capa}|${r(c.x - ox)}|${r(c.y - oy)}|${r(c.r)}`);
    if (e.texto) lineas.push(`T|${e.capa}|${e.texto.valor}|${r(e.texto.x - ox)}|${r(e.texto.y - oy)}|${r(e.texto.h)}`);
    if (e.insercion) lineas.push(`I|${e.capa}|${e.insercion.nombre}|${r(e.insercion.x - ox)}|${r(e.insercion.y - oy)}|${r(e.insercion.giro)}|${r(e.insercion.sx)}`);
    if (e.otro) lineas.push(`O|${e.capa}|${e.tipo}|${e.puntos.map(([x, y]) => `${r(x - ox)},${r(y - oy)}`).join(';')}`);
  }
  return createHash('sha256').update(lineas.sort().join('\n')).digest('hex');
}
