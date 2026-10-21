// @ts-expect-error El servidor usa Express en JavaScript, sin declaraciones de tipos.
import express from 'express';
import type { Server } from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import fixture from '../../corte/__fixtures__/AR2605158.json';
import baqueton from '../../corte/__fixtures__/AR2604802.json';
import mixto from '../../corte/__fixtures__/AR2605129.json';
import { crearCorteRemolques } from '../../corte/archivos.js';
import { registrarRutaVistaPreviaCorte } from '../../corte/rutas.js';
import { crearServicioPedidosRemolques } from '../servicio.ts';
import type { PedidoRemolques } from '../tipos.ts';

let raiz: string;
let server: Server;
let url: string;
let servicio: ReturnType<typeof crearServicioPedidosRemolques>;
let pedido: PedidoRemolques;
const guardar = vi.fn();
const obtener = vi.fn();
const ajustes = vi.fn();
const convertir = vi.fn();
const parametros = vi.fn();
const cuerpo = () => ({ elementos: pedido.elementos, params: pedido.params });

beforeEach(async () => {
  vi.clearAllMocks();
  await fs.mkdir('tmp', { recursive: true });
  raiz = await fs.mkdtemp(path.resolve('tmp/corte-vista-previa-'));
  await fs.writeFile(path.join(raiz, 'testigo.txt'), 'Sin cambios');
  pedido = structuredClone(fixture) as PedidoRemolques;
  parametros.mockResolvedValue(pedido.params);
  obtener.mockImplementation(async () => pedido);
  ajustes.mockResolvedValue({ productionEnabled: true, corteLonaPlanoDirectory: raiz, corteLonaDxfDirectory: raiz, corteLonaBotDirectory: raiz });
  servicio = crearServicioPedidosRemolques({
    almacen: { guardar, obtener, crear: vi.fn(), listar: vi.fn(async () => []) }, ajustes,
    parametros, tecnicos: ['IVÁN'],
    coordina: { statusOf: vi.fn(async () => ({ disponible: true })) },
    hacerPdf: vi.fn(), esPedidoDeToldos: vi.fn(async () => false),
    corte: crearCorteRemolques({ ajustes, oda: { disponible: true, convertir } }),
  });
  const app = express();
  app.use(express.json());
  registrarRutaVistaPreviaCorte(app, servicio);
  app.use((error: Error & { statusCode?: number }, _req: unknown, res: { status: (n: number) => { json: (valor: unknown) => void } }, _next: unknown) => {
    res.status(error.statusCode ?? 500).json({ error: error.message });
  });
  server = app.listen(0, '127.0.0.1');
  await new Promise<void>((resolve) => server.once('listening', resolve));
  url = `http://127.0.0.1:${(server.address() as { port: number }).port}/api/remolques/corte/vista-previa`;
});
afterEach(async () => {
  await new Promise<void>((resolve) => server.close(() => resolve()));
  await fs.rm(raiz, { recursive: true, force: true });
});

it.each([
  { tipo: 'lona', muestra: fixture, sinOf: false }, { tipo: 'lona', muestra: fixture, sinOf: true },
  { tipo: 'baquetón', muestra: baqueton, sinOf: false }, { tipo: 'baquetón', muestra: baqueton, sinOf: true },
])('calcula $tipo desde el formulario sin tocar archivos ni pedidos (sin OF: $sinOf)', async ({ muestra, sinOf }) => {
  pedido = structuredClone(muestra) as PedidoRemolques;
  if (sinOf) pedido.elementos[0].input.cabecera.ordenFabricacion = '';
  const original = structuredClone(pedido);
  const antes = await fs.stat(path.join(raiz, 'testigo.txt'));
  const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(cuerpo()) });
  expect(res.status).toBe(200);
  const json = await res.json();
  expect(obtener).not.toHaveBeenCalled();
  expect(json.cortes.length).toBeGreaterThan(0);
  expect(JSON.stringify(json)).not.toMatch(/"dxf"|"archivo"|"plano"|AC1018|AC1032/);
  if (sinOf) {
    expect(json.avisos).toContain('Elemento A: sin OF, es solo una vista previa; escribe la OF antes de guardarlo.');
    expect(JSON.stringify(json.cortes[0].entidades.textos)).toContain('SIN OF');
  } else {
    expect(json).toEqual(await servicio.corte(pedido.orderCode));
  }
  expect(guardar).not.toHaveBeenCalled();
  expect(ajustes).not.toHaveBeenCalled();
  expect(convertir).not.toHaveBeenCalled();
  expect(parametros).not.toHaveBeenCalled();
  expect(await fs.readdir(raiz)).toEqual(['testigo.txt']);
  expect((await fs.stat(path.join(raiz, 'testigo.txt'))).mtimeMs).toBe(antes.mtimeMs);
  expect(await fs.readFile(path.join(raiz, 'testigo.txt'), 'utf8')).toBe('Sin cambios');
  expect(pedido).toEqual(original);
  if (sinOf) expect(obtener).not.toHaveBeenCalled();
});

it('rechaza datos incompletos con 400 sin consultar el almacén', async () => {
  const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ elementos: [], params: pedido.params }) });
  expect(res.status).toBe(400);
  expect(obtener).not.toHaveBeenCalled();
  expect(guardar).not.toHaveBeenCalled();
});

it('exige los parámetros del formulario sin llamar a almacenes que podrían inicializar archivos', async () => {
  const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ elementos: pedido.elementos }) });
  expect(res.status).toBe(400);
  expect(parametros).not.toHaveBeenCalled();
  expect(obtener).not.toHaveBeenCalled();
});

it('conserva los cortes a mano y sus avisos también sin OF', async () => {
  pedido.elementos[0].input.cabecera.ordenFabricacion = '';
  if ('recogeAtras' in pedido.elementos[0].input) pedido.elementos[0].input.recogeAtras = 'PUENTES ESVA';
  const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(cuerpo()) });
  expect(res.status).toBe(200);
  const json = await res.json();
  expect(json.cortes).toEqual([]);
  expect(json.aMano[0].motivo).toMatch(/puentes/);
  expect(json.sinOf).toEqual(['A']);
  expect(guardar).not.toHaveBeenCalled();
});

it.each(['plano', 'descarga', 'bot', 'dxfs', 'guardar', 'preparar'] as const)('bloquea %s con 409 antes de escribir si un elemento no tiene OF', async (camino) => {
  pedido = structuredClone(mixto) as PedidoRemolques;
  pedido.elementos.at(-1)!.input.cabecera.ordenFabricacion = '  ';
  const corte = crearCorteRemolques({ ajustes, oda: { disponible: true, convertir } });
  const accion = () => camino === 'plano' ? servicio.planoCorte(pedido.orderCode)
    : camino === 'descarga' ? servicio.descargarCorte(pedido.orderCode)
      : camino === 'guardar' ? servicio.guardar({ ...cuerpo(), savedBy: 'IVÁN' })
        : camino === 'preparar' ? corte.preparar(pedido)
          : servicio.enviarCorte(pedido.orderCode, { usuario: 'IVÁN', destino: camino, confirmBot: true });
  await expect(accion()).rejects.toMatchObject({ statusCode: 409, message: expect.stringMatching(/OF/) });
  expect(guardar).not.toHaveBeenCalled();
  expect(convertir).not.toHaveBeenCalled();
  expect(await fs.readdir(raiz)).toEqual(['testigo.txt']);
});
