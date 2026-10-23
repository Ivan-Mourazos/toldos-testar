import { escribirDxfPlano } from '../domain/corteLona/presentacion.js';
import { anchoArial, textoSeguro } from '../domain/corteLona/texto.js';
import { alturasTubos, calcularPuerta } from './calcular.ts';
import { fusionarCortesPuertas } from './corte.ts';
import { esClientePortanova } from './clientePortanova.ts';
import { bajoDobleSaco, desnivelSuelo, pestanaDerecha, rotuloSaco, sacoApilable, sacoPuerta, sacoUtil } from './saco.ts';
import { bloqueFlechaEnrollable, dibujarAlzadoEnrollable, ENTRE_PUERTAS, hojasPuertas, lienzoAMetros, origenCorte, sumarLienzo, type LienzoEnrollable } from './planoEnrollable.ts';
import { presentacionPortanova, VENTANA_CORTE_PORTANOVA } from './plantillaPortanova.ts';
import type { CortePuertas, Hueco, PedidoPuertas, Puerta, Punto } from './tipos.ts';
import { centroLibre } from './unionesCorte.ts';

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
  if (desnivel) {
    // Iván, 23/10/2026 (AR2605035): sin cota del largo y el material entre la raya de arriba
    // y la del medio, paralelo a ellas.
    const banda = h / 2 - 2;
    texto(l, material, w / 2, ys - 2 - banda / 2, Math.min(10, w / 40, banda * .6), Math.atan(desnivel / p.frente) * 180 / Math.PI);
  } else {
    texto(l, material, w / 2, ys - h / 2, Math.min(10, w / 40));
    cota(l, 0, ys - h, w, ys - h, ys - h / 2, 'XERAL 5');
  }
  cota(l, 0, ys - h, 0, ys, -25);
  if (derecha) {
    // Pestaña a la derecha: el mismo dibujo dado la vuelta; los textos van centrados y no se espejan.
    const x = (v: number) => w - v;
    for (const a of l.lineas) { a.x1 = x(a.x1); a.x2 = x(a.x2); }
    for (const a of l.textos) a.x = x(a.x);
    // Las notas de los velcros, 20 más hacia dentro para no chocar con la cota de la pestaña (AR2605035).
    for (const a of l.textos) if (/^(COSER VELCRO|DE 5 )/.test(a.valor)) a.x -= 20;
    for (const a of l.lineas) if (a.capa === 'texto') a.x1 -= 20;
    for (const a of l.sombreados) a.puntos = a.puntos.map(([u, v]): Punto => [x(u), v]);
    for (const a of l.cotas) {
      if (a.giro === 90) { a.x1 = x(a.x1); a.x2 = x(a.x2); a.d = x(a.d); }
      else { [a.x1, a.x2] = [x(a.x2), x(a.x1)]; [a.y1, a.y2] = [a.y2, a.y1]; }
    }
  }
  if (desnivel) {
    const mover = (x:number,y:number) => y + desnivel*x/p.frente-Math.max(0,desnivel);
    for (const a of l.lineas) { a.y1=mover(a.x1,a.y1); a.y2=mover(a.x2,a.y2); }
    // Los de fuera del saco, con la punta del texto que más se acerca a él: con la pendiente, el centro no basta y
    // los velcros pisaban la raya (Iván, 23/10/2026, AR2605035).
    for (const a of l.textos) {
      const m = anchoArial(a.valor, a.h) / 2, puntas = [mover(a.x - m, a.y), mover(a.x + m, a.y)];
      a.y = a.y > ys ? Math.max(...puntas) : a.y < ys - h ? Math.min(...puntas) : mover(a.x, a.y);
    }
    for (const a of l.sombreados) a.puntos=a.puntos.map(([x,y])=>[x,mover(x,y)]);
    for (const a of l.cotas) {
      // La del largo, alineada con el lado diagonal: mide lo que de verdad se corta (Iván, 23/10/2026, AR2605035).
      if (a.giro === 0) Object.assign(a, { alineada: true, desvio: a.d - a.y1 });
      a.y1=mover(a.x1,a.y1); a.y2=mover(a.x2,a.y2);
      a.valor=Math.hypot(a.x2-a.x1,a.y2-a.y1);
    }
    // Sin el texto «LARGO DIAGONAL … · CABEZAS VERTICALES»: sobraba (Iván, 23/10/2026, AR2605035).
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
    hitos.slice(1).forEach((v, i) => cota(l, F, -H + hitos[i], F, -H + v, F + 30, i === hitos.length - 2 ? 'XERA 15' : 'XERAL'));
    cota(l, F, -p.apilable.cabecera, F, -H, F + 54, 'XERA 15');
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
      // Con el bajo inclinado, los del bajo suben con él para no salirse de la lona (AR2605035).
      const sube = y === -H ? Math.max(desnivel * x / F, desnivel * (x + ancho) / F) : 0;
      const puntos = rect(l, 'referencia-1', x, y + sube, ancho, alto); l.sombreados.push({ capa: 'referencia-1', puntos, solido: false });
    }
    for (const [i, ancho] of [10, 15].entries()) {
      // Cada uno en su mitad, sin pisarse en las puertas estrechas (Iván, 23/10/2026: «adaptarlos mejor al hueco»).
      const borde = Math.min(90, F / 4), lineas = [`REFUERZO DE ${ancho} CM A 10 CM DEL BORDE`, 'SOLDADO · LONA DE 2 MM'];
      let x = i ? F - borde : borde, h = Math.min(6, F / 70, (2 * borde - 10) / anchoArial(lineas[0], 1)), yc = 31 - h * .7;
      // Si el bolsillo cae en este lado, el texto se aparta para no pisarlo (AR2605035).
      const b = r.bolsillo, m = anchoArial(lineas[0], h) / 2;
      if (b && (i ? b.x > F / 2 : b.x + b.ancho < F / 2)) x = i ? Math.min(x, b.x - 3 - m) : Math.max(x, b.x + b.ancho + 3 + m);
      {
        // Iván, 23/10/2026 (AR2605035): en el hueco entre la raya de soldar el saco (inclinada si el suelo lo está) y
        // la primera E.T.; más pequeños si no caben, sin pisar la raya en ningún punto del texto.
        const techo = tubos[0] - (p.entradas[0]?.alto ?? 12) / 2 - 1.5;
        const suelo = (hh: number) => { const m = anchoArial(lineas[0], hh) / 2;
          return hSaco + 2 + 1.5 + Math.max(desnivel * (x - m) / F, desnivel * (x + m) / F); };
        while (h > 2.5 && techo - suelo(h) < h * 2.6) h -= .25;
        yc = (techo + suelo(h)) / 2;
      }
      texto(l, lineas[0], x, -H + yc + h * .7, h);
      texto(l, lineas[1], x, -H + yc - h * .7, h);
      // Dos rayas desde la esquina de fuera del texto, una a cada refuerzo: el de la primera E.T. y el del bajo, que
      // sube con el desnivel (Iván, 23/10/2026: «faltan las rayas que indican a los refuerzos»).
      const [x0, x1] = i ? [F - 25, F - 10] : [10, 21], fuera = x + (i ? 1 : -1) * anchoArial(lineas[0], h) / 2, cx = i ? F - 17.5 : 17.5;
      linea(l, 'texto', fuera, -H + yc - h * 1.3, cx, -H + 13.5 + Math.max(desnivel * x0 / F, desnivel * x1 / F));
      linea(l, 'texto', fuera, -H + yc + h * 1.3, cx, -H + p.apilable.pie - (i ? 5.75 : 6.75));
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
  // Con el suelo inclinado, paralelo al bajo de la puerta (Iván, 23/10/2026, AR2605035).
  texto(l, ple && p.apilable.doble ? 'DOBLE SACO · SACO 80 INTEGRADO' : `SACO DE ${sacoUtil(p) ?? (ple ? 80 : 120)}`, F / 2, -H - 12 + desnivel / 2,
    Math.min(10, F / 25), Math.atan(desnivel / F) * 180 / Math.PI);
  if (ple) {
    // Del lado contrario a la pestaña: con la pestaña a la derecha, a la izquierda (Iván, 23/10/2026, AR2605035).
    const xc = pestanaDerecha(p) ? -55 : F + 55, xr = pestanaDerecha(p) ? -20 : F + 20;
    texto(l, 'CERRAR E.T', xc, -H - 16, 8); texto(l, '2 CM MÁXIMO', xc, -H - 28, 8);
    linea(l, 'texto', xr, -H - 12, pestanaDerecha(p) ? 0 : F, -H + hSaco);
  }
  if (r.bolsillo) {
    rect(l, 'referencias', r.bolsillo.x, -H + r.bolsillo.y, r.bolsillo.ancho, r.bolsillo.alto);
    // Una nota corta con su raya para que se vea que lleva bolsillo (Iván, 23/10/2026), justo bajo el bajo.
    const xb = r.bolsillo.x + r.bolsillo.ancho / 2, yb = -H + desnivel * xb / F;
    texto(l, 'BOLSILLO', xb, yb - 8, 5);
    linea(l, 'texto', xb, yb - 5.5, xb, -H + r.bolsillo.y);
  }
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
      if(a.x1===0&&a.x2===0&&a.d===-40) a.d=-56;
    }
    // A la izquierda solo se añade el pie, que es lo que cambia con el fondo en caída; los tramos van en la cadena de
    // la derecha, como en la apilable sin desnivel (Iván, 23/10/2026, AR2605035).
    cota(l,0,-H,0,-H+tubos[0],-34,'XERA 15');
    cota(l,F,0,F,-altoDerecho,F+78,'XERA 15');
  }
  const abajo = dibujarSaco(l, p);
  for (const pieza of r.piezas.filter(p => p.origenAlzado)) {
    const [x, y] = pieza.origenAlzado!;
    for (const m of pieza.unionesCorte ?? []) texto(l, `${letra.toLowerCase()}${m.numero}`, x + m.x, -H + y + m.y, 1, m.giro ?? 0, 'ROTULADOR');
  }
  // El dibujo del saco es el saco entero: las marcas de unión del saco partido («a2») solo van en su corte
  // (Iván, 23/10/2026: «unas marcas de rotulador que no tienen sentido»).
  // Cotas verticales más juntas para que la puerta salga más grande en la hoja (Iván, 23/10/2026).
  const izquierdaZona = Math.min(desnivel ? -72 : -60, ple && pestanaDerecha(p) ? -60 - anchoArial('2 CM MÁXIMO', 8) / 2 : 0);
  return { lienzo: l, zona: { x0: izquierdaZona, x1: F + (desnivel ? 100 : 82), y0: abajo, y1: arriba + 50 } };
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
        if (p.radio) {
          // Como en el corte del bot: los tramos rectos en DISCO1 y los radios de las esquinas en CUTTER (Iván, 23/10/2026).
          const r = Math.min(p.radio, p.ancho / 2, p.alto / 2), [w, h] = [p.ancho, p.alto];
          for (const [x1, y1, x2, y2] of [[r, 0, w - r, 0], [w, r, w, h - r], [w - r, h, r, h], [0, h - r, 0, r]]) linea(l, 'DISCO1', x1, y + y1, x2, y + y2);
          for (const [cx, cy, desde] of [[r, r, 180], [w - r, r, 270], [w - r, h - r, 0], [r, h - r, 90]]) l.arcos.push({ capa: 'CUTTER', x: cx, y: y + cy, r, desde, hasta: desde + 90 });
        }
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
        // Las dos mitades pegadas: la cota de la segunda, a su derecha, para que no se pisen (AR2605035).
        if (c.opcion === 'saco-partido' && mismaPuerta(anterior)) cota(l, p.ancho, y, p.ancho, techo, p.ancho + 40, 'XERA 20');
        else cota(l, 0, y, 0, techo, -35, 'XERA 20');
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
      // Las E.T., rotuladas en su tramo libre más largo, no encima del recorte de la cinta del centro.
      const [x, y] = P([p.clase === 'entrada' ? centroLibre(p.huecos, p.ancho) : p.ancho / 2, p.alto / 2]);
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
        // La E.T. que va dentro del paño, con el mismo rótulo que las sueltas (Iván, 23/10/2026).
        for (const et of p.entradasIncorporadas ?? []) {
          const enFranja = p.huecos.filter(h => h.y < et.y + et.alto / 2 && h.y + h.alto > et.y - et.alto / 2);
          const q = P([centroLibre(enFranja, p.ancho), et.y]); texto(l, `ENTRADA DE TUBO ${et.tubo}`, q[0], q[1], Math.min(8, et.alto / 2), t.girada ? 90 : 0);
        }
        primeros.add(e.id);
      } else texto(l, p.sacoDiagonalesAmarillas ? 'SACO AMARILLO/NEGRO' : p.nombre.toUpperCase(), x, y, Math.min(8, p.alto / 2), t.girada ? 90 : 0);
    }
    material(l, c.material, c.largo / 10, techo + 15);
    // Iván, 23/10/2026 (AR2605035): la cota, hasta la altura máxima de las piezas, y sin rayas del rollo, que no
    // son corte; como en las enrollables (planos a mano 4638 y 5220).
    const ocupado = Math.max(...c.colocadas.map(t => t.y / 10 + (t.girada ? t.pieza.ancho : t.pieza.alto)));
    cota(l, 0, yc, c.largo / 10, yc, yc - 30, 'XERA 20'); cota(l, 0, yc, 0, yc + ocupado, -35, 'XERA 20');
    anchoMax = Math.max(anchoMax, c.largo / 10); techo = yc - 100;
  }
  return { lienzo: l, zona: { x0: -70, x1: anchoMax + 35, y0: techo + 45, y1: 45 } };
}

export function escribirPlanoTaller(pedido: PedidoPuertas, cortes: CortePuertas[], cabecera: { cliente: string; tecnico: string; revisor: string; fecha: string }) {
  const l = vacio(); let cursor = 0, abajo = 0, arriba = 0, izquierda = -65;
  const zonasPuertas: Zona[] = [];
  for (const [i, e] of pedido.elementos.entries()) {
    const d = dibujarAlzadoTaller(e.input, String.fromCharCode(65 + i)), dx = i ? cursor - d.zona.x0 : 0;
    sumarLienzo(l, d.lienzo, dx); cursor = dx + d.zona.x1 + ENTRE_PUERTAS;
    izquierda = Math.min(izquierda,dx+d.zona.x0);
    let suelo = d.zona.y0;
    // Solo la nota que el técnico quiera ver en el plano; el texto de RPS sobraba (Iván, 23/10/2026).
    if (e.input.notaPlano?.trim()) {
      let actual = '';
      const lineas: string[] = [], ancho = d.zona.x1 - d.zona.x0;
      for (const palabra of textoSeguro(`OBSERVACIONES: ${e.input.notaPlano}`).split(/\s+/)) {
        if (actual && anchoArial(`${actual} ${palabra}`, 6) > ancho) { lineas.push(actual); actual = palabra; }
        else actual += (actual ? ' ' : '') + palabra;
      }
      if (actual) lineas.push(actual);
      lineas.forEach((v, j) => texto(l, v, dx + (d.zona.x0 + d.zona.x1) / 2, suelo - 12 - j * 10, 6));
      suelo -= lineas.length * 10 + 20;
    }
    abajo = Math.min(abajo, suelo); arriba = Math.max(arriba, d.zona.y1);
    zonasPuertas.push({ x0: dx + d.zona.x0, x1: dx + d.zona.x1, y0: suelo, y1: d.zona.y1 });
  }
  const zonaM = (z: Zona, x: number, y: number): Zona => ({ x0: x + z.x0 / 100, x1: x + z.x1 / 100, y0: y + z.y0 / 100, y1: y + z.y1 / 100 });
  const za = zonaM({ x0: izquierda, x1: cursor - ENTRE_PUERTAS, y0: abajo, y1: arriba }, 100, 100), corte = dibujarCorteTaller(cortes, pedido);
  const [ox, oy] = origenCorte(za, corte.zona);
  let zc = zonaM(corte.zona, ox, oy), altoVista: number | undefined;
  const corteReal = zc;
  const portanova = esClientePortanova(pedido, cabecera.cliente);
  if (portanova) {
    const proporcion = VENTANA_CORTE_PORTANOVA.alto / VENTANA_CORTE_PORTANOVA.ancho;
    altoVista = Math.max(zc.y1 - zc.y0, (zc.x1 - zc.x0) * proporcion);
    const cx = (zc.x0 + zc.x1) / 2;
    zc = { x0: cx - altoVista / proporcion / 2, x1: cx + altoVista / proporcion / 2, y0: zc.y1 - altoVista, y1: zc.y1 };
  }
  const unicos = (xs: string[]) => [...new Set(xs.filter(Boolean))].join(' / '), ps = pedido.elementos.map(e => e.input);
  return escribirDxfPlano({ ...lienzoAMetros(l, 100, 100), corte: lienzoAMetros(corte.lienzo, ox, oy), zonas: { toldos: za, corte: zc, corteReal }, corteDerecho: true,
    corteGirable: true, hojas: hojasPuertas(pedido, zonasPuertas.map(z => zonaM(z, 100, 100))),
    bloques: [bloqueFlechaEnrollable], coloresModelo: { ejes: 23, borrar: 40, curv: 3, 'corte (vent)': 5 },
    ...(portanova ? presentacionPortanova(pedido, cabecera, { toldos: za, corte: zc }, altoVista) : {}),
  }, { pedido: pedido.orderCode, of: unicos(ps.map(p => p.of)), cliente: textoSeguro(cabecera.cliente), tecnico: textoSeguro(cabecera.tecnico),
    revisor: textoSeguro(cabecera.revisor), fecha: cabecera.fecha.split('-').reverse().map((v, i) => i === 2 ? v.slice(2) : v).join('/'), pagina: '1/1',
    material: textoSeguro(unicos(ps.map(p => `${p.material} ${p.color}`))), subtitulo: 'MEDIDAS EN CM · PUERTA DE LONA' }).dxf;
}
