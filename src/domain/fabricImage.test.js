import { test, expect } from 'vitest';
import { readFile } from 'node:fs/promises';
import { normalizeFabricImage } from './fabricImage.js';
import { normalizeOrder } from './validation.js';
import { buildPlanteamientoPlan, buildOrderPlanteamientoPdf } from './planteamientoPdf.js';
const image = 'data:image/png;base64,' + (await readFile(new URL('./assets/tgm-logo.png', import.meta.url))).toString('base64');
const awning = { id: 'a', model: 'ANTICA', of: '123', units: 1, width: 300, projection: 80, fabricImage: image };
const order = { orderCode: 'PRUEBA', awnings: [awning, { ...awning, id: 'b', of: '124', fabricImage: null }] };
const calculation = { ofs: order.awnings.map((item, index) => ({ awningId: item.id, awningIndex: index, of: item.of, calculation: { valid: true }, materials: [] })) };
test('conserva la imagen al normalizar y guardar el pedido', () => {
  expect(normalizeOrder(JSON.parse(JSON.stringify(order))).awnings[0].fabricImage).toBe(image);
});
test('rechaza rutas, SVG y archivos excesivos', () => {
  for (const invalid of ['file:///test.png', 'https://example.com/a.png', 'data:image/svg+xml;base64,AAAA', 'data:image/png;base64,' + 'A'.repeat(600001)]) expect(() => normalizeFabricImage(invalid)).toThrow();
  expect(normalizeFabricImage(null)).toBeNull();
});
test('separa las páginas con imágenes diferentes y vuelve a agrupar al restaurar', () => {
  expect(buildPlanteamientoPlan(order, calculation).fabricPages).toHaveLength(2);
  const restored = structuredClone(order); restored.awnings[0].fabricImage = null;
  expect(buildPlanteamientoPlan(restored, calculation).fabricPages).toHaveLength(1);
});
test('incrusta la imagen tanto en tela normal como en Hera', async () => {
  for (const model of ['CAMBIO TELA', 'HERA']) {
    const one = { orderCode: 'PRUEBA', awnings: [{ ...awning, model }] };
    const calc = { ofs: [{ ...calculation.ofs[0], calculation: { valid: true, model } }] };
    const buffer = await buildOrderPlanteamientoPdf({ order: one, calculation: calc });
    expect(buffer.toString('latin1')).toContain('/Subtype /Image');
  }
});
test('una imagen corrupta produce un error explícito al generar', async () => {
  const invalid = { ...order, awnings: [{ ...awning, fabricImage: 'data:image/png;base64,AAAA' }] };
  await expect(buildOrderPlanteamientoPdf({ order: invalid, calculation })).rejects.toThrow('No se pudo incluir');
});
