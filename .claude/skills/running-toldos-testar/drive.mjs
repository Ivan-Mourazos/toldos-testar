// Ayudas de Playwright para la instancia aislada de 4310 (ver SKILL.md).
import { chromium } from 'playwright';

export const BASE_URL = process.env.TOLDOS_ISOLATED_URL || 'http://127.0.0.1:4310';

export async function openApp(viewport = { width: 1600, height: 1000 }) {
  const health = await fetch(`${BASE_URL}/api/health`).then((r) => r.json());
  if (!health.simulationMode || health.fileWritesEnabled) {
    throw new Error(`La instancia de 4310 no está aislada: ${JSON.stringify(health)}`);
  }
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport });
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  await page.goto(BASE_URL);
  await page.getByRole('button', { name: 'Pedido', exact: true }).waitFor();
  return { browser, page, errors };
}

export async function addAwning(page, modelName) {
  await page.getByRole('button', { name: /Añadir toldo/ }).click();
  await page.getByRole('button', { name: new RegExp(`^${modelName}`) }).first().click();
}

// SelectField: combobox con nombre de etiqueta; las opciones muestran la
// etiqueta legible, no el valor guardado en mayúsculas.
export async function pick(page, label, option, scope = page.locator('.awning-grid')) {
  await scope.getByRole('combobox', { name: label, exact: true }).first().click();
  const name = option instanceof RegExp ? option : new RegExp(`^${option}$`, 'i');
  await page.getByRole('option', { name }).first().click();
}

export async function segment(page, group, option) {
  await page.getByRole('group', { name: group }).getByRole('button', { name: option, exact: true }).first().click();
}

export async function chooseFabric(page, query) {
  const input = page.getByRole('combobox', { name: 'Referencia', exact: true });
  await input.fill(query);
  await page.getByRole('option').first().waitFor();
  await page.getByRole('option').first().click();
}

// Caso de aceptación de docs/rps-arzua-evidence.md.
export async function fillArzuaAR2603332(page) {
  await page.getByLabel('Pedido', { exact: true }).fill('AR2603332');
  await page.getByLabel('OF', { exact: true }).fill('0230194');
  await page.getByLabel('Frente', { exact: true }).fill('337');
  await pick(page, 'Salida', '225');
  await page.getByLabel('Bamba (cm)', { exact: true }).fill('30');
  await segment(page, 'Nº de brazos', '2');
  await segment(page, 'Tubo de carga', 'Evo 80');
  await pick(page, 'Lacado', /^blanco/i);
  await pick(page, 'Dispositivo', 'Motor');
  await pick(page, 'Sensor', 'Sin sensor');
  await pick(page, 'Posición motor', 'M.F. derecha');
  await pick(page, 'Colocación', 'Frontal');
  await chooseFabric(page, 'ACRILI2018');
  await pick(page, 'Curva bamba', 'Recta');
  await segment(page, 'Rotulación tela', 'No');
  await segment(page, 'Rotulación bamba', 'No');
}
