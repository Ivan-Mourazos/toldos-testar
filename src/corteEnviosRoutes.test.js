import express from 'express';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import fs from 'node:fs/promises';
import path from 'node:path';
import revision from './domain/corteLona/fixtures/revision-AR2604784.json' with { type: 'json' };
import { crearEstadoCorteLona } from './corteLonaEstado.js';
import { generarCorteLona } from './domain/corteLona/index.js';
import { exigirCorteAlDia, prepararArchivosCorte } from './corteLonaArchivos.js';
import { registrarRutasEnviosCorte } from './corteEnviosRoutes.js';

let server, url, raiz, pedido, settings, aprobada, guardar;
beforeEach(async () => {
  raiz = await fs.mkdtemp(path.resolve('tmp/rutas-envios-'));
  pedido = structuredClone(revision);
  pedido.order.technician = 'IVÁN';
  pedido.corteLona = crearEstadoCorteLona(pedido.order, { resultado: generarCorteLona(pedido.order, { ofStockSacos: '0230811' }), ofStockSacos: '0230811' });
  settings = { productionEnabled: true, corteLonaBotDirectory: path.join(raiz, 'bot/{TECNICO}'), corteLonaDxfDirectory: path.join(raiz, '{YYYY}/DXFs') };
  aprobada = true;
  guardar = vi.fn(async (actualizado) => { pedido = actualizado; });
  const app = express();
  app.use(express.json());
  registrarRutasEnviosCorte(app, {
    ruta: '/api/reviews/:orderCode/corte-lona', obtener: async () => pedido, ajustes: async () => settings,
    contexto: (p) => ({ order: p.order, elementos: p.order.awnings.map((a) => ({ letter: 'A', of: a.of })), comprobarCorte: () => exigirCorteAlDia(p.order, p.corteLona) }),
    preparar: async (p) => (await prepararArchivosCorte({ order: p.order, corteLona: p.corteLona, settings, tipo: 'bot' })).files,
    guardar, tecnicos: ['IVÁN'], coordina: { statusOf: async () => ({ disponible: true, ofs: { '0232568': { estado: aprobada ? 'aprobada' : 'pendiente' } } }) },
  });
  app.use((e, _req, res, _next) => res.status(e.statusCode || 500).json({ error: e.message }));
  server = app.listen(0, '127.0.0.1');
  await new Promise((resolve) => server.once('listening', resolve));
  url = `http://127.0.0.1:${server.address().port}/api/reviews/AR2604784/corte-lona/enviar`;
});
afterEach(async () => { await new Promise((resolve) => server.close(resolve)); await fs.rm(raiz, { recursive: true, force: true }); });
const enviar = (extra = {}) => fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ usuario: 'IVÁN', destino: 'dxfs', ...extra }) });

it('el pedido aprobado escribe por su acción propia y persiste el registro; repetir exige confirmación', async () => {
  expect((await enviar()).status).toBe(200);
  expect(pedido.enviosCorte[0]).toMatchObject({ usuario: 'IVÁN', destino: 'dxfs' });
  const res = await enviar();
  expect(res.status).toBe(409);
  expect((await res.json()).needsConfirmation).toBe(true);
  expect(guardar).toHaveBeenCalledTimes(1);
  expect((await enviar({ confirmOverwrite: true })).status).toBe(200);
});
it('rechaza sin aprobación, corte viejo, sin OF, usuario inventado y simulación sin archivos', async () => {
  aprobada = false;
  expect((await enviar()).status).toBe(409);
  aprobada = true;
  pedido.order.awnings[0].width += 1;
  expect((await enviar()).status).toBe(409);
  pedido.order.awnings[0].of = '';
  expect((await enviar()).status).toBe(409);
  expect((await enviar({ usuario: 'inventado' })).status).toBe(400);
  settings.productionEnabled = false;
  expect((await enviar()).status).toBe(403);
  expect(await fs.readdir(raiz)).toEqual([]);
  expect(guardar).not.toHaveBeenCalled();
});
