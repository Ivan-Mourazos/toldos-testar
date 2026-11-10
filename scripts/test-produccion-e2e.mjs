// Solo la instancia aislada: tres productos, destinos individuales y entrega completa con vuelta al listado.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { chromium } from 'playwright';
import { normalizeOrder } from '../src/domain/validation.js';
import { pedidoVariasTelas } from '../src/domain/corteLona/fixtures/variasTelas.js';
import { generarCorteLona } from '../src/domain/corteLona/index.js';
import { crearEstadoCorteLona } from '../src/corteLonaEstado.js';
import { nuevaPuerta } from '../src/puertas/calcular.ts';

const base = process.env.TOLDOS_ISOLATED_URL || 'http://127.0.0.1:4310';
const salida = path.resolve('tmp/ui-audit/produccion');
await fs.mkdir(path.join(salida, 'temporales'), { recursive: true });
process.env.TMP = path.join(salida, 'temporales');
process.env.TEMP = process.env.TMP;
process.env.CHROME_LOG_FILE = path.join(salida, 'chromium.log');
const health = await fetch(base + '/api/health').then(r => r.json());
assert.equal(health.simulationMode, true);
assert.equal(health.fileWritesEnabled, false);
async function api(ruta, cuerpo, method = 'POST') {
  const r = await fetch(base + ruta, { method, headers: { 'Content-Type': 'application/json' }, body: cuerpo === undefined ? undefined : JSON.stringify(cuerpo) });
  return { status: r.status, datos: await r.json() };
}
const { datos: { settings: inicial } } = await api('/api/workflow/settings', undefined, 'GET');
const raiz = path.resolve(path.dirname(inicial.reviewDirectory));
assert.ok(path.resolve(raiz).startsWith(salida + path.sep));
for (const [clave, valor] of Object.entries(inicial)) if (clave.endsWith('Directory') && valor) {
  assert.ok(path.resolve(valor).startsWith(raiz + path.sep), 'Ruta ajena: ' + clave);
}
const ajustes = { ...inicial, productionEnabled: true, corteBorradoresDirectory: path.join(raiz, 'cad-borradores'),
  corteBorradoresRed: String.raw`\\toldosgomez.local\DFS_POL\oftecnica\BORRADORES CORTE`, corteLonaBotDirectory: path.join(raiz, 'bot/{TECNICO}') };
for (const tecnico of ['Ivan.Sanchez', 'Angel']) await fs.mkdir(path.join(raiz, 'bot', tecnico), { recursive: true });
const configurado = await api('/api/workflow/settings', ajustes, 'PUT'); assert.equal(configurado.status, 200, JSON.stringify(configurado.datos));
const remBase = JSON.parse(await fs.readFile('src/remolques/corte/__fixtures__/AR2605132.json', 'utf8'));
const puertaBase = JSON.parse(await fs.readFile('src/puertas/__fixtures__/AR2605134.json', 'utf8'));
const browser = await chromium.launch({ headless: true, downloadsPath: path.join(salida, 'descargas'), args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const context = await browser.newContext({ viewport: { width: 1600, height: 1000 }, reducedMotion: 'reduce' });
await context.addInitScript(() => { localStorage.setItem('toldos-testar-usuario', 'IVÁN'); localStorage.setItem('toldos-tema', 'light'); });
// Las pruebas de esta pantalla no consultan el catálogo ni pedidos de RPS.
await context.route('**/api/rps/**', route => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ items: [], pedido: null }) }));
const page = await context.newPage();
page.setDefaultTimeout(60000);
const errores = [];
page.on('pageerror', e => errores.push(e.message));
page.on('response', async r => {
  if (r.request().method() !== 'POST' || !r.url().includes('/api/') || r.ok()) return;
  const d = await r.json().catch(() => ({}));
  console.log('Comprobación', r.status(), new URL(r.url()).pathname, d.paso || '', d.error || Object.keys(d).join(', '));
});
const resultados = [];
async function capturas(nombre) {
  if (process.env.SIN_CAPTURAS) return;
  for (const [width, height] of [[1280, 720], [1600, 1000]]) {
    await page.setViewportSize({ width, height });
    for (const tema of ['light', 'dark']) {
      await page.evaluate(t => { document.documentElement.dataset.theme = t; }, tema);
      await page.screenshot({ path: path.join(salida, `${nombre}-${width}-${tema}.png`), animations: 'disabled' });
    }
  }
  await page.setViewportSize({ width: 1600, height: 1000 });
  await page.evaluate(() => { document.documentElement.dataset.theme = 'light'; });
}
async function seleccionarDxf() {
  await page.getByRole('button', { name: 'Hacer por separado', exact: true }).click();
  await page.getByRole('menuitem', { name: 'DXF de corte', exact: true }).click();
  await page.getByRole('dialog', { name: 'DXF de corte', exact: true }).waitFor();
}
async function aceptarPreguntas(hasta) {
  const fin = Date.now() + 90000;
  while (Date.now() < fin) {
    if (await hasta()) return;
    const d = page.getByRole('alertdialog');
    if (await d.isVisible()) {
      const boton = d.getByRole('button').filter({ hasText: /Sí, mandar al bot|Sustituir archivos|Sí, sustituir archivos|Incluir en la reserva|Aceptar los cambios/ }).first();
      if (await boton.count()) { console.log('PREGUNTA', await d.innerText()); await boton.click(); }
      else throw new Error('Pregunta inesperada: ' + await d.innerText());
    }
    await page.waitForTimeout(200);
  }
  throw new Error('La salida no terminó. ' + await page.locator('body').innerText());
}
try {
  for (const [indice, tipo] of ['toldos', 'remolques', 'puertas'].entries()) {
    const codigo = `AR26${String(94000 + Date.now() % 4000 + indice).padStart(5, '0')}`;
    const of = `09${codigo.slice(-5)}`;
    const ruta = tipo === 'toldos' ? '/api/reviews' : `/api/${tipo}/pedidos`;
    const detalle = ruta + '/' + codigo;
    let cuerpo;
    if (tipo === 'toldos') {
      const order = normalizeOrder(pedidoVariasTelas());
      Object.assign(order, { orderCode: codigo, customer: 'Prueba producción · Toldos', technician: 'IVÁN', reviewer: '' });
      order.awnings = [{ ...order.awnings[0], of }];
      const ofStockSacos = '0999999';
      cuerpo = { order, corteLona: crearEstadoCorteLona(order, { resultado: generarCorteLona(order, { ofStockSacos }), ofStockSacos }) };
    } else if (tipo === 'remolques') {
      const p = structuredClone(remBase);
      p.elementos = [p.elementos[0]];
      Object.assign(p.elementos[0].input.cabecera, { numeroPedido: codigo, ordenFabricacion: of, cliente: 'Prueba producción · Remolques', realizadoPor: 'IVÁN', revision: '' });
      cuerpo = { elementos: p.elementos, params: p.params };
    } else {
      const f = puertaBase;
      cuerpo = { pedido: { schemaVersion: 1, kind: 'puertas', orderCode: codigo, cabecera: { cliente: 'Prueba producción · Puertas', fecha: '2026-11-10' },
        elementos: [{ id: 'A', input: { ...nuevaPuerta('PUERTAENR'), frente: f.frente, alto: f.alto, of, cantidad: f.cantidad, color: f.color,
          rollo: 300, rolloCristal: 140, rolloSaco: 300, confirmada: true, ventanasConfirmadas: true,
          enrollable: { T: f.T, D: f.D, margen: f.margen, empates: [] }, entradas: f.alturasTubos.map(altura => ({ altura, diametro: 30, largo: f.frente, alto: 8, huecos: [] })) } }] } };
    }
    const guardado = await api(ruta, { ...cuerpo, savedBy: 'IVÁN', confirmOverwrite: true, confirmPlanoOverwrite: true });
    assert.equal(guardado.status, 200, JSON.stringify(guardado.datos));
    console.log('Guardado', tipo, codigo);
    await page.goto(base + '/?revisar=' + codigo);
    const principal = page.getByRole('button', { name: 'Pasar a producción', exact: true });
    await principal.waitFor();
    await page.waitForFunction(() => [...document.querySelectorAll('button')].some(b => b.textContent.trim() === 'Pasar a producción' && !b.disabled));
    await capturas(tipo + '-detalle');
    await page.getByRole('button', { name: 'Hacer por separado', exact: true }).click();
    assert.equal(await page.getByRole('menuitem', { name: /Generar PDF|Guardar plano|DXF de corte/ }).count(), 3);
    assert.equal(await page.getByRole('menuitem', { name: /Guardar DXF en DXFs|Descargar DXF/ }).count(), 0);
    if (tipo === 'toldos') await capturas('menu');
    await page.getByRole('menuitem', { name: 'Guardar plano', exact: true }).click();
    await page.getByText('Plano revisado conservado en su carpeta.', { exact: true }).waitFor();
    await page.getByRole('button', { name: 'Hacer por separado', exact: true }).click();
    await page.getByRole('menuitem', { name: 'DXF de corte', exact: true }).click();
    assert.deepEqual(await page.locator('#destino-dxf option').allTextContents(), ['Bot (carpeta del técnico)', 'Carpeta DXFs del año', 'Descargar en mi PC']);
    assert.equal(await page.locator('#tecnico-dxf').inputValue(), '');
    await page.locator('#tecnico-dxf').selectOption('ÁNGEL');
    if (tipo === 'toldos') await capturas('selector-dxf');
    await page.getByRole('button', { name: 'Mandar al bot', exact: true }).click();
    await aceptarPreguntas(async () => (await api(detalle, undefined, 'GET')).datos.enviosCorte?.some(e => e.destino === 'bot'));
    let p = (await api(detalle, undefined, 'GET')).datos;
    assert.equal(p.status, 'PENDING_REVIEW');
    assert.ok(p.enviosCorte.at(-1).carpeta.endsWith('Angel'));
    assert.equal(p.enviosCorte.at(-1).archivos[0].filename, codigo + '.dxf');
    await seleccionarDxf();
    await page.locator('#destino-dxf').selectOption('dxfs');
    await page.getByRole('button', { name: 'Guardar DXF', exact: true }).click();
    await aceptarPreguntas(async () => (await api(detalle, undefined, 'GET')).datos.enviosCorte?.some(e => e.destino === 'dxfs'));
    await seleccionarDxf();
    await page.locator('#destino-dxf').selectOption('descarga');
    const [descarga] = await Promise.all([page.waitForEvent('download'), page.getByRole('link', { name: 'Descargar en mi PC', exact: true }).click()]);
    assert.ok(descarga.suggestedFilename().endsWith('.dxf'));
    await descarga.saveAs(path.join(salida, 'descargas', tipo + '.dxf'));
    const enviosAntes = (await api(detalle, undefined, 'GET')).datos.enviosCorte.length;
    // PDF independiente: la entrega sigue abierta y el bot no recibe otro corte.
    await page.getByRole('button', { name: 'Hacer por separado', exact: true }).click();
    await page.getByRole('menuitem', { name: 'Generar PDF', exact: true }).click();
    const pdfDialogo = page.getByRole('dialog', { name: 'Generar PDF · ' + codigo, exact: true });
    await pdfDialogo.getByRole('button', { name: 'Generar PDF', exact: true }).click();
    const numero = tipo === 'toldos' ? 1 : 10;
    const carpetaPdf = tipo === 'toldos' ? ajustes.planteamientosDirectory : ajustes.remolquesPlanteamientosDirectory;
    await aceptarPreguntas(async () => Boolean(await fs.stat(path.join(carpetaPdf, `${codigo}-${numero}.pdf`)).catch(() => null)));
    await page.waitForFunction(() => [...document.querySelectorAll('button')].some(b => b.textContent.trim() === 'Pasar a producción' && !b.disabled));
    p = (await api(detalle, undefined, 'GET')).datos;
    assert.equal(p.status, 'PENDING_REVIEW');
    assert.equal(p.enviosCorte.length, enviosAntes);
    // La última pregunta tampoco puede publicar nada antes de la respuesta.
    const pdfAntes = await fs.readFile(path.join(carpetaPdf, `${codigo}-${numero}.pdf`));
    const botTecnico = path.join(raiz, 'bot/Ivan.Sanchez', codigo + '.dxf');
    await fs.writeFile(botTecnico, 'corte anterior');
    const previo = await api(detalle + '/produccion', { savedBy: 'IVÁN', confirmBot: true, confirmarEntrega: true,
      includeNonAcrylicFabrics: true, confirmPdfOverwrite: true, confirmPlanoOverwrite: true });
    assert.equal(previo.status, 409, JSON.stringify(previo.datos));
    assert.equal(previo.datos.paso, 'DXF al bot', JSON.stringify(previo.datos));
    assert.equal(previo.datos.needsConfirmation, true);
    assert.deepEqual(await fs.readFile(path.join(carpetaPdf, `${codigo}-${numero}.pdf`)), pdfAntes);
    assert.equal(await fs.readFile(botTecnico, 'utf8'), 'corte anterior');
    assert.equal((await api(detalle, undefined, 'GET')).datos.enviosCorte.length, enviosAntes);
    await principal.click();
    if (tipo === 'toldos') await capturas('entrega');
    await page.getByRole('dialog', { name: 'Pasar a producción · ' + codigo, exact: true }).getByRole('button', { name: 'Pasar a producción', exact: true }).click();
    await aceptarPreguntas(async () => await page.locator('.orders-inbox').isVisible().catch(() => false));
    await page.getByText('Pedido pasado a producción.', { exact: false }).first().waitFor();
    p = (await api(detalle, undefined, 'GET')).datos;
    assert.equal(p.status, 'PRODUCED');
    assert.equal(p.enviosCorte.length, enviosAntes + 1);
    assert.equal(p.enviosCorte.at(-1).archivos[0].filename, codigo + '.dxf');
    assert.ok(p.enviosCorte.at(-1).carpeta.endsWith('Ivan.Sanchez'));
    assert.ok(p.entregas.find(e => e.numero === numero));
    assert.ok(await fs.stat(path.join(carpetaPdf, `${codigo}-${numero}.pdf`)));
    const anual = tipo === 'toldos' ? path.join(ajustes.reviewDirectory, codigo + '.pdf')
      : path.join(ajustes.remolquesOficinaTecnicaDirectory.replaceAll('{YYYY}', '2026'), codigo + '.pdf');
    assert.ok(await fs.stat(anual));
    await capturas(tipo + '-listado');
    resultados.push({ tipo, codigo, entrega: numero, estado: p.status, envios: p.enviosCorte.length, vueltaAlListado: true });
    console.log('OK: PDF, plano, tres destinos y vuelta al listado', tipo);
  }
  assert.deepEqual(errores, []);
  await fs.writeFile(path.join(salida, 'resultado.json'), JSON.stringify({ resultados, errores }, null, 2));
} catch (error) {
  await page.screenshot({ path: path.join(salida, 'fallo.png') });
  throw error;
} finally {
  await browser.close();
  await api('/api/workflow/settings', { ...ajustes, productionEnabled: false }, 'PUT');
}
