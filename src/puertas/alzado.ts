import { alturasTubos } from './calcular.ts';
import { colocarTextosPuerta } from './textosPlano.ts';
import type { Puerta, Punto, ResultadoPuerta } from './tipos.ts';

// El alzado de una puerta como dibujo puro, en cm y con la y hacia abajo (como el SVG): lo pinta la pantalla
// (AlzadoPuerta.tsx) y lo pasa al plano DWG src/puertas/plano.ts, así lo que se revisa en la web es lo que
// sale en el plano. El orden de las formas es el de pintado.

export interface RectAlzado { tipo: 'rect'; clase: string; x: number; y: number; ancho: number; alto: number; radio?: number }
export interface LineaAlzado { tipo: 'linea'; clase: string; x1: number; y1: number; x2: number; y2: number; trazos?: string }
export interface PoligonoAlzado { tipo: 'poligono'; clase: string; puntos: Punto[] }
export interface PolilineaAlzado { tipo: 'polilinea'; clase: string; puntos: Punto[] }
export interface TextoAlzado {
  tipo: 'texto';
  clase?: string;
  x: number;
  y: number;
  lineas: string[];
  ancla: 'start' | 'middle' | 'end';
  /** Solo los textos de taller lo llevan (los demás, la letra del CSS). */
  tamano?: number;
  /** Grados como en el SVG (−90: se lee de abajo arriba). */
  giro?: number;
  /** Texto de taller: va en su grupo, con su línea guía si está fuera de la puerta. */
  taller?: { guia: [number, number, number, number] | null };
}
/**
 * Una cota: de (x1, y1) a (x2, y2) es lo medido; `linea` es la x de la línea de cota si es vertical o su y si
 * es horizontal; `marcas`, medio largo de las rayitas de los extremos (0 si no lleva). `prefijo` (D, T) y
 * `sufijo` (« cm») solo se escriben; el número es `valor`.
 */
export interface CotaAlzado {
  tipo: 'cota';
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  linea: number;
  valor: number;
  prefijo?: string;
  sufijo?: string;
  marcas: number;
  texto: { x: number; y: number; ancla: 'start' | 'middle' | 'end'; giro?: number; clase?: string };
}
export type FormaAlzado = RectAlzado | LineaAlzado | PoligonoAlzado | PolilineaAlzado | TextoAlzado | CotaAlzado;

export interface GeometriaAlzado {
  formas: FormaAlzado[];
  vista: { xMin: number; yMin: number; ancho: number; alto: number };
  /** La letra base del dibujo (cm), la que usa el CSS para los textos sin tamaño. */
  letraBase: number;
  /** Frente y alto con que se ha dibujado (400 si faltan). */
  F: number;
  H: number;
}

export const numAlzado = (x: number) => x.toLocaleString('es-ES', { maximumFractionDigits: 2 });

/** Lo que se lee en una cota: «D 60», «172 cm», «7,5». */
export const textoCota = (c: CotaAlzado) => `${c.prefijo ? `${c.prefijo} ` : ''}${numAlzado(c.valor)}${c.sufijo ?? ''}`;

export const esVertical = (c: Pick<CotaAlzado, 'x1' | 'x2' | 'y1' | 'y2'>) => Math.abs(c.x1 - c.x2) < 1e-9 && Math.abs(c.y1 - c.y2) > 1e-9;

export function geometriaAlzado(p: Puerta, resultado: ResultadoPuerta): GeometriaAlzado {
  const F = p.frente > 0 ? p.frente : 400;
  const H = p.alto > 0 ? p.alto : 400;
  const enr = p.modelo === 'PUERTAENR';
  const ple = p.modelo === 'PUERTAPLE';
  const auto = p.modelo === 'PUERTAUTO';
  const formas: FormaAlzado[] = [];
  const rect = (clase: string, x: number, y: number, ancho: number, alto: number, radio?: number) =>
    formas.push({ tipo: 'rect', clase, x, y, ancho, alto, ...(radio ? { radio } : {}) });
  const linea = (clase: string, x1: number, y1: number, x2: number, y2: number, trazos?: string) =>
    formas.push({ tipo: 'linea', clase, x1, y1, x2, y2, ...(trazos ? { trazos } : {}) });
  const texto = (valor: string, x: number, y: number, ancla: TextoAlzado['ancla'], clase?: string) =>
    formas.push({ tipo: 'texto', x, y, lineas: [valor], ancla, ...(clase ? { clase } : {}) });
  const cota = (c: Omit<CotaAlzado, 'tipo' | 'texto'> & { texto: Omit<CotaAlzado['texto'], 'clase'> & { clase?: string | null } }) =>
    formas.push({ ...c, tipo: 'cota', texto: { ...c.texto, clase: c.texto.clase === null ? undefined : c.texto.clase ?? 'puerta-cota-texto' } } as CotaAlzado);

  const tubos = ple ? alturasTubos(p) : p.entradas.map(t => t.altura);
  const T = enr && p.enrollable.T > 0 ? p.enrollable.T : 0;
  const D = enr && p.enrollable.D > 7.5 ? p.enrollable.D : 60;
  const m = enr && p.enrollable.margen > 0 ? p.enrollable.margen : 0;
  const hSaco = enr ? 13 : auto ? 14 : p.apilable.saco === 120 ? 12 : 11;

  // Cadena derecha de pasos verticales (suma exactamente H; sin duplicar H).
  const hitosDerecha = ple
    ? [0, ...tubos, H]
    : enr
      ? [...new Set([0, ...tubos, ...(T > 0 ? [H - T - D, H - T] : []), H])]
          .filter(y => y >= 0 && y <= H)
          .sort((a, b) => a - b)
      : [...new Set([0, 14, ...p.autorreparable.empates.map(e => e + 12), H])]
          .filter(y => y >= 0 && y <= H)
          .sort((a, b) => a - b);

  const tuboParteT = enr && T > 0 && tubos.some(y => y > H - T + 0.1 && y < H - 0.1);
  const xCadena = F + 34;
  const xCotaT = F + 64;
  const xAltoTotal = F + (tuboParteT ? 96 : 74);

  // Bandas de entrada de tubo con sus cotas de alto a la izquierda (sin duplicar ejes del ventanal)
  const bandasIzquierda: Array<{ y: number; alto: number }> = enr
    ? [
        ...(T > 0 ? [T, T + D] : []),
        ...tubos.map(altura => H - altura),
      ]
        .filter((y, idx, arr) => y > 0 && y < H && arr.findIndex(v => Math.abs(v - y) < 0.5) === idx)
        .sort((a, b) => a - b)
        .map(y => ({ y, alto: 7.5 }))
    : ple
      ? tubos.map((altura, i) => ({
          y: H - altura,
          alto: p.entradas[i]?.alto || (p.entradas[i]?.diametro === 42 ? 13.5 : 12),
        }))
      : [];

  // Pieza desplegada del saco debajo del alzado
  const yDesplegado = H + 28;
  const hCorteSaco = enr ? 26 : auto ? 32 : p.apilable.doble ? 37 : p.apilable.saco === 120 ? 32 : 30;
  const pestanaSaco = enr ? 6.5 : auto ? 0 : p.apilable.doble ? 12 : 10;
  const altoPestana = enr ? 11 : auto ? 0 : p.apilable.doble ? 14 : p.apilable.saco === 120 ? 14 : 13;
  const wSaco = ple && p.apilable.doble ? Math.max(20, F - 6) : F;

  const textosTaller = colocarTextosPuerta({ ...p, frente: F, alto: H });
  const hayTextoFuera = textosTaller.some(t => t.x < 0);
  const xMin = hayTextoFuera ? -140 : -56;
  const yMin = -62;
  const anchoVista = xAltoTotal + 34 - xMin;
  const altoVista = yDesplegado + hCorteSaco + 46 - yMin;
  const letraBase = Math.min(10.5, Math.max(7.5, Math.min(F / 24, H / 38)));

  // Contorno general de la puerta
  rect('puerta-lona', 0, 0, F, H);

  // Cabecera según modelo
  if (enr || auto) {
    linea('puerta-varilla', 0, 0, F, 0);
    texto('VARILLA NEGRA (4,5)', F / 2, -10, 'middle', 'puerta-texto-cabecera');
  }
  if (ple) {
    rect('puerta-entrada-alzado', 0, 0, F, Math.min(H * 0.2, p.apilable.bolsillo / 2));
    texto(`E.T. Ø30 mm · BOLSILLO SUPERIOR ${numAlzado(p.apilable.bolsillo)}`, F / 2, -10, 'middle', 'puerta-texto-cabecera');
  }

  // Autorreparable: entrada superior con salida de 5,5 cm, cremalleras y espaciador de 10 cm
  if (auto) {
    rect('puerta-entrada-alzado', -5.5, -3.5, F + 11, 21);
    linea('puerta-guia', 0, 0, 0, H);
    linea('puerta-guia', F, 0, F, H);
    linea('puerta-cota', 10, 17.5, 10, H - 14, '4 3');
    linea('puerta-cota', F - 10, 17.5, F - 10, H - 14, '4 3');
    cota({ x1: 0, y1: H * 0.62, x2: 10, y2: H * 0.62, linea: H * 0.62, valor: 10, marcas: 0, texto: { x: 5, y: H * 0.62 - 3, ancla: 'middle' } });
    cota({ x1: -16, y1: -3.5, x2: -16, y2: 17.5, linea: -16, valor: 21, marcas: 4, texto: { x: -22, y: 8, ancla: 'end' } });
  }

  // Ventanal enrollable: cachos laterales acotados y cristal acotado con su ancho de corte
  if (enr && T > 0) {
    rect('puerta-cacho', 0, T + 3.75, m, Math.max(0, D - 7.5));
    rect('puerta-cacho', Math.max(0, F - m), T + 3.75, m, Math.max(0, D - 7.5));
    rect('puerta-cristal', m, T + 3.75, Math.max(0, F - 2 * m), Math.max(0, D - 7.5));
    if (m > 0) {
      cota({ x1: 0, y1: T + D / 2, x2: m, y2: T + D / 2, linea: T + D / 2, valor: m, marcas: 0, texto: { x: -6, y: T + D / 2 + 3, ancla: 'end' } });
      cota({ x1: F - m, y1: T + D / 2, x2: F, y2: T + D / 2, linea: T + D / 2, valor: m, marcas: 0, texto: { x: F + 6, y: T + D / 2 + 3, ancla: 'start' } });
    }
    // El cristal se acota con su ancho de corte (hueco + 4).
    if (F - 2 * m > 12) {
      cota({ x1: m + 2, y1: T + D - 8, x2: F - m - 2, y2: T + D - 8, linea: T + D - 8, valor: F - 2 * m + 4, marcas: 4, texto: { x: F / 2, y: T + D - 11, ancla: 'middle' } });
    }
  }

  // Ventanas individuales en apilable y autorreparable
  if (!enr) {
    for (const v of p.ventanas) {
      const vy = H - v.y - v.alto;
      rect('puerta-cristal', v.x, vy, v.ancho, v.alto, v.radio);
      cota({ x1: v.x, y1: vy + v.alto / 2, x2: v.x + v.ancho, y2: vy + v.alto / 2, linea: vy + v.alto / 2, valor: v.ancho, marcas: 0, texto: { x: v.x + v.ancho / 2, y: vy + v.alto / 2 - 3, ancla: 'middle' } });
      cota({ x1: v.x + v.ancho / 2, y1: vy, x2: v.x + v.ancho / 2, y2: vy + v.alto, linea: v.x + v.ancho / 2, valor: v.alto, marcas: 0, texto: { x: v.x + v.ancho / 2 + 4, y: vy + v.alto / 2 + 10, ancla: 'start' } });
    }
  }

  // Bandas de entrada de tubo (enrollable y apilable) y sus cotas de alto a la izquierda
  for (const b of bandasIzquierda) {
    rect('puerta-entrada-alzado', 0, b.y - b.alto / 2, F, b.alto);
    linea('puerta-tubo', 0, b.y, F, b.y);
    cota({ x1: -12, y1: b.y - b.alto / 2, x2: -12, y2: b.y + b.alto / 2, linea: -12, valor: b.alto, marcas: 4, texto: { x: -18, y: b.y + 3, ancla: 'end' } });
  }

  // Huecos de cutter en las entradas
  if (!auto) {
    p.entradas.forEach((e, i) => {
      const yEje = H - (ple ? tubos[i] ?? e.altura : e.altura);
      const altoE = enr ? 7.5 : e.alto || (e.diametro === 42 ? 13.5 : 12);
      for (const h of e.huecos) rect('puerta-hueco-alzado', h.x - (ple && F > 600 ? 1 : 0), yEje + altoE / 2 - h.y - h.alto, h.ancho, h.alto, h.radio);
    });
  }

  // Saco en el bajo de la puerta terminada y su cota
  rect('puerta-saco', 0, H - hSaco, F, hSaco);
  cota({ x1: F + 12, y1: H - hSaco, x2: F + 12, y2: H, linea: F + 12, valor: hSaco, marcas: 4, texto: { x: F + 18, y: H - hSaco / 2 + 3, ancla: 'start' } });

  // Bolsillo opcional: solo dos esquinas en L
  if (resultado.bolsillo) {
    const b = resultado.bolsillo;
    const arriba = H - b.y - b.alto;
    rect('puerta-bolsillo', b.x, arriba, b.ancho, b.alto);
    formas.push({ tipo: 'polilinea', clase: 'puerta-bolsillo-marca', puntos: [[b.x, arriba + 3], [b.x, arriba], [b.x + 3, arriba]] });
    formas.push({ tipo: 'polilinea', clase: 'puerta-bolsillo-marca', puntos: [[b.x + b.ancho - 3, arriba], [b.x + b.ancho, arriba], [b.x + b.ancho, arriba + 3]] });
  }

  // Líneas de empate
  for (const u of resultado.uniones) {
    linea('puerta-empate', 0, H - u.altura, F, H - u.altura);
    texto(u.tubo ? `EMPATE · TUBO ${u.tubo}` : `EMPATE ${numAlzado(u.solape)} CM`, F - 4, H - u.altura - 4, 'end', 'puerta-cota-texto');
  }

  // Textos de taller colocados en huecos libres
  for (const t of textosTaller) {
    const cx = t.x + t.ancho / 2;
    formas.push({
      tipo: 'texto', x: cx, y: t.y + t.tamano, lineas: t.lineas, ancla: 'middle', tamano: t.tamano,
      ...(t.id === 'saco' ? { clase: 'puerta-saco-texto' } : {}),
      taller: { guia: t.guia ? [t.x < 0 ? t.x + t.ancho : cx, t.y + t.alto / 2, t.ancla[0], t.ancla[1]] : null },
    });
  }

  // Cota superior del frente
  cota({ x1: 0, y1: 0, x2: F, y2: 0, linea: -34, valor: p.frente || F, sufijo: ' cm', marcas: 6, texto: { x: F / 2, y: -41, ancla: 'middle', clase: null } });

  // Cadena derecha de pasos verticales
  hitosDerecha.slice(1).forEach((y, i) => {
    const desde = hitosDerecha[i];
    const tramo = y - desde;
    const esD = enr && T > 0 && Math.abs(desde - (H - T - D)) < 0.05 && Math.abs(y - (H - T)) < 0.05;
    const esT = enr && T > 0 && !tuboParteT && Math.abs(desde - (H - T)) < 0.05 && Math.abs(y - H) < 0.05;
    cota({
      x1: F, y1: H - desde, x2: F, y2: H - y, linea: xCadena, valor: tramo, marcas: 5,
      ...(esD ? { prefijo: 'D' } : esT ? { prefijo: 'T' } : {}),
      texto: { x: xCadena + 7, y: H - (y + desde) / 2 + 3, ancla: 'start' },
    });
  });

  // Cota T explícita cuando un tubo superior divide T
  if (tuboParteT) cota({ x1: F, y1: 0, x2: F, y2: T, linea: xCotaT, valor: T, prefijo: 'T', marcas: 5, texto: { x: xCotaT + 7, y: T / 2 + 3, ancla: 'start' } });

  // ÚNICA cota de alto total a la derecha
  cota({ x1: F, y1: 0, x2: F, y2: H, linea: xAltoTotal, valor: p.alto || H, sufijo: ' cm', marcas: 6, texto: { x: xAltoTotal + 14, y: H / 2, ancla: 'middle', giro: -90, clase: null } });

  // Pieza desplegada del saco con su pestaña debajo del alzado
  const y0 = yDesplegado, y1 = yDesplegado + hCorteSaco;
  formas.push({
    tipo: 'poligono', clase: 'puerta-saco-pieza',
    puntos: pestanaSaco > 0
      ? [[0, y0], [wSaco, y0], [wSaco, y1], [0, y1], [0, y0 + altoPestana], [-pestanaSaco, y0 + altoPestana], [-pestanaSaco, y0]]
      : [[0, y0], [wSaco, y0], [wSaco, y1], [0, y1]],
  });
  linea('puerta-cota', 0, y0 + hCorteSaco / 2, wSaco, y0 + hCorteSaco / 2, '5 3');
  if (enr && p.enrollable.sacoPartido) linea('puerta-empate', wSaco / 2, y0, wSaco / 2, y1);
  if (pestanaSaco > 0) {
    cota({ x1: -pestanaSaco, y1: y0, x2: 0, y2: y0, linea: y0 - 6, valor: pestanaSaco, marcas: 0, texto: { x: -pestanaSaco / 2, y: y0 - 9, ancla: 'middle' } });
  }
  cota({ x1: wSaco, y1: y0, x2: wSaco, y2: y1, linea: wSaco + 12, valor: hCorteSaco, marcas: 4, texto: { x: wSaco + 18, y: y0 + hCorteSaco / 2 + 3, ancla: 'start' } });
  texto(enr ? 'COSER VELCRO REVÉS DE 3 BRAVO' : ple ? 'COSER VELCRO REVÉS DE 5 BRAVO' : 'VELCRO BRAVO REVÉS DE 3', wSaco / 2, y0 - 7, 'middle', 'puerta-cota-texto');
  texto(`SACO 900 GR NEGRO · ${numAlzado(wSaco + pestanaSaco)} × ${numAlzado(hCorteSaco)} CM`, wSaco / 2, y0 + hCorteSaco / 2 - 2, 'middle', 'puerta-cota-texto');
  texto(
    enr ? 'COSER VELCRO DERECHO DE 3 SUAVE · CACHOS +1 CM PARA ESCUADRAR' : ple ? 'COSER VELCRO DERECHO DE 5 SUAVE' : 'VELCRO SUAVE REVÉS DE 3',
    wSaco / 2, y1 + 12, 'middle', 'puerta-cota-texto',
  );

  return { formas, vista: { xMin, yMin, ancho: anchoVista, alto: altoVista }, letraBase, F, H };
}

