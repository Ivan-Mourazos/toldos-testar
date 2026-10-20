// Plano de revisión de remolques: en metros y sobre la presentación A4 de la oficina (la misma de
// toldos, con su cajetín). Arriba, el dibujo de confección de cada lona alta: paño delantero, trasero y
// contorno, cada uno con la línea de corte, la rosa de terminado, los ollaos y marcas, y sus cotas (verde lo
// terminado, ocre lo de corte), como en los DWG de los pedidos (AR2605120). Debajo, el corte del rollo.
import { cruz, medidasRefuerzo, piezaBaqueton } from './baqueton.js';
import { aguasArquilladas, DOBLEZ_BASTILLA, piezasLona } from './lonaAlta.js';
import { escribirDxfPlano } from '../../domain/corteLona/presentacion.js';

const ORIGEN_M = 100;   // como en toldos: lejos del origen del CAD
const coma = (v) => (Math.round(v * 10) / 10).toString().replace('.', ',');
const PERFILES = { 'TIPO 01': 'RECTO', 'TIPO 02': 'RECTO CON AGUAS', 'TIPO 03': 'ARQUILLADO CON AGUAS', 'TIPO 04': 'CHAFLÁN', 'TIPO 05': 'ARQUILLADO' };

function lienzo() {
  const g = { lineas: [], polilineas: [], textos: [], arcos: [], circulos: [], cotas: [] };
  const linea = (capa, x1, y1, x2, y2) => g.lineas.push({ capa, x1, y1, x2, y2 });
  const texto = (valor, x, y, h = 8, giro = 0, capa = 'texto') => g.textos.push({ capa, x, y, h, valor: String(valor).toUpperCase(), giro, centrado: true });
  // Cota de verdad (se puede seleccionar y modificar en el CAD), con los estilos de cota de la oficina: XERAL
  // para las medidas grandes y XERAL 5 para las pequeñas (o las cortas, donde no cabe el texto grande). La
  // línea de cota, a `lado` cm de lo acotado.
  const cota = (capa, x1, y1, x2, y2, valor, lado, h = 8) => {
    const vertical = Math.abs(x1 - x2) < 1e-6;
    const largo = Math.abs(vertical ? y2 - y1 : x2 - x1);
    g.cotas.push({ capa, estilo: h >= 7 && largo >= 25 ? 'XERAL' : 'XERAL 5', x1, y1, x2, y2, giro: vertical ? 90 : 0, d: (vertical ? x1 : y1) + lado, valor });
  };
  return { g, linea, texto, cota };
}

// Pinta una pieza (mm, local) en el plano (cm): corte, ollaos y rotulador. `t` pasa de mm locales a cm del plano.
function pintar(L, p, t) {
  for (const [a, b, c, d] of p.lineas) { const [x1, y1] = t(a, b), [x2, y2] = t(c, d); L.linea('DISCO1', x1, y1, x2, y2); }
  for (const [a, b, c, d] of p.rot) { const [x1, y1] = t(a, b), [x2, y2] = t(c, d); L.linea('ROTULADOR', x1, y1, x2, y2); }
  // La raya de la cremallera, entera en el plano (en el corte va recortada: el arranque y una T).
  for (const [a, b, c, d] of p.cremallera ?? []) { const [x1, y1] = t(a, b), [x2, y2] = t(c, d); L.linea('ROTULADOR', x1, y1, x2, y2); }
  for (const [a, b] of p.ollaos) { const [x, y] = t(a, b); L.g.circulos.push({ capa: 'ROTULADOR', x, y, r: 0.25 }); }
  // Arcos del corte (esquinas del arquillado): `t` no gira, así que los ángulos se quedan como están.
  for (const a of p.arcos) { const [x, y] = t(a.x, a.y); L.g.arcos.push({ capa: 'DISCO1', x, y, r: a.r / 10, desde: a.desde, hasta: a.hasta }); }
}

// Rosa de terminado de una cabeza: 1 cm por dentro en los lados y arriba, 3,5 cm sobre la base (AR2605120).
function rosaCabeza(L, f, x0, w, h, t) {
  const r = f.r, ag = f.aguas, i = 10, base = 35;
  if (f.tipo === 'TIPO 05') {
    // Hombros en arco de verdad, como se dibujan a mano (no en tramos rectos): mismo centro que el corte.
    const tramo = (pts) => L.g.polilineas.push({ capa: 'referencias', puntos: pts.map(([a, b]) => t(a, b)), cerrada: false });
    tramo([[x0 + i, h - r], [x0 + i, base], [x0 + w - i, base], [x0 + w - i, h - r]]);
    tramo([[x0 + r, h - i], [x0 + w - r, h - i]]);
    for (const [cx, desde, hasta] of [[x0 + w - r, 0, 90], [x0 + r, 90, 180]]) {
      const [x, y] = t(cx, h - r);
      L.g.arcos.push({ capa: 'referencias', x, y, r: (r - i) / 10, desde, hasta });
    }
    return;
  }
  if (f.tipo === 'TIPO 03') {
    // Arquillado con aguas: 1 cm por dentro del corte, con los arcos de verdad (radio − 1 cm, mismo centro) y
    // las pendientes paralelas. Si un radio es de 1 cm o menos, por dentro queda en esquina viva.
    const g = aguasArquilladas(f, w, h), sen = Math.sin(g.theta), cos = Math.cos(g.theta), grados = (g.theta * 180) / Math.PI;
    const tramo = (pts) => L.g.polilineas.push({ capa: 'referencias', puntos: pts.map(([a, b]) => t(a, b)), cerrada: false });
    const arco = (cx, cy, radio, desde, hasta) => { const [x, y] = t(cx, cy); L.g.arcos.push({ capa: 'referencias', x, y, r: radio / 10, desde, hasta }); };
    // Hombro: hasta dónde llega el lado y dónde empieza la pendiente (dx desde el lado).
    const [ladoY, pend] = g.rh > i
      ? [g.cyH, [g.rh - (g.rh - i) * sen, g.cyH + (g.rh - i) * cos]]
      : [g.lateral + i * Math.tan(g.theta) - i / cos, [i, g.lateral + i * Math.tan(g.theta) - i / cos]];
    const cima = g.rc > i ? [g.a - (g.rc - i) * sen, g.cyC + (g.rc - i) * cos] : [g.a, h - i / cos];
    tramo([[x0 + i, ladoY], [x0 + i, base], [x0 + w - i, base], [x0 + w - i, ladoY]]);
    tramo([[x0 + pend[0], pend[1]], [x0 + cima[0], cima[1]]]);
    tramo([[x0 + w - cima[0], cima[1]], [x0 + w - pend[0], pend[1]]]);
    if (g.rh > i) { arco(x0 + g.rh, g.cyH, g.rh - i, 90 + grados, 180); arco(x0 + w - g.rh, g.cyH, g.rh - i, 0, 90 - grados); }
    if (g.rc > i) arco(x0 + g.a, g.cyC, g.rc - i, 90 - grados, 90 + grados);
    return;
  }
  const pts = f.tipo === 'TIPO 02'
    ? [[x0 + i, base], [x0 + i, h - ag - i], [x0 + w / 2, h - i], [x0 + w - i, h - ag - i], [x0 + w - i, base]]
    : [[x0 + i, base], [x0 + i, h - i], [x0 + w - i, h - i], [x0 + w - i, base]];
  L.g.polilineas.push({ capa: 'referencias', puntos: pts.map(([a, b]) => t(a, b)), cerrada: true });
}

// Escalera horizontal (cotas con línea base): todas desde x = xb (borde de la lona hecha) hasta cada ollao, a
// la altura y; cada cota un escalón (4 cm) más arriba.
function escaleraH(L, xb, y, posiciones) {
  [...posiciones].sort((a, b) => a - b).forEach((p, k) => {
    L.g.cotas.push({ capa: 'cotas', estilo: 'XERAL 5', x1: xb, y1: y, x2: xb + p, y2: y, giro: 0, d: y + 6 + 4 * k, valor: p });
  });
}
// Escalera vertical (laterales del contorno): línea base en y = yb (arriba), ollaos en x; hacia la derecha.
function escaleraV(L, yb, x, posiciones) {
  [...posiciones].sort((a, b) => a - b).forEach((p, k) => {
    L.g.cotas.push({ capa: 'cotas', estilo: 'XERAL 5', x1: x, y1: yb, x2: x, y2: yb - p, giro: 90, d: x + 6 + 4 * k, valor: p });
  });
}

function confeccionLona(L, el, X, Y, letra) {
  const i = el.input, r = el.result, P = piezasLona(el);
  const del = r.panoDelantero, tra = r.panoTrasero, con = r.panoContorno, hecha = r.lonaHecha;
  const W = del.ancho, H = del.alto, Wt = tra.ancho, A = con.ancho, B = con.alto, o = P.oreja / 10;
  const enPlano = (x0, y0) => (u, v) => [x0 + u / 10, y0 + v / 10];
  const xDel = X, xTra = X + W + 60, xCon = xTra + Wt + 80;
  const titulo = `${letra ? `${letra} · ` : ''}LONA ALTA ${i.largo} × ${i.ancho} × ${i.altoDelante}${i.altoAtras && i.altoAtras !== i.altoDelante ? `/${i.altoAtras}` : ''} · ${PERFILES[i.tipoPerfil] ?? i.tipoPerfil} · OF ${el.of}`;
  L.texto(titulo, (X + xCon + B) / 2, Y + Math.max(H, A) + 40, 12);

  const R = letra || 'A';

  // Paño delantero.
  pintar(L, P.d.p, enPlano(xDel, Y));
  rosaCabeza(L, P.f, 0, W * 10, H * 10, enPlano(xDel, Y));
  L.cota('cotas', xDel + 1, Y, xDel + W - 1, Y, hecha.ancho, -12);
  L.cota('vent-pre-noimpr', xDel, Y, xDel + W, Y, W, -26);
  L.cota('cotas', xDel, Y + 3.5, xDel, Y + H - 1, i.altoDelante, -12);
  L.cota('vent-pre-noimpr', xDel, Y, xDel, Y + H, H, -26);
  escaleraH(L, xDel + 1, Y + 4.5, P.ollaos.delante);
  if (P.ventana) {
    // Medidas de la ventana por dentro del recuadro.
    const rot = P.d.p.rot.map(([a, b, c, d]) => [a / 10, b / 10, c / 10, d / 10]);
    const xs = rot.flatMap(([a, , c]) => [a, c]), ys = rot.flatMap(([, b, , d]) => [b, d]);
    const vx0 = Math.min(...xs.filter((x) => x > 1 && x < W - 1)), vx1 = Math.max(...xs.filter((x) => x > 1 && x < W - 1));
    const vy1 = Math.max(...ys.filter((y) => y < H - 2)), vy0 = vy1 - P.ventana[1] / 10;
    L.cota('cotas', xDel + vx0, Y + vy1 - 5, xDel + vx1, Y + vy1 - 5, P.ventana[0] / 10, 0, 4);
    L.cota('cotas', xDel + vx0 + 5, Y + vy0, xDel + vx0 + 5, Y + vy1, P.ventana[1] / 10, 0, 4);
    L.texto(`${R}2`, xDel + vx0 / 2 + 0.5, Y + (vy0 + vy1) / 2, 14);
  } else L.texto(`${R}2`, xDel + W / 2, Y + (4.5 + 8 + 4 * Math.max(P.ollaos.delante.length - 1, 0) + H) / 2 - 3, 14);

  // Paño trasero (con orejas si recoge con goma).
  pintar(L, P.t.p, enPlano(xTra, Y));
  rosaCabeza(L, P.f, P.oreja, W * 10, H * 10, enPlano(xTra, Y));
  if (o) {
    for (const xo of [30, Wt * 10 - 30]) { const [a, b] = enPlano(xTra, Y)(xo, 35), [c, d] = enPlano(xTra, Y)(xo, P.t.altoOreja); L.g.polilineas.push({ capa: 'referencias', puntos: [[a, b], [c, d]], cerrada: false }); }
    L.cota('cotas', xTra + 3, Y, xTra + o + 1, Y, o - 2, -12);
    L.cota('cotas', xTra + Wt - o - 1, Y, xTra + Wt - 3, Y, o - 2, -12);
    L.cota('vent-pre-noimpr', xTra + Wt, Y, xTra + Wt, Y + P.t.altoOreja / 10, P.t.altoOreja / 10, 12);
  }
  L.cota('cotas', xTra + o + 1, Y, xTra + Wt - o - 1, Y, hecha.anchoAtras ?? hecha.ancho, -12);
  L.cota('vent-pre-noimpr', xTra, Y, xTra + Wt, Y, Wt, -26);
  L.texto(`${R}3`, xTra + Wt / 2, Y + (4.5 + 8 + 4 * Math.max(P.ollaos.atras.length - 1, 0) + H) / 2 - 3, 14);
  escaleraH(L, xTra + o + 1, Y + 4.5, P.ollaos.atras);

  // Paño contorno, a lo ancho: x = a lo largo del contorno, y = a lo largo de la lona (atrás arriba).
  const tc = (u, v) => [xCon + v / 10, Y + u / 10];
  pintar(L, P.c, tc);
  // Terminado: 3,5 cm por dentro en los laterales y, en las puntas, lo que sobra del hecho a cada lado (1 cm en
  // una lona normal; 6 con bastilla de enfundar, como en AR2603438). Ahí empieza la escalera de los ollaos.
  const punta = (A - hecha.largo) / 2;
  L.g.polilineas.push({ capa: 'referencias', puntos: [[xCon + 3.5, Y + punta], [xCon + B - 3.5, Y + punta], [xCon + B - 3.5, Y + A - punta], [xCon + 3.5, Y + A - punta]], cerrada: true });
  L.texto(`${R}1`, xCon + B / 2, Y + A / 2 - 4, 14);
  L.cota('cotas', xCon + 3.5, Y, xCon + B - 3.5, Y, r.contornoAjustado - 7, -12);
  L.cota('vent-pre-noimpr', xCon, Y, xCon + B, Y, B, -26);
  L.cota('cotas', xCon, Y + punta, xCon, Y + A - punta, hecha.largo, -12);
  L.cota('vent-pre-noimpr', xCon, Y, xCon, Y + A, A, -26);
  // Contorno que no cabe en el rollo: dónde va el empate (2 cm) y la tira empatada en dos, en trazos.
  if (A * 10 > 2500 && B * 10 > 2500) {
    const yE = Y + 248, yE2 = Y + 250, xM = xCon + B / 2;
    for (const yy of [yE, yE2]) L.g.polilineas.push({ capa: 'ejes', puntos: [[xCon, yy], [xCon + B, yy]], cerrada: false });
    L.g.polilineas.push({ capa: 'ejes', puntos: [[xM - 1, yE], [xM - 1, Y + A]], cerrada: false }, { capa: 'ejes', puntos: [[xM + 1, yE], [xM + 1, Y + A]], cerrada: false });
    L.texto(`EMPATE 2 CM · TIRA DE ${coma(A - 250 + 2)} EN DOS (${R}4 Y ${R}5)`, xCon + B / 2, yE - 7, 6, 0, 'cotas');
  }
  // Laterales: línea base arriba (atrás, donde empieza la lona hecha), escalera hacia dentro del paño.
  escaleraV(L, Y + A - (A - hecha.largo) / 2, xCon + 4.5, P.ollaos.laterales);
  if (i.bastillaEnfundar) {
    // Bastilla de enfundar: el doblez entero, de lado a lado a 10 cm de cada punta, como en AR2603438 (en el
    // corte solo van sus extremos). Sin marcas de hombro, no hay cota de la oreja.
    for (const u of [DOBLEZ_BASTILLA, A * 10 - DOBLEZ_BASTILLA]) { const [x1, y1] = tc(u, 35), [x2, y2] = tc(u, B * 10 - 35); L.linea('ROTULADOR', x1, y1, x2, y2); }
    L.cota('vent-pre-noimpr', xCon + B, Y + A - DOBLEZ_BASTILLA / 10, xCon + B, Y + A, DOBLEZ_BASTILLA / 10, 12, 6);
  } else {
    // Hasta dónde llega la oreja del trasero (las marcas del hombro): cota desde cada borde del corte, arriba.
    const mh = P.marcasHombro / 10;
    L.cota('vent-pre-noimpr', xCon, Y + A, xCon + mh, Y + A, mh, 8, 6);
    L.cota('vent-pre-noimpr', xCon + B - mh, Y + A, xCon + B, Y + A, mh, 8, 6);
  }
  return { ancho: xCon + B - X, alto: Math.max(H, A) };
}

// Dibujo de confección de un baquetón (Iván, 20/10/2026; como AR2605071), en cm, igual que va en el corte:
// delante a la izquierda y detrás a la derecha. Línea de corte en cruz, rosa de terminado (el remolque hecho
// con sus cuatro solapas de baquetón), el remolque en trazos, ollaos, cotas verdes de terminado (baquetón |
// hecho | baquetón) y ocres de corte (paño y esquinas), y los ollaos con línea base en escalera.
function confeccionBaqueton(L, el, params, X, Y, letras, refuerzos) {
  const i = el.input, r = el.result, pz = piezaBaqueton(el, params);
  const t = (u, v) => [X + u / 10, Y + v / 10];
  const W = pz.L / 10, H = pz.A / 10, b = i.baqueton;
  // Varias unidades iguales, un solo dibujo con todas sus piezas (A1 · B1), como a mano (AR2605071).
  const conLetra = letras.filter(Boolean);
  const titulo = `${conLetra.length ? `${conLetra.join(', ')} · ` : ''}BAQUETÓN ${i.largo} × ${i.ancho} × ${b}${letras.length > 1 ? ` × ${letras.length}` : ''} · OF ${el.of}`;
  L.texto(titulo, X + W / 2, Y + H + 36, 9);

  // Corte y ollaos, como en el DXF del bot.
  for (const [[a, c], [d, e]] of cruz(pz.L, pz.A, pz.eI, pz.eR, pz.eb)) { const [x1, y1] = t(a, c), [x2, y2] = t(d, e); L.linea('DISCO1', x1, y1, x2, y2); }
  for (const [u, v] of pz.ollaos) { const [x, y] = t(u, v); L.g.circulos.push({ capa: 'ROTULADOR', x, y, r: 0.25 }); }

  // Remolque hecho: empieza a 1 cm de la esquina de delante y de la de abajo (piezaBaqueton).
  const x0 = X + (pz.eI + 10) / 10, y0 = Y + (pz.eb + 10) / 10;
  const x1 = x0 + r.remolqueHecho.largo, y1 = y0 + r.remolqueHecho.ancho;
  L.g.polilineas.push({ capa: 'referencias', cerrada: true, puntos: [
    [x0, y0 - b], [x1, y0 - b], [x1, y0], [x1 + b, y0], [x1 + b, y1], [x1, y1], [x1, y1 + b], [x0, y1 + b], [x0, y1], [x0 - b, y1], [x0 - b, y0], [x0, y0],
  ] });
  // El remolque de verdad, en trazos (no se imprime), centrado en el hecho.
  const [rx, ry] = [(x0 + x1 - i.largo) / 2, (y0 + y1 - i.ancho) / 2];
  L.g.polilineas.push({ capa: 'vent-pre-noimpr', cerrada: true, puntos: [[rx, ry], [rx + i.largo, ry], [rx + i.largo, ry + i.ancho], [rx, ry + i.ancho]] });
  L.texto(letras.map((l) => `${l || 'A'}1`).join(' · '), (x0 + x1) / 2, (y0 + y1) / 2 + 4, 14);
  if (refuerzos) {
    // Cada refuerzo donde va (AR2604224): la L en trazos en la esquina del terminado, entrando sus brazos en
    // el hecho y el resto en las solapas; el hueco, en la esquina de fuera, donde no hay solapa.
    const { lado, brazo } = medidasRefuerzo(pz);
    const [n, bz] = [(lado - brazo) / 10, brazo / 10];
    for (const [xc, yc, sx, sy] of [[x0, y0, -1, -1], [x1, y0, 1, -1], [x0, y1, -1, 1], [x1, y1, 1, 1]]) {
      const puntos = [[0, -n], [bz, -n], [bz, bz], [-n, bz], [-n, 0], [0, 0]].map(([u, v]) => [xc - sx * u, yc - sy * v]);
      L.g.polilineas.push({ capa: 'vent-pre-noimpr', cerrada: true, puntos });
    }
    L.texto('REFUERZOS EN ESQUINAS, SIN MARCAR', (x0 + x1) / 2, (y0 + y1) / 2 - 12, 6);
  }

  // Terminado: arriba baquetón | hecho | baquetón; a la izquierda, lo mismo en alto.
  const arriba = Y + H + 10 - (y1 + b), izquierda = -(x0 - b - X) - 10;
  L.cota('cotas', x0 - b, y1 + b, x0, y1 + b, b, arriba, 6);
  L.cota('cotas', x0, y1 + b, x1, y1 + b, r.remolqueHecho.largo, arriba);
  L.cota('cotas', x1, y1 + b, x1 + b, y1 + b, b, arriba, 6);
  L.cota('cotas', x0 - b, y0 - b, x0 - b, y0, b, izquierda, 6);
  L.cota('cotas', x0 - b, y0, x0 - b, y1, r.remolqueHecho.ancho, izquierda);
  L.cota('cotas', x0 - b, y1, x0 - b, y1 + b, b, izquierda, 6);
  // Corte: esquinas y paño abajo; esquinas y paño a la derecha.
  L.cota('vent-pre-noimpr', X, Y, X + pz.eI / 10, Y, pz.eI / 10, -12, 6);
  L.cota('vent-pre-noimpr', X + W - pz.eR / 10, Y, X + W, Y, pz.eR / 10, -12, 6);
  L.cota('vent-pre-noimpr', X, Y, X + W, Y, W, -26);
  L.cota('vent-pre-noimpr', X + W, Y, X + W, Y + pz.eb / 10, pz.eb / 10, 12, 6);
  L.cota('vent-pre-noimpr', X + W, Y + H - pz.eb / 10, X + W, Y + H, pz.eb / 10, 12, 6);
  L.cota('vent-pre-noimpr', X + W, Y, X + W, Y + H, H, 26);

  // Ollaos con línea base en escalera, en el mismo sitio que en el corte: laterales desde el final del hecho
  // (atrás, a la derecha) hacia delante, por debajo; delante desde abajo, a la izquierda; detrás, a la
  // derecha, solo si no es igual que delante.
  const marcas = (eje, n) => (eje && eje.n > n.length ? Array.from({ length: eje.n }, (_, k) => Math.round((n[0] + eje.dist * k) * 10) / 10) : n);
  const repartidos = i.modoOllaos === 'REPARTIDOS';
  const lat = repartidos ? marcas(r.ollaos.largo, r.reparto.laterales) : r.reparto.laterales;
  const del = repartidos ? marcas(r.ollaos.ancho, r.reparto.delante) : r.reparto.delante;
  const atr = repartidos ? marcas(r.ollaos.anchoAtras ?? r.ollaos.ancho, r.reparto.atras) : r.reparto.atras;
  const yo = Y + 4, xd = X + 4, xa = X + W - 4;
  [...lat].sort((a, c) => a - c).forEach((p, k) => {
    L.g.cotas.push({ capa: 'cotas', estilo: 'XERAL 5', x1: x1, y1: yo, x2: x1 - p, y2: yo, giro: 0, d: Y - 40 - 4 * k, valor: p });
  });
  [...del].sort((a, c) => a - c).forEach((p, k) => {
    L.g.cotas.push({ capa: 'cotas', estilo: 'XERAL 5', x1: xd, y1: y0, x2: xd, y2: y0 + p, giro: 90, d: X - 30 - 4 * k, valor: p });
  });
  if (atr.join() !== del.join()) {
    [...atr].sort((a, c) => a - c).forEach((p, k) => {
      L.g.cotas.push({ capa: 'cotas', estilo: 'XERAL 5', x1: xa, y1: y0, x2: xa, y2: y0 + p, giro: 90, d: X + W + 40 + 4 * k, valor: p });
    });
  }
  // Baquetón que no cabe en el rollo: empate de 2 cm, el paño entero desde delante (como en el corte).
  if (pz.L > 2500 && pz.A > 2500) {
    for (const xx of [X + 248, X + 250]) L.g.polilineas.push({ capa: 'ejes', puntos: [[xx, Y], [xx, Y + H]], cerrada: false });
    L.texto('EMPATE 2 CM', X + 249, Y + H + 8, 6, 0, 'cotas');
  }
  const abajo = 40 + 4 * Math.max(lat.length - 1, 0) + 10;
  return { ancho: W + 40 + (atr.join() !== del.join() ? 4 * atr.length : 0) + 30 + 4 * del.length, alto: H, abajo };
}

// pedido: el de la web; lonas y baquetones: los elementos de esta lona; corte: entidades del bot (mm);
// material y largo del rollo para el título.
export function escribirPlanoRemolques({ pedido, lonas, baquetones = [], params = {}, refuerzos = false, letras, corte, material, largoRollo }) {
  const L = lienzo();
  let y = 0, ancho = 0;
  // Los baquetones abajo, con sitio para sus escaleras de ollaos por debajo.
  for (const el of [...baquetones].reverse()) {
    const d = confeccionBaqueton(L, el, params, 30 + 4 * 6, y + 60, letras?.get(el) ?? [''], refuerzos);
    ancho = Math.max(ancho, d.ancho + 30 + 4 * 6);
    y += 60 + d.alto + 120;
  }
  for (const el of [...lonas].reverse()) {
    for (const letra of letras?.get(el) ?? ['']) {
      const d = confeccionLona(L, el, 0, y, letra);
      ancho = Math.max(ancho, d.ancho);
      y += d.alto + 120;
    }
  }
  const zonaDibujo = { x0: -45, y0: -45, x1: ancho + 20, y1: y - 40 };
  // Corte debajo, a escala (mm → cm), lejos del dibujo.
  const C = { lineas: [], polilineas: [], textos: [], arcos: [], circulos: [] };
  const yc = -900, cm = (v) => v / 10;
  for (const l of corte.lineas) C.lineas.push({ capa: l.capa, x1: cm(l.x1), y1: yc + cm(l.y1), x2: cm(l.x2), y2: yc + cm(l.y2) });
  for (const t of corte.textos) C.textos.push({ ...t, valor: String(t.valor), x: cm(t.x), y: yc + cm(t.y), h: cm(t.h), centrado: Boolean(t.centrado) });
  for (const c of corte.circulos) C.circulos.push({ capa: c.capa, x: cm(c.x), y: yc + cm(c.y), r: 0.25 });
  for (const a of corte.arcos) C.arcos.push({ capa: a.capa, x: cm(a.x), y: yc + cm(a.y), r: cm(a.r), desde: a.desde, hasta: a.hasta });
  // Cotas del corte (Iván, 20/10/2026): el largo total por debajo y el alto que ocupa a la izquierda.
  const alto = Math.max(...C.lineas.map((l) => Math.max(l.y1, l.y2))) - yc;
  C.cotas = [
    { capa: 'cotas', estilo: 'XERAL', x1: 0, y1: yc, x2: cm(largoRollo), y2: yc, giro: 0, d: yc - 25, valor: cm(largoRollo) },
    { capa: 'cotas', estilo: 'XERAL', x1: 0, y1: yc, x2: 0, y2: yc + alto, giro: 90, d: -25, valor: alto },
  ];
  // La zona del corte cuenta también lo que ocupan los textos (el material de arriba no va centrado).
  const anchoTexto = (t) => String(t.valor).length * t.h * 0.62;
  const pts = [...C.lineas.flatMap((l) => [[l.x1, l.y1], [l.x2, l.y2]]),
    ...C.textos.flatMap((t) => (t.centrado ? [[t.x - anchoTexto(t) / 2, t.y - t.h], [t.x + anchoTexto(t) / 2, t.y + t.h]] : [[t.x, t.y], [t.x + anchoTexto(t), t.y + t.h]])),
    // Las cotas, con el sitio de su texto.
    [-25 - 12, yc - 25 - 12]];
  const zonaCorte = { x0: Math.min(...pts.map((p) => p[0])) - 10, y0: Math.min(...pts.map((p) => p[1])) - 10, x1: Math.max(...pts.map((p) => p[0])) + 10, y1: Math.max(...pts.map((p) => p[1])) + 10 };
  // A metros, a 100 m del origen.
  const m = (v) => ORIGEN_M + v / 100;
  const aM = (G) => ({
    lineas: G.lineas.map((l) => ({ ...l, x1: m(l.x1), y1: m(l.y1), x2: m(l.x2), y2: m(l.y2) })),
    polilineas: G.polilineas.map((p) => ({ ...p, puntos: p.puntos.map(([a, b]) => [m(a), m(b)]) })),
    textos: G.textos.map((t) => ({ ...t, x: m(t.x), y: m(t.y), h: t.h / 100 })),
    arcos: G.arcos.map((a) => ({ ...a, x: m(a.x), y: m(a.y), r: a.r / 100 })),
    circulos: G.circulos.map((c) => ({ ...c, x: m(c.x), y: m(c.y), r: c.r / 100 })),
    cotas: (G.cotas ?? []).map((c) => ({ ...c, x1: m(c.x1), y1: m(c.y1), x2: m(c.x2), y2: m(c.y2), d: m(c.d) })),
  });
  const zona = (z) => ({ x0: m(z.x0), y0: m(z.y0), x1: m(z.x1), y1: m(z.y1) });
  const plano = { ...aM(L.g), corte: aM(C), zonas: { toldos: zona(zonaDibujo), corte: zona(zonaCorte) }, corteDerecho: true };
  const s = pedido.summary ?? {};
  const fecha = (s.orderDate ?? '').split('-').reverse().map((x, k) => (k === 2 ? x.slice(2) : x)).join('/');
  const cabecera = {
    pedido: pedido.orderCode, of: [...new Set([...lonas, ...baquetones].map((e) => e.of))].join(' / '), cliente: s.customer ?? '', tecnico: s.technician ?? '', revisor: s.reviewer ?? '',
    fecha, pagina: '1/1', material, subtitulo: 'MEDIDAS EN CM · LONA REMOLQUE',
    tituloCorte: `CORTE · ${material} · ROLLO DE 250 · ${(largoRollo / 1000).toLocaleString('es-ES', { maximumFractionDigits: 2 })} M`,
  };
  return escribirDxfPlano(plano, cabecera).dxf;
}
