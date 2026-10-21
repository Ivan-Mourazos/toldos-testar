// Instancia aislada propia; todas las capturas y comprobaciones quedan en tmp/.
// TOLDOS_ISOLATED_URL=http://127.0.0.1:4317 node scripts/test-vista-previa-corte-e2e.mjs
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { BASE_URL, openApp } from '../.claude/skills/running-toldos-testar/drive.mjs';

const salida = 'tmp/ui-audit/vista-previa-corte';
await fs.mkdir(salida, { recursive: true });
const fixture = JSON.parse(await fs.readFile('src/remolques/corte/__fixtures__/AR2605158.json', 'utf8'));
const toldos = JSON.parse(await fs.readFile('src/domain/corteLona/fixtures/revision-AR2604784.json', 'utf8')).order;
const { browser, page } = await openApp({ width: 1600, height: 1000 }, {
  launchArgs: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
});
const errores = [];
page.on('pageerror', (error) => errores.push(error.message));
const corte = page.getByRole('region', { name: 'Vista previa del corte', exact: true });
const boton = corte.getByRole('button', { name: 'Ver vista previa del corte', exact: true });

async function capturas(nombre, seccion) {
  for (const [width, height] of [[1280, 720], [1600, 1000]]) {
    await page.setViewportSize({ width, height });
    for (const tema of ['claro', 'oscuro']) {
      const modo = tema === 'claro' ? 'light' : 'dark';
      if (await page.locator('html').getAttribute('data-theme') !== modo) {
        await page.getByRole('button', { name: tema === 'claro' ? 'Pasar a modo claro' : 'Pasar a modo oscuro' }).click();
      }
      await seccion.scrollIntoViewIfNeeded();
      await page.evaluate((etiqueta) => {
        const elemento = document.querySelector(`section[aria-label="${etiqueta}"]`);
        window.scrollTo(0, elemento.getBoundingClientRect().top + window.scrollY - 180);
      }, await seccion.getAttribute('aria-label'));
      await page.screenshot({ path: `${salida}/${nombre}-${width}-${tema}.png` });
    }
  }
}

try {
  await page.evaluate((pedido) => {
    localStorage.setItem(`tgm:borradores:${pedido.orderCode}`, JSON.stringify({
      guardadoEn: new Date().toISOString(), versionActiva: pedido.elementos[0].version,
      lineas: pedido.elementos.map(({ tipo, version, input }) => ({ tipo, version, input })),
      paramsGuardados: pedido.params,
    }));
  }, fixture);
  await page.getByRole('button', { name: 'Remolques', exact: true }).click();
  await page.getByLabel('Pedido', { exact: true }).fill(fixture.numeroPedido);
  await page.waitForFunction(() => {
    const b = [...document.querySelectorAll('button')].find((el) => el.textContent === 'Ver vista previa del corte');
    return b && !b.disabled;
  });
  const pedidosAntes = await fetch(`${BASE_URL}/api/remolques/pedidos`).then((r) => r.json());
  await boton.click();
  await corte.getByRole('img').first().waitFor();
  const editor = page.locator('.rem-editor');
  assert.ok(await editor.evaluate((el) => Boolean(el.nextElementSibling?.matches('[aria-label="Vista previa del corte"]'))), 'el corte está debajo del planteo');
  await capturas('remolques-con-of', corte);

  const of = editor.locator('input[data-campo="ordenFabricacion"]');
  await of.fill('');
  await corte.getByText('Han cambiado los datos:', { exact: false }).waitFor();
  assert.equal(await corte.getByRole('img').count(), 0, 'descarta el dibujo al cambiar la OF');
  await boton.click();
  await corte.getByText('Elemento A: sin OF, es solo una vista previa; escribe la OF antes de guardarlo.', { exact: true }).waitFor();
  await corte.getByRole('img').first().waitFor();
  assert.match(await corte.locator('svg[role="img"]').textContent(), /SIN OF/);
  await capturas('remolques-sin-of', corte);
  const pedidosDespues = await fetch(`${BASE_URL}/api/remolques/pedidos`).then((r) => r.json());
  assert.deepEqual(pedidosDespues, pedidosAntes, 'calcular no guarda el pedido');

  // Una respuesta que llegue tarde no recupera el dibujo de las medidas anteriores.
  await page.route('**/api/remolques/corte/vista-previa', async (ruta) => {
    const respuesta = await ruta.fetch();
    await new Promise((resolve) => setTimeout(resolve, 500));
    await ruta.fulfill({ response: respuesta }).catch(() => {});
  });
  await boton.click();
  await of.fill('0233203');
  await page.waitForTimeout(750);
  assert.equal(await corte.getByRole('img').count(), 0, 'descarta respuestas de una entrada vieja');
  await of.fill('');
  assert.equal(await corte.getByRole('img').count(), 0, 'volver a la entrada anterior no recupera el dibujo viejo');
  await page.unroute('**/api/remolques/corte/vista-previa');

  toldos.awnings[0].of = '';
  await page.evaluate((order) => {
    localStorage.setItem('toldos-testar-draft-v6', JSON.stringify(order));
    localStorage.setItem('planteamientos-producto', 'toldos');
  }, toldos);
  await page.reload();
  await page.getByRole('button', { name: 'Toldos', exact: true }).click();
  const corteToldos = page.getByRole('region', { name: 'Corte de lona', exact: true });
  await corteToldos.getByRole('button', { name: 'Generar corte', exact: true }).click();
  await corteToldos.getByRole('img').first().waitFor();
  const etiqueta = corteToldos.getByRole('status').first();
  assert.equal(await etiqueta.textContent(), 'Vista previa · falta la OF');
  assert.match(await etiqueta.getAttribute('class'), /is-aviso/);
  await capturas('toldos-sin-of', corteToldos);
  assert.deepEqual(errores, []);
  console.log('OK: vista de remolques con y sin OF, descarte al editar y ante respuestas tardías, sin guardar pedidos; etiqueta de toldos sin OF.');
  console.log(`Capturas: ${salida} (12 imágenes, temas cambiados con el botón de la web).`);
} finally { await browser.close(); }
