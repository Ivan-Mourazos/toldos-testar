// Prueba e2e de la aprobación leída de CoordinaOT (diseño 29/09/2026), contra la
// instancia aislada y el CoordinaOT simulado (4320): guarda AR2603332 (OF 0230194),
// y comprueba Pedidos y el botón con la OF en revisión, devuelta (con su nota),
// aprobada (se genera) y con CoordinaOT caído (aviso y no se genera).
//
// El servidor recuerda 30 s cada respuesta de CoordinaOT y Pedidos/detalle usan esa
// memoria, así que tras cambiar el simulado se recarga y se reintenta hasta 40 s en vez
// de dormir un tiempo fijo. Solo «Generar archivos» pregunta siempre fresco.
import assert from 'node:assert/strict';
import { fillArzuaAR2603332, addAwning, openApp } from '../.claude/skills/running-toldos-testar/drive.mjs';

const FAKE = `http://127.0.0.1:${process.env.FAKE_COORDINA_PORT || 4320}`;
const CACHE_WAIT_MS = 40_000;
const post = (path, data) => fetch(`${FAKE}${path}`, { method: 'POST', body: JSON.stringify(data ?? {}) });
const set = (ofs) => post('/__estado', { ofs });
const down = (caido) => post('/__caido', { caido });
await post('/__reset');

const { browser, page } = await openApp({ width: 1600, height: 1000 });
page.setDefaultTimeout(15000);
const shot = (name) => page.screenshot({ path: `tmp/ui-audit/shots/coordina-${name}.png` });

// Repite «recargar, abrir Pedidos y comprobar» hasta que se cumple o se acaba la memoria
// de 30 s del servidor; así la prueba no depende de cuánto quedaba de esa memoria.
async function untilOrders(check, what) {
  const limit = Date.now() + CACHE_WAIT_MS;
  let last;
  for (;;) {
    await page.reload();
    await page.getByRole('button', { name: /^Pedidos/ }).first().click();
    await page.locator('.orders-row', { hasText: 'AR2603332' }).first().waitFor();
    try { await check(); return; } catch (error) { last = error; }
    if (Date.now() > limit) throw new Error(`${what}: no se cumplió en ${CACHE_WAIT_MS / 1000} s. ${last.message}`);
    await page.waitForTimeout(3000);
  }
}
const groupTitle = (code) => page.locator('.orders-group', { has: page.locator('.orders-row', { hasText: code }) }).locator('.orders-group-title');
const inGroup = (re) => async () => assert.match(await groupTitle('AR2603332').innerText(), re);
const rowOf = () => page.locator('.orders-row', { hasText: 'AR2603332' });
// Abre el pedido desde su fila y espera a que el botón de generar tenga su estado final
// (mientras se consulta CoordinaOT la nota dice «Comprobando…»).
const openFromRow = async () => {
  if (!(await rowOf().getByRole('button', { name: 'Abrir el pedido' }).isVisible())) await rowOf().locator('.orders-row-toggle').click();
  await rowOf().getByRole('button', { name: 'Abrir el pedido' }).click();
  await page.getByRole('button', { name: 'Generar archivos', exact: true }).waitFor();
};

try {
  await set({ '0230194': { estado: 'en_revision' } });
  await addAwning(page, 'Arzúa Pro');
  await fillArzuaAR2603332(page);
  // El cálculo llega tras rellenar el formulario; con él pendiente, guardar avisa «Faltan datos».
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(1500);
  await page.getByRole('button', { name: 'Guardar para revisión' }).click();
  // Si el pedido ya estaba guardado de una vuelta anterior, pide confirmar la sustitución.
  const update = page.getByRole('button', { name: 'Actualizar pedido', exact: true });
  if (await update.waitFor({ timeout: 3000 }).then(() => true, () => false)) await update.click();
  await page.getByText(/Guardado en Pedidos para revisión: AR2603332\.pdf/).waitFor();

  await untilOrders(inGroup(/Por revisar/), 'en revisión');
  console.log('OK: en revisión en CoordinaOT → «Por revisar»');
  await shot('por-revisar');

  await set({ '0230194': { estado: 'devuelta', nota: 'Falta el lado del brazo' } });
  await untilOrders(inGroup(/Devueltos/), 'devuelta');
  await rowOf().locator('.orders-row-toggle').click();
  await rowOf().getByText('Falta el lado del brazo').waitFor();
  console.log('OK: devuelta → «Devueltos» con la nota al desplegar');
  await shot('devuelto');

  await openFromRow();
  await page.getByText(/Sin aprobar en CoordinaOT: A \(0230194\) devuelta/).waitFor();
  assert.equal(await page.getByRole('button', { name: 'Generar archivos', exact: true }).isDisabled(), true);
  console.log('OK: devuelta → botón apagado con el motivo');
  await shot('devuelto-boton');

  // Caído: la memoria de 30 s aún puede responder con lo devuelto, así que se espera el aviso.
  await down(true);
  await untilOrders(async () => {
    await page.getByText('No se puede consultar CoordinaOT; los pedidos se muestran como por revisar.').waitFor({ timeout: 2000 });
  }, 'CoordinaOT caído');
  console.log('OK: CoordinaOT caído → aviso en Pedidos');
  await shot('caido');
  // El servidor pregunta sin memoria al generar: aunque Pedidos aún lo viera aprobado, se niega.
  const serverSays = await page.evaluate(() => fetch('/api/reviews/AR2603332/generate-files', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' }).then(async (r) => [r.status, (await r.json()).error]));
  // La aislada no tiene las salidas activadas y ese control va antes que el de CoordinaOT
  // (403): el 503 se cubre con las pruebas unitarias de generationBlock (reviewRules.test.js).
  let skipped503 = false;
  if (serverSays[0] === 403) {
    skipped503 = true;
    console.log('SALTADO: el 503 no se puede ver en la aislada (salidas desactivadas → 403 primero)');
  } else {
    assert.deepEqual(serverSays, [503, 'No se puede comprobar la aprobación en CoordinaOT; inténtalo en un momento.']);
    console.log('OK: CoordinaOT caído → el servidor no genera (503)');
  }
  // Con CoordinaOT caído, la propia API dice «no disponible» (así el aviso de Pedidos no es
  // solo cosa de la pantalla). La memoria de 30 s puede tardar en caducar: se reintenta.
  const apiLimit = Date.now() + CACHE_WAIT_MS;
  for (;;) {
    const api = await page.evaluate(() => fetch('/api/coordina/ofs?ofs=0230194').then((r) => r.json()));
    if (api.disponible === false) break;
    if (Date.now() > apiLimit) throw new Error(`/api/coordina/ofs seguía disponible tras ${CACHE_WAIT_MS / 1000} s con CoordinaOT caído.`);
    await page.waitForTimeout(3000);
  }
  console.log('OK: CoordinaOT caído → /api/coordina/ofs dice disponible:false');
  await down(false);

  await set({ '0230194': { estado: 'aprobada', nota: '' } });
  await untilOrders(inGroup(/Aprobados · falta generar/), 'aprobada');
  await shot('aprobado');
  await openFromRow();
  await page.waitForFunction(() => [...document.querySelectorAll('button')].some((b) => b.textContent.trim() === 'Generar archivos' && !b.disabled));
  console.log('OK: aprobada → «Aprobados · falta generar» y botón encendido para el autor');
  await shot('aprobado-boton');

  // En la lista, un solo signo por toldo y, al desplegar, quién aprobó (el revisor que
  // luego se apunta al generar; el JSON y el PDF se comprueban en test-rps-e2e.mjs).
  await page.reload();
  await page.getByRole('button', { name: /^Pedidos/ }).first().click();
  await rowOf().first().waitFor();
  await rowOf().locator('.orders-row-toggle').click();
  await rowOf().getByText('Aprobado por Jaime').waitFor();
  await rowOf().getByRole('img', { name: /aprobada en CoordinaOT/ }).first().waitFor({ state: 'visible' });
  assert.equal(await rowOf().locator('.orders-awnings').getByRole('img', { name: /aprobada en CoordinaOT/ }).count(), 1);
  console.log('OK: aprobada → «Aprobado por Jaime» al desplegar y una sola marca de CoordinaOT');
  await shot('aprobado-por');

  console.log(skipped503 ? 'Aprobación CoordinaOT: OK (503 saltado en la aislada)' : 'Aprobación CoordinaOT: OK');
} finally {
  await post('/__reset');
  await browser.close();
}
