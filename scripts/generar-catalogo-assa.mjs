// Lee las copias locales; los DXF se convierten con ODA conservando la ruta relativa de cada DWG.
import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import ExcelJS from 'exceljs';
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs';
import { leerCmt } from '../src/cmt/binario.ts';
import { MATERIAL_COMBURSA } from '../src/assa/faseA.js';
import { leerPlanoDxf, cajaPrimitiva } from './lib/plano-dxf.mjs';
import { extraerGeometriasAssa } from './extraer-geometrias-assa.mjs';
import { extraerCanalones420150 } from './extraer-canalones-assa.mjs';
import { asignarRotulos, codigos, contornosCerrados, esCorte, piezasExteriores } from './assa-investigacion/modelos-reglas.mjs';
import { entidadesMm, firmaEntidades } from './assa-investigacion/dibujos.mjs';
import { dentro, unico } from './assa-investigacion/geometria.mjs';

const raiz = fileURLToPath(new URL('../', import.meta.url));
const base = path.join(raiz, 'tmp/combursa-catalogo');
const modelos = path.join(base, 'modelos');
const maestros = /^COMBURSA \(CRAWFORD\)(?:2)?\.dwg$/i;
const familiasPlastel = /^(?:420102|420148|420150|430125|430127|430129|430172)-/;
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const fechas = {};
const referencias = {};
const fuentes = {};
const geometria = {};
const referencia = codigo => referencias[codigo] ??= { fuentes: {}, cuerpos: {}, canalones: [], medidasTerminadas: [] };
const evidencia = (codigo, ruta) => referencia(codigo).fuentes[ruta] ??= {};

async function leerDibujo(ruta, fuente) {
  const local = path.join(base, 'dxf', ruta.replace(/\.dwg$/i, '.dxf'));
  fuente.sha256Dxf = sha(await fs.readFile(local));
  const plano = leerPlanoDxf(local);
  const modelo = plano.modelo.filter(p => !p.deCota);
  const textos = modelo.filter(p => p.tipo === 'texto');
  const cotas = modelo.filter(p => p.tipo === 'cota' && p.a && p.b);
  const titulos = textos.filter(t => codigos(t.valor).length);
  const esquemas = piezasExteriores(contornosCerrados(modelo));
  const vinculos = asignarRotulos(esquemas, titulos).filter(a => a.codigos.length);
  const dibujos = modelo.filter(p => ['raya', 'arco', 'texto', 'relleno'].includes(p.tipo))
    .map(p => ({ p, caja: cajaPrimitiva(p) }));
  for (const t of titulos) for (const codigo of codigos(t.valor)) {
    const aparicion = evidencia(codigo, ruta);
    (aparicion.rotulos ??= []).push({ id: t.handle, texto: t.valor, capa: t.capa, punto: t.punto });
  }
  for (const a of vinculos) {
    const p = esquemas[a.pieza];
    // Las presentaciones con un marco que contiene muchos dibujos no identifican un despiece.
    const es = dibujos.filter(({ caja: b }) => dentro([b.x0, b.y0], p.caja, 1e-7) && dentro([b.x1, b.y1], p.caja, 1e-7));
    const marco = es.some(({ p: e }) => e.tipo === 'texto' && codigos(e.valor).some(c => !a.codigos.includes(c)));
    const cotasPieza = cotas.filter(c => dentro(c.a, p.caja, .025) && dentro(c.b, p.caja, .025))
      .map(c => ({ id: c.handle, medida: c.medida, texto: c.valor, estilo: c.estilo }));
    let firma = null;
    if (!marco && es.length < 20000) {
      const elementos = unico([...p.segmentos, ...es.map(({ p: e }) => e)]);
      firma = firmaEntidades(elementos);
      geometria[firma] ??= entidadesMm(elementos).entidades;
    }
    for (const codigo of a.codigos) {
      const v = evidencia(codigo, ruta);
      (v.piezas ??= []).push({ firma, rotulos: unico(a.rotulos.map(t => t.handle)), estado: a.estado,
        medidasDibujoMm: p.medidasMm, capas: p.capas, origenMetros: [p.caja.x0, p.caja.y0], ...(cotasPieza.length ? { cotas: cotasPieza } : {}),
        ...(!firma ? { aviso: 'El contorno abarca varios dibujos o una presentación completa.' } : {}) });
    }
  }
  // Los bloques sin insertar y las presentaciones pueden contener nombres sin un paño asignable.
  for (const [bloque, registros] of [[null, plano.entidades], ...[...plano.bloques].map(([nombre, b]) => [nombre, b.entidades])]) {
    for (const e of registros) {
      if (['POLYLINE', 'ELLIPSE', 'REGION', '3DFACE'].includes(e.tipo) && esCorte({ capa: e.pares.find(([id]) => id === 8)?.[1] })) {
        (fuente.entidadesDeCorteNoInterpretadas ??= []).push({ tipo: e.tipo, id: e.pares.find(([id]) => id === 5)?.[1], bloque });
      }
      if (!['TEXT', 'MTEXT', 'ATTRIB', 'ATTDEF', 'INSERT'].includes(e.tipo)) continue;
      const texto = e.pares.filter(([id]) => [1, 2, 3].includes(id)).map(([, valor]) => valor).join(' ');
      for (const codigo of codigos(texto)) {
        const v = evidencia(codigo, ruta);
        if (bloque && !(v.bloques ??= []).includes(bloque)) v.bloques.push(bloque);
      }
    }
  }
  if (!maestros.test(ruta)) return;
  const cerrados = vinculos.filter(a => a.estado === 'vinculo-unico' && a.codigos.length === 1)
    .map(a => ({ codigo: a.codigos[0], rotulo: a.rotulos[0]?.handle, pieza: esquemas[a.pieza] }));
  const { vistas, canalones, bloques } = extraerGeometriasAssa(modelo, cerrados);
  for (const [codigo, cuerpos] of Object.entries(vistas)) {
    referencia(codigo).cuerpos[ruta] = cuerpos;
  }
  const consecutivos = new Map();
  for (const bloque of bloques) {
    const i = consecutivos.get(bloque.codigo) ?? 0;
    consecutivos.set(bloque.codigo, i + 1);
    const juego = canalones[bloque.codigo][i];
    const parcial = bloque.codigo.startsWith('420150-') && bloque.pestañas.some(n => n < 8);
    referencia(bloque.codigo).canalones.push({ ruta, rotulo: bloque.rotulo, caja: bloque.caja, juego,
      ...(parcial ? { parcial: true } : {}) });
  }
  const { largos } = extraerCanalones420150(modelo);
  for (const [codigo, juegos] of Object.entries(largos)) {
    const ref = referencia(codigo);
    for (const juego of juegos) {
      if (!ref.canalones.some(c => c.ruta === ruta && !c.parcial && c.juego.mitad === juego.mitad)) {
        ref.canalones.push({ ruta, juego, porPatron: true });
      }
    }
  }
}

async function leerMedidas(local, ruta) {
  const libro = new ExcelJS.Workbook();
  await libro.xlsx.readFile(local);
  for (const hoja of libro.worksheets) {
    for (let col = 1; col <= hoja.columnCount; col += 4) {
      let familia;
      for (let fila = 2; fila <= hoja.rowCount; fila++) {
        const c = hoja.getCell(fila, col), variante = c.text.trim();
        const cabecera = variante.match(/^(?:H?[0O]K)(4\d{5})$/i)?.[1];
        if (cabecera) { familia = cabecera; continue; }
        const cod = codigos(variante)[0] ?? (familia && /^\d{4}$/.test(variante) ? `${familia}-${variante}` : null);
        const largo = hoja.getCell(fila, col + 1).value, ancho = hoja.getCell(fila, col + 2).value;
        if (!cod || typeof largo !== 'number' || typeof ancho !== 'number' || largo <= 0 || ancho <= 0) continue;
        evidencia(cod, ruta);
        referencia(cod).medidasTerminadas.push({ ruta, hoja: hoja.name, celda: c.address, mm: [largo * 10, ancho * 10].map(n => Math.round(n * 1000) / 1000) });
      }
    }
  }
}

async function leerPdf(bytes, ruta) {
  const tarea = getDocument({ data: new Uint8Array(bytes), useSystemFonts: false, verbosity: 0 });
  try {
    const doc = await tarea.promise;
    for (let pagina = 1; pagina <= doc.numPages; pagina++) {
      const contenido = await (await doc.getPage(pagina)).getTextContent();
      const texto = contenido.items.map(t => t.str ?? '').join(' ');
      for (const codigo of codigos(texto)) (evidencia(codigo, ruta).paginas ??= []).push(pagina);
    }
  } finally {
    await tarea.destroy();
  }
}

for (const entrada of (await fs.readdir(modelos, { recursive: true, withFileTypes: true }))
  .filter(e => e.isFile() && /\.(?:dwg|pdf|xlsx|cmt)$/i.test(e.name))
  .sort((a, b) => path.join(a.parentPath, a.name).localeCompare(path.join(b.parentPath, b.name), 'es'))) {
  const local = path.join(entrada.parentPath, entrada.name), ruta = path.relative(modelos, local).replaceAll(path.sep, '/');
  const bytes = await fs.readFile(local), { mtime } = await fs.stat(local);
  const formato = path.extname(ruta).toLowerCase();
  const fuente = fuentes[ruta] = { sha256: sha(bytes), modificado: mtime.toISOString() };
  for (const codigo of codigos(entrada.name)) evidencia(codigo, ruta).nombre = true;
  if (formato === '.dwg') {
    console.log(ruta);
    await leerDibujo(ruta, fuente);
    if (maestros.test(ruta)) fechas[ruta] = fuente.modificado;
  } else if (formato === '.xlsx') {
    await leerMedidas(local, ruta);
  } else if (formato === '.pdf') {
    try { await leerPdf(bytes, ruta); }
    catch (error) { fuente.aviso = `Texto PDF sin leer: ${error.message}`; }
  } else {
    for (const codigo of codigos(bytes.toString('latin1'))) evidencia(codigo, ruta).textoCmt = true;
    try { fuente.herramientas = unico(leerCmt(bytes).objects.map(o => o.tool)).sort(); }
    catch (error) { fuente.aviso = `CMT antiguo sin interpretar: ${error.message}`; }
  }
}

for (const [codigo, ref] of Object.entries(referencias)) {
  ref.materialBase = familiasPlastel.test(codigo) ? { ...MATERIAL_COMBURSA, fuente: 'docs/modelos/assa-combursa.md' } : null;
}

const ordenar = o => Object.fromEntries(Object.entries(o).sort(([a], [b]) => a.localeCompare(b, 'es')));
const tabla = o => '{\n' + Object.entries(ordenar(o)).map(([k, v]) => `    ${JSON.stringify(k)}: ${JSON.stringify(v)}`).join(',\n') + '\n  }';
const catalogo = `{\n  "version": 1,\n  "plantillasCorte": ${tabla(fechas)},\n  "fuentes": ${tabla(fuentes)},\n  "referencias": ${tabla(referencias)},\n  "geometria": ${tabla(geometria)}\n}\n`;
const salida = process.argv.includes('--catalogo') ? path.join(raiz, 'src/assa/catalogoModelos.json') : path.join(base, 'catalogoModelos.json');
await fs.writeFile(salida, catalogo);
console.log(`${Object.keys(referencias).length} referencias, ${Object.keys(fuentes).length} fuentes, ${Object.keys(geometria).length} geometrías.`);
