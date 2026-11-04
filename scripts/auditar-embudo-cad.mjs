// Ejecutar después del contraste, solo contra la instancia aislada indicada por TOLDOS_ISOLATED_URL.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs';
import { openApp, BASE_URL } from '../.claude/skills/running-toldos-testar/drive.mjs';

assert.ok(Number(new URL(BASE_URL).port) >= 4460, 'Usa un puerto aislado desde 4460.');
const salida = path.resolve('tmp/ui-audit/embudo-cad');
const filas = JSON.parse(await fs.readFile(path.join(salida, 'contraste/resumen.json'), 'utf8'));
const { browser, page, errors } = await openApp({ width: 1600, height: 1000 });
const evidencias = [];
const respuestasFallidas = [];
page.on('response', r => { if (r.status() >= 400) respuestasFallidas.push({ url: r.url(), status: r.status() }); });
await page.route('**/api/catalog/fabrics/stock?*', r => r.fulfill({ json: { items: [] } }));
await page.route('**/api/orders/*/ofs', r => r.fulfill({ json: { orderCode: 'AR2605215', ofs: ['0233311'] } }));
async function comprobarPdf(order, esperado, nombre, onlyAwningId) {
  const r = await page.request.post(`${BASE_URL}/api/planteamiento`, { data: { order, onlyAwningId } });
  assert.equal(r.status(), 200);
  const bytes = await r.body();
  await fs.writeFile(path.join(salida, `${nombre}.pdf`), bytes);
  const tarea = getDocument({ data: new Uint8Array(bytes), useSystemFonts: true });
  try {
    const pdf = await tarea.promise;
    assert.equal(pdf.numPages, esperado);
    const textos = [];
    for (let i = 1; i <= pdf.numPages; i++) textos.push((await (await pdf.getPage(i)).getTextContent()).items.map(i => i.str).join(' '));
    assert.ok(!textos[0].includes('PLANTEAMIENTO DE TELAS'));
    for (const of of new Set(order.awnings.filter(a => !onlyAwningId || a.id === onlyAwningId).map(a => a.of))) {
      assert.ok(textos.join(' ').includes(of), `Falta la OF ${of}`);
    }
    evidencias.push({ nombre, paginas: pdf.numPages, textos });
  } finally { await tarea.destroy(); }
}
try {
  const conico = JSON.parse(await fs.readFile(path.join(salida, 'contraste/AR2605215/pedido-web.json'), 'utf8'));
  conico.notes = 'COMPROBAR MUESTRA DEL CLIENTE';
  conico.awnings[0].fabricNotes = 'DOBLE COSTURA EN SOLDADURA';
  const recto = JSON.parse(await fs.readFile(path.join(salida, 'contraste/AR2600169/pedido-web.json'), 'utf8'));
  await comprobarPdf(conico, 1, 'http-conico');
  await comprobarPdf(recto, 1, 'http-recto');
  const varias = { ...conico, awnings: [...conico.awnings, { ...recto.awnings[0], id: 'recto', units: 3 }] };
  await comprobarPdf(varias, 2, 'http-varias-of');
  const mixto = { ...conico, awnings: [{ id: 'toldo', model: 'ENROLLABLE', of: '0230001', units: 1, width: 150, projection: 180 }, ...conico.awnings] };
  await comprobarPdf(mixto, 2, 'http-mixto');
  await comprobarPdf(mixto, 1, 'http-solo-embudo', 'embudo-0');
  assert.ok(evidencias[0].textos.join(' ').includes('DOBLE COSTURA EN SOLDADURA'));
  assert.ok(evidencias[0].textos.join(' ').includes('COMPROBAR MUESTRA DEL CLIENTE'));

  await page.evaluate(order => localStorage.setItem('toldos-testar-draft-v6', JSON.stringify({ ...order, workType: 'FABRIC_ONLY', rotTela: 'NO', rotBamba: 'NO' })), conico);
  await page.reload();
  await page.getByRole('button', { name: 'Toldos', exact: true }).click();
  await page.getByRole('button', { name: /Seguir con AR2605215/ }).click();
  await page.getByRole('button', { name: 'Vista previa', exact: true }).click();
  const dialogo = page.getByRole('dialog', { name: 'Vista previa del planteamiento' });
  await dialogo.getByRole('img', { name: 'Página 1 de 1', exact: true }).waitFor({ timeout: 30000 });
  for (const [width, height] of [[1280, 720], [1600, 1000]]) {
    await page.setViewportSize({ width, height });
    for (const [theme, nombre] of [['light', 'claro'], ['dark', 'oscuro']]) {
      await page.evaluate(t => { document.documentElement.dataset.theme = t; }, theme);
      await page.waitForTimeout(600);
      await dialogo.locator('.pdf-carousel-page').first().evaluate(img => img.decode());
      await page.screenshot({ path: path.join(salida, `vista-previa-${width}-${nombre}.png`), animations: 'disabled' });
    }
  }
  await fs.writeFile(path.join(salida, 'navegador.json'), JSON.stringify({ errors, respuestasFallidas }, null, 2));
  assert.deepEqual(errors, []);
  assert.deepEqual(respuestasFallidas, []);
  const comparar = await browser.newPage({ viewport: { width: 2000, height: 1100 } });
  for (const fila of filas) {
    const carpeta = path.join(salida, 'contraste', fila.pedido);
    const leer = async nombre => (await fs.readFile(path.join(carpeta, `${nombre}.html`), 'utf8'))
      .replace('</head>', '<style>html,body{background:white}svg{width:100%;height:auto}.hoja{width:100%;height:auto}</style></head>');
    const oficina = await leer('oficina'), web = await leer('web');
    const alto = Math.max(1, (oficina.match(/<section/g) || []).length, (web.match(/<section/g) || []).length) * 695;
    await comparar.setContent('<html lang="es"><meta charset="utf-8"><style>body{font:16px Arial;background:#eee;margin:10px}main{display:grid;grid-template-columns:1fr 1fr;gap:10px}iframe{border:0;width:100%;background:white}h1{font-size:22px}</style><h1></h1><p></p><main><div>OFICINA<iframe></iframe></div><div>WEB<iframe></iframe></div></main></html>');
    await comparar.evaluate(({ pedido, detalle, oficina, web, alto }) => {
      document.querySelector('h1').textContent = pedido;
      document.querySelector('p').textContent = detalle;
      [...document.querySelectorAll('iframe')].forEach((f, i) => { f.style.height = `${alto}px`; f.srcdoc = i ? web : oficina; });
    }, { pedido: fila.pedido, detalle: `${fila.estado}: ${fila.detalle}`, oficina, web, alto });
    await Promise.all(comparar.frames().slice(1).map(f => f.waitForLoadState()));
    await comparar.screenshot({ path: path.join(carpeta, 'oficina-web.png'), fullPage: true });
  }
  await comparar.close();
  await fs.writeFile(path.join(salida, 'http-comprobaciones.json'), JSON.stringify(evidencias, null, 2));
  console.log(`PDF reales: ${evidencias.length}. Capturas: 4 de interfaz y ${filas.length} comparaciones. Sin errores de navegador.`);
} finally { await browser.close(); }
