// Regresión visual y de interacción; todos los datos de pedidos y telas son simulados.
import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { chromium } from 'playwright';

const base = process.env.TOLDOS_ISOLATED_URL || 'http://127.0.0.1:4310';
const carpeta = 'tmp/ui-audit/ancho-desplegables';
const salud = await fetch(`${base}/api/health`).then(r => r.json());
assert.equal(salud.simulationMode, true);
assert.equal(salud.fileWritesEnabled, false);
await mkdir(carpeta, { recursive: true });

const year = new Date().getFullYear();
const fecha = new Date().toISOString();
const pedidos = Array.from({ length: 24 }, (_, i) => ({
  orderCode: `AR${String(year).slice(-2)}${String(i + 1).padStart(5, '0')}`,
  status: 'PENDING_REVIEW', updatedAt: fecha, reviewNote: '',
  summary: {
    customer: `Cliente de prueba ${i + 1}`, technician: 'IVÁN', ofs: ['0230194'],
    models: ['ARZUA PRO'], awnings: 2, reviewer: '', orderDate: '', diagnostics: 0,
    awningList: ['A', 'B'].map(letter => ({ letter, of: '0230194', model: 'ARZUA PRO', state: 'ok', notes: [] })),
  },
}));
const borrador = {
  orderCode: 'AR2600099', kind: 'toldos', savedBy: 'IVÁN', updatedAt: fecha,
  summary: { customer: 'Borrador de prueba', models: ['ARZUA PRO'], elementos: 1 },
};
const browser = await chromium.launch({ args: ['--disable-features=OverlayScrollbar'] });
try {
  for (const [width, height] of [[1280, 720], [1600, 1000]]) {
    for (const tema of ['light', 'dark']) {
      const context = await browser.newContext({ viewport: { width, height } });
      await context.addInitScript(() => localStorage.setItem('toldos-testar-usuario', 'IVÁN'));
      const page = await context.newPage();
      const errores = [];
      page.on('pageerror', e => errores.push(e.message));
      await page.route('**/api/reviews?*', route => route.fulfill({ json: {
        reviews: new URL(route.request().url()).searchParams.get('year') === String(year) ? pedidos : [],
      } }));
      await page.route(/\/api\/(remolques|puertas)\/pedidos\?/, route => route.fulfill({ json: { reviews: [] } }));
      await page.route('**/api/borradores', route => route.fulfill({ json: { borradores: [borrador] } }));
      await page.route('**/api/catalog/fabrics?*', route => route.fulfill({ json: { items: [
        { code: 'ACRILI2018P120', description: 'Acrílico de prueba', width: 120 },
      ] } }));
      await page.goto(base);
      await page.getByRole('button', { name: 'Nuevo pedido', exact: true }).waitFor();
      await page.evaluate(t => { document.documentElement.dataset.theme = t; }, tema);
      await page.evaluate(() => document.fonts.ready);
      await page.waitForTimeout(300);
      const nombre = `${width}x${height}-${tema}`;
      const medidas = () => page.evaluate(() => ({
        ancho: document.documentElement.clientWidth,
        cabecera: document.querySelector('.cabecera').getBoundingClientRect().width,
        scroll: document.documentElement.scrollHeight > innerHeight,
      }));
      const inicio = await medidas();
      assert.equal(inicio.scroll, false, 'Inicio debe caber sin barra');
      assert.equal(await page.evaluate(() => getComputedStyle(document.documentElement).scrollbarGutter), 'stable');

      // El hover no debe poner sombra, borde ni cambiar el fondo del carril completo.
      await page.mouse.move(width - 4, height - 4);
      const tira = page.locator('.cabecera-pestanas');
      const fondo = await tira.evaluate(el => getComputedStyle(el).backgroundColor);
      const pedidosBoton = page.locator('.cabecera-pestanas button').filter({ hasText: /^Pedidos/ });
      await pedidosBoton.hover();
      await page.waitForTimeout(220);
      assert.equal(await tira.evaluate(el => getComputedStyle(el).boxShadow), 'none');
      assert.equal(await tira.evaluate(el => getComputedStyle(el).borderTopWidth), '0px');
      assert.equal(await tira.evaluate(el => getComputedStyle(el).backgroundColor), fondo);
      assert.equal(await pedidosBoton.evaluate(el => getComputedStyle(el).boxShadow), 'none');
      await page.screenshot({ path: `${carpeta}/${nombre}-cabecera-hover.png` });

      await pedidosBoton.click();
      await page.locator('.orders-row').first().waitFor();
      await page.waitForTimeout(400);
      const lista = await medidas();
      assert.equal(lista.scroll, true, 'Pedidos debe necesitar barra');
      assert.equal(lista.ancho, inicio.ancho, 'La barra no debe restar ancho al contenido');
      assert.equal(lista.cabecera, inicio.cabecera, 'La cabecera no debe moverse');

      for (const etiqueta of [`Desplegar ${pedidos[0].orderCode}`, `Desplegar el borrador ${borrador.orderCode}`]) {
        const codigo = etiqueta.split(' ').at(-1);
        const fila = page.locator('.orders-row').filter({ has: page.locator('.orders-code').filter({ hasText: codigo }) });
        const boton = fila.locator('.orders-row-toggle');
        await boton.click();
        assert.equal(await fila.locator('.desplegable').evaluate(el => getComputedStyle(el).animationName), 'desplegar');
        await page.waitForTimeout(250);
        const alto = await fila.locator('.desplegable').evaluate(el => el.getBoundingClientRect().height);
        assert.ok(alto > 0);
        await page.screenshot({ path: `${carpeta}/${nombre}-${etiqueta.includes('borrador') ? 'borrador' : 'pedido'}.png` });
        // Cerrar y detener a mitad para comprobar que la altura se interpola realmente.
        const cierre = fila.locator('.desplegable');
        const mitad = await boton.evaluate(async el => {
          el.click();
          await new Promise(requestAnimationFrame);
          const panel = el.closest('.orders-row').querySelector('.desplegable');
          if (!panel.inert) throw new Error('El contenido cerrado aún permite interacción');
          const animacion = panel.getAnimations()[0];
          if (!animacion || animacion.animationName !== 'plegar') throw new Error('Falta la animación de plegado');
          animacion.pause(); animacion.currentTime = 75;
          return panel.getBoundingClientRect().height;
        });
        assert.ok(mitad > 0 && mitad < alto, 'El cierre debe reducir la altura progresivamente');
        await cierre.evaluate(el => el.getAnimations()[0].finish());
        await cierre.waitFor({ state: 'detached' });
        // Reabrir mientras se está cerrando no debe desmontar el contenido nuevo.
        await boton.click(); await page.waitForTimeout(220);
        await boton.click(); await boton.click();
        await page.waitForTimeout(220);
        assert.equal(await fila.locator('.desplegable').getAttribute('aria-hidden'), 'false');
        await page.emulateMedia({ reducedMotion: 'reduce' });
        await boton.click();
        assert.equal(await fila.locator('.desplegable').count(), 0);
        await page.emulateMedia({ reducedMotion: 'no-preference' });
      }

      await page.getByRole('button', { name: 'Nuevo pedido', exact: true }).click();
      await page.getByRole('button', { name: 'Toldos', exact: true }).click();
      await page.getByRole('button', { name: 'Arzúa Pro', exact: true }).click();
      const salida = page.getByRole('combobox', { name: 'Salida', exact: true });
      await salida.click();
      assert.equal(await page.locator('.select-options').evaluate(el => getComputedStyle(el).animationName), 'pop-in');
      await page.waitForTimeout(200);
      await page.screenshot({ path: `${carpeta}/${nombre}-selector.png` });
      await salida.press('ArrowDown'); await salida.press('Enter');
      const cierreSelect = page.locator('.select-options.pop-out');
      assert.equal(await cierreSelect.getAttribute('inert'), '');
      assert.equal(await salida.getAttribute('aria-expanded'), 'false');
      await cierreSelect.waitFor({ state: 'detached' });
      await salida.click(); await page.waitForTimeout(180);
      await salida.press('Escape');
      await salida.click(); await page.waitForTimeout(180);
      assert.equal(await salida.getAttribute('aria-expanded'), 'true');
      await page.emulateMedia({ reducedMotion: 'reduce' });
      await salida.press('Escape');
      assert.equal(await page.locator('.select-options').count(), 0);
      await page.emulateMedia({ reducedMotion: 'no-preference' });

      const tela = page.getByRole('combobox', { name: 'Referencia', exact: true });
      await tela.fill('ACRILI');
      await page.getByRole('option', { name: /ACRILI2018P120/ }).waitFor();
      await page.waitForTimeout(180);
      await page.getByRole('option', { name: /ACRILI2018P120/ }).click();
      assert.equal(await page.locator('.fabric-options.pop-out').getAttribute('aria-hidden'), 'true');
      await page.locator('.fabric-options').waitFor({ state: 'detached' });
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
      assert.deepEqual(errores, []);
      console.log(`${nombre}: ancho estable, hover limpio, apertura/cierre, reapertura y movimiento reducido correctos`);
      await context.close();
    }
  }
} finally {
  await browser.close();
}
