// Lectura del corte real, sin consultar medidas esperadas ni el generador.
const EPS = 0.01;
const cerca = (a, b) => Math.abs(a - b) < EPS;
const red = n => Math.round(n * 1000) / 1000;
export const codigoAssa = texto => String(texto ?? '').toUpperCase()
  .match(/\b(?:H?[0O]K)\s*(4\d{5})\s*-\s*(\d{4})(?!\d)/)?.slice(1).join('-') ?? null;

export function extraerPanos(modelo) {
  const discos = modelo.filter(p => !p.deCota && p.tipo === 'raya' && p.capa === 'DISCO1' && !p.curva);
  const hs = discos.filter(p => cerca(p.a[1], p.b[1]) && Math.abs(p.a[0] - p.b[0]) > 2000)
    .map(p => ({ x0: Math.min(p.a[0], p.b[0]), x1: Math.max(p.a[0], p.b[0]), y: p.a[1] }));
  const vs = discos.filter(p => cerca(p.a[0], p.b[0]) && Math.abs(p.a[1] - p.b[1]) >= 100)
    .map(p => ({ x: p.a[0], y0: Math.min(p.a[1], p.b[1]), y1: Math.max(p.a[1], p.b[1]) }));
  const titulos = modelo.filter(p => p.tipo === 'texto' && !p.deCota && codigoAssa(p.valor));
  const cubre = (h, x0, x1) => h.x0 <= x0 + EPS && h.x1 >= x1 - EPS;
  // El extremo superior de dos costados también puede terminar en el orillo.
  // No se presupone que el borde sin cortar sea siempre el de abajo.
  const techos = [...hs];
  for (const v of vs) {
    const finales = vs.filter(q => cerca(q.y1, v.y1)).sort((a, b) => a.x - b.x);
    const i = finales.indexOf(v), siguiente = finales[i + 1];
    if (siguiente && siguiente.x - v.x > 2000 && !hs.some(h => cerca(h.y, v.y1) && cubre(h, v.x, siguiente.x))) {
      techos.push({ x0: v.x, x1: siguiente.x, y: v.y1, orillo: true });
    }
  }
  const panos = [], vistos = new Set();
  for (const h of techos) {
    // Los costados fijan la longitud del paño. La horizontal puede prolongarse
    // para cortar también una suelta más larga que comparte este borde.
    const lados = vs.filter(v => v.x >= h.x0 - EPS && v.x <= h.x1 + EPS && h.y - v.y0 >= 100 - EPS && v.y1 >= h.y - EPS)
      .sort((a, b) => a.x - b.x);
    const columnas = lados.filter((v, i) => !i || !cerca(v.x, lados[i - 1].x));
    for (let i = 1; i < columnas.length; i++) {
      const a = columnas[i - 1], b = columnas[i], x0 = a.x, x1 = b.x, y1 = h.y;
      if (x1 - x0 <= 2000) continue;
      const limites = [a.y0, b.y0, ...hs.filter(q => q.y < y1 - EPS && cubre(q, x0, x1)).map(q => q.y)];
      const y0 = Math.max(...limites);
      if (y1 - y0 < 100 || y1 - y0 > 1100) continue;
      if (h.orillo && !hs.some(q => cerca(q.y, y0) && cubre(q, x0, x1))) continue;
      const clave = [x0, x1, y0, y1].map(red).join('|');
      if (vistos.has(clave)) continue;
      vistos.add(clave);
      panos.push({ caja: { x0, x1, y0, y1 }, medidasMm: [red(x1 - x0), red(y1 - y0)],
        orilloSuperior: !!h.orillo, orilloInferior: !hs.some(q => cerca(q.y, y0) && cubre(q, x0, x1)) });
    }
  }
  const vecinos = p => panos.filter(q => q !== p && cerca(q.caja.x0, p.caja.x0) && (cerca(q.caja.y1, p.caja.y0) || cerca(q.caja.y0, p.caja.y1)));
  const llegaAlOrillo = (p, vistos = new Set()) => {
    if (p.orilloInferior || p.orilloSuperior) return true;
    if (vistos.has(p)) return false;
    vistos.add(p);
    return vecinos(p).some(q => llegaAlOrillo(q, vistos));
  };
  for (const p of panos) p.orilloDelConjunto = llegaAlOrillo(p);
  const grupos = new Map();
  for (const p of panos) {
    const { x0, x1, y0, y1 } = p.caja;
    const interiores = titulos.filter(t => t.punto[0] >= x0 && t.punto[0] <= x1 && t.punto[1] > y0 && t.punto[1] < y1);
    // Un único código interior sirve de rótulo común de las sueltas contiguas.
    // Si hay códigos distintos, cada paño necesita su título propio.
    const pila = new Set([p]), pendientes = [p];
    while (pendientes.length) for (const q of vecinos(pendientes.pop()).filter(q => cerca(q.caja.x1, x1))) {
      if (!pila.has(q)) { pila.add(q); pendientes.push(q); }
    }
    const techo = Math.max(...[...pila].map(q => q.caja.y1));
    const interioresPila = titulos.filter(t => [...pila].some(q => t.punto[0] >= x0 && t.punto[0] <= x1 && t.punto[1] > q.caja.y0 && t.punto[1] < q.caja.y1));
    const comun = new Set(interioresPila.map(t => codigoAssa(t.valor))).size === 1 ? interioresPila[0] : null;
    const superiores = titulos.filter(t => t.punto[0] >= x0 && t.punto[0] <= x1 && t.punto[1] >= techo && t.punto[1] - techo < 500)
      .sort((a, b) => a.punto[1] - b.punto[1]);
    const titulo = interiores.length === 1 ? interiores[0] : interiores.length ? null : comun ?? superiores[0];
    if (!titulo) continue;
    const clave = [titulo.handle ?? modelo.indexOf(titulo), red(x0), red(x1)].join('|');
    if (!grupos.has(clave)) grupos.set(clave, { codigo: codigoAssa(titulo.valor), titulo, x0, x1, panos: [], repeticiones: 1, multiplicador: null });
    grupos.get(clave).panos.push(p);
  }
  for (const g of grupos.values()) {
    g.panos.sort((a, b) => a.caja.y0 - b.caja.y0);
    const y1 = Math.max(...g.panos.map(p => p.caja.y1));
    // Las sueltas con rótulo interior no heredan multiplicadores de otro dibujo.
    const interior = g.panos.some(p => g.titulo.punto[1] < p.caja.y1 && g.titulo.punto[1] > p.caja.y0);
    const multiplicadores = interior ? [] : modelo.filter(p => p.tipo === 'texto' && /^x\s*\d+$/i.test(p.valor.trim()) && p.punto[0] >= g.x0 && p.punto[0] <= g.x1 && p.punto[1] > y1 && p.punto[1] - y1 < 2000)
      .sort((a, b) => a.punto[1] - b.punto[1]);
    if (multiplicadores.length) {
      g.multiplicador = multiplicadores[0];
      g.repeticiones = Number(g.multiplicador.valor.replace(/\D/g, ''));
    }
  }
  return [...grupos.values()];
}
