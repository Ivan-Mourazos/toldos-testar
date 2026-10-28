import catalogo from './validacionCatalogo.json' with { type: 'json' };
import { codigoAssa } from './leerCorte.js';
import { calcularFamilia, fechaLote, generarProgramas, entidadesVacias, desplazarEntidades, unirEntidades } from './faseA.js';
import { buscarColocacion } from '../domain/corteLona/colocacionTetris.ts';
import { ALTO_BLOQUE_MM, CANALONES_POR_BLOQUE, bloqueCanalon, canalonDe, juegosCanalon } from './canalon.js';

export const CANALON_SIN_PLANTILLA = '420150 a mano: la plantilla COMBURSA no tiene un juego de canalones para esta referencia y su NB.';

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
    // Habilita la forma igual a la de los lotes reales: en alguno y en el último. La cantidad la manda RPS; la del lote
    // real puede ser menor porque el stock se pone en corte (Q-AS03, Iván 26/10/2026).
    if (!prueba || !prueba.geometria || !prueba.ultimaGeometria || !g.pieza?.medidasMm.every((n, i) => Math.abs(n - prueba.corteMm[i]) < .01)) motivos.push('Referencia y medidas sin validación completa vigente contra los lotes reales.');
    const historico = ref?.fechas?.[fecha];
    if (historico && !(historico.forma ?? historico.coincide)) motivos.push(...historico.motivos.filter(m => !m.startsWith('Cantidad agrupada:')));
    const canalon = g.familia === '420150' ? canalonDe(g.codigo, g.medidas?.NB) : null;
    if (g.familia === '420150' && !canalon) motivos.push(CANALON_SIN_PLANTILLA);
    return { ...l, codigo: g.codigo, familia: g.familia, estado: motivos.length ? 'a-mano' : 'validado', motivos: [...new Set(motivos)],
      avisos: g.avisos, terminadoMm: g.terminadoMm, corteMm: g.pieza?.medidasMm, canalon, calculo: g };
  });
  const programas = [], reparto = [];
  for (const [codigo, ls] of Map.groupBy(lineas.filter(l => l.estado === 'validado'), l => l.codigo)) {
    const firmas = new Set(ls.map(l => JSON.stringify(l.corteMm)));
    if (firmas.size !== 1) {
      for (const l of ls) { l.estado = 'a-mano'; l.motivos.push('La referencia tiene medidas distintas en el mismo lote.'); }
      continue;
    }
    const cantidad = ls.reduce((n, l) => n + l.cantidad, 0), g = { ...ls[0].calculo, cantidadPedida: cantidad };
    for (const p of generarProgramas(g, { sueltas: sueltas[codigo] === true })) programas.push({ ...p, codigo });
    reparto.push(...ls.map(l => ({ pedido: l.CodOrder, numeroLinea: l.NumLine, linea: l.IDOrderLine, referencia: l.CodArticle, of: l.of_, cantidad: l.cantidad })));
  }
  // Un canalón por unidad, entero o dos mitades (taller, 28/10/2026). Las referencias con el mismo juego de la plantilla
  // comparten bloques («en los cortes se pueden mezclar»); cada bloque se repite con su «x».
  const conCanalon = lineas.filter(l => l.estado === 'validado' && l.canalon);
  for (const ls of Map.groupBy(conCanalon, l => JSON.stringify(l.canalon)).values()) {
    const canalon = ls[0].canalon, n = ls.reduce((s, l) => s + l.cantidad, 0), juegos = juegosCanalon(n);
    const refs = [...new Set(ls.map(l => l.CodArticle))];
    for (const tipo of /** @type {const} */ (['combinado', 'mitades'])) if (juegos[tipo]) {
      const b = bloqueCanalon(canalon, tipo), entidades = entidadesVacias();
      entidades.lineas.push(...b.lineas);
      entidades.textos.push({ capa: 'texto', x: 100, y: ALTO_BLOQUE_MM + 80, h: 40, literal: true, valor: refs.join(' ') },
        { capa: 'texto', x: 100, y: ALTO_BLOQUE_MM + 180, h: 60, literal: true, valor: `x${juegos[tipo]}` });
      programas.push({ tipo: 'canalon', codigo: `CANALÓN ${2 * canalon.mitad / 10}`, referencias: refs, panos: 0,
        canalones: CANALONES_POR_BLOQUE[tipo], repeticiones: juegos[tipo], largoMm: b.largoMm, anchoOcupadoMm: ALTO_BLOQUE_MM, entidades });
    }
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
    avisos: [],
    totalUnidades: lineas.reduce((n, l) => n + Number(l.cantidad || 0), 0),
    aMano: lineas.filter(l => l.estado === 'a-mano').length };
}
