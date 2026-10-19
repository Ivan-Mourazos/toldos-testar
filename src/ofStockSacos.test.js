import fs from 'node:fs/promises';
import path from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { crearOfStockSacos, extraerOfStock } from './ofStockSacos.js';

const raiz = path.resolve('tmp/stock-sacos-tests');
const dwg = path.join(raiz, 'AUTOCAD', 'MATERIAL PARA STOCK.dwg');
const texto = (x, y, valor, tipo = 'TEXT') => `0\n${tipo}\n10\n${x}\n20\n${y}\n1\n${valor}\n`;
const dxf = (of = '0230811') => Buffer.from(texto(0, 0, 'SACO\\P120X80\\PSTOCK', 'MTEXT') + texto(2, 0, of) + texto(100, 0, '9999999'));
afterEach(async () => { await fs.rm(raiz, { recursive: true, force: true }); });

describe('OF de sacos desde el DWG de la oficina, solo lectura', () => {
  it('lee TEXT y MTEXT, incluidas continuaciones, y elige las siete cifras más cercanas', () => {
    expect(extraerOfStock(dxf())).toBe('0230811');
    const fragmentado = dxf().toString().replace('1\nSACO\\P120X80\\PSTOCK', '3\nSACO\\P120X80\n1\n\\PSTOCK');
    expect(extraerOfStock(Buffer.from(fragmentado))).toBe('0230811');
    const separado = texto(0, 0, 'SACO') + texto(0, -1, '120X80') + texto(0, -2, 'STOCK') + texto(2, 0, '0230811');
    expect(extraerOfStock(Buffer.from(separado))).toBe('0230811');
    expect(() => extraerOfStock(Buffer.from('sin textos'))).toThrow(/OF/);
  });
  it('comparte consultas y cachea por fecha; actualiza al cambiar el fichero sin escribir en él', async () => {
    await fs.mkdir(path.dirname(dwg), { recursive: true });
    await fs.writeFile(dwg, 'ORIGINAL');
    const convertir = vi.fn(async () => dxf());
    const leer = crearOfStockSacos({ oficinaTecnicaDirectory: raiz, oda: { convertir } });
    const resultados = await Promise.all([leer(), leer()]);
    expect(resultados[0]).toEqual({ of: '0230811', origen: 'dwg', avisos: [] });
    await leer();
    expect(convertir).toHaveBeenCalledTimes(1);
    convertir.mockResolvedValue(dxf('1234567'));
    await fs.utimes(dwg, new Date(), new Date(Date.now() + 10_000));
    expect((await leer()).of).toBe('1234567');
    expect(convertir).toHaveBeenCalledTimes(2);
    expect(await fs.readFile(dwg, 'utf8')).toBe('ORIGINAL');
    expect(await fs.readdir(path.dirname(dwg))).toEqual(['MATERIAL PARA STOCK.dwg']);
  });
  it('usa último bueno ante caída del DWG u ODA y el valor por defecto al arrancar', async () => {
    const convertir = vi.fn(async () => dxf('1234567'));
    const leer = crearOfStockSacos({ oficinaTecnicaDirectory: raiz, oda: { convertir } });
    expect(await leer()).toMatchObject({ of: '0230811', origen: 'defecto', avisos: [expect.stringContaining('OF')] });
    await fs.mkdir(path.dirname(dwg), { recursive: true });
    await fs.writeFile(dwg, 'ORIGINAL');
    await leer();
    convertir.mockRejectedValue(new Error('ODA falló'));
    await fs.utimes(dwg, new Date(), new Date(Date.now() + 10_000));
    expect(await leer()).toMatchObject({ of: '1234567', origen: 'ultimoBueno', avisos: [expect.stringContaining('ODA')] });
    await fs.unlink(dwg);
    expect(await leer()).toMatchObject({ of: '1234567', origen: 'ultimoBueno' });
  });
});
