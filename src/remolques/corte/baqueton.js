// Corte de baquetones, en mm (docs/dxf-corte-remolques.md, contrastado con los cortes a mano):
// - Pieza en cruz: paño único menos las esquinas; delante a la izquierda, detrás a la derecha. Alto de la
//   esquina: el hecho va centrado a lo ancho y la esquina se queda 1 cm antes. El hecho empieza a 1 cm de la
//   esquina de delante.
// - Girada si el largo cabe en el rollo (250). Varias unidades una al lado de otra, compartiendo el corte.
// - Si ni el largo ni el ancho caben: empate horizontal de 2 cm partiendo el largo (250 desde delante y el
//   resto detrás: el empate, siempre en la parte de atrás).
// - Ollaos: círculo de ROTULADOR r 2,5 a 40 mm del borde, en las posiciones que guardó el técnico
//   (laterales de atrás a delante; delante y detrás de izquierda a derecha).
// - Refuerzos de esquina (PAMILAKAN o si la observación lo pide): ver medidasRefuerzo.

const ROLLO = 2500, BORDE_OLLAO = 40, EMPATE = 20;
const r1 = (v) => Math.round(v * 10) / 10;
// Todas las posiciones: los pedidos guardados antes del 30/10/2026 traen como mucho 12 por lado en «REPARTIDOS»; con n y paso se completan.
const completas = (eje, guardadas) => (eje && eje.n > guardadas.length ? Array.from({ length: eje.n }, (_, i) => r1(guardadas[0] + eje.dist * i)) : guardadas);

// Una pieza de baquetón sin girar: x = largo, delante a la izquierda y detrás a la derecha (Iván,
// 20/10/2026); y = ancho. `eI` y `eR` son las esquinas de la izquierda (delante) y de la derecha (detrás).
export function piezaBaqueton(el, _params) {
  const { input, result: r } = el;
  const L = r.panoUnico.largo * 10, A = r.panoUnico.ancho * 10;
  // A lo ancho el hecho va centrado en el paño y la esquina se queda 1 cm antes (taller, 21/10/2026: con el
  // +1 de hecho de AYALA, la mitad del extra de costura la descentraba medio centímetro).
  const eI = r.esquinaDelante * 10, eR = r.esquinaDetras * 10, eb = Math.round((A - r.remolqueHecho.ancho * 10) / 2) - 10;
  // El remolque hecho empieza a 1 cm de la esquina de delante; los laterales se miden de atrás a delante.
  const finHecho = eI + 10 + r.remolqueHecho.largo * 10, my = eb + 10;
  const rep = r.reparto, repartidos = input.modoOllaos === 'REPARTIDOS';
  const lat = repartidos ? completas(r.ollaos.largo, rep.laterales) : rep.laterales;
  const del = repartidos ? completas(r.ollaos.ancho, rep.delante) : rep.delante;
  const atr = repartidos ? completas(r.ollaos.anchoAtras ?? r.ollaos.ancho, rep.atras) : rep.atras;
  const ollaos = [
    ...lat.flatMap((p) => [[finHecho - p * 10, BORDE_OLLAO], [finHecho - p * 10, A - BORDE_OLLAO]]),
    ...del.map((p) => [BORDE_OLLAO, my + p * 10]),
    ...atr.map((p) => [L - BORDE_OLLAO, my + p * 10]),
  ];
  return { L, A, eI, eR, eb, ollaos };
}

// Contorno en cruz como lista de segmentos, con las esquinas dadas.
export function cruz(L, A, eI, eDer, eb) {
  const p = [[eI, 0], [L - eDer, 0], [L - eDer, eb], [L, eb], [L, A - eb], [L - eDer, A - eb], [L - eDer, A], [eI, A], [eI, A - eb], [0, A - eb], [0, eb], [eI, eb]];
  return p.map((a, i) => [a, p[(i + 1) % p.length]]);
}

// L de refuerzo pegada a la esquina interior (cx, cy), abriéndose hacia (sx, sy).
function refuerzoEnEsquina(cx, cy, sx, sy, lado, brazo) {
  const q = [[0, lado], [brazo, lado], [brazo, brazo], [lado, brazo], [lado, 0]].map(([u, v]) => [cx + sx * u, cy + sy * v]);
  return q.slice(0, -1).map((a, i) => [a, q[i + 1]]);
}
// Refuerzo suelto apoyado por abajo en (x0, y0), con el hueco de la esquina arriba a la derecha (o a la
// izquierda, `espejo`): así los cuatro van en fila compartiendo cortes, como en AR2604224.
function refuerzoSuelto(x0, y0, lado, brazo, espejo = false) {
  const q = [[0, 0], [lado, 0], [lado, brazo], [brazo, brazo], [brazo, lado], [0, lado]].map(([u, v]) => [espejo ? lado - u : u, v]);
  return q.map((a, i) => [[x0 + a[0], y0 + a[1]], [x0 + q[(i + 1) % q.length][0], y0 + q[(i + 1) % q.length][1]]]);
}

/**
 * Refuerzos de esquina de PAMILAKAN (docs/dxf-corte-remolques.md y los DWG de AR2604224 y AR2604802): una L,
 * un cuadrado sin el cuadrado de la esquina de fuera. Si cabe en la esquina cortada, va dentro: L de 16 con
 * brazos de la mitad, reducida a la esquina − 2 (AR2605082, AR2603086). Si no (esquina de 12 o menos), los
 * cuatro van sueltos encima de la pieza: de lado la esquina + 2 y brazos de 7 (9 con esquina de 7 en
 * AR2604224, 11 con esquina de 9 en AR2604802). En mm.
 */
export function medidasRefuerzo(pz) {
  const esquina = Math.min(pz.eI, pz.eR, pz.eb);
  const dentro = Math.min(160, esquina - 20);
  return dentro >= 120 ? { enEsquina: true, lado: dentro, brazo: dentro / 2 } : { enEsquina: false, lado: esquina + 20, brazo: 70 };
}

/** true si el baquetón cabe en el rollo sin empate (por el largo o por el ancho). */
export const cabeEnRollo = (el, params) => { const pz = piezaBaqueton(el, params); return pz.L <= ROLLO || pz.A <= ROLLO; };

/**
 * Las unidades de un baquetón que cabe en el rollo, como piezas para colocarlas por huecos junto a las de
 * las lonas altas de la misma lona (lonaAlta.js, cortarLonasAltas). Como a mano en AR2605088: las cabezas
 * entran encima de los baquetones. Cada pieza, sin girar (x = largo, delante a la izquierda; y = ancho); los
 * refuerzos sueltos, una pieza aparte con los cuatro en fila.
 */
// `marcar`: si el nombre de la pieza va también en rotulador (solo con dos baquetones o más; ver lonaAlta.js rotular).
export function piezasBaqueton(el, params, letras = [], refuerzos = false, marcar = true) {
  const pz = piezaBaqueton(el, params);
  const piezas = [];
  for (let u = 0; u < (el.input.cantidad || 1); u++) {
    const L = letras[u] ?? '';
    const p = { w: pz.L, h: pz.A, lineas: [], arcos: [], ollaos: pz.ollaos.map(([x, y]) => [x, y]), rot: [], numeros: [] };
    for (const [[a, b], [c, d]] of cruz(pz.L, pz.A, pz.eI, pz.eR, pz.eb)) p.lineas.push([a, b, c, d]);
    // Rótulo de esquina dentro de la solapa de abajo, junto a la esquina de la izquierda (como en cortarBaquetones).
    if (L) { if (marcar) p.numeros.push([pz.eI + 15, 15, `${L}1`, 0, 'esquina']); p.etiqueta = `${L}1`; }
    p.contornoDe = el.of;
    piezas.push(p);
    if (refuerzos) {
      p.textoCentro = 'REFUERZOS EN ESQUINAS, SIN MARCAR';
      const { enEsquina, lado, brazo } = medidasRefuerzo(pz);
      if (enEsquina) {
        for (const [cx, cy, sx, sy] of [[pz.eI, pz.eb, -1, -1], [pz.L - pz.eR, pz.eb, 1, -1], [pz.eI, pz.A - pz.eb, -1, 1], [pz.L - pz.eR, pz.A - pz.eb, 1, 1]]) {
          for (const [[a, b], [c, d]] of refuerzoEnEsquina(cx, cy, sx, sy, lado, brazo)) p.lineas.push([a, b, c, d]);
        }
      } else {
        const r = { w: 4 * lado, h: lado, lineas: [], arcos: [], ollaos: [], rot: [], numeros: [] };
        for (let k = 0; k < 4; k++) for (const [[a, b], [c, d]] of refuerzoSuelto(k * lado, 0, lado, brazo, k % 2 === 1)) r.lineas.push([a, b, c, d]);
        piezas.push(r);
      }
    }
  }
  return piezas;
}

// Los baquetones de una misma lona, uno al lado de otro. `letras`: Map elemento → letra de cada unidad.
export function cortarBaquetones(pedido, elementos, params, refuerzos, letras = new Map(), marcar = true) {
  const segs = [], marcas = [], textos = [], avisos = [];
  const giro = (pt, girada, dx) => (girada ? [dx + pt[1], pt[0]] : [dx + pt[0], pt[1]]);
  let x = 0;
  const sueltos = [];
  for (const el of elementos) {
    const pz = piezaBaqueton(el, params);
    const cabe = (v) => v <= ROLLO;
    for (let u = 0; u < (el.input.cantidad || 1); u++) {
      const L = letras.get(el)?.[u] ?? '';
      if (cabe(pz.L) || cabe(pz.A)) {
        const girada = cabe(pz.L) && pz.L > 0;
        const ancho = girada ? pz.A : pz.L;
        for (const [a, b] of cruz(pz.L, pz.A, pz.eI, pz.eR, pz.eb)) segs.push([giro(a, girada, x), giro(b, girada, x)]);
        for (const o of pz.ollaos) marcas.push(giro(o, girada, x));
        if (refuerzos) {
          const { enEsquina, lado, brazo } = medidasRefuerzo(pz);
          if (enEsquina) {
            for (const [cx, cy, sx, sy] of [[pz.eI, pz.eb, -1, -1], [pz.L - pz.eR, pz.eb, 1, -1], [pz.eI, pz.A - pz.eb, -1, 1], [pz.L - pz.eR, pz.A - pz.eb, 1, 1]]) {
              for (const [a, b] of refuerzoEnEsquina(cx, cy, sx, sy, lado, brazo)) segs.push([giro(a, girada, x), giro(b, girada, x)]);
            }
          } else {
            // Sueltos: en fila encima del borde de arriba de la pieza (sin las esquinas), si caben; si no, aparte.
            const [desde, hasta, arriba] = girada ? [x + pz.eb, x + pz.A - pz.eb, pz.L] : [x + pz.eI, x + pz.L - pz.eR, pz.A];
            if (arriba + lado <= ROLLO && 4 * lado <= hasta - desde) {
              for (let k = 0; k < 4; k++) segs.push(...refuerzoSuelto(desde + k * lado, arriba, lado, brazo, k % 2 === 1));
            } else sueltos.push({ lado, brazo });
          }
        }
        const alto = girada ? pz.L : pz.A;
        const centro = [L && `${L}1`, el.of || pedido].filter(Boolean);
        centro.forEach((v, n) => textos.push({ capa: 'texto', x: x + ancho / 2, y: alto / 2 + 90 * (centro.length - 1) - 180 * n, h: 100, valor: v, centrado: true }));
        // Rótulo de esquina: dentro de la solapa de abajo, a 1,5 cm del borde, junto a la esquina de la izquierda.
        if (L && marcar) textos.push({ capa: 'ROTULADOR', ...(girada ? { x: x + pz.eb + 15, y: 15 } : { x: x + pz.eI + 15, y: 15 }), h: 10, valor: `${L}1` });
        if (refuerzos) textos.push({ capa: 'texto', x: x + ancho / 2, y: alto / 2 - 300, h: Math.min(100, (ancho - 200) / 20), valor: 'REFUERZOS EN ESQUINAS, SIN MARCAR', centrado: true });
        x += ancho;
      } else {
        // Empate horizontal: el ancho va a lo largo del rollo y el largo se parte en 250 + resto (+ 2 cm).
        const resto = pz.L - ROLLO + EMPATE;
        avisos.push(`${el.of}: lleva empate horizontal (paño de ${pz.L / 10} cm en 250 + ${resto / 10} cm). Revisarlo con cuidado.`);
        for (const [tramo, alto] of [['delante', ROLLO], ['detrás', resto]]) {
          // y = 0 es la unión (orillo); la punta queda arriba. Detrás: la esquina de detrás arriba.
          const arriba = tramo === 'detrás' ? pz.eR : pz.eI;
          const p = [[0, 0], [pz.A, 0], [pz.A, alto - arriba], [pz.A - pz.eb, alto - arriba], [pz.A - pz.eb, alto], [pz.eb, alto], [pz.eb, alto - arriba], [0, alto - arriba]];
          p.forEach((a, i) => segs.push([[x + a[0], a[1]], [x + p[(i + 1) % p.length][0], p[(i + 1) % p.length][1]]]));
          for (const [ox, oy] of pz.ollaos) {
            // Coordenada a lo largo del paño desde la punta de este tramo.
            const largo = tramo === 'detrás' ? pz.L - ox : ox;
            if (largo >= 0 && largo <= alto) marcas.push([x + oy, alto - largo]);
          }
          const centro = [L && `${L}${tramo === 'delante' ? 1 : 2}`, el.of || pedido, tramo.toUpperCase()].filter(Boolean);
          centro.forEach((v, n) => textos.push({ capa: 'texto', x: x + pz.A / 2, y: alto / 2 + 90 * (centro.length - 1) - 180 * n, h: 100, valor: v, centrado: true }));
          // Número de unión en las dos puntas, de 1 cm, dentro de los 2 cm de empate (se une por y = 0) y a 1 cm de la
          // punta (Iván, 22/10/2026: «no a 4 cm, ponlas a 1 cm»).
          for (const nx of [x + 10, x + pz.A - 10]) textos.push({ capa: 'ROTULADOR', x: nx, y: EMPATE / 2, h: 10, valor: `${L.toLowerCase()}1`, centrado: true, literal: true });
          if (L && marcar) textos.push({ capa: 'ROTULADOR', x: x + pz.eb + 15, y: EMPATE + 15, h: 10, valor: `${L}${tramo === 'delante' ? 1 : 2}` });
          x += pz.A;
        }
      }
    }
  }
  // Los que no caben encima de su pieza, detrás de todo, de cuatro en cuatro desde el orillo.
  for (const { lado, brazo } of sueltos) {
    for (let k = 0; k < 4; k++) segs.push(...refuerzoSuelto(x + k * lado, 0, lado, brazo, k % 2 === 1));
    x += 4 * lado;
  }
  // Sin cortes repetidos ni por el orillo (y = 0 o y = 2500 a lo largo del rollo).
  const vistos = new Set(), lineas = [];
  for (const [[x1, y1], [x2, y2]] of segs) {
    if (Math.abs(x1 - x2) < 0.01 && Math.abs(y1 - y2) < 0.01) continue;
    if (Math.abs(y1 - y2) < 0.01 && (Math.abs(y1) < 0.01 || Math.abs(y1 - ROLLO) < 0.01)) continue;
    const k = [[r1(x1), r1(y1)], [r1(x2), r1(y2)]].sort((a, b) => a[0] - b[0] || a[1] - b[1]).flat().join(',');
    if (vistos.has(k)) continue;
    vistos.add(k);
    lineas.push({ capa: 'DISCO1', x1, y1, x2, y2 });
  }
  return { lineas, marcas, textos, avisos, largo: x };
}
