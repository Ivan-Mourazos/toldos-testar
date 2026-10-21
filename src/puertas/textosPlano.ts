import { alturasTubos } from './calcular.ts';
import type { Puerta } from './tipos.ts';

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
}

export interface TextoPlano extends CajaTexto {
  id: string;
  lineas: string[];
  tamano: number;
  ancla: [number, number];
  guia: boolean;
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
    const ancho = Math.min(c.ancho, Math.max(...lineas.map(l => l.length)) * f * 0.58 + 3);
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
export function plantillaTextosPuerta(p: Puerta): Anclaje[] {
  const F = p.frente;
  const H = p.alto;
  const of = p.of.trim() || 'SIN OF';
  const anclas: Anclaje[] = [];
  const add = (id: string, texto: string, x: number, y: number, caja?: CajaTexto, fuera = false) =>
    anclas.push({ id, texto, x, y, caja, fuera });

  if (p.modelo === 'PUERTAENR') {
    const e = p.enrollable;
    const T = e.T > 0 ? e.T : H * 0.35;
    const D = e.D > 7.5 ? e.D : 60;
    const m = e.margen > 0 ? e.margen : 8;
    const tubosAltos = p.entradas.filter(t => H - t.altura < T - 4);
    const ySup = tubosAltos.length ? (H - Math.max(...tubosAltos.map(t => t.altura))) / 2 : T * 0.42;

    add('pano-sup', `A1 · REVÉS · ${of}`, F / 2, Math.max(12, ySup));
    add('al-corte', 'AL CORTE', F / 2, Math.min(T - 10, Math.max(22, T * 0.72)));
    if (F - 2 * m > 24 && D > 16) {
      add(
        'cristal',
        `CRISTAL ${num(F - 2 * m + 4)} CM\n${p.materialCristal || 'TRANSP. 1000MI'}`,
        F / 2,
        T + D / 2,
        { x: m + 3, y: T + 5, ancho: F - 2 * m - 6, alto: D - 10 },
      );
    }
    const ysHuecos: number[] = [];
    for (const yCand of [T, T + D, ...p.entradas.map(t => H - t.altura)]) {
      if (yCand > 4 && yCand < H - 14 && !ysHuecos.some(y0 => Math.abs(y0 - yCand) < 1)) {
        ysHuecos.push(yCand);
      }
    }
    ysHuecos.sort((a, b) => a - b).forEach((yTubo, i) => {
      const esBordeInfVentana = Math.abs(yTubo - (T + D)) < 1;
      add(`et-${i}`, '3 CM (HUECOS)', F / 2, esBordeInfVentana ? Math.min(H - 18, yTubo + 8) : Math.max(8, yTubo - 7));
    });
    const tubosBajos = p.entradas.filter(t => H - t.altura > T + D + 4);
    const yInf = tubosBajos.length
      ? (T + D + 3.75 + (H - Math.max(...tubosBajos.map(t => t.altura)) - 3.75)) / 2
      : (T + D + H - 13) / 2;
    add('pano-inf', 'A2 · PISAR LAS E.T. 1 CM', F / 2, yInf);
    add('soldar-saco', 'SOLDAR SACO NEGRO 2 CM MÁXIMO · CERRAR E.T. 2 CM MÁX.', F / 2, H - 19);
    add('saco', 'SACO 900 GR NEGRO', F / 2, H - 6.5, { x: 2, y: H - 12.5, ancho: F - 4, alto: 12 });
  } else if (p.modelo === 'PUERTAPLE') {
    const ys = alturasTubos(p);
    const ySup = ys.length ? (H - ys.at(-1)!) / 2 : 35;
    add('pano-sup', `${of} · REVÉS · A1`, F / 2, Math.max(12, ySup));
    add(
      'al-corte',
      F > 600 ? 'AL CORTE · +1 CM POR LADO (> 6 M)' : 'AL CORTE',
      F / 2,
      Math.max(24, ySup + 14),
    );
    const idxCintas = p.entradas.findIndex(t => t.huecos.length > 2);
    const yCintas = idxCintas >= 0 && ys[idxCintas] !== undefined ? H - ys[idxCintas] - 14 : Math.max(36, H * 0.28);
    add('cortes-et', 'CORTES EN ENTRADA DE TUBO (SOLO POR REVÉS)', F / 2, yCintas);
    p.entradas.forEach((t, i) => {
      const yTubo = H - (ys[i] ?? t.altura);
      const alto = t.alto || (t.diametro === 42 ? 13.5 : 12);
      add(`et-${i}`, `E.T. Ø${t.diametro} mm`, F / 2, yTubo, {
        x: 4,
        y: yTubo - alto / 2 + 0.5,
        ancho: Math.max(20, F - 8),
        alto: Math.max(8, alto - 1),
      });
    });
    const yPie = ys.length ? H - ys[0] / 2 : H - 35;
    add('refuerzo', 'REFUERZO 10 Y 15 CM A 10 CM DEL BORDE · CERRAR E.T. 2 CM MÁX.', F / 2, Math.min(H - 18, yPie));
    const hSaco = p.apilable.saco === 120 ? 12 : 11;
    add(
      'saco',
      p.apilable.doble ? 'DOBLE SACO · SACO 80 INTEGRADO' : `SACO DE ${p.apilable.saco ?? 80}`,
      F / 2,
      H - hSaco / 2,
      { x: 2, y: H - hSaco + 0.5, ancho: F - 4, alto: hSaco - 1 },
    );
  } else {
    add(
      'et-sup',
      'E.T. POR DELANTE Y POR DETRÁS CORTADA DE 21 · +5,5 CM CADA LADO',
      F / 2,
      8.5,
      { x: 4, y: 1, ancho: Math.max(20, F - 8), alto: 15.5 },
    );
    add('cuerpo', `A1 · REVÉS · ${of}`, F / 2, H * 0.34);
    add('guias', 'CREMALLERA Y ESPACIADOR ESPECIAL PORTANOVA (10 CM)', F / 2, H * 0.52);
    add('mitad-saco', 'CREMALLERA SOLDADA HASTA MITAD DE SACO', F / 2, H - 24);
    add('saco', 'SACO DE 120 · 900 GR NEGRO', F / 2, H - 7, {
      x: 2,
      y: H - 13.5,
      ancho: F - 4,
      alto: 13,
    });
  }

  if (p.bolsillo) {
    const b = p.medidasBolsillo;
    const xBolsillo = b.lado === 'izquierdo' ? b.distancia : F - b.distancia - b.ancho;
    const ySup = b.altoSuperior ?? 18;
    add(
      'bolsillo',
      `BOLSILLO ${num(b.ancho)} × 17 REVÉS`,
      xBolsillo + b.ancho / 2,
      H - ySup - 6,
    );
  }

  return anclas;
}

/** Textos en huecos libres: primero ajusta tamaño y líneas; fuera solo si no cabe. */
export function colocarTextosPuerta(p: Puerta): TextoPlano[] {
  if (p.frente <= 0 || p.alto <= 0) return [];
  const F = p.frente;
  const H = p.alto;
  const objetivo = Math.min(11, Math.max(7.5, Math.min(F / 22, H / 36)));
  const minimo = Math.max(5.5, objetivo * 0.62);

  const ventanas: CajaTexto[] =
    p.modelo === 'PUERTAENR' && p.enrollable.T > 0
      ? [
          {
            x: 0,
            y: p.enrollable.T - 3.75,
            ancho: F,
            alto: p.enrollable.D + 7.5,
          },
        ]
      : p.ventanas.map(v => ({
          x: v.x - 2,
          y: H - v.y - v.alto - 2,
          ancho: v.ancho + 4,
          alto: v.alto + 4,
        }));

  const tubos = p.modelo === 'PUERTAPLE' ? alturasTubos(p) : p.entradas.map(t => t.altura);
  const bandasTubos: CajaTexto[] =
    p.modelo === 'PUERTAUTO'
      ? [{ x: 0, y: 0, ancho: F, alto: 18 }]
      : tubos.map((t, i) => {
          const alto = p.modelo === 'PUERTAENR' ? 7.5 : p.entradas[i]?.alto ?? 12;
          return { x: 0, y: H - t - alto / 2 - 1, ancho: F, alto: alto + 2 };
        });

  const hSaco = p.modelo === 'PUERTAENR' ? 13 : p.modelo === 'PUERTAUTO' ? 14 : p.apilable.saco === 120 ? 12 : 11;
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

  const margenLateral = p.modelo === 'PUERTAUTO' ? 12 : 4;
  const obstaculos: CajaTexto[] = [
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
  for (const a of plantillaTextosPuerta(p)) {
    const espacios = a.fuera ? [] : a.caja ? [a.caja] : libres;
    const candidatos = espacios
      .flatMap(c => {
        const t = ajustar(a.texto, c, a.caja ? Math.min(objetivo, c.alto * 0.55) : objetivo, a.caja ? 4.5 : minimo);
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
        ancla: [a.x, a.y],
        guia: !a.caja && elegido.distancia > 42,
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
        ancla: [a.x, a.y],
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
