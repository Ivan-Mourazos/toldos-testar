// De cada forma del catálogo (catalogo.mjs): el borde de abajo como un camino de izquierda a derecha y el paso con
// que se repite (el desplazamiento con el que el borde coincide consigo mismo).
const TOL = 0.1;   // cm

/** El borde de abajo: sin el techo ni los lados rectos de las puntas, encadenado de izquierda a derecha. */
export function bordeDeAbajo(f) {
  const tramos = f.trazos.map((t) => t.p).filter((p) => {
    const techo = p.every(([, y]) => Math.abs(y - f.alto) < TOL);
    // Lados: casi verticales en las puntas (alguno está torcido unas décimas).
    const lado = p.every(([x]) => Math.abs(x) < 0.4) || p.every(([x]) => Math.abs(x - f.ancho) < 0.4);
    return !techo && !lado;
  });
  const libres = [...tramos];
  const empieza = libres.reduce((a, b) => (Math.min(b[0][0], b.at(-1)[0]) < Math.min(a[0][0], a.at(-1)[0]) ? b : a));
  libres.splice(libres.indexOf(empieza), 1);
  let camino = empieza[0][0] <= empieza.at(-1)[0] ? [...empieza] : [...empieza].reverse();
  while (libres.length) {
    const fin = camino.at(-1);
    let mejor = null;
    for (const t of libres) for (const [p, inv] of [[t[0], false], [t.at(-1), true]]) {
      const d = Math.hypot(p[0] - fin[0], p[1] - fin[1]);
      if (!mejor || d < mejor.d) mejor = { t, inv, d };
    }
    if (mejor.d > 0.5) break;
    libres.splice(libres.indexOf(mejor.t), 1);
    camino = camino.concat((mejor.inv ? [...mejor.t].reverse() : mejor.t).slice(1));
  }
  return { camino, sueltos: libres.length };
}

/** Lo más bajo del borde en cada x (cada 0,05 cm). */
function perfil(camino, ancho) {
  const paso = 0.05, n = Math.round(ancho / paso) + 1, f = new Array(n).fill(Infinity);
  for (let k = 0; k < camino.length - 1; k++) {
    const [[x1, y1], [x2, y2]] = [camino[k], camino[k + 1]];
    const [a, b] = [Math.ceil(Math.min(x1, x2) / paso), Math.floor(Math.max(x1, x2) / paso)];
    for (let i = Math.max(0, a); i <= Math.min(n - 1, b); i++) {
      const x = i * paso, y = Math.abs(x2 - x1) < 1e-9 ? Math.min(y1, y2) : y1 + ((y2 - y1) * (x - x1)) / (x2 - x1);
      f[i] = Math.min(f[i], y);
    }
  }
  return { f, paso };
}

export function pasoDe(camino, ancho) {
  const { f, paso } = perfil(camino, ancho);
  const resultados = [];
  for (let p = 6; p <= Math.min(90, ancho / 2); p += 0.01) {
    const d = Math.round(p / paso);
    let s = 0, m = 0;
    for (let i = Math.round(3 / paso); i + d < f.length - Math.round(3 / paso); i++) {
      if (Number.isFinite(f[i]) && Number.isFinite(f[i + d])) { s += Math.abs(f[i] - f[i + d]); m++; }
    }
    resultados.push([p, m ? s / m : Infinity]);
  }
  // El primer mínimo que casi coincide; si no hay, el mejor.
  const bueno = resultados.find(([, e], k) => e < 0.08 && (resultados[k + 1]?.[1] ?? Infinity) >= e && (resultados[k - 1]?.[1] ?? Infinity) >= e);
  return bueno ?? resultados.reduce((a, b) => (b[1] < a[1] ? b : a));
}

/** El paso afinado: el de menos error cerca del primero que coincide. */
export function pasoFino(camino, ancho, p0) {
  const { f, paso } = perfil(camino, ancho);
  let mejor = [p0, Infinity];
  for (let p = p0 - 0.6; p <= p0 + 0.6; p += 0.005) {
    const d = Math.round(p / paso);
    let s = 0, m = 0;
    for (let i = Math.round(3 / paso); i + d < f.length - Math.round(3 / paso); i++) {
      if (Number.isFinite(f[i]) && Number.isFinite(f[i + d])) { s += Math.abs(f[i] - f[i + d]); m++; }
    }
    if (m && s / m < mejor[1]) mejor = [p, s / m];
  }
  return mejor;
}

/** Una onda: el camino desde su arranque hasta el mismo punto un paso más allá. */
export function onda(camino, p) {
  const [x0, y0] = camino[0], xc = x0 + p;
  // El primer tramo que cruza la vertical de un paso más allá a la altura del arranque: ahí se corta.
  let mejor = null;
  for (let k = 0; k < camino.length - 1; k++) {
    const [[a, b], [c, d]] = [camino[k], camino[k + 1]];
    if ((a - xc) * (c - xc) > 0 || Math.abs(c - a) < 1e-9) continue;
    const y = b + ((d - b) * (xc - a)) / (c - a), error = Math.abs(y - y0);
    if (!mejor || error < mejor.error - 1e-6) mejor = { k, error };
  }
  if (!mejor) return { puntos: [], cierre: Infinity };
  const puntos = camino.slice(0, mejor.k + 1).map(([x, y]) => [x - x0, y - y0]);
  puntos.push([p, 0]);
  return { puntos, cierre: mejor.error };
}
