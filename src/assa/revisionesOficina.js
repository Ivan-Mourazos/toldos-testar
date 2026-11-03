import oficina0711 from './revisiones/lote-0711.json' with { type: 'json' };

// Una revisión reproduce un lote concreto. No certifica referencias nuevas ni cambia las reglas de fabricación.
const campos = ['CodOrder', 'NumLine', 'CodArticle', 'descripcion', 'cantidad', 'of_', 'entregaSolicitada'];
const firma = lineas => JSON.stringify(lineas.map(l => campos.map(k => l[k])).sort((a, b) => String(a).localeCompare(String(b))));

export function revisionOficinaDelLote(lote) {
  if (Object.values(lote.sueltas ?? {}).some(Boolean)) return null;
  if (lote.fecha !== oficina0711.fecha || firma(lote.lineas) !== firma(oficina0711.lineas)) return null;
  if (lote.lineas.some(l => l.palet != null && !oficina0711.lineas.find(r => r.CodOrder === l.CodOrder && r.NumLine === l.NumLine).palets.includes(l.palet))) return null;
  const decodificar = ps => ps.map(p => {
    const [tipo, capa] = p;
    if (tipo === 0) return { tipo: 'raya', capa, a: p.slice(2, 4), b: p.slice(4, 6), curva: p[6], color: p[7] };
    if (tipo === 1) return { tipo: 'arco', capa, punto: p.slice(2, 4), r: p[4], desde: p[5], hasta: p[6], color: p[7] };
    if (tipo === 3) return { tipo: 'relleno', capa, puntos: p[2], color: p[3] };
    return { tipo: 'texto', capa, punto: p.slice(2, 4), h: p[4], valor: p[5], giro: p[6], ancla: p[7], color: p[8] };
  });
  return { ...oficina0711, corte: decodificar(oficina0711.corte), hojas: oficina0711.hojas.map(h => ({ ...h, primitivas: decodificar(h.primitivas) })) };
}
