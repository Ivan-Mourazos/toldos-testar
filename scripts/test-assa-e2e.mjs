// Auditoría aislada con RPS real o una foto local. Solo consulta la vista.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { openApp, BASE_URL } from '../.claude/skills/running-toldos-testar/drive.mjs';
import { crearServicioLotes } from '../src/assa/archivos.js';

const fecha = process.env.ASSA_FECHA || '2026-10-31';
const carpeta = path.resolve('tmp/ui-audit/combursa-palets');
await fs.mkdir(carpeta, { recursive: true });
const rps = process.env.ASSA_RPS ? JSON.parse(await fs.readFile(process.env.ASSA_RPS, 'utf8')) : null;
const servicio = rps && crearServicioLotes({ leer: async f => rps.lineas.filter(l => l.entregaSolicitada === f) });
const { browser, page, errors } = await openApp({ width: 1280, height: 720 });
const health = await fetch(BASE_URL + '/api/health').then(r => r.json());
assert.equal(health.simulationMode, true);
assert.equal(health.fileWritesEnabled, false);
const esVista = res => res.url().endsWith('/api/assa/lote/vista');

try {
  if (servicio) await page.route('**/api/assa/lote/vista', async route => {
    await route.fulfill({ json: await servicio.vista(route.request().postDataJSON()) });
  });
  await page.getByRole('button', { name: /^Estándar/ }).click();
  await page.getByRole('button', { name: 'Combursa', exact: true }).click();
  await page.getByLabel('Sábado de entrega').fill(fecha);
  const respuestaVista = page.waitForResponse(esVista);
  await page.getByRole('button', { name: 'Leer lote de RPS', exact: true }).click();
  const vista = await (await respuestaVista).json();
  assert.ok(vista.lineas?.length > 0, vista.error);
  await page.getByRole('heading', { name: vista.nombre, exact: true }).waitFor();
  const filas = page.locator('.combursa-lineas tbody tr:has(td)');
  assert.equal(await filas.count(), vista.lineas.length);

  let capturas = 0;
  const sufijo = fecha === '2026-11-07' ? '' : '-' + fecha;
  for (const [width, height] of [[1280, 720], [1600, 1000]]) for (const tema of ['light', 'dark']) {
    await page.setViewportSize({ width, height });
    await page.evaluate(t => { document.documentElement.dataset.theme = t; localStorage.setItem('toldos-tema', t); }, tema);
    await page.evaluate(async () => { await document.fonts.ready; await new Promise(requestAnimationFrame); });
    const tabla = page.locator('.combursa-tabla-scroll');
    assert.equal(await tabla.evaluate(e => e.scrollWidth <= e.clientWidth), true, 'La tabla cabe en escritorio.');
    const identificadores = tabla.locator('.combursa-of, .combursa-referencia');
    assert.equal(await identificadores.evaluateAll(celdas => celdas.every(celda => {
      const texto = document.createRange();
      texto.selectNodeContents(celda);
      return texto.getClientRects().length <= 1;
    })), true, 'Las referencias y las OF caben en una línea.');
    const nombre = (tema === 'light' ? 'claro-' : 'oscuro-') + width + 'x' + height + sufijo;
    await page.screenshot({ path: path.join(carpeta, nombre + '.png'), animations: 'disabled' });
    capturas++;
  }

  if (fecha === '2026-11-07') {
    const compartido = vista.lineas.find(l => l.CodArticle.endsWith('410130-0175'));
    assert.deepEqual(vista.paletsOficina?.[compartido.IDOrderLine], [5, 6]);
    assert.equal(await filas.filter({ hasText: '410130-0175' }).count(), 1);
    await page.getByLabel('Pedido', { exact: true }).selectOption('AR.26.05142');
    assert.equal(await filas.count(), 4);
    await page.getByRole('button', { name: /^Palets 5 y 6/ }).click();
    assert.equal(await filas.count(), 1);
    assert.match(await filas.first().innerText(), /410130-0175[\s\S]*54[\s\S]*0233209/);
    assert.equal(await page.getByText('Cantidad conjunta · reparto pendiente').count(), 1);
    await page.screenshot({ path: path.join(carpeta, 'palets-5-y-6-oscuro-1600x1000.png'), animations: 'disabled' });
    capturas++;
    const asignacion = page.getByRole('spinbutton', { name: /Palet de .*410130-0175/ });
    await asignacion.fill('5');
    const actualizado = page.waitForResponse(esVista);
    await asignacion.press('Enter');
    const nuevo = await (await actualizado).json();
    assert.equal(nuevo.lineas.filter(l => l.palet != null).length, 1);
    assert.deepEqual(nuevo.paletsOficina?.[compartido.IDOrderLine], [5, 6]);
    await page.getByRole('button', { name: 'Leer lote de RPS', exact: true }).waitFor();
  }
  if (vista.programas.length) {
    await page.getByRole('button', { name: /^Dibujos/ }).click();
    await page.getByRole('region', { name: 'Vista del corte', exact: true }).waitFor();
    await page.getByRole('button', { name: 'Papel del cortador', exact: true }).click();
    await page.getByRole('region', { name: 'Papel del cortador', exact: true }).waitFor();
    await page.getByRole('button', { name: 'Palets', exact: true }).click();
    const checkbox = page.locator('.combursa-suelta input:not(:disabled)').first();
    const etiqueta = await checkbox.getAttribute('aria-label');
    assert.ok(etiqueta);
    const actualizada = page.waitForResponse(esVista);
    await checkbox.check();
    await actualizada;
    await page.getByRole('button', { name: 'Leer lote de RPS', exact: true }).waitFor();
    assert.equal(await page.getByRole('checkbox', { name: etiqueta, exact: true }).isChecked(), true);
  }
  assert.equal(await page.getByRole('button', { name: 'Abrir corte', exact: true }).isDisabled(), true);
  assert.deepEqual(errors, []);
  const resultado = { fecha, simulationMode: health.simulationMode, fileWritesEnabled: health.fileWritesEnabled,
    errores: errors, fuente: rps ? 'Foto local de RPS' : 'SELECT por la API aislada', capturas };
  await fs.writeFile(path.join(carpeta, 'resultado' + sufijo + '.json'), JSON.stringify(resultado, null, 2));
  console.log(JSON.stringify(resultado));
} finally { await browser.close(); }
