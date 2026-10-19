// Plano de confección de la lona de PVC de un pedido de fachada, dibujado como los de la oficina
// (docs/dxf-corte-pvc.md, «Dibujo de confección»): cada toldo con su pieza terminada (rosa), corte
// (DISCO1), rotulador (ROTULADOR), anotaciones y cotas; debajo el corte en el rollo.
// Se escribe en metros sobre la presentación A4. La conversión a DWG se hará en la fase 2.
import { AJUSTES_POR_DEFECTO } from './despiece.js';
import { dibujo } from './dibujoCorte.js';
import { anchoArial } from './texto.js';

// Corte y rotulador van en las capas del bot (DISCO1, ROTULADOR, texto), que ya trae la plantilla;
// «cortes - lona», «MARCA» o «corte» son antiguas (Iván, 19/10/2026). Se añaden las que no cortan:
const CAPAS = [
  { nombre: 'referencias', color: 6 },                         // pieza terminada (rosa)
  { nombre: 'cotas', color: 3 },
  { nombre: 'vent-pre-noimpr', color: 51, imprimir: false },   // cotas de corte, no se imprimen
  { nombre: 'ejes', color: 23, tipoLinea: 'TRAZOS' }           // líneas del empate
];
const VARILLA_TOLDO = 'VARILLA NEGRA (4,5)';      // guía de la oficina: negra en toldos,
const VARILLA_CAMBIO = 'VARILLA BLANCA (5,5)';     // blanca en cambios de tela
const VARILLA_ABAJO = 'VARILLA BLANCA (5,5)';
const ENTRE_TOLDOS = 150;   // cm
const ORIGEN_M = 100;       // el dibujo empieza a 100 m del origen en X y en Y
const HUECO_TIRA = 45;      // cm entre el cuerpo y la tira: caben las dos «VARILLA BLANCA»

const coma = (v) => (Math.round(v * 10) / 10).toString().replace('.', ',');

export function dibujarPlano(datos, corteRollo, trozoSeparado = null) {
  const L = [], P = [], T = [];   // en cm; se pasan a metros al final
  const linea = (capa, x1, y1, x2, y2) => L.push({ capa, x1, y1, x2, y2 });
  const rect = (capa, x0, y0, x1, y1) => P.push({ capa, puntos: [[x0, y0], [x1, y0], [x1, y1], [x0, y1]], cerrada: true });
  // Cada texto se ajusta a su hueco: si a su altura no cabe en `max` cm, se reduce (Iván: en los
  // toldos pequeños hay que adaptar los textos).
  // La ventana de la hoja amplía más los toldos pequeños: el tamaño base de los textos va con el del
  // dibujo para que en papel se lean parecidos (referencia: un toldo de unos 6,5 × 3,5 m).
  const anchoTotal = datos.toldos.reduce((s, t) => s + t.frenteTela + 30, 0) + ENTRE_TOLDOS * (datos.toldos.length - 1);
  const altoTotal = Math.max(...datos.toldos.map((t) => t.caidaTela)) + 150;
  const escalaTexto = Math.min(1.3, Math.max(0.55, Math.max(anchoTotal / 1.82, altoTotal) / 450));
  const ajustar = (valor, h, max) => (max ? Math.min(h * escalaTexto, max / anchoArial(valor, 1)) : h * escalaTexto);
  const texto = (valor, x, y, h = 10, giro = 0, capa = 'texto', max = 0) => T.push({ capa, x, y, h: ajustar(valor, h, max), valor, giro, centrado: true });
  // Cota con líneas de referencia, trazos a 45° y el valor encima. `lado` separa la cota de la pieza.
  const cota = (capa, x1, y1, x2, y2, valor, lado) => {
    const vertical = x1 === x2;
    const [dx, dy] = vertical ? [lado, 0] : [0, lado];
    const [a, b] = [[x1 + dx, y1 + dy], [x2 + dx, y2 + dy]];
    // Con lado = 0 la línea de cota va sobre los puntos, sin líneas de referencia.
    if (lado) {
      linea(capa, x1, y1, a[0] + Math.sign(dx) * 5, a[1] + Math.sign(dy) * 5);
      linea(capa, x2, y2, b[0] + Math.sign(dx) * 5, b[1] + Math.sign(dy) * 5);
    }
    linea(capa, a[0], a[1], b[0], b[1]);
    for (const [x, y] of [a, b]) linea(capa, x - 3, y - 3, x + 3, y + 3);
    const [mx, my] = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
    texto(coma(valor), mx + (vertical ? (dx < 0 ? -9 : 9) : 0), my + (vertical ? 0 : 9), 12, vertical ? 90 : 0, capa);
  };

  let x = 0;

  for (const [i, t] of datos.toldos.entries()) {
    const A = { ...AJUSTES_POR_DEFECTO, ...t.ajustes };
    const vertical = A.empate === 'vertical' && t.frenteTela > t.anchoRollo;
    const piezas = corteRollo.piezas[i].piezas;
    const cuerpos = piezas.filter((p) => !p.nombre.includes('BAMBA'));
    const tiraCm = t.bamba > 0 ? t.bamba + A.tiraExtraAltoCm : 0;
    const F = t.frenteTela;
    // Corte del cuerpo: con empate horizontal, el aumento para escuadrar; con vertical, los laterales.
    const empateH = !vertical && cuerpos.length > 1;
    const anchoCorte = vertical ? F + 2 * A.lateralVerticalCm : F + (empateH ? A.aumentoEscuadrarCm : 0);
    const tiraLargo = F + A.tiraExtraLargoCm;
    const ancho = Math.max(anchoCorte, tiraLargo);
    // Todo el toldo es simétrico respecto a su eje cx.
    const cx = x + ancho / 2;
    const [fx0, fx1] = [cx - F / 2, cx + F / 2];                   // pieza terminada
    const [cx0, cx1] = [cx - anchoCorte / 2, cx + anchoCorte / 2];   // corte del cuerpo
    const [tx0, tx1] = [cx - tiraLargo / 2, cx + tiraLargo / 2];     // corte de la tira
    const xDer = Math.max(cx1, tiraCm ? tx1 : cx1) + 35;             // cotas impresas, a la derecha
    const xIzq = Math.min(cx0, tiraCm ? tx0 : cx0) - 35;             // cotas de corte, a la izquierda
    const yc0 = tiraCm ? tiraCm + HUECO_TIRA : 0;                     // corte de abajo del cuerpo
    // El solape ya está incluido en los paños: al soldarlos no aumenta la caída terminada.
    const yc1 = yc0 + t.caidaTela - tiraCm;
    const cy = (yc0 + yc1) / 2;

    if (tiraCm) {
      const tc = tiraCm / 2;
      rect('DISCO1', tx0, 0, tx1, tiraCm);
      rect('referencias', fx0, tc - t.bamba / 2, fx1, tc + t.bamba / 2);
      linea('ROTULADOR', fx0, tiraCm - A.varillaTiraMm / 10, fx1, tiraCm - A.varillaTiraMm / 10);
      // Tira en trozos (empate vertical): la letra en el primero y sus uniones, como las de los paños.
      const trozos = piezas.filter((q) => q.nombre.includes('BAMBA'));
      texto(t.letra, trozos.length > 1 ? tx0 + trozos[0].largo / 20 : cx, tc, Math.min(12, tiraCm * 0.6));
      let xt = tx0;
      trozos.slice(0, -1).forEach((q) => {
        xt += q.largo / 10;
        linea('ejes', xt - A.empateCm, 0, xt - A.empateCm, tiraCm);
        linea('ejes', xt, 0, xt, tiraCm);
        xt -= A.empateCm;
      });
      texto(VARILLA_ABAJO, cx, tiraCm + 10, 10, 0, 'texto', F * 0.9);
      texto('B.N(2)', cx, -12, 10, 0, 'texto', F * 0.9);
      texto('B.N(2)', tx0 - 10, tc, 10, 90);
      texto('B.N(2)', tx1 + 10, tc, 10, 90);
      cota('cotas', xDer - 15, tc - t.bamba / 2, xDer - 15, tc + t.bamba / 2, t.bamba, 15);
      cota('vent-pre-noimpr', xIzq + 15, 0, xIzq + 15, tiraCm, tiraCm, -15);
    }

    rect('DISCO1', cx0, yc0, cx1, yc1);
    rect('referencias', fx0, yc0 + 3.5, fx1, yc1 - 3.5);
    linea('ROTULADOR', fx0, yc1 - A.varillaArribaMm / 10, fx1, yc1 - A.varillaArribaMm / 10);
    if (tiraCm) linea('ROTULADOR', fx0, yc0 + A.varillaArribaMm / 10, fx1, yc0 + A.varillaArribaMm / 10);
    texto(t.ajustes?.varillaArriba || (t.cambioTela ? VARILLA_CAMBIO : VARILLA_TOLDO), cx, yc1 + 10, 10, 0, 'texto', F * 0.9);
    if (tiraCm) texto(VARILLA_ABAJO, cx, yc0 - 10, 10, 0, 'texto', F * 0.9);
    const lateral = vertical ? 'AUMENTO PARA ESCUADRAR + B.N(3)' : 'AL CORTE';
    texto(lateral, cx0 - 10, cy, 10, 90, 'texto', (yc1 - yc0) * 0.85);
    texto(lateral, cx1 + 10, cy, 10, 90, 'texto', (yc1 - yc0) * 0.85);
    // Dentro del cuerpo: letra (o nombres de los paños), OF y, si hay empate, el aviso de aumento,
    // en un bloque centrado.
    // Las líneas se apilan según su altura ya ajustada al ancho `max`.
    const bloque = (xm, ym, lineas, max) => {
      const alturas = lineas.map(([valor, h]) => ajustar(valor, h, max));
      const total = alturas.reduce((s, h) => s + h * 1.7, 0);
      let y = ym + total / 2;
      lineas.forEach(([valor], k) => {
        y -= alturas[k] * 0.85;
        T.push({ capa: 'texto', x: xm, y, h: alturas[k], valor, giro: 0, centrado: true });   // ya ajustada
        y -= alturas[k] * 0.85;
      });
    };
    if (empateH) {
      // Paños de abajo arriba: A1 junto a la bamba; cada unión con sus cm de empate.
      let y = yc0;
      cuerpos.forEach((p, k) => {
        const alto = p.alto / 10;
        const centro = y + alto / 2;
        if (k === 0) bloque(cx, centro, [[p.nombre, 15], [t.of, 30], ['TIENE AUMENTO PARA ESCUADRAR', 12]], F * 0.8);
        else texto(p.nombre, cx, centro, 15);
        if (k < cuerpos.length - 1) {
          const yu = y + alto;
          linea('ejes', fx0, yu - A.empateCm, fx1, yu - A.empateCm);
          linea('ejes', fx0, yu, fx1, yu);
          // Debajo de la unión, en el paño de ancho de rollo: el de arriba puede ser una tira estrecha
          // donde ya va su letra.
          texto(`EMPATE ${A.empateCm} CM`, cx, yu - A.empateCm - 8, 10, 0, 'texto', F * 0.8);
          y = yu - A.empateCm;
        }
      });
    } else if (vertical) {
      let xp = cx0;
      cuerpos.forEach((p, k) => {
        const anchoP = p.largo / 10;
        if (k === 0) bloque(xp + anchoP / 2, cy, [[p.nombre, 15], [t.of, 30], ['TIENE AUMENTO PARA ESCUADRAR', 12]], anchoP * 0.75);
        else texto(p.nombre, xp + anchoP / 2, cy, 15);
        if (k < cuerpos.length - 1) {
          const xu = xp + anchoP;
          linea('ejes', xu - A.empateCm, yc0, xu - A.empateCm, yc1);
          linea('ejes', xu, yc0, xu, yc1);
          texto('EMPATE VERTICAL', xu + 8, cy, 10, 90, 'texto', (yc1 - yc0) * 0.8);
          xp = xu - A.empateCm;
        }
      });
    } else {
      bloque(cx, cy, [[t.letra, 15], [t.of, 30]], F * 0.8);
    }
    // Cotas: impresas las de la pieza terminada; las de corte en la capa que no se imprime, solo si
    // cambian (Iván: medidas reales, sin repetir).
    cota('cotas', fx0, yc1 + 30, fx1, yc1 + 30, F, 0);
    if (anchoCorte !== F) cota('vent-pre-noimpr', cx0, yc1 + 50, cx1, yc1 + 50, anchoCorte, 0);
    cota('cotas', xDer - 15, yc0 + 3.5, xDer - 15, yc1 - 3.5, yc1 - yc0 - 7, 15);
    cota('vent-pre-noimpr', xIzq + 15, yc0, xIzq + 15, yc1, yc1 - yc0, -15);
    x += ancho + ENTRE_TOLDOS;
  }
  const toldos = { x0: -60, y0: -30, x1: x - ENTRE_TOLDOS + 60, y1: Math.max(...T.map((t) => t.y)) + 20 };

  // Corte en el rollo, debajo, a tamaño real: lo mismo que va al DXF de corte. Sus entidades se dan
  // aparte (`corte`): la hoja puede ponerlo girado si así se ve más grande (Iván).
  const desde = { L: L.length, P: P.length, T: T.length };
  const anchoRollo = datos.toldos[0].anchoRollo;
  // Con sacos de stock en la lona que sobra (Iván): van en el corte del plano y en el DXF.
  const colocadas = [...corteRollo.colocadas];
  const sacosStock = colocadas.filter((p) => p.saco);
  // Orillo de abajo del rollo, lejos de los toldos: la ventana del toldo es más alta que su dibujo
  // cuando hay varios toldos, y a 2 m se colaba el corte por abajo.
  let yRollo = -3000 - anchoRollo;
  const metros = mm => (mm / 1000).toLocaleString('es-ES', { maximumFractionDigits: 3 });
  for (const [i, opcion] of [corteRollo, trozoSeparado].filter(Boolean).entries()) {
    const corte = dibujo(opcion.colocadas, anchoRollo * 10, { of: '', tela: '' });
    const largoTotal = Math.max(...opcion.colocadas.map(p => p.x + p.ancho)) / 10;
    for (const l of corte.lineas) linea(l.capa, l.x1 / 10, yRollo + l.y1 / 10, l.x2 / 10, yRollo + l.y2 / 10);
    for (const t of [...corte.textos, ...(opcion.textosExtra || [])]) {
      if (t.valor.includes(' · OF ')) continue;
      T.push({ ...t, capa: 'texto', x: t.x / 10, y: yRollo + t.y / 10, h: Math.min(t.h / 10, 15) });
    }
    const titulo = i === 0 ? `OPCIÓN 1 · CON SACOS · ${metros(opcion.largo)} M`
      : `OPCIÓN 2 · TROZO SEPARADO · ${metros(opcion.largo)} M + RESTOS ${metros(opcion.largoRestos)} M`;
    texto(titulo, largoTotal / 2, yRollo + anchoRollo + 85, 14, 0, 'texto', largoTotal * 0.98);
    const usadoOpcion = Math.max(...opcion.colocadas.map(p => p.y + p.hueco)) / 10;
    cota('cotas', -20, yRollo, -20, yRollo + usadoOpcion, usadoOpcion, -10);
    cota('cotas', 0, yRollo - 20, opcion.largo / 10, yRollo - 20, opcion.largo / 10, 0);
    yRollo -= anchoRollo + 160;
  }
  const largoRollo = Math.max(...colocadas.map((p) => p.x + p.ancho)) / 10;
  // Ancho real que ocupan las piezas, no el del rollo (Iván).
  const usado = Math.max(...colocadas.map((p) => p.y + p.hueco)) / 10;
  const puntosCorte = L.slice(desde.L).flatMap(l => [[l.x1, l.y1], [l.x2, l.y2]]);
  for (const t of T.slice(desde.T)) {
    const mitad = anchoArial(t.valor, t.h) / 2;
    puntosCorte.push([t.x - (t.giro ? t.h : mitad), t.y - (t.giro ? mitad : t.h)], [t.x + (t.giro ? t.h : mitad), t.y + (t.giro ? mitad : t.h)]);
  }
  const zonaCorte = { x0: Math.min(...puntosCorte.map(p => p[0])) - 10, x1: Math.max(...puntosCorte.map(p => p[0])) + 10,
    y0: Math.min(...puntosCorte.map(p => p[1])) - 10, y1: Math.max(...puntosCorte.map(p => p[1])) + 10 };

  // A metros y lejos del origen, en diagonal (Iván: no pegado a los ejes X e Y del CAD).
  const m = (v) => v / 100;
  const px = (v) => m(v) + ORIGEN_M, py = (v) => m(v) + ORIGEN_M;
  const zona = (z) => ({ x0: px(z.x0), y0: py(z.y0), x1: px(z.x1), y1: py(z.y1) });
  const convertir = (ls, ps, ts) => ({
    lineas: ls.map((l) => ({ ...l, x1: px(l.x1), y1: py(l.y1), x2: px(l.x2), y2: py(l.y2) })),
    polilineas: ps.map((p) => ({ ...p, puntos: p.puntos.map(([a, b]) => [px(a), py(b)]) })),
    textos: ts.map((t) => ({ ...t, valor: String(t.valor).toUpperCase(), x: px(t.x), y: py(t.y), h: m(t.h) }))
  });
  return {
    capas: CAPAS,
    ...convertir(L.slice(0, desde.L), P.slice(0, desde.P), T.slice(0, desde.T)),
    corte: convertir(L.slice(desde.L), P.slice(desde.P), T.slice(desde.T)),
    zonas: { toldos: zona(toldos), corte: zona(zonaCorte) },
    anchoRollo, usado,
    largoRollo,
    sacos: sacosStock.length
  };
}
