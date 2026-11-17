import { readdirSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { generarCorteRemolques } from './index.js';
import { numero, registrosDxf, valor } from '../../domain/corteLona/dxfTestHelpers.js';

// Una cota con otro número escrito encima no se puede fiar: el texto es siempre lo que mide (Iván, 17/11/2026,
// AR2605589: salía 97 en una de 80 y 0 en una de 97). Solo se admite escribir esa misma medida con dos decimales.
const dir = new URL('./__fixtures__/', import.meta.url);
const pedidos = readdirSync(dir).filter((f) => /^AR\d+\.json$/.test(f))
  .map((f) => JSON.parse(readFileSync(new URL(f, dir), 'utf8')));

describe('las cotas del plano de corte dicen lo que miden', () => {
  it.each(pedidos.map((p) => [p.orderCode, p]))('%s', (_codigo, pedido) => {
    const plano = generarCorteRemolques(pedido).archivo?.plano.dxf;
    if (!plano) return;
    const falsas = registrosDxf(plano).filter((r) => r.tipo === 'DIMENSION' && valor(r, 1) != null)
      .map((r) => [numero(r, 42), valor(r, 1)])
      .filter(([mide, texto]) => texto !== String(Math.round(Number(mide) * 100) / 100).replace('.', ','));
    expect(falsas).toEqual([]);
  });
});
