import express from 'express';
import { once } from 'node:events';
import { expect, it, vi } from 'vitest';
import { detectarStockPlano, proponerLonasPlano, registrarRutasStockPlano } from './cmtStockLona.js';
import { cuentaStockPlano, sumarLonasPlano } from './cmt/stockPlano.ts';

const codigo = 'LAC900GR38P300';
const otro = 'LAC900AZ02P300';
const of = '0230100';
const tramosMm = [{ anchoMm: 4267, altoMm: 1820, largoMm: 4267, porCota: true, textos: ['PVC 900 GRIS'] }];
const detectar = (nombre, carpeta = '', planoWeb = false) => detectarStockPlano(nombre, carpeta, { tramos: tramosMm, planoWeb });
const tramo = (largoM, textos = []) => ({ largoM, altoCm: 182, textos });

it.each([
  ['corte ar2600001-2.dwg', '', 'AR2600001'],
  ['lona.dxf', 'Año/AR2600001_5 cliente/Subcarpeta', 'AR2600001'],
  ['AR2600001-2.dxf', 'AR2600002', ''],
  ['AR2700001.dxf', '', 'AR2700001'],
])('detecta el pedido de %s en %s y pasa los tramos a m y cm', (nombre, carpeta, pedido) => {
  expect(detectar(nombre, carpeta)).toEqual({ aplica: true, pedido, tramos: [{ largoM: 4.27, altoCm: 182, textos: ['PVC 900 GRIS'] }] });
});

it('excluye COMBURSA y los planos de la web', () => {
  expect(detectar('LOTE 05-12.dwg')).toEqual({ aplica: false, motivo: 'sin-pedido' });
  expect(detectar('AR2600001.dxf', '', true)).toEqual({ aplica: false, motivo: 'web' });
});

const tela = (codigo, reservada = false) => ({ codigo, descripcion: codigo, reservada });
const buscar = vi.fn(async consulta => consulta.includes('AZUL') ? [{ code: otro, description: otro, width: 300 }]
  : [{ code: codigo, description: codigo, width: 300 }]);

it('propone la lona escrita en cada tramo y suma sus ML', async () => {
  const ordenes = [{ of, telas: [] }];
  expect(await proponerLonasPlano({ tramos: [tramo(12.09, ['PVC 900 GRIS']), tramo(3, ['PVC 900 AZUL']), tramo(1, ['PVC 900 GRIS'])], ordenes, buscar }))
    .toEqual([{ codigo, descripcion: codigo, ml: 13.09 }, { codigo: otro, descripcion: otro, ml: 3 }]);
});

it('un tramo sin lona escrita va con la única leída, la única del pedido o queda por elegir', async () => {
  const sinTexto = tramo(2);
  expect(await proponerLonasPlano({ tramos: [tramo(5, ['PVC 900 GRIS']), sinTexto], ordenes: [{ of, telas: [] }], buscar }))
    .toEqual([{ codigo, descripcion: codigo, ml: 7 }]);
  expect(await proponerLonasPlano({ tramos: [sinTexto], ordenes: [{ of, telas: [tela(otro)] }], buscar }))
    .toEqual([{ codigo: otro, descripcion: otro, ml: 2 }]);
  expect(await proponerLonasPlano({ tramos: [sinTexto], ordenes: [{ of, telas: [tela(codigo), tela(otro)] }], buscar }))
    .toEqual([{ codigo: '', descripcion: '', ml: 2 }]);
});

it('suma la lona repetida y resta las cifras redondeadas para que cuadren', () => {
  expect(sumarLonasPlano([{ codigo, ml: 6.78 }, { codigo, ml: 1.23 }, { codigo: '', ml: 2 }, { codigo: otro, ml: null }]))
    .toEqual([{ codigo, ml: 8.01 }]);
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
  registrarRutasStockPlano(app, { consultar, buscar, stock: { getStock, reset: vi.fn() }, coordina: { enviarStockLona }, tecnicos: ['IVÁN'] });
  const server = app.listen(0, '127.0.0.1');
  await once(server, 'listening');
  try {
    const ml = caso === 'metros editados' ? 5.1 : 4.27;
    const tramos = [tramo(4.27, ['PVC 900 GRIS'])];
    const respuesta = await fetch(`http://127.0.0.1:${server.address().port}/api/cmt/stock-lona`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pedido: 'AR2600001', usuario: 'IVÁN', tramos, lonas: [{ codigo, ml }] }),
    });
    if (caso === 'RPS caído' || caso === 'stock caído') {
      expect(respuesta.status).toBe(503);
      expect(await respuesta.json()).toEqual({ error: 'No se pudo comprobar el stock de lona.' });
      expect(enviarStockLona).not.toHaveBeenCalled();
    } else {
      expect(respuesta.status).toBe(caso === 'CoordinaOT caído' ? 502 : 200);
      expect(getStock).toHaveBeenCalledWith([codigo], { ofs: [of, '0230101'] });
      expect(enviarStockLona).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({
        origen: 'plano-manual', consultadoPor: 'IVÁN', consultado: expect.any(String), ofs: [of, '0230101'], entrega: null,
        lonas: [expect.objectContaining({ codigo, ml, ofs: [of], origen: caso === 'metros editados' ? 'manual' : 'corte' })],
        faltas: [expect.objectContaining({ necesita: ml, stock: 10.1, reservado: 6, disponible: 4.1, reservadoPropio: 1 })],
      }));
    }
  } finally {
    await new Promise(resolve => server.close(resolve));
  }
});

it('la propuesta del modal da el cliente, todas las OF y las lonas; rechaza tramos raros', async () => {
  const consultar = vi.fn(async () => ({ cliente: 'Cliente', ordenes: [{ of: '0230101', telas: [] }, { of, telas: [] }] }));
  const app = express();
  app.use(express.json());
  registrarRutasStockPlano(app, { consultar, buscar, tecnicos: ['IVÁN'] });
  const server = app.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const pedir = cuerpo => fetch(`http://127.0.0.1:${server.address().port}/api/cmt/stock-lona/propuesta`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(cuerpo),
  });
  try {
    const respuesta = await pedir({ pedido: 'AR2605626', tramos: [tramo(12.09, ['PVC 900 GRIS'])] });
    expect(respuesta.status).toBe(200);
    expect(await respuesta.json()).toEqual({ cliente: 'Cliente', ofs: [of, '0230101'], lonas: [{ codigo, descripcion: codigo, ml: 12.09 }] });
    expect((await pedir({ pedido: 'AR2605626', tramos: [tramo(-1)] })).status).toBe(400);
    expect((await pedir({ pedido: 'AR26', tramos: [] })).status).toBe(400);
    consultar.mockRejectedValueOnce(new Error('RPS caído'));
    expect((await pedir({ pedido: 'AR2605626', tramos: [] })).status).toBe(503);
  } finally {
    await new Promise(resolve => server.close(resolve));
  }
});
