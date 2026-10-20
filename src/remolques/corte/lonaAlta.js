// Corte de lona alta: contorno, paño delantero y paño trasero de cada lona, en mm, con las reglas sacadas
// de los cortes a mano de 2026 que tienen los datos de la web (docs/dxf-corte-remolques.md):
// - Las piezas miden lo que da la web (panoContorno, panoDelantero, panoTrasero).
// - Cabezas con la forma del perfil: TIPO 01 recto, TIPO 02 con pico (los hombros bajan `aguas`), TIPO 05
//   con esquinas redondeadas de radio = radio de la web + 1.
// - Trasero que recoge con goma (o cualquier recogida más ancha que «NO»): el perfil del delantero más una
//   oreja a cada lado (recto: hasta 5 cm del borde de arriba; arquillado: hasta donde acaba la curva; con
//   aguas: el hombro − 6).
// - Ollaos a 4,5 cm del borde, la lona hecha centrada en cada paño; en las orejas, dos más (4,5 y 11,5).
// - Marcas de rotulador: centro de cada cabeza; en el contorno, el centro y los hombros en los dos extremos.
// - Ventana: rectángulo de rotulador en el delantero, centrado, con las esquinas de arriba a 4 cm en
//   vertical de lo que tienen encima; y su tapa (ventana + 3 cm), una por ventana, donde mejor quepa.
// - Contorno girado si no cabe a lo ancho del rollo; si no cabe de ninguna forma, con empate (ver abajo).
// - Todas las piezas, colocadas de la forma que menos rollo gaste.
// Fuera de esta versión (se cortan a mano): TIPO 03 y 04, puentes y remolque más ancho detrás.

const ROLLO = 2500, BORDE = 45, R_OLLAO = 2.5;
const r1 = (v) => Math.round(v * 10) / 10;
const completas = (eje, guardadas) => (eje && eje.n > guardadas.length ? Array.from({ length: eje.n }, (_, i) => r1(guardadas[0] + eje.dist * i)) : guardadas);

export function soportada(el) {
  const i = el.input, r = el.result;
  if (!['TIPO 01', 'TIPO 02', 'TIPO 05'].includes(i.tipoPerfil)) return `perfil ${i.tipoPerfil || 'sin elegir'}`;
  if (/PUENTES/.test(`${i.recogeDelante} ${i.recogeAtras}`)) return 'recogida con puentes';
  if (!r.panoContorno) return 'sin contorno calculado';
  if (r.panoContorno.altoAtras) return 'remolque distinto detrás (contorno en trapecio)';
  return null;
}

// Pieza en coordenadas propias (mm): base en y = 0, ancho w, alto h.
function pieza(w, h) { return { w, h, lineas: [], arcos: [], ollaos: [], rot: [], numeros: [] }; }
// Número de unión de un empate (Iván, 20/10/2026): el mismo en las dos piezas que se sueldan, en ROTULADOR,
// de 1 cm, dentro de los 2 cm del empate para que quede tapado al soldar. `giro` 90 si el borde es vertical.
const numero = (p, x, y, n, giro = 0) => p.numeros.push([x, y, String(n), giro]);
// Rótulo de pieza cuando el corte lleva varios remolques (Iván, 20/10/2026): letra del remolque y número de
// pieza (A1, A2…), en ROTULADOR de 1 cm cerca de la esquina de abajo a la izquierda, como a mano (AR2603340).
// Va en la esquina, a 1,5 cm de los dos bordes, y además en grande en el centro de la pieza (como la OF).
const rotular = (p, texto) => { if (texto) { p.numeros.push([15, 15, texto, 0, 'esquina']); p.etiqueta = texto; } return p; };
const seg = (p, x1, y1, x2, y2) => p.lineas.push([x1, y1, x2, y2]);
const marca = (p, x1, y1, x2, y2) => p.rot.push([x1, y1, x2, y2]);

function forma(i) {
  const tipo = i.tipoPerfil;
  const r = tipo === 'TIPO 05' ? ((i.radioEsquina ?? 0) + 1) * 10 : 0;
  const aguas = tipo === 'TIPO 02' ? (i.aguas ?? 0) * 10 : 0;
  return { tipo, r, aguas };
}

// Cabeza: perfil de ancho `w` (sin orejas) y alto `h`, con orejas de `oreja` mm a cada lado.
function cabeza(f, w, h, oreja, ollaos, hecha, ventana) {
  const W = w + 2 * oreja, p = pieza(W, h);
  const hombro = f.tipo === 'TIPO 05' ? h - f.r : h - f.aguas;
  // Alto de la oreja (Iván, 20/10/2026): en el recto, a 5 cm del borde de arriba; con hombro en curva, hasta
  // donde acaba la curva. Con aguas, el hombro − 6 cm, como en los cortes a mano (AR2604843, AR2604959).
  const altoOreja = f.tipo === 'TIPO 05' ? h - f.r : f.tipo === 'TIPO 02' ? hombro - 60 : h - 50;
  const x0 = oreja, x1 = oreja + w;
  seg(p, 0, 0, W, 0);
  // Lados: oreja (si hay) y lado del perfil hasta el hombro.
  for (const [borde, perfil] of [[W, x1], [0, x0]]) {
    if (oreja) { seg(p, borde, 0, borde, altoOreja); seg(p, borde, altoOreja, perfil, altoOreja); seg(p, perfil, altoOreja, perfil, hombro); }
    else seg(p, perfil, 0, perfil, hombro);
  }
  if (f.tipo === 'TIPO 01') seg(p, x0, h, x1, h);
  if (f.tipo === 'TIPO 02') { seg(p, x0, hombro, x0 + w / 2, h); seg(p, x0 + w / 2, h, x1, hombro); }
  if (f.tipo === 'TIPO 05') {
    seg(p, x0 + f.r, h, x1 - f.r, h);
    p.arcos.push({ x: x1 - f.r, y: h - f.r, r: f.r, desde: 0, hasta: 90 }, { x: x0 + f.r, y: h - f.r, r: f.r, desde: 90, hasta: 180 });
  }
  // Ollaos sobre la lona hecha, centrada en el perfil; en las orejas, dos más.
  const off = x0 + (w - hecha * 10) / 2;
  for (const pos of ollaos) p.ollaos.push([off + pos * 10, BORDE]);
  if (oreja) for (const d of [45, 115]) if (d < oreja) p.ollaos.push([d, BORDE], [W - d, BORDE]);
  // Marca del centro arriba.
  marca(p, x0 + w / 2, h - 10, x0 + w / 2, h - 25);
  if (ventana) {
    // Las esquinas de arriba de la ventana, a 4 cm en vertical de lo que tienen encima (Iván, 20/10/2026):
    // el borde de arriba, la pendiente de las aguas o la curva del arquillado.
    const [va, vh] = ventana, xa = x0 + (w - va) / 2;
    const encima = (x) => {
      if (f.tipo === 'TIPO 02') return hombro + (h - hombro) * (1 - Math.abs(x - (x0 + w / 2)) / (w / 2));
      if (f.tipo === 'TIPO 05') {
        const dx = Math.max(x0 + f.r - x, x - (x1 - f.r), 0);
        return dx > 0 ? h - f.r + Math.sqrt(Math.max(f.r * f.r - dx * dx, 0)) : h;
      }
      return h;
    };
    const arriba = Math.min(encima(xa), encima(xa + va)) - 40;
    for (const [a, b, c, d] of [[xa, arriba - vh, xa + va, arriba - vh], [xa + va, arriba - vh, xa + va, arriba], [xa + va, arriba, xa, arriba], [xa, arriba, xa, arriba - vh]]) marca(p, a, b, c, d);
  }
  return { p, altoOreja, hombro };
}

// Contorno: u a lo largo de la lona (de delante a detrás), v a lo largo del contorno.
function contorno(el, marcasHombro) {
  const r = el.result, i = el.input;
  const A = r.panoContorno.ancho * 10, B = r.panoContorno.alto * 10, p = pieza(A, B);
  seg(p, 0, 0, A, 0); seg(p, A, 0, A, B); seg(p, A, B, 0, B); seg(p, 0, B, 0, 0);
  const lat = i.modoOllaos === 'REPARTIDOS' ? completas(r.ollaos.largo, r.reparto.laterales) : r.reparto.laterales;
  // Laterales de atrás a delante; atrás en u = A (junto a las cabezas en el corte).
  const off = (A - r.lonaHecha.largo * 10) / 2;
  for (const pos of lat) p.ollaos.push([A - off - pos * 10, BORDE], [A - off - pos * 10, B - BORDE]);
  for (const v of [B / 2, marcasHombro, B - marcasHombro]) { marca(p, 10, v, 25, v); marca(p, A - 10, v, A - 25, v); }
  return p;
}

// Contorno que no cabe en el rollo por ningún lado (AR2605079): la pieza grande lleva el rollo entero a lo
// ancho (2500 del largo, desde delante) y el resto del largo sale en una tira con 2 cm de empate, siempre
// arriba, en la parte de atrás del remolque (Iván, 20/10/2026). Como la tira es tan larga como el contorno,
// se empata también en el otro sentido: dos tiras de (contorno + 2 cm) / 2 («esa tira hacerla empatada en
// el otro sentido y meterlo ya en el corte»).
const EMPATE = 20;
// Uniones numeradas desde `n`: n, la pieza grande con la primera media tira; n + 1, con la segunda; n + 2, las
// dos medias tiras entre sí.
function contornoConEmpate(c, n = 1, pre = '') {
  const A = c.w, B = c.h; // u: a lo largo de la lona, delante en 0 y atrás en A
  const s = A - ROLLO + EMPATE, mitad = (B + EMPATE) / 2, desde = A - s; // la tira va de u = desde a u = A
  const grande = pieza(B, ROLLO); // x = v (contorno), y = u (de 0 a 2500, desde delante)
  seg(grande, 0, 0, B, 0); seg(grande, B, 0, B, ROLLO); seg(grande, B, ROLLO, 0, ROLLO); seg(grande, 0, ROLLO, 0, 0);
  const tiras = [pieza(s, mitad), pieza(s, mitad)]; // x = u - desde, y = v (cada una media tira)
  for (const t of tiras) { seg(t, 0, 0, s, 0); seg(t, s, 0, s, mitad); seg(t, s, mitad, 0, mitad); seg(t, 0, mitad, 0, 0); }
  for (const [u, v] of c.ollaos) {
    if (u <= ROLLO - 10) grande.ollaos.push([v, u]);
    else if (v < B / 2) tiras[0].ollaos.push([u - desde, v]);
    else tiras[1].ollaos.push([u - desde, v - (B - EMPATE) / 2]);
  }
  // Las marcas de atrás caen en las tiras; la del centro coincide con su unión y no hace falta.
  for (const [u1, v1, u2, v2] of c.rot) {
    if (u1 <= ROLLO) marca(grande, v1, u1, v2, u2);
    else if (v1 < B / 2) marca(tiras[0], u1 - desde, v1, u2 - desde, v2);
    else if (v1 > B / 2) marca(tiras[1], u1 - desde, v1 - (B - EMPATE) / 2, u2 - desde, v2 - (B - EMPATE) / 2);
  }
  // La grande se une a las tiras por arriba (y = 2500); las tiras, a la grande por x = 0, y entre sí por su
  // lado corto. Cada número, a 1 cm del borde (en medio de los 2 cm de empate) y a 4 cm de la punta.
  const m = EMPATE / 2;
  const u = (k) => `${pre}${n + k}`;
  numero(grande, 40, ROLLO - m, u(0)); numero(grande, B - 40, ROLLO - m, u(1));
  numero(tiras[0], m, 40, u(0), 90); numero(tiras[0], s / 2, mitad - m, u(2));
  numero(tiras[1], m, mitad - 40, u(1), 90); numero(tiras[1], s / 2, m, u(2));
  return { grande, tiras };
}

// Coloca una pieza: `giro` 0 (tal cual) o -90 (la base pasa a la izquierda, como en AR2605120).
function colocar(p, x, y, giro) {
  const t = giro ? (u, v) => [x + v, y + p.w - u] : (u, v) => [x + u, y + v];
  const lineas = p.lineas.map(([a, b, c, d]) => [...t(a, b), ...t(c, d)]);
  const rot = p.rot.map(([a, b, c, d]) => [...t(a, b), ...t(c, d)]);
  const ollaos = p.ollaos.map(([a, b]) => t(a, b));
  const arcos = p.arcos.map((a) => { const [cx, cy] = t(a.x, a.y); return { x: cx, y: cy, r: a.r, desde: (a.desde - (giro ? 90 : 0) + 360) % 360, hasta: (a.hasta - (giro ? 90 : 0) + 360) % 360 || 360 }; });
  const numeros = (p.numeros ?? []).map(([a, b, n, g, tipo]) => {
    // El rótulo de esquina se ancla por su esquina de abajo a la izquierda; girada la pieza, esa esquina es otra.
    const [nx, ny] = tipo === 'esquina' && giro ? t(a + 10, b) : t(a, b);
    return { capa: 'ROTULADOR', x: nx, y: ny, h: 10, valor: n, giro: (g + (giro ? 270 : 0)) % 360, centrado: tipo !== 'esquina', literal: tipo !== 'esquina' };
  });
  return { lineas, rot, ollaos, arcos, numeros, ancho: giro ? p.h : p.w, alto: giro ? p.w : p.h };
}

// Colocación (Iván, 20/10/2026: «se debe aprovechar el paño lo máximo posible»): todas las piezas de la lona
// (contornos, cabezas, tiras) por huecos libres (MaxRects) a lo largo del rollo, girándolas si caben, y se
// prueban muchas ordenaciones; gana la que gasta menos rollo. Cada pieza ocupa su rectángulo; las que se tocan
// comparten el corte. Las tapas de ventana entran después solo en huecos que no alarguen el corte.
function rng(semilla) {
  let a = semilla >>> 0;
  return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

function partir(libres, r) {
  const out = [];
  for (const l of libres) {
    if (r.x >= l.x + l.w - 0.01 || r.x + r.w <= l.x + 0.01 || r.y >= l.y + l.h - 0.01 || r.y + r.h <= l.y + 0.01) { out.push(l); continue; }
    if (r.x > l.x) out.push({ x: l.x, y: l.y, w: r.x - l.x, h: l.h });
    if (r.x + r.w < l.x + l.w) out.push({ x: r.x + r.w, y: l.y, w: l.x + l.w - r.x - r.w, h: l.h });
    if (r.y > l.y) out.push({ x: l.x, y: l.y, w: l.w, h: r.y - l.y });
    if (r.y + r.h < l.y + l.h) out.push({ x: l.x, y: r.y + r.h, w: l.w, h: l.y + l.h - r.y - r.h });
  }
  const dentro = (a, b) => b.x <= a.x && b.y <= a.y && b.x + b.w >= a.x + a.w && b.y + b.h >= a.y + a.h;
  return out.filter((a, i) => a.w > 1 && a.h > 1 && !out.some((b, j) => j !== i && dentro(a, b) && (!dentro(b, a) || j < i)));
}

// `giros[k]`: 0 o -90 para obligar esa orientación a la pieza k (si cabe), o null para elegir la mejor.
function maxrects(piezas, orden, giros = []) {
  let libres = [{ x: 0, y: 0, w: 1e9, h: ROLLO }];
  const sitios = new Array(piezas.length);
  for (const k of orden) {
    const p = piezas[k];
    let mejor = null;
    const cabe = (g) => (g ? p.w : p.h) <= ROLLO + 0.01;
    const opciones = giros[k] != null && cabe(giros[k]) ? [giros[k]] : [0, -90];
    for (const giro of opciones) {
      const w = giro ? p.h : p.w, h = giro ? p.w : p.h;
      if (h > ROLLO + 0.01) continue;
      for (const l of libres) {
        if (w > l.w + 0.01 || h > l.h + 0.01) continue;
        const derecha = l.x + w;
        if (!mejor || derecha < mejor.derecha - 0.01 || (Math.abs(derecha - mejor.derecha) <= 0.01 && l.y < mejor.y)) mejor = { x: l.x, y: l.y, w, h, giro, derecha };
      }
    }
    if (!mejor) return null;
    sitios[k] = mejor;
    libres = partir(libres, mejor);
  }
  return { sitios, largo: Math.max(...sitios.map((s) => s.x + s.w)), libres };
}

function colocarTodo(piezas, intentos = 400) {
  const idx = piezas.map((_, k) => k);
  const area = (k) => piezas[k].w * piezas[k].h;
  const mayor = (k) => Math.max(piezas[k].w, piezas[k].h), menor = (k) => Math.min(piezas[k].w, piezas[k].h);
  const base = [[...idx].sort((a, b) => area(b) - area(a)), [...idx].sort((a, b) => mayor(b) - mayor(a)), [...idx].sort((a, b) => menor(b) - menor(a))];
  // Cada intento: una ordenación y unas orientaciones (todas libres, todas de pie, todas tumbadas o al azar).
  const intentosAProbar = [];
  for (const o of base) for (const g of [null, 0, -90]) intentosAProbar.push([o, piezas.map(() => g)]);
  const azar = rng(20261020);
  for (let i = 0; i < intentos; i++) {
    const o = [...base[i % base.length]];
    for (let j = o.length - 1; j > 0; j--) if (azar() < 0.35) { const k = Math.floor(azar() * (j + 1)); [o[j], o[k]] = [o[k], o[j]]; }
    const giros = piezas.map(() => { const a = azar(); return a < 0.4 ? null : a < 0.7 ? 0 : -90; });
    intentosAProbar.push([o, giros]);
  }
  let mejor = null;
  for (const [o, giros] of intentosAProbar) {
    const r = maxrects(piezas, o, giros);
    if (r && (!mejor || r.largo < mejor.largo - 0.01)) mejor = r;
  }
  return mejor;
}

// `letras`: Map elemento → letra de cada unidad (solo si el corte lleva más de un remolque).
export function cortarLonasAltas(elementos, x0 = 0, letras = null) {
  const out = { lineas: [], rot: [], ollaos: [], arcos: [], textos: [], avisos: [] };
  const piezas = [], tapas = [];
  let union = 1; // número de la siguiente unión de empate (sin letras)
  for (const el of elementos) {
    const i = el.input, r = el.result, f = forma(i);
    const hecha = r.lonaHecha;
    const del = r.panoDelantero, tra = r.panoTrasero;
    const anchoPerfil = del.ancho * 10; // el trasero lleva el mismo perfil que el delantero; lo que sobra son orejas
    const oreja = Math.max((tra.ancho * 10 - anchoPerfil) / 2, 0);
    const ollaosDel = i.modoOllaos === 'REPARTIDOS' ? completas(r.ollaos.ancho, r.reparto.delante) : r.reparto.delante;
    const ollaosAtr = i.modoOllaos === 'REPARTIDOS' ? completas(r.ollaos.anchoAtras ?? r.ollaos.ancho, r.reparto.atras) : r.reparto.atras;
    const ventana = i.ventana && i.ventanaAncho > 0 && i.ventanaAlto > 0 ? [i.ventanaAncho * 10, i.ventanaAlto * 10] : null;
    const d = cabeza(f, anchoPerfil, del.alto * 10, 0, ollaosDel, hecha.ancho, ventana);
    const t = cabeza(f, anchoPerfil, tra.alto * 10, oreja, ollaosAtr, hecha.anchoAtras ?? hecha.ancho, null);
    const marcasHombro = f.tipo === 'TIPO 01' ? null : d.altoOreja;
    if (ventana) out.avisos.push(`${el.of}: ventana marcada con rotulador y su tapa de ${ventana[0] / 10 + 3} × ${ventana[1] / 10 + 3}; revisar la altura de la ventana.`);
    for (let u = 0; u < (i.cantidad || 1); u++) {
      const L = letras?.get(el)?.[u] ?? '';
      const c = contorno(el, marcasHombro ?? (r.panoContorno.alto * 10) / 2);
      const conEmpate = c.h > ROLLO && c.w > ROLLO;
      const emp = conEmpate ? contornoConEmpate(c, L ? 1 : union, L.toLowerCase()) : null;
      if (emp && !L) union += 3;
      const grande = rotular(emp ? emp.grande : c, L && `${L}1`);
      grande.contornoDe = el.of;
      piezas.push(grande, rotular(structuredClone(d.p), L && `${L}2`), rotular(structuredClone(t.p), L && `${L}3`));
      if (emp) {
        piezas.push(rotular(emp.tiras[0], L && `${L}4`), rotular(emp.tiras[1], L && `${L}5`));
        out.avisos.push(`${el.of}: el contorno no cabe en el rollo: empate de 2 cm a lo largo y tira de ${(c.w - ROLLO + EMPATE) / 10} cm empatada en dos.`);
      }
      // Tapa de la ventana: la ventana + 3 cm, una por ventana (Iván, 20/10/2026).
      if (ventana) { const tapa = pieza(ventana[0] + 30, ventana[1] + 30); seg(tapa, 0, 0, tapa.w, 0); seg(tapa, tapa.w, 0, tapa.w, tapa.h); seg(tapa, tapa.w, tapa.h, 0, tapa.h); seg(tapa, 0, tapa.h, 0, 0); tapa.deRestos = `TAPA DE VENTANA ${ventana[0] / 10 + 3} × ${ventana[1] / 10 + 3}${L ? ` (${L}6)` : ''}`; tapas.push(rotular(tapa, L && `${L}6`)); }
    }
  }
  const pack = colocarTodo(piezas);
  if (!pack) { out.avisos.push('Alguna pieza no cabe en el rollo: hacer esta lona a mano.'); return { ...out, largo: x0 }; }
  // Tapas: solo en huecos que no alarguen el corte; si no, se cortan de restos (AR2605023).
  let libres = pack.libres;
  const puestas = [];
  tapas.forEach((tapa, n) => {
    let sitio = null;
    for (const giro of [0, -90]) {
      const w = giro ? tapa.h : tapa.w, h = giro ? tapa.w : tapa.h;
      const l = libres.find((q) => w <= q.w + 0.01 && h <= q.h + 0.01 && q.x + w <= pack.largo + 0.01);
      if (l && !sitio) sitio = { x: l.x, y: l.y, w, h, giro };
    }
    if (sitio) { libres = partir(libres, sitio); puestas.push([tapa, sitio]); return; }
    out.textos.push({ capa: 'texto', x: x0 + 100, y: -200 - 150 * n, h: 100, valor: `${tapa.deRestos}: CORTAR DE RESTOS` });
    out.avisos.push(`${tapa.deRestos}: no cabe sin alargar el corte; se deja para cortar de restos.`);
  });
  for (const [p, sitio] of [...piezas.map((p, k) => [p, pack.sitios[k]]), ...puestas]) {
    const pc = colocar(p, x0 + sitio.x, sitio.y, sitio.giro);
    for (const k of ['lineas', 'rot', 'ollaos', 'arcos']) out[k].push(...pc[k]);
    out.textos.push(...pc.numeros);
    // En grande en el centro: el rótulo de la pieza (si hay varios remolques) y, en el contorno, la OF.
    const grandes = [p.etiqueta, p.contornoDe].filter(Boolean);
    grandes.forEach((v, n) => out.textos.push({ capa: 'texto', x: x0 + sitio.x + pc.ancho / 2, y: sitio.y + pc.alto / 2 + 90 * (grandes.length - 1) - 180 * n, h: 100, valor: v, centrado: true }));
  }
  return { ...out, largo: x0 + pack.largo };
}

// Las tres piezas de una lona alta (en mm, sin colocar) y sus datos, para el dibujo de confección del plano.
export function piezasLona(el) {
  const i = el.input, r = el.result, f = forma(i);
  const hecha = r.lonaHecha, del = r.panoDelantero, tra = r.panoTrasero;
  const anchoPerfil = del.ancho * 10;
  const oreja = Math.max((tra.ancho * 10 - anchoPerfil) / 2, 0);
  const ollaosDel = i.modoOllaos === 'REPARTIDOS' ? completas(r.ollaos.ancho, r.reparto.delante) : r.reparto.delante;
  const ollaosAtr = i.modoOllaos === 'REPARTIDOS' ? completas(r.ollaos.anchoAtras ?? r.ollaos.ancho, r.reparto.atras) : r.reparto.atras;
  const lat = i.modoOllaos === 'REPARTIDOS' ? completas(r.ollaos.largo, r.reparto.laterales) : r.reparto.laterales;
  const ventana = i.ventana && i.ventanaAncho > 0 && i.ventanaAlto > 0 ? [i.ventanaAncho * 10, i.ventanaAlto * 10] : null;
  const d = cabeza(f, anchoPerfil, del.alto * 10, 0, ollaosDel, hecha.ancho, ventana);
  const t = cabeza(f, anchoPerfil, tra.alto * 10, oreja, ollaosAtr, hecha.anchoAtras ?? hecha.ancho, null);
  const marcasHombro = f.tipo === 'TIPO 01' ? (r.panoContorno.alto * 10) / 2 : d.altoOreja;
  const c = contorno(el, marcasHombro);
  return { f, d, t, c, oreja, ventana, ollaos: { delante: ollaosDel, atras: ollaosAtr, laterales: lat }, marcasHombro };
}

export { ROLLO, R_OLLAO };
