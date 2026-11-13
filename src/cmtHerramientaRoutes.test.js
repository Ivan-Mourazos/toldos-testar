import express from 'express';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { registrarRutasCmtHerramienta, resumirObjetos } from './cmtHerramientaRoutes.js';

let server, url, convertir;
const punto = (x, y, type = 4) => ({ x, y, type });
beforeEach(async () => {
  convertir = vi.fn(() => ({ cmt: Buffer.from([0, 255, 128, 10]), objetos: [
    { tool: 'CM-CUTW-Def', paths: [[punto(72, 144, 0), punto(144, 216)]] },
    { tool: 'CM-CUTW-Def', paths: [[punto(144, 144, 0)]] },
    { tool: '', paths: [[punto(72, 144, 0)]] },
  ], avisos: [], dudas: [] }));
  const app = express();
  // El límite de la herramienta debe actuar antes del parser general del servidor.
  registrarRutasCmtHerramienta(app, { convertir });
  app.use(express.json({ limit: '20mb' }));
  server = app.listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  url = `http://127.0.0.1:${server.address().port}/api/cmt/convertir`;
});
afterEach(async () => { await new Promise(resolve => server.close(resolve)); });
const entrada = (extra = {}) => ({ nombre: 'corte.dxf', dxfBase64: Buffer.from('DXF á').toString('base64'), ...extra });
const post = body => fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });

describe('DXF a CMT en memoria, sin usuario ni permisos de escritura', () => {
  it('conserva bytes, excluye leyenda y pasa sinTextos al conversor inyectado', async () => {
    const res = await post(entrada({ sinTextos: true, nombre: 'C:\\carpeta\\..\\corte.dxf' }));
    expect(res.status).toBe(200);
    expect(convertir).toHaveBeenCalledWith('DXF á', { sinLeyenda: true, sinTextos: true });
    expect(await res.json()).toEqual({ ok: true, nombre: 'corte.cmt', cmtBase64: 'AP+ACg==', avisos: [], dudas: [], resumen: {
      objetos: 3, porHerramienta: [
        { herramienta: 'CM-CUTW-Def', etiqueta: 'Disco 1', trazos: 2 },
        { herramienta: '', etiqueta: 'Sin herramienta', trazos: 1 },
      ], anchoMm: 25.4, altoMm: 25.4,
    } });
  });
  it('decodifica Windows-1252 y desactiva sinTextos por defecto', async () => {
    await post(entrada({ dxfBase64: Buffer.from([0xe1]).toString('base64'), nombre: '../../corte.DXF' }));
    expect(convertir).toHaveBeenCalledWith('á', { sinLeyenda: true, sinTextos: false });
  });
  it('deduplica avisos y dudas, y nunca entrega un CMT parcial si hay dudas', async () => {
    const duda = { motivo: 'Texto no admitido', capa: 'texto', handle: 'A1', tipo: 'MTEXT' };
    convertir.mockReturnValue({ cmt: Buffer.from('parcial'), objetos: [], avisos: [duda, duda], dudas: [duda, duda] });
    const json = await (await post(entrada())).json();
    expect(json).toMatchObject({ ok: false, cmtBase64: null, dudas: ['Texto no admitido (capa texto, entidad A1)'], avisos: ['Texto no admitido (capa texto, entidad A1)'] });
    expect(json.resumen).toEqual({ objetos: 0, porHerramienta: [], anchoMm: 0, altoMm: 0 });
  });
  it('no enseña al técnico los avisos internos del conversor', async () => {
    const r = convertir();
    convertir.mockReturnValue({ ...r, avisos: [{ motivo: 'Se reproduce el redondeo SVG del robot (seis cifras, 96 dpi); compatibilidadRobot:false conserva la precisión del DXF y puede mostrar rellenos distintos' }] });
    expect((await (await post(entrada())).json()).avisos).toEqual([]);
  });
  it.each([
    {}, entrada({ nombre: 'corte.txt' }), entrada({ dxfBase64: '!!!' }), entrada({ dxfBase64: '' }),
    entrada({ sinTextos: 'true' }), entrada({ nombre: 42 }),
  ])('rechaza entradas incompletas o inválidas: %j', async body => {
    expect((await post(body)).status).toBe(400);
    expect(convertir).not.toHaveBeenCalled();
  });
  it('admite más de 1 MB sin depender del límite JSON por defecto', async () => {
    expect((await post(entrada({ dxfBase64: Buffer.alloc(2 * 1024 * 1024, 65).toString('base64') }))).status).toBe(200);
  });
  it('rechaza más de 30 MB de fichero con un error claro', async () => {
    const res = await post(entrada({ dxfBase64: Buffer.alloc(30 * 1024 * 1024 + 1).toString('base64') }));
    expect(res.status).toBe(413);
    expect((await res.json()).error).toContain('30 MB');
    expect(convertir).not.toHaveBeenCalled();
  });
  it('devuelve JSON con un error claro cuando se supera el límite del cuerpo', async () => {
    const res = await post({ relleno: 'x'.repeat(42 * 1024 * 1024) });
    expect(res.status).toBe(413);
    expect((await res.json()).error).toContain('30 MB');
  });
  it('devuelve un fallo del conversor en texto legible', async () => {
    convertir.mockImplementation(() => { throw new Error('DXF incompleto'); });
    const res = await post(entrada());
    expect(res.status).toBe(422);
    expect((await res.json()).error).toContain('DXF incompleto');
  });
  it('mide la curva y no su polígono de control', () => {
    const resumen = resumirObjetos([{ tool: 'CM-PEN-Def', paths: [[punto(0, 0, 0), punto(0, 72, 1), punto(72, 72, 2), punto(72, 0, 3)]] }]);
    expect(resumen.anchoMm).toBeCloseTo(25.4);
    expect(resumen.altoMm).toBeCloseTo(19.05);
    expect(resumen.porHerramienta[0].etiqueta).toBe('Rotulador');
  });
});
