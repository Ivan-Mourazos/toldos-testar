import { expect, test } from 'vitest';
import { normalizeEmbudo, etiquetasEmbudo } from './embudoConfiguration.js';
import { piezasEmbudo } from './corteLona/embudo.js';
const pedido = { alto: 80, contornoArriba: 100, contornoAbajo: 65, largoCinta: 100 };
test('cinta corta antigua conserva 12 cm', () => {
  expect(normalizeEmbudo(pedido).largoCintaCorta).toBe(12);
  expect(etiquetasEmbudo(pedido).cinta.join(' ')).toContain('CON CINTA DE 12 CM');
});
test('AR2601252 rotula 30 cm sin cambiar el corte', () => {
  const antes = piezasEmbudo({ embudo: pedido });
  const despues = piezasEmbudo({ embudo: { ...pedido, largoCintaCorta: 30 } });
  expect(etiquetasEmbudo({ ...pedido, largoCintaCorta: 30 }).cinta.join(' ')).toContain('CON CINTA DE 30 CM');
  expect(despues[0].geometria.textos.some(t => t.valor.includes('CON CINTA DE 30 CM'))).toBe(true);
  for (let i=0; i<antes.length; i++) {
    expect(despues[i].geometria.lineas).toEqual(antes[i].geometria.lineas);
    expect(despues[i].geometria.arcos).toEqual(antes[i].geometria.arcos);
    expect([despues[i].largo, despues[i].alto]).toEqual([antes[i].largo, antes[i].alto]);
  }
});
