import express from 'express';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import revision from './domain/corteLona/fixtures/revision-AR2604784.json' with { type: 'json' };
import { registrarRutasCorteLona } from './corteLonaRoutes.js';
import { crearOdaConverter } from './odaConverter.js';
import fs from 'node:fs/promises';
import path from 'node:path';

let server, url, getReview, convertir, oda;
const temporal = path.resolve('tmp/oda-rutas-tests');
const stock = async () => ({ of: '0230811', origen: 'defecto', avisos: ['OF de stock por defecto.'] });
beforeEach(async () => {
  getReview = vi.fn(async () => revision);
  convertir = vi.fn();
  oda = { disponible: false, convertir };
  const app = express();
  app.use(express.json());
  registrarRutasCorteLona(app, { workflowStore: { getReview }, ofStockSacos: stock, oda });
  app.use((error, _req, res, _next) => res.status(error.statusCode || 400).json({ error: error.message }));
  server = app.listen(0, '127.0.0.1');
  await new Promise((resolve) => server.once('listening', resolve));
  url = `http://127.0.0.1:${server.address().port}`;
});
afterEach(async () => {
  await new Promise((resolve) => server.close(resolve));
  await fs.rm(temporal, { recursive: true, force: true });
});
const post = (ruta, body) => fetch(url + ruta, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });

describe('Rutas del corte de lona, sin escribir archivos de producción', () => {
  it('devuelve AR2604784 con largos, piezas, sacos y dibujo, sin DXF enteros', async () => {
    const res = await post('/api/corte-lona', { order: revision.order });
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.modelos).toEqual(['GALICIA']);
    expect(json.avisos).toContain('OF de stock por defecto.');
    expect(json.cortes.conSacos[0]).toMatchObject({ largo: 4850, anchoRollo: 2500 });
    expect(json.cortes.conSacos[0].piezas[0].piezas.map((p) => p.nombre)).toEqual(['A', 'A BAMBA']);
    expect(json.cortes.conSacos[0].sacos).toEqual(expect.any(Array));
    expect(json.cortes.conSacos[0].dibujo.lineas.length).toBeGreaterThan(0);
    expect(json.cortes.conSacos[0].dibujo.textos.length).toBeGreaterThan(0);
    expect(json.corteLona.toldos).toHaveLength(1);
    expect(JSON.stringify(json)).not.toMatch(/AC1018|AC1032|"dxf"/);
    getReview.mockResolvedValue({ ...revision, corteLona: json.corteLona });
    const revisor = await fetch(url + '/api/reviews/AR2604784/corte-lona');
    expect((await revisor.json()).pendientes).toEqual([]);
  });
  it('devuelve los tres toldos A/B/C y sus OF', async () => {
    const order = structuredClone(revision.order);
    order.awnings.push(
      { ...order.awnings[0], id: 'toldo-b', of: '0232569', width: 380, projection: 150, armCount: 2 },
      { ...order.awnings[0], id: 'toldo-c', of: '0232570', width: 600, projection: 250, valanceHeight: 20 }
    );
    const json = await (await post('/api/corte-lona', { order })).json();
    expect(json.cortes.conSacos[0].piezas.map((p) => p.letra)).toEqual(['A', 'B', 'C']);
    expect(json.corteLona.toldos.map((t) => t.of)).toEqual(['0232568', '0232569', '0232570']);
    expect(json.cortes.trozoSeparado[0].largo).toBeLessThanOrEqual(json.cortes.conSacos[0].largo);
  });
  it('descarga DXF 2004 latin1 y plano DXF 2018 con aviso sin ODA', async () => {
    const preview = await (await post('/api/corte-lona', { order: revision.order })).json();
    const material = preview.cortes.conSacos[0].idMaterial;
    const dxf = await post('/api/corte-lona/dxf', { order: revision.order, material, opcion: 'conSacos' });
    expect(dxf.headers.get('content-disposition')).toContain('AR2604784 (con sacos).dxf');
    const contenido = Buffer.from(await dxf.arrayBuffer());
    expect(contenido.toString('latin1')).toContain('AC1018');
    expect(contenido.toString('latin1')).toContain('REVÉS');
    const plano = await post('/api/corte-lona/plano', { order: revision.order, material });
    expect(plano.headers.get('content-disposition')).toContain('AR2604784 (plano).dxf');
    expect(plano.headers.get('x-corte-lona-aviso')).toContain('ODA');
    expect(await plano.text()).toContain('AC1032');
    expect(convertir).not.toHaveBeenCalled();
  });
  it('descarga la opción de trozo separado y recalcula los ajustes guardados del revisor', async () => {
    const order = structuredClone(revision.order);
    order.awnings[0].projection = 350;
    order.awnings[0].width = 700;
    const ajustes = { A: { empate: 'vertical', varillaArriba: 'VARILLA BLANCA PERSONALIZADA' } };
    const preview = await (await post('/api/corte-lona', { order, ajustes })).json();
    getReview.mockResolvedValue({ ...revision, order, corteLona: preview.corteLona });
    const body = { order, ajustes, material: preview.cortes.conSacos[0].codigoTela, opcion: 'conSacos' };
    const directo = await post('/api/corte-lona/dxf', body);
    const guardado = await fetch(url + `/api/reviews/AR2604784/corte-lona/dxf?material=${encodeURIComponent(body.material)}&opcion=conSacos`);
    expect(await guardado.text()).toBe(await directo.text());
    expect(getReview).toHaveBeenCalledWith('AR2604784');
    const plano = await fetch(url + '/api/reviews/AR2604784/corte-lona/plano');
    expect(await plano.text()).toContain('VARILLA BLANCA PERSONALIZADA');
    const separado = await post('/api/corte-lona/dxf', { order, material: body.material, opcion: 'trozoSeparado' });
    expect(separado.status).toBe(200);
    expect(separado.headers.get('content-disposition')).toContain('(trozo separado).dxf');
    expect(await separado.text()).toContain('CORTAR DE RESTOS');
  });
  it('convierte el plano por ODA falso y descarga DWG 2018', async () => {
    const app = express();
    app.use(express.json());
    registrarRutasCorteLona(app, { workflowStore: { getReview }, ofStockSacos: stock,
      oda: crearOdaConverter({ executable: process.execPath, executableArgs: [path.resolve('src/fixtures/oda-falso.mjs')], tempRoot: temporal }) });
    const otro = app.listen(0, '127.0.0.1');
    await new Promise((resolve) => otro.once('listening', resolve));
    try {
      const respuesta = await fetch(`http://127.0.0.1:${otro.address().port}/api/reviews/AR2604784/corte-lona/plano`);
      expect(respuesta.status).toBe(200);
      expect(respuesta.headers.get('content-disposition')).toContain('AR2604784 (plano).dwg');
      expect(await respuesta.text()).toBe('AC1032DWG FALSO');
    } finally { await new Promise((resolve) => otro.close(resolve)); }
  });
  it('rechaza peticiones incompletas, opciones o materiales erróneos y distingue un pedido ausente', async () => {
    for (const body of [{}, { order: revision.order, ajustes: [] }]) {
      expect((await post('/api/corte-lona', body)).status).toBe(400);
    }
    expect((await post('/api/corte-lona/dxf', { order: revision.order, opcion: 'inventada' })).status).toBe(400);
    expect((await post('/api/corte-lona/dxf', { order: revision.order, opcion: 'conSacos', material: 'OTRA' })).status).toBe(400);
    expect((await post('/api/corte-lona/dxf', { order: revision.order, opcion: 'trozoSeparado' })).status).toBe(400);
    getReview.mockRejectedValue(Object.assign(new Error('no existe'), { code: 'ENOENT' }));
    expect((await fetch(url + '/api/reviews/AR2609999/corte-lona')).status).toBe(404);
  });
  it('distingue la falta del ejecutable de una conversión fallida', async () => {
    oda.disponible = true;
    convertir.mockRejectedValue(new Error('ODA ausente', { cause: Object.assign(new Error('ausente'), { code: 'ENOENT' }) }));
    const alternativa = await post('/api/corte-lona/plano', { order: revision.order });
    expect(alternativa.status).toBe(200);
    expect(alternativa.headers.get('x-corte-lona-aviso')).toContain('ODA_NO_DISPONIBLE');
    convertir.mockRejectedValue(new Error('ODA dejó un fichero .err'));
    const fallida = await post('/api/corte-lona/plano', { order: revision.order });
    expect(fallida.status).toBe(502);
    expect((await fallida.json()).error).toContain('.err');
  });
  it('selecciona cada tela por idMaterial y obliga a elegir cuando hay varias', async () => {
    const order = structuredClone(revision.order);
    order.sameFabric = false;
    order.awnings[0].fabric = order.fabric;
    order.awnings.push({ ...order.awnings[0], id: 'otra-tela', of: '0232569', fabric: 'OTROPVC|||300|||LONA PVC ROJA :300 AN|||PLASTICA (LONA)' });
    const json = await (await post('/api/corte-lona', { order })).json();
    expect(json.cortes.conSacos).toHaveLength(2);
    expect((await post('/api/corte-lona/plano', { order })).status).toBe(400);
    for (const corte of json.cortes.conSacos) {
      const respuesta = await post('/api/corte-lona/plano', { order, material: corte.idMaterial });
      expect(respuesta.status).toBe(200);
      expect(await respuesta.text()).toContain('AC1032');
    }
  });
  it('conserva la OF de stock generada en revisión y avisa si la oficina usa otra', async () => {
    const order = structuredClone(revision.order);
    order.awnings[0].width = 700;
    order.awnings[0].projection = 350;
    const json = await (await post('/api/corte-lona', { order })).json();
    expect(json.corteLona.ofStockSacos).toBe('0230811');
    expect(json.cortes.conSacos[0].sacos.length).toBeGreaterThan(0);
    const guardado = { ...json.corteLona, ofStockSacos: '1234567' };
    getReview.mockResolvedValue({ ...revision, order, corteLona: guardado });
    const vista = await (await fetch(url + '/api/reviews/AR2604784/corte-lona')).json();
    expect(vista.ofStockSacos).toMatchObject({ of: '1234567', actual: '0230811' });
    expect(vista.avisos).toContainEqual(expect.stringContaining('1234567'));
    expect(vista.pendientes).toEqual([]);
    expect(vista.cortes.conSacos[0].sacos.every((s) => s.of === '1234567')).toBe(true);
    const dxf = await fetch(url + '/api/reviews/AR2604784/corte-lona/dxf?opcion=conSacos');
    expect(await dxf.text()).toContain('1234567');
  });
});
