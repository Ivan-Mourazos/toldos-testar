import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs';
import { extractReviewPackageFromPdf } from '../src/workflow.js';

// Reutiliza los pedidos de la matriz para comprobar también el registro de envíos sobre sus PDF.
const base = 'http://127.0.0.1:4314';
const raiz = path.resolve('tmp/ui-audit/flujo-editable-fase3/instancia');
const casos = JSON.parse(await fs.readFile('tmp/ui-audit/flujo-editable-fase3/resultados.json', 'utf8'));
assert.equal(casos.length, 12, 'Primero debe completarse la matriz de entregas');
const salud = await fetch(`${base}/api/health`).then(r => r.json());
assert.equal(salud.simulationMode, true); assert.equal(salud.fileWritesEnabled, false);
const settings = (await fetch(`${base}/api/workflow/settings`).then(r => r.json())).settings;
for (const [clave, ruta] of Object.entries(settings)) if (clave.endsWith('Directory') && ruta) assert.ok(path.resolve(ruta).startsWith(raiz + path.sep));
const configurar = productionEnabled => fetch(`${base}/api/workflow/settings`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...settings, productionEnabled }) });
async function paginas(ruta) {
  assert.ok(path.resolve(ruta).startsWith(raiz + path.sep));
  const tarea = getDocument({ data: new Uint8Array(await fs.readFile(ruta)) });
  const doc = await tarea.promise;
  try {
    const resultado = [];
    for (let i = 1; i <= doc.numPages; i++) resultado.push((await (await doc.getPage(i)).getTextContent()).items.map(t => t.str || '').join(''));
    return resultado;
  } finally { await tarea.destroy(); }
}
let pdfComprobados = 0, registros = 0;
try {
  assert.equal((await configurar(true)).status, 200);
  for (const caso of casos) {
    for (const f of caso.entregas[1].archivos.filter(f => f.type === 'pdf')) {
      const texto = (await paginas(f.savedPath)).join('');
      assert.ok(texto.includes(caso.entregas[1].ofs[0]));
      assert.ok(!texto.includes(caso.entregas[0].ofs[0]));
      pdfComprobados++;
    }
    if (caso.tipo !== 'toldos') continue;
    const ruta = `/api/reviews/${caso.codigo}`;
    const pedido = await fetch(base + ruta).then(r => r.json());
    const anteriores = await Promise.all(pedido.entregas.flatMap(e => e.archivos).map(async f => {
      const ruta = f.archivedFilename ? path.join(settings.planteamientosDirectory, f.archivedFilename) : f.savedPath;
      return { ruta, bytes: await fs.readFile(ruta) };
    }));
    const r = await fetch(`${base}${ruta}/corte-lona/enviar`, { method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ usuario: 'IVÁN', destino: 'dxfs', confirmOverwrite: true, aceptarCambioCorte: true }) });
    const datos = await r.json(); assert.equal(r.status, 200, JSON.stringify(datos));
    const anual = path.join(settings.reviewDirectory, `${caso.codigo}.pdf`);
    const definitivo = pedido.production.files.find(f => f.type === 'pdf').savedPath;
    assert.deepEqual(await paginas(anual), await paginas(definitivo), 'El registro conserva las páginas y las presentaciones de esta entrega');
    const recuperado = await extractReviewPackageFromPdf(await fs.readFile(anual));
    assert.deepEqual(recuperado.enviosCorte, datos.enviosCorte, 'El adjunto conserva el registro actualizado');
    for (const f of anteriores) assert.deepEqual(await fs.readFile(f.ruta), f.bytes, 'No cambia ningún archivo de las entregas');
    registros++;
  }
  await fs.writeFile('tmp/ui-audit/flujo-editable-fase3/pdf-registro-resultados.json', JSON.stringify({ pdfComprobados, registros, correcto: true }, null, 2));
  console.log(`${pdfComprobados} PDF numerados con las OF correctas; ${registros} registros de envío conservan páginas, adjuntos y archivos anteriores.`);
} finally { await configurar(false); }
