import express from 'express';
import fs from 'node:fs/promises';
import path from 'node:path';
import { beforeEach, afterEach, expect, it, vi } from 'vitest';
import { registrarRutasCmtMaquina } from './cmtMaquinaRoutes.js';
import { registrarDescargasCorte } from './corteMaquina.js';

let server, url, raiz, settings, convertir, pedido, preparar;
const bytes = Buffer.from([65, 0xe1, 0, 10]);
beforeEach(async () => {
  raiz = await fs.mkdtemp(path.resolve('tmp/cmt-maquina-rutas-'));
  await fs.mkdir(path.join(raiz, 'maquina'));
  settings = { productionEnabled: true, corteDirectoEnabled: true, corteMaquinaDxfDirectory: path.join(raiz, 'maquina/{YYYY}/DXF'), corteMaquinaCmtDirectory: path.join(raiz, 'maquina/{YYYY}') };
  convertir = vi.fn(() => ({ cmt: Buffer.from([0, 255, 128]), dudas: [] }));
  pedido = { orderCode: 'AR2600001' };
  preparar = vi.fn(async () => [{ filename: 'AR2600001-10.dxf', contents: bytes }]);
  const app = express();
  registrarRutasCmtMaquina(app, { ajustes: async () => settings, tecnicos: ['IVÁN'], carpetaRegistro: () => path.join(raiz, 'registro'), convertir, ahora: () => new Date('2026-11-13T12:00:00Z') });
  registrarDescargasCorte(app, { ruta: '/pedidos/:orderCode/corte', obtener: async () => pedido, preparar, convertir });
  app.use((e, _req, res, _next) => res.status(e.statusCode || 500).json({ error: e.message }));
  server = app.listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  url = `http://127.0.0.1:${server.address().port}`;
});
afterEach(async () => { await new Promise(resolve => server.close(resolve)); vi.restoreAllMocks(); await fs.rm(raiz, { recursive: true, force: true }); });
const enviar = (extra = {}) => fetch(url + '/api/cmt/enviar', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ nombre: 'plano manual.dxf', dxfBase64: bytes.toString('base64'), usuario: 'IVÁN', confirmBot: true, ...extra }) });

it('exige confirmar y elegir Soy, con interruptor apagado y simulación no hay archivos', async () => {
  expect((await enviar({ confirmBot: false })).status).toBe(409);
  expect((await enviar({ usuario: '' })).status).toBe(400);
  settings.corteDirectoEnabled = false;
  expect((await enviar()).status).toBe(409);
  settings.productionEnabled = false;
  expect((await enviar()).status).toBe(403);
  expect(await fs.readdir(raiz)).toEqual(['maquina']);
  expect(convertir).not.toHaveBeenCalled();
});
it('los nombres manuales se sanean; conserva bytes, año actual y registro del técnico', async () => {
  const res = await enviar({ nombre: 'C:\\carpeta\\..\\plano: prueba.DXF', sinTextos: true });
  expect(res.status).toBe(200);
  const { envio } = await res.json();
  expect(envio).toMatchObject({ usuario: 'IVÁN', fecha: '2026-11-13T12:00:00.000Z', parcial: false });
  expect(await fs.readFile(path.join(raiz, 'maquina/2026/DXF/plano_ prueba.dxf'))).toEqual(bytes);
  expect(await fs.readFile(path.join(raiz, 'maquina/2026/plano_ prueba.cmt'))).toEqual(Buffer.from([0, 255, 128]));
  expect(convertir).toHaveBeenCalledWith('Aá\0\n', { sinLeyenda: true, sinTextos: true });
  expect(JSON.parse(await fs.readFile(path.join(raiz, 'registro', `${envio.id}.json`), 'utf8'))).toEqual(envio);
});
it('dudas no escriben ni registro ni carpetas y repetir pregunta por ambos archivos', async () => {
  convertir.mockReturnValueOnce({ cmt: null, dudas: [{ motivo: 'Falta la herramienta' }] });
  const duda = await enviar();
  expect(duda.status).toBe(409);
  expect((await duda.json()).error).toContain('Falta la herramienta');
  expect(await fs.readdir(raiz)).toEqual(['maquina']);
  expect((await enviar()).status).toBe(200);
  const repetido = await enviar();
  expect(repetido.status).toBe(409);
  expect(await repetido.json()).toMatchObject({ needsConfirmation: true, existing: ['plano manual.dxf', 'plano manual.cmt'] });
  expect((await enviar({ confirmOverwrite: true })).status).toBe(200);
});
it('si falla el CMT, registra el DXF como parcial y avisa sin acudir al bot', async () => {
  const link = fs.link.bind(fs);
  vi.spyOn(fs, 'link').mockImplementation(async (de, a) => { if (a.endsWith('.cmt')) throw new Error('Disco lleno'); await link(de, a); });
  const res = await enviar();
  expect(res.status).toBe(500);
  expect((await res.json()).error).toContain('Solo una parte');
  const [nombre] = await fs.readdir(path.join(raiz, 'registro'));
  expect(JSON.parse(await fs.readFile(path.join(raiz, 'registro', nombre), 'utf8'))).toMatchObject({ parcial: true, archivos: [expect.objectContaining({ filename: 'plano manual.dxf' })] });
});
it.each(['cmt', 'descargar/dxf'])('descarga %s en simulación desde el mismo DXF, sin técnico ni escrituras', async tipo => {
  settings.productionEnabled = false;
  const res = await fetch(url + '/pedidos/AR2600001/corte/' + tipo);
  expect(res.status).toBe(200);
  expect(res.headers.get('content-disposition')).toContain(tipo === 'cmt' ? 'AR2600001.cmt' : 'AR2600001.dxf');
  expect(Buffer.from(await res.arrayBuffer())).toEqual(tipo === 'cmt' ? Buffer.from([0, 255, 128]) : bytes);
  expect(await fs.readdir(raiz)).toEqual(['maquina']);
});
it('CMT con dudas devuelve 409 en texto llano; el original enviado tiene prioridad sobre regenerar', async () => {
  pedido.enviosCorte = [{ archivos: [{ filename: 'AR2600001.dxf', dxfBase64: Buffer.from('corte enviado').toString('base64') }] }];
  convertir.mockReturnValueOnce({ cmt: null, dudas: [{ motivo: 'SPLINE desconocida', capa: 'CORTE' }] });
  const res = await fetch(url + '/pedidos/AR2600001/corte/cmt');
  expect(res.status).toBe(409);
  expect(res.headers.get('content-type')).toContain('text/plain');
  expect(await res.text()).toContain('SPLINE desconocida (capa CORTE)');
  expect(convertir).toHaveBeenCalledWith('corte enviado', { sinLeyenda: true });
  expect(preparar).not.toHaveBeenCalled();
});
it.each([{ nombre: '../.dxf' }, { nombre: 'CON.dxf' }, { nombre: '../../ar26.dxf' }])('nunca utiliza rutas o nombres reservados del fichero subido: %j', async extra => {
  expect((await enviar(extra)).status).toBe(200);
  expect(await fs.readdir(path.join(raiz, 'maquina/2026/DXF'))).toHaveLength(1);
});
it('rechaza base64 inválido y extensión incorrecta antes de convertir', async () => {
  expect((await enviar({ dxfBase64: '!!!!!' })).status).toBe(400);
  expect((await enviar({ nombre: 'archivo.cmt' })).status).toBe(400);
  expect(convertir).not.toHaveBeenCalled();
});
