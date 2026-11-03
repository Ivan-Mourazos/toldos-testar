// Contraste independiente de la escritura DXF/DWG: cuenta también las repeticiones de un mismo trazo.
const tipo = p => ['relleno', 'sombreado'].includes(p.tipo) ? 'relleno' : p.tipo;
const coordenadas = p => p.tipo === 'raya' ? [...p.a, ...p.b, p.curva ?? 0] : p.tipo === 'arco' ? [...p.punto, p.r, p.desde, p.hasta]
  : p.tipo === 'texto' ? [...p.punto, p.h, p.giro ?? 0] : p.puntos.flat();

export function contrastarPrimitivas(esperadas, leidas, toleranciaMetros = .0000011) {
  const pendientes = new Set(leidas), faltan = [];
  let maximo = 0;
  for (const p of esperadas) {
    const ns = coordenadas(p);
    let mejor = null, desvio = Infinity;
    for (const q of pendientes) {
      if (tipo(q) !== tipo(p) || q.capa !== p.capa || (p.tipo === 'texto' && q.valor !== p.valor)) continue;
      const ms = coordenadas(q);
      if (ms.length !== ns.length) continue;
      let d = Math.max(...ns.map((n, i) => Math.abs(n - ms[i])));
      if (p.tipo === 'raya') d = Math.min(d, Math.max(...[...p.b, ...p.a, -(p.curva ?? 0)].map((n, i) => Math.abs(n - ms[i]))));
      if (d < desvio) { desvio = d; mejor = q; }
    }
    if (desvio > toleranciaMetros) faltan.push({ tipo: p.tipo, capa: p.capa, desvioMetros: Number.isFinite(desvio) ? desvio : null });
    else { pendientes.delete(mejor); maximo = Math.max(maximo, desvio); }
  }
  return { coincide: !faltan.length && !pendientes.size, esperadas: esperadas.length, leidas: leidas.length,
    faltan, sobran: pendientes.size, maximoDesvioMm: maximo * 1000, toleranciaMm: toleranciaMetros * 1000 };
}
