import { escribirDxf2004 } from '../domain/corteLona/dxfCorte.js';
import { anchoArial } from '../domain/corteLona/texto.js';
import { sacosEnHuecos } from '../domain/corteLona/colocacion.js';
import { calcularPuerta } from './calcular.ts';
import type { CortePuertas, EntidadesPuertas, Hueco, PedidoPuertas, PiezaPuerta, Punto, VistaPuertas } from './tipos.ts';

const vacias = (): EntidadesPuertas => ({ lineas: [], textos: [], arcos: [], circulos: [] });
const mm = (x: number) => Math.round(x * 10000) / 1000;

/** Une tramos colineales y elimina cortes sobre los orillos, como remolques/corte. */
export function fusionarCortesPuertas(entidades: EntidadesPuertas, rollo?: number) {
  const grupos = new Map<string, number[][]>();
  const resto: EntidadesPuertas['lineas'] = [];
  for (const l of entidades.lineas) {
    if (l.capa !== 'DISCO1') {
      resto.push(l);
      continue;
    }
    if (Math.abs(l.x1 - l.x2) < 0.001 && Math.abs(l.y1 - l.y2) < 0.001) continue;
    const horizontal = Math.abs(l.y1 - l.y2) < 0.001;
    if (rollo !== undefined && horizontal && (Math.abs(l.y1) < 0.001 || Math.abs(l.y1 - rollo) < 0.001)) continue;
    if (!horizontal && Math.abs(l.x1 - l.x2) > 0.001) {
      resto.push(l);
      continue;
    }
    const c = horizontal ? l.y1 : l.x1;
    const k = `${horizontal ? 'h' : 'v'}${c.toFixed(3)}`;
    const tramos = grupos.get(k) ?? [];
    tramos.push(horizontal ? [Math.min(l.x1, l.x2), Math.max(l.x1, l.x2)] : [Math.min(l.y1, l.y2), Math.max(l.y1, l.y2)]);
    grupos.set(k, tramos);
  }
  for (const [k, tramos] of grupos) {
    tramos.sort((a, b) => a[0] - b[0]);
    const unidos: number[][] = [];
    for (const t of tramos) {
      const u = unidos.at(-1);
      if (u && t[0] <= u[1] + 0.001) u[1] = Math.max(u[1], t[1]);
      else unidos.push([...t]);
    }
    const c = Number(k.slice(1));
    for (const [a, b] of unidos) {
      resto.push(k[0] === 'h' ? { capa: 'DISCO1', x1: a, y1: c, x2: b, y2: c } : { capa: 'DISCO1', x1: c, y1: a, x2: c, y2: b });
    }
  }
  entidades.lineas = resto;
}

function etiquetaClasePieza(pieza: PiezaPuerta, codigoPano?: string): string {
  if (pieza.clase === 'pano') {
    return codigoPano || 'PAÑO';
  }
  if (pieza.clase === 'cacho') return 'CACHO';
  if (pieza.clase === 'entrada') {
    const n = /(\d+)\s*$/.exec(pieza.nombre)?.[1];
    if (n) return `ENTRADA ${n}`;
    if (/delantera/i.test(pieza.nombre)) return 'ENTRADA DELANTERA';
    if (/trasera/i.test(pieza.nombre)) return 'ENTRADA TRASERA';
    return 'ENTRADA';
  }
  if (pieza.clase === 'saco') return pieza.sacoDiagonalesAmarillas ? 'SACO AMARILLO/NEGRO' : 'SACO';
  return 'CRISTAL';
}

function rotulosPieza(
  entidades: EntidadesPuertas,
  pieza: PiezaPuerta,
  x: number,
  y: number,
  girada: boolean,
  codigoPano?: string,
  columnas = false,
  reves = false,
) {
  const wMm = girada ? mm(pieza.alto) : mm(pieza.ancho);
  const hMm = girada ? mm(pieza.ancho) : mm(pieza.alto);
  // El texto sigue el frente de confección; solo gira cuando gira la pieza en el rollo.
  const vertical = girada;
  const largoMm = mm(pieza.ancho);
  const cortoMm = mm(pieza.alto);
  const cx = x + wMm / 2;
  const cy = y + hMm / 2;
  const of = (pieza.of.trim() || 'SIN OF').toUpperCase();
  const clase = pieza.clase === 'pano' ? etiquetaClasePieza(pieza, codigoPano)
    : `${codigoPano ?? ''} · ${etiquetaClasePieza(pieza)}`;
  if (columnas && pieza.clase === 'pano') {
    const valores = [of, clase, ...reves ? ['REVÉS'] : []];
    const obstaculos = [...pieza.huecos.map(h => [h.y - 4, h.y + h.alto + 4]),
      ...pieza.marcas.filter(m => m[1] === m[3] && Math.abs(m[2] - m[0]) > pieza.ancho / 2).map(m => [m[1] - 4, m[1] + 4])];
    const margenY = Math.min(4, pieza.alto / 5);
    let huecos = [[margenY, pieza.alto - margenY]];
    for (const [a, b] of obstaculos) huecos = huecos.flatMap(([u, v]) => b <= u || a >= v ? [[u, v]]
      : [[u, Math.min(v, a)], [Math.max(u, b), v]].filter(([c, d]) => d > c));
    const libre = huecos.sort((a, b) => (b[1] - b[0]) - (a[1] - a[0]))[0] ?? [margenY, pieza.alto - margenY];
    const central = pieza.marcas.some(m => m[0] === m[2] && Math.abs(m[0] - pieza.ancho / 2) < 2 && Math.abs(m[3] - m[1]) > pieza.alto / 2);
    const margenX = Math.min(10, pieza.ancho / 10);
    const inicio = central ? pieza.ancho / 2 + margenX : margenX, fin = pieza.ancho - margenX, w = (fin - inicio) / valores.length;
    const h = Math.min(25, (libre[1] - libre[0]) * .65, ...valores.map(v => w * .82 / anchoArial(v, 1)));
    valores.forEach((valor, i) => {
      const a = inicio + w * (i + .5), b = (libre[0] + libre[1]) / 2;
      entidades.textos.push({ capa: 'texto', x: x + mm(girada ? pieza.alto - b : a), y: y + mm(girada ? a : b),
        h: mm(h), valor, giro: girada ? 90 : 0, centrado: true });
    });
    return;
  }

  const multiplicador = (pieza.multiplicador ?? 1) > 1 ? [`X${pieza.multiplicador}`] : [];
  // Sin REVÉS: va una vez al principio del material (Iván, 22/10/2026).
  const lineasTexto = [...(cortoMm < 130 ? [`${clase} · ${of}`] : [clase, of]), ...multiplicador];

  const maxPorCorto = (cortoMm * 0.82) / ((lineasTexto.length - 1) * 1.5 + 1);
  const maxPorLargo = Math.min(...lineasTexto.map(v => (largoMm * 0.88) / Math.max(1, anchoArial(v, 1))));
  // DXF AR2604638: 200 mm; AR2604725: 300 en el paño alto y 200 en el bajo.
  const tope = pieza.clase === 'pano' && cortoMm >= 2000 ? 300 : 200;
  const alto = Math.floor(Math.min(tope, maxPorCorto, maxPorLargo) * 10) / 10;

  lineasTexto.forEach((valor, i) => {
    const d = (i - (lineasTexto.length - 1) / 2) * alto * 1.5;
    entidades.textos.push(
      vertical
        ? { capa: 'texto', x: cx + d, y: cy, h: alto, valor: valor.toUpperCase(), giro: 90, centrado: true }
        : { capa: 'texto', x: cx, y: cy - d, h: alto, valor: valor.toUpperCase(), centrado: true },
    );
  });
}

function dibujarPieza(
  entidades: EntidadesPuertas,
  pieza: PiezaPuerta,
  x: number,
  y: number,
  girada: boolean,
  codigoPano?: string,
  columnas = false,
  reves = false,
) {
  const transformar = ([a, b]: Punto): Punto => (girada ? [x + mm(pieza.alto - b), y + mm(a)] : [x + mm(a), y + mm(b)]);
  const linea = (capa: string, a: Punto, b: Punto) => {
    const [x1, y1] = transformar(a);
    const [x2, y2] = transformar(b);
    entidades.lineas.push({ capa, x1, y1, x2, y2 });
  };
  function redondeado(h: Hueco, hueco: boolean) {
    const { x: a, y: b, ancho: w, alto: hg, radio: r } = h;
    const capa = hueco ? 'CUTTER' : 'DISCO1';
    // Las bocas laterales de E.T. quedan abiertas hacia el borde, igual que el bot a mano.
    const izquierda = hueco && h.abierto === 'izquierda';
    const derecha = hueco && h.abierto === 'derecha';
    for (const [p0, p1] of [
      [[izquierda ? a : a + r, b], [derecha ? a + w : a + w - r, b]],
      ...derecha ? [] : [[[a + w, b + r], [a + w, b + hg - r]]],
      [[derecha ? a + w : a + w - r, b + hg], [izquierda ? a : a + r, b + hg]],
      ...izquierda ? [] : [[[a, b + hg - r], [a, b + r]]],
    ] as [Punto, Punto][]) {
      linea(capa, p0, p1);
    }
    if (r > 0) {
      for (const [cx, cy, desde] of [
        [a + r, b + r, 180],
        [a + w - r, b + r, 270],
        [a + w - r, b + hg - r, 0],
        [a + r, b + hg - r, 90],
      ]) {
        if (izquierda && (desde === 90 || desde === 180) || derecha && (desde === 0 || desde === 270)) continue;
        const [px, py] = transformar([cx, cy]);
        entidades.arcos.push({
          capa: 'CUTTER',
          x: px,
          y: py,
          r: mm(r),
          desde: (desde + (girada ? 90 : 0)) % 360,
          hasta: (desde + 90 + (girada ? 90 : 0)) % 360,
        });
      }
    }
  }
  if (pieza.radio > 0) redondeado({ x: 0, y: 0, ancho: pieza.ancho, alto: pieza.alto, radio: pieza.radio }, false);
  else pieza.contorno.forEach((p, i) => linea('DISCO1', p, pieza.contorno[(i + 1) % pieza.contorno.length]));
  for (const [a, b, c, d] of pieza.marcas) linea('ROTULADOR', [a, b], [c, d]);
  for (const texto of pieza.textos) {
    const [tx, ty] = transformar([texto.x, texto.y]);
    entidades.textos.push({ capa: 'ROTULADOR', x: tx, y: ty, h: 32, giro: girada ? 90 : 0, valor: texto.valor, centrado: true });
  }
  const letra = codigoPano?.match(/^[A-Z]+/)?.[0].toLowerCase() ?? 'a';
  for (const u of pieza.unionesCorte ?? []) {
    if (![u.x,u.y].every(Number.isFinite)||u.x<0||u.x>pieza.ancho||u.y<0||u.y>pieza.alto) continue;
    const [tx, ty] = transformar([u.x, u.y]);
    entidades.textos.push({ capa: 'ROTULADOR', x: tx, y: ty, h: 10,
      giro: ((u.giro ?? 0) + (girada ? 90 : 0)) % 360,
      valor: `${letra}${u.numero}`, centrado: true, literal: true });
  }
  pieza.huecos.forEach(h => redondeado(h, true));
  rotulosPieza(entidades, pieza, x, y, girada, codigoPano, columnas, reves);
}

type Columna = { ancho: number; alto: number; piezas: Array<{ pieza: PiezaPuerta; h: number; girada: boolean }> };
const largoDe = (columnas: Columna[]) => columnas.reduce((suma, c) => suma + c.ancho, 0);

/** Columnas a lo largo del rollo con las piezas una encima de otra; `nueva` dice cómo se pone cada pieza que abre columna. */
function empaquetar(grupo: PiezaPuerta[], rollo: number, nueva: (p: PiezaPuerta) => 'estrecha' | 'ancha', orden: 'corto' | 'largo', conservarFrente: (p: PiezaPuerta) => boolean): Columna[] {
  const columnas: Columna[] = [];
  const lado = (p: PiezaPuerta) => (orden === 'corto' ? Math.min(p.ancho, p.alto) : Math.max(p.ancho, p.alto));
  for (const p of [...grupo].sort((a, b) => lado(b) - lado(a))) {
    for (let k = 0; k < p.cantidad; k++) {
      const opciones = [
        { w: mm(p.ancho), h: mm(p.alto), g: false },
        { w: mm(p.alto), h: mm(p.ancho), g: true },
      ].filter(t => t.h <= rollo && (!t.g || !conservarFrente(p) || mm(p.alto) > rollo));
      const viables = columnas
        .flatMap((columna, i) =>
          opciones
            .filter(t => t.w <= columna.ancho + 0.001 && t.h + columna.alto <= rollo + 0.001)
            // Lo que queda sin usar a lo largo de la columna junto a la pieza: una E.T. de 212 × 8 tumbada en una
            // columna de 212 no desperdicia nada; de pie, casi toda la columna.
            .map(t => ({ i, t, resto: rollo - columna.alto - t.h, desperdicio: (columna.ancho - t.w) * t.h })),
        )
        .sort((a, b) => a.desperdicio - b.desperdicio || a.resto - b.resto);
      let elegida = viables[0];
      if (!elegida) {
        opciones.sort((a, b) => (nueva(p) === 'estrecha' ? a.w - b.w || b.h - a.h : b.w - a.w || a.h - b.h));
        const t = opciones[0];
        elegida = { i: columnas.length, t, resto: rollo - t.h, desperdicio: 0 };
        columnas.push({ ancho: t.w, alto: 0, piezas: [] });
      }
      const columna = columnas[elegida.i];
      columna.piezas.push({ pieza: p, h: elegida.t.h, girada: elegida.t.g });
      columna.alto += elegida.t.h;
    }
  }
  return columnas;
}

/**
 * Sacos de stock en la lona que sobra, como en toldos (Iván, 22/10/2026: «en estos casos se ponen sacos para
 * aprovechar el material»; en el corte a mano de AR2604725 van cuatro encima de A2): las mismas medidas y la
 * misma OF de stock (src/domain/corteLona/colocacion.js), rotulados con la OF, SACO, su medida y STOCK.
 */
function sacosDeStock(ocupadas: Array<{ x: number; y: number; ancho: number; hueco: number }>, rollo: number, ofStock: string, entidades: EntidadesPuertas, material: string, rolloCm: number) {
  const sacos = sacosEnHuecos(ocupadas, rollo, ofStock) as Array<{ x: number; y: number; ancho: number; hueco: number; medida: string }>;
  return sacos.map((saco, i) => {
    const [x0, y0, w, h] = [saco.x, saco.y, saco.ancho, saco.hueco];
    entidades.lineas.push(
      { capa: 'DISCO1', x1: x0, y1: y0, x2: x0 + w, y2: y0 }, { capa: 'DISCO1', x1: x0 + w, y1: y0, x2: x0 + w, y2: y0 + h },
      { capa: 'DISCO1', x1: x0 + w, y1: y0 + h, x2: x0, y2: y0 + h }, { capa: 'DISCO1', x1: x0, y1: y0 + h, x2: x0, y2: y0 },
    );
    const lineas = [ofStock, 'SACO', saco.medida, 'STOCK'];
    const alto = Math.min(150, Math.min(w, h) / 8, Math.min(w, h) * 0.9 / ((lineas.length - 1) * 1.6 + 1),
      ...lineas.map(v => w * 0.9 / anchoArial(v, 1)));
    lineas.forEach((valor, k) => entidades.textos.push({ capa: 'texto', x: x0 + w / 2, y: y0 + h / 2 - (k - (lineas.length - 1) / 2) * alto * 1.6, h: alto, valor, centrado: true }));
    const pieza: PiezaPuerta = { id: `stock-${i}`, nombre: 'Saco de stock', clase: 'saco', ancho: w / 10, alto: h / 10, cantidad: 1, material, rollo: rolloCm,
      of: ofStock, contorno: [[0, 0], [w / 10, 0], [w / 10, h / 10], [0, h / 10]], radio: 0, marcas: [], textos: [], huecos: [] };
    return { pieza, x: x0, y: y0, girada: false };
  });
}

function colocar(
  piezas: PiezaPuerta[],
  opcion: CortePuertas['opcion'],
  codigosPano: Map<string, string>,
  esEnrollable: (idPieza: string) => boolean,
  esAutorreparable: (idPieza: string) => boolean,
  ofStock?: string,
): CortePuertas[] {
  const grupos = new Map<string, PiezaPuerta[]>();
  for (const p of piezas) {
    if (![p.rollo, p.ancho, p.alto].every(Number.isFinite) || p.rollo <= 0 || p.ancho <= 0 || p.alto <= 0 || Math.min(p.ancho, p.alto) > p.rollo) {
      continue;
    }
    const k = JSON.stringify([p.material, p.rollo]);
    const g = grupos.get(k) ?? [];
    g.push(p);
    grupos.set(k, g);
  }
  return [...grupos.values()].map(grupoOriginal => {
    // Los cristales iguales no se colocan uno a uno: se dibuja uno con cuántos son, porque se cortan de
    // restos (Iván, 21/10/2026; en los cortes hechos, «X2», «X3»… dentro de la pieza).
    const grupo: PiezaPuerta[] = [];
    const cristales = new Map<string, PiezaPuerta>();
    for (const p of grupoOriginal) {
      if (p.clase !== 'cristal') { grupo.push(p); continue; }
      const clave = JSON.stringify([p.ancho, p.alto, p.of, p.radio]);
      const igual = cristales.get(clave);
      if (igual) igual.multiplicador = (igual.multiplicador ?? 1) + p.cantidad;
      else { const una = { ...p, cantidad: 1, multiplicador: p.cantidad }; cristales.set(clave, una); grupo.push(una); }
    }
    const rollo = mm(grupo[0].rollo);
    const entidades = vacias();
    const colocadas: CortePuertas['colocadas'] = [];
    // Aprovechamiento del rollo (Iván, 21/10/2026: «no aprovecha bien el corte»). Se colocan las piezas en
    // columnas a lo largo del rollo, una encima de otra a lo ancho, y se prueban varias maneras: columnas
    // estrechas (piezas de pie) o anchas (frente a lo largo, como el corte a mano de AR2604638, que gasta 172 cm
    // de rollo en vez de 278), ordenando por el lado corto o el largo. También se mezclan: las piezas estrechas de
    // pie y las grandes tumbadas, como el corte a mano de AR2605134 (Iván, 22/10/2026: paños con el frente a lo
    // largo y las E.T. de pie una al lado de otra, 708 cm en vez de 848). Se queda la que gasta menos rollo.
    const umbrales = [...new Set(grupo.map(p => Math.min(p.ancho, p.alto)))].sort((a, b) => a - b);
    const maneras: Array<(p: PiezaPuerta) => 'estrecha' | 'ancha'> = [
      () => 'estrecha',
      () => 'ancha',
      ...umbrales.map(u => (p: PiezaPuerta) => (Math.min(p.ancho, p.alto) <= u ? 'estrecha' as const : 'ancha' as const)),
    ];
    const columnas = maneras
      .flatMap(nueva => (['corto', 'largo'] as const).map(orden => empaquetar(grupo, rollo, nueva, orden,
        p => p.clase === 'pano' && esAutorreparable(p.id))))
      .reduce((mejor, otra) => (largoDe(otra) < largoDe(mejor) - 0.001 ? otra : mejor));
    // Al principio del rollo, primero las piezas que ocupan su ancho entero.
    if (grupo.some(p => !esEnrollable(p.id))) columnas.sort((a, b) =>
      Number(b.piezas.some(t => Math.abs(t.h - rollo) < .001)) - Number(a.piezas.some(t => Math.abs(t.h - rollo) < .001)));
    // Enrollables: A1 arriba y A2 debajo, como en el alzado (Iván, 22/10/2026, corte a mano de AR2605134). Se
    // apila desde abajo, así que sus paños se reordenan de código mayor a menor en los mismos huecos que ocupaban;
    // lo demás (E.T., cachos, otros modelos, que ya cuadraban con sus cortes a mano) no se mueve.
    const codigo = (t: Columna['piezas'][number]) => codigosPano.get(t.pieza.id) ?? '';
    const reordenable = (t: Columna['piezas'][number]) => t.pieza.clase === 'pano' && esEnrollable(t.pieza.id);
    for (const columna of columnas) {
      const ordenados = columna.piezas.filter(reordenable).sort((a, b) => codigo(b).localeCompare(codigo(a), 'es', { numeric: true }));
      columna.piezas = columna.piezas.map(t => (reordenable(t) ? ordenados.shift()! : t));
    }
    let largo = 0;
    const sitios: Array<{ t: Columna['piezas'][number]; x: number; y: number; c: number; xc: number; anchoColumna: number; junta?: boolean }> = [];
    columnas.forEach((columna, c) => {
      let y = 0;
      for (const t of columna.piezas) { sitios.push({ t, x: largo, y, c, xc: largo, anchoColumna: columna.ancho }); y += t.h; }
      largo += columna.ancho;
    });
    // Las piezas iguales en fila que son más estrechas que su columna (los cachos de pie encima de las E.T.) van
    // pegadas, compartiendo el corte, y no sueltas con un hueco cada una (Iván, 22/10/2026, AR2605134).
    const ancho = (s: (typeof sitios)[number]) => mm(s.t.girada ? s.t.pieza.alto : s.t.pieza.ancho);
    for (const s of sitios) {
      if (s.junta || ancho(s) >= s.anchoColumna - 0.001) continue;
      const fila = [s];
      while (true) {
        const ultima = fila.at(-1)!;
        const otra = sitios.find(o => o.c === ultima.c + 1 && Math.abs(o.y - s.y) < 0.001 && Math.abs(o.t.h - s.t.h) < 0.001
          && Math.abs(ancho(o) - ancho(s)) < 0.001 && o.t.pieza.clase === s.t.pieza.clase);
        if (!otra) break;
        fila.push(otra);
      }
      if (fila.length > 1) fila.forEach((o, i) => { o.x = s.x + i * ancho(s); o.junta = true; });
    }
    const primerPano = sitios.find(s => s.t.pieza.clase === 'pano');
    for (const s of sitios) {
      colocadas.push({ pieza: s.t.pieza, x: s.x, y: s.y, girada: s.t.girada });
      dibujarPieza(entidades, s.t.pieza, s.x, s.y, s.t.girada, codigosPano.get(s.t.pieza.id), !esEnrollable(s.t.pieza.id), s === primerPano);
    }
    // Solo en la lona de la puerta (la de los paños) y en el corte principal: no en el transparente ni en el saco.
    // Las piezas juntadas cuentan con su columna entera: el sitio que dejan a la derecha no se da por libre.
    if (ofStock && opcion === 'principal' && grupo.some(p => p.clase === 'pano')) {
      const ocupadas = sitios.map(s => ({ x: s.xc, y: s.y, ancho: s.junta ? s.anchoColumna : ancho(s), hueco: s.t.h }));
      colocadas.push(...sacosDeStock(ocupadas, rollo, ofStock, entidades, grupo[0].material, grupo[0].rollo));
    }
    const titulo =
      opcion === 'principal'
        ? 'CORTE'
        : opcion === 'saco-entero'
          ? 'SACO ENTERO · ALTERNATIVA'
          : 'SACO EN DOS · ALTERNATIVA, ELEGIR SOLO UNA';
    const enrollable = grupo.every(p => esEnrollable(p.id));
    const rotuloMaterial = !enrollable && opcion === 'principal' ? grupo[0].material : `${grupo[0].material} · ${titulo}`;
    entidades.textos.push(
      { capa: 'texto', x: 0, y: rollo + 250, h: enrollable ? 95 : Math.min(200, largo * .95 / anchoArial(rotuloMaterial, 1)), valor: rotuloMaterial },
      // Las puertas se cortan siempre por el revés: se avisa al principio, como el DERECHO de remolques (Iván, 22/10/2026).
    );
    if (enrollable) entidades.textos.push({ capa: 'texto', x: 0, y: rollo + 110, h: 80, valor: 'REVÉS' });
    else if (!primerPano) entidades.textos.push({ capa: 'texto', x: 80, y: Math.min(rollo * .35, 800), h: 80, valor: 'REVÉS', giro: 90 });
    fusionarCortesPuertas(entidades, rollo);
    return { material: grupo[0].material, anchoRollo: rollo, largo, opcion, entidades, colocadas };
  });
}

export function generarCortePuertas(
  pedido: PedidoPuertas,
  { ofStockSacos }: { ofStockSacos?: string } = {},
): VistaPuertas & { archivo: { nombre: string; dxf: string; entidades: EntidadesPuertas } | null } {
  // El id de una pieza se repite entre puertas (clase-n-nombre): se le pone delante el de su puerta para que
  // cada paño se rotule con la letra de la suya (con dos puertas salían todos como B).
  const resultados = pedido.elementos.map(e => {
    const r = calcularPuerta(e.input);
    const propia = (x: PiezaPuerta) => ({ ...x, id: `${e.id}:${x.id}`,
      ...(x.clase === 'saco' && e.input.sacoDiagonalesAmarillas ? { sacoDiagonalesAmarillas: true } : {}) });
    return { ...r, piezas: r.piezas.map(propia),
      alternativasSaco: r.alternativasSaco && { entero: r.alternativasSaco.entero.map(propia), partido: r.alternativasSaco.partido.map(propia) } };
  });
  const codigosPano = new Map<string, string>();
  resultados.forEach((r, idxPuerta) => {
    let indice=idxPuerta+1,letra='';
    while(indice>0) { indice--;letra=String.fromCharCode(65+indice%26)+letra;indice=Math.floor(indice/26); }
    const panos = r.piezas.filter(p => p.clase === 'pano');
    // El cálculo recorre apilables y autorreparables desde abajo; en el plano de taller A1 va arriba.
    if (pedido.elementos[idxPuerta].input.modelo !== 'PUERTAENR') panos.reverse();
    panos.forEach((p, i) => codigosPano.set(p.id, `${letra}${i + 1}`));
    for (const pieza of r.piezas) {
      if (pieza.clase !== 'pano') codigosPano.set(pieza.id, letra);
    }
    for (const pieza of [...r.alternativasSaco?.entero ?? [], ...r.alternativasSaco?.partido ?? []]) codigosPano.set(pieza.id, letra);
  });
  const avisos = resultados.flatMap((r, i) => r.avisos.map(a => ({ ...a, texto: `Puerta ${i + 1}: ${a.texto}` })));
  const sinOf = pedido.elementos
    .filter(e => !e.input.of.trim() || e.input.of.trim().toUpperCase() === 'SIN OF')
    .map(e => e.id);
  const enrollables = pedido.elementos.filter(e => e.input.modelo === 'PUERTAENR').map(e => `${e.id}:`);
  const esEnrollable = (idPieza: string) => enrollables.some(prefijo => idPieza.startsWith(prefijo));
  const autorreparables = pedido.elementos.filter(e => e.input.modelo === 'PUERTAUTO').map(e => `${e.id}:`);
  const esAutorreparable = (idPieza: string) => autorreparables.some(prefijo => idPieza.startsWith(prefijo));
  const principal = resultados.flatMap(r => r.piezas);
  const entero = resultados.flatMap(r => r.alternativasSaco?.entero ?? []);
  const partido = resultados.flatMap(r => r.alternativasSaco?.partido ?? []);
  const cortes = [
    ...colocar(principal, 'principal', codigosPano, esEnrollable, esAutorreparable, ofStockSacos),
    ...colocar(entero, 'saco-entero', codigosPano, esEnrollable, esAutorreparable),
    ...colocar(partido, 'saco-partido', codigosPano, esEnrollable, esAutorreparable),
  ];
  let archivo = null;
  if (!sinOf.length && !avisos.some(a => a.nivel === 'error') && pedido.orderCode.trim() && cortes.length) {
    const entidades = vacias();
    let dy = 0;
    for (const c of cortes) {
      entidades.lineas.push(...c.entidades.lineas.map(l => ({ ...l, y1: l.y1 + dy, y2: l.y2 + dy })));
      entidades.textos.push(...c.entidades.textos.map(t => ({ ...t, y: t.y + dy })));
      entidades.arcos.push(...c.entidades.arcos.map(a => ({ ...a, y: a.y + dy })));
      entidades.circulos.push(...c.entidades.circulos.map(a => ({ ...a, y: a.y + dy })));
      dy += c.anchoRollo + 1500;
    }
    archivo = { nombre: pedido.orderCode, dxf: escribirDxf2004(entidades), entidades };
  }
  return { resultados, cortes, avisos, sinOf, archivo };
}
