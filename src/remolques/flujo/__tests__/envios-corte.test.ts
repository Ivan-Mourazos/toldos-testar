import { afterEach, beforeEach, expect, it, vi } from 'vitest';
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

it('pasar a producción guarda PDF y plano y manda al bot; solo entonces cierra la entrega', async () => {
  await fs.mkdir(path.join(raiz, 'pdf'), { recursive: true });
  await fs.mkdir(path.join(raiz, 'bot/Ivan.Sanchez'), { recursive: true });
  const r = await servicio.produccion(fixture.orderCode, { savedBy: 'IVÁN', confirmBot: true });
  expect(r).toMatchObject({ status: 200, cuerpo: { hechos: ['PDF', 'Plano', 'DXF al bot'] } });
  const p = await servicio.obtener(fixture.orderCode);
  expect(p.status).toBe('PRODUCED');
  expect(p.enviosCorte).toHaveLength(1);
  expect(await fs.readFile(path.join(raiz, 'bot/Ivan.Sanchez/AR2605132.dxf'), 'utf8')).toContain('AC1018');
  expect((await fs.readdir(path.join(raiz, 'pdf'))).some(f => f.endsWith('-10.pdf'))).toBe(true);
  expect((await fs.readdir(path.join(raiz, 'planos'))).some(f => f.endsWith('.dxf'))).toBe(true);
});
it('bot inexistente o plano pendiente de sobrescribir no deja PDF ni cierra la entrega', async () => {
  await fs.mkdir(path.join(raiz, 'pdf'), { recursive: true });
  await expect(servicio.produccion(fixture.orderCode, { savedBy: 'IVÁN', confirmBot: true })).rejects.toThrow(/carpeta del bot/);
  expect(await fs.readdir(path.join(raiz, 'pdf'))).toEqual([]);
  expect((await servicio.obtener(fixture.orderCode)).status).not.toBe('PRODUCED');
  await fs.mkdir(path.join(raiz, 'bot/Ivan.Sanchez'), { recursive: true });
  await servicio.planoCorte(fixture.orderCode);
  const r = await servicio.produccion(fixture.orderCode, { savedBy: 'IVÁN', confirmBot: true });
  expect(r).toMatchObject({ status: 409, cuerpo: { paso: 'Plano', needsConfirmation: true } });
  expect(await fs.readdir(path.join(raiz, 'pdf'))).toEqual([]);
  expect(await fs.readdir(path.join(raiz, 'bot/Ivan.Sanchez'))).toEqual([]);
});
it('un PDF separado conserva el pedido pendiente y no manda DXF', async () => {
  await fs.mkdir(path.join(raiz, 'pdf'), { recursive: true });
  expect((await servicio.generar(fixture.orderCode, { savedBy: 'IVÁN', soloPdf: true })).status).toBe(200);
  const p = await servicio.obtener(fixture.orderCode);
  expect(p.status).not.toBe('PRODUCED');
  expect(p.enviosCorte).toBeUndefined();
});

it('el bot pendiente de sobrescribir no publica PDF; si cae al escribir, informa sin cerrar la entrega', async () => {
  await fs.mkdir(path.join(raiz, 'pdf'), { recursive: true });
  const carpeta = path.join(raiz, 'bot/Ivan.Sanchez');
  await fs.mkdir(carpeta, { recursive: true });
  await fs.writeFile(path.join(carpeta, 'AR2605132.dxf'), 'corte anterior');
  expect(await servicio.produccion(fixture.orderCode, { savedBy: 'IVÁN', confirmBot: true }))
    .toMatchObject({ status: 409, cuerpo: { paso: 'DXF al bot', needsConfirmation: true } });
  expect(await fs.readdir(path.join(raiz, 'pdf'))).toEqual([]);
  await fs.unlink(path.join(carpeta, 'AR2605132.dxf'));
  const enlazar = fs.link.bind(fs);
  const fallo = vi.spyOn(fs, 'link').mockImplementation(async (origen, destino) => {
    if (path.dirname(String(destino)) === carpeta) throw new Error('Bot sin conexión');
    return enlazar(origen, destino);
  });
  try {
    expect(await servicio.produccion(fixture.orderCode, { savedBy: 'IVÁN', confirmBot: true }))
      .toMatchObject({ status: 500, cuerpo: { hechos: ['PDF', 'Plano'], pendientes: ['DXF al bot'], error: expect.stringContaining('Bot sin conexión') } });
    expect((await servicio.obtener(fixture.orderCode)).status).not.toBe('PRODUCED');
  } finally { fallo.mockRestore(); }
});
