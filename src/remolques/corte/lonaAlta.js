// Corte de lona alta: contorno, paño delantero y paño trasero de cada lona, en mm, con las reglas sacadas
// de los cortes a mano de 2026 que tienen los datos de la web (docs/dxf-corte-remolques.md):
// - Las piezas miden lo que da la web (panoContorno, panoDelantero, panoTrasero).
// - Cabezas con la forma del perfil: TIPO 01 recto, TIPO 02 con pico (los hombros bajan `aguas`), TIPO 03
//   con aguas y arcos en hombros y cumbrera (aguasArquilladas), TIPO 05 con esquinas redondeadas de radio =
//   radio de la web + 1.
// - Trasero que recoge con goma (o cualquier recogida más ancha que «NO»): el perfil del delantero más una
//   oreja a cada lado (recto: hasta 5 cm del borde de arriba; arquillado: hasta donde acaba la curva; con
//   aguas: el hombro − 6).
// - Ollaos a 4,5 cm del borde, la lona hecha centrada en cada paño; en las orejas, dos más (4,5 y 11,5).
// - Marcas de rotulador: centro de cada cabeza; en el contorno, el centro y los hombros en los dos extremos.
// - Ventana: rectángulo de rotulador en el delantero, centrado, con las esquinas de arriba a 4 cm en
//   vertical de lo que tienen encima; y su tapa (ventana + 3 cm), una por ventana, donde mejor quepa.
// - Contorno girado si no cabe a lo ancho del rollo; si no cabe de ninguna forma, con empate (ver abajo).
// - Todas las piezas, colocadas de la forma que menos rollo gaste.
// - Remolque distinto detrás: contorno en trapecio (lo que da la web delante y detrás) y trasero con el
//   perfil del ancho de detrás.
// - Puentes de Hijos de Pedro López detrás (cortes a mano AR2604800, AR2605078): rebaje de 9 cm en el techo
//   del contorno, detrás, y orejas sin ollaos en el trasero (ver `contorno` y `cabeza`).
// Fuera de esta versión (se cortan a mano): TIPO 04 y los demás puentes.

import { esquinaChaflan } from '../geometry/chaflan.ts';

const ROLLO = 2500, BORDE = 45, R_OLLAO = 2.5;
const r1 = (v) => Math.round(v * 10) / 10;
const completas = (eje, guardadas) => (eje && eje.n > guardadas.length ? Array.from({ length: eje.n }, (_, i) => r1(guardadas[0] + eje.dist * i)) : guardadas);
const PUENTES_HPL = /PUENTES HIJOS DE PEDRO LOPEZ/;
// Lo que el techo del contorno queda más corto que los lados, detrás, con los puentes de HPL (a mano, 90 en los tres).
export const REBAJE_PUENTES = 90;
// Holgura a cada lado del contorno en trapecio: las piezas de al lado no se pegan del todo, para que la máquina
// no corte a menos de 1 cm de una raya ya cortada (Iván, 20/10/2026; a mano, de 8 a 12 mm).
const HOLGURA_TRAPECIO = 10;

export function soportada(el) {
  const i = el.input, r = el.result;
  if (!['TIPO 01', 'TIPO 02', 'TIPO 03', 'TIPO 04', 'TIPO 05'].includes(i.tipoPerfil)) return `perfil ${i.tipoPerfil || 'sin elegir'}`;
  if (i.tipoPerfil === 'TIPO 04' && !((i.chaflan ?? 0) > 0)) return 'chaflán sin medida';
  if (/PUENTES/.test(i.recogeDelante ?? '') || (/PUENTES/.test(i.recogeAtras ?? '') && !PUENTES_HPL.test(i.recogeAtras))) return 'recogida con puentes';
  if (!r.panoContorno) return 'sin contorno calculado';
  const c = r.panoContorno;
  if (c.altoAtras && Math.max(c.alto, c.altoAtras) * 10 > ROLLO && c.ancho * 10 > ROLLO) return 'contorno en trapecio que no cabe en el rollo';
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
// En rotulador solo cuando el corte lleva más de un remolque (sin letras no hay rótulo), para que en el taller no
// se confundan los paños (Iván, 22/10/2026), y siempre donde quede tapado: la esquina cae en el dobladillo de la base.
// `sitio`: otro punto (x, y) de la esquina de abajo del texto, para piezas sin ese dobladillo.
const rotular = (p, texto, sitio = [15, 15]) => { if (texto) { p.numeros.push([...sitio, texto, 0, 'esquina']); p.etiqueta = texto; } return p; };
const seg = (p, x1, y1, x2, y2) => p.lineas.push([x1, y1, x2, y2]);
const marca = (p, x1, y1, x2, y2) => p.rot.push([x1, y1, x2, y2]);

function forma(i) {
  const tipo = i.tipoPerfil;
  const r = tipo === 'TIPO 05' ? ((i.radioEsquina ?? 0) + 1) * 10 : 0;
  const aguas = ['TIPO 02', 'TIPO 03'].includes(tipo) ? (i.aguas ?? 0) * 10 : 0;
  // Arquillado con aguas (TIPO 03): hombros de radio el de la web + 1 cm, como el arquillado (85 con 7,5, 92 con
  // 8,2, 111 con 10,1 en los cortes a mano); la cumbrera, con el radio de la web tal cual (75 con 7,5, AR2604390).
  const rHombro = tipo === 'TIPO 03' && (i.radioHombro ?? 0) > 0 ? (i.radioHombro + 1) * 10 : 0;
  const rCumbrera = tipo === 'TIPO 03' ? Math.max(i.radioCumbrera ?? 0, 0) * 10 : 0;
  // Con chaflán (TIPO 04; Iván, 21/10/2026: «el chaflán es en el hombro», como el resto): la cara entre
  // vértices virtuales de la web y, si una arista lleva radio, ese radio + 1 cm, como el arquillado. Contrastado
  // con los cortes a mano de Euro Remolque (AR2604263 y otros 9: chaflán 14, radios 7 y 7,5 → arcos de 80 y 85).
  const masUno = (v) => ((v ?? 0) > 0 ? (v + 1) * 10 : 0);
  const chaflan = tipo === 'TIPO 04' ? { cara: (i.chaflan ?? 0) * 10, rAbajo: masUno(i.radioChaflanAbajo), rArriba: masUno(i.radioChaflanArriba) } : null;
  return { tipo, r, aguas, rHombro, rCumbrera, chaflan };
}

/**
 * Esquinas del chaflán en una cabeza de ancho `w` y alto `h` (mm), con la cuenta de la web (geometry/chaflan.ts):
 * `pata` lo que baja por el lado y entra por arriba; los arcos, tangentes al lado, al chaflán y al techo.
 */
export function esquinasChaflan(f, w, h) {
  const e = esquinaChaflan({ ancho: w, alto: h, chaflan: f.chaflan.cara, radioAbajo: f.chaflan.rAbajo, radioArriba: f.chaflan.rArriba });
  const s = Math.SQRT1_2;
  // Lado izquierdo (x desde el lado); el derecho es su reflejo.
  return {
    ...e,
    hombro: h - e.pata - e.tangenteAbajo,                                   // donde acaba el lado recto
    abajo: { cx: e.radioAbajo, cy: h - e.pata - e.tangenteAbajo },          // centro del arco contra el lado
    arriba: { cx: e.pata + e.tangenteArriba, cy: h - e.radioArriba },       // centro del arco contra el techo
    desde: [e.tangenteAbajo * s, h - e.pata + e.tangenteAbajo * s],         // el chaflán recto, de abajo…
    hasta: [e.pata - e.tangenteArriba * s, h - e.tangenteArriba * s],       // …a arriba
  };
}

/**
 * Arquillado con aguas (TIPO 03), como lo dibuja la web (geometry/perfil.ts) y como sale en los cortes a mano
 * (AR2604412, AR2604501, AR2604602, AR2604390): la pendiente va del hombro virtual (el lado a h − aguas) al pico
 * del centro, con un arco tangente en cada hombro y, si hay radio, otro en la cumbrera. `dx` es la distancia
 * al lado más cercano; todo en mm sobre la base de la cabeza.
 */
export function aguasArquilladas(f, w, h) {
  const a = w / 2, theta = Math.atan2(f.aguas, a), lateral = h - f.aguas, tan = Math.tan(theta);
  const tanHombro = Math.tan((Math.PI / 2 - theta) / 2);
  const rh = Math.min(f.rHombro, lateral / tanHombro);
  const t = rh * tanHombro;                                   // del hombro virtual a cada tangencia
  const cyH = lateral - t;                                    // fin del lado recto y centro del arco del hombro
  const txH = t * Math.cos(theta), tyH = lateral + t * Math.sin(theta); // tangencia con la pendiente
  const rc = Math.min(f.rCumbrera, (a - txH) / Math.sin(theta || 1e-9));
  const cyC = h - rc / Math.cos(theta), txC = a - rc * Math.sin(theta); // centro y tangencia de la cumbrera
  const alto = (dx) => {
    if (rh > 0 && dx < txH) return cyH + Math.sqrt(Math.max(rh * rh - (rh - dx) ** 2, 0));
    if (rc > 0 && dx > txC) return cyC + Math.sqrt(Math.max(rc * rc - (a - dx) ** 2, 0));
    return lateral + dx * tan;
  };
  return { a, theta, lateral, rh, cyH, txH, tyH, rc, cyC, txC, alto };
}

// Cabeza: perfil de ancho `w` (sin orejas) y alto `h`, con orejas de `oreja` mm a cada lado. `puentes`: las
// orejas son de los puentes de Hijos de Pedro López (sin ollaos, con sus marcas).
function cabeza(f, w, h, oreja, ollaos, hecha, ventana, cremallera = false, puentes = false) {
  const W = w + 2 * oreja, p = pieza(W, h);
  const ag = f.tipo === 'TIPO 03' ? aguasArquilladas(f, w, h) : null;
  const ch = f.tipo === 'TIPO 04' ? esquinasChaflan(f, w, h) : null;
  // Hasta dónde llega el lado recto: el arquillado y el arquillado con aguas, hasta donde empieza la curva; el
  // chaflán, hasta donde empieza (o su arco).
  const hombro = f.tipo === 'TIPO 05' ? h - f.r : ag ? ag.cyH : ch ? ch.hombro : h - f.aguas;
  // Alto de la oreja (Iván, 20/10/2026): en el recto, a 5 cm del borde de arriba; con hombro en curva, hasta
  // donde acaba la curva. Con aguas (sin curva), el hombro − 6 cm, como en los cortes a mano (AR2604843, AR2604959).
  // Con los puentes de HPL, en el recto, a 6 cm (AR2605103: 535 con un paño de 595).
  // El chaflán, como las aguas: con arco, hasta el arco; con la arista viva, el hombro − 6 cm.
  const curva = f.tipo === 'TIPO 05' || (ag && ag.rh > 0) || (ch && ch.radioAbajo > 0);
  const altoOreja = curva ? hombro : f.tipo === 'TIPO 02' || ag || ch ? hombro - 60 : h - (puentes ? 60 : 50);
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
  if (ch) {
    // Chaflán recto en cada hombro, con su arco contra el lado y contra el techo si lleva radio; el derecho, reflejado.
    for (const [lado, m, abajo, arriba] of [[x0, 1, [135, 180], [90, 135]], [x1, -1, [0, 45], [45, 90]]]) {
      seg(p, lado + m * ch.desde[0], ch.desde[1], lado + m * ch.hasta[0], ch.hasta[1]);
      if (ch.radioAbajo > 0) p.arcos.push({ x: lado + m * ch.abajo.cx, y: ch.abajo.cy, r: ch.radioAbajo, desde: abajo[0], hasta: abajo[1] });
      if (ch.radioArriba > 0) p.arcos.push({ x: lado + m * ch.arriba.cx, y: ch.arriba.cy, r: ch.radioArriba, desde: arriba[0], hasta: arriba[1] });
    }
    seg(p, x0 + ch.arriba.cx, h, x1 - ch.arriba.cx, h);
  }
  if (ag) {
    // Pendientes de la tangencia del hombro a la de la cumbrera (o al pico); arcos en hombros y cumbrera.
    const grados = (ag.theta * 180) / Math.PI;
    const [cx, cy] = ag.rc > 0 ? [ag.txC, ag.alto(ag.txC)] : [ag.a, h];
    seg(p, x0 + ag.txH, ag.tyH, x0 + cx, cy);
    seg(p, x1 - cx, cy, x1 - ag.txH, ag.tyH);
    if (ag.rh > 0) p.arcos.push({ x: x0 + ag.rh, y: ag.cyH, r: ag.rh, desde: 90 + grados, hasta: 180 }, { x: x1 - ag.rh, y: ag.cyH, r: ag.rh, desde: 0, hasta: 90 - grados });
    if (ag.rc > 0) p.arcos.push({ x: x0 + ag.a, y: ag.cyC, r: ag.rc, desde: 90 - grados, hasta: 90 + grados });
  }
  // Ollaos sobre la lona hecha, centrada en el perfil; en las orejas, dos más.
  const off = x0 + (w - hecha * 10) / 2;
  for (const pos of ollaos) p.ollaos.push([off + pos * 10, BORDE]);
  if (oreja && !puentes) for (const d of [45, 115]) if (d < oreja) p.ollaos.push([d, BORDE], [W - d, BORDE]);
  // Puentes de HPL: las orejas sin ollaos y, a 1 cm por dentro de cada lado del perfil, una marca abajo (de 3,5
  // a 5,5 cm) y otra bajo el alto de la oreja (AR2605078).
  if (oreja && puentes) for (const x of [x0 + 10, x1 - 10]) { marca(p, x, 35, x, 55); marca(p, x, altoOreja - 20, x, altoOreja); }
  // Marca del centro arriba.
  marca(p, x0 + w / 2, h - 10, x0 + w / 2, h - 25);
  // Lo que tiene encima cada punto del perfil: el borde de arriba, la pendiente de las aguas o la curva del arquillado.
  const encima = (x) => {
    if (ag) return ag.alto(Math.max(Math.min(x - x0, x1 - x), 0));
    if (ch) { const dx = Math.max(Math.min(x - x0, x1 - x), 0); return dx < ch.pata ? h - ch.pata + dx : h; }
    if (f.tipo === 'TIPO 02') return hombro + (h - hombro) * (1 - Math.abs(x - (x0 + w / 2)) / (w / 2));
    if (f.tipo === 'TIPO 05') {
      const dx = Math.max(x0 + f.r - x, x - (x1 - f.r), 0);
      return dx > 0 ? h - f.r + Math.sqrt(Math.max(f.r * f.r - dx * dx, 0)) : h;
    }
    return h;
  };
  // Cabeza que recoge con cremallera (Iván, 20/10/2026; AR2604990, AR2603438): una raya a 5 cm de cada lado
  // del perfil, desde 3,5 cm sobre la base hasta 4,5 cm por debajo de lo que tiene encima. En el plano va
  // entera (`p.cremallera`); en el corte se recorta: el arranque de abajo y una T arriba.
  if (cremallera) {
    p.cremallera = [];
    for (const x of [x0 + 50, x1 - 50]) {
      const arriba = encima(x) - 45;
      p.cremallera.push([x, 35, x, arriba]);
      marca(p, x, 35, x, 60);
      marca(p, x, arriba - 25, x, arriba);
      marca(p, x - 10, arriba, x + 10, arriba);
    }
  }
  if (ventana) {
    // Las esquinas de arriba de la ventana, a 4 cm en vertical de lo que tienen encima (Iván, 20/10/2026).
    const [va, vh] = ventana, xa = x0 + (w - va) / 2;
    const arriba = Math.min(encima(xa), encima(xa + va)) - 40;
    for (const [a, b, c, d] of [[xa, arriba - vh, xa + va, arriba - vh], [xa + va, arriba - vh, xa + va, arriba], [xa + va, arriba, xa, arriba], [xa, arriba, xa, arriba - vh]]) marca(p, a, b, c, d);
  }
  return { p, altoOreja, hombro };
}

// Contorno: u a lo largo de la lona (de delante a detrás), v a lo largo del contorno. Con el remolque distinto
// detrás va en trapecio: delante mide `alto` y detrás `altoAtras`, con los lados inclinados por igual y una
// holgura a cada lado. `rebajeLado` (puentes de HPL): detrás, el techo queda REBAJE_PUENTES más corto que los
// lados, que miden `rebajeLado` desde cada borde. `p.geo` guarda la forma para el plano.
// `marcasHombro` y `marcasAtras`: la altura de las marcas del hombro de la punta de delante y de la de detrás (la
// oreja de cada cabeza), o `null` si esa cabeza no cierra con orejas (solo la marca del centro).
function contorno(el, marcasHombro, rebajeLado = 0, marcasAtras = marcasHombro) {
  const r = el.result, i = el.input;
  const A = r.panoContorno.ancho * 10, B = r.panoContorno.alto * 10, Bt = (r.panoContorno.altoAtras ?? r.panoContorno.alto) * 10;
  const m = Bt !== B ? HOLGURA_TRAPECIO : 0, H = Math.max(B, Bt) + 2 * m, p = pieza(A, H);
  // Bordes de abajo y de arriba a lo largo de la lona.
  const yb = (u) => (H - B - ((Bt - B) * u) / A) / 2, yt = (u) => H - yb(u);
  const reb = rebajeLado ? REBAJE_PUENTES : 0;
  seg(p, 0, yb(0), A, yb(A)); seg(p, A, yt(A), 0, yt(0)); seg(p, 0, yt(0), 0, yb(0));
  if (reb) {
    const y1 = yb(A) + rebajeLado, y2 = yt(A) - rebajeLado;
    seg(p, A, yb(A), A, y1); seg(p, A, y1, A - reb, y1); seg(p, A - reb, y1, A - reb, y2); seg(p, A - reb, y2, A, y2); seg(p, A, y2, A, yt(A));
  } else seg(p, A, yb(A), A, yt(A));
  const lat = i.modoOllaos === 'REPARTIDOS' ? completas(r.ollaos.largo, r.reparto.laterales) : r.reparto.laterales;
  // Laterales de atrás a delante; atrás en u = A (junto a las cabezas en el corte). La lona hecha, centrada; con
  // el rebaje, acaba 1 cm antes que el techo y empieza 3,5 cm detrás de la punta de delante (AR2604800, AR2605078).
  const uAtras = reb ? A - reb - 10 : A - (A - r.lonaHecha.largo * 10) / 2, uDelante = uAtras - r.lonaHecha.largo * 10;
  p.geo = { A, B, Bt, H, yb, yt, reb, rebajeLado, uAtras, uDelante };
  for (const pos of lat) { const u = uAtras - pos * 10; p.ollaos.push([u, yb(u) + BORDE], [u, yt(u) - BORDE]); }
  const centro = H / 2;
  if (i.bastillaEnfundar) {
    // Bastilla de enfundar (PAMILAKAN; Iván, 20/10/2026, y sus cortes a mano AR2604990, AR2603438…): delante y
    // detrás se dobla a 10 cm de la punta. En el corte se marcan los dos extremos del doblez junto a los
    // bordes (de 3,5 a 6 cm) y el centro a 6–7,5 cm de la punta; sin marcas de hombro.
    for (const u of [DOBLEZ_BASTILLA, A - DOBLEZ_BASTILLA]) { marca(p, u, yb(u) + 35, u, yb(u) + 60); marca(p, u, yt(u) - 35, u, yt(u) - 60); }
    marca(p, 60, centro, 75, centro); marca(p, A - 60, centro, A - 75, centro);
    return p;
  }
  if (reb) {
    // Puentes de HPL (AR2604800, AR2605078): delante, solo el centro; detrás, el centro en el techo y, a 20 cm
    // de la punta de los lados, una raya junto a cada borde y otra junto a cada lado del rebaje.
    marca(p, 10, centro, 25, centro); marca(p, A - reb - 10, centro, A - reb - 25, centro);
    const u = A - 200, y1 = yb(A) + rebajeLado, y2 = yt(A) - rebajeLado;
    marca(p, u, yb(u) + 35, u, yb(u) + 55); marca(p, u, y1 - 20, u, y1); marca(p, u, y2, u, y2 + 20); marca(p, u, yt(u) - 55, u, yt(u) - 35);
    return p;
  }
  // En cada punta, el centro y, si esa cabeza cierra con orejas, los dos hombros (`null`: no cierra).
  for (const [u, de, mh] of [[10, 25, marcasHombro], [A - 10, A - 25, marcasAtras]]) {
    for (const v of mh == null ? [centro] : [centro, yb(u) + mh, yt(u) - mh]) marca(p, u, v, de, v);
  }
  return p;
}
export const DOBLEZ_BASTILLA = 100;

// Contorno que no cabe en el rollo por ningún lado (AR2605079): la pieza grande lleva el rollo entero a lo
// ancho (2500 del largo, desde delante) y el resto del largo sale en una tira con 2 cm de empate, siempre
// arriba, en la parte de atrás del remolque (Iván, 20/10/2026). Como la tira es tan larga como el contorno,
// se empata también en el otro sentido: dos tiras de (contorno + 2 cm) / 2 («esa tira hacerla empatada en
// el otro sentido y meterlo ya en el corte»).
const EMPATE = 20;
// Uniones numeradas desde `n`: n, la pieza grande con la primera media tira; n + 1, con la segunda; n + 2, las
// dos medias tiras entre sí. Las tres piezas van en el mismo sentido (x a lo ancho del contorno, v; y a lo largo
// de la lona, u, hacia atrás): para soldarlas basta con moverlas. Antes las tiras iban en espejo y, para soldarlas
// sin darles la vuelta, su b1 caía donde la grande tiene el b2 (Iván, AR2605192, 22/10/2026).
export function contornoConEmpate(c, n = 1, pre = '') {
  const A = c.w, B = c.h; // u: a lo largo de la lona, delante en 0 y atrás en A; v: a lo ancho del contorno
  const s = A - ROLLO + EMPATE, mitad = (B + EMPATE) / 2, desde = A - s; // la tira va de u = desde a u = A
  const grande = pieza(B, ROLLO); // x = v (contorno), y = u (de 0 a 2500, desde delante)
  seg(grande, 0, 0, B, 0); seg(grande, B, 0, B, ROLLO); seg(grande, B, ROLLO, 0, ROLLO); seg(grande, 0, ROLLO, 0, 0);
  // Cada media tira: x = v (desde 0 la primera y desde (B − 2 cm) / 2 la segunda), y = u − desde.
  const tiras = [pieza(mitad, s), pieza(mitad, s)];
  const dv = [0, (B - EMPATE) / 2];
  for (const t of tiras) { seg(t, 0, 0, mitad, 0); seg(t, mitad, 0, mitad, s); seg(t, mitad, s, 0, s); seg(t, 0, s, 0, 0); }
  for (const [u, v] of c.ollaos) {
    if (u <= ROLLO - 10) grande.ollaos.push([v, u]);
    else if (v < B / 2) tiras[0].ollaos.push([v, u - desde]);
    else tiras[1].ollaos.push([v - dv[1], u - desde]);
  }
  // Las marcas de atrás caen en las tiras; la del centro coincide con su unión y no hace falta.
  for (const [u1, v1, u2, v2] of c.rot) {
    if (u1 <= ROLLO) marca(grande, v1, u1, v2, u2);
    else if (v1 < B / 2) marca(tiras[0], v1, u1 - desde, v2, u2 - desde);
    else if (v1 > B / 2) marca(tiras[1], v1 - dv[1], u1 - desde, v2 - dv[1], u2 - desde);
  }
  // La grande se une a las tiras por arriba (y = 2500) y ellas a la grande por abajo (y = 0, que es u = desde);
  // las tiras, entre sí por su lado corto. Cada número, el mismo en las dos piezas: a 1 cm del borde (en medio de
  // los 2 cm de empate) y a 1 cm de la punta (Iván, 22/10/2026: «no a 4 cm, ponlas a 1 cm»).
  const m = EMPATE / 2, punta = 10;
  const u = (k) => `${pre}${n + k}`;
  numero(grande, punta, ROLLO - m, u(0)); numero(grande, B - punta, ROLLO - m, u(1));
  numero(tiras[0], punta, m, u(0)); numero(tiras[0], mitad - m, s / 2, u(2), 90);
  numero(tiras[1], mitad - punta, m, u(1)); numero(tiras[1], m, s / 2, u(2), 90);
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

// `letras`: Map elemento → letra de cada unidad (solo si el corte lleva más de un remolque). `extras`: otras
// piezas de la misma lona para colocarlas a la vez por huecos (los baquetones, baqueton.js piezasBaqueton).
export function cortarLonasAltas(elementos, x0 = 0, letras = null, extras = []) {
  const out = { lineas: [], rot: [], ollaos: [], arcos: [], textos: [], avisos: [] };
  const piezas = [], tapas = [];
  let union = 1; // número de la siguiente unión de empate (sin letras)
  for (const el of elementos) {
    const i = el.input;
    const { d, t, ventana, marcasHombro, marcasAtras, rebajeLado, puentes } = cabezasLona(el);
    if (ventana) out.avisos.push(`${el.of}: ventana marcada con rotulador y su tapa de ${ventana[0] / 10 + 3} × ${ventana[1] / 10 + 3}; revisar la altura de la ventana.`);
    if (puentes) out.avisos.push(`${el.of}: puentes de Hijos de Pedro López: rebaje de ${REBAJE_PUENTES / 10} cm detrás en el contorno y orejas sin ollaos; revisarlo.`);
    for (let u = 0; u < (i.cantidad || 1); u++) {
      const L = letras?.get(el)?.[u] ?? '';
      const c = contorno(el, marcasHombro, rebajeLado, marcasAtras);
      const conEmpate = c.h > ROLLO && c.w > ROLLO;
      const emp = conEmpate ? contornoConEmpate(c, L ? 1 : union, L.toLowerCase()) : null;
      if (emp && !L) union += 3;
      const grande = rotular(emp ? emp.grande : c, L && `${L}1`);
      grande.contornoDe = el.of;
      piezas.push(grande, rotular(structuredClone(d.p), L && `${L}2`), rotular(structuredClone(t.p), L && `${L}3`));
      if (emp) {
        // Las medias tiras no tienen dobladillo: su nombre va en medio de su borde de empate, a 0,5 cm, dentro de los
        // 2 cm que tapa la soldadura y lejos de los números de unión de las puntas.
        const enEmpate = [emp.tiras[0].w / 2, 5];
        piezas.push(rotular(emp.tiras[0], L && `${L}4`, enEmpate), rotular(emp.tiras[1], L && `${L}5`, enEmpate));
        out.avisos.push(`${el.of}: el contorno no cabe en el rollo: empate de 2 cm a lo largo y tira de ${(c.w - ROLLO + EMPATE) / 10} cm empatada en dos.`);
      }
      // Tapa de la ventana: la ventana + 3 cm, una por ventana (Iván, 20/10/2026).
      if (ventana) { const tapa = pieza(ventana[0] + 30, ventana[1] + 30); seg(tapa, 0, 0, tapa.w, 0); seg(tapa, tapa.w, 0, tapa.w, tapa.h); seg(tapa, tapa.w, tapa.h, 0, tapa.h); seg(tapa, 0, tapa.h, 0, 0); tapa.deRestos = `TAPA DE VENTANA ${ventana[0] / 10 + 3} × ${ventana[1] / 10 + 3}${L ? ` (${L}6)` : ''}`; tapas.push(rotular(tapa, L && `${L}6`)); }
    }
  }
  piezas.push(...extras);
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
    // Un aviso para el taller debajo (los refuerzos de un baquetón), ajustado al ancho de la pieza.
    if (p.textoCentro) out.textos.push({ capa: 'texto', x: x0 + sitio.x + pc.ancho / 2, y: sitio.y + pc.alto / 2 - 300, h: Math.min(100, (pc.ancho - 200) / 20), valor: p.textoCentro, centrado: true });
  }
  return { ...out, largo: x0 + pack.largo };
}

// Delantero y trasero de una lona alta (en mm, sin colocar) y lo que necesita su contorno.
function cabezasLona(el) {
  const i = el.input, r = el.result, f = forma(i);
  const hecha = r.lonaHecha, del = r.panoDelantero, tra = r.panoTrasero;
  const puentes = PUENTES_HPL.test(i.recogeAtras ?? '');
  // El perfil de cada cabeza: la lona hecha + 2 (el remolque + 3, lo que da la web sin recoger), con el ancho de
  // delante o el de detrás (más ancho detrás en Hijos de Pedro López: 1345 con 1330 delante en AR2605078). Lo que
  // el paño tenga de más son orejas, delante o detrás (goma, ganchos, velcro, puentes…).
  const anchoPerfil = (hecha.ancho + 2) * 10;
  const anchoPerfilTra = ((hecha.anchoAtras ?? hecha.ancho) + 2) * 10;
  const orejaDelante = Math.max((del.ancho * 10 - anchoPerfil) / 2, 0);
  const oreja = Math.max((tra.ancho * 10 - anchoPerfilTra) / 2, 0);
  const ollaosDel = i.modoOllaos === 'REPARTIDOS' ? completas(r.ollaos.ancho, r.reparto.delante) : r.reparto.delante;
  const ollaosAtr = i.modoOllaos === 'REPARTIDOS' ? completas(r.ollaos.anchoAtras ?? r.ollaos.ancho, r.reparto.atras) : r.reparto.atras;
  const ventana = i.ventana && i.ventanaAncho > 0 && i.ventanaAlto > 0 ? [i.ventanaAncho * 10, i.ventanaAlto * 10] : null;
  const d = cabeza(f, anchoPerfil, del.alto * 10, orejaDelante, ollaosDel, hecha.ancho, ventana, /CREMALLERA/.test(i.recogeDelante ?? ''));
  const t = cabeza(f, anchoPerfilTra, tra.alto * 10, oreja, ollaosAtr, hecha.anchoAtras ?? hecha.ancho, null, /CREMALLERA/.test(i.recogeAtras ?? ''), puentes && oreja > 0);
  // Marcas del hombro en cada punta del contorno, solo si esa cabeza cierra con orejas (Iván, 21/10/2026: «solo
  // se hacen si el paño cierra con oreja o similar»; si no, solo la del centro, como a mano en AR2605088 con
  // cremallera), a la altura de su oreja: delante la del delantero y detrás la del trasero (AR2605158: 81,5 con
  // la trasera 4 cm más corta, no 85,5). También en el recto (AR2605129).
  // Con la trasera a la línea por arriba el trasero acaba más arriba que el contorno, que llega hasta el fondo: su
  // oreja cae en el contorno lo que se queda corto más arriba (AR2605158: 81,5 + 4 = 85,5; Iván, 21/10/2026).
  const bajaTrasera = i.traseraPorArriba ? Math.max((del.alto - tra.alto) * 10, 0) : 0;
  const marcasHombro = orejaDelante > 0 ? d.altoOreja : null;
  const marcasAtras = oreja > 0 ? t.altoOreja + bajaTrasera : null;
  // Lados del rebaje de los puentes, desde cada borde del contorno: iguales que las orejas del trasero (Iván,
  // 21/10/2026; 535 y 535 en AR2605103). En AR2605078 y AR2604800 a mano no coincidieron y salieron mal.
  const rebajeLado = puentes ? t.altoOreja : 0;
  return { f, d, t, oreja, orejaDelante, anchoPerfil, anchoPerfilTra, ventana, ollaosDel, ollaosAtr, marcasHombro, marcasAtras, bajaTrasera, rebajeLado, puentes };
}

// Las tres piezas de una lona alta (en mm, sin colocar) y sus datos, para el dibujo de confección del plano.
export function piezasLona(el) {
  const i = el.input, r = el.result;
  const { marcasHombro, marcasAtras, rebajeLado, ollaosDel, ollaosAtr, ...resto } = cabezasLona(el);
  const lat = i.modoOllaos === 'REPARTIDOS' ? completas(r.ollaos.largo, r.reparto.laterales) : r.reparto.laterales;
  const c = contorno(el, marcasHombro, rebajeLado, marcasAtras);
  return { ...resto, c, ollaos: { delante: ollaosDel, atras: ollaosAtr, laterales: lat }, marcasHombro, marcasAtras, rebajeLado };
}

export { ROLLO, R_OLLAO };
