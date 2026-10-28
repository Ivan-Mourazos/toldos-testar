import { mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { openApp, pick, segment } from '../../../.claude/skills/running-toldos-testar/drive.mjs';

const carpeta = new URL('./', import.meta.url);
await mkdir(carpeta, { recursive: true });
// Ejecutar: TOLDOS_ISOLATED_URL=http://127.0.0.1:4317 node tmp/ui-audit/embudos/comprobar.mjs
const { browser, page, errors } = await openApp({ width: 1600, height: 1000 });
const comprobaciones = [];
try {
  await page.getByRole('button', { name: /^Toldos\b/ }).click();
  await page.getByRole('button', { name: /Embudo$/ }).click();
  await page.getByLabel('Pedido', { exact: true }).fill('AR2605215');
  await page.getByLabel('OF', { exact: true }).fill('2605215');
  await page.getByLabel('Alto del embudo (cm)', { exact: true }).fill('90');
  await page.getByLabel('Contorno de arriba (cm)', { exact: true }).fill('88');
  await page.getByLabel('Contorno de abajo (cm)', { exact: true }).fill('76');
  await page.getByLabel('Largo de cinta (cm)', { exact: true }).fill('100');
  await page.getByLabel('Cantidad', { exact: true }).fill('2');
  // Catálogo simulado local: el selector del embudo debe descartar la acrílica.
  await page.route('**/api/catalog/fabrics?**', route => route.fulfill({ json: { items: [
    { code: 'PVC900BL', width: 250, description: 'LONA PVC 900 BLANCO :250 AN', material: 'PLASTICA (LONA)' },
    { code: 'ACRILI2101P120', width: 120, description: 'ACR GRANATE', material: 'ACR' }
  ] } }));
  await page.getByRole('combobox', { name: 'Referencia', exact: true }).fill('PVC 900');
  await page.getByRole('option').first().waitFor();
  if (await page.getByRole('option').count() !== 1) throw new Error('Se ofrece tela distinta de PVC.');
  await page.getByRole('option').first().click();
  await page.locator('.awning-column').getByText('VÁLIDO', { exact: true }).waitFor();
  comprobaciones.push('Tarjeta cónica a mano y selección exclusiva de PVC.');
  await capturas('conico');
  await page.reload();
  await page.getByRole('button', { name: /^Toldos\b/ }).click();
  await page.getByRole('button', { name: /^Seguir con AR2605215/ }).click();
  await page.getByLabel('Alto del embudo (cm)', { exact: true }).waitFor();
  if (await page.getByLabel('Contorno de abajo (cm)', { exact: true }).inputValue() !== '76') throw new Error('El borrador perdió las medidas.');
  comprobaciones.push('Recarga: conserva las medidas y la configuración.');
  await segment(page, 'Forma del embudo', 'Recto');
  await page.getByLabel('Alto del embudo (cm)', { exact: true }).fill('100');
  await page.getByLabel('Contorno (cm)', { exact: true }).fill('66');
  await pick(page, 'Remate de arriba', 'Bastilla');
  await pick(page, 'Remate de abajo', 'Bastilla');
  await page.getByLabel('Largo de cinta (cm)', { exact: true }).fill('95');
  await page.getByLabel('Cantidad', { exact: true }).fill('1');
  if (await page.getByLabel('Bastilla de arriba (cm)', { exact: true }).inputValue() !== '10') throw new Error('Bastilla inicial incorrecta.');
  comprobaciones.push('Tarjeta recta con bastillas de 10 y un único contorno.');
  await capturas('recto');
  const erroresAplicacion = errors.filter(e => !/^Failed to load resource:.*(?:400|503)/.test(e));
  if (erroresAplicacion.length) throw new Error(erroresAplicacion.join('\n'));
  await writeFile(new URL('resultado.json', carpeta), JSON.stringify({ comprobaciones, erroresAplicacion,
    avisosServicios: errors, nota: 'Catálogo PVC simulado; RPS no es necesario para esta fase y su stock puede estar no disponible.' }, null, 2));
  console.log(comprobaciones.join('\n'));
} catch (error) {
  await page.screenshot({ path: fileURLToPath(new URL('fallo.png', carpeta)) });
  console.log('Estado del fallo:', (await page.getByRole('button').allTextContents()).slice(0, 40));
  throw error;
} finally { await browser.close(); }

async function capturas(nombre) {
  for (const [width, height] of [[1280, 720], [1600, 1000]]) {
    await page.setViewportSize({ width, height });
    for (const [tema, valor] of [['claro', 'light'], ['oscuro', 'dark']]) {
      await page.evaluate(t => { document.documentElement.dataset.theme = t; }, valor);
      await page.locator('.awning-column').scrollIntoViewIfNeeded();
      await page.screenshot({ path: fileURLToPath(new URL(`${nombre}-${tema}-${width}x${height}.png`, carpeta)), animations: 'disabled' });
    }
  }
}
