import { alturasTubos } from './calcular.ts';
import { colocarTextosPuerta } from './textosPlano.ts';
import { desnivelSuelo, pestanaDerecha, rotuloSaco, sacoPuerta } from './saco.ts';
import { medidaSystemDock, REGLAS_SYSTEM_DOCK } from './systemDock.ts';
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
  /** Estilo real del plano: las cadenas pequeñas no dependen de la longitud medida. */
  estilo?: 'XERA 15' | 'XERAL' | 'XERAL 5';
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
  if (p.modelo === 'SYSTEMDOCK') return alzadoSystemDock(p);
  const F = p.frente > 0 ? p.frente : 400;
  const H = p.alto > 0 ? p.alto : 400;
  const desnivel = desnivelSuelo(p), altoDerecho = H - desnivel;
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
  const marca = (y: number, sentido = 1, desde = p.margenMarcas, hasta = F - p.margenMarcas) => {
    linea('puerta-rotulador', desde, y, hasta, y);
    const x = (desde + hasta) / 2;
    formas.push({ tipo: 'polilinea', clase: 'puerta-rotulador',
      puntos: [[x, y], [x, y + sentido], [x - 0.8, y + sentido], [x, y + sentido * 2.53205], [x + 0.8, y + sentido], [x, y + sentido]] });
  };
  const nota = (valor: string, x: number, y: number, tamano: number, guia?: [number, number, number, number]) =>
    formas.push({ tipo: 'texto', x, y, tamano, lineas: [valor], ancla: 'middle', taller: { guia: guia ?? null } });

  const tubos = ple ? alturasTubos(p) : p.entradas.map(t => t.altura);
  const T = enr && p.enrollable.T > 0 ? p.enrollable.T : 0;
  const ventanales = enr && T > 0 ? [{ D: p.enrollable.D, margen: p.enrollable.margen }, ...p.enrollable.ventanales ?? []] : [];
  const ejesVentanal = [T];
  for (const v of ventanales) ejesVentanal.push(ejesVentanal.at(-1)! + v.D);
  const D = p.enrollable.D;
  // La autorreparable acota el saco con sus 2 de soldadura encima (14 con el de 120 de antes). La enrollable dibuja
  // también los 2 de soldar, pero acota lo libre bajo el paño (Iván, 24/10/2026).
  const saco = sacoPuerta(p), hSaco = auto || enr ? saco.rematado + 2 : saco.rematado, hCota = enr ? saco.rematado : hSaco;

  // Cadena derecha de pasos verticales (suma exactamente H; sin duplicar H).
  const hitosDerecha = ple
    ? [0, ...tubos, H]
    : enr
      ? [...new Set([0, ...tubos, ...(ventanales.length ? ejesVentanal.map(y => H - y) : []), H])]
          .filter(y => y >= 0 && y <= H)
          .sort((a, b) => a - b)
      : [...new Set([0, 14, ...p.autorreparable.empates.map(e => e + 12), H])]
          .filter(y => y >= 0 && y <= H)
          .sort((a, b) => a - b);

  const tuboParteT = enr && T > 0 && tubos.some(y => y > H - T + 0.1 && y < H - 0.1);
  const xCadena = F + 34;
  const xCotaT = F + 64;
  const xAltoTotal = enr ? F + (tuboParteT ? 96 : 74) : -36;

  // Bandas de entrada de tubo con sus cotas de alto a la izquierda (sin duplicar ejes del ventanal)
  const bandasIzquierda: Array<{ y: number; alto: number }> = enr
    ? [
        ...(ventanales.length ? ejesVentanal : []),
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
  const yDesplegado = Math.max(H,altoDerecho) + 48;
  const hCorteSaco = ple && p.apilable.doble ? 37 : saco.corte;
  const pestanaSaco = enr ? 6.5 : auto ? 0 : p.apilable.doble ? 12 : 10;
  const altoPestana = ple && p.apilable.doble ? 14 : saco.altoPestana;
  const wSaco = ple && p.apilable.doble ? Math.max(20, F - 6) : F;

  const textosTaller = colocarTextosPuerta({ ...p, frente: F, alto: H }, resultado);
  const xMin = Math.min(desnivel ? -116 : -56, ...textosTaller.map(t => t.x - 8));
  const yMin = -62;
  const anchoVista = Math.max(F + (desnivel ? 150 : 110), ...textosTaller.map(t => t.x + t.ancho + 8)) - xMin;
  const altoVista = yDesplegado + hCorteSaco + Math.abs(desnivel) + (enr ? 80 : 55) - yMin;
  const letraBase = Math.min(10.5, Math.max(7.5, Math.min(F / 24, H / 38)));

  // Contorno general de la puerta
  if (desnivel) formas.push({tipo:'poligono',clase:'puerta-lona',puntos:[[0,0],[F,0],[F,altoDerecho],[0,H]]});
  else rect('puerta-lona', 0, 0, F, H);

  // Cabecera según modelo
  if (enr || auto) {
    linea('puerta-varilla', 0, 0, F, 0);
    texto('VARILLA NEGRA (4,5)', F / 2, -10, 'middle', 'puerta-texto-cabecera');
  }
  if (ple) {
    rect('puerta-entrada-alzado', 0, 0, F, p.apilable.bolsillo);
    cota({ x1: F, y1: 0, x2: F, y2: p.apilable.bolsillo, linea: F + 16, valor: p.apilable.bolsillo,
      estilo: 'XERAL 5', marcas: 3, texto: { x: F + 20, y: p.apilable.bolsillo / 2, ancla: 'start' } });
  }

  // Autorreparable: entrada superior con salida de 5,5 cm, cremalleras y espaciador de 10 cm
  if (auto) {
    const distancia = p.autorreparable.distanciaEspaciador ?? 10;
    rect('puerta-entrada-alzado', -5.5, -3.5, F + 11, 21);
    linea('puerta-guia', 0, 0, 0, H);
    linea('puerta-guia', F, 0, F, H);
    linea('puerta-cota', distancia, 17.5, distancia, H - 14, '4 3');
    linea('puerta-cota', F - distancia, 17.5, F - distancia, H - 14, '4 3');
    cota({ x1: 0, y1: H * 0.62, x2: distancia, y2: H * 0.62, linea: H * 0.62, valor: distancia, marcas: 0, texto: { x: distancia / 2, y: H * 0.62 - 3, ancla: 'middle' } });
    cota({ x1: F - distancia, y1: H * 0.62, x2: F, y2: H * 0.62, linea: H * 0.62, valor: distancia, marcas: 0, texto: { x: F - distancia / 2, y: H * 0.62 - 3, ancla: 'middle' } });
    if (p.autorreparable.espaciadorCentral) {
      linea('puerta-espaciador-central', F / 2, 30, F / 2, H - 14);
      linea('puerta-espaciador-central-marca', F / 2 - 1.9, 30, F / 2 - 1.9, H - 14);
    }
    cota({ x1: -16, y1: -3.5, x2: -16, y2: 17.5, linea: -16, valor: 21, marcas: 4, texto: { x: -22, y: 8, ancla: 'end' } });
    cota({ x1: F, y1: 30, x2: F, y2: H, linea: F + 64, valor: H - 30, estilo: 'XERAL', marcas: 4,
      texto: { x: F + 68, y: (H + 30) / 2, ancla: 'start' } });
  }

  // Ventanal enrollable: cachos laterales acotados y cristal acotado con su ancho de corte
  for (const [i, v] of ventanales.entries()) {
    const { margen: m, D } = v, T = ejesVentanal[i];
    rect('puerta-cacho', 0, T + 3.75, m, Math.max(0, D - 7.5));
    rect('puerta-cacho', Math.max(0, F - m), T + 3.75, m, Math.max(0, D - 7.5));
    rect('puerta-cristal', m, T + 3.75, Math.max(0, F - 2 * m), Math.max(0, D - 7.5));
    if (m > 0) {
      cota({ x1: 0, y1: T - 8, x2: m, y2: T - 8, linea: T - 8, valor: m, estilo: 'XERAL', marcas: 0, texto: { x: m / 2, y: T - 10, ancla: 'middle' } });
      cota({ x1: F - m, y1: T - 8, x2: F, y2: T - 8, linea: T - 8, valor: m, estilo: 'XERAL', marcas: 0, texto: { x: F - m / 2, y: T - 10, ancla: 'middle' } });
    }
    // El cristal se acota con su ancho de corte (hueco + 4).
    if (F - 2 * m > 12) {
      const y = T + Math.min(18.5, D / 2);
      cota({ x1: m - 2, y1: y, x2: F - m + 2, y2: y, linea: y, valor: F - 2 * m + 4, marcas: 4, texto: { x: F / 2, y: y - 3, ancla: 'middle' } });
    }
  }

  // Ventanas individuales en apilable y autorreparable
  if (!enr) {
    const filas = new Map<number, typeof p.ventanas>();
    for (const v of p.ventanas) {
      const fila = filas.get(v.y) ?? [];
      fila.push(v); filas.set(v.y, fila);
    }
    for (const fila of filas.values()) {
      fila.sort((a, b) => a.x - b.x);
      const vy = H - fila[0].y - fila[0].alto, yCota = vy + fila[0].alto / 2;
      const hitos = [0, ...fila.flatMap(v => [v.x, v.x + v.ancho]), F];
      hitos.slice(1).forEach((x, i) => {
        if (x <= hitos[i]) return;
        cota({ x1: hitos[i], y1: yCota, x2: x, y2: yCota, linea: yCota, valor: x - hitos[i], estilo: 'XERAL 5', marcas: 0,
          texto: { x: (x + hitos[i]) / 2, y: yCota - 3, ancla: 'middle' } });
      });
      for (const v of fila) {
      const vy = H - v.y - v.alto;
      rect('puerta-cristal', v.x, vy, v.ancho, v.alto, v.radio);
      cota({ x1: v.x + 12, y1: vy, x2: v.x + 12, y2: vy + v.alto, linea: v.x + 12, valor: v.alto, estilo: 'XERAL 5', marcas: 0, texto: { x: v.x + 15, y: vy + v.alto / 2 + 8, ancla: 'start' } });
      }
    }
  }

  // Bandas de entrada de tubo (enrollable y apilable) y sus cotas de alto a la izquierda
  for (const b of bandasIzquierda) {
    rect('puerta-entrada-alzado', 0, b.y - b.alto / 2, F, b.alto);
    linea('puerta-tubo', 0, b.y, F, b.y);
    cota({ x1: -12, y1: b.y - b.alto / 2, x2: -12, y2: b.y + b.alto / 2, linea: -12, valor: b.alto, estilo: enr ? 'XERAL 5' : 'XERAL', marcas: 4, texto: { x: -18, y: b.y + 3, ancla: 'end' } });
    marca(b.y + b.alto / 2, -1);
  }
  marca(auto ? 30 : ple ? p.apilable.bolsillo / 2 : 3.5);
  const inicioMarcaSaco = formas.length;
  marca(H - hSaco, -1);
  if (desnivel) for (const f of formas.slice(inicioMarcaSaco)) {
    if (f.tipo==='linea') { f.y1-=desnivel*f.x1/F; f.y2-=desnivel*f.x2/F; }
    if (f.tipo==='polilinea') f.puntos=f.puntos.map(([x,y])=>[x,y-desnivel*x/F]);
  }

  // Huecos de cutter en las entradas
  if (!auto) {
    p.entradas.forEach((e, i) => {
      const yEje = H - (ple ? tubos[i] ?? e.altura : e.altura);
      const altoE = enr ? 7.5 : e.alto || (e.diametro === 42 ? 13.5 : 12);
      for (const h of e.huecos) rect('puerta-hueco-alzado', h.x - (ple && F > 600 ? 1 : 0), yEje + altoE / 2 - h.y - h.alto, h.ancho, h.alto, h.radio);
      // Cadena completa de las cintas: extremos a 6, huecos y separaciones, como AR2605036.
      if (ple && e.huecos.length > 2 && i === p.entradas.findIndex(t => t.huecos.length > 2)) {
        const hs = [...e.huecos].sort((a, b) => a.x - b.x);
        const hitos = [0, hs[0].x + hs[0].ancho, ...hs.slice(1, -1).flatMap(h => [h.x, h.x + h.ancho]), hs.at(-1)!.x, F];
        const y = yEje - 15;
        hitos.slice(1).forEach((x, j) => {
          const desde = hitos[j];
          if (x <= desde) return;
          cota({ x1: desde, y1: yEje, x2: x, y2: yEje, linea: y, valor: x - desde, estilo: 'XERAL 5', marcas: 2,
            texto: { x: (desde + x) / 2, y: y - 3, ancla: 'middle' } });
        });
      }
    });
  }

  // Saco en el bajo de la puerta terminada y su cota
  if (desnivel) formas.push({tipo:'poligono',clase:'puerta-saco',puntos:[[0,H-hSaco],[F,altoDerecho-hSaco],[F,altoDerecho],[0,H]]});
  else rect('puerta-saco', 0, H - hSaco, F, hSaco);
  cota({ x1: F + 12, y1: altoDerecho - hCota, x2: F + 12, y2: altoDerecho, linea: F + 12, valor: hCota, marcas: 4, texto: { x: F + 18, y: altoDerecho - hCota / 2 + 3, ancla: 'start' } });

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
    if (auto) {
      linea('puerta-empate-autorreparable', 0, H - u.altura - u.solape / 2, F, H - u.altura - u.solape / 2);
      linea('puerta-empate-autorreparable', 0, H - u.altura + u.solape / 2, F, H - u.altura + u.solape / 2);
    } else linea('puerta-empate', 0, H - u.altura, F, H - u.altura);
    if (!u.tubo) nota(`EMPATE ${numAlzado(u.solape)}cm`, 40, H - u.altura - 4, 5);
    marca(H - u.altura - u.solape / 2);
    marca(H - u.altura + u.solape / 2, -1);
  }

  // Textos de taller colocados en huecos libres
  for (const t of textosTaller) {
    const cx = t.x + t.ancho / 2;
    if (t.id === 'cortes-et') {
      const destinos = p.entradas.map((e, i) => ({ e, y: H - tubos[i] }))
        .filter(e => e.e.huecos.length > 2 && e.y > t.y + t.alto).sort((a, b) => a.y - b.y);
      const destino = destinos[0];
      if (destino) for (const h of destino.e.huecos) linea('puerta-linea-guia', cx, t.y + t.alto + 2, h.x + h.ancho / 2, destino.y - 8);
    }
    if (t.id.startsWith('refuerzo-')) linea('puerta-linea-guia', cx, t.y + t.alto, t.id === 'refuerzo-10' ? 10 : F - 10, H - hSaco);
    formas.push({
      tipo: 'texto', x: t.giro ? t.ancla[0] : cx, y: t.giro ? t.ancla[1] : t.y + t.tamano, lineas: t.lineas, ancla: 'middle', tamano: t.tamano, giro: t.giro,
      taller: { guia: t.guia ? [t.x < 0 ? t.x + t.ancho : cx, t.y + t.alto / 2, t.ancla[0], t.ancla[1]] : null },
    });
  }

  // Cota superior del frente
  cota({ x1: 0, y1: 0, x2: F, y2: 0, linea: -34, valor: p.frente || F, estilo: auto ? 'XERAL' : 'XERA 15', sufijo: ' cm', marcas: 6, texto: { x: F / 2, y: -41, ancla: 'middle', clase: null } });

  // Cadena derecha de pasos verticales
  hitosDerecha.slice(1).forEach((y, i) => {
    const desde = i===0 ? desnivel : hitosDerecha[i];
    const tramo = y - desde;
    const esD = enr && T > 0 && Math.abs(desde - (H - T - D)) < 0.05 && Math.abs(y - (H - T)) < 0.05;
    const esT = enr && T > 0 && !tuboParteT && Math.abs(desde - (H - T)) < 0.05 && Math.abs(y - H) < 0.05;
    cota({
      x1: F, y1: H - desde, x2: F, y2: H - y, linea: xCadena, valor: tramo, marcas: 5,
      estilo: ple && y === H ? 'XERA 15' : 'XERAL',
      ...(esD ? { prefijo: 'D' } : esT ? { prefijo: 'T' } : {}),
      texto: { x: xCadena + 7, y: H - (y + desde) / 2 + 3, ancla: 'start' },
    });
  });

  // Cota T explícita cuando un tubo superior divide T
  if (tuboParteT) cota({ x1: F, y1: 0, x2: F, y2: T, linea: xCotaT, valor: T, prefijo: 'T', marcas: 5, texto: { x: xCotaT + 7, y: T / 2 + 3, ancla: 'start' } });

  // Total a la izquierda en apilables y autorreparables; en enrollables a la derecha, como los originales.
  const xTotal = desnivel ? -92 : xAltoTotal;
  cota({ x1: enr ? F : 0, y1: 0, x2: enr ? F : 0, y2: H, linea: xTotal, valor: p.alto || H, estilo: ple ? 'XERA 15' : 'XERAL', sufijo: ' cm', marcas: 6, texto: { x: xTotal + (enr ? 14 : -8), y: H / 2, ancla: 'middle', giro: -90, clase: null } });
  if (ple) cota({ x1: F, y1: p.apilable.cabecera, x2: F, y2: altoDerecho, linea: F + 74, valor: altoDerecho - p.apilable.cabecera, estilo: 'XERA 15', marcas: 4,
    texto: { x: F + 80, y: (altoDerecho + p.apilable.cabecera) / 2, ancla: 'start' } });
  if (desnivel) {
    const hitos = [0,...tubos,H];
    hitos.slice(1).forEach((y,i)=>cota({x1:0,y1:H-hitos[i],x2:0,y2:H-y,linea:-60,valor:y-hitos[i],marcas:4,estilo:'XERAL',texto:{x:-65,y:H-(y+hitos[i])/2,ancla:'end'}}));
    cota({x1:F,y1:0,x2:F,y2:altoDerecho,linea:F+115,valor:altoDerecho,sufijo:' cm',marcas:5,estilo:'XERA 15',texto:{x:F+125,y:altoDerecho/2,ancla:'middle',giro:-90}});
  }

  // Pieza desplegada del saco con su pestaña debajo del alzado
  const inicioDesplegado = formas.length;
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
    cota({ x1: -pestanaSaco, y1: y0, x2: 0, y2: y0, linea: y0 - 6, valor: pestanaSaco, estilo: 'XERAL', marcas: 0, texto: { x: -pestanaSaco / 2, y: y0 - 9, ancla: 'middle' } });
  }
  cota({ x1: wSaco, y1: y0, x2: wSaco, y2: y1, linea: wSaco + 12, valor: hCorteSaco, marcas: 4, texto: { x: wSaco + 18, y: y0 + hCorteSaco / 2 + 3, ancla: 'start' } });
  const altoVelcro = auto ? 4 : 8;
  nota(enr ? 'COSER VELCRO REVÉS DE 3 BRAVO' : ple ? 'COSER VELCRO REVÉS DE 5 BRAVO' : 'VELCRO BRAVO REVÉS DE 3',
    wSaco / 2, y0 - 16, altoVelcro, [wSaco * 0.2, y0 - 12, 0, y0]);
  nota(rotuloSaco(p), wSaco / 2, y0 + 11, 10);
  cota({ x1: 0, y1: y1 - 8, x2: wSaco, y2: y1 - 8, linea: y1 - 8, valor: wSaco, estilo: 'XERAL 5', marcas: 0,
    texto: { x: wSaco / 2, y: y1 - 10, ancla: 'middle' } });
  if (enr) cota({ x1: 0, y1, x2: 4.5, y2: y1, linea: y1 + 12, valor: 4.5, estilo: 'XERAL', marcas: 2,
    texto: { x: -10, y: y1 + 16, ancla: 'end' } });
  if (ple) cota({ x1: 0, y1, x2: 3, y2: y1, linea: y1 + 9, valor: 3, estilo: 'XERAL 5', marcas: 2,
    texto: { x: -6, y: y1 + 13, ancla: 'end' } });
  nota(enr ? 'COSER VELCRO DERECHO DE 3 SUAVE' : ple ? 'COSER VELCRO DERECHO DE 5 SUAVE' : 'VELCRO SUAVE REVÉS DE 3',
    wSaco / 2, y1 + 25, altoVelcro, [wSaco * 0.2, y1 + 20, 4.5, y1]);
  if (enr) {
    formas.push({ tipo: 'texto', x: F / 2, y: y1 + 46, tamano: 7.5, ancla: 'middle',
      lineas: ['LOS CACHOS DE LOS LATERALES DEL CRISTAL', 'VAN 1CM MÁS GRANDE PARA DESPUÉS ESCUADRARLO'], taller: { guia: null } });
  }
  if (auto) nota('CREMALLERA SOLDADA HASTA MITAD DE SACO', F / 2, y1 + 47, Math.min(10, F / 32));

  const derecha = pestanaDerecha(p);
  if (derecha) {
    // Pestaña a la derecha: la pieza desplegada dada la vuelta; las letras no se espejan.
    const x = (v: number) => wSaco - v;
    const ancla = (a: TextoAlzado['ancla']) => a === 'start' ? 'end' : a === 'end' ? 'start' : a;
    for (const f of formas.slice(inicioDesplegado)) {
      if (f.tipo === 'poligono' || f.tipo === 'polilinea') f.puntos = f.puntos.map(([u, v]) => [x(u), v]);
      else if (f.tipo === 'linea') { f.x1 = x(f.x1); f.x2 = x(f.x2); }
      else if (f.tipo === 'texto') {
        f.x = x(f.x); f.ancla = ancla(f.ancla);
        const g = f.taller?.guia; if (g) { g[0] = x(g[0]); g[2] = x(g[2]); }
      } else if (f.tipo === 'cota') {
        if (esVertical(f)) { f.x1 = x(f.x1); f.x2 = x(f.x2); f.linea = x(f.linea); }
        else [f.x1, f.x2] = [x(f.x2), x(f.x1)];
        f.texto.x = x(f.texto.x); f.texto.ancla = ancla(f.texto.ancla);
      } else if (f.tipo === 'rect') f.x = x(f.x + f.ancho);
    }
  }

  if (desnivel) {
    const mover = (x:number,y:number) => y + Math.max(0,desnivel) - desnivel*x/F;
    for (const f of formas.slice(inicioDesplegado)) {
      if (f.tipo==='poligono' && f.clase==='puerta-saco-pieza') {
        const saco = resultado.alternativasSaco?.entero[0] ?? resultado.piezas.find(x=>x.clase==='saco');
        if(saco) f.puntos=saco.contorno.map(([x,y])=>[x-(derecha?0:pestanaSaco),yDesplegado+saco.alto-y]);
      } else if (f.tipo==='poligono'||f.tipo==='polilinea') f.puntos=f.puntos.map(([x,y])=>[x,mover(x,y)]);
      else if (f.tipo==='linea') { f.y1=mover(f.x1,f.y1); f.y2=mover(f.x2,f.y2); }
      else if (f.tipo==='texto') {
        f.y=mover(f.x,f.y);
        const g=f.taller?.guia; if(g) {g[1]=mover(g[0],g[1]);g[3]=mover(g[2],g[3]);}
      } else if (f.tipo==='cota' && f.x1===f.x2) {
        f.y1=mover(f.x1,f.y1); f.y2=mover(f.x2,f.y2); f.texto.y=mover(f.x1,f.texto.y);
      }
    }
    // Sin el texto «LARGO DIAGONAL … · CABEZAS VERTICALES»: sobraba (Iván, 23/10/2026, AR2605035).
  }

  return { formas, vista: { xMin, yMin, ancho: anchoVista, alto: altoVista }, letraBase, F, H };
}

/** SYSTEM DOCK: la lona terminada, su corte (+1 de largo, +6,6 de ancho), las varillas y la medida, cuántas y la OF. */
function alzadoSystemDock(p: Puerta): GeometriaAlzado {
  const F = p.frente > 0 ? p.frente : 1040, H = p.alto > 0 ? p.alto : 55;
  const w = F + REGLAS_SYSTEM_DOCK.largo, h = H + REGLAS_SYSTEM_DOCK.ancho, dx = REGLAS_SYSTEM_DOCK.largo / 2, dy = REGLAS_SYSTEM_DOCK.ancho / 2;
  const letraBase = Math.min(14, Math.max(8, w / 70));
  const formas: FormaAlzado[] = [
    { tipo: 'rect', clase: 'puerta-lona', x: dx, y: dy, ancho: F, alto: H },
    ...([[0, 0, w, 0], [w, 0, w, h], [w, h, 0, h], [0, h, 0, 0]] as const).map(([x1, y1, x2, y2]) =>
      ({ tipo: 'linea' as const, clase: 'puerta-cota', x1, y1, x2, y2, trazos: '5 3' })),
    { tipo: 'linea', clase: 'puerta-varilla', x1: dx, y1: dy, x2: dx + F, y2: dy },
    { tipo: 'linea', clase: 'puerta-varilla', x1: dx, y1: dy + H, x2: dx + F, y2: dy + H },
    { tipo: 'texto', x: w / 2, y: -8, lineas: ['VARILLA NEGRA 4,5 MM'], ancla: 'middle' },
    { tipo: 'texto', x: w / 2, y: h + letraBase * 1.6, lineas: ['VARILLA NEGRA 4,5 MM'], ancla: 'middle' },
    { tipo: 'texto', x: -6, y: h / 2, lineas: ['AL CORTE'], ancla: 'middle', giro: -90 },
    { tipo: 'texto', x: w + 6, y: h / 2, lineas: ['AL CORTE'], ancla: 'middle', giro: -90 },
    { tipo: 'texto', x: w / 2, y: h / 2 + letraBase / 3, ancla: 'middle',
      lineas: [[medidaSystemDock({ frente: F, alto: H }), ...(p.cantidad > 1 ? [`X${p.cantidad}`] : []), p.of.trim() || 'SIN OF'].join('   ·   ')] },
    { tipo: 'cota', x1: dx, y1: 0, x2: dx + F, y2: 0, linea: -26, valor: F, marcas: 4, texto: { x: w / 2, y: -30, ancla: 'middle' } },
    { tipo: 'cota', x1: w, y1: dy, x2: w, y2: dy + H, linea: w + 20, valor: H, marcas: 4, texto: { x: w + 26, y: h / 2 + 3, ancla: 'start' } },
  ];
  return { formas, vista: { xMin: -40, yMin: -50, ancho: w + 110, alto: h + 80 }, letraBase, F, H };
}
