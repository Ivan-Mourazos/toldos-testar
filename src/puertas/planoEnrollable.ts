import { escribirDxfPlano } from '../domain/corteLona/presentacion.js';
import { anchoArial, textoSeguro } from '../domain/corteLona/texto.js';
import { calcularPuerta } from './calcular.ts';
import { esClientePortanova } from './clientePortanova.ts';
import { rotuloSaco } from './saco.ts';
import { anclarCotas } from './cotasPuertas.ts';
import { presentacionPortanova, VENTANA_CORTE_PORTANOVA } from './plantillaPortanova.ts';
import type { CortePuertas, PedidoPuertas, PiezaPuerta, Puerta, Punto } from './tipos.ts';

// Referencia: AR2605134 de Iván, 22/10/2026 (mano3). Dibujo en cm, con el origen en la
// esquina superior izquierda terminada; la presentación y el cajetín web siguen en mm.
type Zona = { x0: number; y0: number; x1: number; y1: number };
interface Texto { capa: string; x: number; y: number; h: number; valor: string; giro?: number; centrado?: boolean; ancla?: number; ancho?: number }
export interface LienzoEnrollable {
  lineas: Array<{ capa: string; x1: number; y1: number; x2: number; y2: number }>;
  polilineas: Array<{ capa: string; puntos: Punto[]; cerrada: boolean; curvas?: number[]; color?: number }>;
  textos: Texto[];
  cotas: Array<{ capa: string; estilo: string; x1: number; y1: number; x2: number; y2: number; giro: number; d: number; valor: number; rotulo?: string }>;
  inserciones: Array<{ capa: string; nombre: string; x: number; y: number; giro?: number; sx?: number }>;
  sombreados: Array<{ capa: string; puntos: Punto[]; solido: boolean }>;
  arcos: Array<{ capa: string; x: number; y: number; r: number; desde: number; hasta: number }>;
  circulos: Array<{ capa: string; x: number; y: number; r: number }>;
}
type Lienzo = LienzoEnrollable;
const vacio = (): Lienzo => ({ lineas: [], polilineas: [], textos: [], cotas: [], inserciones: [], sombreados: [], arcos: [], circulos: [] });
const linea = (l: Lienzo, capa: string, x1: number, y1: number, x2: number, y2: number) => l.lineas.push({ capa, x1, y1, x2, y2 });
const texto = (l: Lienzo, valor: string, x: number, y: number, h: number, opciones: Partial<Texto> = {}) =>
  l.textos.push({ capa: 'texto', valor: opciones.capa === 'ROTULADOR' ? valor : textoSeguro(valor), x, y, h, ...opciones });
const rectangulo = (l: Lienzo, capa: string, x: number, y: number, w: number, h: number, color?: number) => {
  const puntos: Punto[] = [[x, y], [x + w, y], [x + w, y + h], [x, y + h]];
  l.polilineas.push({ capa, puntos, cerrada: true, ...(color == null ? {} : { color }) });
  return puntos;
};
const contorno = (l: Lienzo, capa: string, puntos: Punto[]) => puntos.forEach((p, i) => {
  const q = puntos[(i + 1) % puntos.length];
  linea(l, capa, p[0], p[1], q[0], q[1]);
});
const cota = (l: Lienzo, x1: number, y1: number, x2: number, y2: number, d: number, estilo = 'XERAL') =>
  l.cotas.push({ capa: 'cotas', estilo, x1, y1, x2, y2, d, giro: x1 === x2 ? 90 : 0,
    valor: Math.hypot(x2 - x1, y2 - y1) });
const flecha = (l: Lienzo, x: number, y: number, giro = 0, sx = 1) =>
  l.inserciones.push({ capa: 'ROTULADOR', nombre: 'FLECHA2', x, y, giro, sx });

/** Copia geométrica del bloque FLECHA2 de Iván; el que traía la plantilla era más grande. */
export const bloqueFlechaEnrollable = { nombre: 'FLECHA2', capa: 'ROTULADOR',
  puntos: [[0, 0], [0, -.01], [.008, -.01], [0, -.0253205080756884], [-.008, -.01], [0, -.01]] };

function identificar(l: Lienzo, p: Puerta, codigo: string, x: number, y: number, ancho: number, alto: number,
  { giro = 0, cantidad = false, reves = false, of = false }: { giro?: number; cantidad?: boolean; reves?: boolean; of?: boolean } = {}) {
  // Iván, 22/10/2026: la cantidad, REVÉS y la OF van una vez, en el primer paño; los demás, solo su código.
  // «Si coge, se pone la OF también». La letra se limita al hueco libre, sin invadir las E.T.
  const h = Math.min(20, ancho / 9, alto / 4);
  if (h < 3) return;
  const conOf = of && p.of.trim() && alto >= h * 5.5 && anchoArial(p.of.trim(), h) <= ancho * .88;
  const rotulos = [...(cantidad && p.cantidad > 1 ? [`X${p.cantidad}`] : []), codigo, ...(reves ? ['REVÉS'] : []), ...(conOf ? [p.of.trim()] : [])];
  rotulos.forEach((v, i) => {
    const d = ((rotulos.length - 1) / 2 - i) * h * 1.5;
    texto(l, v, x + (giro ? -d : 0), y + (giro ? 0 : d), h, { centrado: true, giro });
  });
}

function huecoRotulo(abajo: number, arriba: number, obstaculos: number[], margen = 8): [number, number] {
  const cortes = obstaculos.filter(y => y > abajo && y < arriba).sort((a, b) => a - b);
  const hitos = [abajo, ...cortes, arriba];
  return hitos.slice(1).map((y, i): [number, number] => [hitos[i] + margen, y - margen])
    .reduce((a, b) => b[1] - b[0] > a[1] - a[0] ? b : a);
}

export function dibujarAlzadoEnrollable(p: Puerta, letra: string): { lienzo: Lienzo; zona: Zona } {
  const l = vacio(), F = p.frente, H = p.alto, T = p.enrollable.T;
  const r = calcularPuerta(p);
  const ventanales = T > 0 ? [{ D: p.enrollable.D, margen: p.enrollable.margen }, ...p.enrollable.ventanales ?? []] : [];
  const ejes: number[] = ventanales.length ? [T] : [];
  for (const v of ventanales) ejes.push(ejes.at(-1)! + v.D);
  const bandas = [...new Set([...ejes, ...p.entradas.map(e => H - e.altura)])].filter(y => y > 0 && y < H).sort((a, b) => a - b);
  // Los contornos son los paños cortados: 3,5 sobre la cabecera y 11 sobre el bajo.
  const paños: Array<[number, number]> = ventanales.length
    ? [[-T - 3.75, 3.5], [-H + 11, -ejes.at(-1)! + 3.75]] : [[-H + 11, 3.5]];
  paños.forEach(([abajo, arriba], i) => {
    contorno(l, 'DISCO1', [[0, abajo], [F, abajo], [F, arriba], [0, arriba]]);
    const [a, b] = huecoRotulo(abajo, arriba, bandas.map(y => -y), 18);
    identificar(l, p, `${letra}${i + 1}`, F / 2, (a + b) / 2, F, b - a, { cantidad: i === 0, reves: i === 0, of: i === 0 });
  });
  linea(l, 'referencias', 0, 0, F, 0);
  linea(l, 'ROTULADOR', 0, -3.5, F, -3.5);
  texto(l, 'VARILLA NEGRA (4,5)', F / 2 - 51.2490, 13.5486, 7, { ancla: 1 });
  for (const [i, v] of ventanales.entries()) {
    const t = ejes[i], m = v.margen, alto = v.D - 3.5;
    // El cristal y los cachos son su corte completo: solapan 2 arriba y 2 abajo.
    rectangulo(l, 'DISCO1', -1, -t - v.D + 1.75, m + 1, alto);
    rectangulo(l, 'DISCO1', F - m, -t - v.D + 1.75, m + 1, alto);
    rectangulo(l, 'DISCO1', m - 2, -t - v.D + 1.75, F - 2 * m + 4, alto, 5);
    cota(l, 0, -t - 12.57, m, -t - 12.57, -t + 11.67);
    cota(l, F - m, -t - 5.89, F, -t - 5.89, -t + 13.22);
    cota(l, m - 2, -t - 26.48, F - m + 2, -t - 26.48, -t - 18.56);
  }
  bandas.forEach((b, i) => {
    const superior = ventanales.length > 0 && i === 0;
    const yMarca = -b + (superior ? 3.75 : -3.75);
    linea(l, 'ejes', 0, -b, F, -b);
    linea(l, 'ROTULADOR', 0, yMarca, F, yMarca);
    flecha(l, F / 2, yMarca, superior ? 0 : 180, i === 1 ? -1 : 1);
    if (!ejes.some(e => Math.abs(e - b) < .01)) linea(l, 'borrar', 0, -b + 3.75, F, -b + 3.75);
    cota(l, 0, -b - 3.75, 0, -b + 3.75, -9.15 + i, 'XERAL 5');
    texto(l, '3 CM (HUECOS)', F / 2 - (i === 0 ? 34.6534 : i === 1 ? 34.2446 : 33.6842), -b + (superior ? 14.7311 : i === 1 ? -7.59 : 14.187), 7, { ancla: 1 });
  });
  linea(l, 'ROTULADOR', 0, -H + 13, F, -H + 13);
  linea(l, 'referencias', 0, -H, F, -H);
  linea(l, 'referencias', 0, -H, 0, -H + 13);
  linea(l, 'referencias', F, -H, F, -H + 11);
  texto(l, 'SOLDAR SACO NEGRO 2 CM MÁXIMO', 14.3553, -H + 1.6012, Math.min(7, F / 28));
  texto(l, 'AL CORTE', -9.54, -T * .626, 7, { giro: 90, ancla: 1 });
  texto(l, 'AL CORTE', F + 1.96, -T * .6386, 7, { giro: 90, ancla: 1 });
  texto(l, 'DE ESTE LADO PISAR LAS E.T. 1 CM', F + 51.63, -H + 51.78, 10, { giro: 90, ancla: 1 });
  linea(l, 'texto', F + 12.17, -H - 5.32, F - .79, -H + 7.90);
  cota(l, 0, 0, F, 0, 23.01, 'XERA 15');
  const hitos = [0, ...bandas, H];
  hitos.slice(1).forEach((h, i) => cota(l, F, -hitos[i], F, -h, F + 21.93));
  cota(l, F, 0, F, -H, F + 37.91);
  cota(l, F, -H, F, -H + 13, F + 9.79, 'XERAL 5');

  // Saco desplegado, con escalón y los dos velcros en su capa original.
  const ys = -H - 47.6767;
  contorno(l, 'referencias', [[0, ys], [F, ys], [F, ys - 26], [0, ys - 26], [0, ys - 13], [-6.5, ys - 13], [-6.5, ys - 2], [0, ys - 2]]);
  for (const y of [ys - 2, ys - 13, ys - 24]) linea(l, 'vent-pre-noimpr', 0, y, F, y);
  const bravo = rectangulo(l, 'referencia-1', -6.5, ys - 13, 3, 11);
  const suave = rectangulo(l, 'referencia-1', 1.5, ys - 24, 3, 11);
  l.sombreados.push({ capa: 'referencia-1', puntos: bravo, solido: true }, { capa: 'referencia-1', puntos: suave, solido: false });
  cota(l, 0, ys - 26, F, ys - 26, ys - 16.51, 'XERAL 5');
  cota(l, 0, ys - 26, 0, ys, -32.47);
  cota(l, -6.5, ys - 2, 0, ys - 2, ys + 7.82);
  cota(l, 0, ys - 24, 4.5, ys - 24, ys - 43.25);
  texto(l, rotuloSaco(p), p.sacoDiagonalesAmarillas ? F / 2 : F / 2 - 71.5081, ys - 11.8793,
    p.sacoDiagonalesAmarillas ? Math.min(10, F * .9 / anchoArial(rotuloSaco(p), 1)) : 10, p.sacoDiagonalesAmarillas ? { centrado: true } : {});
  // Iván, 22/10/2026: los textos de los velcros, más pequeños, simétricos respecto al saco y con la raya
  // llegando a cada velcro (el bravo en la pestaña y el suave en el saco), no sueltos en el aire.
  const hVelcro = 5, xVelcro = 20, dVelcro = 23;
  for (const [valor, y, velcro] of [
    ['COSER VELCRO REVÉS DE 3 BRAVO', ys - 13 + dVelcro, [-5, ys - 2]],
    ['COSER VELCRO DERECHO DE 3 SUAVE', ys - 13 - dVelcro, [3, ys - 24]],
  ] as const) {
    texto(l, valor, xVelcro, y, hVelcro, { ancla: 4 });
    linea(l, 'texto', xVelcro - 1.5, y, velcro[0], velcro[1]);
  }
  const nota = 'LOS CACHOS DE LOS LATERALES DEL CRISTAL VAN 1 CM MÁS GRANDE PARA DESPUÉS ESCUADRARLO';
  // Iván confirmó que el recorte de esta nota en su ventana era un descuido: debe leerse entera.
  const palabras = nota.split(' '), lineas: string[] = []; let actual = '';
  const hNota = Math.min(7.5, (F + 20) / 28);
  for (const palabra of palabras) {
    if (anchoArial(`${actual} ${palabra}`, hNota) > F + 100 && actual) { lineas.push(actual); actual = palabra; }
    else actual += (actual ? ' ' : '') + palabra;
  }
  if (actual) lineas.push(actual);
  lineas.forEach((v, i) => texto(l, v, F / 2, ys - 74 - i * hNota * 1.4, hNota, { centrado: true }));

  // Los empates y bolsillos configurados conservan sus marcas; nunca crean una pieza nueva.
  for (const u of r.uniones) {
    linea(l, 'referencias', 0, -H + u.altura, F, -H + u.altura);
    for (const s of [-1, 1]) {
      const y = -H + u.altura + s * u.solape / 2;
      linea(l, 'ROTULADOR', 0, y, F, y); flecha(l, F / 2, y, s < 0 ? 180 : 0);
    }
    if (!u.tubo) texto(l, `EMPATE ${u.solape.toLocaleString('es-ES')} CM`, F / 2, -H + u.altura + 8, 5, { centrado: true });
  }
  if (r.bolsillo) {
    const b = r.bolsillo;
    rectangulo(l, 'referencias', b.x, -H + b.y, b.ancho, b.alto);
  }
  for (const pieza of r.piezas.filter(p => p.origenAlzado)) {
    const [x, y] = pieza.origenAlzado!;
    for (const m of pieza.unionesCorte ?? []) texto(l, `${letra.toLowerCase()}${m.numero}`, x + m.x, -H + y + m.y, 1,
      { capa: 'ROTULADOR', centrado: true, giro: m.giro ?? 0 });
  }
  const sacos = r.piezas.filter(p => p.clase === 'saco');
  let sx = -6.5;
  for (const pieza of sacos) {
    for (const m of pieza.unionesCorte ?? []) texto(l, `${letra.toLowerCase()}${m.numero}`, sx + m.x, ys - 26 + m.y, 1,
      { capa: 'ROTULADOR', centrado: true, giro: m.giro ?? 0 });
    sx += pieza.ancho - 2;
  }
  return { lienzo: l, zona: { x0: -65, x1: F + 70, y0: ys - 86 - (lineas.length - 1) * hNota * 1.4, y1: 40 } };
}

export function sumarLienzo(destino: Lienzo, origen: Lienzo, dx = 0, dy = 0) {
  destino.lineas.push(...origen.lineas.map(t => ({ ...t, x1: t.x1 + dx, y1: t.y1 + dy, x2: t.x2 + dx, y2: t.y2 + dy })));
  destino.polilineas.push(...origen.polilineas.map(t => ({ ...t, puntos: t.puntos.map(([x, y]): Punto => [x + dx, y + dy]) })));
  destino.textos.push(...origen.textos.map(t => ({ ...t, x: t.x + dx, y: t.y + dy })));
  destino.cotas.push(...origen.cotas.map(t => ({ ...t, x1: t.x1 + dx, y1: t.y1 + dy, x2: t.x2 + dx, y2: t.y2 + dy, d: t.d + (t.giro ? dx : dy) })));
  destino.inserciones.push(...origen.inserciones.map(t => ({ ...t, x: t.x + dx, y: t.y + dy })));
  destino.sombreados.push(...origen.sombreados.map(t => ({ ...t, puntos: t.puntos.map(([x, y]): Punto => [x + dx, y + dy]) })));
  destino.arcos.push(...origen.arcos.map(t => ({ ...t, x: t.x + dx, y: t.y + dy })));
  destino.circulos.push(...origen.circulos.map(t => ({ ...t, x: t.x + dx, y: t.y + dy })));
}

const unicos = (v: string[]) => [...new Set(v.filter(Boolean))];
// Cotas del corte más grandes, para que se lean al imprimir sin pisar las piezas (Iván, 22/10/2026).
const CORTE_COTAS = 'XERA 20';

/** Resumen del corte recibido: saco/cristal una vez; lona con todas sus colocaciones reales. */
function dibujarCorte(cortes: CortePuertas[], pedido: PedidoPuertas): { lienzo: Lienzo; zona: Zona } {
  const l = vacio(); let techo = 0, anchoMax = 250;
  const muestras = new Map<string, PiezaPuerta>();
  for (const c of cortes) for (const t of c.colocadas) if (['saco', 'cristal'].includes(t.pieza.clase)) muestras.set(`${c.opcion}:${t.pieza.id}`, t.pieza);
  // El saco encima del transparente, como en la referencia, sin repetir las copias físicas.
  for (const p of [...muestras.values()].sort((a, b) => (a.clase === 'saco' ? -1 : 1) - (b.clase === 'saco' ? -1 : 1))) {
    const y = techo - p.alto, xMuestra = -.8974;
    const puntos = p.contorno.map(([x, v]): Punto => [xMuestra + x, y + v]);
    if (p.clase === 'saco') contorno(l, 'DISCO1', puntos);
    else l.polilineas.push({ capa: 'DISCO1', color: 5, puntos, cerrada: true });
    texto(l, p.clase === 'saco' ? p.sacoDiagonalesAmarillas ? 'SACO 900 GR AMARILLO/NEGRO' : 'SACO 900 GR NEGRO' : p.material,
      xMuestra, techo + (p.clase === 'saco' ? 11.6223 : 5.5194), 10);
    texto(l, `X${p.multiplicador ?? p.cantidad}`, xMuestra + p.ancho / 2, y + p.alto / 2, Math.min(20, p.alto * .8), { centrado: true });
    cota(l, xMuestra, y, xMuestra + p.ancho, y, y - (p.clase === 'saco' ? 24.8365 : 22.7381), CORTE_COTAS);
    cota(l, xMuestra, y, xMuestra, techo, -35.1317, CORTE_COTAS);
    // Separaciones de presentación medidas en AR2605134; no afectan al corte ni a sus piezas.
    techo = y - (p.clase === 'saco' ? 82.0735 : 92.3202);
    anchoMax = Math.max(anchoMax, p.ancho);
  }
  for (const c of cortes.filter(c => c.colocadas.some(t => !['saco', 'cristal'].includes(t.pieza.clase)))) {
    const usadas = c.colocadas.filter(t => !['saco', 'cristal'].includes(t.pieza.clase));
    const alto = c.anchoRollo / 10, yc = techo - alto;
    // La OF de cada puerta va en su primer paño del rollo y REVÉS solo en el primero de todos (Iván, 22/10/2026).
    const delante = usadas.filter(t => t.pieza.clase === 'pano').sort((a, b) => a.x - b.x || b.y - a.y);
    const cabezas = new Set(pedido.elementos.map(e => delante.find(t => t.pieza.id.startsWith(`${e.id}:`))).filter(Boolean));
    for (const t of usadas) {
      const p = t.pieza;
      const P = ([x, y]: Punto): Punto => [t.x / 10 + (t.girada ? p.alto - y : x), yc + t.y / 10 + (t.girada ? x : y)];
      // Las marcas largas y las flechas de cada pieza vienen del corte, sin reconstruir su anidado.
      const marcas = p.marcas.filter(([x1, y1, x2, y2]) => Math.abs(x2 - x1) > p.ancho / 2 && y1 === y2);
      for (const [x1, y1, x2, y2] of marcas) {
        const a = P([x1, y1]), b = P([x2, y2]); linea(l, 'ROTULADOR', a[0], a[1], b[0], b[1]);
        const tallo = p.marcas.find(([a, b, d, e]) => a === d && Math.abs(a - p.ancho / 2) < .01 && Math.abs(b - y1) < .01 && Math.abs(e - b) > .9);
        if (tallo) { const q = P([p.ancho / 2, y1]); flecha(l, q[0], q[1], (tallo[3] > tallo[1] ? 180 : 0) + (t.girada ? 90 : 0)); }
      }
      if (p.clase === 'pano') {
        const elemento = pedido.elementos.find(e => p.id.startsWith(`${e.id}:`));
        if (elemento) {
          const letra = String.fromCharCode(65 + pedido.elementos.indexOf(elemento));
          const paños = calcularPuerta(elemento.input).piezas.filter(u => u.clase === 'pano').map(u => `${elemento.id}:${u.id}`);
          const [a, b] = huecoRotulo(0, p.alto, marcas.map(m => m[1]), 8);
          const codigo = `${letra}${paños.indexOf(p.id) + 1}`, q = P([p.ancho / 2, (a + b) / 2]);
          identificar(l, elemento.input, codigo, q[0], q[1], p.ancho, b - a, { giro: t.girada ? 90 : 0, of: cabezas.has(t), reves: t === delante[0] });
        }
      }
    }
    // Los huecos, radios y mininúmeros conservan las coordenadas de las entidades de máquina.
    l.lineas.push(...c.entidades.lineas.filter(a => a.capa === 'DISCO1').map(a => ({ ...a, x1: a.x1 / 10, x2: a.x2 / 10, y1: yc + a.y1 / 10, y2: yc + a.y2 / 10 })));
    l.arcos.push(...c.entidades.arcos.map(a => ({ ...a, x: a.x / 10, y: yc + a.y / 10, r: a.r / 10 })));
    l.circulos.push(...c.entidades.circulos.map(a => ({ ...a, x: a.x / 10, y: yc + a.y / 10, r: a.r / 10 })));
    l.lineas.push(...c.entidades.lineas.filter(a => a.capa === 'CUTTER').map(a => ({ ...a, x1: a.x1 / 10, x2: a.x2 / 10, y1: yc + a.y1 / 10, y2: yc + a.y2 / 10 })));
    l.textos.push(...c.entidades.textos.filter(a => a.capa === 'ROTULADOR').map(a => ({ ...a, x: a.x / 10, y: yc + a.y / 10, h: a.h / 10 })));
    texto(l, c.material, 0, techo + 7.6701, 10);
    // Referencia del orillo superior para acotar el ancho real del rollo aunque las piezas no lo llenen.
    linea(l, 'cotas', 0, techo, Math.min(12, c.largo / 10), techo);
    cota(l, 0, yc, c.largo / 10, yc, yc - 25.8375, CORTE_COTAS);
    cota(l, 0, yc, 0, techo, -35.1317, CORTE_COTAS);
    anchoMax = Math.max(anchoMax, c.largo / 10);
    techo = yc - 100;
  }
  return { lienzo: l, zona: { x0: -70, y0: techo + 45, x1: anchoMax + 30, y1: 55 } };
}

export function lienzoAMetros(l: Lienzo, ox: number, oy: number) {
  const m = (p: Punto): Punto => [ox + p[0] / 100, oy + p[1] / 100];
  return {
    ...l,
    lineas: l.lineas.map(a => ({ ...a, x1: ox + a.x1 / 100, x2: ox + a.x2 / 100, y1: oy + a.y1 / 100, y2: oy + a.y2 / 100 })),
    polilineas: l.polilineas.map(a => ({ ...a, puntos: a.puntos.map(m) })),
    textos: l.textos.map(a => ({ ...a, x: ox + a.x / 100, y: oy + a.y / 100, h: a.h / 100, ...(a.ancho == null ? {} : { ancho: a.ancho / 100 }) })),
    cotas: anclarCotas(l).map(a => ({ ...a, x1: ox + a.x1 / 100, x2: ox + a.x2 / 100, y1: oy + a.y1 / 100, y2: oy + a.y2 / 100, d: (a.giro ? ox : oy) + a.d / 100 })),
    inserciones: l.inserciones.map(a => ({ ...a, x: ox + a.x / 100, y: oy + a.y / 100 })),
    sombreados: l.sombreados.map(a => ({ ...a, puntos: a.puntos.map(m) })),
    arcos: l.arcos.map(a => ({ ...a, x: ox + a.x / 100, y: oy + a.y / 100, r: a.r / 100 })),
    circulos: l.circulos.map(a => ({ ...a, x: ox + a.x / 100, y: oy + a.y / 100, r: a.r / 100 })),
  };
}
const zonaM = (z: Zona, ox: number, oy: number): Zona => ({ x0: ox + z.x0 / 100, x1: ox + z.x1 / 100, y0: oy + z.y0 / 100, y1: oy + z.y1 / 100 });

export function escribirPlanoEnrollables(pedido: PedidoPuertas, cortes: CortePuertas[], cabecera: { cliente: string; tecnico: string; revisor: string; fecha: string }): string {
  const l = vacio(); let cursor = 0, y0 = 0, y1 = 0;
  for (const [i, e] of pedido.elementos.entries()) {
    const { lienzo, zona } = dibujarAlzadoEnrollable(e.input, String.fromCharCode(65 + i));
    const dx = i ? cursor - zona.x0 : 0;
    sumarLienzo(l, lienzo, dx); cursor = dx + zona.x1 + 60;
    y0 = Math.min(y0, zona.y0); y1 = Math.max(y1, zona.y1);
  }
  const za = zonaM({ x0: -65, y0, x1: cursor - 60, y1 }, 100, 100);
  const corte = dibujarCorte(cortes, pedido);
  let zc = zonaM(corte.zona, 110, 90), altoVistaCorte: number | undefined;
  const portanova = esClientePortanova(pedido, cabecera.cliente);
  if (portanova) {
    // El corte, lo más grande que quepa y pegado arriba: debajo queda MATERIALES (Iván, 22/10/2026).
    const proporcion = VENTANA_CORTE_PORTANOVA.alto / VENTANA_CORTE_PORTANOVA.ancho;
    altoVistaCorte = Math.max(zc.y1 - zc.y0, (zc.x1 - zc.x0) * proporcion);
    const cx = (zc.x0 + zc.x1) / 2, ancho = altoVistaCorte / proporcion;
    zc = { x0: cx - ancho / 2, x1: cx + ancho / 2, y0: zc.y1 - altoVistaCorte, y1: zc.y1 };
  }
  const puertas = pedido.elementos.map(e => e.input);
  const fecha = cabecera.fecha.split('-').reverse().map((v, i) => i === 2 ? v.slice(2) : v).join('/');
  return escribirDxfPlano({ ...lienzoAMetros(l, 100, 100), corte: lienzoAMetros(corte.lienzo, 110, 90), zonas: { toldos: za, corte: zc }, corteDerecho: true,
    bloques: [bloqueFlechaEnrollable],
    ...(portanova ? presentacionPortanova(pedido, cabecera, { toldos: za, corte: zc }, altoVistaCorte) : {}),
  }, {
    pedido: pedido.orderCode, of: unicos(puertas.map(p => p.of)).join(' / '), cliente: textoSeguro(cabecera.cliente),
    tecnico: textoSeguro(cabecera.tecnico), revisor: textoSeguro(cabecera.revisor),
    fecha, pagina: '1/1',
    material: textoSeguro(unicos(puertas.map(p => `${p.material} ${p.color}`)).join(' / ')), subtitulo: 'MEDIDAS EN CM · PUERTA DE LONA',
  }).dxf;
}
