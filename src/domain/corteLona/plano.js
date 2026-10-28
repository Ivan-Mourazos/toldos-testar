// Plano de confección de la lona de PVC de un pedido de fachada, dibujado como los de la oficina
// (docs/dxf-corte-pvc.md, «Dibujo de confección»): cada toldo con su pieza terminada (rosa), corte
// (DISCO1), rotulador (ROTULADOR), anotaciones y cotas; debajo el corte en el rollo.
// Se escribe en metros sobre la presentación A4. La conversión a DWG se hará en la fase 2.
import { AJUSTES_POR_DEFECTO } from './despiece.js';
import { altoTiraCm, bordeOndulado } from './bambalina.js';
import { dibujo } from './dibujoCorte.js';
import { anchoArial } from './texto.js';
import { piezasCortina, REGLAS_CORTINA } from './cortina.js';
import { separacionCorte } from './presentacion.js';

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
const TAMANO_HOJA = 585;    // tamaño de dibujo a partir del cual los textos ya no crecen: más, en otra presentación
const ENTRE_HOJAS = 300;    // cm entre toldos de presentaciones distintas, para que no asome uno en la del otro

export function dibujarPlano(datos, corteRollo, trozoSeparado = null, cristales = []) {
  const L = [], P = [], T = [], Q = [], S = [];   // en cm; se pasan a metros al final (Q: cotas; S: sombreados)
  const linea = (capa, x1, y1, x2, y2) => L.push({ capa, x1, y1, x2, y2 });
  const rect = (capa, x0, y0, x1, y1) => P.push({ capa, puntos: [[x0, y0], [x1, y0], [x1, y1], [x0, y1]], cerrada: true });
  // Cada texto se ajusta a su hueco: si a su altura no cabe en `max` cm, se reduce (Iván: en los
  // toldos pequeños hay que adaptar los textos).
  // La ventana de la hoja amplía más los toldos pequeños: el tamaño base de los textos va con el del
  // dibujo para que en papel se lean parecidos (referencia: un toldo de unos 6,5 × 3,5 m).
  // Una presentación por toldo; los seguidos van juntos solo si se leen bien, como un toldo grande (Iván, 23/10/2026).
  const tamano = (ts) => Math.max((ts.reduce((s, t) => s + t.frenteTela + 30, 0) + ENTRE_TOLDOS * (ts.length - 1)) / 1.82,
    Math.max(...ts.map((t) => t.caidaTela)) + 150);
  const grupos = [];
  for (const t of datos.toldos) {
    const g = grupos.at(-1);
    if (g && tamano([...g, t]) <= TAMANO_HOJA) g.push(t); else grupos.push([t]);
  }
  let escalaTexto = 1;
  const ajustar = (valor, h, max) => (max ? Math.min(h * escalaTexto, max / anchoArial(valor, 1)) : h * escalaTexto);
  const texto = (valor, x, y, h = 10, giro = 0, capa = 'texto', max = 0) => T.push({ capa, x, y, h: ajustar(valor, h, max), valor, giro, centrado: true });
  // Cota de verdad, que se selecciona y se modifica en el CAD (Iván, 20/10/2026), con los estilos de cota
  // de la oficina: XERAL 15 en los toldos grandes y XERAL en el resto. `lado` separa la línea de cota de la
  // pieza; con 0 va sobre los puntos.
  const cota = (capa, x1, y1, x2, y2, valor, lado, estilo = 12 * escalaTexto >= 12.5 ? 'XERAL 15' : 'XERAL') => {
    const vertical = x1 === x2;
    Q.push({ capa, estilo, x1, y1, x2, y2, giro: vertical ? 90 : 0, d: (vertical ? x1 : y1) + lado, valor });
  };

  // Los mininúmeros del corte, del mismo tamaño y en el mismo sitio de cada pieza en el dibujo (Iván, 22/10/2026).
  // Los dos paños de una unión llevan el mismo número; en el dibujo, solapados, caen en el mismo sitio: va una vez.
  const puestos = new Set();
  const mini = (valor, xm, ym, giro = 0) => {
    const clave = `${valor}|${xm.toFixed(3)}|${ym.toFixed(3)}`;
    if (puestos.has(clave)) return;
    puestos.add(clave);
    T.push({ capa: 'ROTULADOR', x: xm, y: ym, h: 1, valor, giro, centrado: true, literal: true });
  };

  let x = 0;
  const hojas = [];
  const cerrarHoja = () => {
    const h = hojas.at(-1);
    if (h) Object.assign(h, { x1: x - ENTRE_TOLDOS, T: T.slice(h.T), Q: Q.slice(h.Q) });
  };

  for (const [i, t] of datos.toldos.entries()) {
    const g = grupos.find((ts) => ts[0] === t);
    if (g) {
      cerrarHoja();
      if (hojas.length) x += ENTRE_HOJAS - ENTRE_TOLDOS;
      escalaTexto = Math.min(1.3, Math.max(0.55, tamano(g) / 450));
      hojas.push({ toldos: g, x0: x, T: T.length, Q: Q.length });
    }
    if (t.solapas) {
      x += alzadoSolapas(t, corteRollo.piezas[i].piezas, x, { linea, rect, P, texto, cota, mini }) + ENTRE_TOLDOS;
      continue;
    }
    if (t.cortina) {
      x += alzadoCortina(t, corteRollo.piezas[i].piezas, x, { linea, rect, texto, cota, mini, S }) + ENTRE_TOLDOS;
      continue;
    }
    const A = { ...AJUSTES_POR_DEFECTO, ...t.ajustes };
    const vertical = A.empate === 'vertical' && t.frenteTela > t.anchoRollo;
    const piezas = corteRollo.piezas[i].piezas;
    const cuerpos = piezas.filter((p) => !p.nombre.includes('BAMBA'));
    const tiraCm = altoTiraCm(t.bamba, A.tiraExtraAltoCm, t.onda);
    const unidades = t.unidades > 1 ? [[`${t.unidades} UDS`, 15]] : [];
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
      // Con onda, el borde de abajo con su forma, como en el corte (bambalina.js), y la bamba hecha desde lo más bajo
      // de la onda: sin bastilla, con su remate, que va aparte.
      const borde = t.onda ? bordeOndulado(t.onda, tiraLargo * 10, (A.tiraExtraLargoCm / 2) * 10).map(([u, v]) => [tx0 + u / 10, v / 10]) : null;
      const fondo = borde ? Math.max(...borde.map(([, v]) => v)) : 0;
      const [h0, h1] = borde ? [0, t.bamba] : [tc - t.bamba / 2, tc + t.bamba / 2];
      if (borde) P.push({ capa: 'DISCO1', puntos: [...borde, [tx1, tiraCm], [tx0, tiraCm]], cerrada: true });
      else rect('DISCO1', tx0, 0, tx1, tiraCm);
      rect('referencias', fx0, h0, fx1, h1);
      linea('ROTULADOR', fx0, tiraCm - A.varillaTiraMm / 10, fx1, tiraCm - A.varillaTiraMm / 10);
      // Tira en trozos (empate vertical): la letra en el primero y sus uniones, como las de los paños.
      const trozos = piezas.filter((q) => q.nombre.includes('BAMBA'));
      const franja = Math.max(0.1, tiraCm - A.varillaTiraMm / 10 - fondo);
      texto(t.letra, trozos.length > 1 ? tx0 + trozos[0].largo / 20 : cx, fondo + franja / 2, Math.min(12, franja * 0.4));
      let xt = tx0;
      trozos.slice(0, -1).forEach((q) => {
        xt += q.largo / 10;
        linea('ejes', xt - A.empateCm, 0, xt - A.empateCm, tiraCm);
        linea('ejes', xt, 0, xt, tiraCm);
        xt -= A.empateCm;
      });
      texto(VARILLA_ABAJO, cx, tiraCm + 10, 10, 0, 'texto', F * 0.9);
      texto(t.onda ? `ONDA ${t.onda} · REMATE APARTE` : 'B.N(2)', cx, -12, 10, 0, 'texto', F * 0.9);
      texto('B.N(2)', tx0 - 10, tc, 10, 90);
      texto('B.N(2)', tx1 + 10, tc, 10, 90);
      cota('cotas', fx1, h0, fx1, h1, t.bamba, xDer - fx1);
      cota('vent-pre-noimpr', tx0, 0, tx0, tiraCm, tiraCm, xIzq - tx0);
    }

    if (t.soloBamba) {
      texto(t.of, cx, tiraCm + 35, 20, 0, 'texto', F * 0.8);
      if (t.unidades > 1) texto(`${t.unidades} UDS`, cx, tiraCm + 65, 15);
      cota('cotas', tx0, tiraCm, tx1, tiraCm, tiraLargo, 90);
      x += ancho + ENTRE_TOLDOS;
      continue;
    }

    rect('DISCO1', cx0, yc0, cx1, yc1);
    rect('referencias', fx0, yc0 + 3.5, fx1, yc1 - 3.5);
    linea('ROTULADOR', fx0, yc1 - A.varillaArribaMm / 10, fx1, yc1 - A.varillaArribaMm / 10);
    // El cuerpo siempre engancha al tubo de carga con la varilla inferior, incluso sin bamba.
    linea('ROTULADOR', fx0, yc0 + A.varillaArribaMm / 10, fx1, yc0 + A.varillaArribaMm / 10);
    texto(t.ajustes?.varillaArriba || (t.cambioTela ? VARILLA_CAMBIO : VARILLA_TOLDO), cx, yc1 + 10, 10, 0, 'texto', F * 0.9);
    texto(VARILLA_ABAJO, cx, yc0 - 10, 10, 0, 'texto', F * 0.9);
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
        if (k === 0) bloque(cx, centro, [[p.nombre, 15], [t.of, 30], ...unidades, ['TIENE AUMENTO PARA ESCUADRAR', 12]], F * 0.8);
        else texto(p.nombre, cx, centro, 15);
        if (k < cuerpos.length - 1) {
          const yu = y + alto;
          for (const xm of [cx0 + 1, cx1 - 1]) { mini(`${t.letra.toLowerCase()}${k + 1}`, xm, yu - 1, 0); mini(`${t.letra.toLowerCase()}${k + 1}`, xm, yu - A.empateCm + 1, 0); }
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
        if (k === 0) bloque(xp + anchoP / 2, cy, [[p.nombre, 15], [t.of, 30], ...unidades, ['TIENE AUMENTO PARA ESCUADRAR', 12]], anchoP * 0.75);
        else texto(p.nombre, xp + anchoP / 2, cy, 15);
        if (k < cuerpos.length - 1) {
          const xu = xp + anchoP;
          for (const ym of [yc0 + 1, yc1 - 1]) { mini(`${t.letra.toLowerCase()}${k + 1}`, xu - 1, ym, 90); mini(`${t.letra.toLowerCase()}${k + 1}`, xu - A.empateCm + 1, ym, 90); }
          linea('ejes', xu - A.empateCm, yc0, xu - A.empateCm, yc1);
          linea('ejes', xu, yc0, xu, yc1);
          texto('EMPATE VERTICAL', xu + 8, cy, 10, 90, 'texto', (yc1 - yc0) * 0.8);
          xp = xu - A.empateCm;
        }
      });
    } else {
      bloque(cx, cy, [[t.letra, 15], [t.of, 30], ...unidades], F * 0.8);
    }
    // Cotas: impresas las de la pieza terminada; las de corte en la capa que no se imprime, solo si
    // cambian (Iván: medidas reales, sin repetir).
    cota('cotas', fx0, yc1 - 3.5, fx1, yc1 - 3.5, F, 33.5);
    if (anchoCorte !== F) cota('vent-pre-noimpr', cx0, yc1, cx1, yc1, anchoCorte, 50);
    cota('cotas', fx1, yc0 + 3.5, fx1, yc1 - 3.5, yc1 - yc0 - 7, xDer - fx1);
    cota('vent-pre-noimpr', cx0, yc0, cx0, yc1, yc1 - yc0, xIzq - cx0);
    x += ancho + ENTRE_TOLDOS;
  }
  cerrarHoja();
  const arriba = (ts, qs) => Math.max(...ts.map((t) => t.y), ...qs.filter((q) => !q.giro).map((q) => q.d + 9)) + 20;
  const toldos = { x0: -60, y0: -30, x1: x - ENTRE_TOLDOS + 60, y1: arriba(T, Q) };
  // El corte, con los textos al tamaño de todo el pedido, como antes de las presentaciones por toldo.
  escalaTexto = Math.min(1.3, Math.max(0.55, tamano(datos.toldos) / 450));

  // Corte en el rollo, debajo, a tamaño real: lo mismo que va al DXF de corte. Sus entidades se dan
  // aparte (`corte`): la hoja puede ponerlo girado si así se ve más grande (Iván).
  const desde = { L: L.length, P: P.length, T: T.length, Q: Q.length };
  const anchoRollo = datos.toldos[0].anchoRollo;
  // Con sacos de stock en la lona que sobra (Iván): van en el corte del plano y en el DXF.
  const colocadas = [...corteRollo.colocadas];
  const sacosStock = colocadas.filter((p) => p.saco);
  // Orillo de abajo del rollo, lejos de los toldos: la ventana del toldo es más alta que su dibujo
  // cuando hay varios toldos, y a 2 m se colaba el corte por abajo.
  let yRollo = -3000 - anchoRollo;
  const metros = mm => (mm / 1000).toLocaleString('es-ES', { maximumFractionDigits: 3 });
  // El cristal de las cortinas, en su rollo, debajo del corte de la lona (como AR2605080).
  const rollos = [corteRollo, trozoSeparado].filter(Boolean).map((opcion) => ({ opcion, anchoRollo }));
  rollos.push(...cristales.map((c) => ({ opcion: c.corte, anchoRollo: c.anchoRollo / 10, titulo: `CRISTAL · ${c.material}` })));
  const tramosRollo = [];   // lo de cada rollo en L, T y Q: cada uno va en su ventana de la hoja
  for (const [i, { opcion, anchoRollo, titulo: tituloCristal }] of rollos.entries()) {
    tramosRollo.push({ L: L.length, T: T.length, Q: Q.length });
    // El corte del bot tal cual (flujo del DWG, 25/10/2026): lo que hay en el recuadro CORTE es lo que se manda, con su
    // rótulo de tela y OF, los restos y, si hay dos opciones, el «ELEGIR SOLO UNA». Sin él (pruebas), el de las piezas.
    const corte = opcion.dibujo ?? { ...dibujo(opcion.colocadas, anchoRollo * 10, { of: '', tela: '' }), textos: [] };
    const largoTotal = Math.max(...opcion.colocadas.map(p => p.x + p.ancho)) / 10;
    const textosCorte = opcion.dibujo ? [...corte.textos] : [...dibujo(opcion.colocadas, anchoRollo * 10, { of: '', tela: '' }).textos.filter((t) => !t.valor.includes(' · OF ')), ...(opcion.textosExtra || [])];
    let altoTitulo = anchoRollo + 85;
    if (trozoSeparado && !tituloCristal && opcion.dibujo) {
      // Como lo apila el DXF del bot (opcionesArchivo.js): encima de todo lo del rollo.
      const alcance = (t) => t.giro ? anchoArial(t.valor, t.h) : t.h;
      const techo = Math.max(anchoRollo * 10, ...corte.lineas.flatMap(l => [l.y1, l.y2]), ...corte.textos.map(t => t.y + alcance(t)));
      textosCorte.push({ capa: 'texto', x: 0, y: techo + 250, h: 150,
        valor: `${String(opcion.material ?? '').toUpperCase()} · OPCIÓN ${i + 1} · ${i === 0 ? 'CON SACOS' : 'TROZO SEPARADO'} · ELEGIR SOLO UNA` });
      // El título del plano, por encima de ese rótulo.
      altoTitulo = Math.max(altoTitulo, (techo + 400) / 10 + 30);
    }
    // Lo que sube el título, más hueco con el rollo de encima: el mismo aire hasta su cota que sin rótulo.
    yRollo -= altoTitulo - (anchoRollo + 85);
    for (const l of corte.lineas) linea(l.capa, l.x1 / 10, yRollo + l.y1 / 10, l.x2 / 10, yRollo + l.y2 / 10);
    for (const t of textosCorte) {
      // Los números de unión van en ROTULADOR y de 1 cm, como en el DXF del bot. Los rótulos, del tamaño del bot,
      // que ya los ajusta a su pieza (Iván, 24/10/2026: más grandes).
      T.push({ ...t, capa: t.capa === 'ROTULADOR' ? 'ROTULADOR' : 'texto', x: t.x / 10, y: yRollo + t.y / 10, h: t.h / 10 });
    }
    // Solo se habla de opciones cuando hay dos; "con sacos" solo si de verdad lleva sacos.
    const conSacos = sacosStock.length ? ' · CON SACOS' : '';
    const titulo = tituloCristal ? `${tituloCristal} · ${metros(opcion.largo)} M`
      : !trozoSeparado ? `CORTE${conSacos} · ${metros(opcion.largo)} M`
      : i === 0 ? `OPCIÓN 1${conSacos || ' · TODO SEGUIDO'} · ${metros(opcion.largo)} M`
        : `OPCIÓN 2 · TROZO SEPARADO · ${metros(opcion.largo)} M + RESTOS ${metros(opcion.largoRestos)} M`;
    // En «cotas»: se imprime, pero no va al bot.
    texto(titulo, largoTotal / 2, yRollo + altoTitulo, 14, 0, 'cotas', largoTotal * 0.98);
    const usadoOpcion = Math.max(...opcion.colocadas.map(p => p.y + p.hueco)) / 10;
    // Agarrada a la columna de la pieza que llega más arriba, para medir bordes de verdad.
    const alta = opcion.colocadas.reduce((p, q) => (q.y + q.hueco > p.y + p.hueco ? q : p)).x / 10;
    // Cotas del corte grandes, que se lean al imprimir (Iván, 22/10/2026, como en las puertas).
    cota('cotas', alta, yRollo, alta, yRollo + usadoOpcion, usadoOpcion, -30 - alta, 'XERA 20');
    cota('cotas', 0, yRollo, opcion.largo / 10, yRollo, opcion.largo / 10, -25, 'XERA 20');
    yRollo -= anchoRollo + 280;
  }
  const largoRollo = Math.max(...colocadas.map((p) => p.x + p.ancho)) / 10;
  // Ancho real que ocupan las piezas, no el del rollo (Iván).
  const usado = Math.max(...colocadas.map((p) => p.y + p.hueco)) / 10;
  const caja = (ls, ts, qs) => {
    const puntos = ls.flatMap(l => [[l.x1, l.y1], [l.x2, l.y2]]);
    for (const t of ts) {
      const mitad = anchoArial(t.valor, t.h) / 2;
      puntos.push([t.x - (t.giro ? t.h : mitad), t.y - (t.giro ? mitad : t.h)], [t.x + (t.giro ? t.h : mitad), t.y + (t.giro ? mitad : t.h)]);
    }
    // Las cotas del corte, con el sitio de su texto a los dos lados de la línea.
    for (const q of qs) puntos.push(...(q.giro ? [[q.d - 16, q.y1], [q.d + 16, q.y2]] : [[q.x1, q.d - 16], [q.x2, q.d + 16]]));
    return { x0: Math.min(...puntos.map(p => p[0])) - 10, x1: Math.max(...puntos.map(p => p[0])) + 10,
      y0: Math.min(...puntos.map(p => p[1])) - 10, y1: Math.max(...puntos.map(p => p[1])) + 10 };
  };
  const zonaCorte = caja(L.slice(desde.L), T.slice(desde.T), Q.slice(desde.Q));
  const zonasRollo = tramosRollo.map((a, i) => {
    const b = tramosRollo[i + 1] ?? { L: L.length, T: T.length, Q: Q.length };
    return caja(L.slice(a.L, b.L), T.slice(a.T, b.T), Q.slice(a.Q, b.Q));
  });

  // A metros y lejos del origen, en diagonal (Iván: no pegado a los ejes X e Y del CAD).
  const m = (v) => v / 100;
  const px = (v) => m(v) + ORIGEN_M, py = (v) => m(v) + ORIGEN_M;
  const zona = (z) => ({ x0: px(z.x0), y0: py(z.y0), x1: px(z.x1), y1: py(z.y1) });
  // El corte, a la derecha del toldo y alineado arriba, con los recuadros pegados: al abrir el DWG está todo ordenado.
  const enM = (z) => ({ x0: z.x0 / 100, x1: z.x1 / 100, y0: z.y0 / 100, y1: z.y1 / 100 });
  const [dx, dy] = [toldos.x1 + separacionCorte(enM(toldos), enM(zonaCorte)) * 100 - zonaCorte.x0, toldos.y1 - zonaCorte.y1];
  const convertir = (ls, ps, ts, qs, ox = 0, oy = 0) => ({
    lineas: ls.map((l) => ({ ...l, x1: px(l.x1 + ox), y1: py(l.y1 + oy), x2: px(l.x2 + ox), y2: py(l.y2 + oy) })),
    polilineas: ps.map((p) => ({ ...p, puntos: p.puntos.map(([a, b]) => [px(a + ox), py(b + oy)]) })),
    textos: ts.map((t) => ({ ...t, valor: t.literal ? String(t.valor) : String(t.valor).toUpperCase(), x: px(t.x + ox), y: py(t.y + oy), h: m(t.h) })),
    cotas: qs.map((q) => ({ ...q, x1: px(q.x1 + ox), y1: py(q.y1 + oy), x2: px(q.x2 + ox), y2: py(q.y2 + oy), d: q.giro ? px(q.d + ox) : py(q.d + oy) }))
  });
  return {
    capas: CAPAS,
    ...convertir(L.slice(0, desde.L), P.slice(0, desde.P), T.slice(0, desde.T), Q.slice(0, desde.Q)),
    sombreados: S.map((s) => ({ ...s, puntos: s.puntos.map(([a, b]) => [px(a), py(b)]) })),
    corte: convertir(L.slice(desde.L), P.slice(desde.P), T.slice(desde.T), Q.slice(desde.Q), dx, dy),
    zonas: { toldos: zona(toldos), corte: zona({ x0: zonaCorte.x0 + dx, x1: zonaCorte.x1 + dx, y0: zonaCorte.y0 + dy, y1: zonaCorte.y1 + dy }),
      cortes: zonasRollo.map((z) => zona({ x0: z.x0 + dx, x1: z.x1 + dx, y0: z.y0 + dy, y1: z.y1 + dy })) },
    // Cada presentación con su nombre («TOLDO A», «TOLDOS C, D + E») y sus OF en el cajetín; el corte, en todas.
    hojas: hojas.map((h, i) => {
      const letras = [...new Set(h.toldos.map((t) => t.letra))];
      const tipo = h.toldos.every((t) => t.solapas) ? 'SOLAPA' : h.toldos.every((t) => t.cortina) ? 'CORTINA' : 'TOLDO';
      return {
        nombre: letras.length === 1 ? `${tipo} ${letras[0]}` : `${tipo}S ${letras.slice(0, -1).join(', ')} + ${letras.at(-1)}`,
        zona: zona({ x0: h.x0 - 60, x1: h.x1 + 60, y0: -30, y1: arriba(h.T, h.Q) }),
        cajetin: { OF: [...new Set(h.toldos.map((t) => t.of))].join(' / '), HOJA: `${i + 1}/${hojas.length}` }
      };
    }),
    anchoRollo, usado,
    largoRollo,
    sacos: sacosStock.length
  };
}

/**
 * Alzado de una cortina como los ejemplos base de Iván (22/10/2026): corte (DISCO1), terminado (rosa),
 * rotulador y sus textos; con ventana, las bandas, los laterales y el cristal despiezados; la bamba debajo.
 * Las cotas impresas son las terminadas; las de corte van en la capa que no se imprime. Devuelve su ancho.
 */
function alzadoCortina(t, piezas, x0, { linea, rect, texto, cota, mini, S }) {
  const R = REGLAS_CORTINA, c = t.cortina, F = t.frenteTela;
  const W = F + 2 * R.bastillaLado, et = c.abajo === 'ET';
  const [cx0, cx1] = [x0, x0 + W], [fx0, fx1] = [x0 + R.bastillaLado, x0 + W - R.bastillaLado], cx = x0 + W / 2;
  const [xDer, xIzq] = [cx1 + 35, cx0 - 35];
  const n = (v) => Math.round(v * 10) / 10;
  const bamba = piezas.find((p) => p.nombre.includes('BAMBA'));
  const altoBamba = bamba ? bamba.alto / 10 : 0;
  if (bamba) {
    const union = et ? R.bambaUnionEt : R.bambaUnionVarilla;
    const terminada = altoBamba - union - R.bambaBastilla;
    rect('DISCO1', cx0, 0, cx1, altoBamba);
    rect('referencias', fx0, R.bambaBastilla, fx1, R.bambaBastilla + terminada);
    linea('ROTULADOR', fx0, altoBamba - union - R.marcaVarilla, fx1, altoBamba - union - R.marcaVarilla);
    texto(t.letra, cx, R.bambaBastilla + (terminada - R.marcaVarilla) / 2, 15);
    texto('B.N(3)', cx, -12, 10, 0, 'texto', F * 0.9);
    for (const xl of [cx0 - 10, cx1 + 10]) texto('B.N(4)', xl, altoBamba / 2, 10, 90);
    cota('cotas', fx1, R.bambaBastilla, fx1, R.bambaBastilla + terminada, n(terminada), xDer - fx1);
    cota('vent-pre-noimpr', cx0, 0, cx0, altoBamba, n(altoBamba), xIzq - cx0);
    if (t.soloBamba) {
      texto(t.of, cx, altoBamba + 35, 20, 0, 'texto', F * 0.8);
      cota('cotas', cx0, altoBamba, cx1, altoBamba, W, 90);
      return W;
    }
    if (!et) texto(VARILLA_ABAJO, cx, altoBamba + 10, 10, 0, 'texto', F * 0.9);
  }

  // Cuerpo: arriba la varilla negra (o blanca / B.N.(4,5) en cambio de tela); abajo la varilla blanca o la E.T. Ø40.
  const remachado = c.arriba === 'REMACHADO';
  const arriba = remachado ? R.bastillaRemachado : R.varillaArriba;
  const abajo = et ? R.et : R.varillaAbajo;
  const yc0 = altoBamba ? altoBamba + HUECO_TIRA : 0;
  const yc1 = yc0 + t.caidaTela - (t.bamba > 0 ? t.bamba + 5 : 0);
  const [yf0, yf1] = [yc0 + abajo, yc1 - arriba];
  rect('DISCO1', cx0, yc0, cx1, yc1);
  rect('referencias', fx0, yf0, fx1, yf1);
  if (!remachado) linea('ROTULADOR', fx0, yf1 - R.marcaVarilla, fx1, yf1 - R.marcaVarilla);
  linea('ROTULADOR', fx0, yf0 + (et ? R.marcaEt : R.marcaVarilla), fx1, yf0 + (et ? R.marcaEt : R.marcaVarilla));
  texto(remachado ? 'REMACHADO · B.N.(4,5)' : c.cambio ? VARILLA_ABAJO : VARILLA_TOLDO, cx, yc1 + 10, 10, 0, 'texto', F * 0.9);
  if (et) {
    linea('ejes', cx0, yc0 + R.referenciaEt, cx1, yc0 + R.referenciaEt);
    texto('E.T%%C40', cx, yc0 - 10, 10, 0, 'texto', F * 0.9);
    texto(`MARCAR ${R.referenciaEt} CM POR EL DERECHO (MEDIDA LONA CORTADA) Y SOLDAR`, cx, yc0 - 24, 7.5, 0, 'texto', W);
  } else texto(VARILLA_ABAJO, cx, yc0 - 10, 10, 0, 'texto', F * 0.9);

  const cuerpos = piezas.filter((p) => !p.nombre.includes('BAMBA'));
  const empate = !c.ventana && cuerpos.length > 1;
  const etiquetaVelcro = c.etiquetaVelcro || 'VELCRO SUAVE (5) BLANCO POR DERECHO';
  const lateral = empate ? 'AL CORTE' : c.laterales === 'VELCRO'
    ? `B.N(4) · ${etiquetaVelcro}${c.alturaVelcro ? ` HASTA ${n(c.alturaVelcro)}` : ''}` : 'B.N(4)';
  for (const xl of [cx0 - 10, cx1 + 10]) texto(lateral, xl, (yc0 + yc1) / 2, 10, 90, 'texto', (yc1 - yc0) * 0.85);
  // El velcro dibujado en cada lateral, pegado por dentro a la raya rosa del terminado y desde abajo hasta su alto;
  // rayado el suave y relleno el bravo, como en la plantilla de puertas (Iván, 27/10/2026).
  if (!empate && c.laterales === 'VELCRO') {
    const ancho = c.velcro?.ancho ?? 5;
    const yv1 = Math.min(yf1, c.alturaVelcro ? yf0 + c.alturaVelcro : yf1);
    for (const xv of [fx0, fx1 - ancho]) {
      const puntos = [[xv, yf0], [xv + ancho, yf0], [xv + ancho, yv1], [xv, yv1]];
      rect('referencia-1', xv, yf0, xv + ancho, yv1);
      S.push({ capa: 'referencia-1', puntos, solido: !!c.velcro?.bravo });
    }
  }
  const unidades = t.unidades > 1 ? [`${t.unidades} UDS`] : [];
  // Uniones de una pieza (mm desde su esquina de abajo a la izquierda) puestas en el alzado.
  const uniones = (p, ox, oy) => (p.uniones ?? []).forEach((u) => mini(u.valor, ox + u.u / 10, oy + u.v / 10));
  const rotulos = (lineas, xm, ym, h) => lineas.forEach((v, k) => texto(v, xm, ym + ((lineas.length - 1) / 2 - k) * h * 1.7, h, 0, 'texto', F * 0.8));

  if (c.ventana) {
    const { alto: V, esquina: e, desdeAbajo: D } = c.ventana;
    const [yh0, yh1] = [yf0 + D, yf0 + D + V];
    const s = R.solapeCristal, lado = e + R.bastillaLado;
    // Las bandas se cortan en el borde del hueco; los laterales y el cristal solapan 2 en ellas.
    linea('DISCO1', cx0, yh0, cx1, yh0);
    linea('DISCO1', cx0, yh1, cx1, yh1);
    rect('DISCO1', cx0, yh0 - s, cx0 + lado, yh1 + s);
    rect('DISCO1', cx1 - lado, yh0 - s, cx1, yh1 + s);
    const [gx0, gx1] = [fx0 + e - s, fx1 - e + s];
    rect('ejes', gx0, yh0 - s, gx1, yh1 + s);
    const tramos = piezasCortina(t).cristal;
    let xt = gx0;
    tramos.slice(0, -1).forEach((p) => {
      xt += p.largo / 10;
      linea('ejes', xt - R.empate, yh0 - s, xt - R.empate, yh1 + s);
      linea('ejes', xt, yh0 - s, xt, yh1 + s);
      texto(`EMPATE ${R.empate} CM`, xt + 8, (yh0 + yh1) / 2, 10, 90, 'texto', V * 0.85);
      xt -= R.empate;
    });
    const [a1, a2, a3, a4] = cuerpos;
    uniones(a1, cx0, yc0); uniones(a2, cx0, yh1); uniones(a3, cx0, yh0 - s); uniones(a4, cx1 - lado, yh0 - s);
    // Como el alzado a mano de AR2605193 (Iván, 23/10/2026): las bandas solo con su nombre y en el cristal cuántas
    // cortinas iguales son, en grande; la OF va en el cajetín.
    texto(a2.nombre, cx, (yh1 + yf1) / 2, 15);
    texto(a1.nombre, cx, (yf0 + yh0) / 2, 15);
    texto(a3.nombre, cx0 + lado / 2, (yh0 + yh1) / 2, 8, 90);
    texto(a4.nombre, cx1 - lado / 2, (yh0 + yh1) / 2, 8, 90);
    texto(`X${t.unidades ?? 1}`, cx, (yh0 + yh1) / 2, 25, 0, 'texto', (gx1 - gx0) * 0.8);
    // Impresas: frente, alto y cadena de la derecha; los laterales de la ventana.
    cota('cotas', fx1, yh1, fx1, yf1, n(yf1 - yh1), xDer - fx1);
    cota('cotas', fx1 - e, yh0, fx1 - e, yh1, n(V), xDer - fx1 + e);
    cota('cotas', fx1, yf0, fx1, yh0, n(D), xDer - fx1);
    cota('cotas', fx0, yh1, fx0 + e, yh1, n(e), 25);
    cota('cotas', fx1 - e, yh1, fx1, yh1, n(e), 25);
    // De corte: las bandas y el cristal.
    cota('vent-pre-noimpr', cx0, yh1, cx0, yc1, n(yc1 - yh1), xIzq + 15 - cx0);
    cota('vent-pre-noimpr', cx0, yc0, cx0, yh0, n(yh0 - yc0), xIzq + 15 - cx0);
    cota('vent-pre-noimpr', gx0, yh0 - s, gx1, yh0 - s, n(gx1 - gx0), 12 + s);
  } else if (empate) {
    // Paño de abajo del ancho del rollo y el resto arriba (Q-CP02), con el empate y el aumento para escuadrar.
    let y = yc0;
    cuerpos.forEach((p, k) => {
      const alto = p.alto / 10;
      uniones(p, cx0, y);
      if (k === 0) rotulos([p.nombre, t.of, ...unidades, 'TIENE AUMENTO PARA ESCUADRAR'], cx, y + alto / 2, 15);
      else texto(p.nombre, cx, y + alto / 2, 15);
      if (k < cuerpos.length - 1) {
        const yu = y + alto;
        linea('ejes', cx0, yu - R.empate, cx1, yu - R.empate);
        linea('ejes', cx0, yu, cx1, yu);
        texto(`EMPATE EN HORIZONTAL · ${R.empate} CM`, cx, yu - R.empate - 8, 10, 0, 'texto', F * 0.8);
        y = yu - R.empate;
      }
    });
  } else rotulos([t.letra, t.of, ...unidades], cx, (yc0 + yc1) / 2, 15);

  cota('cotas', fx0, yf1, fx1, yf1, n(F), yc1 + 30 - yf1);
  cota('vent-pre-noimpr', cx0, yc1, cx1, yc1, n(W), 50);
  cota('cotas', fx1, yf0, fx1, yf1, n(yf1 - yf0), xDer + 15 - fx1);
  cota('vent-pre-noimpr', cx0, yc0, cx0, yc1, n(yc1 - yc0), xIzq - cx0);
  return W;
}

/**
 * Alzado de un grupo de solapas con velcro (como AR2604205 y AR2604890): cada solapa en vertical con sus
 * medidas al corte y sus etiquetas de velcro en los lados largos. El empate, solo en la que el corte parte: las
 * rectas, aunque pasen del ancho del rollo, van acostadas y enteras (Iván, 27/10/2026).
 */
function alzadoSolapas(t, piezas, x0, { linea, rect, P, texto, cota }) {
  const GAP = 70;
  const n = (v) => Math.round(v * 10) / 10;
  let sx = x0;
  for (const [k, s] of t.solapas.entries()) {
    const L = n(s.largo);
    const wTop = n(s.anchoIzq);
    const wBot = n(s.anchoDer);
    const wMax = Math.max(wTop, wBot);
    const cx = sx + wMax / 2;
    if (wTop === wBot) {
      rect('DISCO1', sx, 0, sx + wTop, L);
    } else {
      P.push({ capa: 'DISCO1', puntos: [[sx, 0], [sx + wBot, 0], [sx + wTop, L], [sx, L]], cerrada: true });
    }
    texto('AL CORTE', cx, L + 8, 7, 0, 'texto', Math.max(25, wMax * 0.9));
    texto('AL CORTE', cx, -8, 7, 0, 'texto', Math.max(25, wMax * 0.9));
    texto(s.etiquetaIzq, sx - 8, L / 2, 7.5, 90, 'texto', L * 0.85);
    texto(s.etiquetaDer, sx + wMax + 8, L / 2, 7.5, 90, 'texto', L * 0.85);
    if (piezas.filter((p) => p.solapaNombre === s.nombre).length > 1) {
      const yEmp = t.anchoRollo;
      const wAt = (y) => wBot + ((wTop - wBot) * y) / L;
      linea('ejes', sx, yEmp - 2, sx + wAt(yEmp - 2), yEmp - 2);
      linea('ejes', sx, yEmp, sx + wAt(yEmp), yEmp);
      texto('EMPATE 2 CM', sx + wAt(yEmp - 1) / 2, yEmp - 8, 7, 0, 'texto', Math.max(20, wAt(yEmp) * 0.8));
      texto(`${s.nombre}1`, sx + wAt(yEmp / 2) / 2, yEmp / 2, 12, 0, 'texto', Math.max(15, wAt(yEmp / 2) * 0.7));
      texto(`${s.nombre}2`, sx + wAt((yEmp + L) / 2) / 2, (yEmp + L) / 2, 10, 0, 'texto', Math.max(15, wAt((yEmp + L) / 2) * 0.7));
    } else texto(s.nombre, sx + (wTop + wBot) / 4, L / 2, 12, 0, 'texto', Math.max(15, Math.min(wTop, wBot) * 0.7));
    if (k === 0 && t.of) texto(t.of, cx, L + 40, 14, 0, 'texto', Math.max(40, wMax));
    cota('cotas', sx, L, sx + wTop, L, wTop, 22);
    if (wBot !== wTop) cota('cotas', sx, 0, sx + wBot, 0, wBot, -22);
    cota('cotas', sx, 0, sx, L, L, -24);
    sx += wMax + GAP;
  }
  return Math.max(40, sx - x0 - GAP);
}
