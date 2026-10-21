// Solo contra una instancia aislada: todos los destinos y las capturas quedan en tmp/.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { BASE_URL, openApp } from '../.claude/skills/running-toldos-testar/drive.mjs';
import { pedidoVariasTelas } from '../src/domain/corteLona/fixtures/variasTelas.js';

const salida = path.resolve('tmp/ui-audit/corte-bot');
await fs.mkdir(salida, { recursive: true });
const json = (cuerpo, method = 'POST') => ({ method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(cuerpo) });
async function api(ruta, init) {
  const res = await fetch(BASE_URL + ruta, init);
  return { status: res.status, datos: await res.json() };
}
const { datos: { settings: iniciales } } = await api('/api/workflow/settings');
const raizTmp = path.resolve('tmp') + path.sep;
for (const [clave, valor] of Object.entries(iniciales)) {
  if (clave.endsWith('Directory') && valor) assert.ok(path.resolve(valor).startsWith(raizTmp), `${clave} fuera de tmp/: ${valor}`);
}
assert.equal(iniciales.productionEnabled, false, 'La aislada tiene que empezar en simulación.');
const { browser, page, errors } = await openApp({ width: 1600, height: 1000 });
page.setDefaultTimeout(25000);
const remolque = JSON.parse(await fs.readFile('src/remolques/corte/__fixtures__/AR2605132.json', 'utf8'));
const order = { ...pedidoVariasTelas(), orderCode: 'AR2699784', technician: 'IVÁN', customer: 'PRUEBA CORTE TOLDOS' };
const carpetaPrueba = path.dirname(iniciales.reviewDirectory);
// Solo archivos de estos dos pedidos, en las rutas tmp validadas arriba: la prueba se puede repetir.
for (const [carpeta, nombre] of [[iniciales.reviewDirectory, `${order.orderCode}.pdf`], [iniciales.remolquesRevisionDirectory, 'AR2699732.json']]) {
  await fs.rm(path.join(carpeta, nombre), { force: true });
}
const botPrueba = path.join(carpetaPrueba, 'BOT/Pendientes/Ivan.Sanchez');
await fs.rm(botPrueba, { recursive: true, force: true });
const dxfsPrueba = path.join(carpetaPrueba, 'Oficina Tecnica/2026/DXFs');
for (const nombre of await fs.readdir(dxfsPrueba).catch(() => [])) {
  if (nombre.startsWith(order.orderCode) || nombre.startsWith('AR2699732')) await fs.rm(path.join(dxfsPrueba, nombre));
}
const corte = await api('/api/corte-lona', json({ order }));
assert.equal(corte.status, 200);
const guardado = await api('/api/reviews', json({ order, corteLona: corte.datos.corteLona, savedBy: 'IVÁN', confirmOverwrite: true, confirmPlanoOverwrite: true }));
assert.equal(guardado.status, 200, JSON.stringify(guardado.datos));
const pedidoRem = 'AR2699732';
const elementos = remolque.elementos.map((e) => ({ version: e.version, tipo: e.tipo, input: { ...e.input, cabecera: { ...e.input.cabecera, numeroPedido: pedidoRem, cliente: 'PRUEBA CORTE REMOLQUES' } } }));
const remGuardado = await api('/api/remolques/pedidos', json({ elementos, params: remolque.params, savedBy: 'IVÁN', confirmOverwrite: true }));
assert.equal(remGuardado.status, 200, JSON.stringify(remGuardado.datos));
const ajustes = { ...iniciales, productionEnabled: true,
  corteLonaBotDirectory: path.join(path.dirname(iniciales.reviewDirectory), 'BOT/Pendientes/{TECNICO}'),
  corteLonaDxfDirectory: path.join(path.dirname(iniciales.reviewDirectory), 'Oficina Tecnica/{YYYY}/DXFs') };

async function capturar(nombre, dialogo = false, selector = '.corte-envios') {
  for (const [width, height] of [[1280, 720], [1600, 1000]]) {
    await page.setViewportSize({ width, height });
    for (const tema of ['light', 'dark']) {
      await page.evaluate((t) => { document.documentElement.dataset.theme = t; localStorage.setItem('toldos-tema', t); }, tema);
      if (!dialogo) await page.locator(selector).scrollIntoViewIfNeeded();
      await page.screenshot({ path: path.join(salida, `${nombre}-${width}-${tema === 'light' ? 'claro' : 'oscuro'}.png`) });
    }
  }
  await page.setViewportSize({ width: 1600, height: 1000 });
}
async function abrir(codigo) {
  await page.reload();
  await page.getByRole('button', { name: /^Pedidos/ }).first().click();
  const fila = page.locator('.orders-row', { hasText: codigo }).first();
  await fila.waitFor();
  if (!(await fila.getByRole('button', { name: 'Abrir el pedido' }).isVisible())) await fila.locator('.orders-row-toggle').click();
  await fila.getByRole('button', { name: 'Abrir el pedido' }).click();
  await page.waitForFunction(() => [...document.querySelectorAll('.corte-envios button')].some((b) => b.textContent.includes('Mandar corte al bot') && !b.disabled));
}
try {
  assert.equal((await api('/api/workflow/settings', json(ajustes, 'PUT'))).status, 200);
  for (const [producto, codigo, ruta] of [
    ['toldos', order.orderCode, `/api/reviews/${order.orderCode}/corte-lona`],
    ['remolques', pedidoRem, `/api/remolques/pedidos/${pedidoRem}/corte`],
  ]) {
    const botonBot = page.getByRole('button', { name: 'Mandar corte al bot', exact: true });
    if (producto === 'toldos') {
      const sinCarpeta = await api(`${ruta}/enviar`, json({ usuario: 'IVÁN', destino: 'bot', confirmBot: true }));
      assert.equal(sinCarpeta.status, 409);
      assert.match(sinCarpeta.datos.error, /Ivan.Sanchez/);
      assert.equal(await fs.stat(ajustes.corteLonaBotDirectory.replace('{TECNICO}', 'Ivan.Sanchez')).catch(() => null), null);
      await fs.mkdir(ajustes.corteLonaBotDirectory.replace('{TECNICO}', 'Ivan.Sanchez'), { recursive: true });
    }
    await abrir(codigo);
    await capturar(`${producto}-detalle`);
    await botonBot.click();
    await page.getByRole('alertdialog').getByText('El corte irá al bot y se cortará. ¿Seguro?', { exact: true }).waitFor();
    await capturar(`${producto}-confirmacion-bot`, true);
    await page.getByRole('alertdialog').getByRole('button', { name: 'Cancelar', exact: true }).click();
    await botonBot.click();
    await page.getByRole('alertdialog').getByRole('button', { name: 'Mandar corte al bot', exact: true }).click();
    await page.getByText('Corte mandado al bot.', { exact: true }).waitFor();
    await page.getByRole('button', { name: 'Guardar DXF en DXFs', exact: true }).click();
    await page.getByText('DXF guardado en DXFs.', { exact: true }).waitFor();
    await page.getByRole('button', { name: 'Guardar DXF en DXFs', exact: true }).click();
    await page.getByRole('alertdialog', { name: 'El DXF ya existe' }).waitFor();
    await capturar(`${producto}-ya-existe`, true);
    await page.getByRole('alertdialog').getByRole('button', { name: 'Conservar el actual', exact: true }).click();
    await botonBot.click();
    await page.getByRole('alertdialog').getByRole('button', { name: 'Mandar corte al bot', exact: true }).click();
    await page.getByRole('alertdialog', { name: 'El DXF ya existe' }).waitFor();
    const sustituido = page.waitForResponse((r) => r.url().endsWith(`${ruta}/enviar`) && r.status() === 200);
    await page.getByRole('alertdialog').getByRole('button', { name: 'Sustituir DXF', exact: true }).click();
    await sustituido;
    await page.getByText('Corte mandado al bot.', { exact: true }).first().waitFor();
    const detalleRuta = producto === 'toldos' ? `/api/reviews/${codigo}` : `/api/remolques/pedidos/${codigo}`;
    const { datos: pedido } = await api(detalleRuta);
    assert.equal(pedido.enviosCorte.length, 3);
    if (producto === 'toldos') {
      for (const envio of pedido.enviosCorte) {
        assert.deepEqual(envio.archivos.map(a => a.filename), [`${codigo} (con sacos).dxf`, `${codigo} (trozo separado).dxf`]);
        for (const archivo of envio.archivos) {
          const contenido = await fs.readFile(archivo.savedPath, 'latin1');
          for (const texto of ['AZUL 5010', 'BLANCO 9016', 'A BAMBA', '0232568', 'REVÉS']) assert.ok(contenido.includes(texto));
        }
      }
    }
    assert.ok(pedido.enviosCorte.every((e) => e.usuario === 'IVÁN' && e.fecha && path.resolve(e.carpeta).startsWith(path.dirname(path.resolve(iniciales.reviewDirectory)))));
    await abrir(codigo);
    await page.locator('.corte-envios-historial').waitFor();
    if (producto === 'remolques') {
      const [descarga] = await Promise.all([page.waitForEvent('download'), page.getByRole('link', { name: 'Descargar DXF', exact: true }).click()]);
      assert.equal(descarga.suggestedFilename(), `${codigo}.dxf`);
      await descarga.saveAs(path.join(salida, descarga.suggestedFilename()));
    } else {
      for (const opcion of ['con sacos', 'trozo separado']) {
        const [descarga] = await Promise.all([page.waitForEvent('download'), page.getByRole('link', { name: `Descargar DXF · ${opcion}`, exact: true }).click()]);
        assert.equal(descarga.suggestedFilename(), `${codigo} (${opcion}).dxf`);
        await descarga.saveAs(path.join(salida, descarga.suggestedFilename()));
      }
    }
    const generar = producto === 'toldos' ? `/api/reviews/${codigo}/generate-files` : `/api/remolques/pedidos/${codigo}/generar`;
    const generado = await api(generar, json({ includeNonAcrylicFabrics: false, confirmOverwrite: true }));
    assert.equal(generado.status, 200, JSON.stringify(generado.datos));
    assert.ok(generado.datos.saved.every((f) => f.type !== 'corte-lona'));
    assert.equal((await api(detalleRuta)).datos.enviosCorte.length, pedido.enviosCorte.length);
    console.log(`OK ${producto}: envío, confirmación, sustitución, descarga e historial; generar no escribe DXF.`);
  }
  await page.getByRole('button', { name: 'Configuración', exact: true }).click();
  await page.getByText('Corte de lona · DXFs de oficina técnica', { exact: true }).first().waitFor();
  await capturar('configuracion', false, '.workflow-route-card:nth-child(2)');
  assert.deepEqual(errors.filter((e) => !e.includes('409') && !e.includes('404')), []);
  console.log(`Capturas: ${salida}`);
} finally {
  await api('/api/workflow/settings', json(iniciales, 'PUT'));
  await browser.close();
}
