// Todo recuento y toda fila de tabla se calcula desde los JSON del análisis.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { codigoAssa } from '../../src/assa/leerCorte.js';
import { unico, suma, red } from './geometria.mjs';
const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const dir = path.join(repo, 'tmp/assa-investigacion');
const leer = f => JSON.parse(fs.readFileSync(path.join(dir, `${f}.json`), 'utf8'));
const a = leer('analisis'), pilas = leer('pilas'), uniones = leer('uniones'), bloques = leer('canalones'),
  juegos = leer('juegosCanalon'), materiales = leer('materiales'), reparto = leer('reparto'), variantes = leer('dibujos-variantes');
const dibujos = JSON.parse(fs.readFileSync(path.join(repo, 'src/assa/dibujosConfeccion.json'), 'utf8'));
const plantillaVariantes = leer('plantilla-variantes');
const alturasContexto = leer('alturasContexto');
const rps = JSON.parse(fs.readFileSync(a.rutas.rps, 'utf8')).lineas;
const nf = n => typeof n === 'number' ? n.toLocaleString('es-ES', { maximumFractionDigits: 3 }) : String(n ?? '—');
const esc = s => nf(s).replaceAll('|', '/').replaceAll('\n', ' ');
const tabla = (cab, filas) => '\n| ' + cab.join(' | ') + ' |\n| ' + cab.map(() => '---').join(' | ') + ' |\n' +
  filas.map(f => '| ' + f.map(esc).join(' | ') + ' |').join('\n') + '\n';
const agrupa = (xs, clave) => [...new Map(xs.map(x => [clave(x), true])).keys()].sort().map(k => [k, xs.filter(x => clave(x) === k)]);
const citaLista = [];
function cita(l) {
  const real = rps.find(r => r.IDOrderLine === l.IDOrderLine);
  if (!real || real.CodOrder !== (l.pedido ?? l.CodOrder) || Number(real.NumLine) !== Number(l.NumLine) || codigoAssa(real.CodArticle) !== l.codigo) {
    throw new Error(`Cita RPS no comprobada: ${JSON.stringify(l)}`);
  }
  citaLista.push({ pedido: real.CodOrder, NumLine: real.NumLine, codigo: codigoAssa(real.CodArticle), IDOrderLine: real.IDOrderLine });
  return `${real.CodOrder} / ${real.NumLine}`;
}
const fechaCorte = c => `${c.ano}/${c.nombre}`;
const filasHoja = o => [...new Map(o.hojas.flatMap(h => h.filas.map(f => ({ ...f, pedido: h.pedido, hoja: h.titulo.punto.join(',') })))
  .map(f => [`${f.pedido}|${f.hoja}|${f.numeroDibujo}|${f.codigo}`, f])).values()];
const todasFilas = a.oficinas.filter(o => o.tipo === 'lote').flatMap(o => filasHoja(o).filter(f => f.codigo).map(f => ({ ...f, fichero: o.nombre })));
const iguales = todasFilas.filter(f => f.coincideNumLine === true), distintas = todasFilas.filter(f => f.coincideNumLine === false);
const notas = a.oficinas.flatMap(o => o.notas.map(n => ({ ...n, oficina: o.nombre })));
const stock = notas.filter(n => /stock/i.test(n.valor));
const tresTechos = pilas.filter(p => /^43012[579]-/.test(p.codigo) && p.panos === 3);
const conFecha = a.cortes.filter(c => c.fecha), fechasRepetidas = agrupa(conFecha, c => c.fecha).filter(([, cs]) => cs.length > 1);
const soloLotes = a.oficinas.filter(o => o.tipo === 'lote');
const cortesConMixtas = a.cortes.filter(c => c.filas.some(f => f.mixto));
const nMixtas = suma(a.cortes.map(c => c.filas.filter(f => f.mixto).length));
const rpsPedidos = new Set(rps.map(l => l.CodOrder));
const pedidosValidos = unico(a.oficinas.flatMap(o => o.pedidos).filter(p => rpsPedidos.has(p)));
const texto = [];
texto.push('# COMBURSA / ASSA ABLOY: cómo se preparan los lotes de oficina\n');
texto.push('Informe generado por `scripts/assa-investigacion/informe.mjs`. **Todas las cifras, listas de excepciones y tablas salen de los scripts; no se han rellenado a mano.** Los ficheros prueban una preparación guardada, no el corte físico, el orden de la máquina ni una contabilidad de stock.\n');
texto.push(`Se han leído **${nf(a.oficinas.length)} DXF de oficina** (${nf(soloLotes.length)} de lote y ${nf(a.oficinas.length - soloLotes.length)} especial), **${nf(a.cortes.length)} DXF de corte** y el maestro COMBURSA (CRAWFORD). El cruce abarca ${nf(pedidosValidos.length)} pedidos rotulados que existen en la foto de RPS. Hay filas con distintas referencias en ${nf(cortesConMixtas.length)} archivos; no sirve generar una fila independiente por artículo sin conservar estos aprovechamientos.\n`);
texto.push(`La foto original no tenía NumLine. A petición del análisis, el coordinador ha facilitado una foto local mediante SELECT: ${a.rutas.rps.replaceAll('\\', '/')}, recogida en ${a.recogidoRps ?? 'fecha no indicada'}, con ${nf(a.rps.lineas)} registros y NumLine en ${nf(a.rps.conNumLine)}. Se cruzan **pedido + NumLine + referencia**, conservando IDOrderLine y OF. El detalle es [analisis.json](../../tmp/assa-investigacion/analisis.json); las citas del informe se verifican en [citas-rps.json](../../tmp/assa-investigacion/citas-rps.json).\n`);
texto.push('## 1. Organización de los planos de oficina\n');
texto.push('Cada encabezado AR delimita una hoja de trabajo en Modelo. La columna izquierda conserva confección; la derecha, despiece. Las cifras grandes se repiten en ambas columnas. Se localizan primero por posición y tamaño del texto, sin utilizar la medida esperada de RPS para escoger la pieza. Los rótulos antiguos fuera de la franja principal y las copias de palets se conservan como excepciones. El especial por pedido tiene otra organización y su Modelo contiene restos históricos ajenos a la foto actual.\n');
texto.push(tabla(['Oficina', 'Encabezados / pedidos distintos', 'Filas con código (sin duplicar columnas)', 'Iguales / distintas a NumLine', 'Palets rotulados (zona principal)', 'Otras copias de rótulos'], a.oficinas.map(o => {
  const fs = filasHoja(o).filter(f => f.codigo);
  return [o.nombre, `${o.hojas.length} / ${o.pedidos.length}`, fs.length,
    `${fs.filter(f => f.coincideNumLine === true).length} / ${fs.filter(f => f.coincideNumLine === false).length}`,
    o.palets.map(p => p.valor).join(', ') || 'sin rótulo', o.paletsFueraZona.map(p => p.valor).join(', ') || '—'];
})));
texto.push(`**La cifra grande no se puede traducir siempre a NumLine.** Después de reunir las dos columnas hay ${nf(iguales.length)} observaciones con código coincidente y ${nf(distintas.length)} con otro código en ese número de RPS. Otras ${nf(todasFilas.filter(f => f.coincideNumLine === null).length)} no tienen número de RPS comprobable o carecen de rótulo de referencia. Son observaciones espaciales de la hoja, no líneas nuevas de RPS. Un encabezado copiado o una renumeración también puede producir la diferencia: no se corrige el pedido por intuición.\n`);
texto.push(tabla(['Oficina', 'Pedido / NumLine comprobados', 'Código escrito junto a la cifra', 'Código de RPS en ese número'], distintas.flatMap(f => f.referenciaEnNumero.map(l => [f.fichero, cita(l), f.codigo, l.codigo]))));
const sepColumnas = soloLotes.flatMap(o => o.hojas.map(h => {
  const xs = h.columnasX, izq = Math.min(...xs), der = xs.filter(x => x > izq + 3).sort((a, b) => a - b)[0];
  return der ? { fichero: o.nombre, separacion: red(der - izq) } : null;
}).filter(Boolean));
texto.push('La geometría de oficina está en metros y la de corte en milímetros: el análisis usa el factor 1000 indicado para estas copias, sin fiarse de INSUNITS. El catálogo de confección se entrega en mm. La separación de columnas y los tamaños siguientes son medidas del dibujo, **no una escala de impresión**. La ventana real que se imprime y el orden de mecanizado no se pueden reconstruir a partir de estos textos.\n');
texto.push(tabla(['Separación de columnas en Modelo (m)', 'Hojas'], agrupa(sepColumnas, s => nf(s.separacion)).map(([k, xs]) => [k, xs.length])));
const alturas = new Map();
for (const o of soloLotes) for (const [h, n] of Object.entries(o.alturasTexto)) alturas.set(h, (alturas.get(h) ?? 0) + n);
texto.push(tabla(['Altura de texto de oficina (m)', 'Apariciones'], [...alturas].sort((a, b) => b[1] - a[1]).slice(0, 15)));
texto.push('## 2. Palets y reparto\n');
texto.push('Se cuentan rótulos distintos, sin completar automáticamente los números que faltan. Dos zonas con el mismo rótulo se conservan como duplicación. Se relacionan las cifras y los códigos de las filas de palet con los de la hoja de pedido: una asignación solo se considera identificada si lleva a una única línea real. Las notas de traslado prevalecen sobre la posición del dibujo. No hay un campo de peso en la foto utilizada que permita deducir capacidad, peso máximo ni una fórmula de reparto por unidades.\n');
texto.push(tabla(['Lote de oficina', 'Rótulos distintos / zonas', 'Pedidos con filas en varios palets', 'Líneas identificadas por palet / filas sin vínculo único'], reparto.filter(r => r.oficina.startsWith('LOTE')).map(r => [r.oficina,
  `${unico(r.palets.map(p => p.palet)).length} / ${r.palets.length}`,
  r.pedidosPartidos.map(p => `${p.pedido}: ${p.palets.join('+')}`).join('; ') || '—',
  r.palets.map(p => `${p.palet}: ${p.lineasIdentificadas.length} / ${p.filasAmbiguas}`).join('; ') || 'sin rótulo'])));
texto.push(`El cruce espacial encuentra pedidos en varios palets en ${nf(reparto.filter(r => r.pedidosPartidos.length).length)} planos. Por tanto, **no se debe imponer que todo el pedido vaya en un solo palet**. La prueba literal de reparto y los traslados se pueden revisar aquí:\n`);
texto.push(tabla(['Oficina', 'Nota literal', 'Palet de la zona', 'Referencias próximas (no equivalen a asignación)'], notas.filter(n => /uds?\s+palet|se corta.*palet|palet\s*\d/i.test(n.valor)).map(n => [n.oficina, n.valor, n.paletEspacial, n.referenciasProximas.join(', ')])));
const ejemplo90 = a.oficinas.find(o => o.nombre === 'LOTE 22-08.dxf')?.lineasRps.find(l => l.codigo === '420150-0090' && l.cantidad === 90);
if (ejemplo90) {
  const repartos = unico(notas.filter(n => n.oficina === 'LOTE 22-08.dxf').map(n => n.valor.match(/(\d+)\s*uds?\s+palet\s*(\d+)/i))
    .filter(Boolean).map(m => `${m[1]} unidades en palet ${m[2]}`));
  texto.push(`Caso comprobado: ${cita(ejemplo90)}, ${ejemplo90.referencia}, pide ${nf(ejemplo90.cantidad)} unidades; las notas del plano dicen ${repartos.join(' y ')}. Es un reparto explícito, no un límite de capacidad deducido del resto de lotes.\n`);
}
texto.push('## 3. Filas de corte, mezcla de referencias y huecos\n');
texto.push(`Se reconstruyen ${nf(suma(a.cortes.map(c => c.filas.length)))} pilas candidatas de paños: ${nf(nMixtas)} contienen más de una referencia. Se considera una pila cuando los paños solapan su proyección a lo largo y sus bordes se tocan en el ancho del rollo (tolerancia de lectura de 1 mm). Las parejas unidas se desdoblan por su raya central; no se convierten en una sola unidad. Este método cubre cuerpos rectos rotulados y señala sus límites: no certifica cortinas anchas, accesorios sin rótulo ni contornos curvos.\n`);
texto.push('Los palets forman columnas y dentro de ellas se puede ordenar la presentación por altura descendente. Eso describe **el orden espacial**. El DXF no demuestra el orden de ejecución del CMT. Los rótulos pueden ir encima o dentro de la pieza; los multiplicadores superiores se vinculan por su posición a un grupo concreto. Las sueltas con rótulo interior no heredan el xN de otra fila.\n');
texto.push(tabla(['Archivo de corte (todos)', 'Palets rotulados', 'Pilas / mixtas', 'Grupos / paños candidatos × repetición', 'Dobles con marca central', 'Separación entre pilas: mín. / mediana / máx. mm'], a.cortes.map(c => {
  const ds = c.separaciones.map(s => s.huecoMm).sort((a, b) => a - b), dobles = c.grupos.filter(g => g.panos.some(p => p.uniones.length));
  return [fechaCorte(c), c.palets.map(p => p.valor).join(', ') || 'sin rótulo', `${c.filas.length} / ${c.filas.filter(f => f.mixto).length}`,
    `${c.grupos.length} / ${suma(c.grupos.map(g => g.panos.length * g.repeticiones))}`, dobles.length,
    ds.length ? `${nf(ds[0])} / ${nf(ds[Math.floor(ds.length / 2)])} / ${nf(ds.at(-1))}` : '—'];
})));
const mezclas = a.cortes.flatMap(c => c.filas.filter(f => f.mixto).map(f => ({ ...f, fichero: fechaCorte(c) })));
texto.push('Combinaciones más repetidas. La lista completa, con coordenadas, alturas, rótulos y multiplicadores de cada fila, está en `analisis.json → cortes[].filas`.\n');
texto.push(tabla(['Referencias en la misma pila', 'Pilas / archivos distintos', 'Alturas observadas mm'], agrupa(mezclas, f => f.codigos.join(' + '))
  .sort((a, b) => b[1].length - a[1].length).slice(0, 35).map(([k, fs]) => [k, `${fs.length} / ${unico(fs.map(f => f.fichero)).length}`, unico(fs.flatMap(f => f.alturasMm)).join(', ')])));
const posTitulos = a.cortes.flatMap(c => c.filas.flatMap(f => f.titulos));
texto.push(tabla(['Situación del rótulo respecto a los paños de su pila', 'Apariciones'], [
  ['Dentro de un paño', posTitulos.filter(t => t.interior).length], ['Fuera del interior (normalmente arriba)', posTitulos.filter(t => !t.interior).length],
  ['Grupos con xN explícito', suma(a.cortes.map(c => c.grupos.filter(g => g.multiplicador).length))]]));
texto.push('No hay un hueco universal que se deba añadir entre todas las piezas. Dentro de muchas pilas los bordes se comparten (hueco cero); entre conjuntos hay pasillos variables. La mediana anterior mide separación vertical entre pilas con solape horizontal; **no** es una separación de seguridad ni una tolerancia para generar cortes nuevos.\n');
texto.push('## 4. Cantidades frente a RPS y notas de stock\n');
texto.push('Se comparan por referencia las líneas identificadas en las hojas con los paños rotulados × xN. Una referencia repetida en varios pedidos se suma una sola vez por IDOrderLine. Cada salida con sufijo queda separada: no se suman versiones para conseguir una coincidencia. Una ausencia de paños reconstruidos se escribe como «sin lectura de cuerpo», nunca como prueba de que se cortaron cero. Las diferencias son **diferencias de estas candidaturas**; el despiece de accesorios y la fabricación real quedan fuera de esa cuenta.\n');
texto.push(tabla(['Oficina → salida de corte', 'Refs con RPS y cuerpo: iguales / distintas', 'Refs sin lectura de cuerpo / sin RPS de hoja', 'Unidades RPS / paños candidatos (solo comparables)', 'Notas de stock en oficina'], a.cruces.map(c => {
  const validas = c.referencias.filter(r => r.tieneRps && r.tienePanos);
  return [`${c.oficina} → ${c.corte}`, `${validas.filter(r => !r.diferencia).length} / ${validas.filter(r => r.diferencia).length}`,
    `${c.referencias.filter(r => r.tieneRps && !r.tienePanos).length} / ${c.referencias.filter(r => !r.tieneRps).length}`,
    `${suma(validas.map(r => r.cantidadRps))} / ${suma(validas.map(r => r.cantidadCorte))}`, stock.filter(n => n.oficina === c.oficina).length];
})));
texto.push('Las diferencias por referencia quedan todas enumeradas aquí; el detalle de cada línea/OF se conserva en los JSON. Un código sin RPS de hoja o sin lectura de cuerpo necesita revisión, aunque otro código del mismo archivo cuadre.\n');
texto.push(tabla(['Salida', 'Referencia', 'Líneas de RPS comprobadas', 'RPS / paños candidatos', 'Lectura'], a.cruces.flatMap(c => c.referencias.filter(r =>
  r.tieneRps && (!r.tienePanos || r.diferencia)).map(r => [c.corte, r.codigo, r.lineasRps.map(cita).join('; '),
  `${r.cantidadRps} / ${r.tienePanos ? r.cantidadCorte : '?'}`, r.tienePanos ? `saldo ${nf(r.diferencia)}` : 'sin lectura de cuerpo']))));
texto.push(tabla(['Oficina', 'Nota de stock literal', 'Referencias próximas (vínculo espacial)'], stock.map(n => [n.oficina, n.valor, n.referenciasProximas.join(', ') || 'sin vínculo único'])));
texto.push('Para los cortes sin hoja de oficina asociada, especialmente los de 2025, se conserva un segundo cruce independiente por fecha solicitada y referencia escrita (`cantidades[].rpsPorFecha`). Es una candidatura por fecha, no una asignación de ese corte a todos esos pedidos. La tabla siguiente da cobertura de ese cruce para **todos** los archivos de corte.\n');
texto.push(tabla(['Archivo', 'Refs con líneas RPS por fecha', 'Iguales / distintas con cuerpo', 'Refs sin lectura de cuerpo'], a.cortes.map(c => {
  const qs = c.cantidades.filter(q => q.rpsPorFecha.length), vs = qs.filter(q => q.grupos.length);
  return [fechaCorte(c), qs.length, `${vs.filter(q => q.panosCandidatos === suma(q.rpsPorFecha.map(l => l.cantidad))).length} / ${vs.filter(q => q.panosCandidatos !== suma(q.rpsPorFecha.map(l => l.cantidad))).length}`, qs.filter(q => !q.grupos.length).length];
})));
texto.push('Fechas con más de una salida, incluidas rectificaciones y adicionales: no se les supone una relación acumulativa.\n');
texto.push(tabla(['Fecha interpretada del nombre', 'Archivos'], fechasRepetidas.map(([f, cs]) => [f, cs.map(c => c.nombre).join('; ')])));
texto.push('## 5. Cambios de altura para aprovechar el rollo\n');
texto.push(`En las ${nf(tresTechos.length)} pilas reconstruidas de tres techos 430125/430127/430129, las alturas medidas son las siguientes. Es una comprobación de geometría, sin completar las alturas desde una fórmula. Las pilas de tres de otras familias también se cuentan para evitar trasladarles automáticamente la regla del techo.\n`);
texto.push(tabla(['Familia', 'Paños en la pila', 'Alturas mm', 'Pilas / archivos'], agrupa(pilas, p => `${p.codigo.slice(0, 6)}|${p.panos}|${p.alturasMm.join('/')}`)
  .map(([k, ps]) => [...k.split('|'), `${ps.length} / ${unico(ps.map(p => p.fichero)).length}`])));
texto.push('En los techos de fondo habitual 600, la regla ya contestada por Tamara es pasar de 691 a 680 para que tres ocupen el ancho de 2040. El contraste por lote permite ver también sueltas de 680 y sueltas de 691: **no basta saber que una pieza va sola para imponerle 691**. Los 991 de otros techos no se convierten a 680 por pertenecer a la misma familia.\n');
texto.push(tabla(['Archivo con techos', 'Pilas de tres: alturas mm y cantidad', 'Pilas de uno o dos: alturas mm y cantidad'], a.cortes.filter(c => pilas.some(p => p.fichero === fechaCorte(c) && /^43012[579]-/.test(p.codigo))).map(c => {
  const ps = pilas.filter(p => p.fichero === fechaCorte(c) && /^43012[579]-/.test(p.codigo));
  const resumen = xs => agrupa(xs, p => p.alturasMm.join('/')).map(([h, rs]) => `${h}: ${rs.length}`).join('; ') || '—';
  return [fechaCorte(c), resumen(ps.filter(p => p.panos === 3)), resumen(ps.filter(p => p.panos !== 3))];
})));
texto.push('Excepciones a 680 en las pilas de tres de techo (se muestra el decimal leído, no se redondea a 681):\n');
texto.push(tabla(['Archivo', 'Referencia', 'Paños', 'Altura mm', 'Ocupación mm'], tresTechos.filter(p => p.alturasMm.some(h => Math.abs(h - 680) > .01))
  .map(p => [p.fichero, p.codigo, p.panos, p.alturasMm.join('/'), p.ocupacionMm])));
const techosMixtos = alturasContexto.filter(p => p.pilaContinuaSinSolapes && p.mixta && p.alturasEnEsaAbscisa === 3);
texto.push('**Tres alturas no significa necesariamente tres techos iguales.** Se mide también la columna que cruza el centro de cada techo. En pilas mixtas continuas de tres piezas aparecen techos de 691 junto a cuerpos más estrechos: pueden caber sin bajar el techo a 680. Estas observaciones se cuentan por paño dibujado, sin multiplicar por xN. Por eso la regla confirmada de tres techos iguales no se puede extender a cualquier fila de tres referencias.\n');
texto.push(tabla(['Altura del techo mm', 'Paños en pila mixta continua de tres / archivos', 'Ocupaciones observadas mm'], agrupa(techosMixtos, p => nf(p.alturaMm))
  .map(([k, ps]) => [k, `${ps.length} / ${unico(ps.map(p => p.fichero)).length}`, unico(ps.map(p => p.ocupacionMm)).join(', ')])));
texto.push(tabla(['Archivo con techo 691 en pila mixta de tres', 'Referencias de techo', 'Ocupación de esa columna mm'], agrupa(techosMixtos.filter(p => Math.abs(p.alturaMm - 691) < .01), p => p.fichero)
  .map(([k, ps]) => [k, unico(ps.map(p => p.codigo)).join(', '), unico(ps.map(p => p.ocupacionMm)).join(', ')])));
texto.push('Lecturas que superan el ancho habitual del rollo: se conservan como excepciones del dibujo o del agrupador; no autorizan ampliar el rollo ni reducir una medida por programa.\n');
texto.push(tabla(['Archivo', 'Referencias', 'Alto exterior de la pila candidata mm'], a.cortes.flatMap(c => c.filas.filter(f => f.caja.y1 - f.caja.y0 > 2041)
  .map(f => [fechaCorte(c), f.codigos.join(', '), red(f.caja.y1 - f.caja.y0)]))));
texto.push('## 6. Parejas con raya central\n');
texto.push('Se detecta una raya vertical larga de ROTULADOR en el centro del contorno, que permite leer dos paños iguales. Es una marca geométrica; el motivo de envarillar de dos en dos ya estaba confirmado para los laterales. El examen de todos los lotes encuentra también casos rotulados como techos: se guardan como excepción y se ha preguntado al coordinador antes de convertirlos en una regla de confección. Una marca central de una pieza que no tenga la longitud doble esperada necesita contraste adicional.\n');
texto.push(tabla(['Familia', 'Grupos / archivos', 'Referencias', 'Largos de cada mitad mm'], agrupa(uniones, u => u.codigo.slice(0, 6)).map(([k, us]) => [k,
  `${us.length} / ${unico(us.map(u => u.fichero)).length}`, unico(us.map(u => u.codigo)).join(', '), unico(us.flatMap(u => u.longitudesMm)).join(', ')])));
texto.push(tabla(['Archivo', 'Referencia de techo con marca central', 'Paños leídos / xN', 'Largo de cada mitad mm'], uniones.filter(u => u.codigo.startsWith('430')).map(u => [u.fichero, u.codigo, `${u.panos} / ${u.repeticiones}`, u.longitudesMm.join(', ')])));
texto.push('## 7. Canalones: bloques, largos y cantidades\n');
texto.push(`La reconstrucción de caras cerradas encuentra ${nf(bloques.filter(b => b.tipo === 'combinado').length)} bloques completos de 22 caras (8 enteros y 14 mitades) y ${nf(bloques.filter(b => b.tipo === 'mitades').length)} bloques de 15 mitades. Hay ${nf(bloques.filter(b => b.tipo === 'parcial').length)} grupos parciales o de otro tamaño: no se fuerzan al patrón completo. Las caras usan DISCO1+DISCO2, rectas y uniones en T, con nodos a 0,1 mm; las ranuras pequeñas no cuentan como canalones.\n`);
texto.push(`Se han asociado ${nf(juegos.filter(j => j.mitades !== null).length)} pares de combinado y mitades por largo mitad/doble, posición contigua y diferencia de altura menor de 500 mm. La asociación conserva la tolerancia y la posición; **no prueba que se cortase todo ese bloque una sola vez**. Un combinado equivale a 15 canalones y el de mitades a 7,5 solo como cuenta de componentes. Juntos dibujan 22,5: no es una orden de fabricar medios canalones ni stock de más.\n`);
texto.push(tabla(['Archivo', 'Combinados por largo mm', 'Mitades por largo mm', 'Grupos parciales', 'xN explícitos en bloques completos'], a.cortes.map(c => {
  const bs = bloques.filter(b => b.fichero === fechaCorte(c)), cuenta = xs => agrupa(xs, b => nf(b.largoMm)).map(([k, xs]) => `${k}: ${xs.length}`).join('; ') || '—';
  return [fechaCorte(c), cuenta(bs.filter(b => b.tipo === 'combinado')), cuenta(bs.filter(b => b.tipo === 'mitades')),
    bs.filter(b => b.tipo === 'parcial').length, bs.filter(b => b.tipo !== 'parcial' && b.multiplicador).map(b => b.multiplicador.valor).join(', ') || 'ninguno'];
})));
texto.push('Referencias que reutilizan un mismo largo de bloque completo, tomando solo los rótulos que el lector ha podido vincular encima del bloque. Compartir largo no demuestra por sí solo que se cortasen juntas en el mismo palet. Los grupos sin rótulo y los próximos se conservan separados en `canalones.json`.\n');
texto.push(tabla(['Largo del combinado mm', 'Bloques / archivos', 'Referencias rotuladas'], agrupa(bloques.filter(b => b.tipo === 'combinado'), b => nf(b.largoMm))
  .map(([k, bs]) => [k, `${bs.length} / ${unico(bs.map(b => b.fichero)).length}`, unico(bs.map(b => b.codigo).filter(Boolean)).join(', ')])));
texto.push('Comparación con las unidades identificadas en oficina, sin usar los bloques dibujados como cantidad producida:\n');
texto.push(tabla(['Oficina → corte', 'Unidades RPS de familias con canalón', 'Bloques combinados / mitades dibujados'], a.cruces.filter(c => c.parejaExacta).map(c => {
  const o = a.oficinas.find(o => o.nombre === c.oficina), bs = bloques.filter(b => b.fichero === c.corte);
  return [`${c.oficina} → ${c.corte}`, suma(o.lineasRps.filter(l => /^(420150|430172|430127|430129)-/.test(l.codigo)).map(l => l.cantidad)),
    `${bs.filter(b => b.tipo === 'combinado').length} / ${bs.filter(b => b.tipo === 'mitades').length}`];
})));
texto.push('**Regla confirmada por Iván (28/10/2026):** se ponen los bloques y el cortador aplica en el bot la repetición necesaria; esa repetición no queda escrita en el DXF guardado. Se hace un canalón por unidad, entero o dos mitades, y lo que manda el pedido, sin stock. Esto explica que las caras del DXF no cuadren con las unidades de RPS: representan la plantilla de bloques, no el número de ciclos ejecutados. La web debe conservar las unidades y la instrucción de repetición junto con el bloque; no deducir la producción contando sus caras.\n');
texto.push('## 8. CUTTER 625 × 400 y rótulos «3 MM»\n');
texto.push(`Se reconstruyen ${nf(suma(materiales.map(m => m.rectangulosDibujados)))} rectángulos de 625 × 400 en ${nf(materiales.length)} conjuntos próximos; ${nf(materiales.filter(m => m.notas3mm.length).length)} conjuntos tienen un rótulo «3 MM» cerca. El rótulo prueba una indicación de espesor, no el nombre completo del material. Se mantienen las capas CUTTER de esas piezas.\n`);
texto.push(tabla(['Techo vecino (sin atribuirle las piezas)', 'Conjuntos / archivos', 'Rectángulos dibujados por conjunto', 'Conjuntos con varias referencias alrededor'], agrupa(materiales, m => m.techoVecino ?? 'sin techo vecino único').map(([k, ms]) => [k,
  `${ms.length} / ${unico(ms.map(m => m.fichero)).length}`, unico(ms.map(m => m.rectangulosDibujados)).join(', '), ms.filter(m => m.referenciasProximas.length > 1).length])));
texto.push(tabla(['Archivo', 'Conjuntos / rectángulos de CUTTER', 'Techos vecinos (sin atribución)'], a.cortes.filter(c => materiales.some(m => m.fichero === fechaCorte(c))).map(c => {
  const ms = materiales.filter(m => m.fichero === fechaCorte(c)); return [fechaCorte(c), `${ms.length} / ${suma(ms.map(m => m.rectangulosDibujados))}`,
    unico(ms.map(m => m.techoVecino ?? '?')).join(', ')];
})));
texto.push('Solo se anota el techo vecino cuando es único en ese entorno: **no se atribuyen las piezas a esa referencia ni se aplica repetición**. Hay conjuntos junto a filas mixtas y rótulos de otras familias. El coordinador confirma que es otro material y que Iván lo especificará más adelante. El número dibujado no equivale a piezas por unidad; no queda demostrada esa cantidad ni la composición exacta del material.\n');
texto.push('## 9. Dibujos de confección para copiar a la web\n');
texto.push(`El script scripts/extraer-dibujos-assa.mjs entrega **${nf(Object.keys(dibujos).length)} referencias** en [dibujosConfeccion.json](../../src/assa/dibujosConfeccion.json), con mm, origen abajo a la izquierda y capas originales. Conserva líneas, arcos, textos, sus giros y anclajes; las flechas rellenas de las cotas se conservan por su contorno. No genera medidas nuevas. Las cantidades xN, cifras de línea, encabezados, stock y notas grandes del pedido se excluyen.\n`);
texto.push('La selección parte del rótulo y de los componentes conectados del contorno rosa (`referencias` / `referencia-1`), no de una franja recortada a mitad de camino hacia la fila vecina. Los componentes próximos se atribuyen al contorno más cercano. Una cota solo entra si sus dos puntos de referencia pertenecen a la geometría elegida y su dibujo expandido permanece cerca; se conserva el bloque completo de la cota para no perder sus textos o flechas. Las cotas con bloque visible desplazado lejos quedan fuera. Las vistas sin contorno rosa identificable se señalan.\n');
texto.push('Se prefiere la fecha más reciente del nombre de lote de 2026, incluida la preparación de enero con pedidos de 2025. En las variantes, el coordinador ha indicado que manda la plantilla: se da prioridad a una vista cuyo dibujo coincida con ella; en su defecto se conserva la más reciente de las que encajan geométricamente, con sus cotas y textos pendientes. **No es una aprobación de fabricación.** Se conserva «revisar variantes» y todas las apariciones quedan en tmp. La firma compara geometría relativa a 0,1 mm sin depender del orden de entidades ni del sentido de cada raya; la firma completa incluye cotas y rótulos.\n');
texto.push(tabla(['Familia', 'Referencias extraídas', 'Con forma repetida en varios lotes', 'Con distintas formas'], agrupa(Object.entries(dibujos), ([c]) => c.slice(0, 6))
  .map(([k, ds]) => [k, ds.length, ds.filter(([, d]) => d.lotesMismaForma > 1).length, ds.filter(([, d]) => d.variantesForma > 1).length])));
texto.push('Referencias con variantes detectadas. Estas diferencias pueden ser cambios de dibujo, marcas o distinta composición de la vista; no se presentan como cambios de medida aprobados.\n');
texto.push(tabla(['Referencia', 'Fuente elegida', 'Formas distintas', 'Lotes con la forma elegida / contrastados'], Object.entries(dibujos).filter(([, d]) => d.variantesForma > 1)
  .map(([c, d]) => [c, d.fuente, d.variantesForma, `${d.lotesMismaForma} / ${d.lotesContrastados}`])));
texto.push('**Contraste directo con COMBURSA (CRAWFORD).** Se ancla una raya larga del contorno rosa y se buscan todos los trazos en el maestro por capa y posición relativa, a 0,15 mm. Se permite trasladar, nunca girar ni escalar. También se cuentan los trazos del maestro que quedan dentro de la caja de esa vista y no están en ella. La coincidencia de forma se distingue de la del dibujo con cotas y textos: que los trazos encajen en esa caja no demuestra que no haya otra vista del mismo código fuera de ella. Los casos dudosos conservan su aviso.\n');
texto.push(tabla(['Referencia', 'Variante / fuente', 'Forma: faltan / extras', 'Dibujo: faltan / extras', 'Fuente elegida según plantilla'], plantillaVariantes.resultados.flatMap(r => r.formas.map((f, i) => [r.codigo,
  `${i + 1}: ${f.fuente}`, f.contraste ? `${f.contraste.faltanForma} / ${f.contraste.extrasForma}` : 'sin anclaje seguro',
  f.contraste ? `${f.contraste.faltanDibujo} / ${f.contraste.extrasDibujo}` : 'sin anclaje seguro', r.seleccion.fuente]))));
const sinTraza = Object.entries(dibujos).filter(([, d]) => !d.trazabilidadRps);
texto.push(tabla(['Referencia extraída sin cruce exacto del rótulo de pedido y cifra de hoja', 'Fuente (no se inventa una línea RPS)'], sinTraza.map(([c, d]) => [c, d.fuente])));
texto.push('Referencias con línea identificada en las hojas de oficina para las que no se ha podido entregar un dibujo:\n');
texto.push(tabla(['Referencia sin dibujo', 'Motivos guardados por el extractor'], variantes.sinDibujo.map(c => [c,
  unico(variantes.avisos.filter(v => v.codigo === c).map(v => v.motivo)).join('; ') || 'No hay un rótulo completo atribuible en la columna izquierda.'])));
texto.push('La revisión visual compara original y extracción de una referencia de cada una de las siete familias principales. Los PNG locales, a 1600 × 1000, se generan con `capturar.mjs`; no se ha arrancado la web. Las vistas se han inspeccionado y se ha corregido la pérdida inicial de cotas antes de emitir este catálogo.\n');
texto.push(tabla(['Familia', 'Captura original / extracción'], ['420102', '420148', '420150', '430125', '430127', '430129', '430172']
  .map(f => [f, `[PNG ${f}](../../tmp/assa-investigacion/confeccion-${f}.png)`])));
texto.push('## 10. Repetición y comprobaciones\n');
texto.push('No se han movido ni modificado las copias de origen, ni usado maqcorte, BOT/Pendientes o el servidor de producción. No hay dependencias nuevas. Se conservan SHA-256 y tamaños de todas las fuentes. El proceso escribe los resultados grandes en tmp; el único catálogo añadido a src es el solicitado después por el coordinador.\n');
texto.push('```powershell\nnode scripts/assa-investigacion/analizar.mjs\nnode scripts/assa-investigacion/profundizar.mjs\nnode scripts/extraer-dibujos-assa.mjs\nnode scripts/assa-investigacion/plantilla.mjs\nnode scripts/assa-investigacion/capturar.mjs\nnode scripts/assa-investigacion/informe.mjs\nnode scripts/assa-investigacion/verificar.mjs\nnode --test scripts/assa-investigacion/geometria.test.mjs scripts/assa-investigacion/dibujos.test.mjs\n```\n');
texto.push('Se pueden indicar otras copias con `ASSA_ESTUDIO`, `ASSA_RPS` y `ASSA_LOTES_OFICINA`. Las salidas grandes siguen en `tmp/assa-investigacion/` del repositorio. La extracción usa `analisis.json`, por lo que hay que repetir la secuencia en este orden si cambia la foto de entrada. Los PNG usan el Playwright ya instalado en el proyecto.\n');
texto.push(tabla(['Resultado local', 'Contenido'], [
  ['analisis.json', 'Fuentes, SHA-256, todos los textos, hojas, palets, filas, cuerpos y cruces por referencia'],
  ['pilas.json / uniones.json', 'Alturas, ocupación y parejas con raya central'], ['canalones.json / juegosCanalon.json', 'Caras, bloques, largos, posiciones, rótulos y repeticiones'],
  ['materiales.json', 'Cada conjunto 625 × 400, sus rótulos y el límite de atribución'], ['reparto.json', 'Candidatos de cada fila de palet y líneas identificadas'],
  ['dibujos-apariciones.json / dibujos-variantes.json', 'Todas las vistas de confección, firmas, avisos y referencias sin dibujo'],
  ['citas-rps.json / verificacion.json', 'Citas comprobadas, huellas de origen y condiciones del catálogo']
]));
texto.push('## 11. Dudas concretas para Iván o Tamara\n');
texto.push('1. Cuando la cifra del DWG y NumLine de RPS llevan referencias distintas, ¿es una renumeración de la hoja o un encabezado conservado de otro pedido? Las discrepancias comprobadas están en la tabla de la primera sección. La web necesita conservar NumLine real y, si procede, otra cifra de presentación.\n');
texto.push('2. ¿El palet de la previsión es siempre el palet de expedición, incluso cuando pone «se corta en palet…»? Hace falta conservar por separado destino y lugar del conjunto de corte si no coinciden.\n');
texto.push('3. Canalones: la duda sobre las cantidades queda contestada por Iván: la repetición la aplica el cortador en el bot y no se guarda en el DXF. Para implementar la web falta mostrar y conservar esa instrucción junto con el total del pedido; no se debe inventar una cantidad a partir de las caras dibujadas.\n');
texto.push('4. ¿Qué material exacto es «3 MM», de qué referencias son los 625 × 400 de cada fila mixta y cuántos se cortan por unidad? Los tres rectángulos de una plantilla no bastan para responder esa cuenta.\n');
texto.push('5. Las parejas con raya central también aparecen en varios techos. ¿Se envarillan de dos en dos igual que los laterales, o esa marca tiene otra función en esos casos? No se ha extendido la regla automáticamente.\n');
texto.push('6. Para una suelta de techo de fondo 600, ¿cuándo se conserva 691 y cuándo se usa 680? Ambas medidas se repiten; no sale una condición universal solo del número de alturas de esa suelta. ¿Se admite la excepción decimal que figura en la tabla?\n');
texto.push('7. ¿Se toma siempre como vigente el dibujo de confección del lote más reciente? Las referencias con cambios y las que no tienen dibujo quedan enumeradas; necesitan revisión de la versión, sin sustituirlas por una forma parecida.\n');
texto.push('8. ¿Qué ventana, formato y escala se imprimen del Modelo en el taller? Los archivos permiten copiar su contenido, pero no certificar la impresión que recibió el cortador.\n');
texto.push(`Las ${nf(plantillaVariantes.resultados.length)} referencias con variantes quedan abiertas para confirmar la vista completa. Cada enlace muestra sus variantes lado a lado y el recorte de plantilla contrastado:\n`);
for (const r of plantillaVariantes.resultados) texto.push(`- **${r.codigo}**: ${r.seleccion.criterio}; fuente elegida ${r.seleccion.fuente}. [Variantes y plantilla](../../tmp/assa-investigacion/variantes-${r.codigo}.png).\n`);
fs.writeFileSync(path.join(dir, 'citas-rps.json'), JSON.stringify(unico(citaLista.map(x => JSON.stringify(x))).map(x => JSON.parse(x)), null, 2) + '\n');
const informe = texto.join('\n');
fs.writeFileSync(path.join(repo, 'docs/modelos/assa-combursa-lotes.md'), informe);
const sha = contenido => crypto.createHash('sha256').update(contenido).digest('hex');
fs.writeFileSync(path.join(dir, 'informe-generacion.json'), JSON.stringify({ sha256: sha(informe),
  catalogoSha256: sha(fs.readFileSync(path.join(repo, 'src/assa/dibujosConfeccion.json'))),
  entradas: ['analisis', 'pilas', 'alturasContexto', 'uniones', 'canalones', 'juegosCanalon', 'materiales', 'reparto', 'dibujos-variantes', 'plantilla-variantes']
    .map(f => ({ fichero: `${f}.json`, sha256: sha(fs.readFileSync(path.join(dir, `${f}.json`))) })) }, null, 2) + '\n');
console.log(JSON.stringify({ informe: 'docs/modelos/assa-combursa-lotes.md', bytes: Buffer.byteLength(informe), citasRps: unico(citaLista.map(x => x.IDOrderLine)).length }));
