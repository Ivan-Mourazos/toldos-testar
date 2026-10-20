// Plano de revisión de remolques: en metros y sobre la presentación A4 de la oficina (la misma de
// toldos, con su cajetín). Arriba, el dibujo de confección de cada lona alta: paño delantero, trasero y
// contorno, cada uno con la línea de corte, la rosa de terminado, los ollaos y marcas, y sus cotas (verde lo
// terminado, ocre lo de corte), como en los DWG de los pedidos (AR2605120). Debajo, el corte del rollo.
import { piezasLona } from './lonaAlta.js';
import { escribirDxfPlano } from '../../domain/corteLona/presentacion.js';

const ORIGEN_M = 100;   // como en toldos: lejos del origen del CAD
const coma = (v) => (Math.round(v * 10) / 10).toString().replace('.', ',');
const PERFILES = { 'TIPO 01': 'RECTO', 'TIPO 02': 'RECTO CON AGUAS', 'TIPO 03': 'CON CUMBRERA', 'TIPO 04': 'CHAFLÁN', 'TIPO 05': 'ARQUILLADO' };

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
  L.g.polilineas.push({ capa: 'referencias', puntos: [[xCon + 3.5, Y + 1], [xCon + B - 3.5, Y + 1], [xCon + B - 3.5, Y + A - 1], [xCon + 3.5, Y + A - 1]], cerrada: true });
  L.texto(`${R}1`, xCon + B / 2, Y + A / 2 - 4, 14);
  L.cota('cotas', xCon + 3.5, Y, xCon + B - 3.5, Y, r.contornoAjustado - 7, -12);
  L.cota('vent-pre-noimpr', xCon, Y, xCon + B, Y, B, -26);
  L.cota('cotas', xCon, Y + 1, xCon, Y + A - 1, hecha.largo, -12);
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
  // Hasta dónde llega la oreja del trasero (las marcas del hombro): cota desde cada borde del corte, arriba.
  const mh = P.marcasHombro / 10;
  L.cota('vent-pre-noimpr', xCon, Y + A, xCon + mh, Y + A, mh, 8, 6);
  L.cota('vent-pre-noimpr', xCon + B - mh, Y + A, xCon + B, Y + A, mh, 8, 6);
  return { ancho: xCon + B - X, alto: Math.max(H, A) };
}

// pedido: el de la web; lonas: los elementos de lona alta de esta lona; corte: entidades del bot (mm);
// material y largo del rollo para el título.
export function escribirPlanoRemolques({ pedido, lonas, letras, corte, material, largoRollo }) {
  const L = lienzo();
  let y = 0, ancho = 0;
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
  // La zona del corte cuenta también lo que ocupan los textos (el material de arriba no va centrado).
  const anchoTexto = (t) => String(t.valor).length * t.h * 0.62;
  const pts = [...C.lineas.flatMap((l) => [[l.x1, l.y1], [l.x2, l.y2]]),
    ...C.textos.flatMap((t) => (t.centrado ? [[t.x - anchoTexto(t) / 2, t.y - t.h], [t.x + anchoTexto(t) / 2, t.y + t.h]] : [[t.x, t.y], [t.x + anchoTexto(t), t.y + t.h]]))];
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
    pedido: pedido.orderCode, of: lonas.map((e) => e.of).join(' / '), cliente: s.customer ?? '', tecnico: s.technician ?? '', revisor: s.reviewer ?? '',
    fecha, pagina: '1/1', material, subtitulo: 'MEDIDAS EN CM · LONA REMOLQUE',
    tituloCorte: `CORTE · ${material} · ROLLO DE 250 · ${(largoRollo / 1000).toLocaleString('es-ES', { maximumFractionDigits: 2 })} M`,
  };
  return escribirDxfPlano(plano, cabecera).dxf;
}
