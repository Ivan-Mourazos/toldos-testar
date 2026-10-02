// Prueba e2e de los dibujos de los modelos y las versiones por modelo (diseño 02/10/2026): en
// Parámetros › Enrollable se sube un dibujo «Solo a mano» y se guarda sin motivo; su historial lo
// cuenta solo y no sale en Arzúa Pro; «Lo que sale hoy» enseña las miniaturas; en Nuevo pedido se
// elige en la tarjeta de un enrollable y el panel «Despiece y dibujo» dice que sale ese; el PDF lo
// lleva. Un dibujo automático de Cortina con condición sustituye solo a sus variantes en «Lo que
// sale hoy» y sale en el PDF solo cuando el toldo la cumple. Se puede repetir: cada vuelta usa
// nombres nuevos.
// Va en su propia aislada, porque guarda parámetros:
//   ISOLATED_DIR="$PWD/tmp/dibujos-codex" PORT=4312 FAKE_COORDINA_PORT=4322 bash .claude/skills/running-toldos-testar/start-isolated.sh
//   TOLDOS_ISOLATED_URL=http://127.0.0.1:4312 node scripts/test-dibujos-e2e.mjs
// Capturas en tmp/ui-audit/codex-dibujos/ (claro y oscuro, 1280×720 y 1600×1000).
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { BASE_URL, chooseFabric, openApp, pick } from '../.claude/skills/running-toldos-testar/drive.mjs';

const SALIDA = 'tmp/ui-audit/codex-dibujos';
const LOGO = 'src/domain/assets/tgm-logo.png';
const IMAGEN = `data:image/png;base64,${fs.readFileSync(LOGO).toString('base64')}`;
const vuelta = Date.now().toString(36).slice(-5).toUpperCase();
const PLANO = `Enrollable plano ${vuelta}`;
const VELCRO = `Cortina velcro ${vuelta}`;
const ANTIGUO = `Condición antigua ${vuelta}`;
fs.mkdirSync(SALIDA, { recursive: true });
assert.equal(new URL(BASE_URL).port, '4312', 'esta prueba va en su aislada de 4312: guarda parámetros');

const json = (method, datos) => ({ method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(datos) });
async function api(ruta, init) {
  const r = await fetch(`${BASE_URL}${ruta}`, init);
  return { status: r.status, datos: await r.json().catch(() => null) };
}
const historial = async (modelo) => (await api(`/api/rule-parameters/history?scope=${encodeURIComponent(modelo)}&limit=50`)).datos.entries;
/** Imágenes del PDF del planteamiento (el logo siempre es una; cada dibujo del taller, otra). */
async function imagenesDelPdf(order) {
  const r = await fetch(`${BASE_URL}/api/planteamiento`, json('POST', { order }));
  assert.equal(r.status, 200, `planteamiento: ${r.status}`);
  return (Buffer.from(await r.arrayBuffer()).toString('latin1').match(/\/Subtype \/Image/g) ?? []).length;
}
const pedido = (parameters, awning) => ({
  orderCode: 'PRUEBA', customer: 'PRUEBA DIBUJOS', technician: 'IVÁN', reviewer: 'JAIME', parameters,
  fabric: 'ACRILI2170P120|||120|||ACR NEGRO', sameFabric: true, awnings: [{ id: 'a', of: '0200001', units: 1, width: 300, projection: 250, ...awning }]
});
async function capturas(page, nombre, objetivo) {
  for (const [width, height] of [[1280, 720], [1600, 1000]]) {
    await page.setViewportSize({ width, height });
    for (const tema of ['light', 'dark']) {
      await page.evaluate((t) => { document.documentElement.dataset.theme = t; }, tema);
      if (objetivo) await page.locator(objetivo).first().evaluate(element => {
        if (!element.matches('.drawing-today, .drawing-rule')) element.style.scrollMarginTop = '190px';
        element.scrollIntoView({ block: 'start', behavior: 'instant' });
      });
      await page.waitForFunction(() => !document.querySelector('.drawing-today-thumb.is-loading'));
      if (await page.locator('.awning-panel-drawing').count()) {
        // Cambiar de tamaño pide otra página renderizada; esperar también esa actualización.
        await page.waitForTimeout(350);
        const imagen = page.locator('.pdf-carousel-page').first();
        await imagen.waitFor({ state: 'visible', timeout: 30000 });
        await imagen.evaluate(element => element.decode());
      }
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth), false, 'sin desbordamiento horizontal');
      await page.screenshot({ path: `${SALIDA}/${nombre}-${width}-${tema === 'light' ? 'claro' : 'oscuro'}.png`, animations: 'disabled' });
    }
  }
  await page.evaluate(() => { document.documentElement.dataset.theme = 'light'; });
  await page.setViewportSize({ width: 1600, height: 1000 });
}
const irAParametros = (page) => page.getByRole('button', { name: 'Parámetros', exact: true }).click();
const irAModelo = (page, nombre) => page.getByRole('navigation', { name: 'Modelos de parámetros' }).locator('button')
  .filter({ has: page.getByText(nombre, { exact: true }) }).click();

const health = (await api('/api/health')).datos;
assert.equal(health.simulationMode, true);
assert.equal(health.fileWritesEnabled, false);
const settings = (await api('/api/workflow/settings')).datos.settings;
assert.equal(settings.productionEnabled, false);
const raiz = path.resolve('tmp/dibujos-codex') + path.sep;
for (const [key, value] of Object.entries(settings)) {
  if (key.endsWith('Directory')) assert.ok(path.resolve(value).startsWith(raiz), key + ' fuera de la aislada propia');
}
for (const [model, variant] of [['FOO', 'general'], ['CORTINA', 'no-existe'], ['HERA', 'hera']]) {
  assert.equal((await api('/api/rule-parameters/drawing-preview?model=' + model + '&variant=' + variant)).status, 404);
}
console.log('OK: aislada propia y modelos/variantes desconocidos rechazados');
const { browser, page, errors } = await openApp();
try {
  // ── 1. Parámetros › Enrollable: «Lo que sale hoy» y un dibujo «Solo a mano» guardado sin motivo ──
  await irAParametros(page);
  await irAModelo(page, 'Enrollable');
  const dibujos = page.locator('.drawing-parameters');
  await page.getByRole('navigation', { name: 'Secciones de los parámetros' }).getByRole('button', { name: 'Dibujos', exact: true }).click();
  await page.waitForFunction(() => {
    const heading = document.querySelector('.drawing-parameters h2').getBoundingClientRect();
    const bar = document.querySelector('.parametros-modelo-barra').getBoundingClientRect();
    return heading.top >= bar.bottom && heading.top < innerHeight;
  });
  await dibujos.locator('.drawing-today img').nth(1).waitFor({ timeout: 30000 });
  assert.equal(await dibujos.locator('.drawing-today-item').count(), 2, 'Enrollable: general y cambio enrollable');
  console.log('OK: «Lo que sale hoy» de Enrollable enseña sus dos miniaturas');
  await dibujos.getByRole('button', { name: 'Añadir dibujo', exact: true }).click();
  const tarjeta = dibujos.locator('.drawing-rule').last();
  await tarjeta.getByLabel('Nombre del dibujo').fill(PLANO);
  await tarjeta.locator('input[type=file]').setInputFiles(LOGO);
  await tarjeta.locator('.drawing-rule-image img').waitFor();
  assert.equal(await tarjeta.getByRole('group', { name: 'Cómo se usa' }).getByRole('button', { name: 'Solo a mano', exact: true }).getAttribute('aria-pressed'), 'true', 'un dibujo nuevo empieza «Solo a mano»');
  const barra = page.getByRole('region', { name: 'Guardar el modelo' });
  await barra.getByText('Cambios sin guardar en Enrollable').waitFor();
  assert.equal(await page.getByRole('button', { name: 'Guardar para todos' }).count(), 0, 'la barra común no sale con toldos');
  await capturas(page, 'parametros-enrollable-sin-guardar', '.parametros-modelo-barra');
  await capturas(page, 'parametros-enrollable-miniaturas', '.drawing-today');
  await barra.getByRole('button', { name: 'Guardar', exact: true }).click();
  await barra.getByText('Modelo guardado').waitFor();
  const deEnrollable = await historial('ENROLLABLE');
  assert.equal(deEnrollable[0].motivo, '', 'guardado sin motivo');
  assert.equal(deEnrollable[0].updatedBy, 'IVÁN');
  assert.ok(deEnrollable[0].resumen.includes(`Dibujo «${PLANO}» añadido`), JSON.stringify(deEnrollable[0].resumen));
  assert.ok(!JSON.stringify(await historial('ARZUA PRO')).includes(PLANO), 'Arzúa Pro no ve el cambio del Enrollable');
  await page.locator('.parameters-history summary').click();
  await page.getByText(`Dibujo «${PLANO}» añadido`).first().waitFor();
  await capturas(page, 'parametros-enrollable-historial', '.parameters-history');
  await page.locator('.parameters-history summary').click();
  await irAModelo(page, 'Arzúa Pro');
  assert.ok((await page.locator('.parameters-history summary').innerText()).startsWith('Arzúa Pro'), 'el historial de arriba es el de Arzúa Pro');
  await page.locator('.parameters-history summary').click();
  assert.equal(await page.getByText(`Dibujo «${PLANO}» añadido`).count(), 0, 'el historial de Arzúa Pro no enseña el del Enrollable');
  await page.locator('.parameters-history summary').click();
  console.log('OK: guardado sin motivo, con su resumen, y su historial no sale en Arzúa Pro');

  // ── 2. Cortina: un automático con condición (por la API, como otro puesto) ──
  const actual = (await api('/api/rule-parameters')).datos;
  const dibujo = { id: `velcro-${vuelta.toLowerCase()}`, name: VELCRO, usage: 'auto', enabled: true, image: IMAGEN, conditions: [{ field: 'curtainFinish', value: 'VELCRO' }] };
  const antiguo = { id: `antiguo-${vuelta}`, name: ANTIGUO, usage: 'auto', enabled: true, image: null, conditions: [{ field: 'device', value: 'DISPOSITIVO ANTIGUO' }] };
  const guardar = await api('/api/rule-parameters/models/CORTINA', json('PUT', {
    baseVersion: actual.modelos.CORTINA?.version ?? 0, updatedBy: 'IVÁN',
    parameters: { ...actual.parameters, drawings: { byModel: { ...actual.parameters.drawings.byModel, CORTINA: [dibujo, antiguo, ...(actual.parameters.drawings.byModel.CORTINA ?? [])] } } }
  }));
  assert.equal(guardar.status, 200, JSON.stringify(guardar.datos));
  await page.reload();
  await irAParametros(page);
  await irAModelo(page, 'Cortina');
  await page.locator('.drawing-today-item').filter({ hasText: 'Sin ventana · velcro' }).getByText(`«${VELCRO}» lo sustituye siempre.`).waitFor();
  await page.locator('.drawing-today-item').filter({ has: page.getByText('Sin ventana', { exact: true }) }).getByText('Sale el de la web.').waitFor();
  await capturas(page, 'parametros-cortina-lo-que-sale-hoy', '.drawing-today');
  const antigua = page.locator('.drawing-rule').filter({ has: page.locator(`input[value="${ANTIGUO}"]`) });
  await antigua.getByRole('note').waitFor();
  assert.ok((await antigua.getByLabel('Valor de Accionamiento').locator('option').allInnerTexts()).includes('DISPOSITIVO ANTIGUO (revisar)'));
  assert.equal(await antigua.getByLabel('Valor de Accionamiento').inputValue(), 'DISPOSITIVO ANTIGUO');
  await capturas(page, 'parametros-condicion-antigua', `.drawing-rule:has(input[value="${ANTIGUO}"])`);
  const parametros = (await api('/api/rule-parameters')).datos.parameters;
  const cortina = (curtainFinish) => pedido(parametros, { model: 'CORTINA', device: 'MAQ. INTERIOR', curtainHasWindow: false, curtainFinish });
  assert.equal(await imagenesDelPdf(cortina('VELCRO')), (await imagenesDelPdf(cortina('NORMAL'))) + 1, 'el automático de Cortina solo sale con velcro');
  console.log('OK: el automático con condición sustituye solo a sus variantes y sale en el PDF cuando se cumple');

  // ── 3. Nuevo pedido: elegir en la tarjeta el dibujo «Solo a mano» y verlo en el panel ──
  const enrollable = (patch = {}) => pedido(parametros, { model: 'ENROLLABLE', ...patch });
  const id = (await historial('ENROLLABLE'))[0].overrides.drawings.byModel.ENROLLABLE.find((d) => d.name === PLANO).id;
  assert.equal(await imagenesDelPdf(enrollable({ workshopDrawingId: id })), (await imagenesDelPdf(enrollable())) + 1, 'el elegido a mano sale en el PDF');
  await page.getByRole('button', { name: 'Nuevo pedido', exact: true }).click();
  // Enrollable es un trabajo de tela: se abre el selector de esa familia.
  if (await page.locator('.order-entry').isVisible()) await page.getByRole('button', { name: 'Toldos', exact: true }).click();
  await page.getByRole('button', { name: 'Añadir trabajo de tela', exact: true }).click();
  await page.getByRole('dialog', { name: 'Elegir trabajo de tela' }).getByRole('button', { name: /^Enrollable/ }).click();
  await pick(page, 'Dibujo de confección', new RegExp(`^${PLANO} \\(taller\\)$`));
  const tarjetaToldo = page.locator('.awning-grid');
  assert.ok((await tarjetaToldo.getByRole('combobox', { name: 'Dibujo de confección', exact: true }).innerText()).includes(`${PLANO} (taller)`));
  // Datos mínimos para que el toldo se calcule y el panel pinte su PDF. Si tras el trabajo de Codex la
  // tela del pedido cambia de sitio, ajustar solo este paso.
  await page.getByLabel('OF', { exact: true }).fill('0200001');
  await page.getByLabel('Frente', { exact: true }).fill('300');
  await page.getByLabel('Salida', { exact: true }).fill('250');
  await chooseFabric(page, 'ACRILI2170');
  await tarjetaToldo.getByRole('button', { name: 'Despiece y dibujo', exact: true }).click();
  const panel = page.getByRole('dialog', { name: /Despiece y dibujo (del toldo|de la tela)/ });
  await panel.getByRole('tab', { name: 'Dibujo', exact: true }).click();
  await panel.getByText('elegido en la tarjeta').waitFor();
  await panel.locator('.pdf-carousel-canvas img').first().waitFor({ timeout: 30000 });
  await capturas(page, 'tarjeta-panel-dibujo-elegido');
  console.log('OK: el dibujo «Solo a mano» se elige en la tarjeta y el panel dice que sale ese');

  // ── 4. «Automático cuando…» en pantalla: condiciones con valores reales ──
  await page.keyboard.press('Escape');
  await irAParametros(page);
  await irAModelo(page, 'Cortina');
  const nuevo = page.locator('.drawing-parameters');
  await nuevo.getByRole('button', { name: 'Añadir dibujo', exact: true }).click();
  const tarjetaNueva = nuevo.locator('.drawing-rule').last();
  await tarjetaNueva.getByRole('group', { name: 'Cómo se usa' }).getByRole('button', { name: 'Automático cuando…', exact: true }).click();
  await tarjetaNueva.getByRole('button', { name: 'Añadir condición', exact: true }).click();
  const campos = await tarjetaNueva.getByLabel('Campo de la condición').locator('option').allInnerTexts();
  assert.ok(campos.includes('Confección') && !campos.includes('Tipo de guía'), JSON.stringify(campos));
  await capturas(page, 'parametros-cortina-condiciones', '.drawing-rule:last-child');
  await page.getByRole('region', { name: 'Guardar el modelo' }).getByRole('button', { name: 'Descartar cambios', exact: true }).click();
  await page.getByRole('region', { name: 'Guardar el modelo' }).getByRole('button', { name: 'Descartar', exact: true }).click();
  await page.getByRole('region', { name: 'Guardar el modelo' }).getByText('Modelo guardado').waitFor();
  console.log('OK: las condiciones ofrecen solo los campos del modelo; descartar vuelve a lo guardado');

  assert.deepEqual(errors, [], `errores en la consola: ${errors.join(' | ')}`);
  console.log(`OK: prueba de dibujos y versiones terminada. Capturas en ${SALIDA}/`);
} finally {
  await browser.close();
}
