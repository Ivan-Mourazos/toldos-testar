import { escribirDxfPlano } from '../domain/corteLona/presentacion.js';
import { anchoArial, textoSeguro } from '../domain/corteLona/texto.js';
import { alturasTubos, calcularPuerta } from './calcular.ts';
import { fusionarCortesPuertas } from './corte.ts';
import { esClientePortanova } from './clientePortanova.ts';
import { bajoDobleSaco, desnivelSuelo, pestanaDerecha, rotuloSaco, sacoApilable, sacoPuerta, sacoUtil } from './saco.ts';
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
function material(l: Lienzo, valor: string, ancho: number, y: number) {
  texto(l, valor, 0, y, Math.min(10, ancho * .95 / anchoArial(valor, 1)));
  Object.assign(l.textos.at(-1)!, { centrado: false, ancla: 4 });
}
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
    l.polilineas.push({ capa: 'CUTTER', cerrada: false,
      puntos: [[x, y + h.alto], [x + signo * (h.ancho - r), y + h.alto], [x + signo * h.ancho, y + h.alto - r],
        [x + signo * h.ancho, y + r], [x + signo * (h.ancho - r), y], [x, y]], curvas: [0, -signo * b, 0, -signo * b, 0, 0] });
  } else redondeado(l, 'CUTTER', h.x, y, h.ancho, h.alto, h.radio);
}

/** Rótulos centrados en el mayor espacio libre del paño, evitando entradas, ventanas y empates. */
function rotulos(l: Lienzo, p: Puerta, codigo: string, x: number, abajo: number, arriba: number, ancho: number,
  obstaculos: Array<[number, number]>, primero: boolean, opciones: { cantidad?: boolean; reves?: boolean; of?: boolean } = {}) {
  let huecos: Array<[number, number]> = [[abajo + 4, arriba - 4]];
  for (const [a, b] of obstaculos) huecos = huecos.flatMap(([y0, y1]) => b <= y0 || a >= y1 ? [[y0, y1] as [number, number]]
    : [[y0, Math.min(y1, a - 4)], [Math.max(y0, b + 4), y1]].filter(([u, v]) => v > u) as Array<[number, number]>);
  const libre = huecos.sort((a, b) => (b[1] - b[0]) - (a[1] - a[0]))[0] ?? [abajo, arriba];
  const cantidad = primero && opciones.cantidad !== false && p.cantidad > 1;
  const cantidadSeparada = cantidad && p.modelo === 'PUERTAPLE';
  const valores = [...(cantidad && !cantidadSeparada ? [`X${p.cantidad}`] : []), codigo,
    ...((opciones.reves ?? primero) ? ['REVÉS'] : []), ...((opciones.of ?? primero) && p.of.trim() ? [p.of.trim()] : [])];
  const alto = Math.max(1, libre[1] - libre[0]);
  const fila = p.modelo === 'PUERTAPLE' && valores.length > 1;
  const columna = ancho / valores.length;
  const h = Math.min(p.modelo === 'PUERTAUTO' ? 25 : 20, fila ? alto * (cantidadSeparada ? .3 : .65) : alto / (valores.length * 1.5 + .5),
    ...valores.map(v => (fila ? columna : ancho) * .82 / anchoArial(v, 1)));
  valores.forEach((v, i) => texto(l, v, fila ? x - ancho / 2 + columna * (i + .5) : x,
    (libre[0] + libre[1]) / 2 + (fila ? cantidadSeparada ? -h * .65 : 0 : ((valores.length - 1) / 2 - i) * h * 1.5), h));
  if (cantidadSeparada) texto(l, `X${p.cantidad}`, x, (libre[0] + libre[1]) / 2 + h * .8, h * .8);
}

function dibujarSaco(l: Lienzo, p: Puerta) {
  const destino = l, desnivel = desnivelSuelo(p), derecha = pestanaDerecha(p);
  if (desnivel || derecha) l = vacio();
  const ple = p.modelo === 'PUERTAPLE', doble = ple && p.apilable.doble;
  const w = doble ? p.frente - 6 : p.frente, h = doble ? 37 : sacoPuerta(p).corte;
  const pestaña = ple ? doble ? 12 : 10 : 0, hp = ple ? doble ? 14 : sacoApilable(p).altoPestana : 0;
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
    const tx = 35, ht = Math.min(7, w / 45);
    for (const [cara, tipo, yc, borde, bx] of [
      ['REVÉS', 'BRAVO', ys + 17, ys - 2, -pestaña + 5],
      ['DERECHO', 'SUAVE', ys - h - 17, ys - h + 2, 5.5],
    ] as const) {
      texto(l, `COSER VELCRO ${cara}`, tx + 28, yc + ht * .7, ht);
      texto(l, `DE 5 ${tipo}`, tx + 28, yc - ht * .7, ht);
      linea(l, 'texto', tx - 2, yc, bx, borde);
    }
    cota(l, 0, ys - h + 2, 3, ys - h + 2, ys - h - 10);
    if (doble) texto(l, 'CENTRAR EL ENVOLTORIO · DOBLAR A LA MITAD · SOLDAR 2 CM', w / 2, ys + 42, Math.min(8, w / 70));
  } else {
    for (const x of [0, w - 3]) {
      sombrear(x, ys - h / 2, 3, h / 2, true); sombrear(x, ys - h, 3, h / 2, false);
      const tx = x === 0 ? w * .23 : w * .77;
      const ht = Math.min(7, w / 55);
      texto(l, 'VELCRO BRAVO REVÉS DE 3', tx, ys + 10, ht);
      texto(l, 'VELCRO SUAVE REVÉS DE 3', tx, ys - h - 10, ht);
      linea(l, 'texto', tx, ys + 6, x + 1.5, ys - h / 4);
      linea(l, 'texto', tx, ys - h - 6, x + 1.5, ys - h * 3 / 4);
    }
    texto(l, 'CREMALLERA SOLDADA HASTA MITAD DE SACO', w / 2, ys - h - 32, Math.min(10, w / 45));
  }
  const material = rotuloSaco(p);
  texto(l, material, w / 2, ys - h / 2, Math.min(10, w / 40));
  cota(l, 0, ys - h, w, ys - h, ys - h / 2, 'XERAL 5');
  cota(l, 0, ys - h, 0, ys, -25);
  if (derecha) {
    // Pestaña a la derecha: el mismo dibujo dado la vuelta; los textos van centrados y no se espejan.
    const x = (v: number) => w - v;
    for (const a of l.lineas) { a.x1 = x(a.x1); a.x2 = x(a.x2); }
    for (const a of l.textos) a.x = x(a.x);
    for (const a of l.sombreados) a.puntos = a.puntos.map(([u, v]): Punto => [x(u), v]);
    for (const a of l.cotas) {
      if (a.giro === 90) { a.x1 = x(a.x1); a.x2 = x(a.x2); a.d = x(a.d); }
      else { [a.x1, a.x2] = [x(a.x2), x(a.x1)]; [a.y1, a.y2] = [a.y2, a.y1]; }
    }
  }
  if (desnivel) {
    const mover = (x:number,y:number) => y + desnivel*x/p.frente-Math.max(0,desnivel);
    for (const a of l.lineas) { a.y1=mover(a.x1,a.y1); a.y2=mover(a.x2,a.y2); }
    for (const a of l.textos) a.y=mover(a.x,a.y);
    for (const a of l.sombreados) a.puntos=a.puntos.map(([x,y])=>[x,mover(x,y)]);
    for (const a of l.cotas) {
      a.y1=mover(a.x1,a.y1); a.y2=mover(a.x2,a.y2);
      a.valor=Math.hypot(a.x2-a.x1,a.y2-a.y1);
    }
    texto(l, `LARGO DIAGONAL ${num(Math.hypot(w,desnivel*w/p.frente))} CM · CABEZAS VERTICALES`, w/2,ys-h-Math.abs(desnivel)-35,7);
  }
  if (l !== destino) sumarLienzo(destino,l,0);
  return ys - h - 48 - Math.abs(desnivel);
}

export function dibujarAlzadoTaller(p: Puerta, letra: string): { lienzo: Lienzo; zona: Zona } {
  if (p.modelo === 'PUERTAENR') return dibujarAlzadoEnrollable(p, letra);
  const l = vacio(), F = p.frente, H = p.alto, ple = p.modelo === 'PUERTAPLE', r = calcularPuerta(p);
  const desnivel = desnivelSuelo(p), altoDerecho = H-desnivel;
  // El paño arranca en el rematado del saco; el doble saco, más abajo, porque el de 80 sale del propio paño.
  const hSaco = sacoPuerta(p).rematado, bajoDoble = ple && p.apilable.doble ? bajoDobleSaco(p) : 0;
  const arriba = ple ? p.apilable.bolsillo / 2 : 3.5;
  rect(l, 'DISCO1', 0, -H + (ple && p.apilable.doble ? bajoDoble : hSaco), F, H - hSaco + arriba + (ple && p.apilable.doble ? hSaco - bajoDoble : 0));
  for (const y of [0, -H]) linea(l, 'referencias', 0, y, F, y);
  const tubos = ple ? alturasTubos(p) : [], obstaculos: Array<[number, number]> = [];
  if (ple) {
    linea(l, 'ROTULADOR', 0, -arriba, F, -arriba);
    linea(l, 'ROTULADOR', 0, -H + (p.apilable.doble ? bajoDoble + 2 : hSaco + 2), F, -H + (p.apilable.doble ? bajoDoble + 2 : hSaco + 2));
    linea(l, 'referencias', 0, -H, 0, -H + hSaco + 2);
    linea(l, 'referencias', F, -H, F, -H + hSaco);
    texto(l, 'E.T Ø30 mm', F / 2, arriba + 7, 8);
    cota(l, F, -arriba, F, arriba, F + 16, 'XERAL 5');
    for (const [i, e] of p.entradas.entries()) {
      const y = -H + (tubos[i] ?? e.altura), a = e.alto;
      linea(l, 'ejes', 0, y, F, y);
      if (!r.uniones.some(u => u.tubo === i + 1)) linea(l, 'borrar', 0, y + a / 2, F, y + a / 2);
      if (!r.uniones.some(u => u.tubo === i + 1)) linea(l, 'ROTULADOR', 0, y - a / 2, F, y - a / 2);
      flecha(l, F / 2, y - a / 2, 180, -1);
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
      hitos.slice(1).forEach((x, j) => {
        // Los huecos iguales interiores comparten la cota de ancho de los dos extremos.
        const repetido = hs.slice(2, -2).some(h => h.x === hitos[j] && h.x + h.ancho === x && h.ancho === hs[1].ancho);
        if (!repetido) cota(l, hitos[j], y, x, y, y + 15, 'XERAL 5');
      });
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
      const x = i ? F - 90 : 90, h = Math.min(6, F / 70);
      texto(l, `REFUERZO DE ${ancho} CM A 10 CM DEL BORDE`, x, -H + 31, h);
      texto(l, 'SOLDADO · LONA DE 2 MM', x, -H + 31 - h * 1.4, h);
      linea(l, 'texto', i ? x + 35 : x - 35, -H + 24 - h, i ? F - 17.5 : 17.5, -H + 13.5);
    }
  } else {
    linea(l, 'ROTULADOR', 0, -3.5, F, -3.5);
    linea(l, 'ROTULADOR', 0, -20, F, -20);
    linea(l, 'ROTULADOR', 0, -30, F, -30);
    linea(l, 'ROTULADOR', 0, -H + 14, F, -H + 14);
    linea(l, 'referencias', 0, -H, 0, -H + 14); linea(l, 'referencias', F, -H, F, -H + 12);
    texto(l, 'VARILLA NEGRA (4,5)', F / 2, 14, 7);
    texto(l, 'E.T POR DELANTE Y POR DETRÁS CORTADA DE 21', F / 2, -17, Math.min(7, F / 45));
    texto(l, 'E.T 5,5 cms MAS LARGAS EN CADA LADO', F / 2, -26, Math.min(7, F / 40));
    texto(l, 'AL CORTE', -7, -60, 8, 90);
    texto(l, 'AL CORTE', F + 7, -60, 8, 90);
    const d = p.autorreparable.distanciaEspaciador ?? 10, fin = -H + 14, centro = (fin - 30) / 2;
    for (const [x, giro, sx] of [[d, 90, -1], [F - d, 270, 1], ...(p.autorreparable.espaciadorCentral ? [[F / 2 - 1.9, 90, 1]] : [])]) {
      linea(l, 'ROTULADOR', x, -30, x, fin); flecha(l, x, centro, giro, sx);
    }
    if (p.autorreparable.espaciadorCentral) linea(l, 'referencias', F / 2, -30, F / 2, fin);
    const h = Math.min(8, (H - 44) / 35);
    // El texto central se centra entre cabecera y bajo; las flechas se apartan a un lado.
    if (p.autorreparable.espaciadorCentral) {
      const f = l.inserciones.at(-1)!; f.y = centro + Math.min(45, (H - 44) / 4);
    }
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
    if (!u.tubo) {
      const anchoLibre = !ple && p.autorreparable.espaciadorCentral ? F / 2 - 40 : F - 40;
      const nota = `EMPATE ${num(u.solape)} CM`, h = Math.min(5, anchoLibre * .8 / anchoArial(nota, 1));
      texto(l, nota, !ple && p.autorreparable.espaciadorCentral ? F / 4 : F / 2, -H + u.altura + 8, h, 0, 'referencia-1');
    }
    obstaculos.push([-H + u.altura - 4, -H + u.altura + 15]);
  }
  for (const v of p.ventanas) {
    redondeado(l, 'curv', v.x, -H + v.y, v.ancho, v.alto, v.radio);
    redondeado(l, 'corte (vent)', v.x - 2, -H + v.y - 2, v.ancho + 4, v.alto + 4, v.radioCristal);
    obstaculos.push([-H + v.y - 3, -H + v.y + v.alto + 3]);
  }
  for (const y of new Set(p.ventanas.map(v => v.y))) {
    const fila = p.ventanas.filter(v => v.y === y).sort((a, b) => a.x - b.x), ys = -H + y + fila[0].alto / 2;
    const xs = [0, ...fila.flatMap(v => [v.x, v.x + v.ancho]), F];
    xs.slice(1).forEach((x, i) => { if (x > xs[i]) cota(l, xs[i], ys, x, ys, ys, 'XERAL 5'); });
    for (const [i, v] of fila.entries()) {
      const extremo = i === fila.length - 1 || ple && i === 0;
      if (extremo || v.alto !== fila[0].alto) cota(l, v.x + (i ? v.ancho - 12 : 12), -H + v.y,
        v.x + (i ? v.ancho - 12 : 12), -H + v.y + v.alto, v.x + (i ? v.ancho - 12 : 12), 'XERAL 5');
    }
    if (!ple) {
      const v = fila.at(-1)!, x = v.x + v.ancho - 8;
      cota(l, x, -H, x, -H + v.y, x, 'XERAL 5');
    }
  }
  const limites = [arriba, ...r.uniones.map(u => -H + u.altura).sort((a, b) => b - a), -H + hSaco];
  const central = !ple && p.autorreparable.espaciadorCentral;
  limites.slice(1).forEach((y, i) => rotulos(l, p, `${letra}${i + 1}`, central ? F * .75 : F / 2, y, limites[i], central ? F / 2 - 20 : F, obstaculos, i === 0));
  cota(l, 0, arriba, F, arriba, arriba + 25, ple ? 'XERA 15' : 'XERAL');
  cota(l, 0, 0, 0, -H, -40, ple ? 'XERA 15' : 'XERAL');
  cota(l, F, -H, F, -H + (ple ? hSaco : hSaco + 2), F + 12, 'XERAL 5');
  texto(l, ple && p.apilable.doble ? 'DOBLE SACO · SACO 80 INTEGRADO' : `SACO DE ${sacoUtil(p) ?? (ple ? 80 : 120)}`, F / 2, -H - 12, Math.min(10, F / 25));
  if (ple) {
    texto(l, 'CERRAR E.T', F + 55, -H - 16, 8); texto(l, '2 CM MÁXIMO', F + 55, -H - 28, 8);
    linea(l, 'texto', F + 20, -H - 12, F, -H + hSaco);
  }
  if (r.bolsillo) rect(l, 'referencias', r.bolsillo.x, -H + r.bolsillo.y, r.bolsillo.ancho, r.bolsillo.alto);
  // El alzado conserva horizontales todas las entradas y solo desplaza el bajo.
  if (desnivel) {
    const bajoCorte = -H+(p.apilable.doble?bajoDoble:hSaco);
    const soldadura = -H+(p.apilable.doble?bajoDoble+2:hSaco+2);
    for (const a of l.lineas) {
      const inferior = a.capa==='DISCO1' && (Math.abs(a.y1-bajoCorte)<.001||Math.abs(a.y2-bajoCorte)<.001);
      const referencia = a.capa==='referencias' && (a.y1===-H||a.y2===-H);
      const marca = a.capa==='ROTULADOR' && Math.abs(a.y1-soldadura)<.001 && Math.abs(a.y2-soldadura)<.001;
      if(inferior) {
        if(Math.abs(a.y1-bajoCorte)<.001) a.y1+=desnivel*a.x1/F;
        if(Math.abs(a.y2-bajoCorte)<.001) a.y2+=desnivel*a.x2/F;
      } else if(referencia||marca) { a.y1+=desnivel*a.x1/F; a.y2+=desnivel*a.x2/F; }
    }
    // La primera cota derecha empieza en su bajo; el resto de la cadena no cambia.
    for (const a of l.cotas) {
      if(a.x1===F&&a.x2===F) {
        if(a.y1===-H) a.y1=-altoDerecho;
        if(a.y2===-H) a.y2=-altoDerecho;
        if(a.d===F+12) {a.y1=-altoDerecho;a.y2=-altoDerecho+hSaco;}
        a.valor=Math.abs(a.y2-a.y1);
      }
      if(a.x1===0&&a.x2===0&&a.d===-40) a.d=-92;
    }
    const hitos=[0,...tubos,H];
    hitos.slice(1).forEach((v,i)=>cota(l,0,-H+hitos[i],0,-H+v,-60,i===hitos.length-2?'XERA 15':'XERAL'));
    cota(l,F,0,F,-altoDerecho,F+112,'XERA 15');
  }
  const abajo = dibujarSaco(l, p);
  for (const pieza of r.piezas.filter(p => p.origenAlzado)) {
    const [x, y] = pieza.origenAlzado!;
    for (const m of pieza.unionesCorte ?? []) texto(l, `${letra.toLowerCase()}${m.numero}`, x + m.x, -H + y + m.y, 1, m.giro ?? 0, 'ROTULADOR');
  }
  let sx = ple ? -(p.apilable.doble ? 12 : 10) : 0;
  const sacos = r.alternativasSaco?.partido ?? r.piezas.filter(p => p.clase === 'saco');
  const ys = -H - (ple ? 49.0879644349 : 40);
  for (const pieza of sacos) {
    for (const m of pieza.unionesCorte ?? []) texto(l, `${letra.toLowerCase()}${m.numero}`, sx + m.x, ys - m.y, 1, m.giro ?? 0, 'ROTULADOR');
    sx += pieza.ancho - 2;
  }
  return { lienzo: l, zona: { x0: desnivel ? -116 : -65, x1: F + (desnivel ? 150 : 120), y0: abajo, y1: arriba + 50 } };
}

function dibujarCorteTaller(cortes: CortePuertas[], pedido: PedidoPuertas): { lienzo: Lienzo; zona: Zona } {
  const l = vacio(); let techo = 0, anchoMax = 250;
  const prioridad = (c: CortePuertas) => c.colocadas.every(t => t.pieza.clase === 'saco') ? 0
    : c.colocadas.every(t => t.pieza.clase === 'cristal') ? 1 : 2;
  for (const c of [...cortes].sort((a, b) => prioridad(a) - prioridad(b))) {
    const muestra = c.colocadas.every(t => ['saco', 'cristal'].includes(t.pieza.clase));
    if (muestra) {
      const unicas = new Map(c.colocadas.map(t => [t.pieza.id, t.pieza]));
      const lista = [...unicas.values()];
      for (const [i, p] of lista.entries()) {
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
        const anterior = lista[i - 1], siguiente = lista[i + 1];
        const mismaPuerta = (otra: typeof p | undefined) => otra?.id.split(':')[0] === p.id.split(':')[0];
        if (c.opcion !== 'saco-partido' || !mismaPuerta(anterior)) material(l,
          (p.sacoDiagonalesAmarillas ? 'SACO 900 GR AMARILLO/NEGRO' : c.material) + (c.opcion === 'principal' ? '' : ` · ALTERNATIVA ${c.opcion === 'saco-entero' ? 'SACO ENTERO' : 'SACO PARTIDO'}`),
          p.ancho, techo + 15);
        cota(l, 0, y, p.ancho, y, c.opcion === 'saco-partido' && mismaPuerta(siguiente) ? techo + 35 : y - 30, 'XERA 20');
        cota(l, 0, y, 0, techo, -35, 'XERA 20');
        anchoMax = Math.max(anchoMax, p.ancho); techo = y - (c.opcion === 'saco-partido' && mismaPuerta(siguiente) ? 0 : 95);
      }
      if (c.opcion === 'saco-partido') fusionarCortesPuertas(l);
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
      const P = ([x, y]: Punto): Punto => [t.x / 10 + (t.girada ? p.alto - y : x), yc + t.y / 10 + (t.girada ? x : y)];
      if (!e) {
        // Los sacos de stock tienen su propia OF y no pertenecen a una puerta del pedido.
        for (const m of c.entidades.textos.filter(m => m.capa !== 'ROTULADOR' && m.x > t.x && m.y > t.y
          && m.x < t.x + (t.girada ? p.alto : p.ancho) * 10 && m.y < t.y + (t.girada ? p.ancho : p.alto) * 10))
          l.textos.push({ ...m, x: m.x / 10, y: yc + m.y / 10, h: m.h / 10 });
        continue;
      }
      const letra = String.fromCharCode(65 + pedido.elementos.indexOf(e));
      const [x, y] = P([p.ancho / 2, p.alto / 2]);
      if (p.clase === 'pano') {
        const piezas = calcularPuerta(e.input).piezas.filter(p => p.clase === 'pano');
        if (e.input.modelo !== 'PUERTAENR') piezas.reverse();
        const ids = piezas.map(p => `${e.id}:${p.id}`);
        const primero = !primeros.has(e.id), local = vacio();
        const obstaculos: Array<[number, number]> = [...p.huecos.map(h => [h.y, h.y + h.alto] as [number, number]),
          ...p.marcas.filter(m => m[1] === m[3] && Math.abs(m[2] - m[0]) > p.ancho / 2).map(m => [m[1] - 2, m[1] + 2] as [number, number])];
        const central = e.input.modelo === 'PUERTAUTO' && e.input.autorreparable.espaciadorCentral;
        rotulos(local, e.input, `${letra}${ids.indexOf(p.id) + 1}`, central ? p.ancho * .75 : p.ancho / 2, 0, p.alto,
          central ? p.ancho / 2 - 20 : p.ancho, obstaculos, primero, { cantidad: false, reves: t === panos[0], of: primero });
        for (const v of local.textos) {
          const q = P([v.x, v.y]); l.textos.push({ ...v, x: q[0], y: q[1], giro: t.girada ? 90 : 0 });
        }
        primeros.add(e.id);
      } else texto(l, p.sacoDiagonalesAmarillas ? 'SACO AMARILLO/NEGRO' : p.nombre.toUpperCase(), x, y, Math.min(8, p.alto / 2), t.girada ? 90 : 0);
    }
    material(l, c.material, c.largo / 10, techo + 15);
    // El ancho acotado es el del rollo: los orillos se representan como referencia, nunca como corte.
    linea(l, 'referencias', 0, yc, c.largo / 10, yc);
    linea(l, 'referencias', 0, techo, c.largo / 10, techo);
    cota(l, 0, yc, c.largo / 10, yc, yc - 30, 'XERA 20'); cota(l, 0, yc, 0, techo, -35, 'XERA 20');
    anchoMax = Math.max(anchoMax, c.largo / 10); techo = yc - 100;
  }
  return { lienzo: l, zona: { x0: -70, x1: anchoMax + 35, y0: techo + 45, y1: 45 } };
}

export function escribirPlanoTaller(pedido: PedidoPuertas, cortes: CortePuertas[], cabecera: { cliente: string; tecnico: string; revisor: string; fecha: string }) {
  const l = vacio(); let cursor = 0, abajo = 0, arriba = 0, izquierda = -65;
  for (const [i, e] of pedido.elementos.entries()) {
    const d = dibujarAlzadoTaller(e.input, String.fromCharCode(65 + i)), dx = i ? cursor - d.zona.x0 : 0;
    sumarLienzo(l, d.lienzo, dx); cursor = dx + d.zona.x1 + 60;
    izquierda = Math.min(izquierda,dx+d.zona.x0);
    let suelo = d.zona.y0;
    if (e.input.modelo !== 'PUERTAENR' && e.input.observaciones.trim()) {
      let actual = '';
      const lineas: string[] = [], ancho = d.zona.x1 - d.zona.x0;
      for (const palabra of textoSeguro(`OBSERVACIONES: ${e.input.observaciones}`).split(/\s+/)) {
        if (actual && anchoArial(`${actual} ${palabra}`, 6) > ancho) { lineas.push(actual); actual = palabra; }
        else actual += (actual ? ' ' : '') + palabra;
      }
      if (actual) lineas.push(actual);
      lineas.forEach((v, j) => texto(l, v, dx + (d.zona.x0 + d.zona.x1) / 2, suelo - 12 - j * 10, 6));
      suelo -= lineas.length * 10 + 20;
    }
    abajo = Math.min(abajo, suelo); arriba = Math.max(arriba, d.zona.y1);
  }
  const zonaM = (z: Zona, x: number, y: number): Zona => ({ x0: x + z.x0 / 100, x1: x + z.x1 / 100, y0: y + z.y0 / 100, y1: y + z.y1 / 100 });
  const za = zonaM({ x0: izquierda, x1: cursor - 60, y0: abajo, y1: arriba }, 100, 100), corte = dibujarCorteTaller(cortes, pedido);
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
