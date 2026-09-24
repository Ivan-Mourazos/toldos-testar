import fs from 'node:fs/promises';
import path from 'node:path';
import { addAwning, fillArzuaAR2603332, openApp, pick, segment } from '../.claude/skills/running-toldos-testar/drive.mjs';

const shots = path.join(process.cwd(), 'tmp/ui-audit/shots');
await fs.mkdir(shots, { recursive: true });

async function buildThreePageOrder(page) {
  await addAwning(page, 'Arzúa Pro');
  await fillArzuaAR2603332(page);
  await page.getByRole('button', { name: /Añadir toldo/ }).click();
  await page.locator('.model-picker-option').filter({ hasText: /^Hera/i }).first().click();
  const card = page.locator('.awning-column').last();
  await card.getByLabel('OF', { exact: true }).fill('0230195');
  await card.getByLabel('Frente', { exact: true }).fill('110');
  await card.getByLabel('Salida', { exact: true }).fill('150');
  await card.getByLabel('Altura instalación', { exact: true }).fill('250');
  await pick(page, 'Variante', /Hera 43 máquina/i, card);
  for (const [label, value] of [['Dispositivo', /Máquina interior/i], ['Color cadena', /Blanco/i], ['Abajo', /Varilla blanca/i]]) {
    if (await card.getByRole('combobox', { name: label, exact: true }).count()) await pick(page, label, value, card);
  }
  await segment(page, 'Empate indicado por cliente', 'Ninguno');
  await segment(page, 'Cara hacia el interior (ventana)', 'Derecho');
  await page.waitForTimeout(700);
  await page.getByRole('button', { name: 'Vista previa', exact: true }).click();
  try {
    await page.getByRole('dialog', { name: 'Vista previa del planteamiento' }).waitFor({ timeout: 20000 });
  } catch (error) {
    console.log('Avisos:', await page.locator('.notification-stack').allTextContents());
    throw error;
  }
}

for (const viewport of [{ width: 1280, height: 720 }, { width: 1600, height: 1000 }]) {
  // openApp ya deja elegido el usuario del navegador (IVÁN) antes de cargar la página.
  const { browser, page, errors } = await openApp(viewport);
  page.setDefaultTimeout(7000);
  try {
    await buildThreePageOrder(page);
    const dialog = page.getByRole('dialog', { name: 'Vista previa del planteamiento' });
      await dialog.getByText('Página 1 de 3').waitFor({ timeout: 20000 });
      await dialog.getByRole('img', { name: 'Página 1 de 3' }).waitFor({ timeout: 20000 });
      if (await dialog.getByRole('button', { name: 'Página entera' }).getAttribute('aria-pressed') !== 'true') {
        throw new Error('El ajuste inicial no es «Página entera».');
      }
      const pageHeight = await dialog.getByRole('img', { name: 'Página 1 de 3' }).evaluate((node) => node.getBoundingClientRect().height);
      const availableHeight = await dialog.locator('.pdf-carousel-stage').evaluate((node) => {
        const style = getComputedStyle(node);
        return node.clientHeight - parseFloat(style.paddingTop) - parseFloat(style.paddingBottom);
      });
      if (pageHeight > availableHeight + 2) throw new Error('La página inicial desborda el alto del visor.');
      await page.screenshot({ path: path.join(shots, `ui-lote-d-after-height-${viewport.width}x${viewport.height}.png`), animations: 'disabled' });
      const pageWidth = await dialog.getByRole('img', { name: 'Página 1 de 3' }).evaluate((node) => node.getBoundingClientRect().width);
      await dialog.getByRole('button', { name: 'Ajustar al ancho' }).click();
      await page.waitForFunction((previous) => {
        const image = document.querySelector('.pdf-preview-backdrop .pdf-carousel-page');
        return image && image.getBoundingClientRect().width > previous + 20;
      }, pageWidth);
      const fitWidth = await dialog.getByRole('img', { name: 'Página 1 de 3' }).evaluate((node) => node.getBoundingClientRect().width);
      await page.screenshot({ path: path.join(shots, `ui-lote-d-after-fit-${viewport.width}x${viewport.height}.png`), animations: 'disabled' });
      await dialog.locator('.pdf-carousel-stage').hover();
      await page.keyboard.down('Control');
      await page.mouse.wheel(0, 120);
      await page.keyboard.up('Control');
      const zoomValue = dialog.locator('.pdf-carousel-zoom-value');
      await page.waitForFunction(() => /^\d+ %$/.test(document.querySelector('.pdf-preview-backdrop .pdf-carousel-zoom-value')?.textContent?.trim() || ''));
      let percent = Number((await zoomValue.textContent())?.replace(/[^\d]/g, ''));
      for (let steps = 0; percent !== 150 && steps < 12; steps += 1) {
        const previous = percent;
        await dialog.getByRole('button', { name: percent > 150 ? 'Reducir zoom' : 'Ampliar zoom' }).click();
        await page.waitForFunction((value) => Number((document.querySelector('.pdf-preview-backdrop .pdf-carousel-zoom-value')?.textContent || '').replace(/[^\d]/g, '')) !== value, previous);
        percent = Number((await zoomValue.textContent())?.replace(/[^\d]/g, ''));
      }
      if (percent !== 150) throw new Error('No se pudo alcanzar el zoom 150 %.');
      await page.waitForFunction((previous) => {
        const image = document.querySelector('.pdf-preview-backdrop .pdf-carousel-page');
        return image && Math.abs(image.getBoundingClientRect().width - previous) > 20;
      }, fitWidth);
      const width150 = await dialog.getByRole('img', { name: 'Página 1 de 3' }).evaluate((node) => node.getBoundingClientRect().width);
      await page.screenshot({ path: path.join(shots, `ui-lote-d-after-150-${viewport.width}x${viewport.height}.png`), animations: 'disabled' });
      await dialog.getByRole('button', { name: 'Página siguiente' }).first().click();
      await dialog.getByText('Página 2 de 3').waitFor();
      const pageTwo = dialog.getByRole('img', { name: 'Página 2 de 3' });
      await pageTwo.waitFor();
      if (await pageTwo.evaluate((node) => node.getBoundingClientRect().width) <= width150) {
        throw new Error('La página A4 no conserva su tamaño respecto a la A5 al 150 %.');
      }
      const stageWidths = await dialog.locator('.pdf-carousel-stage').evaluate((node) => ({ scroll: node.scrollWidth, client: node.clientWidth }));
      if (stageWidths.client >= viewport.width) throw new Error('El visor desborda la ventana.');
      if (viewport.width === 1280 && stageWidths.scroll <= stageWidths.client) {
        throw new Error('El zoom de la página A4 no permite desplazar el visor horizontalmente.');
      }
      await dialog.getByRole('button', { name: 'Página 3', exact: true }).click();
      await dialog.getByText('Página 3 de 3').waitFor();
      await page.keyboard.press('ArrowLeft');
      await dialog.getByText('Página 2 de 3').waitFor();
      await page.keyboard.press('+');
      await dialog.getByText('175 %').waitFor();
      await page.keyboard.press('-');
      await dialog.getByText('150 %').last().waitFor();
      await page.keyboard.press('Escape');
      await dialog.waitFor({ state: 'hidden' });
      if (!(await page.getByRole('button', { name: 'Vista previa', exact: true }).evaluate((node) => node === document.activeElement))) {
        throw new Error('Esc no devolvió el foco a Vista previa');
      }
      await page.getByRole('button', { name: 'Guardar para revisión', exact: true }).click();
      await page.waitForTimeout(500);
      const confirm = page.getByRole('button', { name: 'Guardar igualmente' });
      if (await confirm.count()) await confirm.click();
      await page.waitForTimeout(500);
      const overwrite = page.getByRole('button', { name: 'Actualizar pedido', exact: true });
      if (await overwrite.count()) await overwrite.click();
      await page.getByRole('button', { name: /^Pedidos/ }).click({ timeout: 30000 });
      // Desde el 24/09/2026 el pedido se abre por "Abrir" en la bandeja y la vista
      // previa es un diálogo aparte (Pedido abierto sin aprobar ni devolver).
      const inboxRow = page.locator('.orders-row', { hasText: 'AR2603332' });
      await inboxRow.getByRole('button', { name: 'Abrir' }).click({ timeout: 15000 });
      const reviewReader = page.getByRole('region', { name: 'Datos de revisión de AR2603332' });
      await reviewReader.getByRole('button', { name: 'Vista previa', exact: true }).click();
      // Desde el 24/09/2026 la vista previa del pedido abierto sale ya a pantalla completa.
      const fullscreen = page.locator('dialog.review-inline-preview:modal');
      await fullscreen.waitFor({ timeout: 20000 });
      await fullscreen.getByText('Página 1 de 3').waitFor({ timeout: 20000 });
      await fullscreen.getByRole('button', { name: 'Página siguiente' }).first().click();
      await fullscreen.getByText('Página 2 de 3').waitFor();
      await page.keyboard.press('ArrowLeft');
      await fullscreen.getByText('Página 1 de 3').waitFor();
      await page.keyboard.press('Escape');
      await fullscreen.waitFor({ state: 'hidden' });
      if (!(await reviewReader.getByRole('button', { name: 'Vista previa', exact: true }).evaluate((node) => node === document.activeElement))) {
        throw new Error('Esc no devolvió el foco a Vista previa del pedido abierto');
      }
      await reviewReader.waitFor();
    // El recargado en caliente de Vite (WebSocket) no es de la app: falla si otra instancia usa su puerto.
    if (errors.some((error) => !/status of (400|409)|WebSocket|\[vite\]/.test(error))) throw new Error(`Errores de navegador: ${errors.join('; ')}`);
    console.log(`Visor PDF ${viewport.width}x${viewport.height}: OK`);
  } finally {
    await browser.close();
  }
}
