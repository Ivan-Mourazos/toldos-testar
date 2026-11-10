import fs from 'node:fs/promises';
import path from 'node:path';
import { afterEach, expect, it } from 'vitest';
import { catalogoEntregas, aplicarDestino } from './entregasRps.js';
import { numerarEntrega } from './entregasRps.js';
import { abrirEntrega, cerrarEntrega } from './entregas.js';
import { adjuntarPedido } from './adjuntosPedido.js';
import pdfLib from 'pdf-lib';
const raiz = path.resolve('tmp/entregas-rps-test');
afterEach(() => fs.rm(raiz, { recursive: true, force: true }));
it('lee ambas series de RPS y no modifica los históricos', async () => {
  const carpeta = path.join(raiz, '2026');
  await fs.mkdir(carpeta, { recursive: true });
  for (const n of [1, 10, 11]) await fs.writeFile(path.join(carpeta, `AR.26.03626-${n}.pdf`), 'histórico');
  const base = { orderCode: 'AR2603626', kind: 'toldos-testar-review', order: { awnings: [] } };
  const ajustes = { rpsPlanteamientosDirectory: path.join(raiz, '{YYYY}') };
  expect(await catalogoEntregas(base, ajustes)).toMatchObject({ siguiente: 2, existentes: [{ numero: 1, origen: 'Excel antiguo' }] });
  const pvc = await catalogoEntregas({ ...base, kind: 'puertas' }, ajustes);
  expect(pvc.siguiente).toBe(12);
  expect(pvc.existentes.map(e => e.numero)).toEqual([10, 11]);
  expect(await fs.readFile(path.join(carpeta, 'AR.26.03626-10.pdf'), 'utf8')).toBe('histórico');
});
it('rechaza un destino nuevo ocupado y exige confirmar una sustitución', async () => {
  const p = { orderCode: 'AR2603626', kind: 'remolques', elementos: [], entregas: [{ numero: 10, ofs: [], archivos: [], datos: {} }] };
  expect((await aplicarDestino(p, {}, { destinoEntrega: { numero: 10, modo: 'nuevo' } })).respuesta.status).toBe(409);
  expect((await aplicarDestino(p, {}, { destinoEntrega: { numero: 10, modo: 'sustituir' } })).respuesta.cuerpo.needsEntregaConfirmation).toBe(true);
  const resultado = await aplicarDestino(p, {}, { destinoEntrega: { numero: 10, modo: 'sustituir' }, confirmarEntrega: true });
  expect(resultado.pedido.entregaActual).toBe(10);
});
it('reconoce las OF del adjunto de un -10 anterior a la copia local', async () => {
  const base = { kind: 'puertas', orderCode: 'AR2603626', status: 'PENDING_REVIEW', elementos: [{ id: 'A', input: { of: '230001', frente: 200, modelo: 'PUERTAENR' } }] };
  const guardado = cerrarEntrega({ ...abrirEntrega(base), status: 'PRODUCED', production: { createdAt: '2026-11-06', createdBy: 'IVÁN', files: [{ filename: 'AR2603626-10.pdf' }] } });
  const pdf = await pdfLib.PDFDocument.create(); pdf.addPage();
  await fs.mkdir(raiz, { recursive: true });
  await fs.writeFile(path.join(raiz, 'AR.26.03626-10.pdf'), await adjuntarPedido(await pdf.save(), guardado, 'puertas'));
  const p = await numerarEntrega(abrirEntrega({ ...base, elementos: [{ ...base.elementos[0], input: { ...base.elementos[0].input, frente: 210 } }] }), { rpsPlanteamientosDirectory: raiz });
  expect(p.entregaActual).toBe(10);
  expect(p.entregas[0].ofs).toEqual(['0230001']);
  const catalogo = await catalogoEntregas(p, { rpsPlanteamientosDirectory: raiz });
  expect(catalogo.recomendado).toMatchObject({ numero: 10, modo: 'sustituir' });
});

it('una corrección solo puede sustituir su número aunque se elija otro destino', async () => {
  const base = { kind: 'puertas', orderCode: 'AR2603626', status: 'PENDING_REVIEW',
    elementos: [{ input: { of: '230001', frente: 200 } }] };
  const generado = cerrarEntrega({ ...abrirEntrega(base), status: 'PRODUCED',
    production: { createdAt: '2026-11-06', createdBy: 'IVÁN', files: [] } });
  const corregido = abrirEntrega({ ...base, elementos: [{ input: { of: '230001', frente: 210 } }] }, generado);
  corregido.entregas.push({ numero: 11, ofs: ['0230002'], archivos: [], datos: {} });
  for (const destinoEntrega of [{ numero: 12, modo: 'nuevo' }, { numero: 11, modo: 'sustituir' }]) {
    expect(await aplicarDestino(corregido, {}, { destinoEntrega, confirmarEntrega: true })).toMatchObject({
      respuesta: { status: 409, cuerpo: { error: expect.stringContaining('mismo número') } },
    });
  }
  expect(await aplicarDestino(corregido, {}, { destinoEntrega: { numero: 10, modo: 'sustituir' }, confirmarEntrega: true }))
    .toMatchObject({ pedido: { entregaActual: 10, ofsSeleccionadas: ['0230001'] } });
});

it('reconoce en RPS el sufijo de un pedido _2 sin mezclarlo con el pedido base', async () => {
  await fs.mkdir(raiz, { recursive: true });
  await fs.writeFile(path.join(raiz, 'AR.26.03626-2-1.pdf'), 'histórico del pedido _2');
  const pedido = { orderCode: 'AR2603626_2', kind: 'toldos-testar-review', order: { awnings: [] } };
  const ajustes = { rpsPlanteamientosDirectory: raiz };
  expect(await catalogoEntregas(pedido, ajustes)).toMatchObject({ siguiente: 2, existentes: [{ numero: 1 }] });
  expect(await catalogoEntregas({ ...pedido, orderCode: 'AR2603626' }, ajustes))
    .toMatchObject({ siguiente: 1, existentes: [] });
});

it.each(['toldos-testar-review', 'remolques', 'puertas'])('el PDF separado de %s conserva la entrega en curso', async kind => {
  await fs.mkdir(raiz, { recursive: true });
  const numero = kind === 'toldos-testar-review' ? 1 : 10;
  const filename = 'AR2603626-' + numero + '.pdf';
  await fs.writeFile(path.join(raiz, filename), 'PDF de la entrega en curso');
  const base = { kind, orderCode: 'AR2603626', status: 'PENDING_REVIEW', elementos: [{ input: { of: '230001', frente: 200 } }],
    entregaActual: numero, entregas: [], destinoEntrega: { numero, modo: 'nuevo' }, production: { files: [{ type: 'pdf', filename }] } };
  const datos = await catalogoEntregas(base, { planteamientosDirectory: raiz });
  expect(datos.recomendado).toEqual({ numero, modo: 'sustituir' });
  const destino = await aplicarDestino(base, { planteamientosDirectory: raiz }, { destinoEntrega: datos.recomendado, confirmarEntrega: true });
  expect(destino.pedido.entregaActual).toBe(numero);
  expect(destino.pedido.ofsSeleccionadas).toEqual(['0230001']);
});
