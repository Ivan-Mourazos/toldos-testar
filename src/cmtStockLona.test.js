import express from 'express';
import { once } from 'node:events';
import { expect, it, vi } from 'vitest';
import { detectarStockPlano, registrarRutasStockPlano } from './cmtStockLona.js';
import { cuentaStockPlano, propuestaLonasPlano, sumarLonasPlano } from './cmt/stockPlano.ts';

const codigo = 'LAC900GR38P300';
const otro = 'LAC900AZ02P300';
const of = '0230100';
const medidasMm = { ancho: 1820, alto: 4267 };
const detectar = (nombre, carpeta = '', planoWeb = false) => detectarStockPlano(nombre, carpeta, { medidasMm, planoWeb });

it.each([
  ['corte ar2600001-2.dwg', '', 'AR2600001', 2],
  ['AR2600001.3.dxf', 'AR2600001 cliente', 'AR2600001', 3],
  ['AR2600001_4.dxf', '', 'AR2600001', 4],
  ['lona.dxf', 'Año/AR2600001_5 cliente/Subcarpeta', 'AR2600001', 5],
  ['AR2600001.dxf', '', 'AR2600001', null],
  ['AR2600001-2.dxf', 'AR2600002', '', null],
  ['AR2700001.dxf', '', 'AR2700001', null],
])('detecta el pedido y la entrega de %s en %s', (nombre, carpeta, pedido, entrega) => {
  expect(detectar(nombre, carpeta)).toEqual({ aplica: true, pedido, entrega, mlPropuesto: 4.27 });
});

it('excluye COMBURSA y los planos de la web', () => {
  expect(detectar('LOTE 05-12.dwg')).toEqual({ aplica: false, motivo: 'sin-pedido' });
  expect(detectar('AR2600001.dxf', '', true)).toEqual({ aplica: false, motivo: 'web' });
});

const tela = (codigo, reservada = false) => ({ codigo, descripcion: codigo, reservada });

it('propone por OF la reserva única, después la asignación y deja repartir si hay varias', () => {
  const proponer = telas => propuestaLonasPlano([{ of, telas }], [of], 4.27);
  expect(proponer([tela(codigo, true), tela(otro)])).toMatchObject([{ codigo, ml: 4.27, ofs: [of] }]);
  expect(proponer([tela(otro)])).toMatchObject([{ codigo: otro, ml: 4.27, ofs: [of] }]);
  expect(proponer([tela(codigo), tela(otro)])).toMatchObject([{ codigo, ml: null }, { codigo: otro, ml: null }]);
  expect(proponer([])).toMatchObject([{ codigo: '', ml: null }]);
  expect(propuestaLonasPlano([{ of, telas: [tela(codigo)] }], [of, '0230101'], 4.27))
    .toMatchObject([{ codigo, ml: null, ofs: [of] }, { codigo: '', ml: null, ofs: ['0230101'] }]);
});

it('suma la lona repetida y resta las cifras redondeadas para que cuadren', () => {
  expect(sumarLonasPlano([{ codigo, ml: 6.78, ofs: [of] }, { codigo, ml: 1.23, ofs: ['0230101'] }]))
    .toEqual([{ codigo, ml: 8.01, ofs: [of, '0230101'] }]);
  expect(cuentaStockPlano({ metros: 10.04, reservado: 1.96, reservadoPropio: 0.76 }))
    .toEqual({ stock: 10, reservado: 2, disponible: 8, reservadoPropio: 0.8 });
  expect(cuentaStockPlano({ metros: 10.05, reservado: 1.04 })).toMatchObject({ stock: 10.1, reservado: 1, disponible: 9.1 });
});

it.each(['ok', 'metros editados', 'RPS caído', 'stock caído', 'CoordinaOT caído'])('confirma el plano manual con %s', async caso => {
  const consultar = vi.fn(async () => ({ cliente: 'Cliente', ordenes: [{ of, telas: [tela(codigo)] }, { of: '0230101', telas: [] }] }));
  if (caso === 'RPS caído') consultar.mockRejectedValueOnce(new Error(caso));
  const getStock = vi.fn(async () => [{ code: codigo, metros: 10.05, reservado: 6.01, disponible: 4.04, reservadoPropio: 1 }]);
  if (caso === 'stock caído') getStock.mockRejectedValueOnce(new Error(caso));
  const enviarStockLona = vi.fn(async () => ({ ok: true }));
  if (caso === 'CoordinaOT caído') enviarStockLona.mockRejectedValueOnce(new Error(caso));
  const app = express();
  app.use(express.json());
  registrarRutasStockPlano(app, { consultar, stock: { getStock, reset: vi.fn() }, coordina: { enviarStockLona }, tecnicos: ['IVÁN'] });
  const server = app.listen(0, '127.0.0.1');
  await once(server, 'listening');
  try {
    const ml = caso === 'metros editados' ? 5.1 : 4.27;
    const respuesta = await fetch(`http://127.0.0.1:${server.address().port}/api/cmt/stock-lona`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pedido: 'AR2600001', entrega: 2, usuario: 'IVÁN', ofs: [of], mlPropuesto: 4.27, lonas: [{ codigo, ml }] }),
    });
    if (caso === 'RPS caído' || caso === 'stock caído') {
      expect(respuesta.status).toBe(503);
      expect(await respuesta.json()).toEqual({ error: 'No se pudo comprobar el stock de lona.' });
      expect(enviarStockLona).not.toHaveBeenCalled();
    } else {
      expect(respuesta.status).toBe(caso === 'CoordinaOT caído' ? 502 : 200);
      expect(getStock).toHaveBeenCalledWith([codigo], { ofs: [of, '0230101'] });
      expect(enviarStockLona).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({
        origen: 'plano-manual', consultadoPor: 'IVÁN', consultado: expect.any(String), ofs: [of],
        lonas: [expect.objectContaining({ codigo, ml, ofs: [of], origen: caso === 'metros editados' ? 'manual' : 'corte' })],
        faltas: [expect.objectContaining({ necesita: ml, stock: 10.1, reservado: 6, disponible: 4.1, reservadoPropio: 1 })],
      }));
    }
  } finally {
    await new Promise(resolve => server.close(resolve));
  }
});
