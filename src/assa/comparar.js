const rad = a => a * Math.PI / 180;
const mod = n => (n % 360 + 360) % 360;
const anguloArco = p => mod(p.hasta - p.desde) || 360;
const puntoArco = (p, a) => [p.punto[0] + p.r * Math.cos(rad(a)), p.punto[1] + p.r * Math.sin(rad(a))];

function sinBulge(p) {
  if (p.tipo !== 'raya' || !p.curva) return p;
  const [a, b] = [p.a, p.b], dx = b[0] - a[0], dy = b[1] - a[1], bulge = p.curva;
  const punto = [(a[0] + b[0]) / 2 - dy * (1 - bulge ** 2) / (4 * bulge), (a[1] + b[1]) / 2 + dx * (1 - bulge ** 2) / (4 * bulge)];
  const ang = q => mod(Math.atan2(q[1] - punto[1], q[0] - punto[0]) * 180 / Math.PI);
  return { tipo: 'arco', capa: p.capa, punto, r: Math.hypot(a[0] - punto[0], a[1] - punto[1]), desde: ang(bulge > 0 ? a : b), hasta: ang(bulge > 0 ? b : a) };
}

function distancia(q, p) {
  if (p.tipo === 'raya') {
    const dx = p.b[0] - p.a[0], dy = p.b[1] - p.a[1], l2 = dx ** 2 + dy ** 2;
    const t = l2 ? Math.max(0, Math.min(1, ((q[0] - p.a[0]) * dx + (q[1] - p.a[1]) * dy) / l2)) : 0;
    return Math.hypot(q[0] - p.a[0] - t * dx, q[1] - p.a[1] - t * dy);
  }
  const a = mod(Math.atan2(q[1] - p.punto[1], q[0] - p.punto[0]) * 180 / Math.PI);
  if (mod(a - p.desde) <= anguloArco(p) + 1e-8) return Math.abs(Math.hypot(q[0] - p.punto[0], q[1] - p.punto[1]) - p.r);
  return Math.min(...[p.desde, p.hasta].map(a => { const t = puntoArco(p, a); return Math.hypot(q[0] - t[0], q[1] - t[1]); }));
}

function muestras(p, otras = []) {
  if (p.tipo === 'raya') {
    const dx = p.b[0] - p.a[0], dy = p.b[1] - p.a[1], l2 = dx ** 2 + dy ** 2;
    const n = Math.max(1, Math.ceil(Math.sqrt(l2) / 10));
    // También comprueba las uniones y sus puntos medios: una marca partida no
    // puede ocultar un hueco entre las muestras de paso regular.
    const ts = [...new Set([0, 1, ...otras.flatMap(q => [q.a, q.b].filter(Boolean)).map(q => Math.max(0, Math.min(1, ((q[0] - p.a[0]) * dx + (q[1] - p.a[1]) * dy) / l2)))])].sort((a, b) => a - b);
    const puntos = [...Array.from({ length: n + 1 }, (_, i) => i / n), ...ts, ...ts.slice(1).map((t, i) => (t + ts[i]) / 2)];
    return puntos.map(t => [p.a[0] + dx * t, p.a[1] + dy * t]);
  }
  // Cinco grados: error de muestreo menor de 0,01 mm en los radios de 3 y 7 mm.
  const n = Math.ceil(anguloArco(p) / 5);
  return Array.from({ length: n + 1 }, (_, i) => puntoArco(p, p.desde + anguloArco(p) * i / n));
}

/** Compara cada herramienta en ambos sentidos; acepta entidades partidas, detecta trazos duplicados. */
export function compararOperaciones(esperadas, reales, toleranciaMm = 1) {
  const a = esperadas.map(sinBulge), b = reales.map(sinBulge), diferencias = [];
  const dirigida = (origen, destino) => origen.reduce((max, p) => {
    const candidatos = destino.filter(q => q.capa === p.capa);
    if (!candidatos.length) return Infinity;
    return Math.max(max, ...muestras(p, candidatos).map(q => Math.min(...candidatos.map(s => distancia(q, s)))));
  }, 0);
  const desviacionMm = Math.max(dirigida(a, b), dirigida(b, a));
  if (desviacionMm > toleranciaMm + 1e-7) diferencias.push('Forma, posición o herramienta de cortes y marcas distinta.');
  if (b.some((p, i) => dirigida([p], b.filter((_, j) => i !== j)) < .01)) diferencias.push('El corte real contiene recorridos duplicados en una misma herramienta.');
  return { coincide: !diferencias.length, desviacionMm: Number.isFinite(desviacionMm) ? desviacionMm : null, diferencias };
}

/** Lo que hay dentro del paño; `uniones`: las x de sus bordes de rotulador con el paño unido (no son una marca suya). */
export function operacionesEnPano(modelo, b, uniones = []) {
  const limitar = original => {
    const p = sinBulge(original);
    if (p.tipo === 'arco') {
      return p.punto[0] + p.r >= b.x0 && p.punto[0] - p.r <= b.x1 && p.punto[1] + p.r >= b.y0 && p.punto[1] - p.r <= b.y1 ? p : null;
    }
    let t0 = 0, t1 = 1;
    for (const [i, min, max] of [[0, b.x0, b.x1], [1, b.y0, b.y1]]) {
      const d = p.b[i] - p.a[i];
      if (Math.abs(d) < 1e-9) { if (p.a[i] < min - .01 || p.a[i] > max + .01) return null; }
      else {
        const a = (min - p.a[i]) / d, z = (max - p.a[i]) / d;
        t0 = Math.max(t0, Math.min(a, z)); t1 = Math.min(t1, Math.max(a, z));
      }
    }
    if (t1 - t0 < 1e-8) return null;
    const punto = t => p.a.map((n, i) => n + (p.b[i] - n) * t);
    return { ...p, a: punto(t0), b: punto(t1) };
  };
  const deUnion = p => p.capa === 'ROTULADOR' && p.tipo === 'raya' && Math.abs(p.a[0] - p.b[0]) < .01 && uniones.some(x => Math.abs(p.a[0] - x) < .5);
  return modelo.filter(p => !p.deCota && ['raya', 'arco'].includes(p.tipo) && ['CUTTER', 'ROTULADOR', 'DISCO1', 'DISCO2'].includes(p.capa) && !deUnion(p))
    .map(limitar).filter(Boolean)
    .filter(p => !(p.capa === 'DISCO1' && p.tipo === 'raya' && !p.curva &&
      ((Math.abs(p.a[0] - p.b[0]) < .01 && [b.x0, b.x1].some(x => Math.abs(p.a[0] - x) < .01)) ||
       (Math.abs(p.a[1] - p.b[1]) < .01 && [b.y0, b.y1].some(y => Math.abs(p.a[1] - y) < .01)))))
    .map(p => ({ ...p, a: p.a?.map((n, i) => n - [b.x0, b.y0][i]), b: p.b?.map((n, i) => n - [b.x0, b.y0][i]), punto: p.punto?.map((n, i) => n - [b.x0, b.y0][i]) }));
}

export function operacionesGeneradas(entidades) {
  return [
    ...entidades.lineas.filter(l => l.capa !== 'DISCO1').map(l => ({ tipo: 'raya', capa: l.capa, a: [l.x1, l.y1], b: [l.x2, l.y2] })),
    ...entidades.arcos.map(a => ({ ...a, tipo: 'arco', punto: [a.x, a.y] })),
    ...entidades.circulos.map(c => ({ ...c, tipo: 'arco', punto: [c.x, c.y], desde: 0, hasta: 360 })),
  ];
}
