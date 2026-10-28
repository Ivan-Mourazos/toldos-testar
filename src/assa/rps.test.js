import { expect, it, vi } from 'vitest';
import { leerLoteRps, CONSULTA_LOTE } from './rps.js';

it('lee los tres clientes con SELECT y fecha parametrizada, sin filtrar familias ni OF', async () => {
  const query = vi.fn().mockResolvedValue({ recordset: [{ IDOrderLine: 'a', cantidad: 2 }] });
  const input = vi.fn().mockReturnThis();
  const pool = { request: () => ({ input, query }) };
  const lineas = await leerLoteRps('2026-10-31', { pool, company: '001' });
  expect(lineas).toHaveLength(1);
  expect(CONSULTA_LOTE.trim()).toMatch(/^SELECT /);
  expect(CONSULTA_LOTE).not.toMatch(/\b(?:UPDATE|INSERT|DELETE|MERGE|EXEC)\b/i);
  for (const cliente of ['029465', '018974', '034019']) expect(CONSULTA_LOTE).toContain(cliente);
  expect(CONSULTA_LOTE).toMatch(/ReceptionDemandDate\s*=\s*@fecha/);
  expect(input.mock.calls).toContainEqual(['fecha', '2026-10-31']);
  expect(query).toHaveBeenCalledWith(CONSULTA_LOTE);
});

it('rechaza una fecha inválida antes de consultar y detecta líneas duplicadas', async () => {
  const query = vi.fn().mockResolvedValue({ recordset: [{ IDOrderLine: 'a' }, { IDOrderLine: 'a' }] });
  const pool = { request: () => ({ input() { return this; }, query }) };
  await expect(leerLoteRps('2026-10-30', { pool, company: '001' })).rejects.toThrow(/sábado/);
  expect(query).not.toHaveBeenCalled();
  await expect(leerLoteRps('2026-10-31', { pool, company: '001' })).rejects.toThrow(/duplicadas/);
});
