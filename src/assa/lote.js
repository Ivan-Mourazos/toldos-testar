import catalogo from './validacionCatalogo.json' with { type: 'json' };
import { codigoAssa } from './leerCorte.js';
import { calcularFamilia, fechaLote, generarProgramas, entidadesVacias, desplazarEntidades, unirEntidades } from './faseA.js';
import { CANALONES_POR_BLOQUE, bloqueCanalon, canalonDe, juegosCanalon, pilaCanalon } from './canalon.js';

// Textos como en los cortes mandados: rótulos de 20 cm, números de línea y palet de 3 m, listado de 40 cm.
const ROTULO = 200, GRANDE = 3000, LISTA = 400, PASO_FILA = 2040 + 5000, HUECO = 500, SEPARACION_PALETS = 15000;

export const CANALON_SIN_PLANTILLA = '420150 a mano: la plantilla COMBURSA no tiene un juego de canalones para esta referencia y su NB.';

/** Los datos enviados por el navegador son solo opciones: las líneas siempre vienen del SELECT. */
export function prepararLote(fecha, lineasRps, sueltas = {}, certificados = catalogo, { palets = {} } = {}) {
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
  // El palet lo pone el técnico del correo de Producción (Iván, 28/10/2026: «de principio ponemos el palet a mano»).
  for (const l of lineas) l.palet = Number.isSafeInteger(palets[l.IDOrderLine]) && palets[l.IDOrderLine] > 0 ? palets[l.IDOrderLine] : null;
  for (const [, ls] of Map.groupBy(lineas.filter(l => l.estado === 'validado'), l => l.codigo)) {
    if (new Set(ls.map(l => JSON.stringify(l.corteMm))).size === 1) continue;
    for (const l of ls) { l.estado = 'a-mano'; l.motivos.push('La referencia tiene medidas distintas en el mismo lote.'); }
  }
  const validadas = lineas.filter(l => l.estado === 'validado');
  const reparto = validadas.map(l => ({ pedido: l.CodOrder, numeroLinea: l.NumLine, linea: l.IDOrderLine, referencia: l.CodArticle, of: l.of_, cantidad: l.cantidad, palet: l.palet }));
  const orden = (a, b) => String(a.CodOrder).localeCompare(String(b.CodOrder)) || (a.NumLine ?? 0) - (b.NumLine ?? 0);
  const programas = [], entidades = entidadesVacias();
  let x0 = 0;
  // Como los cortes mandados (LOTE 31-10): una zona por palet con «PALET n» enorme; dentro, una fila por referencia con el
  // número de su línea de pedido (RPS) en grande, y debajo todo lo que lleva el palet.
  for (const [palet, ls] of [...Map.groupBy(lineas.filter(l => l.estado === 'validado' || l.palet), l => l.palet ?? 0)].sort((a, b) => (a[0] || 1e9) - (b[0] || 1e9))) {
    const deCorte = ls.filter(l => l.estado === 'validado').sort(orden);
    const filas = [...Map.groupBy(deCorte, l => l.codigo).values()].map(grupo => ({ grupo, programas: [] }));
    for (const fila of filas) {
      const cantidad = fila.grupo.reduce((n, l) => n + l.cantidad, 0), g = { ...fila.grupo[0].calculo, cantidadPedida: cantidad };
      fila.programas.push(...generarProgramas(g, { sueltas: sueltas[fila.grupo[0].codigo] === true }).map(p => ({ ...p, codigo: fila.grupo[0].codigo, palet })));
    }
    // Un canalón por unidad, entero o dos mitades (taller, 28/10/2026). Las referencias del palet con el mismo juego de la
    // plantilla comparten bloques («en los cortes se pueden mezclar»); van en la fila de la primera que lo lleva.
    for (const conJuego of Map.groupBy(deCorte.filter(l => l.canalon), l => JSON.stringify(l.canalon)).values()) {
      const canalon = conJuego[0].canalon, juegos = juegosCanalon(conJuego.reduce((s, l) => s + l.cantidad, 0));
      const refs = [...new Set(conJuego.map(l => l.CodArticle))], fila = filas.find(f => f.grupo.includes(conJuego[0]));
      // Justo lo pedido: los combinados completos con su «x» y una pila con el resto (Iván, 28/10/2026).
      const bloques = [...juegos.completos ? [{ b: bloqueCanalon(canalon, 'combinado'), x: juegos.completos }] : [],
        ...juegos.resto ? [{ b: pilaCanalon(canalon, juegos.resto.enteros, juegos.resto.parejas), x: 1 }] : []];
      for (const { b, x } of bloques) {
        const e = entidadesVacias();
        e.lineas.push(...b.lineas);
        e.textos.push({ capa: 'texto', x: 100, y: b.altoMm + 120, h: ROTULO, literal: true, valor: refs.join(' ') },
          { capa: 'texto', x: 100, y: b.altoMm + 420, h: ROTULO, literal: true, valor: `x${x}` });
        fila.programas.push({ tipo: 'canalon', codigo: `CANALÓN ${2 * canalon.mitad / 10}`, referencias: refs, panos: 0, palet,
          canalones: b.canalones, repeticiones: x, largoMm: b.largoMm, anchoOcupadoMm: b.altoMm, entidades: e });
      }
    }
    // Cada fila es una tirada del rollo con el orillo abajo (y = 0 de la fila); las piezas van seguidas, sin girar.
    let ancho = 0;
    filas.forEach((fila, i) => {
      const y = -i * PASO_FILA;
      let x = x0;
      for (const p of fila.programas) {
        p.x = x; p.y = y; x += p.largoMm + HUECO;
        unirEntidades(entidades, desplazarEntidades(p.entidades, p.x, p.y));
        programas.push(p);
      }
      ancho = Math.max(ancho, x - x0);
      const numeros = [...new Set(fila.grupo.map(l => l.NumLine))].join(' · ');
      entidades.textos.push({ capa: 'texto', x: x0 - 1500 - GRANDE * 0.6 * numeros.length, y: y + 400, h: GRANDE, literal: true, valor: numeros });
    });
    entidades.textos.push({ capa: 'texto', x: x0, y: 2040 + 2500, h: GRANDE, literal: true, valor: palet ? `PALET ${palet}` : 'SIN PALET' });
    const listado = ls.sort(orden).map(l => [`L${l.NumLine ?? '—'}`, l.CodArticle, `${l.cantidad} UDS`, l.CodOrder, `OF ${l.of_ || '—'}`,
      l.estado === 'validado' ? '' : 'A MANO'].filter(Boolean).join('   '));
    const yLista = -(Math.max(filas.length, 1) - 1) * PASO_FILA - 2500;
    listado.forEach((valor, i) => entidades.textos.push({ capa: 'texto', x: x0, y: yLista - i * LISTA * 1.8, h: LISTA, literal: true, valor }));
    ancho = Math.max(ancho, ...listado.map(v => v.length * LISTA * 0.7));
    x0 += ancho + SEPARACION_PALETS;
  }
  const sinPalet = lineas.filter(l => l.estado === 'validado' && !l.palet).length;
  entidades.textos.push({ capa: 'texto', x: 0, y: 2040 + 6500, h: 1000, valor: nombre, literal: true });
  // Todo el corte en el cuadrante positivo, como los mandados (Iván, 28/10/2026: «dentro del eje X Y»): el número de
  // línea más a la izquierda y el listado más bajo quedan en x = 0 e y = 0.
  const dx = -Math.min(0, ...entidades.lineas.flatMap(l => [l.x1, l.x2]), ...entidades.textos.map(t => t.x));
  const dy = -Math.min(0, ...entidades.lineas.flatMap(l => [l.y1, l.y2]), ...entidades.textos.map(t => t.y));
  const movidas = desplazarEntidades(entidades, dx, dy);
  for (const clave of ['lineas', 'arcos', 'circulos', 'textos']) entidades[clave] = movidas[clave];
  for (const p of programas) { p.x += dx; p.y += dy; }
  // El papel del cortador (Iván, 28/10/2026: «solo le llega el papel donde le ponen las cantidades que debe cortar de
  // cada referencia, y debe coincidir con las cantidades que salen en el corte»): sale de los mismos programas del corte,
  // con sus repeticiones, por palet; y se comprueba contra lo que pide RPS.
  const cortador = [...Map.groupBy(programas, p => `${p.palet ?? 0}|${p.codigo}`).values()].map(ps => {
    const p0 = ps[0], canalon = p0.tipo === 'canalon';
    const unidades = ps.reduce((s, p) => s + (canalon ? p.canalones : p.panos) * p.repeticiones, 0);
    const pedidas = validadas.filter(l => (l.palet ?? 0) === (p0.palet ?? 0) && (canalon ? p0.referencias.includes(l.CodArticle) : l.codigo === p0.codigo))
      .reduce((s, l) => s + l.cantidad, 0);
    const como = ps.map(p => canalon ? `x${p.repeticiones} ${p.canalones === CANALONES_POR_BLOQUE.combinado ? 'bloque combinado (8 enteros + 14 mitades)' : `pila de ${Math.ceil(p.canalones / 2)} ${Math.ceil(p.canalones / 2) === 1 ? 'entero' : 'enteros'} + ${2 * Math.floor(p.canalones / 2)} mitades`}`
      : `x${p.repeticiones} de ${p.unidos ? `${p.filas} ${p.filas === 1 ? 'fila' : 'filas'} de 2 unidos` : `${p.panos} ${p.panos === 1 ? 'paño' : 'paños'}`}`);
    return { palet: p0.palet ?? null, referencia: canalon ? p0.codigo : validadas.find(l => l.codigo === p0.codigo)?.CodArticle ?? p0.codigo,
      referencias: canalon ? p0.referencias : undefined, unidades, como, pedidas, cuadra: unidades === pedidas };
  }).sort((a, b) => (a.palet ?? 1e9) - (b.palet ?? 1e9) || String(a.referencia).localeCompare(String(b.referencia)));
  return { nombre, fecha, lineas: lineas.map(({ calculo: _calculo, ...l }) => l), programas, reparto, entidades, cortador,
    avisos: sinPalet ? [`Falta el palet de ${sinPalet} ${sinPalet === 1 ? 'línea' : 'líneas'}: ponlo del correo de Producción.`] : [],
    paletsCompletos: !sinPalet,
    totalUnidades: lineas.reduce((n, l) => n + Number(l.cantidad || 0), 0),
    aMano: lineas.filter(l => l.estado === 'a-mano').length };
}
