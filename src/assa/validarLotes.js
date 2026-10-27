import { codigoAssa } from './leerCorte.js';
import { generarPanos420150 } from './generar420150.js';
import { compararOperaciones, operacionesGeneradas } from './comparar.js';

// Los pedidos se contrastan por sábado y referencia; no por distancia en el dibujo.
export function validarLineasLote(lineas, programas, { toleranciaMm = 1, generar = generarPanos420150 } = {}) {
  if (new Set(lineas.map(l => l.IDOrderLine)).size !== lineas.length) throw new Error('Hay líneas RPS duplicadas.');
  const lineasPorLote = Map.groupBy(lineas, l => `${l.entregaSolicitada}|${codigoAssa(l.CodArticle)}`);
  const gruposPorLote = Map.groupBy(programas, p => `${p.fecha}|${p.codigo}`);
  const filas = [];
  for (const [clave, ls] of lineasPorLote) {
    // Solo se deduplican copias con los mismos bytes: los sufijos pueden ser otro palet o revisión.
    const vistos = new Set();
    const gs = (gruposPorLote.get(clave) ?? []).filter(g => {
      const k = `${g.sha256}|${g.rotulo}|${JSON.stringify(g.panos.map(p => p.caja))}`;
      if (vistos.has(k)) return false;
      vistos.add(k); return true;
    });
    const cantidadesRps = ls.reduce((n, l) => n + l.cantidad, 0);
    const cantidadConjuntosAgrupados = Math.ceil(cantidadesRps / 3) * 3;
    const cantidadConjuntosPorLinea = ls.reduce((n, l) => n + Math.ceil(l.cantidad / 3) * 3, 0);
    const cantidadCorte = gs.reduce((n, g) => n + g.panos.length * g.repeticiones, 0);
    const archivosDelCodigo = [...new Set(gs.map(g => g.fichero))];
    const variosFicheros = new Set(gs.map(g => g.sha256)).size > 1;
    const generales = [];
    if (!gs.length) generales.push('No se ha identificado un paño rectangular con ese código en el lote.');
    if (variosFicheros) generales.push('Hay varios DXF de la misma fecha: no se supone que sean acumulables ni revisiones.');
    if (cantidadesRps !== cantidadCorte) generales.push(`Cantidad agrupada: RPS ${cantidadesRps}; paños identificados × repeticiones ${cantidadCorte}.`);
    const generados = ls.map(l => generar(l));
    const firmas = new Set(generados.map(g => g.estado === 'generado' ? JSON.stringify(g.medidas) : 'a-mano'));
    if (firmas.size > 1) generales.push('La misma referencia y fecha tiene distintas medidas o líneas a mano; no se asignan piezas a pedidos por proximidad.');
    for (let i = 0; i < ls.length; i++) {
      const l = ls[i], generado = generados[i], motivos = [...generales], comprobaciones = [];
      if (generado.estado === 'a-mano') motivos.push(...generado.motivos);
      else {
        const esperado = operacionesGeneradas(generado.pieza.entidades);
        for (const g of gs) for (const p of g.panos) {
          const medidas = p.medidasMm.every((v, j) => Math.abs(v - generado.pieza.medidasMm[j]) <= toleranciaMm);
          const forma = compararOperaciones(esperado, p.operaciones, toleranciaMm);
          comprobaciones.push({ fichero: g.fichero, rotulo: g.rotulo, medidasMm: p.medidasMm, medidas, ...forma });
        }
        if (comprobaciones.some(c => !c.medidas)) motivos.push('Las medidas del contorno real difieren más de 1 mm de la regla de la familia.');
        if (comprobaciones.some(c => !c.coincide)) motivos.push('Hay ranuras, agujeros, marcas o herramientas que no coinciden con la regla.');
        if (gs.some(g => g.panos.some(p => !p.orilloDelConjunto))) motivos.push('No se ha encontrado un orillo abierto en el conjunto real de paños.');
      }
      const geometria = generado.estado === 'generado' && comprobaciones.length > 0 &&
        comprobaciones.every(c => c.medidas && c.coincide) && gs.every(g => g.panos.every(p => p.orilloDelConjunto));
      const muestraCompatible = comprobaciones.some(c => c.medidas && c.coincide);
      const coincide = geometria && motivos.length === 0;
      const sinDiferenciaDeCantidad = geometria && motivos.filter(m => !m.startsWith('Cantidad agrupada:')).length === 0;
      filas.push({ fecha: l.entregaSolicitada, pedido: l.CodOrder, linea: l.IDOrderLine, of: l.of_, referencia: l.CodArticle,
        descripcion: l.descripcion, cantidad: l.cantidad, estado: generado.estado === 'a-mano' ? 'a-mano' : coincide ? 'cuadra-pano-y-cantidad' : 'no-cuadra',
        geometria, muestraCompatible, coincide, terminadoMm: generado.terminadoMm ?? null, corteMm: generado.pieza?.medidasMm ?? null,
        cantidadRpsAgrupada: cantidadesRps, cantidadCorteAgrupada: cantidadCorte, ficheros: archivosDelCodigo,
        cantidadConjuntosAgrupados, cantidadConjuntosPorLinea,
        cuadraCompletandoConjuntosAgrupados: sinDiferenciaDeCantidad && cantidadCorte === cantidadConjuntosAgrupados,
        cuadraCompletandoPorLinea: sinDiferenciaDeCantidad && cantidadCorte === cantidadConjuntosPorLinea,
        accion: coincide ? 'panos-validados' : 'a-mano',
        motivos, comprobaciones,
        programasReales: gs.map(g => ({ fichero: g.fichero, rotulo: g.rotulo, panos: g.panos.length, repeticiones: g.repeticiones, medidasMm: g.panos.map(p => p.medidasMm) })),
        programasGenerados: generado.programas.map(p => ({ panos: p.panos, repeticiones: p.repeticiones })) });
    }
  }
  filas.sort((a, b) => a.fecha.localeCompare(b.fecha) || a.referencia.localeCompare(b.referencia) || a.pedido.localeCompare(b.pedido));
  return filas;
}
