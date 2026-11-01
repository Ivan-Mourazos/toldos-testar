// Operaciones del estudio: las distancias son cm sobre la lona hecha.
const r = v => Math.round(v * 1e6) / 1e6;

export function centrarPosiciones(posiciones, longitudHecha, deliberado = false) {
  if (deliberado || !posiciones.length) return [...posiciones];
  const traslado = (longitudHecha - posiciones.at(-1) - posiciones[0]) / 2;
  return posiciones.map(p => r(p + traslado));
}

export function invertirPosiciones(posiciones, longitudHecha) {
  return posiciones.map(p => r(longitudHecha - p)).reverse();
}

/** Centra solo la asimetría de márgenes; una coordenada exterior no se corrige por conjetura. */
export function normalizarPosiciones(posiciones, longitudHecha, deliberado = false) {
  if (!(longitudHecha > 0) || !Number.isFinite(longitudHecha) || !posiciones.length
      || posiciones.some((p, i) => !Number.isFinite(p) || p <= 0 || p > longitudHecha || i > 0 && p <= posiciones[i - 1])) return null;
  const huecos = posiciones.slice(1).map((p, i) => p - posiciones[i]);
  const simetricos = huecos.every((h, i) => Math.abs(h - huecos[huecos.length - 1 - i]) <= 0.21);
  const resultado = centrarPosiciones(posiciones, longitudHecha, deliberado || !simetricos);
  return resultado.every(p => p > 0 && p < longitudHecha) ? resultado : null;
}

/** Un pedido cuenta una sola vez por variante, aunque tenga varias copias o fuentes. */
export function elegirVariante(casos) {
  const variantes = new Map();
  for (const c of casos) {
    const clave = JSON.stringify(['delante', 'atras', 'laterales'].map(l => c.ollaos[l].map(v => Math.round(v * 10) / 10)));
    const g = variantes.get(clave) ?? { casos: [], pedidos: new Set() };
    g.casos.push(c); g.pedidos.add(c.pedido); variantes.set(clave, g);
  }
  const reciente = g => [...g.casos].sort((a,b) => String(b.fecha).localeCompare(String(a.fecha)) || b.pedido.localeCompare(a.pedido) || (b.prioridad ?? 0)-(a.prioridad ?? 0))[0];
  const orden = [...variantes.values()].sort((a,b) => b.pedidos.size - a.pedidos.size || String(reciente(b).fecha).localeCompare(String(reciente(a).fecha)) || reciente(b).pedido.localeCompare(reciente(a).pedido) || (reciente(b).prioridad??0)-(reciente(a).prioridad??0));
  const totalPedidos = new Set(casos.map(c=>c.pedido)).size;
  const hayMayoria = orden.length > 0 && orden[0].pedidos.size > totalPedidos / 2;
  return {
    elegida: orden.length ? (hayMayoria ? reciente(orden[0]) : reciente({casos})) : null,
    criterio: hayMayoria ? 'mayoría de pedidos' : 'más reciente sin mayoría clara',
    variantes: orden.map(g => ({ n: g.pedidos.size, pedidos: [...g.pedidos].sort(), caso: reciente(g) })),
  };
}
