import fs from 'node:fs/promises';
import path from 'node:path';
import pdfLib from 'pdf-lib';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { adjuntarPedido } from './adjuntosPedido.js';
import { createWorkflowStore, resolveGeneratedReviewFiles } from './workflow.js';
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
  const order = { orderCode: codigo, customer: 'Cliente', awnings: [{ model: 'GALICIA', of: '0232568', letra: 'A' }] };
  const editado = { ...order, customer: 'Cliente editado', awnings: [{ ...order.awnings[0], letra: 'J' }] };
  const guardar = (entrada = editado) => almacen.guardarRegistroSinRevisar(codigo, { order: entrada, usuario: 'IVÁN', fecha });

  it.each(['PENDING_REVIEW', 'PRODUCED', 'TERMINADO_SIN_GENERAR'])('edita el registro %s sin modificar entregas ni archivos existentes', async status => {
    const nombreGenerado = `${codigo}-1.pdf`;
    const rutaGenerada = path.join(carpeta, nombreGenerado);
    const production = status === 'PRODUCED' ? { createdAt: fecha, files: [{ type: 'pdf', filename: nombreGenerado }] } : null;
    const original = {
      ...pedido, order, status, production, entregas: [{ numero: 1, ofs: ['0232568'] }],
      reviewedBy: 'JAIME', corteLona: { toldos: [{ letra: 'A' }] },
      corteConfirmado: { filename: 'corte.dwg' }, planosWeb: ['corte.dwg'],
      ...(status === 'TERMINADO_SIN_GENERAR' ? { terminadoSinGenerar: { motivo: 'Hecho', usuario: 'JAIME', fecha } } : {})
    };
    await fs.writeFile(rutaPdf, await adjuntarPedido(pdf, original, 'toldos'));
    await fs.writeFile(rutaGenerada, pdf);
    const archivos = await fs.readdir(carpeta);
    await almacen.listReviews();

    await guardar();
    const registro = await almacen.getReview(codigo);
    expect(registro).toMatchObject({
      status, production, entregas: original.entregas, reviewedBy: original.reviewedBy,
      corteLona: original.corteLona, corteConfirmado: original.corteConfirmado, planosWeb: original.planosWeb,
      updatedAt: fecha, updatedBy: 'IVÁN', order: editado,
      summary: { customer: 'Cliente editado', awnings: 1, models: ['GALICIA'], awningList: [{ letter: 'J' }] },
      ediciones: [{ usuario: 'IVÁN', fecha, nota: 'Editado sin revisar' }]
    });
    expect(registro.terminadoSinGenerar).toEqual(original.terminadoSinGenerar);
    expect(await almacen.listReviews()).toMatchObject([{ status, summary: { customer: 'Cliente editado' } }]);
    expect(await fs.readdir(carpeta)).toEqual(archivos);
    expect(await fs.readFile(rutaGenerada)).toEqual(pdf);
    expect((await pdfLib.PDFDocument.load(await fs.readFile(rutaPdf))).getPageCount()).toBe(2);
    if (production) {
      const [archivo] = resolveGeneratedReviewFiles(registro, { planteamientosDirectory: carpeta }, 0);
      expect(archivo.savedPath).toBe(rutaGenerada);
    }
    await guardar();
    expect((await almacen.getReview(codigo)).ediciones).toHaveLength(2);
  });

  it('conserva la entrega de un producido antiguo al editar su JSON', async () => {
    const original = { ...pedido, order, status: 'PRODUCED',
      production: { createdAt: fecha, files: [{ type: 'pdf', filename: `${codigo}-2.pdf` }] } };
    await fs.writeFile(rutaLegacy, JSON.stringify(original));
    await guardar({ ...editado, awnings: [{ ...editado.awnings[0], of: '0232569' }] });
    expect(entregasPedido(await almacen.getReview(codigo))).toEqual(entregasPedido(original));
    expect(await fs.readdir(carpeta)).toEqual([`${codigo}.toldos.json`]);
  });

  it('rechaza un número distinto y letras repetidas sin tocar el registro', async () => {
    await fs.writeFile(rutaPdf, pdf);
    await expect(guardar({ ...editado, orderCode: 'AR2604442' })).rejects.toMatchObject({ statusCode: 400 });
    await expect(guardar({ ...editado, awnings: [...editado.awnings, { ...editado.awnings[0] }] }))
      .rejects.toMatchObject({ statusCode: 409 });
    expect(await fs.readFile(rutaPdf)).toEqual(pdf);
  });

  it.each(['PDF', 'JSON'])('termina y reabre un pedido %s dentro del registro', async formato => {
    await fs.writeFile(formato === 'PDF' ? rutaPdf : rutaLegacy, formato === 'PDF' ? pdf : JSON.stringify(pedido));
    await almacen.terminarRevision(codigo, { usuario: 'IVÁN', fecha });
    const cerrado = await almacen.getReview(codigo);
    expect(cerrado.terminadoSinGenerar).toMatchObject({ usuario: 'IVÁN', fecha, estadoAnterior: 'APPROVED' });
    expect(cerrado.production).toBeNull();
    expect(entregasPedido(cerrado)).toEqual([]);
    expect(isPendingGeneration(cerrado.status)).toBe(false);
    expect(cerrado.terminadoSinGenerar).not.toHaveProperty('motivo');
    expect(await almacen.listReviews()).toMatchObject([{ terminadoSinGenerar: { usuario: 'IVÁN' } }]);
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
