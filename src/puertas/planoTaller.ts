import { escribirDxfPlano } from '../domain/corteLona/presentacion.js';
import { anchoArial, textoSeguro } from '../domain/corteLona/texto.js';
import { alturasTubos, calcularPuerta } from './calcular.ts';
import { esClientePortanova } from './clientePortanova.ts';
import { bloqueFlechaEnrollable, dibujarAlzadoEnrollable, lienzoAMetros, sumarLienzo, type LienzoEnrollable } from './planoEnrollable.ts';
import { presentacionPortanova, VENTANA_CORTE_PORTANOVA } from './plantillaPortanova.ts';
import type { CortePuertas, Hueco, PedidoPuertas, Puerta, Punto } from './tipos.ts';

// Alzados de oficina, separados del SVG del configurador. Referencias locales:
// AR2605036/4906 (apilables), AR2604904/4526 (autorreparables).
type Lienzo = LienzoEnrollable;
type Zona = { x0: number; y0: number; x1: number; y1: number };
const vacio = (): Lienzo => ({ lineas: [], polilineas: [], textos: [], cotas: [], inserciones: [], sombreados: [], arcos: [], circulos: [] });
const num = (v: number) => v.toLocaleString('es-ES', { maximumFractionDigits: 2 });
const linea = (l: Lienzo, capa: string, x1: number, y1: number, x2: number, y2: number) => l.lineas.push({ capa, x1, y1, x2, y2 });
const texto = (l: Lienzo, valor: string, x: number, y: number, h: number, giro = 0, capa = 'texto') =>
  l.textos.push({ capa, valor: capa === 'ROTULADOR' ? valor : textoSeguro(valor), x, y, h, centrado: true, giro });
const contorno = (l: Lienzo, capa: string, puntos: Punto[]) => puntos.forEach((a, i) => {
  const b = puntos[(i + 1) % puntos.length]; linea(l, capa, ...a, ...b);
});
const rect = (l: Lienzo, capa: string, x: number, y: number, w: number, h: number): Punto[] => {
  const puntos: Punto[] = [[x, y], [x + w, y], [x + w, y + h], [x, y + h]];
  contorno(l, capa, puntos); return puntos;
};
const cota = (l: Lienzo, x1: number, y1: number, x2: number, y2: number, d: number, estilo = 'XERAL') =>
  l.cotas.push({ capa: 'cotas', estilo, x1, y1, x2, y2, d, giro: x1 === x2 ? 90 : 0, valor: Math.hypot(x2 - x1, y2 - y1) });
const flecha = (l: Lienzo, x: number, y: number, giro: number, sx = 1) => l.inserciones.push({ capa: 'ROTULADOR', nombre: 'FLECHA2', x, y, giro, sx });

/** Contorno con arcos de 90°, conservados como bulges de la polilínea de oficina. */
function redondeado(l: Lienzo, capa: string, x: number, y: number, w: number, h: number, radio: number) {
  const r = Math.min(radio, w / 2, h / 2), b = Math.tan(Math.PI / 8);
  l.polilineas.push({ capa, cerrada: true, puntos: [[x + r, y], [x + w - r, y], [x + w, y + r], [x + w, y + h - r],
    [x + w - r, y + h], [x + r, y + h], [x, y + h - r], [x, y + r]], curvas: [0, b, 0, b, 0, b, 0, b] });
}

function huecoEntrada(l: Lienzo, h: Hueco, eje: number, altoEntrada: number, F: number) {
  const y = eje - altoEntrada / 2 + h.y, r = Math.min(h.radio, h.ancho / 2, h.alto / 2), b = Math.tan(Math.PI / 8);
  // Los huecos laterales se abren hacia fuera; no se cierra ese lado en el alzado.
  if (h.x <= 1.01 || h.x + h.ancho >= F - 1.01) {
    const izq = h.x <= 1.01, x = izq ? h.x : h.x + h.ancho, signo = izq ? 1 : -1;
    l.polilineas.push({ capa: 'referencias', cerrada: false,
      puntos: [[x, y + h.alto], [x + signo * (h.ancho - r), y + h.alto], [x + signo * h.ancho, y + h.alto - r],
        [x + signo * h.ancho, y + r], [x + signo * (h.ancho - r), y], [x, y]], curvas: [0, -signo * b, 0, -signo * b, 0, 0] });
  } else redondeado(l, 'referencias', h.x, y, h.ancho, h.alto, h.radio);
}

/** Rótulos centrados en el mayor espacio libre del paño, evitando entradas, ventanas y empates. */
function rotulos(l: Lienzo, p: Puerta, codigo: string, x: number, abajo: number, arriba: number, ancho: number,
  obstaculos: Array<[number, number]>, primero: boolean, cantidad = true, giro = 0) {
  let huecos: Array<[number, number]> = [[abajo + 4, arriba - 4]];
  for (const [a, b] of obstaculos) huecos = huecos.flatMap(([y0, y1]) => b <= y0 || a >= y1 ? [[y0, y1] as [number, number]]
    : [[y0, Math.min(y1, a - 4)], [Math.max(y0, b + 4), y1]].filter(([u, v]) => v > u) as Array<[number, number]>);
  const libre = huecos.sort((a, b) => (b[1] - b[0]) - (a[1] - a[0]))[0] ?? [abajo, arriba];
  const valores = [...(primero && cantidad && p.cantidad > 1 ? [`X${p.cantidad}`] : []), codigo, ...(primero ? ['REVÉS'] : []),
    ...(primero && p.of.trim() ? [p.of.trim()] : [])];
  const alto = Math.max(1, libre[1] - libre[0]);
  const h = Math.min(p.modelo === 'PUERTAUTO' ? 25 : 20, ancho / 10, alto / (valores.length * 1.5 + .5),
    ...valores.map(v => ancho * .85 / anchoArial(v, 1)));
  valores.forEach((v, i) => texto(l, v, x, (libre[0] + libre[1]) / 2 + ((valores.length - 1) / 2 - i) * h * 1.5, h, giro));
}

function dibujarSaco(l: Lienzo, p: Puerta) {
  const ple = p.modelo === 'PUERTAPLE', doble = ple && p.apilable.doble;
  const w = doble ? p.frente - 6 : p.frente, h = ple ? doble ? 37 : p.apilable.saco === 120 ? 32 : 30 : 32;
  const pestaña = ple ? doble ? 12 : 10 : 0, hp = ple ? doble || p.apilable.saco === 120 ? 14 : 13 : 0;
  const ys = -p.alto - (ple ? 49.0879644349 : 40);
  contorno(l, 'referencias', pestaña ? [[0, ys], [w, ys], [w, ys - h], [0, ys - h], [0, ys - 2 - hp],
    [-pestaña, ys - 2 - hp], [-pestaña, ys - 2], [0, ys - 2]] : [[0, ys], [w, ys], [w, ys - h], [0, ys - h]]);
  for (const y of [ys - 2, ys - h / 2, ys - h + 2]) linea(l, 'vent-pre-noimpr', 0, y, w, y);
  const sombrear = (x: number, y: number, ancho: number, alto: number, solido: boolean) => {
    const puntos = rect(l, 'referencia-1', x, y, ancho, alto); l.sombreados.push({ capa: 'referencia-1', puntos, solido });
  };
  if (ple) {
    sombrear(-pestaña, ys - 2 - hp, 5, hp, true);
    sombrear(3, ys - h + 2, 5, hp, false);
    texto(l, 'COSER VELCRO REVÉS DE 5 BRAVO', w / 2, ys + 22, 8);
    texto(l, 'COSER VELCRO DERECHO DE 5 SUAVE', w / 2, ys - h - 18, 8);
    linea(l, 'texto', w / 2 - 65, ys + 16, -pestaña / 2, ys - 2);
    linea(l, 'texto', w / 2 - 65, ys - h - 12, 5.5, ys - h + 3);
    cota(l, 0, ys - h + 2, 3, ys - h + 2, ys - h - 10);
    if (doble) texto(l, 'CENTRAR EL ENVOLTORIO · DOBLAR A LA MITAD · SOLDAR 2 CM', w / 2, ys + 42, Math.min(8, w / 70));
  } else {
    for (const x of [0, w - 3]) {
      sombrear(x, ys - 16, 3, 16, true); sombrear(x, ys - 32, 3, 16, false);
      const tx = x === 0 ? w * .23 : w * .77;
      texto(l, 'VELCRO BRAVO REVÉS DE 3', tx, ys + 10, 4);
      texto(l, 'VELCRO SUAVE REVÉS DE 3', tx, ys - h - 10, 4);
      linea(l, 'texto', tx, ys + 6, x + 1.5, ys - 8);
      linea(l, 'texto', tx, ys - h - 6, x + 1.5, ys - 24);
    }
    texto(l, 'CREMALLERA SOLDADA HASTA MITAD DE SACO', w / 2, ys - h - 32, Math.min(10, w / 45));
  }
  texto(l, ple ? 'SACO 900 GR NEGRO' : 'SACO 900 GR AMARILLO/NEGRO', w / 2, ys - h / 2, Math.min(10, w / 40));
  cota(l, 0, ys - h, w, ys - h, ys - h / 2, 'XERAL 5');
  cota(l, 0, ys - h, 0, ys, -25);
  return ys - h - 48;
}

export function dibujarAlzadoTaller(p: Puerta, letra: string): { lienzo: Lienzo; zona: Zona } {
  if (p.modelo === 'PUERTAENR') return dibujarAlzadoEnrollable(p, letra);
  const l = vacio(), F = p.frente, H = p.alto, ple = p.modelo === 'PUERTAPLE', r = calcularPuerta(p);
  const hSaco = ple ? p.apilable.saco === 120 ? 12 : 11 : 12;
  const arriba = ple ? p.apilable.bolsillo / 2 : 3.5;
  rect(l, 'DISCO1', 0, -H + (ple && p.apilable.doble ? -13.5 : hSaco), F, H - hSaco + arriba + (ple && p.apilable.doble ? hSaco + 13.5 : 0));
  for (const y of [0, -H]) linea(l, 'referencias', 0, y, F, y);
  const tubos = ple ? alturasTubos(p) : [], obstaculos: Array<[number, number]> = [];
  if (ple) {
    linea(l, 'ROTULADOR', 0, -arriba, F, -arriba);
    linea(l, 'ROTULADOR', 0, -H + (p.apilable.doble ? -11.5 : hSaco + 2), F, -H + (p.apilable.doble ? -11.5 : hSaco + 2));
    linea(l, 'referencias', 0, -H, 0, -H + hSaco + 2);
    linea(l, 'referencias', F, -H, F, -H + hSaco);
    texto(l, 'E.T Ø30 mm', F / 2, arriba + 7, 8);
    cota(l, F, -arriba, F, arriba, F + 16, 'XERAL 5');
    for (const [i, e] of p.entradas.entries()) {
      const y = -H + (tubos[i] ?? e.altura), a = e.alto;
      linea(l, 'ejes', 0, y, F, y);
      if (!r.uniones.some(u => u.tubo === i + 1)) linea(l, 'borrar', 0, y + a / 2, F, y + a / 2);
      linea(l, 'ROTULADOR', 0, y - a / 2, F, y - a / 2); flecha(l, F / 2, y - a / 2, 180, -1);
      texto(l, `E.T Ø${e.diametro} mm`, F / 2, y, Math.min(8, a * .65));
      cota(l, 0, y - a / 2, 0, y + a / 2, -14);
      for (const h of e.huecos) huecoEntrada(l, h, y, a, F);
      obstaculos.push([y - a / 2, y + a / 2]);
    }
    const hitos = [0, ...tubos, H];
    hitos.slice(1).forEach((v, i) => cota(l, F, -H + hitos[i], F, -H + v, F + 34, i === hitos.length - 2 ? 'XERA 15' : 'XERAL'));
    cota(l, F, -p.apilable.cabecera, F, -H, F + 74, 'XERA 15');
    texto(l, 'AL CORTE', -7, -p.apilable.cabecera / 2, 8, 90);
    texto(l, 'AL CORTE', F + 7, -p.apilable.cabecera / 2, 8, 90);
    if (p.entradas.some(e => e.huecos.length > 2)) {
      const i = p.entradas.findIndex(e => e.huecos.length > 2), e = p.entradas[i], y = -H + tubos[i];
      const hs = [...e.huecos].sort((a, b) => a.x - b.x), hitos = [0, hs[0].x + hs[0].ancho,
        ...hs.slice(1, -1).flatMap(h => [h.x, h.x + h.ancho]), hs.at(-1)!.x, F];
      hitos.slice(1).forEach((x, j) => cota(l, hitos[j], y, x, y, y + 15, 'XERAL 5'));
      const yNota = -H + tubos[Math.min(tubos.length - 1, i + 4)] + 24;
      texto(l, 'CORTES EN ENTRADA DE TUBO (SOLO POR REVÉS)', F / 2, yNota, Math.min(8, F / 55));
      const destino = p.entradas.map((entrada, j) => ({ entrada, eje: -H + tubos[j] }))
        .filter(t => t.entrada.huecos.length > 2 && t.eje < yNota - 10).sort((a, b) => b.eje - a.eje)[0];
      if (destino) for (const h of destino.entrada.huecos) linea(l, 'texto', F / 2, yNota - 6, h.x + h.ancho / 2, destino.eje + destino.entrada.alto / 2);
    }
    // Detalles esquemáticos de AR2605036/4906: alturas de 13,5 y 11,5, redondeadas del DWG.
    for (const [x, ancho, alto, y] of [[10, 15, 13.5, -H + p.apilable.pie - 6.75], [10, 11, 13.5, -H],
      [F - 25, 15, 11.5, -H + p.apilable.pie - 5.75], [F - 25, 15, 13.5, -H]]) {
      const puntos = rect(l, 'referencia-1', x, y, ancho, alto); l.sombreados.push({ capa: 'referencia-1', puntos, solido: false });
    }
    for (const [i, ancho] of [10, 15].entries()) {
      const x = i ? F * .77 : F * .23, h = Math.min(5, F / 70);
      texto(l, `REFUERZO DE ${ancho}CM A 10CM DEL BORDE SOLDADO LONA DE 2MM`, x, -H + 27, h);
      linea(l, 'texto', x, -H + 22, i ? F - 17.5 : 17.5, -H + 8);
    }
  } else {
    linea(l, 'ROTULADOR', 0, -3.5, F, -3.5);
    linea(l, 'ROTULADOR', 0, -20, F, -20);
    linea(l, 'ROTULADOR', 0, -30, F, -30);
    linea(l, 'ROTULADOR', 0, -H + 14, F, -H + 14);
    linea(l, 'referencias', 0, 0, 0, -H + 12); linea(l, 'referencias', F, 0, F, -H + 12);
    linea(l, 'referencias', 0, -H, 0, -H + 14); linea(l, 'referencias', F, -H, F, -H + 12);
    texto(l, 'VARILLA NEGRA (4,5)', F / 2, 14, 7);
    texto(l, 'E.T POR DELANTE Y POR DETRÁS CORTADA DE 21', F / 2, -17, Math.min(5, F / 60));
    texto(l, 'E.T 5,5 cms MAS LARGAS EN CADA LADO', F / 2, -26, Math.min(5, F / 60));
    const d = p.autorreparable.distanciaEspaciador ?? 10, fin = -H + 14, centro = (fin - 30) / 2;
    for (const [x, giro, sx] of [[d, 90, -1], [F - d, 270, 1], ...(p.autorreparable.espaciadorCentral ? [[F / 2 - 1.9, 90, 1]] : [])]) {
      linea(l, 'ROTULADOR', x, -30, x, fin); flecha(l, x, centro, giro, sx);
    }
    if (p.autorreparable.espaciadorCentral) linea(l, 'referencias', F / 2, -30, F / 2, fin);
    const h = Math.min(8, (H - 44) / 35);
    for (const [x, giro] of [[-10, 270], [F + 10, 90]]) texto(l, 'CREMALLERA ESPECIAL PORTANOVA', x, centro, h, giro);
    for (const [x, giro] of [[d + 7, 270], [F - d - 7, 90], ...(p.autorreparable.espaciadorCentral ? [[F / 2 - 8, 90]] : [])])
      texto(l, 'ESPACIADOR ESPECIAL PORTANOVA', x, centro, h, giro);
    cota(l, 0, -H * .75, d, -H * .75, -H * .75, 'XERAL 5');
    cota(l, F - d, -H * .75, F, -H * .75, -H * .75, 'XERAL 5');
    cota(l, 0, -20, 0, -30, -15, 'XERAL 5');
    cota(l, F, -30, F, -H, F + 40);
    obstaculos.push([-30, 0]);
  }
  for (const u of r.uniones) {
    for (const signo of [-1, 1]) linea(l, ple ? 'DISCO1' : 'referencia-1', 0, -H + u.altura + signo * u.solape / 2, F, -H + u.altura + signo * u.solape / 2);
    if (!u.tubo) texto(l, `EMPATE ${num(u.solape)}cm`, F / 2, -H + u.altura + 8, 5, 0, 'referencia-1');
  }
  for (const v of p.ventanas) {
    redondeado(l, 'curv', v.x, -H + v.y, v.ancho, v.alto, v.radio);
    redondeado(l, 'corte (vent)', v.x - 2, -H + v.y - 2, v.ancho + 4, v.alto + 4, v.radioCristal);
    cota(l, v.x + 12, -H + v.y, v.x + 12, -H + v.y + v.alto, v.x + 12, 'XERAL 5');
    obstaculos.push([-H + v.y - 3, -H + v.y + v.alto + 3]);
  }
  for (const y of new Set(p.ventanas.map(v => v.y))) {
    const fila = p.ventanas.filter(v => v.y === y).sort((a, b) => a.x - b.x), ys = -H + y + fila[0].alto / 2;
    const xs = [0, ...fila.flatMap(v => [v.x, v.x + v.ancho]), F];
    xs.slice(1).forEach((x, i) => { if (x > xs[i]) cota(l, xs[i], ys, x, ys, ys, 'XERAL 5'); });
  }
  const limites = [arriba, ...r.uniones.map(u => -H + u.altura).sort((a, b) => b - a), -H + hSaco];
  limites.slice(1).forEach((y, i) => rotulos(l, p, `${letra}${i + 1}`, F / 2, y, limites[i], F, obstaculos, i === 0));
  cota(l, 0, arriba, F, arriba, arriba + 25, ple ? 'XERA 15' : 'XERAL');
  cota(l, 0, 0, 0, -H, -40, ple ? 'XERA 15' : 'XERAL');
  cota(l, F, -H, F, -H + (ple ? hSaco : 14), F + 12, 'XERAL 5');
  texto(l, ple && p.apilable.doble ? 'DOBLE SACO · SACO 80 INTEGRADO' : `SACO DE ${ple ? p.apilable.saco ?? 80 : 120}`, F / 2, -H - 12, Math.min(10, F / 25));
  if (ple) {
    texto(l, 'CERRAR E.T', F + 55, -H - 16, 8); texto(l, '2 CM MÁXIMO', F + 55, -H - 28, 8);
    linea(l, 'texto', F + 20, -H - 12, F, -H + hSaco);
  }
  if (r.bolsillo) rect(l, 'referencias', r.bolsillo.x, -H + r.bolsillo.y, r.bolsillo.ancho, r.bolsillo.alto);
  const abajo = dibujarSaco(l, p);
  return { lienzo: l, zona: { x0: -65, x1: F + 120, y0: abajo, y1: arriba + 50 } };
}

function dibujarCorteTaller(cortes: CortePuertas[], pedido: PedidoPuertas): { lienzo: Lienzo; zona: Zona } {
  const l = vacio(); let techo = 0, anchoMax = 250;
  const prioridad = (c: CortePuertas) => c.colocadas.every(t => t.pieza.clase === 'saco') ? 0
    : c.colocadas.every(t => t.pieza.clase === 'cristal') ? 1 : 2;
  for (const c of [...cortes].sort((a, b) => prioridad(a) - prioridad(b))) {
    const muestra = c.colocadas.every(t => ['saco', 'cristal'].includes(t.pieza.clase));
    if (muestra) {
      const unicas = new Map(c.colocadas.map(t => [t.pieza.id, t.pieza]));
      for (const p of unicas.values()) {
        const y = techo - p.alto;
        if (p.radio) redondeado(l, 'DISCO1', 0, y, p.ancho, p.alto, p.radio);
        else contorno(l, 'DISCO1', p.contorno.map(([x, v]): Punto => [x, y + v]));
        texto(l, `X${p.multiplicador ?? p.cantidad}`, p.ancho / 2, y + p.alto / 2, Math.min(20, p.alto / 2));
        for (const [x1, y1, x2, y2] of p.marcas) linea(l, 'ROTULADOR', x1, y + y1, x2, y + y2);
        // Los nombres a1/a2… los asigna corte.ts por material: no sustituirlos por el número interno.
        const t = c.colocadas.find(t => t.pieza.id === p.id)!;
        for (const m of c.entidades.textos.filter(m => m.capa === 'ROTULADOR')) {
          const u = (m.x - t.x) / 10, v = (m.y - t.y) / 10;
          const [xLocal, yLocal] = t.girada ? [v, p.alto - u] : [u, v];
          if (xLocal >= 0 && xLocal <= p.ancho && yLocal >= 0 && yLocal <= p.alto)
            texto(l, m.valor, xLocal, y + yLocal, m.h / 10, (m.giro ?? 0) - (t.girada ? 90 : 0), 'ROTULADOR');
        }
        texto(l, c.material + (c.opcion === 'principal' ? '' : ` · ALTERNATIVA ${c.opcion === 'saco-entero' ? 'SACO ENTERO' : 'SACO PARTIDO'}`), p.ancho / 2, techo + 15, 10);
        cota(l, 0, y, p.ancho, y, y - 30, 'XERA 20'); cota(l, 0, y, 0, techo, -35, 'XERA 20');
        anchoMax = Math.max(anchoMax, p.ancho); techo = y - 95;
      }
      continue;
    }
    const yc = techo - c.anchoRollo / 10;
    // Coordenadas y geometría exactamente como las entrega el bot: incluido el giro,
    // espaciadores, huecos, flechas y mininúmeros. El plano no vuelve a anidar.
    l.lineas.push(...c.entidades.lineas.map(a => ({ ...a, x1: a.x1 / 10, x2: a.x2 / 10, y1: yc + a.y1 / 10, y2: yc + a.y2 / 10 })));
    l.arcos.push(...c.entidades.arcos.map(a => ({ ...a, x: a.x / 10, y: yc + a.y / 10, r: a.r / 10 })));
    l.circulos.push(...c.entidades.circulos.map(a => ({ ...a, x: a.x / 10, y: yc + a.y / 10, r: a.r / 10 })));
    l.textos.push(...c.entidades.textos.filter(a => a.capa === 'ROTULADOR').map(a => ({ ...a, x: a.x / 10, y: yc + a.y / 10, h: a.h / 10 })));
    const primeros = new Set<string>();
    const panos = c.colocadas.filter(t => t.pieza.clase === 'pano').sort((a, b) => a.x - b.x || b.y - a.y);
    for (const t of c.colocadas) {
      const p = t.pieza, e = pedido.elementos.find(e => p.id.startsWith(`${e.id}:`));
      if (!e) continue;
      const letra = String.fromCharCode(65 + pedido.elementos.indexOf(e));
      const P = ([x, y]: Punto): Punto => [t.x / 10 + (t.girada ? p.alto - y : x), yc + t.y / 10 + (t.girada ? x : y)];
      const [x, y] = P([p.ancho / 2, p.alto / 2]);
      if (p.clase === 'pano') {
        const ids = calcularPuerta(e.input).piezas.filter(p => p.clase === 'pano').map(p => `${e.id}:${p.id}`);
        const primero = !primeros.has(e.id), valores = [`${letra}${ids.indexOf(p.id) + 1}`,
          ...(t === panos[0] ? ['REVÉS'] : []), ...(primero && e.input.of.trim() ? [e.input.of.trim()] : [])];
        const h = Math.min(20, p.alto / (valores.length * 2), p.ancho / 12);
        valores.forEach((v, i) => {
          const q = P([p.ancho / 2, p.alto / 2 + ((valores.length - 1) / 2 - i) * h * 1.5]);
          texto(l, v, ...q, h, t.girada ? 90 : 0);
        });
        primeros.add(e.id);
      } else texto(l, p.nombre.toUpperCase(), x, y, Math.min(8, p.alto / 2), t.girada ? 90 : 0);
    }
    texto(l, c.material, c.largo / 20, techo + 15, 10);
    cota(l, 0, yc, c.largo / 10, yc, yc - 30, 'XERA 20'); cota(l, 0, yc, 0, techo, -35, 'XERA 20');
    anchoMax = Math.max(anchoMax, c.largo / 10); techo = yc - 100;
  }
  return { lienzo: l, zona: { x0: -70, x1: anchoMax + 35, y0: techo + 45, y1: 45 } };
}

export function escribirPlanoTaller(pedido: PedidoPuertas, cortes: CortePuertas[], cabecera: { cliente: string; tecnico: string; revisor: string; fecha: string }) {
  const l = vacio(); let cursor = 0, abajo = 0, arriba = 0;
  for (const [i, e] of pedido.elementos.entries()) {
    const d = dibujarAlzadoTaller(e.input, String.fromCharCode(65 + i)), dx = i ? cursor - d.zona.x0 : 0;
    sumarLienzo(l, d.lienzo, dx); cursor = dx + d.zona.x1 + 60;
    abajo = Math.min(abajo, d.zona.y0); arriba = Math.max(arriba, d.zona.y1);
  }
  const zonaM = (z: Zona, x: number, y: number): Zona => ({ x0: x + z.x0 / 100, x1: x + z.x1 / 100, y0: y + z.y0 / 100, y1: y + z.y1 / 100 });
  const za = zonaM({ x0: -65, x1: cursor - 60, y0: abajo, y1: arriba }, 100, 100), corte = dibujarCorteTaller(cortes, pedido);
  let zc = zonaM(corte.zona, 110, 90), altoVista: number | undefined;
  const portanova = esClientePortanova(pedido, cabecera.cliente);
  if (portanova) {
    const proporcion = VENTANA_CORTE_PORTANOVA.alto / VENTANA_CORTE_PORTANOVA.ancho;
    altoVista = Math.max(zc.y1 - zc.y0, (zc.x1 - zc.x0) * proporcion);
    const cx = (zc.x0 + zc.x1) / 2;
    zc = { x0: cx - altoVista / proporcion / 2, x1: cx + altoVista / proporcion / 2, y0: zc.y1 - altoVista, y1: zc.y1 };
  }
  const unicos = (xs: string[]) => [...new Set(xs.filter(Boolean))].join(' / '), ps = pedido.elementos.map(e => e.input);
  return escribirDxfPlano({ ...lienzoAMetros(l, 100, 100), corte: lienzoAMetros(corte.lienzo, 110, 90), zonas: { toldos: za, corte: zc }, corteDerecho: true,
    bloques: [bloqueFlechaEnrollable], coloresModelo: { ejes: 23, borrar: 40, curv: 3, 'corte (vent)': 5 },
    ...(portanova ? presentacionPortanova(pedido, cabecera, { toldos: za, corte: zc }, altoVista) : {}),
  }, { pedido: pedido.orderCode, of: unicos(ps.map(p => p.of)), cliente: textoSeguro(cabecera.cliente), tecnico: textoSeguro(cabecera.tecnico),
    revisor: textoSeguro(cabecera.revisor), fecha: cabecera.fecha.split('-').reverse().map((v, i) => i === 2 ? v.slice(2) : v).join('/'), pagina: '1/1',
    material: textoSeguro(unicos(ps.map(p => `${p.material} ${p.color}`))), subtitulo: 'MEDIDAS EN CM · PUERTA DE LONA' }).dxf;
}
