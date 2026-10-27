// Contrasta únicamente SELECT de RPS y copias locales de los DXF. Solo escribe en tmp/ del repo.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { leerPlanoDxf } from './lib/plano-dxf.mjs';
import { codigoAssa, extraerPanos } from '../src/assa/leerCorte.js';
import { operacionesEnPano } from '../src/assa/comparar.js';
import { validarLineasLote } from '../src/assa/validarLotes.js';
import { generarPanos420150 } from '../src/assa/generar420150.js';
import { escribirDxf2004 } from '../src/domain/corteLona/dxfCorte.js';

const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const base = path.join(raiz, 'tmp/assa-estudio'), salida = path.join(raiz, 'tmp/assa-fase1');
const toleranciaMm = 1, inicio = '<!-- INICIO ASSA FASE 1 GENERADO -->', fin = '<!-- FIN ASSA FASE 1 GENERADO -->';
const leer = nombre => JSON.parse(fs.readFileSync(path.join(base, nombre), 'utf8'));
const hash = fichero => crypto.createHash('sha256').update(fs.readFileSync(fichero)).digest('hex');
const agrupar = (xs, clave) => Map.groupBy(xs, clave);
const porcentaje = (n, total) => total ? (100 * n / total).toLocaleString('es-ES', { maximumFractionDigits: 1 }) + ' %' : '—';
const celda = x => String(x ?? '—').replaceAll('|', '\\|').replaceAll('\n', ' ');
const tabla = (cabecera, filas) => ['| ' + cabecera.join(' | ') + ' |', '| ' + cabecera.map(() => '---').join(' | ') + ' |', ...filas.map(f => '| ' + f.map(celda).join(' | ') + ' |')].join('\n');

async function recogerRps() {
  const sql = (await import('mssql')).default;
  const { getRpsPoolForRemolques } = await import('../src/rpsCatalog.js');
  const { config } = await import('../src/config.js');
  const pool = await getRpsPoolForRemolques();
  try {
    const consulta = `SELECT o.IDOrder, l.IDOrderLine, o.CodOrder, CONVERT(varchar(10),o.OrderDate,120) fecha,
      c.CodCustomer, c.Description cliente, o.Comment comentarioPedido, a.CodArticle, a.Description articulo,
      l.Description descripcion, l.Comment comentarioLinea, l.Quantity cantidad,
      CONVERT(varchar(10),l.ReceptionDemandDate,120) entregaSolicitada,
      mo.CodManufacturingOrder of_, mo.Notes notasOf
      FROM dbo.FACOrderSL o
      JOIN dbo.FACCustomer c ON c.IDCustomer=o.IDCustomer AND c.CodCompany=o.CodCompany
      JOIN dbo.FACOrderLineSL l ON l.IDOrder=o.IDOrder AND l.CodCompany=o.CodCompany
      LEFT JOIN dbo.STKArticle a ON a.IDArticle=l.IDArticle AND a.CodCompany=l.CodCompany
      LEFT JOIN dbo.CPRManufacturingOrder mo ON mo.IDManufacturingOrder=l.IDManufacturingOrder AND mo.CodCompany=l.CodCompany
      WHERE o.CodCompany=@company AND c.CodCustomer IN ('029465','018974','034019')
      AND l.ReceptionDemandDate >= '20250101' AND l.ReceptionDemandDate < '20270101'
      ORDER BY l.ReceptionDemandDate, o.CodOrder, l.IDOrderLine`;
    if (!/^\s*SELECT\b/i.test(consulta)) throw new Error('RPS solo admite SELECT.');
    const lineas = (await pool.request().input('company', sql.VarChar(10), config.db.company).query(consulta)).recordset;
    const rps = { recogido: new Date().toISOString(), consulta, lineas };
    fs.writeFileSync(path.join(salida, 'rps.json'), JSON.stringify(rps, null, 2) + '\n');
    return rps;
  } finally { await pool.close(); }
}

fs.mkdirSync(salida, { recursive: true });
const rps = process.argv.includes('--actualizar-rps') ? await recogerRps() :
  fs.existsSync(path.join(salida, 'rps.json')) ? JSON.parse(fs.readFileSync(path.join(salida, 'rps.json'), 'utf8')) : leer('rps.json');
const archivos = [], programas = [], sinFecha = [], sinPano = [];
for (const anio of [2025, 2026]) {
  const carpeta = path.join(base, 'cortes', String(anio));
  for (const nombre of fs.readdirSync(carpeta).filter(n => /^LOTE.*\.dxf$/i.test(n)).sort()) {
    const local = path.join(carpeta, nombre), d = leerPlanoDxf(local), m = nombre.match(/^LOTE[\s_]*(\d{2})[-_](\d{2})/i);
    const fecha = m ? `${anio}-${m[2]}-${m[1]}` : null;
    const grupos = extraerPanos(d.modelo).filter(g => g.codigo.startsWith('420150-'));
    if (!fecha || Number.isNaN(Date.parse(fecha)) || new Date(fecha).toISOString().slice(0, 10) !== fecha) {
      sinFecha.push({ anio, nombre, sha256: hash(local), estado: 'a-mano',
        motivo: 'No tiene sábado identificable ni pedido escrito; no se asigna RPS por similitud o modificación.',
        rotulos: d.modelo.filter(t => t.tipo === 'texto' && codigoAssa(t.valor)?.startsWith('420150-')).map(t => ({ codigo: codigoAssa(t.valor), handle: t.handle })),
        grupos: grupos.map(g => ({ codigo: g.codigo, rotulo: g.titulo.handle, panos: g.panos.length, repeticiones: g.repeticiones, medidasMm: g.panos.map(p => p.medidasMm) })) });
      continue;
    }
    const fichero = `${anio}/${nombre}`, sha256 = hash(local);
    archivos.push({ fichero, fecha, sha256, panos: grupos.reduce((n, g) => n + g.panos.length, 0), grupos: grupos.length,
      codigos: [...new Set(d.modelo.filter(p => p.tipo === 'texto').map(t => codigoAssa(t.valor)).filter(Boolean))] });
    const titulosPano = new Set(grupos.map(g => g.titulo.handle));
    sinPano.push(...d.modelo.filter(t => t.tipo === 'texto' && codigoAssa(t.valor)?.startsWith('420150-') && !titulosPano.has(t.handle))
      .map(t => ({ fichero, fecha, codigo: codigoAssa(t.valor), handle: t.handle, punto: t.punto, motivo: 'Rótulo sin pila rectangular asignable: puede ser canalón, refuerzo o paño no identificable.' })));
    for (const g of grupos) programas.push({ fichero, sha256, fecha, codigo: g.codigo, rotulo: g.titulo.handle,
      repeticiones: g.repeticiones, multiplicador: g.multiplicador?.valor ?? 'sin xN: una vez',
      panos: g.panos.map(p => ({ ...p, operaciones: operacionesEnPano(d.modelo, p.caja) })) });
  }
}

const fechas = new Set(archivos.map(f => f.fecha));
const lineasFamilia = rps.lineas.filter(l => codigoAssa(l.CodArticle)?.startsWith('420150-') && l.entregaSolicitada >= '2025-01-01' && l.entregaSolicitada < '2027-01-01');
const lineas = lineasFamilia.filter(l => fechas.has(l.entregaSolicitada));
const unicos = new Map(lineas.map(l => [l.IDOrderLine, l]));
if (unicos.size !== lineas.length) throw new Error('La consulta contiene IDOrderLine duplicados; no se pueden sumar cantidades.');
const lineasPorLote = agrupar(lineas, l => `${l.entregaSolicitada}|${codigoAssa(l.CodArticle)}`);
const filas = validarLineasLote(lineas, programas, { toleranciaMm });
for (const f of filas) f.ficherosRotulados = archivos.filter(a => a.fecha === f.fecha && a.codigos.includes(codigoAssa(f.referencia))).map(a => a.fichero);

const sinLineaRps = programas.filter(p => !lineasPorLote.has(`${p.fecha}|${p.codigo}`)).map(({ panos, ...p }) => ({ ...p, medidasMm: panos.map(q => q.medidasMm) }));
const sinLote = lineasFamilia.filter(l => !fechas.has(l.entregaSolicitada)).map(l => ({ pedido: l.CodOrder, linea: l.IDOrderLine, fecha: l.entregaSolicitada, referencia: l.CodArticle }));
const resumen = { lineas: filas.length, cuadran: filas.filter(f => f.coincide).length, geometria: filas.filter(f => f.geometria).length,
  muestraCompatible: filas.filter(f => f.muestraCompatible).length, aMano: filas.filter(f => f.estado === 'a-mano').length,
  sinLineaRps: sinLineaRps.length, sinLote: sinLote.length, conjuntosCompletosAutorizados: 0 };
const agrupaciones = [...agrupar(filas, f => f.fecha + '|' + f.referencia)].map(([, fs]) => fs[0]);
const hipotesisStock = {
  agrupaciones: agrupaciones.length,
  cantidadExacta: agrupaciones.filter(f => f.cantidadCorteAgrupada === f.cantidadRpsAgrupada).length,
  cantidadCompletandoAgrupado: agrupaciones.filter(f => f.cantidadCorteAgrupada === f.cantidadConjuntosAgrupados).length,
  cantidadCompletandoPorLinea: agrupaciones.filter(f => f.cantidadCorteAgrupada === f.cantidadConjuntosPorLinea).length,
  cumpleEnTodosLosLotes: agrupaciones.every(f => f.cantidadCorteAgrupada === f.cantidadConjuntosAgrupados),
  lineasValidadasCompletandoAgrupado: filas.filter(f => f.cuadraCompletandoConjuntosAgrupados).length,
  lineasValidadasCompletandoPorLinea: filas.filter(f => f.cuadraCompletandoPorLinea).length,
  lineasAdicionalesAgrupado: filas.filter(f => !f.coincide && f.cuadraCompletandoConjuntosAgrupados).length,
  lineasQueDejarianDeCuadrarAgrupado: filas.filter(f => f.coincide && !f.cuadraCompletandoConjuntosAgrupados).length,
};
const pedidosAgosto = [...new Set(rps.lineas.filter(l => l.entregaSolicitada === '2026-08-22').map(l => l.CodOrder))];
const accesoriosAgosto = rps.lineas.filter(l => pedidosAgosto.includes(l.CodOrder) && /420150|3610|1805|CANAL|REFUER|GUTTER/i.test([l.CodArticle, l.descripcion, l.articulo, l.comentarioLinea, l.comentarioPedido, l.notasOf].join(' ')))
  .map(l => ({ pedido: l.CodOrder, linea: l.IDOrderLine, referencia: l.CodArticle, descripcion: l.descripcion, cantidad: l.cantidad, of: l.of_, comentarioLinea: l.comentarioLinea, comentarioPedido: l.comentarioPedido, notasOf: l.notasOf }));
const medidasAccesoriosEnRps = accesoriosAgosto.filter(l => /3610|1805/.test(JSON.stringify(l))).length;
// Se revisa de nuevo el terminado de la hoja, sin usarlo para generar las piezas.
const excel = leer('excel.json'), terminados = new Map();
for (const hoja of excel.hojas) for (const f of hoja.filas) {
  const [variante, largo, ancho] = f.celdas.slice(8, 11);
  if (/^\d{4}$/.test(String(variante)) && typeof largo === 'number' && typeof ancho === 'number') {
    terminados.set('420150-' + variante, [largo * 10, ancho * 10]);
  }
}
const margenes = [...agrupar(filas.filter(f => f.geometria), f => f.referencia)].map(([referencia, fs]) => {
  const terminado = terminados.get(codigoAssa(referencia));
  const cortes = [...new Map(fs.flatMap(f => f.comprobaciones.map(c => [c.medidasMm.join('|'), c.medidasMm]))).values()];
  return { referencia, lineas: fs.length, terminadoExcelMm: terminado ?? null, cortesMm: cortes,
    margenesMm: terminado ? cortes.map(m => m.map((n, i) => Math.round((n - terminado[i]) * 1000) / 1000)) : null };
});
const resultado = { version: 1, rpsRecogido: rps.recogido, toleranciaMm, alcance: 'Paños completos; canalones y refuerzos separados a mano.', resumen, hipotesisStock, archivos, sinFecha, filas, sinLineaRps, sinLote, sinPano, accesoriosAgosto, medidasAccesoriosEnRps, margenes };
fs.writeFileSync(path.join(salida, 'validacion.json'), JSON.stringify(resultado, null, 2) + '\n');
const csv = v => '"' + String(v ?? '').replaceAll('"', '""') + '"';
fs.writeFileSync(path.join(salida, 'lineas.csv'), '\uFEFF' + [
  ['Fecha', 'Pedido RPS', 'ID línea', 'OF RPS', 'Referencia', 'Descripción RPS', 'Cantidad RPS', 'Estado', 'Corte generado mm', 'Cantidad agrupada RPS', 'Cantidad agrupada corte', 'DXF', 'Motivos'],
  ...filas.map(f => [f.fecha, f.pedido, f.linea, f.of, f.referencia, f.descripcion, f.cantidad, f.estado, f.corteMm?.join(' × '), f.cantidadRpsAgrupada, f.cantidadCorteAgrupada, f.ficheros.join(' / '), f.motivos.join(' ')])
].map(f => f.map(csv).join(';')).join('\r\n') + '\r\n');

const porAnio = [...agrupar(filas, f => f.fecha.slice(0, 4))].map(([anio, fs]) => [anio, fs.length, fs.filter(f => f.coincide).length, porcentaje(fs.filter(f => f.coincide).length, fs.length), fs.filter(f => f.geometria).length, fs.filter(f => f.estado === 'a-mano').length]);
const porVariante = [...agrupar(filas, f => f.referencia)].sort(([a], [b]) => a.localeCompare(b)).map(([ref, fs]) => [ref, fs.length, fs.filter(f => f.coincide).length, fs.filter(f => f.geometria).length, fs.filter(f => f.estado === 'a-mano').length]);
const discrepancias = filas.filter(f => !f.coincide);
const ejemplo = filas.find(f => f.linea === 'a260d94e-ec64-455b-ab98-f546c02bbaaa');
if (ejemplo) {
  const l = lineas.find(l => l.IDOrderLine === ejemplo.linea), g = generarPanos420150(l);
  if (g.estado === 'generado') fs.writeFileSync(path.join(salida, 'revision-420150-0090-tres-panos.dxf'), escribirDxf2004(g.programas[0].entidades, { dx: 0, dy: 0, leyenda: false }), 'latin1');
}
const bt = String.fromCharCode(96);
const seccion = `${inicio}
## Fase 1: generador 420150

Esta sección la genera ${bt}scripts/validar-assa-420150.mjs${bt}; sus tablas no se editan a mano. Fuente: SELECT de RPS recogido el ${rps.recogido}; ${archivos.length} DXF de lotes de 2025/2026, ${fechas.size} fechas. Los SHA-256 de cada DXF y el ID de cada línea se conservan en ${bt}tmp/assa-fase1/validacion.json${bt}. No se ha escrito en RPS ni en la red.

**Resultado de paños completos y cantidades: ${resumen.cuadran}/${resumen.lineas} líneas (${porcentaje(resumen.cuadran, resumen.lineas)}).** Se exige la misma fecha ${bt}ReceptionDemandDate${bt}, el mismo código, medidas y operaciones de cada paño dentro de ±1 mm, un orillo abierto por conjunto y la misma cantidad agrupada por referencia/fecha. ${resumen.geometria} líneas coinciden en medidas y operaciones de todos sus paños identificados, sin certificar su cantidad; ${resumen.muestraCompatible} tienen al menos un paño compatible (esto tampoco certifica el pedido). ${resumen.aMano} líneas quedan a mano por datos o reglas insuficientes.

${tabla(['Año', 'Líneas RPS con fecha de lote', 'Paño y cantidad cuadran', '%', 'Toda la geometría cuadra', 'A mano'], porAnio)}

${tabla(['Referencia RPS', 'Líneas', 'Paño y cantidad cuadran', 'Toda la geometría cuadra', 'A mano'], porVariante)}

### Terminado y márgenes contrastados de nuevo

Se vuelve a leer la hoja de producción conservada y se compara con las medidas del lote de las líneas cuya geometría completa coincide. La hoja se usa solo en este contraste: el generador toma las medidas de la línea de RPS. Los anchos de corte distintos o los solapes históricos no se convierten en márgenes nuevos.

${tabla(['Referencia', 'Líneas con geometría coincidente', 'Terminado de la hoja mm', 'Corte real mm', 'Diferencia largo/ancho mm'], margenes.map(m => [m.referencia, m.lineas, m.terminadoExcelMm?.join(' × '), m.cortesMm.map(c => c.join(' × ')).join(' / '), m.margenesMm?.map(c => c.join(' / ')).join('; ')]))}

### Hipótesis de completar conjuntos para stock

El interruptor de código ${bt}completarConjuntosDe3${bt} está **apagado por defecto**. Al activarlo, el generador corta ${bt}ceil(cantidad/3) × 3${bt} y devuelve por separado ${bt}cantidadPedida${bt}, ${bt}cantidadCortada${bt} y ${bt}extraStock${bt}. No hay interfaz ni activación automática. Es una opción pendiente de confirmar con Iván, no una regla deducida de tres ejemplos.

El script comprueba **todas** las ${hipotesisStock.agrupaciones} agrupaciones referencia/fecha que corresponden a las ${resumen.lineas} líneas, también las que faltan en el dibujo o quedan a mano. ¿La cantidad cortada siempre es el siguiente múltiplo de tres del pedido agrupado? **${hipotesisStock.cumpleEnTodosLosLotes ? 'Sí' : 'No'}**. Cantidades y validación geométrica son pruebas distintas:

${tabla(['Criterio en todas las agrupaciones', 'Agrupaciones cuya cantidad cuadra', 'Total'], [['Cantidad exacta pedida', hipotesisStock.cantidadExacta, hipotesisStock.agrupaciones], ['Completar el total de referencia/fecha a tres', hipotesisStock.cantidadCompletandoAgrupado, hipotesisStock.agrupaciones], ['Completar cada línea por separado y sumar', hipotesisStock.cantidadCompletandoPorLinea, hipotesisStock.agrupaciones]])}

Con geometría, orillo y trazabilidad exigidos, completar el total agrupado validaría ${hipotesisStock.lineasValidadasCompletandoAgrupado}/${resumen.lineas} líneas (${porcentaje(hipotesisStock.lineasValidadasCompletandoAgrupado, resumen.lineas)}); completar cada línea por separado validaría ${hipotesisStock.lineasValidadasCompletandoPorLinea}/${resumen.lineas}. El redondeo agrupado explicaría ${hipotesisStock.lineasAdicionalesAgrupado} líneas adicionales respecto a la regla exacta, pero haría dejar de cuadrar ${hipotesisStock.lineasQueDejarianDeCuadrarAgrupado} que sí cuadran con cantidad exacta. Por tanto, no se aplica a todos los lotes ni se mezcla a conveniencia para aumentar el porcentaje principal.

**Q-ASSA-F1-02, para Iván/Tamara:** en los lotes donde se completa un conjunto, ¿se decide expresamente mandar el sobrante a stock? ¿Se completa el total de la referencia en el lote o cada pedido por separado? El interruptor queda apagado mientras se confirma.

### Reglas que genera y límites

- Entrada: referencia literal, descripción **de la línea** de RPS con NT/NB/NH, cantidad entera positiva, pedido, ID de línea y OF de RPS. No busca la medida por referencia ni completa la descripción con el artículo o con el dibujo de cliente.
- Terminado del paño: ${bt}NB + 2 × NH − 8${bt} por ${bt}NT${bt} mm. Corte: ${bt}NB + 2 × NH + 2${bt} por ${bt}NT + 66${bt} mm: suma **10 mm de largo y 66 mm de ancho** al terminado. La comprobación usa el contorno y todas las operaciones interiores del lote, no las cotas del dibujo.
- Solo NT600 y NB3250/NB3450 con descripción suficiente y material negro: son los repartos de agujeros contrastados. Dos ranuras de 70 × 20 mm y radio 3, centradas en ${bt}NH − 30${bt} y ${bt}NH + NB + 32${bt}. Dos marcas ROTULADOR separadas 65 mm, entre ${bt}NH + 5${bt} y ${bt}NH + NB − 3${bt}. Agujeros Ø14 desde ${bt}NH + 155${bt} hasta ${bt}NH + NB − 153${bt}, repartidos en 11 posiciones para NB3250 y 12 para NB3450. No se extrapola un paso a otros anchos.
- Rollo PLASTEL 8800 TE62 negra de 2040 mm, sin empates ni giros. Conjuntos de tres paños de 666 mm, repetidos ${bt}floor(cantidad/3)${bt} veces, y programa de una o dos sueltas para el resto. El borde inferior queda sin cortar, en el orillo. Las repeticiones son metadatos del trabajo; **x30 no se escribe en el DXF de máquina**. Los textos ROTULADOR añaden referencia/pedido/OF para trazabilidad.
- ${bt}generarPanos420150${bt} devuelve entidades compatibles con ${bt}escribirDxf2004${bt} (DISCO1/CUTTER/ROTULADOR, con arcos y círculos). ${bt}generar420150${bt} retiene el **conjunto completo a mano y aptoFabricacion=false** porque falta confirmar el despiece de canalones y refuerzos separados. No hay interfaz ni envío al bot.
- Las coincidencias son del agregado referencia/fecha: cuando hay varios pedidos no se atribuye un paño concreto a una OF por proximidad. Dos DXF con sufijos se mantienen como ambigüedad; solo se deduplican ficheros con idénticos bytes. Los casos sin regla no se fuerzan para mejorar el porcentaje.
- El lector identifica paños rectangulares por cortes DISCO1 y sus dos costados reales; conserva los que terminan en orillo superior o inferior y las sueltas de longitudes distintas con borde compartido. Admite el título interior y propaga un único código común entre paños contiguos de igual longitud; si son distintos necesita sus títulos propios. Para títulos exteriores usa la alineación inmediatamente sobre la pila (menos de 500 mm). Los rótulos sin pila y las asignaciones dudosas quedan pendientes; no se presentan como ausencia física demostrada. Las operaciones se comparan en ambos sentidos y por herramienta, con puntos cada 10 mm en líneas, uniones y puntos medios entre tramos, y 5° en arcos; también se detectan recorridos duplicados. Las semicurvas de polilínea se convierten en arcos sin aproximar su radio.
- Alcance de inventario: ${resumen.sinLote} líneas RPS de 2025/2026 tienen fecha sin DXF local; ${resumen.sinLineaRps} pilas del dibujo no tienen línea RPS de esa referencia/fecha. Se listan aparte y no se inventan pedidos para ellas. ${sinPano.length} rótulos no se han podido asignar a una pila de paños (incluyen accesorios). ${sinFecha.length} ficheros no tienen una fecha interpretable.

Se han leído también los ${sinFecha.length} DXF siguientes, con geometría de 420150 pero sin fecha de pedido demostrable. No entran en el porcentaje por línea RPS: no se puede construir ese vínculo sin inventarlo. Quedan a mano hasta confirmar su fecha.

${tabla(['DXF sin fecha', 'Rótulos 420150', 'Pilas de paños identificadas', 'Paños × repeticiones', 'Corte observado mm'], sinFecha.map(f => [f.anio + '/' + f.nombre, f.rotulos.length, f.grupos.length, f.grupos.map(g => g.codigo + ': ' + g.panos + ' × ' + g.repeticiones).join('; '), [...new Set(f.grupos.flatMap(g => g.medidasMm.map(m => m.join(' × '))))].join('; ')]))}

### Caso de control y accesorios pendientes

${ejemplo ? tabla(['Lote', 'Pedido RPS', 'OF RPS', 'Referencia', 'Cantidad RPS', 'Terminado mm', 'Corte mm', 'Programas calculados', 'Estado'], [[ejemplo.fecha, ejemplo.pedido, ejemplo.of, ejemplo.referencia, ejemplo.cantidad, ejemplo.terminadoMm?.join(' × '), ejemplo.corteMm?.join(' × '), ejemplo.programasGenerados.map(p => p.panos + ' paños × ' + p.repeticiones).join(' + '), ejemplo.estado]]) : 'No se ha encontrado la línea de control en la consulta; no se sustituye por otra.'}

El coordinador autorizó validar primero los paños y dejar accesorios a mano. Se han revisado todas las líneas de los pedidos con entrega solicitada 22-08-2026: ${pedidosAgosto.join(', ')}. Estas son las líneas relacionadas que devuelve RPS:

${tabla(['Pedido', 'Referencia', 'OF', 'Cantidad', 'Descripción literal'], accesoriosAgosto.map(l => [l.pedido, l.referencia, l.of, l.cantidad, l.descripcion]))}

Las medidas literales 3610/1805 aparecen en **${medidasAccesoriosEnRps}** de esas líneas o sus comentarios/notas de RPS. No se han podido deducir de estas líneas las cantidades de accesorios separados.

**Q-ASSA-F1-01, para Iván/Tamara:** junto a los tres paños de la 420150-0090, el lote 22-08-2026 tiene otros dos grupos rotulados con el mismo código. Hay formas de canalón de 3610 mm y mitades de 1805 mm, sin x30 escrito. ¿Las mitades son canalones de ese pedido partidos para aprovechar, o de otro trabajo? Falta confirmar cuántos canalones/refuerzos corresponden a cada envolvente y cómo se obtiene ese despiece del ancho pedido. Mientras tanto, los accesorios separados quedan a mano y ningún conjunto completo queda autorizado para fabricar. Las medidas 3610/1805 proceden de medir ese DXF; no se convierten en una regla del generador.

El DXF de revisión del caso de control queda en ${bt}tmp/assa-fase1/revision-420150-0090-tres-panos.dxf${bt}: tres paños, sin x30, con referencia/pedido/OF en ROTULADOR. No incluye canalones ni refuerzos pendientes y no se ha enviado a máquina.

**Q-ASSA-F1-03, dibujo histórico retenido a mano:** los solapes de 25 mm entre sueltas que dejan 641 mm entre cortes se conservan como diferencias del DXF histórico. No se reduce el ancho nuevo de 666 mm para hacerlos coincidir; el coordinador indicó mantener esas piezas históricas a mano. Las líneas y medidas afectadas aparecen en la tabla siguiente.

### Líneas que no cuadran o quedan a mano

La tabla siguiente sale del cruce por fecha/código. Cada pedido citado existe en SELECT de RPS y tiene fecha de lote local; la columna DXF dice dónde se ha identificado su código o deja constancia de que no se identifica. Los motivos distinguen cantidad, geometría y ausencia de datos. Los detalles de cada paño y las excepciones de inventario se pueden consultar en los resultados locales.

${tabla(['Fecha', 'Pedido', 'OF', 'Referencia', 'Estado (acción: a mano)', 'DXF rotulado', 'Cantidad RPS/corte agrupada', 'Programas reales (paños × veces)', 'Corte regla / real mm', 'Motivo'], discrepancias.map(f => [f.fecha, f.pedido, f.of, f.referencia, f.estado, f.ficherosRotulados.join(' / ') || 'Sin rótulo de referencia', f.cantidadRpsAgrupada + ' / ' + f.cantidadCorteAgrupada, f.programasReales.map(p => p.panos + ' × ' + p.repeticiones).join(' + '), (f.corteMm?.join(' × ') ?? 'A mano') + ' / ' + [...new Set(f.comprobaciones.map(c => c.medidasMm.join(' × ')))].join('; '), f.motivos.join(' ')]))}

### Reproducción

${bt}node --env-file="C:/Users/ivan.sanchez/Documents/Proyectos DEV/toldos-testar/.env" scripts/validar-assa-420150.mjs --actualizar-rps --informe${bt}

Solo realiza SELECT; no arranca la web ni usa rutas de escritura de configuración. Sin ${bt}--actualizar-rps${bt} reutiliza el SELECT local (${bt}tmp/assa-fase1/rps.json${bt}, o el del estudio anterior si no existe). ${bt}--informe${bt} actualiza exclusivamente esta sección del expediente. Datos grandes y CSV quedan en ${bt}tmp/assa-fase1/${bt}, ignorado por Git; no se añaden datos de producción al repositorio.

Pruebas: ${bt}pnpm test src/assa${bt}, ${bt}pnpm typecheck${bt}, ${bt}pnpm lint${bt}. No se amplía a 420102/420148 mientras queden por resolver el despiece y las diferencias de la primera familia.
${fin}`;
fs.writeFileSync(path.join(salida, 'informe.md'), seccion + '\n');
if (process.argv.includes('--informe')) {
  const destino = path.join(raiz, 'docs/modelos/assa-combursa.md'), original = fs.readFileSync(destino, 'utf8');
  const eol = original.includes('\r\n') ? '\r\n' : '\n';
  const a = original.indexOf(inicio), b = original.indexOf(fin);
  const nuevo = a >= 0 && b > a ? original.slice(0, a) + seccion.replaceAll('\n', eol) + original.slice(b + fin.length) : original.trimEnd() + eol + eol + seccion.replaceAll('\n', eol) + eol;
  fs.writeFileSync(destino, nuevo);
}
console.log(JSON.stringify({ ...resumen, porcentajePanosYCantidad: porcentaje(resumen.cuadran, resumen.lineas), informe: 'tmp/assa-fase1/informe.md' }, null, 2));
