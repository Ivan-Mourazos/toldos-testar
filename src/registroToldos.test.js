import fs from 'node:fs/promises';
import path from 'node:path';
import pdfLib from 'pdf-lib';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { adjuntarPedido } from './adjuntosPedido.js';
import { createWorkflowStore } from './workflow.js';
import { entregasPedido } from './entregas.js';
import { isPendingGeneration } from './reviewRules.js';

const codigo = 'AR2604441';
const fecha = '2026-11-24T11:00:00.000Z';
const pedido = {
  kind: 'toldos-testar-review', orderCode: codigo, status: 'APPROVED', updatedAt: fecha,
  production: null, order: { orderCode: codigo, awnings: [] }, summary: {}
};
let carpeta, almacen, rutaPdf, rutaLegacy, pdf;

beforeEach(async () => {
  await fs.mkdir('tmp', { recursive: true });
  carpeta = await fs.mkdtemp(path.resolve('tmp/registro-toldos-'));
  almacen = createWorkflowStore({ settingsFile: path.join(carpeta, 'ajustes.json'), defaults: { reviewDirectory: carpeta } });
  rutaPdf = path.join(carpeta, `${codigo}.pdf`);
  rutaLegacy = path.join(carpeta, `${codigo}.toldos.json`);
  const documento = await pdfLib.PDFDocument.create();
  documento.addPage(); documento.addPage();
  pdf = await adjuntarPedido(await documento.save(), pedido, 'toldos');
});

afterEach(async () => {
  await fs.rm(carpeta, { recursive: true, force: true });
});

describe('Registro de toldos', () => {
  it.each(['PDF', 'JSON'])('termina y reabre un pedido %s dentro del registro', async formato => {
    await fs.writeFile(formato === 'PDF' ? rutaPdf : rutaLegacy, formato === 'PDF' ? pdf : JSON.stringify(pedido));
    await expect(almacen.terminarRevision(codigo, { usuario: 'IVÁN', motivo: '  ', fecha })).rejects.toThrow(/motivo/i);
    await almacen.terminarRevision(codigo, { usuario: 'IVÁN', motivo: '  Hecho en taller  ', fecha });
    const cerrado = await almacen.getReview(codigo);
    expect(cerrado.terminadoSinGenerar).toMatchObject({ usuario: 'IVÁN', motivo: 'Hecho en taller', fecha });
    expect(cerrado.production).toBeNull();
    expect(entregasPedido(cerrado)).toEqual([]);
    expect(isPendingGeneration(cerrado.status)).toBe(false);
    expect(await almacen.listReviews()).toMatchObject([{ terminadoSinGenerar: { motivo: 'Hecho en taller' } }]);
    expect(await fs.readdir(carpeta)).toEqual([formato === 'PDF' ? `${codigo}.pdf` : `${codigo}.toldos.json`]);
    if (formato === 'PDF') expect((await pdfLib.PDFDocument.load(await fs.readFile(rutaPdf))).getPageCount()).toBe(2);
    await almacen.reabrirRevision(codigo, { usuario: 'OTRO', fecha });
    const abierto = await almacen.getReview(codigo);
    expect(abierto.status).toBe('APPROVED');
    expect(isPendingGeneration(abierto.status)).toBe(true);
    expect(abierto).not.toHaveProperty('terminadoSinGenerar');
  });

  it('protege un PDF de producción que lleva adjunto el pedido original', async () => {
    const entrega = `${codigo}-1`;
    const generado = path.join(carpeta, entrega + '.pdf');
    await fs.writeFile(generado, pdf);
    await expect(almacen.enviarRevisionAPapelera(entrega, { usuario: 'IVÁN', confirmacion: entrega, fecha })).rejects.toMatchObject({ code: 'ENOENT' });
    await expect(almacen.terminarRevision(entrega, { usuario: 'IVÁN', motivo: 'Hecho', fecha })).rejects.toMatchObject({ code: 'ENOENT' });
    expect(await fs.readFile(generado)).toEqual(pdf);
  });

  it('aparta las dos versiones recuperables sin tocar el PDF de producción', async () => {
    const generado = path.join(carpeta, `${codigo}-1.pdf`);
    await fs.writeFile(rutaPdf, pdf);
    await fs.writeFile(rutaLegacy, JSON.stringify(pedido));
    await fs.writeFile(generado, pdf);
    await expect(almacen.enviarRevisionAPapelera(codigo, { usuario: 'IVÁN', confirmacion: 'OTRO', fecha })).rejects.toThrow(/código/i);
    expect(await almacen.listReviews()).toHaveLength(1);
    const destino = await almacen.enviarRevisionAPapelera(codigo, { usuario: 'IVÁN', confirmacion: codigo, fecha });
    await expect(almacen.getReview(codigo)).rejects.toMatchObject({ code: 'ENOENT' });
    expect(await almacen.listReviews()).toEqual([]);
    expect(await fs.readFile(generado)).toEqual(pdf);
    expect(await fs.readFile(path.join(destino, path.basename(rutaPdf)))).toEqual(pdf);
    expect(JSON.parse(await fs.readFile(path.join(destino, 'papelera.json'), 'utf8'))).toEqual({ codigo, usuario: 'IVÁN', fecha });
    await fs.rename(path.join(destino, path.basename(rutaPdf)), rutaPdf);
    expect(await almacen.getReview(codigo)).toEqual(pedido);
  });
});
