import { AJUSTES_POR_DEFECTO, piezasToldo } from './despiece.js';
import { buscarColocacion, compararStock, huecosLibres, PRESUPUESTO_TETRIS } from './colocacionTetris.ts';

export { PRESUPUESTO_TETRIS };

// Iván, 17/11/2026: alto × ancho en cm, cualquier PVC y gramaje, ±10 cm en ambos lados.
// Una tira hace un saco; dos trozos hacen un saco. La OF sigue siendo la del dibujo de stock.
export const SACOS = [[260, 85], [130, 85]];
export const MARGEN_SACO_CM = 10;

/** Iván, 17/11/2026: las parejas se cuentan en todo el corte del material, entre todos sus huecos. */
export function completarParejasSacos(sacos) {
  const trozos = sacos.filter(s => s.medidaCatalogo === '130X85');
  const sobrante = trozos.length % 2 ? trozos.at(-1) : null;
  return sacos.filter(s => s !== sobrante);
}

/** Iván, 17/11/2026: solo cuentan sacos cerrados; el trozo impar no suma otro saco. */
export function valorarSacos(sacos) {
  const tiras = sacos.filter(s => s.medidaCatalogo === '260X85').length;
  return { sacos: tiras + Math.floor((sacos.length - tiras) / 2), tiras, piezas: sacos.length,
    area: sacos.reduce((s, q) => s + q.ancho * q.hueco, 0), ancho: Math.max(0, ...sacos.map(q => q.y + q.hueco)) };
}

/**
 * Sacos que caben en la lona que queda libre dentro del largo de rollo ya gastado: encima de las piezas
 * de cada columna y a la derecha de las piezas más cortas que su columna. En cada hueco se pone en
 * filas la opción que da más sacos, priorizando tiras a igualdad (Iván, 17/11/2026). Devuelve piezas en mm.
 */
export function sacosEnHuecos(colocadas, anchoRolloMm, ofStock) {
  const columnas = new Map();
  for (const p of colocadas) {
    const c = columnas.get(p.x) || { x: p.x, largo: 0, alto: 0, piezas: [] };
    c.largo = Math.max(c.largo, p.ancho);
    c.alto = Math.max(c.alto, p.y + p.hueco);
    c.piezas.push(p);
    columnas.set(p.x, c);
  }
  const huecos = [];
  for (const c of columnas.values()) {
    huecos.push({ x: c.x, y: c.alto, w: c.largo, h: anchoRolloMm - c.alto });
    for (const p of c.piezas) if (p.ancho < c.largo) huecos.push({ x: p.x + p.ancho, y: p.y, w: c.largo - p.ancho, h: p.hueco });
  }
  return sacosEnRectangulos(huecos, ofStock);
}

/** Rejillas de un retal, incluidas las alternativas que dejan sin cortar su último trozo. */
function rejillasSacos(hueco, ofStock) {
  const opciones = [[]];
  const m = MARGEN_SACO_CM * 10;
  for (const [alto, ancho] of SACOS) {
    for (const [w, h, girado] of [[ancho * 10, alto * 10, false], [alto * 10, ancho * 10, true]]) {
      // Cuántos caben a lo largo y a lo ancho con el margen, y a qué medida quedan (en cm enteros).
      const nx = Math.floor(hueco.w / (w - m)), ny = Math.floor(hueco.h / (h - m));
      if (!nx || !ny) continue;
      const wr = Math.max(w - m, Math.floor(Math.min(w + m, hueco.w / nx) / 10) * 10);
      const hr = Math.max(h - m, Math.floor(Math.min(h + m, hueco.h / ny) / 10) * 10);
      // Rotulado con la medida real que queda (Iván), alto × ancho como en el dibujo de stock.
      const [altoReal, anchoReal] = girado ? [wr / 10, hr / 10] : [hr / 10, wr / 10];
      const rejilla = [];
      for (let i = 0; i < nx; i++) for (let j = 0; j < ny; j++) {
        rejilla.push({ nombre: 'SACO', saco: true, medida: `${altoReal}X${anchoReal}`, medidaCatalogo: `${alto}X${ancho}`, of: ofStock, marcas: [], girada: false,
          x: hueco.x + i * wr, y: hueco.y + j * hr, ancho: wr, hueco: hr, largo: wr, alto: hr });
      }
      opciones.push(rejilla);
      if (alto === 130) opciones.push(rejilla.slice(0, -1));
    }
  }
  return opciones;
}

/** Iván, 17/11/2026: conserva la mejor combinación con total par y con total impar de trozos.
 * Dentro de cada paridad el valor es aditivo: el siguiente retal puede completar el trozo pendiente.
 * Incluir una pieza menos permite cerrar el material sin que un impar gane a una tira completa.
 */
export function planesSacosEnRectangulos(huecos, ofStock) {
  let mejores = [{ sacos: [], valor: valorarSacos([]) }, null];
  for (const hueco of huecos) {
    const siguientes = [null, null];
    for (const previo of mejores.filter(Boolean)) for (const rejilla of rejillasSacos(hueco, ofStock)) {
      const sacos = [...previo.sacos, ...rejilla], valor = valorarSacos(sacos);
      const paridad = (valor.piezas - valor.tiras) % 2;
      if (!siguientes[paridad] || compararStock(valor, siguientes[paridad].valor) > 0) siguientes[paridad] = { sacos, valor };
    }
    mejores = siguientes;
  }
  return mejores.filter(Boolean).map(p => p.sacos);
}

/** Retales sin solapes; el primer plan tiene todas las parejas cerradas entre todos los huecos. */
export function sacosEnRectangulos(huecos, ofStock) {
  return planesSacosEnRectangulos(huecos, ofStock)[0];
}

/**
 * Sacos en los retales libres de verdad: con el colocador «Tetris» las piezas ya no van siempre en columnas,
 * así que se buscan en todos los huecos libres (los más grandes primero), con las mismas medidas y márgenes.
 */
export function sacosEnRetales(colocadas, anchoRolloMm, ofStock) {
  const largo = Math.max(0, ...colocadas.map((p) => p.x + p.ancho));
  return sacosEnRectangulos(huecosLibres(colocadas.map((p) => ({ x: p.x, y: p.y, w: p.ancho, h: p.hueco })), largo, anchoRolloMm), ofStock);
}

/** Iván, 17/11/2026: el Tetris desempata a igual largo por sacos equivalentes, tiras y superficie. */
function aprovechamientoSacos(anchoRolloMm, ofStock) {
  return (libres) => {
    const sacos = sacosEnRectangulos(libres, ofStock);
    return valorarSacos(sacos);
  };
}

// Hasta este número de piezas se prueban todos los repartos en columnas (3^n combinaciones);
// con más, se prueban varios órdenes de colocación y se queda el más corto.
const MAX_PIEZAS_EXACTO = 13;

/**
 * Coloca las piezas en el rollo gastando el menor largo posible (Iván: siempre aprovechar el
 * ancho y gastar los menos metros lineales). Las piezas se apilan en columnas a lo ancho del
 * rollo; cada columna gasta el largo de su pieza más larga. Una pieza se puede girar 90° si así
 * cabe, como hace la oficina (cuerpo de AR2405992, tira de AR2505753). A igual largo se prefieren
 * menos piezas giradas y menos columnas.
 * Cada pieza colocada lleva su hueco en el rollo: x, y, ancho (a lo largo), hueco (a lo ancho) y `girada`.
 *
 * Después, el colocador «Tetris» de puertas parte de ese reparto en columnas y solo lo cambia si gasta menos
 * largo o, con el mismo, aprovecha más lona para sacos (`aprovechamiento`) o deja menos ancho ocupado.
 * Nunca sale peor que por columnas. `presupuesto` se comparte entre todas las colocaciones del pedido.
 */
export function colocar(piezas, anchoRolloMm, { presupuesto = { restantes: PRESUPUESTO_TETRIS }, aprovechamiento } = {}) {
  const porColumnas = colocarEnColumnas(piezas, anchoRolloMm);
  if (!porColumnas.length || presupuesto.restantes <= 0) return porColumnas;
  const inicial = porColumnas.map((p, i) => ({ id: String(i), x: p.x, y: p.y, w: p.ancho, h: p.hueco, girada: p.girada }));
  const busqueda = porColumnas.map((p, i) => ({ id: String(i), formas: [
    { w: p.largo, h: p.alto, girada: false }, { w: p.alto, h: p.largo, girada: true }].filter((f) => f.h <= anchoRolloMm) }));
  const elegidas = buscarColocacion(busqueda, anchoRolloMm, inicial, presupuesto, undefined, aprovechamiento);
  return elegidas.map((r) => ({ ...porColumnas[Number(r.id)], girada: r.girada, ancho: r.w, hueco: r.h, x: r.x, y: r.y }))
    .sort((a, b) => a.x - b.x || a.y - b.y);
}

function colocarEnColumnas(piezas, anchoRolloMm) {
  if (!Number.isFinite(anchoRolloMm) || anchoRolloMm <= 0) throw new Error('Ancho de rollo no válido.');
  if (!piezas.length) return [];
  if (piezas.some((p) => !Number.isFinite(p.largo) || !Number.isFinite(p.alto) || p.largo <= 0 || p.alto <= 0)) throw new Error('Las piezas deben tener medidas positivas.');
  const formas = piezas.map((p) => {
    const f = [{ girada: false, w: p.largo, h: p.alto }, { girada: true, w: p.alto, h: p.largo }]
      .filter((x) => x.h <= anchoRolloMm);
    if (!f.length) throw new Error(`${p.nombre} no cabe en el rollo`);
    return f;
  });
  const grupos = piezas.length <= MAX_PIEZAS_EXACTO
    ? repartoExacto(formas, anchoRolloMm)
    : repartoPorOrden(formas, anchoRolloMm);
  const columnas = grupos.sort((a, b) => b.largo - a.largo);
  let x = 0;
  return columnas.flatMap((c) => {
    let y = 0;
    const out = c.piezas.sort((a, b) => b.f.h - a.f.h).map(({ i, f }) => {
      const p = { ...piezas[i], girada: f.girada, ancho: f.w, hueco: f.h, x, y };
      y += f.h;
      return p;
    });
    x += c.largo;
    return out;
  });
}

const coste = (largo, giradas, columnas) => largo * 1000 + giradas * 20 + columnas;

/** Mejor columna para un grupo de piezas: la de menor largo que cabe a lo ancho del rollo. */
function columna(indices, formas, anchoRolloMm) {
  const candidatos = [...new Set(indices.flatMap((i) => formas[i].map((f) => f.w)))].sort((a, b) => a - b);
  for (const largo of candidatos) {
    const elegidas = [];
    let alto = 0;
    for (const i of indices) {
      const f = formas[i].filter((x) => x.w <= largo).sort((a, b) => a.h - b.h || a.girada - b.girada)[0];
      if (!f) break;
      elegidas.push({ i, f });
      alto += f.h;
    }
    if (elegidas.length === indices.length && alto <= anchoRolloMm) {
      return { largo, piezas: elegidas, giradas: elegidas.filter((e) => e.f.girada).length };
    }
  }
  return null;
}

/** Prueba todos los repartos de las piezas en columnas y se queda el más corto. */
function repartoExacto(formas, anchoRolloMm) {
  const n = formas.length;
  const total = (1 << n) - 1;
  const col = new Array(total + 1);
  for (let m = 1; m <= total; m++) {
    const idx = [];
    for (let i = 0; i < n; i++) if (m & (1 << i)) idx.push(i);
    col[m] = columna(idx, formas, anchoRolloMm);
  }
  const mejor = new Array(total + 1).fill(null);
  mejor[0] = { coste: 0, grupos: [] };
  for (let m = 1; m <= total; m++) {
    const baja = m & -m; // la pieza más baja del grupo va siempre en la columna que se elige
    for (let s = m; s; s = (s - 1) & m) {
      if (!(s & baja) || !col[s] || !mejor[m ^ s]) continue;
      const c = col[s];
      const v = mejor[m ^ s].coste + coste(c.largo, c.giradas, 1);
      if (!mejor[m] || v < mejor[m].coste) mejor[m] = { coste: v, grupos: [...mejor[m ^ s].grupos, c] };
    }
  }
  return mejor[total].grupos.map((g) => ({ ...g, piezas: [...g.piezas] }));
}

/** Con muchas piezas: coloca una a una en varios órdenes y se queda el más corto. */
function repartoPorOrden(formas, anchoRolloMm) {
  const idx = formas.map((_, i) => i);
  const grande = (i) => Math.max(...formas[i].map((f) => Math.max(f.w, f.h)));
  const ordenes = [
    [...idx].sort((a, b) => grande(b) - grande(a)),
    [...idx].sort((a, b) => formas[b][0].h - formas[a][0].h),
    [...idx].sort((a, b) => formas[b][0].w - formas[a][0].w)
  ];
  let semilla = 1;
  const azar = () => ((semilla = (semilla * 16807) % 2147483647) / 2147483647);
  for (let k = 0; k < 500; k++) ordenes.push([...idx].sort(() => azar() - 0.5));
  let mejor = null;
  for (const orden of ordenes) {
    const grupos = [];
    for (const i of orden) {
      let sitio = null;
      for (const g of grupos) {
        const c = columna([...g.piezas.map((e) => e.i), i], formas, anchoRolloMm);
        if (c && (!sitio || c.largo - g.largo < sitio.crece)) sitio = { g, c, crece: c.largo - g.largo };
      }
      if (sitio) Object.assign(sitio.g, sitio.c);
      else grupos.push(columna([i], formas, anchoRolloMm));
    }
    const v = grupos.reduce((s, g) => s + coste(g.largo, g.giradas, 1), 0);
    if (!mejor || v < mejor.v) mejor = { v, grupos };
  }
  return mejor.grupos;
}


/**
 * Despiece y colocación de una sola tela. Medidas de entrada en cm; salida en mm.
 * En vertical prueba tira entera y partida, salvo que el ajuste la fije expresamente.
 */
export function cortePedido(toldos, verticales = [], { presupuesto = { restantes: PRESUPUESTO_TETRIS }, aprovechamiento } = {}) {
  if (!toldos.length) throw new Error('No hay toldos para colocar.');
  const anchoRollo = toldos[0].anchoRollo;
  if (toldos.some((t) => t.anchoRollo !== anchoRollo)) throw new Error('Cada corte debe usar un solo ancho de rollo.');
  const ajustes = toldos.map((t) => ({ ...AJUSTES_POR_DEFECTO, ...t.ajustes,
    ...(verticales.includes(t.letra) ? { empate: 'vertical' } : {}) }));
  const automaticas = toldos.map((t, i) => i).filter((i) =>
    ajustes[i].empate === 'vertical' && toldos[i].frenteTela > anchoRollo && toldos[i].ajustes?.tiraPartida === undefined);
  let mejor = null;
  for (let variante = 0; variante < 2 ** automaticas.length; variante++) {
    const elegidos = ajustes.map((a, i) => ({ ...a,
      ...(automaticas.includes(i) ? { tiraPartida: Math.floor(variante / 2 ** automaticas.indexOf(i)) % 2 === 1 } : {}) }));
    const porToldo = toldos.map((t, i) => ({ letra: t.letra, unidades: t.unidades ?? 1, piezas: piezasToldo({ ...t, ajustes: elegidos[i] }) }));
    const todas = porToldo.flatMap((p, i) => {
      const unidades = toldos[i].unidades ?? 1;
      if (!Number.isInteger(unidades) || unidades < 1) throw new Error('Las unidades deben ser enteras y positivas.');
      return Array.from({ length: unidades }, () => p.piezas.map((q) => ({ ...q, letra: p.letra, of: toldos[i].of, ajustes: elegidos[i] }))).flat();
    });
    const colocadas = colocar(todas, anchoRollo * 10, { presupuesto, aprovechamiento });
    const largo = Math.max(...colocadas.map((p) => p.x + p.ancho));
    if (!mejor || largo < mejor.largo) mejor = { piezas: porToldo, colocadas, largo };
    // Iván, 28/10/2026: una plantilla Xn solo si su gasto real (n cortes) no supera el de todas anidadas.
    if (toldos.length === 1 && toldos[0].embudo && toldos[0].unidades > 1) {
      const n = toldos[0].unidades;
      const plantilla = colocar(todas.slice(0, porToldo[0].piezas.length).map(p => ({ ...p, repeticiones: n })), anchoRollo * 10, { presupuesto, aprovechamiento });
      const largoPlantilla = Math.max(...plantilla.map(p => p.x + p.ancho));
      if (largoPlantilla * n <= largo + 1e-6) mejor = { piezas: porToldo, colocadas: plantilla,
        largo: largoPlantilla, largoMaterial: largoPlantilla * n, repeticiones: n };
    }
  }
  return mejor;
}

/** Dos opciones de taller: aprovechar huecos con sacos o reservar el paño pequeño para restos. */
export function opcionesCorte(toldos, ofStockSacos, presupuesto = { restantes: PRESUPUESTO_TETRIS }) {
  // La tela reservada solo para bambas, y el cristal de las cortinas, no se completan con stock ni tienen
  // alternativa de restos.
  const sinStock = toldos.every(t => t.soloBamba || t.soloCristal);
  const anchoRollo = toldos[0].anchoRollo * 10;
  const corte = cortePedido(toldos, [], { presupuesto, aprovechamiento: sinStock ? undefined : aprovechamientoSacos(anchoRollo, ofStockSacos) });
  if (sinStock) return { conSacos: { ...corte, sacos: [] }, trozoSeparado: null };
  const sacos = sacosEnRetales(corte.colocadas, anchoRollo, ofStockSacos);
  const conSacos = { ...corte, colocadas: [...corte.colocadas, ...sacos], sacos };
  // La cortina no: sus piezas pequeñas son los laterales de la ventana, que se sueldan a las bandas.
  const letras = new Set(corte.piezas.filter((p, i) =>
    !toldos[i].cortina && !toldos[i].solapas && !toldos[i].embudo && (toldos[i].ajustes?.empate || 'horizontal') === 'horizontal' &&
    p.piezas.filter((q) => !q.nombre.includes('BAMBA')).length > 1).map((p) => p.letra));
  const pequena = (p) => letras.has(p.letra) && (p.nombre.includes('BAMBA') || p.alto < anchoRollo);
  const todas = corte.colocadas.map(({ girada: _g, ancho: _a, hueco: _h, x: _x, y: _y, ...p }) => p);
  if (!todas.some(pequena)) return { conSacos, trozoSeparado: null };
  const principal = colocar(todas.filter((p) => !pequena(p)), anchoRollo, { presupuesto });
  const largoPrincipal = Math.max(...principal.map((p) => p.x + p.ancho));
  const restos = colocar(todas.filter(pequena), anchoRollo, { presupuesto });
  const largoRestos = Math.max(...restos.map((p) => p.x + p.ancho));
  const xRestos = largoPrincipal + 1500;
  const aparte = restos.map((p) => ({ ...p, x: p.x + xRestos, aparte: true }));
  const texto = (valor, x, y, h) => ({ capa: 'texto', valor, x, y, h, centrado: true });
  return { conSacos, trozoSeparado: {
    piezas: corte.piezas, colocadas: [...principal, ...aparte], sacos: [],
    largo: largoPrincipal, largoRestos, extensionDibujo: xRestos + largoRestos,
    textosExtra: [
      texto('CORTE PRINCIPAL', largoPrincipal / 2, anchoRollo + 350, 150),
      texto('CORTAR DE RESTOS', xRestos + largoRestos / 2, anchoRollo + 500, 150),
      texto('SI NO HAY RESTO, CORTAR DEL ROLLO', xRestos + largoRestos / 2, anchoRollo + 300, 100)
    ]
  } };
}
