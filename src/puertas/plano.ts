import { escribirDxfPlano } from '../domain/corteLona/presentacion.js';
import { anchoArial, textoSeguro } from '../domain/corteLona/texto.js';
import { esVertical, geometriaAlzado, type CotaAlzado, type FormaAlzado } from './alzado.ts';
import { calcularPuerta, MODELOS_PUERTAS } from './calcular.ts';
import { generarCortePuertas } from './corte.ts';
import { bloqueFlechaEnrollable, dibujarAlzadoEnrollable, escribirPlanoEnrollables, lienzoAMetros, sumarLienzo, type LienzoEnrollable } from './planoEnrollable.ts';
import { esClientePortanova } from './clientePortanova.ts';
import { presentacionPortanova } from './plantillaPortanova.ts';
import type { PedidoPuertas, Punto } from './tipos.ts';

// Plano de puertas para revisar (fase 2): la presentación A4 de la oficina con su cajetín, como toldos y
// remolques (Iván, 22/10/2026: «es una presentación de CAD, como toldos»). Arriba, el alzado de cada puerta
// tal como lo enseña la web (src/puertas/alzado.ts), una al lado de otra, con cotas de verdad; debajo, el
// corte del rollo. Se dibuja en cm y se pasa a metros, lejos del origen, como remolques.

const ORIGEN_M = 100;
const SEPARACION = 60;   // entre puertas
const FILA_CORTE = 80;   // entre cortes, con sitio para sus cotas

type Linea = { capa: string; x1: number; y1: number; x2: number; y2: number };
type Polilinea = { capa: string; puntos: Punto[]; cerrada: boolean };
type Texto = { capa: string; x: number; y: number; h: number; valor: string; giro?: number; centrado?: boolean };
type Arco = { capa: string; x: number; y: number; r: number; desde: number; hasta: number };
type Circulo = { capa: string; x: number; y: number; r: number };
type Cota = { capa: string; estilo: string; x1: number; y1: number; x2: number; y2: number; giro: number; d: number; valor: number };
interface Lienzo { lineas: Linea[]; polilineas: Polilinea[]; textos: Texto[]; arcos: Arco[]; circulos: Circulo[]; cotas: Cota[];
  inserciones: LienzoEnrollable['inserciones']; sombreados: LienzoEnrollable['sombreados'] }
const lienzo = (): Lienzo => ({ lineas: [], polilineas: [], textos: [], arcos: [], circulos: [], cotas: [], inserciones: [], sombreados: [] });

// Cada clase del alzado, en una capa de la plantilla.
const CAPAS: Record<string, string> = {
  'puerta-lona': 'corte', 'puerta-cacho': 'corte', 'puerta-saco': 'corte', 'puerta-saco-pieza': 'corte', 'puerta-varilla': 'corte',
  'puerta-cristal': 'referencias', 'puerta-entrada-alzado': 'referencias', 'puerta-bolsillo': 'referencias',
  'puerta-tubo': 'ejes', 'puerta-guia': 'ejes', 'puerta-cota': 'ejes',
  'puerta-hueco-alzado': 'marca', 'puerta-bolsillo-marca': 'marca', 'puerta-empate': 'marca',
  'puerta-linea-guia': 'texto',
  'puerta-rotulador': 'ROTULADOR',
  'puerta-espaciador-central': 'referencias',
  'puerta-espaciador-central-marca': 'ROTULADOR',
  'puerta-empate-autorreparable': 'referencias',
};
const capa = (clase: string) => CAPAS[clase] ?? 'referencias';

/** Lo que mide de alto una línea de texto en el dibujo (cm), según su clase, como el CSS de la pantalla. */
const altoTexto = (clase: string | undefined, base: number) =>
  clase === 'puerta-cota-texto' ? base * 0.85 : clase === 'puerta-texto-cabecera' ? base * 0.9 : base;

/** Parte un texto largo en líneas de como mucho `max` letras, por palabras. */
function partir(texto: string, max: number): string[] {
  const lineas: string[] = [];
  let linea = '';
  for (const palabra of texto.split(/\s+/).filter(Boolean)) {
    if (linea && linea.length + palabra.length + 1 > max) { lineas.push(linea); linea = palabra; }
    else linea += (linea ? ' ' : '') + palabra;
  }
  if (linea) lineas.push(linea);
  return lineas;
}

/**
 * Pinta el alzado en el lienzo: `X = ox + x`, `Y = −y` (el SVG va con la y hacia abajo). Los textos se anclan
 * como en la pantalla: centrados, o por la izquierda (los de la derecha se corren su ancho).
 */
function pintarAlzado(L: Lienzo, formas: FormaAlzado[], ox: number, base: number) {
  const P = (x: number, y: number): Punto => [ox + x, -y];
  const texto = (valor: string, x: number, y: number, h: number, ancla: 'start' | 'middle' | 'end', giro = 0) => {
    const v = textoSeguro(valor);
    if (!v) return;
    const [X, Y] = P(x, y);
    // En el SVG la y del texto es su base; centrado, se sube a la mitad de la letra.
    if (ancla === 'middle' || giro) L.textos.push({ capa: 'texto', x: X, y: giro ? Y : Y + h / 2, h, valor: v, giro: -giro, centrado: true });
    else L.textos.push({ capa: 'texto', x: ancla === 'end' ? X - anchoArial(v, h) : X, y: Y, h, valor: v });
  };
  for (const f of formas) {
    switch (f.tipo) {
      case 'rect': {
        if (f.ancho <= 0 || f.alto <= 0) break;
        const { x, y, ancho: w, alto: h } = f;
        const r = Math.min(f.radio ?? 0, w / 2, h / 2);
        if (r > 0) {
          // Conserva las esquinas del mismo rectángulo redondeado que se ve en pantalla.
          for (const [a, b] of [
            [[x + r, y], [x + w - r, y]], [[x + w, y + r], [x + w, y + h - r]],
            [[x + w - r, y + h], [x + r, y + h]], [[x, y + h - r], [x, y + r]],
          ] as [Punto, Punto][]) L.lineas.push({ capa: capa(f.clase), ...xy(P(...a), P(...b)) });
          for (const [a, b, desde, hasta] of [[x + r, y + r, 90, 180], [x + w - r, y + r, 0, 90],
            [x + w - r, y + h - r, 270, 360], [x + r, y + h - r, 180, 270]]) {
            const [cx, cy] = P(a, b);
            L.arcos.push({ capa: capa(f.clase), x: cx, y: cy, r, desde, hasta });
          }
          break;
        }
        L.polilineas.push({ capa: capa(f.clase), puntos: [P(x, y), P(x + w, y), P(x + w, y + h), P(x, y + h)], cerrada: true });
        break;
      }
      case 'linea': L.lineas.push({ capa: capa(f.clase), ...xy(P(f.x1, f.y1), P(f.x2, f.y2)) }); break;
      case 'poligono': L.polilineas.push({ capa: capa(f.clase), puntos: f.puntos.map(([x, y]) => P(x, y)), cerrada: true }); break;
      case 'polilinea': L.polilineas.push({ capa: capa(f.clase), puntos: f.puntos.map(([x, y]) => P(x, y)), cerrada: false }); break;
      case 'texto': {
        const h = f.tamano ?? altoTexto(f.clase, base);
        const g = f.taller?.guia;
        if (g) L.lineas.push({ capa: 'texto', ...xy(P(g[0], g[1]), P(g[2], g[3])) });
        f.lineas.forEach((l, i) => texto(l, f.x, f.y + i * h * 1.2, h, f.ancla, f.giro));
        break;
      }
      case 'cota': cota(L, f, P); break;
    }
  }
}

const xy = (a: Punto, b: Punto) => ({ x1: a[0], y1: a[1], x2: b[0], y2: b[1] });

/** Cota editable en CAD. D/T son ayudas del configurador y no se imprimen en el plano de oficina. */
function cota(L: Lienzo, c: CotaAlzado, P: (x: number, y: number) => Punto) {
  const v = esVertical(c);
  const [a, b] = [P(c.x1, c.y1), P(c.x2, c.y2)];
  const d = v ? P(c.linea, 0)[0] : P(0, c.linea)[1];
  const largo = v ? Math.abs(c.y2 - c.y1) : Math.abs(c.x2 - c.x1);
  L.cotas.push({ capa: 'cotas', estilo: c.estilo ?? (largo >= 25 ? 'XERAL' : 'XERAL 5'), ...xy(a, b), giro: v ? 90 : 0, d, valor: c.valor });
}

const cm = (mm: number) => mm / 10;
const metros = (mm: number) => `${(mm / 1000).toLocaleString('es-ES', { maximumFractionDigits: 2 })} M`;
const unicos = (xs: string[]) => [...new Set(xs.map(x => x.trim()).filter(Boolean))];

export function escribirPlanoPuertas({ pedido, cabecera, ofStockSacos }: {
  pedido: PedidoPuertas;
  /** La OF de los sacos de stock: con ella, el corte del plano lleva los mismos sacos que el DXF del bot. */
  ofStockSacos?: string;
  cabecera: { cliente: string; tecnico: string; revisor: string; fecha: string /* AAAA-MM-DD */ };
}): string {
  if (pedido.elementos.length && pedido.elementos.every(e => e.input.modelo === 'PUERTAENR')) {
    return escribirPlanoEnrollables(pedido, generarCortePuertas(pedido, { ofStockSacos }).cortes, cabecera);
  }
  const L = lienzo();
  // Las puertas, una al lado de otra, con la parte de arriba a la misma altura.
  let cursor = 0, arriba = 0, abajo = 0;
  pedido.elementos.forEach(({ input: p }, i) => {
    if (p.modelo === 'PUERTAENR') {
      const d = dibujarAlzadoEnrollable(p, String.fromCharCode(65 + (i % 26)));
      const ox = cursor - d.zona.x0;
      sumarLienzo(L, d.lienzo, ox);
      arriba = Math.max(arriba, d.zona.y1); abajo = Math.min(abajo, d.zona.y0);
      cursor += d.zona.x1 - d.zona.x0 + SEPARACION;
      return;
    }
    const g = geometriaAlzado(p, calcularPuerta(p));
    const ox = cursor - g.vista.xMin;
    pintarAlzado(L, g.formas, ox, g.letraBase);
    const letra = String.fromCharCode(65 + (i % 26));
    const titulo = [`PUERTA ${letra}`, p.of.trim() || 'SIN OF', MODELOS_PUERTAS[p.modelo].toUpperCase(), p.cantidad > 1 ? `X${p.cantidad}` : '']
      .filter(Boolean).join(' · ');
    const yTitulo = -g.vista.yMin + 20;
    L.textos.push({ capa: 'texto', x: ox + g.F / 2, y: yTitulo, h: 12, valor: textoSeguro(titulo), centrado: true });
    arriba = Math.max(arriba, yTitulo + 12);
    let suelo = -(g.vista.yMin + g.vista.alto);
    // Lo que el pedido dice aparte va debajo de su puerta, como en la pantalla.
    const obs = textoSeguro(p.observaciones);
    if (obs) {
      const h = 6;
      const lineas = partir(`OBSERVACIONES: ${obs}`, Math.max(20, Math.floor(g.vista.ancho / (h * 0.62))));
      lineas.forEach((linea, k) => L.textos.push({ capa: 'texto', x: cursor, y: suelo - (k + 1) * h * 1.5, h, valor: linea }));
      suelo -= (lineas.length + 1) * h * 1.5;
    }
    abajo = Math.min(abajo, suelo);
    cursor += g.vista.ancho + SEPARACION;
  });
  const zonaDibujo = { x0: -10, y0: abajo - 10, x1: cursor - SEPARACION + 10, y1: arriba + 10 };

  // Debajo, los cortes a escala (mm → cm), uno encima de otro como en el DXF del bot (el primero abajo).
  const { cortes } = generarCortePuertas(pedido, { ofStockSacos });
  const C = lienzo();
  let techo = zonaDibujo.y0 - 60;
  const altoDe = (c: (typeof cortes)[number]) => Math.max(0,
    ...c.colocadas.map(t => cm(t.y) + (t.girada ? t.pieza.ancho : t.pieza.alto)));
  for (const c of [...cortes].reverse()) {
    const alto = altoDe(c);
    const yc = techo - alto;
    const e = c.entidades;
    for (const l of e.lineas) C.lineas.push({ capa: l.capa, x1: cm(l.x1), y1: yc + cm(l.y1), x2: cm(l.x2), y2: yc + cm(l.y2) });
    // La máquina omite el corte sobre el orillo; el plano debe enseñar ese borde de la pieza.
    for (const t of c.colocadas) {
      const p = t.pieza;
      const P = ([x, y]: Punto): Punto => [cm(t.x) + (t.girada ? p.alto - y : x), cm(t.y) + (t.girada ? x : y)];
      const r = p.radio;
      const lados: [Punto, Punto][] = r > 0 ? [
        [[r, 0], [p.ancho - r, 0]], [[p.ancho, r], [p.ancho, p.alto - r]],
        [[p.ancho - r, p.alto], [r, p.alto]], [[0, p.alto - r], [0, r]],
      ] : p.contorno.map((a, i) => [a, p.contorno[(i + 1) % p.contorno.length]]);
      for (const lado of lados) {
        const [a, b] = lado.map(P);
        if (Math.abs(a[1] - b[1]) < .001 && (Math.abs(a[1]) < .001 || Math.abs(a[1] - cm(c.anchoRollo)) < .001)) {
          C.lineas.push({ capa: 'referencias', x1: a[0], y1: yc + a[1], x2: b[0], y2: yc + b[1] });
        }
      }
    }
    // Los títulos del DXF de máquina están sobre el rollo entero; el plano solo enseña la zona usada.
    for (const t of e.textos.filter(t => t.y <= alto * 10)) C.textos.push({ ...t,
      valor: t.literal ? t.valor.replace(/[\r\n\t\\{}]+/g, ' ').trim() : textoSeguro(t.valor),
      x: cm(t.x), y: yc + cm(t.y), h: cm(t.h), centrado: Boolean(t.centrado) });
    const material = c.colocadas.every(t => t.pieza.clase === 'saco') && /LAC900 NEGRO/i.test(c.material) ? 'SACO 900 GR NEGRO' : c.material;
    C.textos.push({ capa: 'texto', x: 0, y: techo + 14, h: 10,
      valor: textoSeguro(c.opcion === 'principal' ? material : `${material} · ${c.opcion === 'saco-entero' ? 'SACO ENTERO' : 'SACO PARTIDO'} · ALTERNATIVA`) });
    for (const a of e.arcos) C.arcos.push({ ...a, x: cm(a.x), y: yc + cm(a.y), r: cm(a.r) });
    for (const k of e.circulos) C.circulos.push({ ...k, x: cm(k.x), y: yc + cm(k.y), r: cm(k.r) });
    // El largo por debajo y el ancho del rollo a la izquierda (Iván, 20/10/2026, como remolques).
    C.cotas.push(
      { capa: 'cotas', estilo: 'XERAL', x1: 0, y1: yc, x2: cm(c.largo), y2: yc, giro: 0, d: yc - 25, valor: cm(c.largo) },
      { capa: 'cotas', estilo: 'XERAL', x1: 0, y1: yc, x2: 0, y2: yc + alto, giro: 90, d: -25, valor: alto },
    );
    techo = yc - FILA_CORTE;
  }
  if (!cortes.length) C.textos.push({ capa: 'texto', x: 0, y: techo - 20, h: 10, valor: 'SIN CORTE' });
  // La zona del corte cuenta también lo que ocupan los textos y el sitio de las cotas.
  const anchoTexto = (t: Texto) => anchoArial(t.valor, t.h);
  const pts: Punto[] = [
    ...C.lineas.flatMap((l): Punto[] => [[l.x1, l.y1], [l.x2, l.y2]]),
    ...C.textos.flatMap((t): Punto[] => (t.centrado ? [[t.x - anchoTexto(t) / 2, t.y - t.h], [t.x + anchoTexto(t) / 2, t.y + t.h]] : [[t.x, t.y], [t.x + anchoTexto(t), t.y + t.h]])),
    [-25 - 12, techo + FILA_CORTE - 25 - 12],
  ];
  const zonaCorte = {
    x0: Math.min(...pts.map(q => q[0])) - 10, y0: Math.min(...pts.map(q => q[1])) - 10,
    x1: Math.max(...pts.map(q => q[0])) + 10, y1: Math.max(...pts.map(q => q[1])) + 10,
  };

  // A metros, a 100 m del origen.
  const m = (v: number) => ORIGEN_M + v / 100;
  const aM = (G: Lienzo) => lienzoAMetros(G, ORIGEN_M, ORIGEN_M);
  const zona = (z: typeof zonaCorte) => ({ x0: m(z.x0), y0: m(z.y0), x1: m(z.x1), y1: m(z.y1) });
  const plano = { ...aM(L), corte: aM(C), zonas: { toldos: zona(zonaDibujo), corte: zona(zonaCorte) }, corteDerecho: true };

  const puertas = pedido.elementos.map(e => e.input);
  const fecha = (cabecera.fecha ?? '').split('-').reverse().map((x, k) => (k === 2 ? x.slice(2) : x)).join('/');
  const material = unicos(puertas.map(p => `${p.material} ${p.color}`)).join(' / ');
  const tituloCorte = cortes.length === 1
    ? `CORTE · ${cortes[0].material} · ROLLO DE ${cm(cortes[0].anchoRollo).toLocaleString('es-ES')} · ${metros(cortes[0].largo)}`
    : `CORTE · ${cortes.map(c => `${c.material} ${metros(c.largo)}`).join(' + ') || 'SIN CORTE'}`;
  return escribirDxfPlano({ ...plano,
    ...(pedido.elementos.some(e => e.input.modelo === 'PUERTAENR') ? { bloques: [bloqueFlechaEnrollable] } : {}),
    ...(esClientePortanova(pedido, cabecera.cliente) ? { ...presentacionPortanova(pedido, cabecera, plano.zonas), coloresModelo: { corte: 7 } } : {}),
  }, {
    pedido: pedido.orderCode, of: unicos(puertas.map(p => p.of)).join(' / '), cliente: textoSeguro(cabecera.cliente),
    tecnico: textoSeguro(cabecera.tecnico), revisor: textoSeguro(cabecera.revisor), fecha, pagina: '1/1',
    material: textoSeguro(material), subtitulo: 'MEDIDAS EN CM · PUERTA DE LONA', tituloCorte: textoSeguro(tituloCorte),
  }).dxf;
}
