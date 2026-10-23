import { AJUSTES_POR_DEFECTO } from './despiece.js';
import { anchoArial } from './texto.js';

/** Líneas de corte (DISCO1), del rotulador y textos de las piezas ya colocadas. */
export function dibujo(colocadas, anchoRolloMm, { of, tela }) {
  const horizontales = []; const verticales = [];
  for (const p of colocadas) {
    const [x0, y0, x1, y1] = [p.x, p.y, p.x + p.ancho, p.y + p.hueco];
    // Los orillos del rollo no se cortan; las piezas «aparte» (para cortar de un resto) sí, por los
    // cuatro lados, porque no se apoyan en el orillo.
    if (y0 > 0 || p.aparte) horizontales.push([y0, x0, x1]);
    if (y1 < anchoRolloMm || p.aparte) horizontales.push([y1, x0, x1]);
    verticales.push([x0, y0, y1], [x1, y0, y1]);
  }
  const lineas = [
    ...unir(horizontales).map(([y, a, b]) => ({ capa: 'DISCO1', x1: a, y1: y, x2: b, y2: y })),
    ...unir(verticales).map(([x, a, b]) => ({ capa: 'DISCO1', x1: x, y1: a, x2: x, y2: b }))
  ];
  const textos = [];
  // Cuántos paños con empate tiene cada toldo (A1, A2…), para saber con quién se une cada uno.
  const panos = new Map();
  for (const p of colocadas) {
    const m = /^([A-Z]+)(\d+)$/.exec(p.nombre);
    if (m) panos.set(m[1], Math.max(panos.get(m[1]) ?? 0, Number(m[2])));
  }
  // Cortina (Iván, 23/10/2026, AR2605193 a mano): cada pieza solo con su nombre; REVÉS una vez, en la primera del
  // material, y la OF en la primera de cada cortina, como en las puertas. Primera: al principio del rollo, arriba,
  // y antes un paño que la bamba, que es estrecha (en el corte a mano van en el A1).
  const esBamba = (p) => p.nombre.includes('BAMBA');
  const deCortina = colocadas.filter((p) => p.rotuloCortina)
    .sort((a, b) => esBamba(a) - esBamba(b) || a.x - b.x || (b.y + b.hueco) - (a.y + a.hueco));
  const primeraDe = new Map();
  for (const p of deCortina) if (!primeraDe.has(p.letra)) primeraDe.set(p.letra, p);
  const conOf = new Set(primeraDe.values());
  for (const p of colocadas) {
    const [x0, y0] = [p.x, p.y];
    // Las piezas con sus uniones ya puestas (las de la cortina) no siguen la cadena de paños de fachada.
    textos.push(...(p.uniones ? unionesPropias(p) : numerosDeUnion(p, panos)));
    // Marca a `d` del borde de arriba (d > 0) o de abajo (d < 0) de la pieza, metida `m` en los
    // laterales. Girada, el borde de arriba de la pieza queda a la izquierda (como AR2405992).
    const marca = (d, m) => {
      const v = d > 0 ? p.alto - d : -d;
      lineas.push(p.girada
        ? { capa: 'ROTULADOR', x1: x0 + p.alto - v, y1: y0 + m, x2: x0 + p.alto - v, y2: y0 + p.largo - m }
        : { capa: 'ROTULADOR', x1: x0 + m, y1: y0 + v, x2: x0 + p.largo - m, y2: y0 + v });
    };
    const ajustes = { ...AJUSTES_POR_DEFECTO, ...p.ajustes };
    for (const m of p.marcas) {
      // Cortina: cada raya dice su borde, su distancia al corte y lo que entra desde los laterales.
      if (typeof m === 'object') marca(m.lado === 'arriba' ? m.mm : -m.mm, m.retiroMm);
      if (m === 'arriba') marca(ajustes.varillaArribaMm, 15);
      if (m === 'abajo') marca(-ajustes.varillaArribaMm, 15);
      if (m === 'tira') marca(ajustes.varillaTiraMm, 20);
    }
    if (p.sinRotulo) continue;
    // Textos centrados en la pieza y en mayúsculas (Iván, 19/10/2026); a lo largo de la pieza,
    // girados 90° si la pieza está girada. Con REVÉS, nombre y REVÉS quedan a los dos lados del centro.
    // Los sacos de stock llevan la OF de stock, SACO, su medida y STOCK (como AR2602119).
    // Cortina: todos los rótulos de 15 cm, también en la bamba, como el corte a mano de AR2605193 (Iván, 23/10/2026).
    let alto = p.saco ? Math.min(150, Math.min(p.ancho, p.hueco) / 8) : p.rotuloCortina ? Math.min(150, Math.min(p.ancho, p.hueco) * 0.7)
      : Math.min(300, Math.min(p.ancho, p.hueco) / 4);
    // La bamba de cortina rotula por debajo de la raya de la varilla. La de toldo, como el resto: en toda la pieza,
    // aunque pise el rotulador, sin llegar a las líneas de corte (Iván, 23/10/2026: «pueden ir más grandes»).
    const franja = !p.nombre.includes('BAMBA') || !p.rotuloCortina ? null : Math.max(1, p.alto - p.marcas[0].mm);
    const [cx, cy] = franja === null ? [x0 + p.ancho / 2, y0 + p.hueco / 2]
      : p.girada ? [x0 + p.alto - franja / 2, y0 + p.largo / 2] : [x0 + p.largo / 2, y0 + franja / 2];
    const lineasTexto = p.saco ? [p.of, 'SACO', p.medida, 'STOCK']
      : p.rotuloCortina ? [p.rotulo ?? p.nombre, ...(conOf.has(p) && p.of ? [p.of] : []), ...(p === deCortina[0] ? ['REVÉS'] : [])]
      : [p.nombre, ...(p.of ? [p.of] : []), ...(p.nombre.includes('BAMBA') || p.sinReves ? [] : ['REVÉS'])];
    const espacioTexto = p.girada ? p.hueco : p.ancho;
    const altoLibre = franja === null ? Math.min(p.ancho, p.hueco) * 0.9 / ((lineasTexto.length - 1) * 1.6 + 1)
      : franja * 0.8 / ((lineasTexto.length - 1) * 1.6 + (p.rotuloCortina ? 1 : 2));
    alto = Math.min(alto, altoLibre,
      ...lineasTexto.map((v) => espacioTexto * 0.9 / anchoArial(v, 1)));
    // Piezas largas y bajas (las bandas de la cortina, las bambas): nombre, OF y REVÉS en fila, repartidos a lo largo,
    // para que vayan más grandes (Iván, 22/10/2026, como en las puertas apilables). En las de toldo, en fila siempre
    // que así salgan más grandes que uno encima de otro (Iván, 23/10/2026: «la OF la pones de lado si ves que tal»).
    const n = lineasTexto.length, largo = p.girada ? p.hueco : p.ancho, corto = p.girada ? p.ancho : p.hueco;
    const enFila = Math.min(p.rotuloCortina ? 150 : 300, corto * (p.rotuloCortina ? 0.7 : 0.6), ...lineasTexto.map((v) => (largo / n) * 0.8 / anchoArial(v, 1)));
    if (n > 1 && (p.enFila || (!p.saco && !p.rotuloCortina && enFila > alto * 1.05))) {
      const h = p.enFila && !p.rotuloCortina ? Math.min(enFila, corto * 0.4) : enFila;
      lineasTexto.forEach((valor, i) => {
        const u = (largo * (i + 0.5)) / n;
        textos.push(p.girada
          ? { capa: 'texto', x: x0 + p.ancho / 2, y: y0 + u, h, valor: valor.toUpperCase(), giro: 90, centrado: true }
          : { capa: 'texto', x: x0 + u, y: y0 + p.hueco / 2, h, valor: valor.toUpperCase(), centrado: true });
      });
      continue;
    }
    lineasTexto.forEach((valor, i) => {
      const d = (i - (lineasTexto.length - 1) / 2) * alto * 1.6;   // separación desde el centro
      textos.push(p.girada
        ? { capa: 'texto', x: cx + d, y: cy, h: alto, valor: valor.toUpperCase(), giro: 90, centrado: true }
        : { capa: 'texto', x: cx, y: cy - d, h: alto, valor: valor.toUpperCase(), centrado: true });
    });
  }
  textos.push({ capa: 'texto', x: 0, y: anchoRolloMm + 140, h: 100, valor: `${tela} · OF ${of}` });
  return { lineas, textos };
}

// Números de unión de los empates, como en remolques (Iván, 20/10/2026): el mismo en los dos paños que se
// sueldan (a1 entre A1 y A2, a2 entre A2 y A3…), en ROTULADOR de 1 cm, a 1 cm del borde (dentro de los 2 cm
// de empate, para que quede tapado al soldar) y a 1 cm de cada punta (Iván, 22/10/2026: «no a 4 cm, ponlas a 1 cm»). Con empate horizontal los paños se
// unen por arriba y por abajo (A1 abajo, en la bamba); con empate vertical, por los lados.
const MEDIO_EMPATE = 10, PUNTA = 10;
function numerosDeUnion(p, panos) {
  const m = /^([A-Z]+)(\d+)$/.exec(p.nombre);
  if (!m || (panos.get(m[1]) ?? 0) < 2) return [];
  const [letra, i, total] = [m[1], Number(m[2]), panos.get(m[1])];
  const vertical = p.marcas.includes('arriba') && p.marcas.includes('abajo');
  // Del sistema de la pieza (u a lo largo, v a lo alto) al rollo; girada, lo de arriba queda a la izquierda.
  const sitio = (u, v) => (p.girada ? [p.x + p.alto - v, p.y + u] : [p.x + u, p.y + v]);
  const numero = (u, v, k, aLoLargo) => {
    const [x, y] = sitio(u, v);
    return { capa: 'ROTULADOR', x, y, h: 10, valor: `${letra.toLowerCase()}${k}`, giro: aLoLargo === !p.girada ? 0 : 90, centrado: true, literal: true };
  };
  const out = [];
  // Unión con el paño anterior (k = i - 1) y con el siguiente (k = i).
  for (const [k, conAnterior] of [[i - 1, true], [i, false]]) {
    if (k < 1 || k >= total) continue;
    if (vertical) {
      const u = conAnterior ? MEDIO_EMPATE : p.largo - MEDIO_EMPATE;
      out.push(numero(u, PUNTA, k, false), numero(u, p.alto - PUNTA, k, false));
    } else {
      const v = conAnterior ? MEDIO_EMPATE : p.alto - MEDIO_EMPATE;
      out.push(numero(PUNTA, v, k, true), numero(p.largo - PUNTA, v, k, true));
    }
  }
  return out;
}

/** Uniones dadas por la pieza: `u` a lo largo y `v` a lo alto desde abajo, en mm, como el resto de marcas. */
function unionesPropias(p) {
  return p.uniones.map(({ valor, u, v }) => {
    const [x, y] = p.girada ? [p.x + p.alto - v, p.y + u] : [p.x + u, p.y + v];
    return { capa: 'ROTULADOR', x, y, h: 10, valor, giro: p.girada ? 90 : 0, centrado: true, literal: true };
  });
}

function unir(segs) {
  const porLinea = new Map();
  for (const [k, a, b] of segs) porLinea.set(k, [...(porLinea.get(k) || []), [Math.min(a, b), Math.max(a, b)]]);
  const out = [];
  for (const [k, list] of porLinea) {
    list.sort((p, q) => p[0] - q[0]);
    let [a, b] = list[0];
    for (const [c, d] of list.slice(1)) { if (c <= b) b = Math.max(b, d); else { out.push([k, a, b]); [a, b] = [c, d]; } }
    out.push([k, a, b]);
  }
  return out;
}
