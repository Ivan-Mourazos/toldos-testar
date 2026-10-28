import { chromium } from 'playwright';
import { fileURLToPath } from 'node:url';
const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage({ viewport: { width: 1100, height: 950 } });
  for (const pedido of ['AR2605215', 'AR2600169']) {
    await page.goto(new URL(`./salida/${pedido}-corte.svg`, import.meta.url).href);
    await page.locator('svg').screenshot({ path: fileURLToPath(new URL(`./salida/${pedido}-corte.png`, import.meta.url)) });
  }
} finally { await browser.close(); }
