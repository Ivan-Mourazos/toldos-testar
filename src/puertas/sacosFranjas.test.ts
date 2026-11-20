import { describe, expect, it } from 'vitest';
import pedido5667 from './__fixtures__/AR2605667.json';
import { generarCortePuertas } from './corte.ts';
import { leerPedidoPuertas } from './pedido.ts';

// Iván, 20/11/2026, AR2605667: apilable gris 400×370. Al lado del paño de 138 caben tres trozos de 130 por fila,
// pero «deberíamos priorizar los de 260 porque así ahorramos una costura»: una tira y un trozo por fila.
describe('sacos de stock con tiras y trozos mezclados en un retal', () => {
  it('AR2605667: dos tiras de 260 y dos trozos de 130, los mismos tres sacos', () => {
    const { cortes } = generarCortePuertas(leerPedidoPuertas(pedido5667 as never), { ofStockSacos: '0999999' });
    const lona = cortes.find(c => c.material === 'LAC900 GRIS 7038' && c.opcion === 'principal')!;
    expect(lona.largo).toBe(8000);
    const stock = lona.colocadas.filter(t => t.pieza.id.startsWith('stock-'));
    const tiras = stock.filter(t => Math.max(t.pieza.ancho, t.pieza.alto) >= 250);
    expect(tiras).toHaveLength(2);
    expect(stock.length - tiras.length).toBe(2);
    for (const t of stock) expect(t.x + t.pieza.ancho * 10).toBeLessThanOrEqual(lona.largo + .001);
  });
});
