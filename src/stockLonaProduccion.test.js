import { expect, it, vi } from 'vitest';
import { comprobarStockLona } from './stockLonaProduccion.js';

const consultado = '2026-11-23T10:00:00.000Z';
const datos = { pedido: 'AR2600001', cliente: 'Cliente', ofs: ['0290001'], consultadoPor: 'IVÁN' };
const linea = { of: '0290001', codigo: 'LONA', descripcion: 'Lona gris', ml: 42.3 };
const falta = { codigo: 'LONA', descripcion: 'Lona gris', necesita: 42.3, disponible: 18.75 };
function preparar(disponible = 18.75) {
  const stock = { reset: vi.fn(), getStock: vi.fn(async () => [{ code: 'LONA', disponible }]) };
  const coordina = { enviarStockLona: vi.fn(async () => ({ ok: true })) };
  const comprobar = (lineas = [linea]) => comprobarStockLona({ ...datos, lineas, stock, coordina, now: () => new Date(consultado) });
  return { stock, coordina, comprobar };
}

it('consulta stock fresco y manda los ML, el desglose y las faltas a CoordinaOT', async () => {
  const { stock, coordina, comprobar } = preparar();
  expect(await comprobar()).toEqual({
    consultado, faltas: [falta], avisos: [
      'No llega el stock de LONA Lona gris: necesita 42,30 m, disponible 18,75 m.',
      'Al pasar el pedido en CoordinaOT podrás mandar el correo a Compras y Almacén.',
    ],
  });
  expect(stock.reset).toHaveBeenCalledBefore(stock.getStock);
  expect(stock.getStock).toHaveBeenCalledExactlyOnceWith(['LONA']);
  expect(coordina.enviarStockLona).toHaveBeenCalledExactlyOnceWith({ ...datos,
    consultado, faltas: [falta], lonas: [{ codigo: 'LONA', descripcion: 'Lona gris', ml: 42.3, porOf: { '0290001': 42.3 } }],
  });
});

it('manda una comprobación sin faltas para reemplazar la anterior', async () => {
  const { coordina, comprobar } = preparar(43);
  expect(await comprobar()).toEqual({ consultado, faltas: [], avisos: [] });
  expect(coordina.enviarStockLona).toHaveBeenCalledWith(expect.objectContaining({ faltas: [] }));
});

it('avisa si RPS falla y no manda una comprobación a CoordinaOT', async () => {
  const { stock, coordina, comprobar } = preparar();
  stock.getStock.mockRejectedValueOnce(new Error('RPS caído'));
  expect(await comprobar()).toEqual({ consultado: null, faltas: [], avisos: ['No se pudo comprobar el stock de lona.'] });
  expect(coordina.enviarStockLona).not.toHaveBeenCalled();
});

it('conserva la falta si falla el aviso a CoordinaOT', async () => {
  const { coordina, comprobar } = preparar();
  coordina.enviarStockLona.mockResolvedValueOnce({ ok: false });
  const resultado = await comprobar();
  expect(resultado.faltas).toEqual([falta]);
  expect(resultado.avisos.at(-1)).toBe('No se pudo avisar a CoordinaOT del stock de lona.');
});

it('sin lonas que comprobar no consulta ni avisa', async () => {
  const { stock, coordina, comprobar } = preparar();
  expect(await comprobar([])).toEqual({ consultado: null, faltas: [], avisos: [] });
  expect(stock.reset).not.toHaveBeenCalled();
  expect(stock.getStock).not.toHaveBeenCalled();
  expect(coordina.enviarStockLona).not.toHaveBeenCalled();
});
