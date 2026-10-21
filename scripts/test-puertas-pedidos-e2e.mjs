// Prueba e2e de la fase 2 de puertas: «Guardar para revisión» en Puertas, el pedido en Pedidos (etiqueta,
// filtro y ficha con Planteamiento y Corte), «Generar archivos» con el plano y «Guardar DXF en DXFs».
// Va en una aislada con su propia carpeta de prueba, porque activa la generación (solo dentro de tmp/):
//   ISOLATED_DIR="$PWD/tmp/puertas-pedidos" PORT=4318 FAKE_COORDINA_PORT=4328 bash .claude/skills/running-toldos-testar/start-isolated.sh
//   TOLDOS_ISOLATED_URL=http://127.0.0.1:4318 FAKE_COORDINA_PORT=4328 node scripts/test-puertas-pedidos-e2e.mjs
// Capturas en tmp/ui-audit/puertas-fase2/ (claro y oscuro, 1280×720 y 1600×1000). Al acabar deja la
// generación apagada y el CoordinaOT simulado como al principio.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { BASE_URL, openApp } from '../.claude/skills/running-toldos-testar/drive.mjs';

const FAKE = `http://127.0.0.1:${process.env.FAKE_COORDINA_PORT || 4320}`;
const SALIDA = 'tmp/ui-audit/puertas-fase2';
fs.mkdirSync(SALIDA, { recursive: true });
const ANIO = String(new Date().getFullYear());
const CODIGO = `AR${ANIO.slice(2)}99601`;
const OF = '0299601';
const json = (datos) => ({ method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(datos ?? {}) });
async function api(ruta, init) {
  const r = await fetch(`${BASE_URL}${ruta}`, init);
  return { status: r.status, datos: await r.json().catch(() => null) };
}

const { settings: ajustes } = (await api('/api/workflow/settings')).datos;
const TMP = path.resolve('tmp');
for (const clave of ['remolquesRevisionDirectory', 'corteLonaPlanoDirectory', 'corteLonaDxfDirectory', 'corteLonaBotDirectory']) {
  const ruta = path.resolve(String(ajustes[clave] || '').replace('{YYYY}', ANIO));
  assert.ok(ajustes[clave] && ruta.startsWith(`${TMP}${path.sep}`), `${clave} tiene que estar dentro de tmp/: «${ajustes[clave]}»`);
}
const ponerGeneracion = (activa) => api('/api/workflow/settings', { ...json({ ...ajustes, productionEnabled: activa }), method: 'PUT' });
const pedidoJson = path.join(ajustes.remolquesRevisionDirectory, 'puertas', `${CODIGO}.json`);
const planos = path.resolve(ajustes.corteLonaPlanoDirectory.replace('{YYYY}', ANIO));
fs.rmSync(pedidoJson, { force: true });
for (const ext of ['dwg', 'dxf']) fs.rmSync(path.join(planos, `${CODIGO}.${ext}`), { force: true });
fs.rmSync(path.resolve(ajustes.corteLonaDxfDirectory.replace('{YYYY}', ANIO), `${CODIGO}.dxf`), { force: true });
await fetch(`${FAKE}/__reset`, json());
await ponerGeneracion(false);

const comprobado = [];
// openApp exige la aislada en simulación: la generación se enciende después de abrir.
const { browser, page, errors } = await openApp({ width: 1280, height: 720 });
await ponerGeneracion(true);
try {
  // 1. Configurar la puerta habitual (AR2605134: tres enrollables 212 × 360) y guardarla para revisión.
  await page.getByRole('button', { name: 'Puertas', exact: true }).click();
  const llenar = async (nombre, valor) => { const campo = page.getByLabel(nombre, { exact: true }); await campo.fill(String(valor)); await campo.blur(); };
  const detalle = async (texto) => { await page.locator('.puerta-detalles > details > summary').filter({ hasText: texto }).click(); };
  const cerrarDetalles = async () => { for (const s of await page.locator('.puerta-detalles > details[open] > summary').all()) await s.click(); };
  await page.getByLabel('Modelo de puerta', { exact: true }).selectOption('PUERTAENR');
  for (const [k, v] of [['Número de pedido de puertas', CODIGO], ['Cliente de puertas', 'PORTANOVA PRUEBA'], ['OF de puerta', OF], ['Frente (cm)', 212], ['Alto (cm)', 360],
    ['Cantidad de puertas iguales', 3], ['Color de puerta', 'AZUL 5002'], ['Rollo de lona (cm)', 300], ['Rollo transparente (cm)', 140],
    ['T · desde arriba al eje (cm)', 169], ['D · entre ejes (cm)', 60], ['Margen lateral m (cm)', 6]]) await llenar(k, v);
  await detalle('Materiales del transparente'); await llenar('Rollo de saco (cm)', 300); await cerrarDetalles();
  await detalle('Entradas de tubo');
  for (const [i, altura] of [60, 131, 191].entries()) { await page.getByRole('button', { name: 'Añadir entrada', exact: true }).click(); await llenar(`Eje tubo ${i + 1} (cm)`, altura); }
  await cerrarDetalles();
  await page.getByLabel('He confirmado el modelo y las medidas con el dibujo', { exact: true }).check();
  await page.getByLabel('Ventanal confirmado con el dibujo', { exact: true }).check();
  await page.screenshot({ path: `${SALIDA}/pantalla-cabecera-1280x720.png` });
  await page.getByRole('button', { name: 'Guardar para revisión', exact: true }).click();
  await page.getByText(`Guardado en Pedidos para revisión: ${CODIGO}`).waitFor();
  const guardado = JSON.parse(fs.readFileSync(pedidoJson, 'utf8'));
  assert.equal(guardado.kind, 'puertas');
  assert.equal(guardado.summary.customer, 'PORTANOVA PRUEBA');
  assert.equal(guardado.summary.technician, 'IVÁN');
  const plano = ['dwg', 'dxf'].map((ext) => path.join(planos, `${CODIGO}.${ext}`)).find((f) => fs.existsSync(f));
  assert.ok(plano, `Al guardar tiene que salir el plano en ${planos}`);
  comprobado.push(`guardado en ${path.relative('.', pedidoJson)} y plano ${path.relative('.', plano)}`);
  // La pantalla queda limpia para el siguiente.
  assert.equal(await page.getByLabel('Número de pedido de puertas', { exact: true }).inputValue(), '');

  // 2. Pedidos: la fila con su etiqueta, el filtro «Puertas» y la ficha con los dos bloques.
  await page.getByRole('button', { name: /^Pedidos/ }).click();
  await page.getByRole('button', { name: 'Puertas', exact: true }).click();
  const fila = page.locator('.orders-row, li, tr').filter({ hasText: CODIGO }).first();
  await fila.waitFor();
  assert.ok(await fila.locator('.orders-kind-tag.is-puertas').count(), 'La fila lleva la etiqueta «Puerta».');
  await page.screenshot({ path: `${SALIDA}/pedidos-filtro-1280x720.png` });
  await fila.getByText(CODIGO).first().click();
  await page.getByRole('region', { name: `Pedido de puertas ${CODIGO}` }).waitFor();
  await page.locator('.documento-corte .corte-material').first().waitFor();
  assert.ok(await page.locator('.documento-planteamiento svg[role="img"]').count() >= 1, 'El planteamiento enseña el alzado.');
  for (const viewport of [{ width: 1280, height: 720 }, { width: 1600, height: 1000 }]) {
    await page.setViewportSize(viewport);
    for (const tema of ['claro', 'oscuro']) {
      const actual = await page.locator('html').getAttribute('data-theme');
      if ((tema === 'oscuro') !== (actual === 'dark')) await page.getByRole('button', { name: tema === 'oscuro' ? 'Pasar a modo oscuro' : 'Pasar a modo claro', exact: true }).click();
      const base = `${SALIDA}/ficha-${tema}-${viewport.width}x${viewport.height}`;
      await page.locator('.review-reader-header').evaluate((el) => el.scrollIntoView({ block: 'start' }));
      await page.screenshot({ path: `${base}-arriba.png` });
      await page.locator('.review-documentos').evaluate((el) => el.scrollIntoView({ block: 'start' }));
      await page.screenshot({ path: `${base}-documentos.png` });
    }
  }
  await page.setViewportSize({ width: 1280, height: 720 });
  comprobado.push('ficha en Pedidos con alzado y corte (capturas en claro y oscuro)');

  // 3. Generar archivos (CoordinaOT simulado: aprobada por defecto). Pregunta antes de sustituir el plano de revisión.
  const confirmar = async (nombre) => { await page.getByRole('alertdialog').getByRole('button', { name: nombre, exact: true }).click(); };
  await page.getByRole('button', { name: 'Generar archivos', exact: true }).click();
  await confirmar('Sí, generar archivos');
  await confirmar('Sustituir plano');
  await page.getByText('Archivos generados').first().waitFor();
  const generado = JSON.parse(fs.readFileSync(pedidoJson, 'utf8'));
  assert.equal(generado.status, 'PRODUCED');
  comprobado.push(`generado: ${generado.production.files.map((f) => f.filename).join(', ')}`);

  // 4. El corte, ya generado: «Guardar DXF en DXFs» desde la ficha (en Generados).
  await page.getByRole('button', { name: 'Puertas', exact: true }).click();
  await page.locator('.orders-row, li, tr').filter({ hasText: CODIGO }).first().getByText(CODIGO).first().click();
  await page.locator('.documento-corte .corte-material').first().waitFor();
  await page.getByRole('button', { name: /Guardar DXF en DXFs/ }).click();
  await page.getByText('DXF guardado en DXFs.').waitFor();
  const dxf = path.resolve(ajustes.corteLonaDxfDirectory.replace('{YYYY}', ANIO), `${CODIGO}.dxf`);
  assert.ok(fs.existsSync(dxf), `Tiene que estar el DXF en ${dxf}`);
  comprobado.push(`DXF en ${path.relative('.', dxf)}`);
  await page.screenshot({ path: `${SALIDA}/ficha-generada-1280x720.png` });
  assert.deepEqual(errors.filter((e) => !/favicon|ERR_CONNECTION_REFUSED|status of 409/.test(e)), [], 'Sin errores en la consola.');
} finally {
  await browser.close();
  await ponerGeneracion(false);
  await fetch(`${FAKE}/__reset`, json()).catch(() => {});
}
console.log(`Puertas fase 2 e2e: OK\n- ${comprobado.join('\n- ')}`);
