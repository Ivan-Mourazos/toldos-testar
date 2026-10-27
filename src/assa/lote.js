import catalogo from './validacionCatalogo.json' with { type: 'json' };
import { codigoAssa } from './leerCorte.js';
import { calcularFamilia, fechaLote, generarProgramas, entidadesVacias, desplazarEntidades, unirEntidades } from './faseA.js';
import { buscarColocacion } from '../domain/corteLona/colocacionTetris.ts';

// Pendiente de la respuesta de Tamara: no habilitar el conjunto hasta contrastar su cuenta.
export const CANALONES_PENDIENTES = '420150 a mano: falta confirmar la cantidad de canalones por cubierta o por juego de tres paños.';

/** Los datos enviados por el navegador son solo opciones: las líneas siempre vienen del SELECT. */
export function prepararLote(fecha, lineasRps, sueltas = {}, certificados = catalogo) {
  const nombre = fechaLote(fecha);
  if (new Set(lineasRps.map(l => l.IDOrderLine)).size !== lineasRps.length) throw new Error('Hay líneas duplicadas en el lote.');
  if (lineasRps.some(l => l.entregaSolicitada !== fecha)) throw new Error('Hay líneas de otra fecha de entrega.');
  const lineas = lineasRps.map(l => {
    const ref = certificados.referencias[codigoAssa(l.CodArticle)];
    const prueba = ref?.descripciones.find(p => p.descripcion === String(l.descripcion).trim());
    const g = calcularFamilia(l, { nkValidado: prueba?.nkValidado, terminadoMm: prueba?.terminadoMm });
    const motivos = [...g.motivos];
    if (!prueba || !prueba.cuadran || !prueba.ultimaGeometria || !g.pieza?.medidasMm.every((n, i) => Math.abs(n - prueba.corteMm[i]) < .01)) motivos.push('Referencia y medidas sin validación completa vigente contra los lotes reales.');
    const historico = ref?.fechas?.[fecha];
    if (historico && !historico.coincide) motivos.push(...historico.motivos);
    if (g.familia === '420150') motivos.push(CANALONES_PENDIENTES);
    return { ...l, codigo: g.codigo, familia: g.familia, estado: motivos.length ? 'a-mano' : 'validado', motivos: [...new Set(motivos)],
      avisos: g.avisos, terminadoMm: g.terminadoMm, corteMm: g.pieza?.medidasMm, calculo: g };
  });
  const programas = [], reparto = [];
  for (const [codigo, ls] of Map.groupBy(lineas.filter(l => l.estado === 'validado'), l => l.codigo)) {
    const firmas = new Set(ls.map(l => JSON.stringify(l.corteMm)));
    if (firmas.size !== 1) {
      for (const l of ls) { l.estado = 'a-mano'; l.motivos.push('La referencia tiene medidas distintas en el mismo lote.'); }
      continue;
    }
    const cantidad = ls.reduce((n, l) => n + l.cantidad, 0), g = { ...ls[0].calculo, cantidadPedida: cantidad };
    for (const p of generarProgramas(g, { sueltas: sueltas[codigo] === true })) programas.push({ ...p, codigo, largoMm: g.pieza.medidasMm[0] });
    reparto.push(...ls.map(l => ({ pedido: l.CodOrder, numeroLinea: l.NumLine, linea: l.IDOrderLine, referencia: l.CodArticle, of: l.of_, cantidad: l.cantidad })));
  }
  // Cada programa repetible conserva su orillo. El colocador común recibe una sola orientación
  // y exige y=0: nunca gira ni convierte el borde abierto en un borde interior del rollo.
  let x = 0;
  const inicial = programas.map((p, i) => {
    const r = { id: String(i), x, y: 0, w: p.largoMm + 300, h: p.anchoOcupadoMm, girada: false };
    x += r.w; return r;
  });
  const colocadas = buscarColocacion(inicial.map(r => ({ id: r.id, formas: [{ w: r.w, h: r.h, girada: false }] })), 2040, inicial,
    { restantes: 1000 }, rs => rs.every(r => r.y === 0));
  const entidades = entidadesVacias();
  for (const r of colocadas) {
    const p = programas[Number(r.id)];
    p.x = r.x; p.y = r.y;
    unirEntidades(entidades, desplazarEntidades(p.entidades, p.x, p.y));
  }
  entidades.textos.push({ capa: 'texto', x: 0, y: 2400, h: 100, valor: nombre, literal: true });
  return { nombre, fecha, lineas: lineas.map(({ calculo: _calculo, ...l }) => l), programas, reparto, entidades,
    avisos: lineas.some(l => l.familia === '420150') ? [CANALONES_PENDIENTES] : [],
    totalUnidades: lineas.reduce((n, l) => n + Number(l.cantidad || 0), 0),
    aMano: lineas.filter(l => l.estado === 'a-mano').length };
}
