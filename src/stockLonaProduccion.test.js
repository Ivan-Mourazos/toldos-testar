import { expect, it, vi } from 'vitest';
import { comprobarStockLona, pasarAProduccionConStock } from './stockLonaProduccion.js';

const consultado = '2026-11-23T10:00:00.000Z';
const datos = { pedido: 'AR2600001', entrega: 11, cliente: 'Cliente', ofs: ['0290001', '0290002'], consultadoPor: 'IVÁN' };
const linea = { ofs: ['0290001'], codigo: 'LAC900GR38P300', descripcion: 'Lona gris', ml: 42.3, origen: 'corte' };
const falta = { codigo: linea.codigo, descripcion: linea.descripcion, necesita: 42.3, disponible: 18.75, ofs: linea.ofs };
function preparar(disponible = 18.75) {
  const stock = { reset: vi.fn(), getStock: vi.fn(async () => [{ code: linea.codigo, disponible }]) };
  const coordina = { enviarStockLona: vi.fn(async () => ({ ok: true })) };
  const opciones = { ...datos, lineas: [linea], stock, coordina, now: () => new Date(consultado) };
  const comprobar = (lineas = [linea], lonasAprobadas) => comprobarStockLona({ ...opciones, lineas, lonasAprobadas });
  return { stock, coordina, comprobar, opciones };
}

it('consulta stock fresco y manda la entrega, los metros y las OF de cada lona a CoordinaOT', async () => {
  const { stock, coordina, comprobar } = preparar();
  expect(await comprobar()).toEqual({
    consultado, faltas: [falta], avisos: [
      'No llega el stock de LAC900GR38P300 Lona gris: necesita 42,30 m, disponible 18,75 m.',
      'Al pasar el pedido en CoordinaOT podrás mandar el correo a Compras y Almacén.',
    ],
  });
  expect(stock.reset).toHaveBeenCalledBefore(stock.getStock);
  expect(stock.getStock).toHaveBeenCalledExactlyOnceWith([linea.codigo]);
  expect(coordina.enviarStockLona).toHaveBeenCalledExactlyOnceWith({ ...datos,
    consultado, faltas: [falta], lonas: [linea],
  });
});

it.each(['corte', 'reserva'])('conserva el origen %s al aprobar los metros y OF propuestos', async origen => {
  const { coordina, comprobar } = preparar();
  await comprobar([{ ...linea, origen }], [{ codigo: linea.codigo, ml: linea.ml, ofs: linea.ofs }]);
  expect(coordina.enviarStockLona).toHaveBeenCalledWith(expect.objectContaining({
    lonas: [{ ...linea, origen, descripcion: 'LONA LAC900 2L 900G :GRIS CLARO 7374 RAL7038 :300AN' }],
  }));
});

it('usa los metros corregidos, descarta las filas quitadas y añade telas con las OF de la entrega por defecto', async () => {
  const { stock, coordina, comprobar } = preparar();
  const quitada = { ...linea, codigo: 'LAC900AZ02P300' };
  await comprobar([linea, quitada], [{ codigo: linea.codigo, ml: 20.125 }, { codigo: 'LAC900AZ10P300', ml: 5 }]);
  expect(stock.getStock).toHaveBeenCalledExactlyOnceWith([linea.codigo, 'LAC900AZ10P300']);
  expect(coordina.enviarStockLona).toHaveBeenCalledWith(expect.objectContaining({
    lonas: [
      { codigo: linea.codigo, ml: 20.125, origen: 'manual', ofs: linea.ofs, descripcion: expect.stringContaining('RAL7038') },
      { codigo: 'LAC900AZ10P300', ml: 5, origen: 'manual', ofs: datos.ofs, descripcion: expect.stringContaining('RAL5010') },
    ],
    faltas: [
      { codigo: linea.codigo, necesita: 20.125, disponible: 18.75, ofs: linea.ofs, descripcion: expect.stringContaining('RAL7038') },
      { codigo: 'LAC900AZ10P300', necesita: 5, disponible: 0, ofs: datos.ofs, descripcion: expect.stringContaining('RAL5010') },
    ],
  }));
});

it('permite quitar toda la propuesta sin consultar stock', async () => {
  const { stock, coordina, comprobar } = preparar();
  await comprobar([linea], []);
  expect(stock.getStock).not.toHaveBeenCalled();
  expect(coordina.enviarStockLona).toHaveBeenCalledExactlyOnceWith({ ...datos, consultado, lonas: [], faltas: [] });
});

it.each([
  [null], [1], [[null]], [[{ codigo: 'MAL FORMATO', ml: 1 }]], [[{ codigo: 'INEXISTENTE', ml: 1 }]],
  [[{ codigo: linea.codigo, ml: 0 }]], [[{ codigo: linea.codigo, ml: -1 }]], [[{ codigo: linea.codigo, ml: '4' }]],
  [[{ codigo: linea.codigo, ml: Infinity }]], [[{ codigo: linea.codigo, ml: 4, ofs: ['0290003'] }]],
  [[{ codigo: linea.codigo, ml: 4, ofs: '0290001' }]], [[{ codigo: linea.codigo, ml: 4 }, { codigo: linea.codigo, ml: 3 }]],
])('rechaza la lista inválida %j antes de consultar o preparar archivos', async lonasAprobadas => {
  const { stock, coordina, opciones } = preparar();
  const paso = { nombre: 'PDF', preparar: vi.fn() };
  await expect(pasarAProduccionConStock([paso], { ...opciones, lonasAprobadas })).rejects.toMatchObject({ statusCode: 400 });
  expect(stock.reset).not.toHaveBeenCalled();
  expect(stock.getStock).not.toHaveBeenCalled();
  expect(coordina.enviarStockLona).not.toHaveBeenCalled();
  expect(paso.preparar).not.toHaveBeenCalled();
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

it('dice el motivo cuando CoordinaOT rechaza el aviso', async () => {
  const { coordina, comprobar } = preparar();
  coordina.enviarStockLona.mockResolvedValueOnce({ ok: false, motivo: 'CoordinaOT respondió 400: Stock de lona no válido' });
  const resultado = await comprobar();
  expect(resultado.avisos.at(-1)).toBe('No se pudo avisar a CoordinaOT del stock de lona (CoordinaOT respondió 400: Stock de lona no válido).');
});

it('sin lonas que comprobar no consulta ni avisa', async () => {
  const { stock, coordina, comprobar } = preparar();
  expect(await comprobar([])).toEqual({ consultado: null, faltas: [], avisos: [] });
  expect(stock.reset).not.toHaveBeenCalled();
  expect(stock.getStock).not.toHaveBeenCalled();
  expect(coordina.enviarStockLona).not.toHaveBeenCalled();
});

it('quita de cada lona las OF que no son de la entrega antes de avisar a CoordinaOT', async () => {
  const { coordina, comprobar } = preparar();
  await comprobar([{ ...linea, ofs: ['0290001', '0299999'] }, { ...linea, codigo: 'LAC900AZ02P300', ofs: ['0299999'] }]);
  const { lonas, faltas } = coordina.enviarStockLona.mock.calls[0][0];
  expect(lonas.map(l => l.ofs)).toEqual([['0290001'], datos.ofs]);
  expect(faltas[0].ofs).toEqual(['0290001']);
});
