// Solo lee las copias locales del estudio. Escribe resultados derivados, nunca originales ni RPS.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { leerPlanoDxf } from './lib/plano-dxf.mjs';
import { codigoAssa, extraerPanos } from '../src/assa/leerCorte.js';
import { operacionesEnPano } from '../src/assa/comparar.js';
import { validarLineasLote } from '../src/assa/validarLotes.js';
import { calcularFamilia, generarProgramas } from '../src/assa/faseA.js';
import { canalonDe } from '../src/assa/canalon.js';
import { contrastarCanalon } from '../src/assa/contrastarCanalon.js';

const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const estudio = process.env.ASSA_ESTUDIO;
if (!estudio) throw new Error('Indica ASSA_ESTUDIO: carpeta local del estudio, que se trata solo en lectura.');
const salida = path.join(raiz, 'tmp/assa-fase-a');
fs.mkdirSync(salida, { recursive: true });
const leer = p => JSON.parse(fs.readFileSync(p, 'utf8'));
const rps = leer(process.env.ASSA_RPS || path.join(estudio, '../assa-fase1/rps.json'));
const excel = leer(path.join(estudio, 'excel.json'));
const terminados = {};
for (const hoja of excel.hojas) for (const f of hoja.filas) {
  const [variante, largo, ancho] = f.celdas.slice(8, 11);
  if (/^\d{4}$/.test(String(variante)) && typeof largo === 'number' && typeof ancho === 'number') terminados['420150-' + variante] = [largo * 10, ancho * 10];
}
const generar = l => {
  const g = calcularFamilia(l, { nkValidado: codigoAssa(l.CodArticle) === '420148-0105', terminadoMm: terminados[codigoAssa(l.CodArticle)] });
  return { ...g, programas: generarProgramas(g) };
};
const familias = ['420102', '420148', '420150', '430125', '430127', '430129', '430172'];
const archivos = [], programas = [];
const pruebasCanalon = [];
const fechasConCortes = new Set([2025, 2026].flatMap(anio => fs.readdirSync(path.join(estudio, 'cortes', String(anio)))
  .map(n => n.match(/^LOTE[\s_]*(\d{2})[-_](\d{2}).*\.dxf$/i)).filter(Boolean).map(m => `${anio}-${m[2]}-${m[1]}`)));
const claveDescripcion = l => `${codigoAssa(l.CodArticle)}|${String(l.descripcion).trim()}`;
const ultimaDescripcion = new Map([...Map.groupBy(rps.lineas.filter(l => fechasConCortes.has(l.entregaSolicitada)), claveDescripcion)]
  .map(([clave, ls]) => [clave, ls.map(l => l.entregaSolicitada).sort().at(-1)]));
const hash = b => crypto.createHash('sha256').update(b).digest('hex');
for (const anio of [2025, 2026]) {
  const carpeta = path.join(estudio, 'cortes', String(anio));
  for (const nombre of fs.readdirSync(carpeta).filter(n => /^LOTE.*\.dxf$/i.test(n)).sort()) {
    const m = nombre.match(/^LOTE[\s_]*(\d{2})[-_](\d{2})/i);
    if (!m) continue;
    const fecha = `${anio}-${m[2]}-${m[1]}`;
    if (Number.isNaN(Date.parse(fecha)) || new Date(fecha).toISOString().slice(0, 10) !== fecha) continue;
    const local = path.join(carpeta, nombre), sha256 = hash(fs.readFileSync(local));
    const modelo = leerPlanoDxf(local).modelo;
    archivos.push({ fichero: `${anio}/${nombre}`, fecha, sha256 });
    for (const g of extraerPanos(modelo).filter(g => familias.includes(g.codigo.slice(0, 6)))) programas.push({
      fichero: `${anio}/${nombre}`, sha256, fecha, codigo: g.codigo, rotulo: g.titulo.handle,
      repeticiones: g.repeticiones, panos: g.panos.map(p => ({ ...p, operaciones: operacionesEnPano(modelo, p.caja, p.uniones) })),
    });
    const juegos = new Map();
    // Un bloque igual en el último lote prueba también que existe al menos una muestra válida. No se exige que la
    // cantidad histórica sea la actual: en los cortes antiguos se preparaba stock de canalones.
    for (const l of rps.lineas.filter(l => l.entregaSolicitada === fecha && ultimaDescripcion.get(claveDescripcion(l)) === fecha &&
      /^430(?:127|129|172)-/.test(codigoAssa(l.CodArticle) ?? ''))) {
      const g = generar(l), juego = canalonDe(g.codigo, g.medidas.NB);
      const clave = JSON.stringify(juego);
      if (!juegos.has(clave)) juegos.set(clave, contrastarCanalon(modelo, juego));
      pruebasCanalon.push({ codigo: g.codigo, fecha, fichero: `${anio}/${nombre}`, sha256, ...juegos.get(clave) });
    }
    if (archivos.length % 10 === 0) console.log(`Leídos ${archivos.length} DXF; ${programas.length} grupos de paños.`);
  }
}
const fechas = new Set(archivos.map(a => a.fecha));
const lineas = rps.lineas.filter(l => familias.includes(codigoAssa(l.CodArticle)?.slice(0, 6)) && fechas.has(l.entregaSolicitada));
const filas = validarLineasLote(lineas, programas, { generar });
// Catálogo pequeño de descripciones medidas: la interfaz nunca recibe todo el histórico.
const referencias = {};
for (const [codigo, ls] of Map.groupBy(lineas, l => codigoAssa(l.CodArticle))) {
  const validaciones = filas.filter(f => codigoAssa(f.referencia) === codigo);
  const descripciones = [...Map.groupBy(ls, l => String(l.descripcion).trim()).entries()].map(([descripcion, grupo]) => {
    const ids = new Set(grupo.map(l => l.IDOrderLine));
    const fs = validaciones.filter(f => ids.has(f.linea));
    const g = generar(grupo[0]);
    const ultimaFecha = fs.at(-1)?.fecha;
    const ultimas = fs.filter(f => f.fecha === ultimaFecha);
    const canales = pruebasCanalon.filter(p => p.codigo === codigo);
    const ultimosCanales = canales.filter(p => p.fecha === ultimaFecha);
    const unidos = programas.filter(p => p.codigo === codigo && p.panos.some(p => p.uniones.length &&
      Math.abs(p.medidasMm[0] - g.pieza?.medidasMm[0]) <= 1));
    return { descripcion, corteMm: g.pieza?.medidasMm ?? null, lineas: fs.length,
      cuadran: fs.filter(f => f.coincide).length, geometria: fs.filter(f => f.geometria).length,
      // Se exige que el último lote comparable cuadre en toda la geometría.
      ultimaFecha, ultimaGeometria: ultimas.length > 0 && ultimas.every(f => f.geometria &&
        f.motivos.every(m => m.startsWith('Cantidad agrupada:'))),
      nkValidado: codigo === '420148-0105' && fs.some(f => f.geometria),
      unidos: /^430(?:125|127|129)-/.test(codigo) && unidos.length > 0,
      pruebasUnidos: /^430/.test(codigo) ? unidos.map(p => ({ fichero: p.fichero, sha256: p.sha256, rotulo: p.rotulo })) : undefined,
      canalonValidado: canales.some(p => p.coincide) && ultimosCanales.length > 0 && ultimosCanales.every(p => p.coincide),
      terminadoMm: terminados[codigo] ?? null };
  });
  const fechas = Object.fromEntries([...Map.groupBy(validaciones, f => f.fecha)].map(([fecha, fs]) => [fecha, {
    coincide: fs.every(f => f.coincide), cantidad: fs[0].cantidadRpsAgrupada,
    // La forma de todos sus paños igual; la cantidad del lote real puede ser menor por el stock (Q-AS03).
    forma: fs.every(f => f.geometria && f.motivos.every(m => m.startsWith('Cantidad agrupada:'))),
    motivos: [...new Set(fs.flatMap(f => f.motivos))],
  }]));
  referencias[codigo] = { descripciones, fechas };
}
const cotejo = leer(path.join(estudio, 'modelos-cotejo.json'));
const canalones = [...Map.groupBy(cotejo.filas.filter(f => f.codigo.startsWith('420150-') && !f.asignacionDudosa), f => f.codigo)]
  .map(([codigo, fs]) => ({ codigo, lotes: new Set(fs.map(f => f.anio + '/' + f.lote)).size,
    largosMm: [...new Set(fs.flatMap(f => f.medidasCorte.filter(m => Math.abs(m[1] - 180) < .1 && m[0] > 500).map(m => m[0])))].sort((a, b) => a - b),
    cantidadPorCubierta: null, motivo: 'Pendiente confirmar si un entero y dos mitades corresponden a una cubierta o a tres paños.' }));
const resumen = familias.map(familia => {
  const fs = filas.filter(f => codigoAssa(f.referencia)?.startsWith(familia));
  return { familia, lineas: fs.length, cuadran: fs.filter(f => f.coincide).length, geometria: fs.filter(f => f.geometria).length,
    porcentaje: fs.length ? 100 * fs.filter(f => f.coincide).length / fs.length : 0 };
});
const informe = { rpsRecogido: rps.recogido, archivos, resumen, canalones, pruebasCanalon, filas };
fs.writeFileSync(path.join(salida, 'validacion.json'), JSON.stringify(informe, null, 2) + '\n');
const catalogo = { version: 1, rpsRecogido: rps.recogido, referencias };
if (process.argv.includes('--catalogo')) fs.writeFileSync(path.join(raiz, 'src/assa/validacionCatalogo.json'), JSON.stringify(catalogo, null, 2) + '\n');
const celda = v => String(v ?? '—').replaceAll('|', '\\|').replaceAll('\n', ' ');
const tabla = (cabecera, filas) => [cabecera, cabecera.map(() => '---'), ...filas].map(f => '| ' + f.map(celda).join(' | ') + ' |').join('\n');
const inicio = '<!-- INICIO ASSA FASE A -->', fin = '<!-- FIN ASSA FASE A -->';
const llevaCanalon = codigo => /^(?:420150|430127|430129|430172)-/.test(codigo);
const habilitada = (codigo, p) => p.geometria > 0 && p.ultimaGeometria &&
  (!llevaCanalon(codigo) || codigo.startsWith('420150') || p.canalonValidado);
const nuevas = Object.entries(referencias).filter(([codigo]) => codigo.startsWith('430'));
const habilitadas = familias.map(familia => ({ familia, codigos: Object.entries(referencias)
  .filter(([codigo, r]) => codigo.startsWith(familia) && r.descripciones.some(p => habilitada(codigo, p)))
  .map(([codigo]) => codigo).sort() }));
const retenidas = nuevas.filter(([codigo, r]) => !r.descripciones.some(p => habilitada(codigo, p))).map(([codigo, r]) => {
  const ultimas = filas.filter(f => codigoAssa(f.referencia) === codigo && r.descripciones.some(p =>
    p.descripcion === String(f.descripcion).trim() && p.ultimaFecha === f.fecha));
  const motivos = [...new Set(ultimas.flatMap(f => [...f.motivos.filter(m => !m.startsWith('Cantidad agrupada:')),
    ...f.comprobaciones.flatMap(c => c.diferencias.filter(d => d.includes('duplicados')))]))];
  if (llevaCanalon(codigo) && !r.descripciones.some(p => p.canalonValidado)) motivos.push('Sin combinado de canalón igual a la plantilla en su último lote comparable.');
  return [codigo, [...new Set(ultimas.map(f => f.fecha))].join(' / '), motivos.join(' ') || 'Sin forma completa vigente.'];
});
const parejas = nuevas.filter(([codigo, r]) => r.descripciones.some(p => habilitada(codigo, p) && p.unidos))
  .map(([codigo, r]) => [codigo, [...new Set(r.descripciones.flatMap(p => p.pruebasUnidos?.map(u => u.fichero) ?? []))].join(' / ')]);
const otras = [...Map.groupBy(rps.lineas.filter(l => l.entregaSolicitada === '2026-10-31' &&
  !familias.includes(codigoAssa(l.CodArticle)?.slice(0, 6))), l => codigoAssa(l.CodArticle)?.slice(0, 6) ?? 'Sin código de pieza')]
  .map(([familia, ls]) => [familia, ls.length, ls.reduce((s, l) => s + l.cantidad, 0), 'A mano: sin regla completa contrastada.']);
const ampliacion = `\n### Familias y referencias habilitadas tras ampliar los techos\n\nTabla calculada del catálogo, sin listas de autorización escritas a mano. Cada descripción habilitada tiene alguna muestra igual y toda la forma igual en su último lote comparable. Un lote histórico con diferencias propias sigue retenido. Los canalones nuevos exigen además un combinado completo igual a la plantilla en el último lote: cada tramo, pestaña, marca y herramienta dentro de ±1 mm.\n\n${tabla(['Familia', 'Referencias habilitadas', 'Códigos'], habilitadas.map(h => [h.familia, h.codigos.length, h.codigos.join(', ')]))}\n\nEl techo usa NB + 53 por NT + 91 mm de corte y NB + 3 por NT + 25 mm terminado. Las anotaciones NB+3 / NT+25 de RPS no se suman dos veces. Solo los programas de tres alturas de NT600 pasan a 680; las sueltas y pilas de dos salen a 691. Al reducir, agujeros y marcas mantienen su tamaño y se centran. El contraste reconoce las alturas históricas 680 y 691, incluso las sueltas antiguas de 680; eso no cambia la regla del programa nuevo. La 430172 usa NB + 2NH + 10 por NT + 66 mm, con sus operaciones propias copiadas de la plantilla y contrastadas por referencia.\n\n### Parejas de techo comprobadas\n\n${tabla(['Referencia habilitada', 'Cortes que prueban la unión con el largo correcto'], parejas)}\n\nLa marca de 430127-0001 en el lote del 01-02-2025 no autoriza una pareja de techo: cada mitad mide 3010, incompatible con su NB y la fórmula del techo. No se propaga una unión solo por el nombre de familia.\n\n### Canalones nuevos\n\nLa extracción reproducible está en \`scripts/extraer-geometrias-assa.mjs\`; \`geometriasPlantilla.json\` conserva el SHA-256 del original. En la 430172, la caída medida es 140 mm, alto 400 y paso 520: cuatro enteros y tres parejas por combinado, siete canalones, con 1960 mm ocupados. La 430129 tiene otra pendiente y otro alto, medidos en cada referencia; no hereda los de la envolvente. Las de 600 conservan el bloque de ocho enteros y siete parejas. Se generan combinados completos y una pila con el resto, un canalón por unidad y por palet, sin stock añadido. El papel del cortador sale de esos mismos programas y separa juegos de igual largo con pendientes distintas.\n\n### Referencias nuevas que siguen a mano\n\n${tabla(['Referencia', 'Último lote comparable', 'Motivo comprobado'], retenidas)}\n\nLos recorridos duplicados se retienen con el mismo criterio de las tres familias anteriores: una distancia geométrica casi nula no elimina una pasada repetida de herramienta. No se han borrado duplicados de los originales ni relajado esa comprobación para habilitar más referencias.\n\n### Otras familias del 31-10\n\n${tabla(['Familia', 'Líneas', 'Unidades pedidas', 'Estado'], otras)}\n\nLa lona CUTTER 625 × 400 «3 MM» sigue a mano hasta que Iván especifique sus referencias y cantidades. No se convierte en un accesorio por contar los rectángulos de una plantilla.\n`;
const bloque = `${inicio}\n## Fase A: contraste reproducible de las tres familias\n\nGenerado por \`scripts/validar-assa-fase-a.mjs\`. Foto de RPS: ${rps.recogido}. Se contrastan ${archivos.length} DXF locales de 2025 y 2026, sin modificar los originales. Se exige cantidad exacta por referencia y fecha, operaciones por herramienta y geometría de todos los paños identificados, ±1 mm y orillo abierto. Los casos sin coincidencia quedan a mano. El detalle por línea, los motivos y SHA-256 quedan en \`tmp/assa-fase-a/validacion.json\`.\n\n${tabla(['Familia', 'Líneas', 'Paño y cantidad iguales', '%', 'Toda la geometría igual'], resumen.map(r => [r.familia, r.lineas, r.cuadran, r.porcentaje.toLocaleString('es-ES', { maximumFractionDigits: 1 }) + ' %', r.geometria]))}\n\nLa columna 420150 certifica **paños**; los canalones van aparte, en los bloques de la plantilla (un canalón por unidad). NK solo se considera candidato a NH para 420148-0105 y exige el mismo contraste geométrico; las demás referencias NK se retienen. NW equivale a NB por respuesta de Iván del 27/10/2026. Las descripciones recortadas de 420150 se recuperan de la hoja de medidas de producción autorizada, con aviso visible. No se completa stock automáticamente.\n\n### NK contrastado en la 420148-0105\n\n${tabla(['Referencia', 'Líneas RPS', 'Geometría y orillo iguales', 'Paño y cantidad iguales'], [['420148-0105', ...[filas.filter(f => codigoAssa(f.referencia) === '420148-0105')].flatMap(fs => [fs.length, fs.filter(f => f.geometria).length, fs.filter(f => f.coincide).length])]])}\n\nLa equivalencia NK = NH se limita a esta referencia y descripción contrastadas; no autoriza otras NK. El 31-10 sigue a mano al no probarse su orillo abierto.\n\n### Canalones: largos medidos por referencia\n\n${tabla(['Referencia', 'Lotes con contorno asignable', 'Largos reales mm', 'Cantidad por cubierta'], canalones.map(c => [c.codigo, c.lotes, c.largosMm.join(' / '), 'Un canalón por unidad']))}\n\nSon medidas observadas, no una regla NB más un margen común: 0090 tiene 3610/1805, 0002 tiene 3600/1800 y 0133 comparte el paño de 0090 pero usa 3600/1800 en el lote del 26-09. No se suman vistas ni se deduce la cantidad por cubierta del número de caras cerradas del DXF. Los canalones conservan DISCO2 donde aparece en el original, además de DISCO1, según la decisión del 27/10/2026. Desde el 28/10/2026 el lote los corta en los bloques de la plantilla, un canalón por unidad (src/assa/canalon.js); sin juego para su NB, la línea va a mano (CANALON_SIN_PLANTILLA).\n\n### Repetir sin copiar los datos grandes\n\n\`ASSA_ESTUDIO=<ruta absoluta>/tmp/assa-estudio ASSA_RPS=<ruta absoluta>/tmp/assa-fase1/rps.json node scripts/validar-assa-fase-a.mjs --catalogo --informe\`\n\nSolo \`--informe\` sustituye este bloque y solo \`--catalogo\` actualiza el catálogo pequeño de descripciones contrastadas. El resto de resultados se escribe en tmp de este repositorio.\n${fin}`;
if (process.argv.includes('--informe')) {
  const ruta = path.join(raiz, 'docs/modelos/assa-combursa.md'), doc = fs.readFileSync(ruta, 'utf8');
  const actualizado = bloque.replace('contraste reproducible de las tres familias', 'contraste reproducible de las siete familias')
    .replace(fin, ampliacion + fin);
  const nuevo = doc.includes(inicio) ? doc.slice(0, doc.indexOf(inicio)) + actualizado + doc.slice(doc.indexOf(fin) + fin.length) : doc + '\n\n' + actualizado + '\n';
  fs.writeFileSync(ruta, doc.includes('\r\n') ? nuevo.replace(/\r?\n/g, '\r\n') : nuevo);
}
console.log(JSON.stringify({ resumen, nk0105: filas.filter(f => codigoAssa(f.referencia) === '420148-0105').reduce((s, f) => ({ lineas: s.lineas + 1, geometria: s.geometria + Number(f.geometria), cuadran: s.cuadran + Number(f.coincide) }), { lineas: 0, geometria: 0, cuadran: 0 }), salida }, null, 2));
