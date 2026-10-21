import { afterEach, beforeEach, expect, it } from 'vitest';
import fs from 'node:fs/promises';
import path from 'node:path';
import pdfLib from 'pdf-lib';
import fixture from '../../corte/__fixtures__/AR2605132.json';
import { crearCorteRemolques } from '../../corte/archivos.js';
import { crearAlmacenPedidosRemolques } from '../almacen.ts';
import { crearServicioPedidosRemolques } from '../servicio.ts';
import type { PedidoRemolques } from '../tipos.ts';

let raiz: string;
let activa: boolean;
let aprobada: boolean;
let servicio: ReturnType<typeof crearServicioPedidosRemolques>;
let almacen: ReturnType<typeof crearAlmacenPedidosRemolques>;
beforeEach(async () => {
  await fs.mkdir(path.resolve('tmp'), { recursive: true });
  raiz = await fs.mkdtemp(path.resolve('tmp/remolques-envios-'));
  activa = true;
  aprobada = true;
  almacen = crearAlmacenPedidosRemolques({ carpeta: async () => path.join(raiz, 'pedidos') });
  await almacen.guardar(structuredClone(fixture) as PedidoRemolques);
  const ajustes = async () => ({ productionEnabled: activa, corteLonaBotDirectory: path.join(raiz, 'bot/{TECNICO}'),
    corteLonaPlanoDirectory: path.join(raiz, 'planos'), corteLonaDxfDirectory: path.join(raiz, '{YYYY}/DXFs'),
    remolquesPlanteamientosDirectory: path.join(raiz, 'pdf'), remolquesOficinaTecnicaDirectory: path.join(raiz, '{YYYY}/oficina') });
  servicio = crearServicioPedidosRemolques({ almacen, ajustes, parametros: async () => fixture.params,
    coordina: { statusOf: async (ofs) => ({ disponible: true, ofs: Object.fromEntries(ofs.map((of) => [of, { estado: aprobada ? 'aprobada' : 'en_revision' }])) }) },
    tecnicos: ['IVÁN'], hacerPdf: async () => { const pdf = await pdfLib.PDFDocument.create(); pdf.addPage(); return pdf.save(); },
    esPedidoDeToldos: async () => false, corte: crearCorteRemolques({ ajustes, oda: { disponible: false } }),
  });
});
afterEach(async () => { await fs.rm(raiz, { recursive: true, force: true }); });

it('descarga el DXF sin ODA ni carpetas y sin registrar un envío', async () => {
  const dxf = await servicio.descargarCorte(fixture.orderCode);
  expect(dxf.filename).toBe('AR2605132.dxf');
  expect(Buffer.from(dxf.contents).toString('latin1')).toContain('AC1018');
  expect((await servicio.obtener(fixture.orderCode)).enviosCorte).toBeUndefined();
});
it('el envío del remolque usa las comprobaciones comunes, crea DXFs y registra el historial', async () => {
  const cuerpo = { usuario: 'IVÁN', destino: 'dxfs' };
  expect((await servicio.enviarCorte(fixture.orderCode, cuerpo)).status).toBe(200);
  expect((await servicio.obtener(fixture.orderCode)).enviosCorte?.[0].destino).toBe('dxfs');
  expect((await servicio.enviarCorte(fixture.orderCode, cuerpo)).status).toBe(409);
  expect((await servicio.enviarCorte(fixture.orderCode, { ...cuerpo, confirmOverwrite: true })).status).toBe(200);
  expect((await servicio.obtener(fixture.orderCode)).enviosCorte).toHaveLength(2);
});
it('ni sin aprobación, ni sin OF, ni en simulación se manda el corte; no se crea la carpeta del bot', async () => {
  const cuerpo = { usuario: 'IVÁN', destino: 'bot', confirmBot: true };
  aprobada = false;
  await expect(servicio.enviarCorte(fixture.orderCode, cuerpo)).rejects.toMatchObject({ statusCode: 409 });
  aprobada = true;
  await expect(servicio.enviarCorte(fixture.orderCode, cuerpo)).rejects.toThrow(/Ivan.Sanchez/);
  expect(await fs.stat(path.join(raiz, 'bot')).catch(() => null)).toBeNull();
  activa = false;
  await expect(servicio.enviarCorte(fixture.orderCode, cuerpo)).rejects.toMatchObject({ statusCode: 403 });
  const pedido = await servicio.obtener(fixture.orderCode);
  pedido.elementos[0].input.cabecera.ordenFabricacion = '';
  await almacen.guardar(pedido);
  await expect(servicio.descargarCorte(fixture.orderCode)).rejects.toThrow(/OF/);
});
it('el corte también se puede enviar después de generar los PDF y queda registrado', async () => {
  await fs.mkdir(path.join(raiz, 'pdf'), { recursive: true });
  await servicio.generar(fixture.orderCode, {});
  const pedido = await servicio.obtener(fixture.orderCode);
  expect(pedido.production?.corte).toBeUndefined();
  expect((await servicio.enviarCorte(fixture.orderCode, { usuario: 'IVÁN', destino: 'dxfs' })).status).toBe(200);
  expect((await servicio.obtener(fixture.orderCode)).status).toBe('PRODUCED');
});
