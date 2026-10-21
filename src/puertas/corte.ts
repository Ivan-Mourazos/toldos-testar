import { escribirDxf2004 } from '../domain/corteLona/dxfCorte.js';
import { anchoArial } from '../domain/corteLona/texto.js';
import { calcularPuerta } from './calcular.ts';
import type { CortePuertas, EntidadesPuertas, Hueco, PedidoPuertas, PiezaPuerta, Punto, VistaPuertas } from './tipos.ts';

const vacias = (): EntidadesPuertas => ({ lineas: [], textos: [], arcos: [], circulos: [] });
const mm = (x: number) => Math.round(x * 10000) / 1000;

/** Une tramos colineales y elimina cortes sobre los orillos, como remolques/corte. */
function fusionar(entidades: EntidadesPuertas, rollo: number) {
  const grupos = new Map<string, number[][]>();
  const resto: EntidadesPuertas['lineas'] = [];
  for (const l of entidades.lineas) {
    if (l.capa !== 'DISCO1') {
      resto.push(l);
      continue;
    }
    if (Math.abs(l.x1 - l.x2) < 0.001 && Math.abs(l.y1 - l.y2) < 0.001) continue;
    const horizontal = Math.abs(l.y1 - l.y2) < 0.001;
    if (horizontal && (Math.abs(l.y1) < 0.001 || Math.abs(l.y1 - rollo) < 0.001)) continue;
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
    const sufijo = /(\d+)\s*$/.exec(pieza.nombre)?.[1];
    const base = /superior/i.test(pieza.nombre)
      ? 'PAÑO DE ARRIBA'
      : /inferior/i.test(pieza.nombre)
        ? 'PAÑO DE ABAJO'
        : sufijo === '1'
          ? 'PAÑO DE ABAJO'
          : 'PAÑO DE ARRIBA';
    return codigoPano ? `${codigoPano} · ${base}` : base;
  }
  if (pieza.clase === 'cacho') return 'CACHO';
  if (pieza.clase === 'entrada') {
    const n = /(\d+)\s*$/.exec(pieza.nombre)?.[1];
    if (n) return `ENTRADA ${n}`;
    if (/delantera/i.test(pieza.nombre)) return 'ENTRADA DELANTERA';
    if (/trasera/i.test(pieza.nombre)) return 'ENTRADA TRASERA';
    return 'ENTRADA';
  }
  if (pieza.clase === 'saco') return 'SACO';
  return 'CRISTAL';
}

function rotulosPieza(
  entidades: EntidadesPuertas,
  pieza: PiezaPuerta,
  x: number,
  y: number,
  girada: boolean,
  codigoPano?: string,
) {
  const wMm = girada ? mm(pieza.alto) : mm(pieza.ancho);
  const hMm = girada ? mm(pieza.ancho) : mm(pieza.alto);
  const vertical = hMm > wMm;
  const largoMm = Math.max(wMm, hMm);
  const cortoMm = Math.min(wMm, hMm);
  const cx = x + wMm / 2;
  const cy = y + hMm / 2;
  const of = (pieza.of.trim() || 'SIN OF').toUpperCase();
  const clase = etiquetaClasePieza(pieza, codigoPano);

  const multiplicador = (pieza.multiplicador ?? 1) > 1 ? [`X${pieza.multiplicador}`] : [];
  const lineasTexto = [
    ...(cortoMm < 130
      ? [`${clase} · ${of} · REVÉS`]
      : cortoMm < 280
        ? [`${clase} · ${of}`, 'REVÉS']
        : [clase, of, 'REVÉS']),
    ...multiplicador,
  ];

  const maxPorCorto = (cortoMm * 0.82) / ((lineasTexto.length - 1) * 1.5 + 1);
  const maxPorLargo = Math.min(...lineasTexto.map(v => (largoMm * 0.88) / Math.max(1, anchoArial(v, 1))));
  const tope = lineasTexto.length === 1 ? Math.min(120, cortoMm * 0.68) : Math.min(260, cortoMm / 3);
  const minimoLegible = Math.min(cortoMm * 0.68, 42);
  const alto = Math.round(Math.max(minimoLegible, Math.min(tope, maxPorCorto, maxPorLargo)) * 10) / 10;

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
    for (const [p0, p1] of [
      [[a + r, b], [a + w - r, b]],
      [[a + w, b + r], [a + w, b + hg - r]],
      [[a + w - r, b + hg], [a + r, b + hg]],
      [[a, b + hg - r], [a, b + r]],
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
  pieza.huecos.forEach(h => redondeado(h, true));
  rotulosPieza(entidades, pieza, x, y, girada, codigoPano);
}

function colocar(
  piezas: PiezaPuerta[],
  opcion: CortePuertas['opcion'],
  codigosPano: Map<string, string>,
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
    const columnas: Array<{ ancho: number; alto: number; piezas: Array<{ pieza: PiezaPuerta; h: number; girada: boolean }> }> = [];
    const orden = [...grupo].sort((a, b) => Math.min(b.ancho, b.alto) - Math.min(a.ancho, a.alto));
    for (const p of orden) {
      for (let k = 0; k < p.cantidad; k++) {
        const opciones = [
          { w: mm(p.ancho), h: mm(p.alto), g: false },
          { w: mm(p.alto), h: mm(p.ancho), g: true },
        ].filter(t => t.h <= rollo);
        const viables = columnas
          .flatMap((columna, i) =>
            opciones
              .filter(t => t.w <= columna.ancho + 0.001 && t.h + columna.alto <= rollo + 0.001)
              .map(t => ({ i, t, resto: rollo - columna.alto - t.h })),
          )
          .sort((a, b) => a.resto - b.resto);
        let elegida = viables[0];
        if (!elegida) {
          opciones.sort((a, b) => a.w - b.w || b.h - a.h);
          const t = opciones[0];
          elegida = { i: columnas.length, t, resto: rollo - t.h };
          columnas.push({ ancho: t.w, alto: 0, piezas: [] });
        }
        const columna = columnas[elegida.i];
        columna.piezas.push({ pieza: p, h: elegida.t.h, girada: elegida.t.g });
        columna.alto += elegida.t.h;
      }
    }
    let largo = 0;
    for (const columna of columnas) {
      let y = 0;
      for (const t of columna.piezas) {
        colocadas.push({ pieza: t.pieza, x: largo, y, girada: t.girada });
        dibujarPieza(entidades, t.pieza, largo, y, t.girada, codigosPano.get(t.pieza.id));
        y += t.h;
      }
      largo += columna.ancho;
    }
    const titulo =
      opcion === 'principal'
        ? 'CORTE'
        : opcion === 'saco-entero'
          ? 'SACO ENTERO · ALTERNATIVA'
          : 'SACO EN DOS · ALTERNATIVA, ELEGIR SOLO UNA';
    entidades.textos.push(
      { capa: 'texto', x: 0, y: rollo + 250, h: 95, valor: `${grupo[0].material} · ${titulo}` },
      { capa: 'texto', x: 0, y: rollo + 110, h: 80, valor: 'DERECHO' },
    );
    fusionar(entidades, rollo);
    return { material: grupo[0].material, anchoRollo: rollo, largo, opcion, entidades, colocadas };
  });
}

export function generarCortePuertas(
  pedido: PedidoPuertas,
): VistaPuertas & { archivo: { nombre: string; dxf: string; entidades: EntidadesPuertas } | null } {
  const resultados = pedido.elementos.map(e => calcularPuerta(e.input));
  const codigosPano = new Map<string, string>();
  resultados.forEach((r, idxPuerta) => {
    const letra = String.fromCharCode(65 + (idxPuerta % 26));
    let nPano = 1;
    for (const pieza of r.piezas) {
      if (pieza.clase === 'pano') {
        codigosPano.set(pieza.id, `${letra}${nPano++}`);
      }
    }
  });
  const avisos = resultados.flatMap((r, i) => r.avisos.map(a => ({ ...a, texto: `Puerta ${i + 1}: ${a.texto}` })));
  const sinOf = pedido.elementos
    .filter(e => !e.input.of.trim() || e.input.of.trim().toUpperCase() === 'SIN OF')
    .map(e => e.id);
  const principal = resultados.flatMap(r => r.piezas);
  const entero = resultados.flatMap(r => r.alternativasSaco?.entero ?? []);
  const partido = resultados.flatMap(r => r.alternativasSaco?.partido ?? []);
  const cortes = [
    ...colocar(principal, 'principal', codigosPano),
    ...colocar(entero, 'saco-entero', codigosPano),
    ...colocar(partido, 'saco-partido', codigosPano),
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
