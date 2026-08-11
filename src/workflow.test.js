import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  createReviewPackage,
  createWorkflowStore,
  defaultWorkflowSettings,
  markReviewProduced,
  isAbsolutePathTemplate,
  normalizeWorkflowSettings,
  resolveDirectoryTemplate,
  workflowReadiness
} from './workflow.js';
import { buildOrderReviewPdf } from './domain/reviewPdf.js';

const temporaryDirectories = [];

afterEach(async () => {
  await Promise.all(temporaryDirectories.splice(0).map((directory) => fs.rm(directory, { recursive: true, force: true })));
  vi.restoreAllMocks();
});

describe('flujo de revisión y producción', () => {
  it('resuelve el año del pedido en las tres rutas configurables', () => {
    const template = path.join(os.tmpdir(), 'Pedidos', '{YYYY}', 'TOLDOS');
    expect(resolveDirectoryTemplate(template, 'AR2601234')).toBe(path.join(os.tmpdir(), 'Pedidos', '2026', 'TOLDOS'));
  });

  it('corrige una carpeta cuyo año se escribió entre llaves', () => {
    const settings = normalizeWorkflowSettings({ reviewDirectory: path.join(os.tmpdir(), 'Pedidos', '{2026}', 'TOLDOS') });
    expect(settings.reviewDirectory).toBe(path.join(os.tmpdir(), 'Pedidos', '2026', 'TOLDOS'));
  });

  it('solo declara producción lista con rutas completas y activación explícita', () => {
    const settings = normalizeWorkflowSettings({
      productionEnabled: true,
      reviewDirectory: path.join(os.tmpdir(), 'Pedidos', '{YYYY}', 'TOLDOS'),
      planteamientosDirectory: path.join(os.tmpdir(), 'Planteamientos'),
      rpsUploadDirectory: path.join(os.tmpdir(), 'RPS')
    });
    expect(workflowReadiness(settings)).toEqual({ reviewReady: true, productionReady: true, missing: [] });
    expect(workflowReadiness({ ...settings, productionEnabled: false }).productionReady).toBe(false);
  });

  it('en Linux exige rutas POSIX montadas y rechaza rutas de Windows o UNC', () => {
    expect(isAbsolutePathTemplate('/mnt/toldos/{YYYY}/TOLDOS', 'linux')).toBe(true);
    expect(isAbsolutePathTemplate('C:\\Pedidos\\{YYYY}', 'linux')).toBe(false);
    expect(isAbsolutePathTemplate('\\\\servidor\\Pedidos\\{YYYY}', 'linux')).toBe(false);
    expect(isAbsolutePathTemplate('//servidor/Pedidos/{YYYY}', 'linux')).toBe(false);
    expect(isAbsolutePathTemplate('\\\\servidor\\Pedidos\\{YYYY}', 'win32')).toBe(true);
  });

  it('al actualizar un pedido vuelve a revisión y conserva su fecha de creación', () => {
    const existing = { createdAt: '2026-08-01T10:00:00.000Z', status: 'PRODUCED' };
    const review = createReviewPackage({
      order: { orderCode: 'AR2601234', technician: 'Ana', awnings: [{ model: 'ARZUA PRO' }] },
      calculation: { ofs: [{ of: '260001' }], diagnostics: [] },
      existing,
      now: '2026-08-07T10:00:00.000Z'
    });
    expect(review.status).toBe('PENDING_REVIEW');
    expect(review.createdAt).toBe(existing.createdAt);
    expect(review.production).toBeNull();
  });

  it('guarda un único PEDIDO.pdf editable y lo lista sin duplicar el pedido completo', async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), 'toldos-workflow-'));
    temporaryDirectories.push(root);
    const reviews = path.join(root, '{YYYY}', 'TOLDOS');
    const store = createWorkflowStore({
      settingsFile: path.join(root, 'settings.json'),
      defaults: defaultWorkflowSettings({ reviewDirectory: reviews })
    });
    await store.saveSettings({
      productionEnabled: false,
      reviewDirectory: reviews,
      planteamientosDirectory: '',
      rpsUploadDirectory: ''
    });
    const review = createReviewPackage({
      order: { orderCode: 'AR2601234', customer: 'Cliente', technician: 'Ana', awnings: [{ model: 'ARZUA PRO' }] },
      calculation: { ofs: [{ of: '260001' }], diagnostics: [] }
    });
    const pdf = await buildOrderReviewPdf({ order: review.order, calculation: { ofs: [], diagnostics: [] }, review });
    const savedPath = await store.saveReview(review, pdf);
    const listing = await store.listReviews(2026);
    const savedDirectory = path.join(root, '2026', 'TOLDOS');
    expect(savedPath).toBe(path.join(savedDirectory, 'AR2601234.pdf'));
    expect(await fs.readdir(savedDirectory)).toEqual(['AR2601234.pdf']);
    expect(listing).toHaveLength(1);
    expect(listing[0].orderCode).toBe('AR2601234');
    expect(listing[0]).not.toHaveProperty('order');
    expect((await store.getReview('AR2601234')).order.customer).toBe('Cliente');
  });

  it('ignora sin mostrar error el PDF definitivo AR2601234-1.PDF de la misma carpeta', async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), 'toldos-workflow-'));
    temporaryDirectories.push(root);
    const reviews = path.join(root, '{YYYY}', 'TOLDOS');
    const store = createWorkflowStore({
      settingsFile: path.join(root, 'settings.json'),
      defaults: defaultWorkflowSettings({ reviewDirectory: reviews })
    });
    await store.saveSettings({
      productionEnabled: false,
      reviewDirectory: reviews,
      planteamientosDirectory: reviews,
      rpsUploadDirectory: ''
    });
    const review = createReviewPackage({
      order: { orderCode: 'AR2601234', customer: 'Cliente', technician: 'Ana', awnings: [{ model: 'ARZUA PRO' }] },
      calculation: { ofs: [{ of: '260001' }], diagnostics: [] }
    });
    const editablePdf = await buildOrderReviewPdf({ order: review.order, calculation: { ofs: [], diagnostics: [] }, review });
    await store.saveReview(review, editablePdf);
    const finalPdf = await buildOrderReviewPdf({ order: review.order, calculation: { ofs: [], diagnostics: [] } });
    const savedDirectory = path.join(root, '2026', 'TOLDOS');
    await fs.writeFile(path.join(savedDirectory, 'AR2601234-1.PDF'), finalPdf);
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const listing = await store.listReviews(2026);

    expect(listing.map((item) => item.orderCode)).toEqual(['AR2601234']);
    expect(errorSpy).not.toHaveBeenCalled();
  });

  it('registra quién aprobó y los archivos realmente producidos', () => {
    const updated = markReviewProduced({ orderCode: 'AR2601234' }, {
      reviewer: 'Luis',
      note: 'OK',
      files: [{ type: 'pdf', filename: 'AR2601234-1.pdf' }],
      now: '2026-08-07T12:00:00.000Z'
    });
    expect(updated.status).toBe('PRODUCED');
    expect(updated.reviewedBy).toBe('Luis');
    expect(updated.production.files[0].filename).toBe('AR2601234-1.pdf');
  });
});
