// Capturas del alzado real de la aplicación, con cinco documentos de prueba dentro de su aislada.
// TOLDOS_ISOLATED_URL=http://127.0.0.1:4319 node scripts/test-puertas-plano-fase3-e2e.mjs
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { BASE_URL, openApp } from '../.claude/skills/running-toldos-testar/drive.mjs';
import { referenciasPlano, puertaPlanoReal } from '../src/puertas/__fixtures__/planosReales.ts';
import { pedidoDe } from '../src/puertas/__fixtures__/ejemplos.ts';
import { crearPedidoPuertas } from '../src/puertas/flujo/pedido.ts';
import { calcularPuerta } from '../src/puertas/calcular.ts';

const destino = 'tmp/ui-audit/puertas-fase3-plano';
const salud = await fetch(`${BASE_URL}/api/health`).then(r => r.json());
assert.equal(salud.simulationMode, true); assert.equal(salud.fileWritesEnabled, false);
const { settings } = await fetch(`${BASE_URL}/api/workflow/settings`).then(r => r.json());
const carpeta = path.resolve(settings.remolquesRevisionDirectory, 'puertas');
assert.ok(carpeta.startsWith(`${path.resolve('tmp')}${path.sep}`), 'Solo se siembran documentos en tmp/');
await fs.mkdir(carpeta, { recursive: true }); await fs.mkdir(destino, { recursive: true });
for (const { pedido } of referenciasPlano) {
  const p = puertaPlanoReal(pedido);
  assert.deepEqual(calcularPuerta(p).avisos.filter(a => a.nivel === 'error'), [], `${pedido}: datos de muestra válidos`);
  const doc = crearPedidoPuertas({ pedido: pedidoDe(pedido, p), cabecera: { cliente: 'PORTANOVA PRUEBA PLANO', fecha: '2026-10-22' },
    autoria: { technician: 'IVÁN', reviewer: '' }, existente: null, ahora: new Date().toISOString() });
  await fs.writeFile(path.join(carpeta, `${pedido}.json`), JSON.stringify(doc));
}
const capturas = [];
for (const viewport of [{ width: 1280, height: 720 }, { width: 1600, height: 1000 }]) {
  const { browser, page, errors } = await openApp(viewport);
  try {
    for (const { pedido } of referenciasPlano) {
      await page.goto(BASE_URL);
      await page.getByRole('button', { name: /^Pedidos/ }).click();
      await page.getByRole('button', { name: 'Puertas', exact: true }).click();
      await page.locator('.orders-row, li, tr').filter({ hasText: pedido }).first().getByText(pedido).first().click();
      await page.getByRole('region', { name: `Pedido de puertas ${pedido}` }).waitFor();
      const alzado = page.locator('.documento-planteamiento .puerta-alzado').first();
      await alzado.waitFor();
      if (pedido === 'AR2605065') assert.equal(await alzado.locator('rect.puerta-cristal').count(), 2);
      assert.ok(await alzado.locator('.puerta-rotulador').count() > 0);
      for (const tema of ['claro', 'oscuro']) {
        const oscuro = await page.locator('html').getAttribute('data-theme') === 'dark';
        if (oscuro !== (tema === 'oscuro')) await page.getByRole('button', { name: tema === 'oscuro' ? 'Pasar a modo oscuro' : 'Pasar a modo claro', exact: true }).click();
        await alzado.scrollIntoViewIfNeeded();
        const archivo = `${destino}/${pedido}-${tema}-${viewport.width}x${viewport.height}.png`;
        await page.screenshot({ path: archivo }); capturas.push(archivo);
        const svg = alzado.locator('svg');
        const desbordes = await svg.evaluate(el => {
          const vb = el.viewBox.baseVal;
          return [...el.querySelectorAll('text')].flatMap(t => {
            const b = t.getBBox(), m = t.getCTM(), origen = el.getCTM().inverse();
            const puntos = [[b.x, b.y], [b.x + b.width, b.y], [b.x, b.y + b.height], [b.x + b.width, b.y + b.height]]
              .map(([x, y]) => new DOMPoint(x, y).matrixTransform(m).matrixTransform(origen));
            return puntos.some(p => p.x < vb.x - 1 || p.x > vb.x + vb.width + 1 || p.y < vb.y - 1 || p.y > vb.y + vb.height + 1) ? [t.textContent] : [];
          });
        });
        assert.deepEqual(desbordes, [], `${pedido}: textos dentro de la vista`);
      }
    }
    assert.deepEqual(errors.filter(e => !/favicon/.test(e)), []);
  } finally { await browser.close(); }
}
await fs.writeFile(`${destino}/capturas.json`, JSON.stringify(capturas, null, 2));
console.log(`Alzados de puertas: ${capturas.length} capturas sin errores, en ${destino}`);
