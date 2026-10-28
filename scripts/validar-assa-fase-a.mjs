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
const familias = ['420102', '420148', '420150'];
const archivos = [], programas = [];
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
    return { descripcion, corteMm: g.pieza?.medidasMm ?? null, lineas: fs.length,
      cuadran: fs.filter(f => f.coincide).length, geometria: fs.filter(f => f.geometria).length,
      // Se exige que el último lote comparable cuadre en toda la geometría.
      ultimaFecha, ultimaGeometria: ultimas.length > 0 && ultimas.every(f => f.geometria &&
        f.motivos.every(m => m.startsWith('Cantidad agrupada:'))),
      nkValidado: codigo === '420148-0105' && fs.some(f => f.geometria),
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
const informe = { rpsRecogido: rps.recogido, archivos, resumen, canalones, filas };
fs.writeFileSync(path.join(salida, 'validacion.json'), JSON.stringify(informe, null, 2) + '\n');
const catalogo = { version: 1, rpsRecogido: rps.recogido, referencias };
if (process.argv.includes('--catalogo')) fs.writeFileSync(path.join(raiz, 'src/assa/validacionCatalogo.json'), JSON.stringify(catalogo, null, 2) + '\n');
const celda = v => String(v ?? '—').replaceAll('|', '\\|').replaceAll('\n', ' ');
const tabla = (cabecera, filas) => [cabecera, cabecera.map(() => '---'), ...filas].map(f => '| ' + f.map(celda).join(' | ') + ' |').join('\n');
const inicio = '<!-- INICIO ASSA FASE A -->', fin = '<!-- FIN ASSA FASE A -->';
const bloque = `${inicio}\n## Fase A: contraste reproducible de las tres familias\n\nGenerado por \`scripts/validar-assa-fase-a.mjs\`. Foto de RPS: ${rps.recogido}. Se contrastan ${archivos.length} DXF locales de 2025 y 2026, sin modificar los originales. Se exige cantidad exacta por referencia y fecha, operaciones por herramienta y geometría de todos los paños identificados, ±1 mm y orillo abierto. Los casos sin coincidencia quedan a mano. El detalle por línea, los motivos y SHA-256 quedan en \`tmp/assa-fase-a/validacion.json\`.\n\n${tabla(['Familia', 'Líneas', 'Paño y cantidad iguales', '%', 'Toda la geometría igual'], resumen.map(r => [r.familia, r.lineas, r.cuadran, r.porcentaje.toLocaleString('es-ES', { maximumFractionDigits: 1 }) + ' %', r.geometria]))}\n\nLa columna 420150 certifica **paños**; los canalones van aparte, en los bloques de la plantilla (un canalón por unidad). NK solo se considera candidato a NH para 420148-0105 y exige el mismo contraste geométrico; las demás referencias NK se retienen. NW equivale a NB por respuesta de Iván del 27/10/2026. Las descripciones recortadas de 420150 se recuperan de la hoja de medidas de producción autorizada, con aviso visible. No se completa stock automáticamente.\n\n### NK contrastado en la 420148-0105\n\n${tabla(['Referencia', 'Líneas RPS', 'Geometría y orillo iguales', 'Paño y cantidad iguales'], [['420148-0105', ...[filas.filter(f => codigoAssa(f.referencia) === '420148-0105')].flatMap(fs => [fs.length, fs.filter(f => f.geometria).length, fs.filter(f => f.coincide).length])]])}\n\nLa equivalencia NK = NH se limita a esta referencia y descripción contrastadas; no autoriza otras NK. El 31-10 sigue a mano al no probarse su orillo abierto.\n\n### Canalones: largos medidos por referencia\n\n${tabla(['Referencia', 'Lotes con contorno asignable', 'Largos reales mm', 'Cantidad por cubierta'], canalones.map(c => [c.codigo, c.lotes, c.largosMm.join(' / '), 'Un canalón por unidad']))}\n\nSon medidas observadas, no una regla NB más un margen común: 0090 tiene 3610/1805, 0002 tiene 3600/1800 y 0133 comparte el paño de 0090 pero usa 3600/1800 en el lote del 26-09. No se suman vistas ni se deduce la cantidad por cubierta del número de caras cerradas del DXF. Los canalones conservan DISCO2 donde aparece en el original, además de DISCO1, según la decisión del 27/10/2026. Desde el 28/10/2026 el lote los corta en los bloques de la plantilla, un canalón por unidad (src/assa/canalon.js); sin juego para su NB, la línea va a mano (CANALON_SIN_PLANTILLA).\n\n### Repetir sin copiar los datos grandes\n\n\`ASSA_ESTUDIO=<ruta absoluta>/tmp/assa-estudio ASSA_RPS=<ruta absoluta>/tmp/assa-fase1/rps.json node scripts/validar-assa-fase-a.mjs --catalogo --informe\`\n\nSolo \`--informe\` sustituye este bloque y solo \`--catalogo\` actualiza el catálogo pequeño de descripciones contrastadas. El resto de resultados se escribe en tmp de este repositorio.\n${fin}`;
if (process.argv.includes('--informe')) {
  const ruta = path.join(raiz, 'docs/modelos/assa-combursa.md'), doc = fs.readFileSync(ruta, 'utf8');
  const nuevo = doc.includes(inicio) ? doc.slice(0, doc.indexOf(inicio)) + bloque + doc.slice(doc.indexOf(fin) + fin.length) : doc + '\n\n' + bloque + '\n';
  fs.writeFileSync(ruta, doc.includes('\r\n') ? nuevo.replace(/\r?\n/g, '\r\n') : nuevo);
}
console.log(JSON.stringify({ resumen, nk0105: filas.filter(f => codigoAssa(f.referencia) === '420148-0105').reduce((s, f) => ({ lineas: s.lineas + 1, geometria: s.geometria + Number(f.geometria), cuadran: s.cuadran + Number(f.coincide) }), { lineas: 0, geometria: 0, cuadran: 0 }), salida }, null, 2));
