import { alturasTubos, calcularPuerta } from './calcular.ts';
import { anchoArial } from '../domain/corteLona/texto.js';
import type { Puerta, ResultadoPuerta } from './tipos.ts';
import { sacoApilable } from './saco.ts';

export interface CajaTexto {
  x: number;
  y: number;
  ancho: number;
  alto: number;
}

interface Anclaje {
  id: string;
  texto: string;
  x: number;
  y: number;
  caja?: CajaTexto;
  fuera?: boolean;
  tamano?: number;
  giro?: number;
  destino?: [number, number];
}

export interface TextoPlano extends CajaTexto {
  id: string;
  lineas: string[];
  tamano: number;
  ancla: [number, number];
  guia: boolean;
  giro?: number;
}

const num = (x: number) => x.toLocaleString('es-ES', { maximumFractionDigits: 2 });

export const solapaCaja = (a: CajaTexto, b: CajaTexto) =>
  a.x < b.x + b.ancho - 0.01 &&
  b.x < a.x + a.ancho - 0.01 &&
  a.y < b.y + b.alto - 0.01 &&
  b.y < a.y + a.alto - 0.01;

function restar(a: CajaTexto, b: CajaTexto): CajaTexto[] {
  if (!solapaCaja(a, b)) return [a];
  const x0 = Math.max(a.x, b.x);
  const x1 = Math.min(a.x + a.ancho, b.x + b.ancho);
  const y0 = Math.max(a.y, b.y);
  const y1 = Math.min(a.y + a.alto, b.y + b.alto);
  return [
    { x: a.x, y: a.y, ancho: a.ancho, alto: y0 - a.y },
    { x: a.x, y: y1, ancho: a.ancho, alto: a.y + a.alto - y1 },
    { x: a.x, y: y0, ancho: x0 - a.x, alto: y1 - y0 },
    { x: x1, y: y0, ancho: a.x + a.ancho - x1, alto: y1 - y0 },
  ].filter(c => c.ancho > 2 && c.alto > 2);
}

/** Parte un bloque en 2 líneas equilibradas cuando no cabe en una sola. */
function partirEnDos(bloque: string): [string, string] | null {
  const palabras = bloque.trim().split(/\s+/);
  if (palabras.length < 2) return null;
  let mejor: [string, string] | null = null;
  let mejorMax = Infinity;
  for (let i = 1; i < palabras.length; i++) {
    const izq = palabras.slice(0, i).join(' ');
    const der = palabras.slice(i).join(' ');
    const m = Math.max(izq.length, der.length);
    if (m < mejorMax) {
      mejorMax = m;
      mejor = [izq, der];
    }
  }
  return mejor;
}

function envolver(texto: string, maxCaracteres: number): string[] | null {
  const lineas: string[] = [];
  for (const bloque of texto.split('\n')) {
    if (bloque.length <= maxCaracteres) {
      lineas.push(bloque);
      continue;
    }
    const dos = partirEnDos(bloque);
    if (dos && dos[0].length <= maxCaracteres && dos[1].length <= maxCaracteres) {
      lineas.push(dos[0], dos[1]);
      continue;
    }
    let linea = '';
    for (const palabra of bloque.split(/\s+/)) {
      if (palabra.length > maxCaracteres) return null;
      if (linea && linea.length + palabra.length + 1 > maxCaracteres) {
        lineas.push(linea);
        linea = palabra;
      } else {
        linea += (linea ? ' ' : '') + palabra;
      }
    }
    if (linea) lineas.push(linea);
  }
  return lineas.length ? lineas : null;
}

function ajustar(texto: string, c: CajaTexto, objetivo: number, minimo: number) {
  for (let f = objetivo; f >= minimo - 0.01; f -= 0.5) {
    const max = Math.floor((c.ancho - 3) / (f * 0.58));
    if (max < 4) continue;
    const lineas = envolver(texto, max);
    if (!lineas || lineas.length > 3) continue;
    const alto = lineas.length * f * 1.22 + 2;
    const ancho = Math.max(...lineas.map(l => anchoArial(l, f))) + 3;
    if (alto <= c.alto && ancho <= c.ancho + 0.01) {
      return { lineas, tamano: Number(f.toFixed(1)), ancho, alto };
    }
  }
  return null;
}

/**
 * Plantilla de textos de taller extraída de los planos reales de Portanova:
 * - Enrollables: AR2604069.dwg, AR2604725.dwg, AR2604638.dwg
 * - Apilables: AR2605036.dwg, AR2604809.dwg
 * - Autorreparable: AR2604904.dwg
 */
export function plantillaTextosPuerta(p: Puerta, resultado: ResultadoPuerta = calcularPuerta(p)): Anclaje[] {
  const F = p.frente;
  const H = p.alto;
  const of = p.of.trim() || 'SIN OF';
  const anclas: Anclaje[] = [];
  const add = (id: string, texto: string, x: number, y: number, tamano: number, caja?: CajaTexto, giro?: number) =>
    anclas.push({ id, texto, x, y, tamano, caja, giro });
  const grande = p.modelo === 'PUERTAUTO' ? 25 : p.modelo === 'PUERTAPLE' ? 20 : F >= 400 ? 30 : 20;
  const tubos = p.modelo === 'PUERTAPLE' ? alturasTubos(p) : p.entradas.map(e => e.altura);
  const techo = Math.min(H, ...tubos.filter(y => y < H && y > 0).map(y => H - y),
    ...(p.modelo === 'PUERTAENR' && p.enrollable.T > 0 ? [p.enrollable.T] : []));
  const lateral = (id: string, texto: string, x: number, y: number, tamano: number) => add(id, texto, x, y, tamano, undefined, -90);

  // Alturas y distribución de AR2604638/4725 y AR2605036; las cajas libres adaptan la plantilla a cada pedido.
  if (p.modelo !== 'PUERTAUTO') {
    lateral('al-corte-izq', 'AL CORTE', -9, techo / 2, p.modelo === 'PUERTAPLE' ? 8 : 7);
    lateral('al-corte-der', 'AL CORTE', F + 9, techo / 2, p.modelo === 'PUERTAPLE' ? 8 : 7);
  }

  if (p.modelo === 'PUERTAENR') {
    const e = p.enrollable;
    const T = e.T > 0 ? e.T : H * 0.35;
    add('pano-sup', 'A1', F / 2, techo * 0.23, grande);
    add('reves', 'REVÉS', F / 2, techo * 0.48, grande);
    add('of', of, F / 2, techo * 0.74, grande);
    const vs = [{ D: e.D, margen: e.margen }, ...e.ventanales ?? []];
    const fin = T + vs.reduce((s, v) => s + v.D, 0);
    const bajo = Math.min(H - 13, ...tubos.map(y => H - y).filter(y => y > fin + 4));
    add('pano-inf', 'A2', F / 2, bajo - fin < 70 ? bajo - 15 : (fin + bajo) / 2, 20);
    const ejes = [T];
    for (const v of vs) ejes.push(ejes.at(-1)! + v.D);
    for (const y of tubos.map(y => H - y)) if (!ejes.some(eje => Math.abs(eje - y) < 0.1)) ejes.push(y);
    ejes.filter(y => y > 0 && y < H - 13).forEach((y, i) => {
      if (ejes.slice(1, vs.length).includes(y)) {
        // Entre dos cristales no hay hueco para una leyenda: llamada por fuera al borde de la E.T.
        anclas.push({ id: `et-${i}`, texto: '3 CM (HUECOS)', x: -85, y: y - 6, tamano: 7,
          caja: { x: -135, y: y - 18, ancho: 100, alto: 24 }, destino: [0, y - 3.75] });
      } else add(`et-${i}`, '3 CM (HUECOS)', F / 2, y === fin ? y + 11 : y - 14, 7);
    });
    lateral('pisar-et', 'DE ESTE LADO PISAR LAS E.T. 1 CM', F + 105, H / 2 + 20, 10);
    add('soldar-saco', 'SOLDAR SACO NEGRO 2 CM MÁXIMO', F / 2, H - 6.5, 7,
      { x: 3, y: H - 12, ancho: F - 6, alto: 11 });
    add('cerrar-et', 'CERRAR E.T\n2 CM MÁXIMO', F + 75, H + 6, 5,
      { x: F + 20, y: H - 7, ancho: 110, alto: 25 });
  } else if (p.modelo === 'PUERTAPLE') {
    const ys = alturasTubos(p);
    add('of', of, F * 0.2, techo / 2, grande);
    add('reves', 'REVÉS', F * 0.77, techo / 2, grande);
    const uniones = resultado.uniones.map(u => H - u.altura).sort((a, b) => a - b);
    const limites = [0, ...uniones, H];
    limites.slice(1).forEach((y, i) => add(`pano-${i}`, `A${i + 1}`, F / 2, (limites[i] + y) / 2, grande));
    const idxCintas = p.entradas.findIndex(t => t.huecos.length > 2);
    const yCintas = idxCintas >= 0 && ys[idxCintas] !== undefined ? H - (ys[Math.min(ys.length - 1, idxCintas + 4)] ?? ys[idxCintas]) - 24 : H * 0.4;
    add('cortes-et', 'CORTES EN ENTRADA DE TUBO (SOLO POR REVÉS)', F / 2, yCintas, 8);
    add('et-cabecera', 'E.T Ø30 mm', F / 2, -10, 8,
      { x: 2, y: -18, ancho: F - 4, alto: 16 });
    p.entradas.forEach((t, i) => {
      const yTubo = H - (ys[i] ?? t.altura);
      const alto = t.alto || (t.diametro === 42 ? 13.5 : 12);
      add(`et-${i}`, `E.T Ø${t.diametro} mm`, F / 2, yTubo, 8, {
        x: 4,
        y: yTubo - alto / 2,
        ancho: Math.max(20, F - 8),
        alto: Math.max(8, alto),
      });
    });
    add('refuerzo-10', 'REFUERZO DE 10CM A 10CM DEL BORDE SOLDADO LONA DE 2MM', F * 0.22, H - 26, 5);
    add('refuerzo-15', 'REFUERZO DE 15CM A 10CM DEL BORDE SOLDADO LONA DE 2MM', F * 0.78, H - 26, 5);
    add('saco', p.apilable.doble ? 'DOBLE SACO · SACO 80 INTEGRADO' : `SACO DE ${p.apilable.saco ?? 80}`, F / 2, H + 10, 10,
      { x: 0, y: H + 1, ancho: F, alto: 18 });
    add('cerrar-et', 'CERRAR E.T\n2 CM MÁXIMO', F + 75, H + 14, 5,
      { x: F + 20, y: H + 1, ancho: 110, alto: 25 });
  } else {
    add('et-sup', 'E.T POR DELANTE Y POR DETRÁS CORTADA DE 21', F / 2, 9, 5,
      { x: 4, y: 3, ancho: F - 8, alto: 10 });
    add('et-largo', 'E.T 5,5 cms MAS LARGAS EN CADA LADO', F / 2, 23, 5,
      { x: 4, y: 18, ancho: F - 8, alto: 11 });
    const limites = [30, ...resultado.uniones.map(u => H - u.altura).sort((a, b) => a - b), H - 14];
    limites.slice(1).forEach((y, i) => add(`pano-${i}`, `A${i + 1}`, F * 0.65, i === 0 ? 45 : (limites[i] + y) / 2 + 40, grande));
    lateral('cremallera-izq', 'CREMALLERA ESPECIAL PORTANOVA', -9, H * 0.7, 8);
    const distancia = p.autorreparable.distanciaEspaciador ?? 10;
    lateral('espaciador-izq', 'ESPACIADOR ESPECIAL PORTANOVA', distancia + 7, H * 0.7, 8);
    lateral('cremallera-der', 'CREMALLERA ESPECIAL PORTANOVA', F + 17, H * 0.7, 8);
    lateral('espaciador-der', 'ESPACIADOR ESPECIAL PORTANOVA', F - distancia - 7, H * 0.7, 8);
    if (p.autorreparable.espaciadorCentral) lateral('espaciador-central', 'ESPACIADOR ESPECIAL PORTANOVA', F / 2 - 8, H * 0.7, 8);
    add('saco', 'SACO DE 120', F / 2, H + 10, 10, { x: 0, y: H + 1, ancho: F, alto: 18 });
  }

  if (p.bolsillo) {
    const b = p.medidasBolsillo;
    const xBolsillo = b.lado === 'izquierdo' ? b.distancia : F - b.distancia - b.ancho;
    const ySup = b.altoSuperior ?? 18;
    add(
      'bolsillo',
      `BOLSILLO ${num(b.ancho)} × 17 REVÉS`,
      xBolsillo + b.ancho / 2,
      H - ySup - 6, 7,
    );
  }

  return anclas;
}

/** Textos en huecos libres: primero ajusta tamaño y líneas; fuera solo si no cabe. */
export function colocarTextosPuerta(p: Puerta, resultado?: ResultadoPuerta): TextoPlano[] {
  if (p.frente <= 0 || p.alto <= 0) return [];
  const F = p.frente;
  const H = p.alto;

  const ventanas: CajaTexto[] =
    p.modelo === 'PUERTAENR' && p.enrollable.T > 0
      ? [{ x: 0, y: p.enrollable.T - 4, ancho: F,
          alto: [p.enrollable.D, ...p.enrollable.ventanales?.map(v => v.D) ?? []].reduce((s, h) => s + h, 0) + 8 }]
      : p.ventanas.map(v => ({
          x: v.x - 2,
          y: H - v.y - v.alto - 2,
          ancho: v.ancho + 4,
          alto: v.alto + 4,
        }));

  const tubos = p.modelo === 'PUERTAPLE' ? alturasTubos(p) : p.entradas.map(t => t.altura);
  const bandasTubos: CajaTexto[] =
    p.modelo === 'PUERTAUTO'
      ? [{ x: 0, y: 0, ancho: F, alto: 30 }]
      : tubos.map((t, i) => {
          const alto = p.modelo === 'PUERTAENR' ? 7.5 : p.entradas[i]?.alto ?? 12;
          return { x: 0, y: H - t - alto / 2 - 1, ancho: F, alto: alto + 2 };
        });

  const hSaco = p.modelo === 'PUERTAENR' ? 13 : p.modelo === 'PUERTAUTO' ? 14 : sacoApilable(p).rematado;
  const cajaBolsillo: CajaTexto[] = p.bolsillo
    ? [
        {
          x:
            (p.medidasBolsillo.lado === 'izquierdo'
              ? p.medidasBolsillo.distancia
              : F - p.medidasBolsillo.distancia - p.medidasBolsillo.ancho) - 1,
          y: H - (p.medidasBolsillo.altoSuperior ?? 18) - 1,
          ancho: p.medidasBolsillo.ancho + 2,
          alto: 19,
        },
      ]
    : [];

  const margenLateral = p.modelo === 'PUERTAUTO' ? 27 : 4;
  const obstaculos: CajaTexto[] = [
    ...(p.modelo === 'PUERTAUTO' && p.autorreparable.espaciadorCentral
      ? [{ x: F / 2 - 15, y: 30, ancho: 17, alto: Math.max(0, H - 44) }] : []),
    ...ventanas,
    ...bandasTubos,
    ...cajaBolsillo,
    { x: 0, y: H - hSaco - 1, ancho: F, alto: hSaco + 1 },
  ];

  let libres: CajaTexto[] = [
    { x: margenLateral, y: 3, ancho: Math.max(8, F - 2 * margenLateral), alto: Math.max(8, H - 6) },
  ];
  for (const o of obstaculos) {
    libres = libres.flatMap(c => restar(c, o));
  }

  const salida: TextoPlano[] = [];
  for (const a of plantillaTextosPuerta(p, resultado)) {
    const objetivo = a.tamano ?? 7;
    const minimo = Math.min(objetivo, 4.5);
    if (a.giro) {
      const ancho = objetivo * 1.22 + 2, alto = anchoArial(a.texto, objetivo) + 3;
      salida.push({ id: a.id, lineas: [a.texto], tamano: objetivo, giro: a.giro,
        x: a.x - ancho / 2, y: a.y - alto / 2, ancho, alto, ancla: [a.x, a.y], guia: false });
      continue;
    }
    const espacios = a.fuera ? [] : a.caja ? [a.caja] : libres;
    const candidatos = espacios
      .flatMap(c => {
        const t = ajustar(a.texto, c, objetivo, minimo);
        if (!t) return [];
        const x = Math.max(c.x, Math.min(a.x - t.ancho / 2, c.x + c.ancho - t.ancho));
        const y = Math.max(c.y, Math.min(a.y - t.alto / 2, c.y + c.alto - t.alto));
        const cajaCandidata: CajaTexto = { x, y, ancho: t.ancho, alto: t.alto };
        if (salida.some(s => solapaCaja(cajaCandidata, s))) return [];
        const distancia = Math.hypot(x + t.ancho / 2 - a.x, y + t.alto / 2 - a.y);
        return [{ ...t, x, y, distancia, puntuacion: distancia + (objetivo - t.tamano) * 14 }];
      })
      .sort((u, v) => u.puntuacion - v.puntuacion);

    const elegido = candidatos[0];
    let t: TextoPlano;
    if (elegido) {
      t = {
        id: a.id,
        lineas: elegido.lineas,
        tamano: elegido.tamano,
        x: elegido.x,
        y: elegido.y,
        ancho: elegido.ancho,
        alto: elegido.alto,
        ancla: a.destino ?? [a.x, a.y],
        guia: Boolean(a.destino) || (!a.caja && elegido.distancia > 42),
      };
    } else {
      const cajaFuera: CajaTexto = { x: -128, y: Math.max(0, a.y - 14), ancho: 82, alto: 80 };
      const ajuste = ajustar(a.texto, cajaFuera, objetivo * 0.9, 5) ?? {
        lineas: a.texto.split('\n'),
        tamano: 5.5,
        ancho: 80,
        alto: 22,
      };
      let y = Math.max(0, Math.min(H - ajuste.alto, cajaFuera.y));
      while (salida.some(s => s.x < 0 && solapaCaja({ ...ajuste, x: cajaFuera.x, y }, s))) {
        y += ajuste.alto + 4;
      }
      t = {
        ...ajuste,
        x: cajaFuera.x,
        y,
        id: a.id,
        ancla: a.destino ?? [a.x, a.y],
        guia: true,
      };
    }
    salida.push(t);
    if (t.x >= 0) {
      const ocupada: CajaTexto = { x: t.x - 1.5, y: t.y - 1.5, ancho: t.ancho + 3, alto: t.alto + 3 };
      libres = libres.flatMap(c => restar(c, ocupada));
    }
  }
  return salida;
}
