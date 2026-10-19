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
  for (const p of colocadas) {
    const [x0, y0] = [p.x, p.y];
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
      if (m === 'arriba') marca(ajustes.varillaArribaMm, 15);
      if (m === 'abajo') marca(-ajustes.varillaArribaMm, 15);
      if (m === 'tira') marca(ajustes.varillaTiraMm, 20);
    }
    // Textos centrados en la pieza y en mayúsculas (Iván, 19/10/2026); a lo largo de la pieza,
    // girados 90° si la pieza está girada. Con REVÉS, nombre y REVÉS quedan a los dos lados del centro.
    // Los sacos de stock llevan la OF de stock, SACO, su medida y STOCK (como AR2602119).
    let alto = p.saco ? Math.min(150, Math.min(p.ancho, p.hueco) / 8) : Math.min(300, Math.min(p.ancho, p.hueco) / 4);
    const franja = p.nombre.includes('BAMBA') ? Math.max(1, p.alto - ajustes.varillaTiraMm) : null;
    const [cx, cy] = franja === null ? [x0 + p.ancho / 2, y0 + p.hueco / 2]
      : p.girada ? [x0 + p.alto - franja / 2, y0 + p.largo / 2] : [x0 + p.largo / 2, y0 + franja / 2];
    const lineasTexto = p.saco ? [p.of, 'SACO', p.medida, 'STOCK']
      : [p.nombre, ...(p.of ? [p.of] : []), ...(p.nombre.includes('BAMBA') ? [] : ['REVÉS'])];
    const espacioTexto = p.girada ? p.hueco : p.ancho;
    const altoLibre = franja === null ? Math.min(p.ancho, p.hueco) * 0.9 / ((lineasTexto.length - 1) * 1.6 + 1)
      : franja * 0.8 / ((lineasTexto.length - 1) * 1.6 + 2);
    alto = Math.min(alto, altoLibre,
      ...lineasTexto.map((v) => espacioTexto * 0.9 / anchoArial(v, 1)));
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
